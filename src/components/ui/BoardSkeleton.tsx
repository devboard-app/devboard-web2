import { Skeleton } from './Skeleton';

const COLUMN_CARD_COUNTS = [3, 2, 1, 2];

function CardPlaceholder() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
      <Skeleton className="h-3 w-10 mb-2.5" />
      <Skeleton className="h-3.5 w-full mb-1.5" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}

/** Mirrors BoardView's column layout so the board doesn't visually jump once tickets arrive. */
export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading board" className="h-full overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 h-full p-4 min-w-max md:min-w-0 md:w-full">
        {COLUMN_CARD_COUNTS.map((count, i) => (
          <div key={i} className="flex flex-col w-[280px] md:flex-1 flex-shrink-0 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="flex-1 px-2 pb-2 space-y-2">
              {Array.from({ length: count }).map((_, j) => <CardPlaceholder key={j} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
