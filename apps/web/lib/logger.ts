import * as crypto from 'crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

let correlationId: string | null = null;

export function setCorrelationId(id?: string): string {
  correlationId = id ?? crypto.randomUUID();
  return correlationId;
}

export function getCorrelationId(): string | null {
  return correlationId;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const cid = correlationId ? ` [cid:${correlationId}]` : '';
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${cid} ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    console.info(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context));
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };
    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
    } else if (error) {
      errorContext.error = error;
    }
    console.error(formatLog('error', message, errorContext));

    // Optional Sentry integration (install @sentry/nextjs and set SENTRY_DSN to enable)
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/nextjs') as { captureException: (err: unknown, opts?: unknown) => void };
        Sentry.captureException(error instanceof Error ? error : new Error(message), {
          extra: errorContext,
        });
      } catch {
        // Sentry not installed, silently ignore
      }
    }
  },

  // Audit logging for security events
  audit(action: string, userId: string | null, context?: LogContext) {
    const auditContext: LogContext = {
      ...context,
      action,
      userId: userId ?? 'anonymous',
      type: 'AUDIT',
    };
    console.info(formatLog('info', `AUDIT: ${action}`, auditContext));
  },
};
