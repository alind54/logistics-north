import { NextRequest } from 'next/server';
import { apiSuccess, handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { removeAttachment, getAttachmentMeta } from '@/server/attachments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/attachments/:id - Delete an attachment
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('attachment:delete');
    const { id } = await params;

    // Verify attachment exists
    const meta = await getAttachmentMeta(id);
    if (!meta) {
      return notFound('Attachment');
    }

    const deleted = await removeAttachment(id, user.id);
    if (!deleted) {
      return notFound('Attachment');
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
