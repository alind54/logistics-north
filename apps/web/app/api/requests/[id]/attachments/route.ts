import { NextRequest } from 'next/server';
import {
  apiSuccess,
  handleAuthError,
  notFound,
  badRequest,
} from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { getRequestById } from '@/server/requests';
import { uploadAttachment, listAttachments } from '@/server/attachments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/:id/attachments - List attachments for a request
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('attachment:download');
    const { id } = await params;

    const request = await getRequestById(id);
    if (!request) {
      return notFound('Request');
    }

    const attachments = await listAttachments(id);

    return apiSuccess({ attachments });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/requests/:id/attachments - Upload an attachment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('attachment:upload');
    const { id } = await params;

    // Verify request exists
    const existing = await getRequestById(id);
    if (!existing) {
      return notFound('Request');
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const stageId = formData.get('stageId') as string | null;

    if (!file || !(file instanceof File)) {
      return badRequest('No file provided. Send a "file" field in multipart form data.');
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const result = await uploadAttachment(
        id,
        file.name,
        file.type,
        buffer,
        user.id,
        stageId || existing.currentStage.id
      );

      return apiSuccess(result, 201);
    } catch (error) {
      if (error instanceof Error) {
        return badRequest(error.message);
      }
      throw error;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
