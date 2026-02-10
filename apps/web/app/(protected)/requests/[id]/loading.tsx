export default function RequestDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b pb-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* Content area */}
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-16 w-full animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
