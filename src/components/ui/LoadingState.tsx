/** Shared inline loading indicator — replaces ad-hoc "Loading…" text across pages. Fills the available height when nested in a flex/h-full container; otherwise centers within its own padding. */
export function LoadingState({ label = 'Loading…', fill = true }: { label?: string; fill?: boolean }) {
  return (
    <div role="status" className={`flex items-center justify-center py-16 ${fill ? 'h-full' : ''}`}>
      <div className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <path d="M14.5 8a6.5 6.5 0 00-6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Inline error state with a retry action — replaces dead-end bare error text on fetch failure. */
export function ErrorState({ message, onRetry, fill = true }: { message: string; onRetry?: () => void; fill?: boolean }) {
  return (
    <div role="alert" className={`flex items-center justify-center px-4 py-16 ${fill ? 'h-full' : ''}`}>
      <div className="text-center max-w-sm">
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        {onRetry && (
          <button onClick={onRetry}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
