import { listRequestsForBoard, type BoardColumn } from '@/server/requests';
import { Board } from '@/components/board';
import { FlowType } from '@request-tracker/shared';
import { getSession } from '@/server/auth/session';
import { hasPermission } from '@/server/auth/rbac';

interface BoardPageProps {
  searchParams: Promise<{ flowType?: string }>;
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const params = await searchParams;
  const flowType = (params.flowType === 'CONTRACT' ? 'CONTRACT' : 'ORDER') as FlowType;

  const session = await getSession();
  const userRole = session?.user?.role ?? '';
  const canDelete = hasPermission(userRole, 'request:delete');

  // Fetch initial board data server-side (fallback to empty on DB errors)
  let columns: BoardColumn[];
  try {
    columns = await listRequestsForBoard(flowType);
  } catch {
    columns = [];
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Board initialFlowType={flowType} initialColumns={columns} canDelete={canDelete} />
    </div>
  );
}
