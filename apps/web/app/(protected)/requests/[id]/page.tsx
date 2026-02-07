import { notFound } from 'next/navigation';
import { getRequestById } from '@/server/requests';
import { getAvailableTransitions, listStages } from '@/server/workflow';
import { getAuditEventsForRequest } from '@/server/audit';
import { getSession } from '@/server/auth/session';
import { hasPermission } from '@/server/auth/rbac';
import { RequestDetail } from '@/components/requests/request-detail';
import { FlowType } from '@request-tracker/shared';

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const userRole = session?.user?.role ?? '';
  const canEdit = hasPermission(userRole, 'request:update');
  const canUpload = hasPermission(userRole, 'attachment:upload');
  const canDeleteAttachment = hasPermission(userRole, 'attachment:delete');
  const canViewAudit = hasPermission(userRole, 'audit:read');

  // Fetch request details
  const request = await getRequestById(id);

  if (!request) {
    notFound();
  }

  // Fetch all stages for the flow type (for progress bar)
  const allStages = await listStages(request.flowType as FlowType);

  // Fetch available transitions (includes toStage data to avoid N+1)
  const transitions = await getAvailableTransitions(
    request.currentStage.id,
    request.flowType as FlowType
  );

  // Fetch audit events if user has permission
  const auditData = canViewAudit
    ? await getAuditEventsForRequest(id, { limit: 20 })
    : null;

  return (
    <RequestDetail
      request={request}
      allStages={allStages}
      availableTransitions={transitions.filter((t) => t.toStage !== null)}
      auditEvents={
        auditData?.events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          payload: e.payloadJson,
          createdAt: e.createdAt.toISOString(),
          actor: e.actor,
        })) ?? []
      }
      canEdit={canEdit}
      canUpload={canUpload}
      canDeleteAttachment={canDeleteAttachment}
      canViewAudit={canViewAudit}
    />
  );
}
