import { Suspense } from 'react';
import { prisma } from '@/server/db';
import Link from 'next/link';
import { ExportToolbar } from '@/components/dashboard/export-toolbar';
import { formatMrfNumber } from '@request-tracker/shared';

export const dynamic = 'force-dynamic';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function DashboardPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // BATCH 1: Lightweight aggregation queries — render stat cards immediately
  const [totalRequests, overdueCount, stages, requestsByPriority, requestsByStage, avgStageTimesRaw] = await Promise.all([
    prisma.request.count(),
    prisma.request.count({ where: { dueDate: { lt: now } } }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.request.groupBy({
      by: ['priority'],
      _count: true,
    }),
    prisma.request.groupBy({
      by: ['currentStageId'],
      _count: true,
    }),
    prisma.$queryRaw<Array<{ stageId: string; avgMs: number; count: bigint }>>`
      SELECT
        "stageId",
        AVG(EXTRACT(EPOCH FROM ("exitedAt" - "enteredAt")) * 1000)::float8 AS "avgMs",
        COUNT(*)::bigint AS "count"
      FROM stage_history
      WHERE "exitedAt" IS NOT NULL
        AND "enteredAt" >= ${thirtyDaysAgo}
      GROUP BY "stageId"
    `,
  ]);

  const stageMap = new Map(stages.map((s: { id: string; name: string }) => [s.id, s.name]));

  const avgTimeMap = new Map(avgStageTimesRaw.map((r) => [r.stageId, r]));
  const avgTimeByStage = stages.map((stage: { id: string; name: string }) => {
    const data = avgTimeMap.get(stage.id);
    return {
      name: stage.name,
      avgMs: data?.avgMs ?? 0,
      count: data ? Number(data.count) : 0,
    };
  });

  const urgentCount = requestsByPriority.find((p: { priority: string; _count: number }) => p.priority === 'URGENT')?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of project tracking metrics
          </p>
        </div>
        <ExportToolbar />
      </div>

      {/* Summary Cards — rendered immediately from batch 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground">Total Projects</h3>
          <p className="mt-1 text-3xl font-bold">{totalRequests}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground">Overdue</h3>
          <p className="mt-1 text-3xl font-bold text-destructive">{overdueCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground">Active Stages</h3>
          <p className="mt-1 text-3xl font-bold">{stages.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-medium text-muted-foreground">Urgent Projects</h3>
          <p className="mt-1 text-3xl font-bold text-orange-500">{urgentCount}</p>
        </div>
      </div>

      {/* Two-column: Priority Distribution + Projects by Stage — from batch 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Priority Distribution</h2>
          <div className="space-y-3">
            {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((priority) => {
              const count = requestsByPriority.find((p: { priority: string; _count: number }) => p.priority === priority)?._count ?? 0;
              const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{priority}</span>
                    <span className="text-muted-foreground">{count} ({percentage}%)</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${
                        priority === 'URGENT'
                          ? 'bg-red-500'
                          : priority === 'HIGH'
                            ? 'bg-orange-500'
                            : priority === 'NORMAL'
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Projects by Stage</h2>
          <div className="space-y-2">
            {requestsByStage.map((item: { currentStageId: string; _count: number }) => (
              <div
                key={item.currentStageId}
                className="flex items-center justify-between rounded bg-muted/50 px-3 py-2"
              >
                <span>{stageMap.get(item.currentStageId) ?? 'Unknown'}</span>
                <span className="font-medium">{item._count}</span>
              </div>
            ))}
            {requestsByStage.length === 0 && (
              <p className="text-muted-foreground">No projects yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible: Average Time Per Stage — from batch 1 */}
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-6 py-4 text-lg font-semibold hover:bg-muted/50">
          Average Time Per Stage (Last 30 Days)
        </summary>
        <div className="overflow-x-auto border-t px-6 pb-6 pt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left text-sm font-medium">Stage</th>
                <th className="pb-3 text-left text-sm font-medium">Avg Duration</th>
                <th className="pb-3 text-right text-sm font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {avgTimeByStage.map((stage) => (
                <tr key={stage.name} className="border-b last:border-0">
                  <td className="py-3 font-medium">{stage.name}</td>
                  <td className="py-3 text-sm">
                    {stage.count > 0 ? formatDuration(stage.avgMs) : '-'}
                  </td>
                  <td className="py-3 text-right text-sm text-muted-foreground">
                    {stage.count} project{stage.count !== 1 ? 's' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Streamed: Active Projects + Aging + Overdue (batch 2 queries) */}
      <Suspense fallback={<DashboardDetailsSkeleton />}>
        <DashboardDetails
          stages={stages}
          overdueCount={overdueCount}
          nowMs={now.getTime()}
        />
      </Suspense>
    </div>
  );
}

function DashboardDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
      <div className="h-16 animate-pulse rounded-lg border bg-card" />
      <div className="h-16 animate-pulse rounded-lg border bg-card" />
    </div>
  );
}

async function DashboardDetails({
  stages,
  overdueCount,
  nowMs,
}: {
  stages: { id: string; name: string }[];
  overdueCount: number;
  nowMs: number;
}) {
  const now = new Date(nowMs);

  const [overdueRequests, activeProjects, agingBucketsRaw] = await Promise.all([
    prisma.request.findMany({
      where: { dueDate: { lt: now } },
      select: {
        id: true,
        mrfNumber: true,
        description: true,
        priority: true,
        dueDate: true,
        currentStage: { select: { name: true } },
        owner: { select: { email: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
    prisma.request.findMany({
      where: {
        currentStage: { name: { not: 'Done' } },
      },
      select: {
        id: true,
        mrfNumber: true,
        description: true,
        priority: true,
        flowType: true,
        createdAt: true,
        currentStage: { select: { id: true, name: true, orderIndex: true } },
        owner: { select: { email: true } },
        stageHistory: {
          where: { exitedAt: null },
          select: { enteredAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.$queryRaw<Array<{
      stageId: string;
      under24h: bigint;
      d1to3: bigint;
      d3to7: bigint;
      over7d: bigint;
    }>>`
      SELECT
        "stageId",
        COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - "enteredAt")) < 86400)::bigint AS "under24h",
        COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - "enteredAt")) BETWEEN 86400 AND 259200)::bigint AS "d1to3",
        COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - "enteredAt")) BETWEEN 259200 AND 604800)::bigint AS "d3to7",
        COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - "enteredAt")) > 604800)::bigint AS "over7d"
      FROM stage_history
      WHERE "exitedAt" IS NULL
      GROUP BY "stageId"
    `,
  ]);

  const agingBuckets = new Map(
    agingBucketsRaw.map((r) => [
      r.stageId,
      {
        under24h: Number(r.under24h),
        d1to3: Number(r.d1to3),
        d3to7: Number(r.d3to7),
        over7d: Number(r.over7d),
      },
    ])
  );

  return (
    <>
      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Active Projects</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium">MRF #</th>
                  <th className="pb-3 text-left text-sm font-medium">Description</th>
                  <th className="pb-3 text-left text-sm font-medium">Priority</th>
                  <th className="pb-3 text-left text-sm font-medium">Current Stage</th>
                  <th className="pb-3 text-right text-sm font-medium">Days in Stage</th>
                  <th className="pb-3 text-right text-sm font-medium">Total Days</th>
                  <th className="hidden pb-3 text-left text-sm font-medium sm:table-cell">Owner</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((project) => {
                  const enteredAt = project.stageHistory[0]?.enteredAt;
                  const daysInStage = enteredAt
                    ? Math.max(1, Math.ceil((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)))
                    : 0;
                  const totalDays = Math.max(1, Math.ceil((now.getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <tr key={project.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <Link href={`/requests/${project.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                          {formatMrfNumber(project.mrfNumber)}
                        </Link>
                      </td>
                      <td className="py-3 text-sm">
                        {project.description.length > 40
                          ? `${project.description.substring(0, 40)}...`
                          : project.description}
                      </td>
                      <td className="py-3">
                        <span className={`rounded px-2 py-1 text-xs ${
                          project.priority === 'URGENT' ? 'bg-red-500/15 text-red-400' :
                          project.priority === 'HIGH' ? 'bg-orange-500/15 text-orange-400' :
                          project.priority === 'NORMAL' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-slate-500/15 text-slate-300'
                        }`}>
                          {project.priority}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-muted px-2 py-1 text-xs">{project.currentStage.name}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-sm font-medium ${
                          daysInStage > 7 ? 'text-destructive' :
                          daysInStage > 3 ? 'text-yellow-400' :
                          'text-muted-foreground'
                        }`}>
                          {daysInStage}d
                        </span>
                      </td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        {totalDays}d
                      </td>
                      <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                        {project.owner?.email.split('@')[0] ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collapsible: Aging by Stage */}
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-6 py-4 text-lg font-semibold hover:bg-muted/50">
          Aging by Stage
        </summary>
        <div className="overflow-x-auto border-t px-6 pb-6 pt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            How long projects have been sitting in each stage
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left text-sm font-medium">Stage</th>
                <th className="pb-3 text-center text-sm font-medium">&lt; 24h</th>
                <th className="pb-3 text-center text-sm font-medium">1-3 days</th>
                <th className="pb-3 text-center text-sm font-medium">3-7 days</th>
                <th className="pb-3 text-center text-sm font-medium">&gt; 7 days</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage: { id: string; name: string }) => {
                const bucket = agingBuckets.get(stage.id);
                const total = bucket
                  ? bucket.under24h + bucket.d1to3 + bucket.d3to7 + bucket.over7d
                  : 0;
                if (total === 0) return null;
                return (
                  <tr key={stage.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{stage.name}</td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-green-500/15 px-2 py-1 text-xs text-green-400">
                        {bucket?.under24h ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-yellow-500/15 px-2 py-1 text-xs text-yellow-400">
                        {bucket?.d1to3 ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-orange-500/15 px-2 py-1 text-xs text-orange-400">
                        {bucket?.d3to7 ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-red-500/15 px-2 py-1 text-xs text-red-400">
                        {bucket?.over7d ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Collapsible: Overdue Projects */}
      {overdueRequests.length > 0 && (
        <details open className="rounded-lg border bg-card">
          <summary className="cursor-pointer px-6 py-4 text-lg font-semibold text-destructive hover:bg-muted/50">
            Overdue Projects ({overdueCount})
          </summary>
          <div className="overflow-x-auto border-t px-6 pb-6 pt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium">MRF #</th>
                  <th className="pb-3 text-left text-sm font-medium">Description</th>
                  <th className="pb-3 text-left text-sm font-medium">Stage</th>
                  <th className="pb-3 text-left text-sm font-medium">Priority</th>
                  <th className="pb-3 text-left text-sm font-medium">Due Date</th>
                  <th className="hidden pb-3 text-left text-sm font-medium sm:table-cell">Owner</th>
                </tr>
              </thead>
              <tbody>
                {overdueRequests.map((req: { id: string; mrfNumber: number; description: string; priority: string; dueDate: Date | null; currentStage: { name: string }; owner: { email: string } | null }) => (
                  <tr key={req.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {formatMrfNumber(req.mrfNumber)}
                      </Link>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {req.description.length > 50
                          ? `${req.description.substring(0, 50)}...`
                          : req.description}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-muted px-2 py-1 text-xs">
                        {req.currentStage.name}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          req.priority === 'URGENT'
                            ? 'bg-red-500/15 text-red-400'
                            : req.priority === 'HIGH'
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {req.priority}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-destructive">
                      {req.dueDate ? formatDate(req.dueDate) : '-'}
                    </td>
                    <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                      {req.owner?.email.split('@')[0] ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </>
  );
}
