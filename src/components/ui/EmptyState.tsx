import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

/** Shared empty-state card — replaces ad-hoc "No X yet" markup that varied per page. */
export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400 dark:text-zinc-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
      {description && <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 mb-4">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors ${description ? '' : 'mt-4'}`}>
          {action.label}
        </button>
      )}
    </div>
  );
}
