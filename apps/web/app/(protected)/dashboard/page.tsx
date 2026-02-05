import { prisma } from '@/server/db';
import Link from 'next/link';
import { ExportToolbar } from '@/components/dashboard/export-toolbar';

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

  // Fetch all dashboard data in parallel
  const [
    totalRequests,
    overdueRequests,
    requestsByPriority,
    requestsByStage,
    stages,
    stageHistories,
  ] = await Promise.all([
    prisma.request.count(),
    prisma.request.findMany({
      where: { dueDate: { lt: now } },
      select: {
        id: true,
        description: true,
        priority: true,
        dueDate: true,
        currentStage: { select: { name: true } },
        owner: { select: { email: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
    prisma.request.groupBy({
      by: ['priority'],
      _count: true,
    }),
    prisma.request.groupBy({
      by: ['currentStageId'],
      _count: true,
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true },
    }),
    // Completed stage_history entries from the last 30 days for avg time calculations
    prisma.stageHistory.findMany({
      where: {
        exitedAt: { not: null },
        enteredAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        stageId: true,
        enteredAt: true,
        exitedAt: true,
      },
    }),
  ]);

  // Count overdue separately (findMany might be limited by take)
  const overdueCount = await prisma.request.count({
    where: { dueDate: { lt: now } },
  });

  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

  // Calculate average time per stage (last 30 days)
  const stageTimeMap = new Map<string, number[]>();
  for (const sh of stageHistories) {
    if (!sh.exitedAt) continue;
    const durationMs = sh.exitedAt.getTime() - sh.enteredAt.getTime();
    const existing = stageTimeMap.get(sh.stageId) ?? [];
    existing.push(durationMs);
    stageTimeMap.set(sh.stageId, existing);
  }

  const avgTimeByStage = stages.map((stage) => {
    const durations = stageTimeMap.get(stage.id) ?? [];
    const avg = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    return { name: stage.name, avgMs: avg, count: durations.length };
  });

  // Calculate aging by stage (current open stage_history entries)
  const openHistories = await prisma.stageHistory.findMany({
    where: { exitedAt: null },
    select: {
      stageId: true,
      enteredAt: true,
    },
  });

  const agingBuckets = new Map<string, { under24h: number; d1to3: number; d3to7: number; over7d: number }>();
  for (const oh of openHistories) {
    const ageMs = now.getTime() - oh.enteredAt.getTime();
    const bucket = agingBuckets.get(oh.stageId) ?? { under24h: 0, d1to3: 0, d3to7: 0, over7d: 0 };
    const hours = ageMs / (1000 * 60 * 60);
    if (hours < 24) bucket.under24h++;
    else if (hours < 72) bucket.d1to3++;
    else if (hours < 168) bucket.d3to7++;
    else bucket.over7d++;
    agingBuckets.set(oh.stageId, bucket);
  }

  const urgentCount = requestsByPriority.find((p) => p.priority === 'URGENT')?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of request tracking metrics
          </p>
        </div>
      </div>

      <ExportToolbar />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Requests</h3>
          <p className="mt-2 text-3xl font-bold">{totalRequests}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Overdue</h3>
          <p className="mt-2 text-3xl font-bold text-destructive">{overdueCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Active Stages</h3>
          <p className="mt-2 text-3xl font-bold">{stages.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Urgent Requests</h3>
          <p className="mt-2 text-3xl font-bold text-orange-500">{urgentCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Distribution */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Priority Distribution</h2>
          <div className="space-y-3">
            {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((priority) => {
              const count = requestsByPriority.find((p) => p.priority === priority)?._count ?? 0;
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

        {/* Requests by Stage */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Requests by Stage</h2>
          <div className="space-y-2">
            {requestsByStage.map((item) => (
              <div
                key={item.currentStageId}
                className="flex items-center justify-between rounded bg-muted/50 px-3 py-2"
              >
                <span>{stageMap.get(item.currentStageId) ?? 'Unknown'}</span>
                <span className="font-medium">{item._count}</span>
              </div>
            ))}
            {requestsByStage.length === 0 && (
              <p className="text-muted-foreground">No requests yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Average Time Per Stage (last 30 days) */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Average Time Per Stage (Last 30 Days)</h2>
        <div className="overflow-x-auto">
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
                    {stage.count} request{stage.count !== 1 ? 's' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aging by Stage */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Aging by Stage</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          How long requests have been sitting in each stage
        </p>
        <div className="overflow-x-auto">
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
              {stages.map((stage) => {
                const bucket = agingBuckets.get(stage.id);
                const total = bucket
                  ? bucket.under24h + bucket.d1to3 + bucket.d3to7 + bucket.over7d
                  : 0;
                if (total === 0) return null;
                return (
                  <tr key={stage.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{stage.name}</td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                        {bucket?.under24h ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                        {bucket?.d1to3 ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                        {bucket?.d3to7 ?? 0}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                        {bucket?.over7d ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Requests List */}
      {overdueRequests.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-destructive">
            Overdue Requests ({overdueCount})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium">Description</th>
                  <th className="pb-3 text-left text-sm font-medium">Stage</th>
                  <th className="pb-3 text-left text-sm font-medium">Priority</th>
                  <th className="pb-3 text-left text-sm font-medium">Due Date</th>
                  <th className="hidden pb-3 text-left text-sm font-medium sm:table-cell">Owner</th>
                </tr>
              </thead>
              <tbody>
                {overdueRequests.map((req) => (
                  <tr key={req.id} className="border-b last:border-0">
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
                            ? 'bg-red-100 text-red-700'
                            : req.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
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
        </div>
      )}
    </div>
  );
}
