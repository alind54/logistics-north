import { notFound } from 'next/navigation';
import { getRequestById } from '@/server/requests';
import { listStages } from '@/server/workflow';
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

  // Fetch request first (others depend on it)
  const request = await getRequestById(id);

  if (!request) {
    notFound();
  }

  // Fetch stages and audit events in parallel
  const [allStages, auditData] = await Promise.all([
    listStages(request.flowType as FlowType),
    canViewAudit ? getAuditEventsForRequest(id, { limit: 20 }) : null,
  ]);

  return (
    <RequestDetail
      request={request}
      allStages={allStages}
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
