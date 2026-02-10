import { notFound } from 'next/navigation';
import { getRequestById } from '@/server/requests';
import { listStages } from '@/server/workflow';
import { getAuditEventsForRequest } from '@/server/audit';
import { getSession } from '@/server/auth/session';
import { hasPermission } from '@/server/auth/rbac';
import { RequestDetail } from '@/components/requests/request-detail';

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

  // Fetch request, stages, and audit events ALL in parallel (no waterfall)
  const [request, allStages, auditData] = await Promise.all([
    getRequestById(id),
    listStages(), // all active stages — cheap query, avoids waterfall
    canViewAudit ? getAuditEventsForRequest(id, { limit: 20 }) : null,
  ]);

  if (!request) {
    notFound();
  }

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
