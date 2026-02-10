import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import {
  AuditEventType,
  FlowType,
  AppliesTo,
  Priority,
  type RequestCreateInput,
  type RequestUpdateInput,
  type RequestDTO,
  type RequestDetailDTO,
  type RequestListItemDTO,
  type RequestFilters,
  type RequestSortOptions,
  type StageHistoryDTO,
} from '@request-tracker/shared';
import type { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginatedRequests {
  items: RequestListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateDuration(enteredAt: Date, exitedAt: Date | null): number | null {
  if (!exitedAt) return null;
  return exitedAt.getTime() - enteredAt.getTime();
}

function mapStageHistory(history: {
  id: string;
  stageId: string;
  enteredAt: Date;
  exitedAt: Date | null;
  actorUserId: string;
  moveReason: string | null;
  stage: { name: string };
}): StageHistoryDTO {
  return {
    id: history.id,
    stageId: history.stageId,
    stageName: history.stage.name,
    enteredAt: history.enteredAt.toISOString(),
    exitedAt: history.exitedAt?.toISOString() ?? null,
    durationMs: calculateDuration(history.enteredAt, history.exitedAt),
    actorUserId: history.actorUserId,
    moveReason: history.moveReason,
  };
}

// ============================================================================
// CREATE REQUEST
// ============================================================================

export async function createRequest(
  input: RequestCreateInput,
  actorUserId: string
): Promise<RequestDTO> {
  // Get the initial stage for the flow type (MRF is the starting stage for both)
  const initialStage = await prisma.stage.findFirst({
    where: {
      name: 'MRF',
      isActive: true,
      appliesTo: {
        in: [input.flowType as AppliesTo, AppliesTo.BOTH],
      },
    },
    orderBy: { orderIndex: 'asc' },
  });

  if (!initialStage) {
    throw new Error('Initial stage not found for flow type');
  }

  const request = await prisma.$transaction(async (tx) => {
    // Create the request
    const newRequest = await tx.request.create({
      data: {
        description: input.description,
        notes: input.notes ?? null,
        priority: input.priority as Priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        flowType: input.flowType as FlowType,
        currentStageId: initialStage.id,
        createdByUserId: actorUserId,
        ownerUserId: input.ownerUserId ?? null,
      },
      include: {
        currentStage: true,
        createdBy: { select: { id: true, email: true } },
        owner: { select: { id: true, email: true } },
        tags: { include: { tag: true } },
      },
    });

    // Create initial stage history
    await tx.stageHistory.create({
      data: {
        requestId: newRequest.id,
        stageId: initialStage.id,
        actorUserId,
        enteredAt: new Date(),
      },
    });

    // Add tags if provided
    if (input.tagIds && input.tagIds.length > 0) {
      await tx.requestTag.createMany({
        data: input.tagIds.map((tagId) => ({
          requestId: newRequest.id,
          tagId,
        })),
      });
    }

    return newRequest;
  });

  // Create audit event
  await createAuditEvent(AuditEventType.REQUEST_CREATED, actorUserId, request.id, {
    description: input.description,
    flowType: input.flowType,
    priority: input.priority,
    initialStageId: initialStage.id,
    initialStageName: initialStage.name,
  });

  // Fetch with tags if any were added
  const finalRequest = await prisma.request.findUniqueOrThrow({
    where: { id: request.id },
    include: {
      currentStage: true,
      createdBy: { select: { id: true, email: true } },
      owner: { select: { id: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  return {
    id: finalRequest.id,
    mrfNumber: finalRequest.mrfNumber,
    description: finalRequest.description,
    notes: finalRequest.notes,
    priority: finalRequest.priority as Priority,
    dueDate: finalRequest.dueDate?.toISOString() ?? null,
    flowType: finalRequest.flowType as FlowType,
    currentStage: {
      id: finalRequest.currentStage.id,
      name: finalRequest.currentStage.name,
      orderIndex: finalRequest.currentStage.orderIndex,
      isActive: finalRequest.currentStage.isActive,
      appliesTo: finalRequest.currentStage.appliesTo as AppliesTo,
      createdAt: finalRequest.currentStage.createdAt.toISOString(),
      updatedAt: finalRequest.currentStage.updatedAt.toISOString(),
    },
    createdBy: finalRequest.createdBy,
    owner: finalRequest.owner,
    ownerUserId: finalRequest.ownerUserId,
    tags: finalRequest.tags.map((rt) => ({
      id: rt.tag.id,
      name: rt.tag.name,
      color: rt.tag.color,
    })),
    createdAt: finalRequest.createdAt.toISOString(),
    updatedAt: finalRequest.updatedAt.toISOString(),
  };
}

// ============================================================================
// UPDATE REQUEST
// ============================================================================

export async function updateRequest(
  requestId: string,
  input: RequestUpdateInput,
  actorUserId: string
): Promise<RequestDTO> {
  // Get current request for audit diff
  const current = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!current) {
    throw new Error('Request not found');
  }

  const updated = await prisma.request.update({
    where: { id: requestId },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
    },
    include: {
      currentStage: true,
      createdBy: { select: { id: true, email: true } },
      owner: { select: { id: true, email: true } },
      tags: { include: { tag: true } },
    },
  });

  // Create audit event with diff
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (input.description !== undefined && input.description !== current.description) {
    changes.description = { old: current.description, new: input.description };
  }
  if (input.notes !== undefined && input.notes !== current.notes) {
    changes.notes = { old: current.notes, new: input.notes };
  }
  if (input.priority !== undefined && input.priority !== current.priority) {
    changes.priority = { old: current.priority, new: input.priority };
  }
  if (input.dueDate !== undefined) {
    const oldDue = current.dueDate?.toISOString() ?? null;
    const newDue = input.dueDate ?? null;
    if (oldDue !== newDue) {
      changes.dueDate = { old: oldDue, new: newDue };
    }
  }
  if (input.ownerUserId !== undefined && input.ownerUserId !== current.ownerUserId) {
    changes.ownerUserId = { old: current.ownerUserId, new: input.ownerUserId };
  }

  if (Object.keys(changes).length > 0) {
    await createAuditEvent(AuditEventType.REQUEST_UPDATED, actorUserId, requestId, { changes });
  }

  return {
    id: updated.id,
    mrfNumber: updated.mrfNumber,
    description: updated.description,
    notes: updated.notes,
    priority: updated.priority as Priority,
    dueDate: updated.dueDate?.toISOString() ?? null,
    flowType: updated.flowType as FlowType,
    currentStage: {
      id: updated.currentStage.id,
      name: updated.currentStage.name,
      orderIndex: updated.currentStage.orderIndex,
      isActive: updated.currentStage.isActive,
      appliesTo: updated.currentStage.appliesTo as AppliesTo,
      createdAt: updated.currentStage.createdAt.toISOString(),
      updatedAt: updated.currentStage.updatedAt.toISOString(),
    },
    createdBy: updated.createdBy,
    owner: updated.owner,
    ownerUserId: updated.ownerUserId,
    tags: updated.tags.map((rt) => ({
      id: rt.tag.id,
      name: rt.tag.name,
      color: rt.tag.color,
    })),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

// ============================================================================
// GET REQUEST BY ID
// ============================================================================

export async function getRequestById(requestId: string): Promise<RequestDetailDTO | null> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      currentStage: true,
      createdBy: { select: { id: true, email: true } },
      owner: { select: { id: true, email: true } },
      tags: { include: { tag: true } },
      attachments: {
        include: {
          uploadedBy: { select: { id: true, email: true } },
          stage: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      stageHistory: {
        include: { stage: { select: { name: true } } },
        orderBy: { enteredAt: 'asc' },
        take: 50,
      },
    },
  });

  if (!request) {
    return null;
  }

  return {
    id: request.id,
    mrfNumber: request.mrfNumber,
    description: request.description,
    notes: request.notes,
    priority: request.priority as Priority,
    dueDate: request.dueDate?.toISOString() ?? null,
    flowType: request.flowType as FlowType,
    currentStage: {
      id: request.currentStage.id,
      name: request.currentStage.name,
      orderIndex: request.currentStage.orderIndex,
      isActive: request.currentStage.isActive,
      appliesTo: request.currentStage.appliesTo as AppliesTo,
      createdAt: request.currentStage.createdAt.toISOString(),
      updatedAt: request.currentStage.updatedAt.toISOString(),
    },
    createdBy: request.createdBy,
    owner: request.owner,
    ownerUserId: request.ownerUserId,
    tags: request.tags.map((rt) => ({
      id: rt.tag.id,
      name: rt.tag.name,
      color: rt.tag.color,
    })),
    attachments: request.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: Number(a.sizeBytes),
      createdAt: a.createdAt.toISOString(),
      uploadedBy: a.uploadedBy,
      stageId: a.stageId ?? null,
      stageName: a.stage?.name ?? null,
    })),
    stageHistory: request.stageHistory.map(mapStageHistory),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

// ============================================================================
// LIST REQUESTS
// ============================================================================

export async function listRequests(
  filters: RequestFilters = {},
  sort: RequestSortOptions = { field: 'createdAt', direction: 'desc' },
  page = 1,
  pageSize = 20
): Promise<PaginatedRequests> {
  const where: Prisma.RequestWhereInput = {};

  // Text search on description + notes + MRF number
  if (filters.query) {
    const mrfMatch = filters.query.match(/^(?:MRF-?)?(\d+)$/i);
    if (mrfMatch) {
      where.OR = [
        { description: { contains: filters.query, mode: 'insensitive' } },
        { notes: { contains: filters.query, mode: 'insensitive' } },
        { mrfNumber: parseInt(mrfMatch[1]!, 10) },
      ];
    } else {
      where.OR = [
        { description: { contains: filters.query, mode: 'insensitive' } },
        { notes: { contains: filters.query, mode: 'insensitive' } },
      ];
    }
  }

  // Stage filter
  if (filters.stageId) {
    where.currentStageId = filters.stageId;
  }

  // Tag filter (requests with any of these tags)
  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    };
  }

  // Priority filter
  if (filters.priority) {
    where.priority = filters.priority;
  }

  // Flow type filter
  if (filters.flowType) {
    where.flowType = filters.flowType;
  }

  // Due date range filter
  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) {
      where.dueDate.lte = new Date(filters.dueBefore);
    }
    if (filters.dueAfter) {
      where.dueDate.gte = new Date(filters.dueAfter);
    }
  }

  // Owner filter
  if (filters.ownerId) {
    where.ownerUserId = filters.ownerId;
  }

  // Build order by
  const orderBy: Prisma.RequestOrderByWithRelationInput = {
    [sort.field]: sort.direction,
  };

  const [items, total] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        currentStage: { select: { id: true, name: true } },
        owner: { select: { id: true, email: true } },
        tags: { include: { tag: true } },
        stageHistory: {
          where: { exitedAt: null },
          select: { enteredAt: true },
          take: 1,
        },
      },
    }),
    prisma.request.count({ where }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      mrfNumber: r.mrfNumber,
      description: r.description,
      priority: r.priority as Priority,
      dueDate: r.dueDate?.toISOString() ?? null,
      flowType: r.flowType as FlowType,
      currentStage: r.currentStage,
      currentStageEnteredAt: r.stageHistory[0]?.enteredAt.toISOString() ?? null,
      owner: r.owner,
      tags: r.tags.map((rt) => ({
        id: rt.tag.id,
        name: rt.tag.name,
        color: rt.tag.color,
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// LIST REQUESTS BY STAGE (for board view)
// ============================================================================

export interface BoardColumn {
  stage: {
    id: string;
    name: string;
    orderIndex: number;
  };
  totalCount?: number;
  requests: RequestListItemDTO[];
}

export async function listRequestsForBoard(
  flowType: FlowType,
  limitPerStage = 20
): Promise<BoardColumn[]> {
  // 1. Get all active stages for this flow type (1 query)
  const stages = await prisma.stage.findMany({
    where: {
      isActive: true,
      appliesTo: {
        in: [flowType as AppliesTo, AppliesTo.BOTH],
      },
    },
    orderBy: { orderIndex: 'asc' },
  });

  if (stages.length === 0) return [];

  const stageIds = stages.map((s) => s.id);

  // 2. Batch: counts + all requests in 2 queries (instead of 12 sequential)
  const [counts, allRequests] = await Promise.all([
    prisma.request.groupBy({
      by: ['currentStageId'],
      where: { flowType, currentStageId: { in: stageIds } },
      _count: true,
    }),
    prisma.request.findMany({
      where: { flowType, currentStageId: { in: stageIds } },
      include: {
        currentStage: { select: { id: true, name: true } },
        owner: { select: { id: true, email: true } },
        tags: { include: { tag: true } },
        stageHistory: {
          where: { exitedAt: null },
          select: { enteredAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limitPerStage * stages.length,
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.currentStageId, c._count]));

  // 3. Group requests by stage and enforce per-stage limit in JS
  const requestsByStage = new Map<string, typeof allRequests>();
  for (const req of allRequests) {
    const group = requestsByStage.get(req.currentStageId) ?? [];
    if (group.length < limitPerStage) {
      group.push(req);
      requestsByStage.set(req.currentStageId, group);
    }
  }

  // 4. Build response columns
  return stages.map((stage) => ({
    stage: {
      id: stage.id,
      name: stage.name,
      orderIndex: stage.orderIndex,
    },
    totalCount: countMap.get(stage.id) ?? 0,
    requests: (requestsByStage.get(stage.id) ?? []).map((r) => ({
      id: r.id,
      mrfNumber: r.mrfNumber,
      description: r.description,
      priority: r.priority as Priority,
      dueDate: r.dueDate?.toISOString() ?? null,
      flowType: r.flowType as FlowType,
      currentStage: r.currentStage,
      currentStageEnteredAt: r.stageHistory[0]?.enteredAt.toISOString() ?? null,
      owner: r.owner,
      tags: r.tags.map((rt) => ({
        id: rt.tag.id,
        name: rt.tag.name,
        color: rt.tag.color,
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  }));
}

// ============================================================================
// DELETE REQUEST
// ============================================================================

export async function deleteRequest(requestId: string, actorUserId: string): Promise<void> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, description: true, flowType: true, currentStageId: true },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // Cascade deletes handle stageHistory, tags, attachments per schema
  await prisma.request.delete({
    where: { id: requestId },
  });

  await createAuditEvent(AuditEventType.REQUEST_DELETED, actorUserId, null, {
    requestId,
    description: request.description,
    flowType: request.flowType,
  });
}

// ============================================================================
// BULK DELETE DONE REQUESTS
// ============================================================================

export async function clearDoneRequests(
  flowType: FlowType,
  actorUserId: string
): Promise<number> {
  // Find the "Done" stage for this flow type
  const doneStage = await prisma.stage.findFirst({
    where: {
      name: 'Done',
      isActive: true,
      appliesTo: { in: [flowType as AppliesTo, AppliesTo.BOTH] },
    },
  });

  if (!doneStage) {
    return 0;
  }

  const count = await prisma.request.count({
    where: {
      flowType,
      currentStageId: doneStage.id,
    },
  });

  if (count === 0) return 0;

  // Delete all done requests (cascades handle related records)
  await prisma.request.deleteMany({
    where: {
      flowType,
      currentStageId: doneStage.id,
    },
  });

  await createAuditEvent(AuditEventType.REQUEST_DELETED, actorUserId, null, {
    bulkClear: true,
    flowType,
    count,
  });

  return count;
}

// ============================================================================
// UPDATE REQUEST TAGS
// ============================================================================

export async function updateRequestTags(
  requestId: string,
  tagIds: string[],
  actorUserId: string
): Promise<void> {
  // Get current tags for audit
  const currentTags = await prisma.requestTag.findMany({
    where: { requestId },
    select: { tagId: true },
  });
  const oldTagIds = currentTags.map((t) => t.tagId);

  await prisma.$transaction([
    // Remove all existing tags
    prisma.requestTag.deleteMany({
      where: { requestId },
    }),
    // Add new tags
    prisma.requestTag.createMany({
      data: tagIds.map((tagId) => ({
        requestId,
        tagId,
      })),
    }),
  ]);

  // Create audit event
  await createAuditEvent(AuditEventType.TAGS_UPDATED, actorUserId, requestId, {
    oldTagIds,
    newTagIds: tagIds,
  });
}
