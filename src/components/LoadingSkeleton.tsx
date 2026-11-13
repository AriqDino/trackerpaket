export function PackageListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
            <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-64 rounded bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="h-7 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="space-y-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
