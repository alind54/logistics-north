'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Badge, Button, cn } from '@request-tracker/ui';
import type { RequestListItemDTO, Priority } from '@request-tracker/shared';

interface RequestsTableProps {
  requests: RequestListItemDTO[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const priorityVariant: Record<Priority, 'low' | 'normal' | 'high' | 'urgent'> = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

export function RequestsTable({
  requests,
  totalPages,
  currentPage,
  total,
}: RequestsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {requests.length} of {total} requests
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium md:table-cell">Stage</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium lg:table-cell">Flow Type</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium sm:table-cell">Due Date</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium lg:table-cell">Owner</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/requests/${request.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {request.description.length > 60
                          ? `${request.description.substring(0, 60)}...`
                          : request.description}
                      </Link>
                      {request.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {request.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                              style={{
                                backgroundColor: tag.color ? `${tag.color}20` : undefined,
                                color: tag.color ?? undefined,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {request.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{request.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant[request.priority]} className="text-xs">
                        {request.priority}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="rounded bg-muted px-2 py-1 text-xs">{request.currentStage.name}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm lg:table-cell">{request.flowType}</td>
                    <td className={cn('hidden px-4 py-3 text-sm sm:table-cell', isOverdue(request.dueDate) && 'text-destructive')}>
                      {formatDate(request.dueDate)}
                    </td>
                    <td className="hidden px-4 py-3 text-sm lg:table-cell">
                      {request.owner?.email.split('@')[0] ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(request.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
