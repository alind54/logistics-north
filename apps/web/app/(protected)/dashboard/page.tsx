import { prisma } from '@/server/db';
import Link from 'next/link';
import { ExportToolbar } from '@/components/dashboard/export-toolbar';
import { formatMrfNumber } from '@request-tracker/shared';

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

  // Fetch dashboard data in small batches to avoid connection pool exhaustion
  const [totalRequests, overdueCount, stages] = await Promise.all([
    prisma.request.count(),
    prisma.request.count({ where: { dueDate: { lt: now } } }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const [overdueRequests, requestsByPriority, requestsByStage] = await Promise.all([
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
    prisma.request.groupBy({
      by: ['priority'],
      _count: true,
    }),
    prisma.request.groupBy({
      by: ['currentStageId'],
      _count: true,
    }),
  ]);

  const [stageHistories, activeProjects, openHistories] = await Promise.all([
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
    prisma.stageHistory.findMany({
      where: { exitedAt: null },
      select: {
        stageId: true,
        enteredAt: true,
      },
    }),
  ]);

  const stageMap = new Map(stages.map((s: { id: string; name: string }) => [s.id, s.name]));

  // Calculate average time per stage (last 30 days)
  const stageTimeMap = new Map<string, number[]>();
  for (const sh of stageHistories) {
    if (!sh.exitedAt) continue;
    const durationMs = sh.exitedAt.getTime() - sh.enteredAt.getTime();
    const existing = stageTimeMap.get(sh.stageId) ?? [];
    existing.push(durationMs);
    stageTimeMap.set(sh.stageId, existing);
  }

  const avgTimeByStage = stages.map((stage: { id: string; name: string }) => {
    const durations = stageTimeMap.get(stage.id) ?? [];
    const avg = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    return { name: stage.name, avgMs: avg, count: durations.length };
  });

  // Calculate aging by stage
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

      {/* Summary Cards */}
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

      {/* Main content: Active Projects (full width) */}
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

      {/* Two-column: Priority Distribution + Projects by Stage */}
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

      {/* Collapsible: Average Time Per Stage */}
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

      {/* Collapsible: Overdue Projects (auto-open if any exist) */}
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
    </div>
  );
}
