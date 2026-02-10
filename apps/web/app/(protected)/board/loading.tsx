export default function BoardLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex min-w-[180px] max-w-[240px] flex-1 flex-shrink-0 flex-col rounded-lg border bg-muted/30"
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-20 animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
