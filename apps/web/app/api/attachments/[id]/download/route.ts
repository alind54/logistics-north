import { NextRequest, NextResponse } from 'next/server';
import { handleAuthError, notFound } from '@/server/api-utils';
import { requirePermission } from '@/server/auth/rbac';
import { downloadAttachment, getAttachmentMeta } from '@/server/attachments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/attachments/:id/download - Download an attachment
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission('attachment:download');
    const { id } = await params;

    // Verify attachment exists and get metadata
    const meta = await getAttachmentMeta(id);
    if (!meta) {
      return notFound('Attachment');
    }

    // Download file
    const result = await downloadAttachment(id);
    if (!result) {
      return notFound('Attachment file');
    }

    // Return file as response with proper headers
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        'Content-Length': result.buffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
