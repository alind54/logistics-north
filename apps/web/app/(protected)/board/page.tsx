import { listRequestsForBoard } from '@/server/requests';
import { Board } from '@/components/board';
import { FlowType } from '@request-tracker/shared';

interface BoardPageProps {
  searchParams: Promise<{ flowType?: string }>;
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const params = await searchParams;
  const flowType = (params.flowType === 'CONTRACT' ? 'CONTRACT' : 'ORDER') as FlowType;

  // Fetch initial board data server-side
  const columns = await listRequestsForBoard(flowType);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Board initialFlowType={flowType} initialColumns={columns} />
    </div>
  );
}
