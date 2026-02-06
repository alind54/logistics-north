import { listRequests } from '@/server/requests';
import { listStages } from '@/server/workflow';
import { FilterBar } from '@/components/filters/filter-bar';
import { RequestsTable } from '@/components/requests/requests-table';

interface RequestsPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    stageId?: string;
    priority?: string;
    flowType?: string;
    dueBefore?: string;
    dueAfter?: string;
  }>;
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));

  // Build filters from search params
  const filters = {
    query: params.query || undefined,
    stageId: params.stageId || undefined,
    priority: params.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | undefined,
    flowType: params.flowType as 'ORDER' | 'CONTRACT' | undefined,
    dueBefore: params.dueBefore || undefined,
    dueAfter: params.dueAfter || undefined,
  };

  // Fetch requests and stages server-side
  const [requestsData, stages] = await Promise.all([
    listRequests(filters, { field: 'createdAt', direction: 'desc' }, page, 20),
    listStages(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-muted-foreground">
          Manage and track all projects
        </p>
      </div>

      <FilterBar stages={stages} />

      <RequestsTable
        requests={requestsData.items}
        totalPages={requestsData.totalPages}
        currentPage={page}
        total={requestsData.total}
      />
    </div>
  );
}
