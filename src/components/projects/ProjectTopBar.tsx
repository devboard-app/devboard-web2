import type { Project, TabType } from '@/types';

type PrimaryTab = TabType | 'settings' | 'reports';

interface Props {
  teamName: string;
  onGoToTeam: () => void;
  project: Project;
  sprintLabel?: string;
  activeTab: PrimaryTab;
  onTabChange: (tab: TabType) => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'sprints', label: 'Sprints' },
];

export function ProjectTopBar({ teamName, onGoToTeam, project, sprintLabel, activeTab, onTabChange, onOpenReports, onOpenSettings }: Props) {
  return (
    <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 pt-3 pb-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">
        <button onClick={onGoToTeam} className="hover:text-zinc-700 dark:hover:text-zinc-200 hover:underline transition-colors">{teamName}</button>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-500 dark:text-zinc-400">{project.name}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{project.key[0]}</span>
        </div>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h1>
        {sprintLabel && (
          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium rounded-full border border-emerald-200 dark:border-emerald-900">
            {sprintLabel} active
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between -mb-px">
        <div className="flex items-center gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-200 dark:hover:border-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
          <button onClick={onOpenReports}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-200 dark:hover:border-zinc-700'
            }`}>
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1" y="8" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2" /><rect x="6" y="5" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2" /><rect x="11" y="2" width="3" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.2" /></svg>
            Reports
          </button>
        </div>
        <button onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-200 dark:hover:border-zinc-700'
          }`}>
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 8.3a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z" stroke="currentColor" strokeWidth="1.1" /><path d="M10.9 6.5c0 .3 0 .5-.06.8l1.06.83-.8 1.38-1.24-.42a3.5 3.5 0 01-.7.4l-.2 1.31H7.34l-.2-1.3a3.5 3.5 0 01-.7-.41l-1.24.42-.8-1.38 1.06-.83a3.6 3.6 0 010-1.6L4.4 4.85l.8-1.38 1.24.42c.21-.17.45-.31.7-.4l.2-1.3h1.62l.2 1.3c.25.09.49.23.7.4l1.24-.42.8 1.38-1.06.83c.05.26.06.53.06.8z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
          Settings
        </button>
      </div>
    </div>
  );
}
