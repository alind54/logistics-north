import type { Metric } from 'web-vitals';

const VITALS_URL = '/api/vitals';

function getConnectionSpeed(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const conn = (nav as unknown as { connection?: { effectiveType?: string } })?.connection;
  return conn?.effectiveType ?? '';
}

export function reportWebVitals(metric: Metric) {
  const body = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    connectionSpeed: getConnectionSpeed(),
    page: typeof window !== 'undefined' ? window.location.pathname : '',
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Web Vitals]', metric.name, Math.round(metric.value), metric.rating);
  }

  // Send to analytics endpoint (non-blocking)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(VITALS_URL, JSON.stringify(body));
  } else {
    fetch(VITALS_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }
}
