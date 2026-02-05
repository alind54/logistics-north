import { NextRequest, NextResponse } from 'next/server';
import { handleAuthError } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { prisma } from '@/server/db';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET /api/export/requests?from=&to=&format=csv
export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:read');

    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const requests = await prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        notes: true,
        priority: true,
        flowType: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        currentStage: { select: { name: true } },
        createdBy: { select: { email: true } },
        owner: { select: { email: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    const headers = [
      'ID', 'Description', 'Notes', 'Priority', 'Flow Type',
      'Current Stage', 'Due Date', 'Created At', 'Updated At',
      'Created By', 'Owner', 'Tags',
    ];

    const rows = requests.map((r) => [
      r.id,
      escapeCsvField(r.description),
      escapeCsvField(r.notes ?? ''),
      r.priority,
      r.flowType,
      escapeCsvField(r.currentStage.name),
      r.dueDate ? r.dueDate.toISOString().split('T')[0]! : '',
      r.createdAt.toISOString(),
      r.updatedAt.toISOString(),
      r.createdBy.email,
      r.owner?.email ?? '',
      escapeCsvField(r.tags.map((t) => t.tag.name).join('; ')),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="requests-export-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
