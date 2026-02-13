import type { AuditLog } from '../../types';

interface RecentActivityProps {
  logs: AuditLog[];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getActionDescription(action: string, entityType: string): string {
  const entity = entityType.replace(/_/g, ' ');

  switch (action) {
    case 'create':
      return `created a ${entity}`;
    case 'update':
      return `updated a ${entity}`;
    case 'delete':
      return `deleted a ${entity}`;
    case 'move_stage':
      return `moved ${entity} to new stage`;
    case 'correction':
      return `applied a correction to ${entity}`;
    default:
      return `${action} on ${entity}`;
  }
}

const ACTION_BADGE_STYLES: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  move_stage: 'bg-purple-100 text-purple-700',
  correction: 'bg-amber-100 text-amber-700',
};

export default function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const badgeStyle = ACTION_BADGE_STYLES[log.action] || 'bg-gray-100 text-gray-700';
            const userName = log.user_name || log.user_email || 'Unknown user';
            const description = getActionDescription(log.action, log.entity_type);

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="shrink-0 mt-0.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle}`}
                  >
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{userName}</span>{' '}
                    {description}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.entity_type} &middot; {formatRelativeTime(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
