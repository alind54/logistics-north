import { NextRequest } from 'next/server';
import { requireAuth } from '@/server/auth/session';
import { eventBus, BOARD_CHANNEL } from '@/server/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/events/board - SSE stream for board updates
export async function GET(_request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(': connected\n\n'));

      const unsubscribe = eventBus.subscribe(BOARD_CHANNEL, (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      // Keepalive every 30 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Cleanup when client disconnects
      _request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(keepalive);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
