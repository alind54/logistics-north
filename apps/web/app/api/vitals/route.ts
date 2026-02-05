import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/vitals - Receive Web Vitals metrics
export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();

    logger.info('Web Vital', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      page: metric.page,
      connectionSpeed: metric.connectionSpeed,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
