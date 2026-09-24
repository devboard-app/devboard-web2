import type { ReactNode } from 'react';
import type { Project, TabType } from '@/types';
import { ProjectTopBar } from './ProjectTopBar';

type SettingsTab = 'labels' | 'members';

interface Props {
  teamName: string;
  onGoToTeam: () => void;
  project: Project;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onNavigateProjectTab: (tab: TabType) => void;
  onOpenReports: () => void;
  children: ReactNode;
}

const TABS: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  {
    id: 'labels',
    label: 'Labels',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 6.5L2 3a1 1 0 011-1h3.5L12 7.5 6.5 13 1 7.5V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><circle cx="4.5" cy="4.5" r="0.75" fill="currentColor" /></svg>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 6a2 2 0 100-4 2 2 0 000 4zM9.5 5.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5zM1 12c0-2.02 1.79-3.5 4-3.5s4 1.48 4 3.5M9.5 8.5c1.8 0 3.5 1.2 3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
    ),
  },
];

export function ProjectSettingsPage({ teamName, onGoToTeam, project, activeTab, onTabChange, onNavigateProjectTab, onOpenReports, children }: Props) {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <ProjectTopBar
        teamName={teamName}
        onGoToTeam={onGoToTeam}
        project={project}
        activeTab="settings"
        onTabChange={onNavigateProjectTab}
        onOpenReports={onOpenReports}
        onOpenSettings={() => onTabChange(activeTab)}
      />
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5">
        <div className="flex gap-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
