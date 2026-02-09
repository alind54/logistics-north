export default function TodosLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded-lg border bg-card" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <div className="h-5 w-5 animate-pulse rounded border bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
