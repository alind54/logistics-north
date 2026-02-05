# Error Handling & Observability

## Error shape
- Use a standard error object with a stable error code.
- Mask internal errors; log full details server-side.

## Logging
- Use structured JSON logs.
- Correlate requests with a requestId.

## Monitoring
- Sentry for exceptions + performance traces (recommended for production)
- Track slow DB queries and high error rates

## Alerts (optional)
- Alert on auth failures spikes
- Alert on 5xx spikes
