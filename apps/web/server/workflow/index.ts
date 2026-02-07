import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import {
  AuditEventType,
  FlowType,
  AppliesTo,
  type StageDTO,
  type TransitionDTO,
} from '@request-tracker/shared';

// ============================================================================
// LIST STAGES
// ============================================================================

export async function listStages(flowType?: FlowType): Promise<StageDTO[]> {
  const where = flowType
    ? {
        isActive: true,
        appliesTo: {
          in: [flowType as AppliesTo, AppliesTo.BOTH],
        },
      }
    : { isActive: true };

  const stages = await prisma.stage.findMany({
    where,
    orderBy: { orderIndex: 'asc' },
  });

  return stages.map((s) => ({
    id: s.id,
    name: s.name,
    orderIndex: s.orderIndex,
    isActive: s.isActive,
    appliesTo: s.appliesTo as AppliesTo,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

// ============================================================================
// LIST ALL STAGES (admin view - includes inactive)
// ============================================================================

export async function listAllStages(): Promise<StageDTO[]> {
  const stages = await prisma.stage.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  return stages.map((s) => ({
    id: s.id,
    name: s.name,
    orderIndex: s.orderIndex,
    isActive: s.isActive,
    appliesTo: s.appliesTo as AppliesTo,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

// ============================================================================
// GET TRANSITIONS FOR STAGE
// ============================================================================

export interface TransitionWithStage extends TransitionDTO {
  toStage: { id: string; name: string; orderIndex: number } | null;
}

export async function getAvailableTransitions(
  fromStageId: string,
  flowType: FlowType
): Promise<TransitionWithStage[]> {
  const transitions = await prisma.transition.findMany({
    where: {
      fromStageId,
      isActive: true,
      appliesTo: {
        in: [flowType as AppliesTo, AppliesTo.BOTH],
      },
    },
    include: {
      toStage: {
        select: { id: true, name: true, orderIndex: true, isActive: true },
      },
    },
  });

  // Only return transitions to active stages, include toStage data to avoid N+1
  return transitions
    .filter((t) => t.toStage.isActive)
    .map((t) => ({
      id: t.id,
      fromStageId: t.fromStageId,
      toStageId: t.toStageId,
      appliesTo: t.appliesTo as AppliesTo,
      isActive: t.isActive,
      toStage: {
        id: t.toStage.id,
        name: t.toStage.name,
        orderIndex: t.toStage.orderIndex,
      },
    }));
}

// ============================================================================
// VALIDATE TRANSITION
// ============================================================================

export async function isValidTransition(
  fromStageId: string,
  toStageId: string,
  flowType: FlowType
): Promise<boolean> {
  const transition = await prisma.transition.findFirst({
    where: {
      fromStageId,
      toStageId,
      isActive: true,
      appliesTo: {
        in: [flowType as AppliesTo, AppliesTo.BOTH],
      },
    },
    include: {
      toStage: {
        select: { isActive: true },
      },
    },
  });

  return transition !== null && transition.toStage.isActive;
}

// ============================================================================
// MOVE STAGE
// ============================================================================

export interface MoveStageResult {
  success: boolean;
  error?: string;
  request?: {
    id: string;
    previousStageId: string;
    previousStageName: string;
    newStageId: string;
    newStageName: string;
  };
}

export async function moveStage(
  requestId: string,
  toStageId: string,
  actorUserId: string,
  reason?: string
): Promise<MoveStageResult> {
  // Get the request with current stage
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      currentStage: true,
    },
  });

  if (!request) {
    return { success: false, error: 'Request not found' };
  }

  const fromStageId = request.currentStageId;

  // If same stage, nothing to do
  if (fromStageId === toStageId) {
    return { success: false, error: 'Request is already in this stage' };
  }

  // Validate the transition is allowed
  const valid = await isValidTransition(fromStageId, toStageId, request.flowType as FlowType);
  if (!valid) {
    return { success: false, error: 'Invalid stage transition' };
  }

  // Get the target stage
  const toStage = await prisma.stage.findUnique({
    where: { id: toStageId },
  });

  if (!toStage || !toStage.isActive) {
    return { success: false, error: 'Target stage not found or inactive' };
  }

  const now = new Date();

  // Execute the move in a transaction
  await prisma.$transaction(async (tx) => {
    // Close the current stage history entry
    await tx.stageHistory.updateMany({
      where: {
        requestId,
        exitedAt: null,
      },
      data: {
        exitedAt: now,
      },
    });

    // Create new stage history entry
    await tx.stageHistory.create({
      data: {
        requestId,
        stageId: toStageId,
        actorUserId,
        enteredAt: now,
        moveReason: reason ?? null,
      },
    });

    // Update the request's current stage
    await tx.request.update({
      where: { id: requestId },
      data: {
        currentStageId: toStageId,
      },
    });
  });

  // Create audit event
  await createAuditEvent(AuditEventType.STAGE_MOVED, actorUserId, requestId, {
    fromStageId,
    fromStageName: request.currentStage.name,
    toStageId,
    toStageName: toStage.name,
    reason: reason ?? null,
  });

  return {
    success: true,
    request: {
      id: requestId,
      previousStageId: fromStageId,
      previousStageName: request.currentStage.name,
      newStageId: toStageId,
      newStageName: toStage.name,
    },
  };
}

// ============================================================================
// GET STAGE BY ID
// ============================================================================

export async function getStageById(stageId: string): Promise<StageDTO | null> {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
  });

  if (!stage) {
    return null;
  }

  return {
    id: stage.id,
    name: stage.name,
    orderIndex: stage.orderIndex,
    isActive: stage.isActive,
    appliesTo: stage.appliesTo as AppliesTo,
    createdAt: stage.createdAt.toISOString(),
    updatedAt: stage.updatedAt.toISOString(),
  };
}

// ============================================================================
// CALCULATE TIME IN STAGE
// ============================================================================

export function calculateTimeInStage(enteredAt: Date, exitedAt: Date | null = null): number {
  const end = exitedAt ?? new Date();
  return end.getTime() - enteredAt.getTime();
}

// ============================================================================
// GET CURRENT STAGE DURATION FOR REQUEST
// ============================================================================

export async function getCurrentStageDuration(requestId: string): Promise<number | null> {
  const currentHistory = await prisma.stageHistory.findFirst({
    where: {
      requestId,
      exitedAt: null,
    },
    orderBy: { enteredAt: 'desc' },
  });

  if (!currentHistory) {
    return null;
  }

  return calculateTimeInStage(currentHistory.enteredAt);
}
