import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import {
  AuditEventType,
  type AppliesTo,
  type StageDTO,
  type StageCreateInput,
  type StageUpdateInput,
} from '@request-tracker/shared';

export async function createStage(
  input: StageCreateInput,
  actorUserId: string
): Promise<StageDTO> {
  const stage = await prisma.stage.create({
    data: {
      name: input.name,
      orderIndex: input.orderIndex,
      appliesTo: input.appliesTo,
    },
  });

  await createAuditEvent(AuditEventType.STAGE_CREATED, actorUserId, null, {
    stageId: stage.id,
    name: stage.name,
    appliesTo: stage.appliesTo,
  });

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

export async function updateStage(
  stageId: string,
  input: StageUpdateInput,
  actorUserId: string
): Promise<StageDTO | null> {
  const existing = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!existing) return null;

  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    },
  });

  await createAuditEvent(AuditEventType.STAGE_UPDATED, actorUserId, null, {
    stageId: stage.id,
    changes: input,
  });

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

export async function reorderStages(
  stageIds: string[],
  actorUserId: string
): Promise<StageDTO[]> {
  // Update each stage's orderIndex in a transaction
  await prisma.$transaction(
    stageIds.map((id, index) =>
      prisma.stage.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  );

  await createAuditEvent(AuditEventType.STAGE_UPDATED, actorUserId, null, {
    action: 'reorder',
    stageIds,
  });

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
