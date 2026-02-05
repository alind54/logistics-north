import { notFound } from 'next/navigation';
import { getRequestById } from '@/server/requests';
import { getAvailableTransitions, getStageById } from '@/server/workflow';
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

  // Fetch available transitions for the current stage
  const transitions = await getAvailableTransitions(
    request.currentStage.id,
    request.flowType as FlowType
  );

  // Get stage details for transitions
  const transitionsWithStages = await Promise.all(
    transitions.map(async (t) => {
      const stage = await getStageById(t.toStageId);
      return {
        ...t,
        toStage: stage
          ? {
              id: stage.id,
              name: stage.name,
              orderIndex: stage.orderIndex,
            }
          : null,
      };
    })
  );

  // Fetch audit events if user has permission
  const auditData = canViewAudit
    ? await getAuditEventsForRequest(id, { limit: 20 })
    : null;

  return (
    <RequestDetail
      request={request}
      availableTransitions={transitionsWithStages.filter((t) => t.toStage !== null)}
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
