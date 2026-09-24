/** Base pulsing placeholder block — compose into page-shaped skeletons instead of a generic spinner. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}
