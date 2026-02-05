'use client';

import { useEffect } from 'react';

export function WebVitalsReporter() {
  useEffect(() => {
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      const { reportWebVitals } = require('@/lib/web-vitals');
      onCLS(reportWebVitals);
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
      onINP(reportWebVitals);
    }).catch(() => {
      // web-vitals not available, ignore
    });
  }, []);

  return null;
}
