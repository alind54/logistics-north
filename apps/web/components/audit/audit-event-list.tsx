'use client';

interface AuditEvent {
  id: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
  actor: { id: string; email: string };
}

interface AuditEventListProps {
  events: AuditEvent[];
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getEventIcon(eventType: string): string {
  if (eventType.includes('CREATED')) return '+';
  if (eventType.includes('UPDATED')) return '~';
  if (eventType.includes('DELETED') || eventType.includes('REMOVED')) return '-';
  if (eventType.includes('MOVED')) return '>';
  if (eventType.includes('ADDED')) return '+';
  if (eventType.includes('LOGIN')) return 'i';
  return '*';
}

function getEventColor(eventType: string): string {
  if (eventType.includes('CREATED') || eventType.includes('ADDED')) return 'bg-green-500/15 text-green-400';
  if (eventType.includes('UPDATED') || eventType.includes('MOVED')) return 'bg-blue-500/15 text-blue-400';
  if (eventType.includes('DELETED') || eventType.includes('REMOVED')) return 'bg-red-500/15 text-red-400';
  return 'bg-muted text-muted-foreground';
}

function renderPayloadDetails(eventType: string, payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  if (eventType === 'STAGE_MOVED') {
    const from = p.fromStageName ?? 'Unknown';
    const to = p.toStageName ?? 'Unknown';
    const reason = p.reason;
    return `${from} → ${to}${reason ? ` (${reason})` : ''}`;
  }

  if (eventType === 'REQUEST_UPDATED' && p.changes) {
    const changes = p.changes as Record<string, { old: unknown; new: unknown }>;
    return Object.entries(changes)
      .map(([field, change]) => `${field}: ${String(change.old ?? '(empty)')} → ${String(change.new ?? '(empty)')}`)
      .join('; ');
  }

  if (eventType === 'ATTACHMENT_ADDED' || eventType === 'ATTACHMENT_REMOVED') {
    return p.fileName ? String(p.fileName) : null;
  }

  if (eventType === 'REQUEST_CREATED') {
    const desc = p.description;
    return desc ? String(desc).substring(0, 60) + (String(desc).length > 60 ? '...' : '') : null;
  }

  if (eventType === 'TAGS_UPDATED') {
    return null;
  }

  return null;
}

export function AuditEventList({ events }: AuditEventListProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const details = renderPayloadDetails(event.eventType, event.payload);

        return (
          <div
            key={event.id}
            className="flex gap-3 rounded-md border px-3 py-2.5"
          >
            {/* Icon */}
            <span
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold ${getEventColor(event.eventType)}`}
            >
              {getEventIcon(event.eventType)}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">
                  {formatEventType(event.eventType)}
                </span>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                by {event.actor.email}
              </p>
              {details && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
