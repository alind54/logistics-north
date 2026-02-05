import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import {
  AuditEventType,
  type AppliesTo,
  type TransitionDTO,
  type TransitionCreateInput,
  type TransitionUpdateInput,
} from '@request-tracker/shared';

export interface TransitionWithStages extends TransitionDTO {
  fromStageName: string;
  toStageName: string;
}

export async function listTransitions(): Promise<TransitionWithStages[]> {
  const transitions = await prisma.transition.findMany({
    include: {
      fromStage: { select: { name: true } },
      toStage: { select: { name: true } },
    },
    orderBy: { fromStage: { orderIndex: 'asc' } },
  });

  return transitions.map((t) => ({
    id: t.id,
    fromStageId: t.fromStageId,
    toStageId: t.toStageId,
    appliesTo: t.appliesTo as AppliesTo,
    isActive: t.isActive,
    fromStageName: t.fromStage.name,
    toStageName: t.toStage.name,
  }));
}

export async function createTransition(
  input: TransitionCreateInput,
  actorUserId: string
): Promise<TransitionWithStages> {
  // Verify both stages exist
  const [fromStage, toStage] = await Promise.all([
    prisma.stage.findUnique({ where: { id: input.fromStageId }, select: { id: true, name: true } }),
    prisma.stage.findUnique({ where: { id: input.toStageId }, select: { id: true, name: true } }),
  ]);

  if (!fromStage) throw new Error('From stage not found');
  if (!toStage) throw new Error('To stage not found');
  if (input.fromStageId === input.toStageId) throw new Error('From and To stages must be different');

  const transition = await prisma.transition.create({
    data: {
      fromStageId: input.fromStageId,
      toStageId: input.toStageId,
      appliesTo: input.appliesTo,
    },
  });

  await createAuditEvent(AuditEventType.TRANSITION_CREATED, actorUserId, null, {
    transitionId: transition.id,
    fromStageId: input.fromStageId,
    toStageId: input.toStageId,
    appliesTo: input.appliesTo,
  });

  return {
    id: transition.id,
    fromStageId: transition.fromStageId,
    toStageId: transition.toStageId,
    appliesTo: transition.appliesTo as AppliesTo,
    isActive: transition.isActive,
    fromStageName: fromStage.name,
    toStageName: toStage.name,
  };
}

export async function updateTransition(
  transitionId: string,
  input: TransitionUpdateInput,
  actorUserId: string
): Promise<TransitionWithStages | null> {
  const existing = await prisma.transition.findUnique({ where: { id: transitionId } });
  if (!existing) return null;

  const transition = await prisma.transition.update({
    where: { id: transitionId },
    data: {
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    },
    include: {
      fromStage: { select: { name: true } },
      toStage: { select: { name: true } },
    },
  });

  await createAuditEvent(AuditEventType.TRANSITION_UPDATED, actorUserId, null, {
    transitionId: transition.id,
    changes: input,
  });

  return {
    id: transition.id,
    fromStageId: transition.fromStageId,
    toStageId: transition.toStageId,
    appliesTo: transition.appliesTo as AppliesTo,
    isActive: transition.isActive,
    fromStageName: transition.fromStage.name,
    toStageName: transition.toStage.name,
  };
}
