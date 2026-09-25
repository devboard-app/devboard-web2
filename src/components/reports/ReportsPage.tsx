import { useEffect, useState } from 'react';
import type { Project, TabType } from '@/types';
import { ActivityTimeline, ActivityTimelineSkeleton } from '@/components/activity/ActivityTimeline';
import { useReport } from '@/hooks/useReport';
import { useProjectActivity } from '@/hooks/useProjectActivity';
import { listSprints, type ApiSprintSummary } from '@/api/sprints';
import {
  getVelocity, getCycleTime, getBurndown,
  type BurndownReport, type SprintVelocity,
} from '@/api/reports';
import { ChatPanel } from './ChatPanel';
import { ProjectTopBar } from '@/components/projects/ProjectTopBar';
import { Skeleton } from '@/components/ui/Skeleton';

type ReportTab = 'activity' | 'dashboard';

function RefreshButton({ onClick, loading, label }: { onClick: () => void; loading?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading} aria-label={label} title={label}
      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 flex-shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={loading ? 'animate-spin' : ''}>
        <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="1 20 1 14 7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ReportState({ loading, error, onRetry, empty, emptyText, skeleton, children }: {
  loading: boolean; error: string | null; onRetry?: () => void; empty?: boolean; emptyText?: string;
  /** Page-shaped placeholder shown while loading; without it a small spinner is used. */
  skeleton?: React.ReactNode; children: React.ReactNode;
}) {
  if (loading) {
    if (skeleton) return <div role="status" aria-label="Loading">{skeleton}</div>;
    return (
      <div role="status" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-4">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="animate-spin" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <path d="M14.5 8a6.5 6.5 0 00-6.5-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>Loading…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-red-600 dark:text-red-400 py-4">
        <span>{error}</span>
        {onRetry && (
          <button onClick={onRetry}
            className="px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Try again
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-10 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function StatTilesSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-40 w-full rounded-lg" />;
}

function StatTiles({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
      {stats.map(s => (
        <div key={s.label}>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{s.value}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function GroupedBarChart({ data }: { data: SprintVelocity[] }) {
  // `|| 1` keeps the scale finite when every sprint has zero points.
  const max = (Math.max(...data.flatMap(d => [d.completed_points, d.committed_points])) || 1) * 1.15;
  const groupW = 70;
  // Floor the width so a project with one or two sprints doesn't render a tiny chart.
  const width = Math.max(data.length * groupW, 280);

  return (
    <svg viewBox={`0 0 ${width} 160`} className="w-full" style={{ height: 160 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
        <line key={frac} x1="0" y1={140 - frac * 130} x2={width} y2={140 - frac * 130}
          stroke="currentColor" strokeWidth="0.5" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="4 4" />
      ))}
      {data.map((d, i) => {
        const ph = (d.committed_points / max) * 130;
        const ch = (d.completed_points / max) * 130;
        const x = i * groupW + 6;
        return (
          <g key={d.sprint_id}>
            <rect x={x} y={140 - ph} width={22} height={ph} rx="2" fill="#A5B4FC" className="hover:fill-opacity-90" />
            <rect x={x + 25} y={140 - ch} width={22} height={ch} rx="2" fill="#6366F1" className="hover:fill-opacity-90" />
            <text x={x + 23} y={155} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-600" style={{ fontSize: 9 }}>
              <title>{d.sprint_name}</title>
              {d.sprint_name.length > 10 ? `${d.sprint_name.slice(0, 9)}…` : d.sprint_name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface BurndownPoint { label: string; remaining: number | null; ideal: number }

function BurndownChart({ data }: { data: BurndownPoint[] }) {
  const max = (Math.max(...data.map(d => Math.max(d.ideal, d.remaining ?? 0))) || 1) * 1.1;
  const w = 600;
  const h = 160;
  const pad = { l: 30, r: 10, t: 10, b: 25 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const n = data.length;

  // A one-day sprint has a single point, which would divide by zero below.
  function px(i: number) { return pad.l + (n > 1 ? i / (n - 1) : 0.5) * cw; }
  function py(v: number) { return pad.t + ch - (v / max) * ch; }

  const actual = data.map((d, i) => ({ d, i })).filter(({ d }) => d.remaining !== null);
  const idealPoints = data.map((d, i) => `${px(i)},${py(d.ideal)}`).join(' ');
  const actualPoints = actual.map(({ d, i }) => `${px(i)},${py(d.remaining!)}`).join(' ');
  const labelStep = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
        <line key={frac} x1={pad.l} y1={pad.t + frac * ch} x2={w - pad.r} y2={pad.t + frac * ch}
          stroke="currentColor" strokeWidth="0.5" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="4 4" />
      ))}
      <polyline points={idealPoints} fill="none" stroke="#A5B4FC" strokeWidth="1.5" strokeDasharray="6 3" />
      {actual.length > 0 && (
        <>
          <polyline points={actualPoints} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={`${actualPoints} ${px(actual[actual.length - 1].i)},${pad.t + ch} ${px(actual[0].i)},${pad.t + ch}`}
            fill="#6366F1" fillOpacity="0.06" />
          {actual.map(({ d, i }) => <circle key={i} cx={px(i)} cy={py(d.remaining!)} r="3" fill="#6366F1" />)}
        </>
      )}
      {data.map((d, i) => i % labelStep === 0 && (
        <text key={i} x={px(i)} y={h - 4} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-600" style={{ fontSize: 8 }}>
          {d.label}
        </text>
      ))}
    </svg>
  );
}

const DAY_MS = 86_400_000;
const MAX_WINDOW_DAYS = 120;

function utcDay(iso: string) { return new Date(`${iso}T00:00:00Z`); }
function dayLabel(d: Date) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }

/**
 * The API only returns days up to today, so an active sprint's ideal line would stop
 * at today. Extends it to the sprint end using the server's own rule (linear over
 * weekdays), purely for display; the actual line is never extrapolated.
 */
function buildBurndownSeries(r: BurndownReport): BurndownPoint[] {
  const actualByDay = new Map(r.days.map(d => [d.day, d]));
  const start = utcDay(r.start_date);
  const end = utcDay(r.end_date);
  const span = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;

  if (span < 1 || span > MAX_WINDOW_DAYS) {
    return r.days.map(d => ({ label: dayLabel(utcDay(d.day)), remaining: d.remaining_points, ideal: d.ideal_points }));
  }

  const days = Array.from({ length: span }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  const workDays = days.filter(d => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
  const steps = Math.max(workDays.length - 1, 1);

  return days.map(d => {
    const actual = actualByDay.get(d.toISOString().slice(0, 10));
    const elapsed = Math.max(workDays.filter(w => w <= d).length - 1, 0);
    return {
      label: dayLabel(d),
      remaining: actual ? actual.remaining_points : null,
      ideal: actual ? actual.ideal_points : Math.round(r.committed_points * (1 - elapsed / steps) * 100) / 100,
    };
  });
}

const card = 'bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800';

function ActivityTab({ project, isLead }: { project: Project; isLead: boolean }) {
  const { events, total, loading, loadingMore, error, loadMore, refetch, userFor } = useProjectActivity(project.id, project.members);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {isLead ? 'All project activity' : "Showing your own activity. Project leads see everyone's."}
        </p>
        <RefreshButton onClick={refetch} loading={loading} label="Refresh activity" />
      </div>
      <ReportState loading={loading} error={events.length === 0 ? error : null} onRetry={refetch} empty={events.length === 0} emptyText="No activity yet." skeleton={<ActivityTimelineSkeleton />}>
        <ActivityTimeline events={events} userFor={userFor} />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {events.length < total && (
          <button onClick={() => void loadMore()} disabled={loadingMore}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60">
            {loadingMore ? 'Loading…' : `Load more (${total - events.length} older)`}
          </button>
        )}
      </ReportState>
    </div>
  );
}

function VelocityCard({ projectId }: { projectId: string }) {
  const { data, loading, error, refetch } = useReport(() => getVelocity(projectId), projectId);
  const sprints = data?.sprints ?? [];

  const committed = sprints.reduce((sum, s) => sum + s.committed_points, 0);
  const completed = sprints.reduce((sum, s) => sum + s.completed_points, 0);
  const best = sprints.reduce<SprintVelocity | null>((b, s) => (!b || s.completed_points > b.completed_points ? s : b), null);

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sprint velocity</h3>
        <RefreshButton onClick={refetch} loading={loading} label="Refresh velocity" />
      </div>
      <ReportState loading={loading} error={error} onRetry={refetch} empty={sprints.length === 0} emptyText="No sprints have been started yet, so there is no velocity to show."
        skeleton={<><Skeleton className="h-3 w-64 mb-4" /><ChartSkeleton /><StatTilesSkeleton /></>}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Story points committed at start vs. completed per sprint</p>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-indigo-300" />Committed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-indigo-600" />Completed</span>
          </div>
        </div>
        <GroupedBarChart data={sprints} />
        <StatTiles stats={[
          { label: 'Avg velocity', value: `${(data?.average_points ?? 0).toFixed(1)} pts` },
          { label: 'Best sprint', value: best ? `${best.sprint_name} · ${best.completed_points} pts` : '—' },
          { label: 'Completion rate', value: committed > 0 ? `${Math.round((completed / committed) * 100)}%` : '—' },
        ]} />
      </ReportState>
    </div>
  );
}

const MAX_CYCLE_ROWS = 20;

function CycleTimeCard({ projectId }: { projectId: string }) {
  const { data, loading, error, refetch } = useReport(() => getCycleTime(projectId), projectId);
  // Server sorts longest lead time first.
  const rows = (data?.tickets ?? []).slice(0, MAX_CYCLE_ROWS);
  const maxLead = Math.max(...rows.map(r => r.lead_time_days), 1);

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cycle time</h3>
        <RefreshButton onClick={refetch} loading={loading} label="Refresh cycle time" />
      </div>
      <ReportState loading={loading} error={error} onRetry={refetch} empty={!data || data.completed_tickets === 0} emptyText="No tickets have been completed yet, so there is no cycle time to show."
        skeleton={
          <>
            <Skeleton className="h-3 w-80 max-w-full mb-4" />
            <StatTilesSkeleton />
            <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-1.5 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </>
        }>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
          Lead time is creation → Done. Cycle time is the days a ticket spent In progress or In review.
        </p>
        <StatTiles stats={[
          { label: 'Completed tickets', value: String(data?.completed_tickets ?? 0) },
          { label: 'Median lead time', value: `${data?.median_lead_time_days ?? 0} days` },
          { label: 'Median cycle time', value: `${data?.median_cycle_time_days ?? 0} days` },
        ]} />

        <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 -mx-5">
          {rows.map(t => (
            <div key={t.ticket_key} className="flex items-center gap-4 px-5 py-2.5">
              <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 w-24 flex-shrink-0">{t.ticket_key}</span>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(t.lead_time_days / maxLead) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-16 text-right">{t.lead_time_days}d</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 w-24 text-right hidden lg:block">
                {t.cycle_time_days !== null ? `${t.cycle_time_days}d active` : 'not worked'}
                {t.reopened > 0 && ` · reopened ${t.reopened}×`}
              </span>
            </div>
          ))}
        </div>
        {data && data.completed_tickets > rows.length && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Showing the {rows.length} longest of {data.completed_tickets} completed tickets.</p>
        )}
      </ReportState>
    </div>
  );
}

function BurndownCard({ teamId, projectId }: { teamId: string; projectId: string }) {
  const [chosenId, setChosenId] = useState<string | null>(null);

  // Only started sprints have burndown data; a `created` one would 404.
  const sprintsQ = useReport(async () => {
    const page = await listSprints(teamId, projectId);
    // Newest start date first; a sprint with no dates has no start_date, so it sorts last.
    return page.results.filter(s => s.status !== 'created').sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
  }, `${teamId}/${projectId}`);

  const sprints: ApiSprintSummary[] = sprintsQ.data ?? [];
  const hasDates = (s: ApiSprintSummary) => Boolean(s.start_date && s.end_date);
  // Prefer a sprint the report can actually be built for.
  const defaultSprint = sprints.find(s => s.status === 'active' && hasDates(s)) ?? sprints.find(hasDates) ?? sprints[0];
  const sprintId = chosenId ?? defaultSprint?.id ?? null;
  const sprint = sprints.find(s => s.id === sprintId);
  // The API answers 409 for these, so don't ask.
  const undated = sprint !== undefined && !hasDates(sprint);

  const reportQ = useReport(
    () => (sprintId && !undated ? getBurndown(sprintId) : Promise.resolve(null)),
    `${sprintId ?? 'none'}:${undated}`,
  );
  const report = reportQ.data;
  const series = report ? buildBurndownSeries(report) : [];
  const latest = report?.days[report.days.length - 1];

  function refreshBoth() { sprintsQ.refetch(); reportQ.refetch(); }

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {report?.sprint_name ?? sprint?.name ?? 'Burndown'}
        </h3>
        <RefreshButton onClick={refreshBoth} loading={sprintsQ.loading || reportQ.loading} label="Refresh burndown" />
      </div>
      <ReportState loading={sprintsQ.loading} error={sprintsQ.error} onRetry={sprintsQ.refetch} empty={sprints.length === 0} emptyText="Start a sprint to see its burndown."
        skeleton={<><Skeleton className="h-3 w-56 mb-4" /><ChartSkeleton /><StatTilesSkeleton /></>}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 min-w-0 truncate">
            {report ? `${dayLabel(utcDay(report.start_date))} – ${dayLabel(utcDay(report.end_date))} · ${report.committed_points} story points committed` : ' '}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0">
            {sprints.length > 1 && (
              <select value={sprintId ?? ''} onChange={e => setChosenId(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.status === 'active' ? ' (active)' : ''}{hasDates(s) ? '' : ' · no dates'}</option>)}
              </select>
            )}
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block bg-indigo-300" style={{ borderTop: '1px dashed' }} />Ideal</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block bg-indigo-600 rounded" />Actual</span>
            </div>
          </div>
        </div>

        {undated ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This sprint has no start and end dates, so there is nothing to plot. Dates can only be set while a sprint
            is still in the Created state, so this one can't get a burndown. Add both dates when creating the next sprint.
          </p>
        ) : (
        <ReportState loading={reportQ.loading} error={reportQ.error} onRetry={reportQ.refetch} empty={!report || series.length === 0} emptyText="No burndown data for this sprint yet."
          skeleton={<><ChartSkeleton /><StatTilesSkeleton /></>}>
          <BurndownChart data={series} />
          <StatTiles stats={[
            { label: 'Committed at start', value: `${report?.committed_points ?? 0} pts` },
            { label: 'Remaining', value: latest ? `${latest.remaining_points} pts` : '—' },
            { label: 'Forecast', value: !latest ? '—' : latest.remaining_points <= latest.ideal_points ? 'On track' : 'At risk' },
          ]} />
          {report && report.unpointed_tickets > 0 && (
            <p className="mt-4 text-xs text-amber-700 dark:text-amber-400">
              {report.unpointed_tickets} ticket{report.unpointed_tickets === 1 ? ' has' : 's have'} no story points and {report.unpointed_tickets === 1 ? "isn't" : "aren't"} counted.
            </p>
          )}
        </ReportState>
        )}
      </ReportState>
    </div>
  );
}

interface ReportsPageProps {
  teamName: string;
  onGoToTeam: () => void;
  teamId: string;
  project: Project;
  currentUserId: string;
  onNavigateProjectTab: (tab: TabType) => void;
  onOpenSettings: () => void;
}

export function ReportsPage({ teamName, onGoToTeam, teamId, project, currentUserId, onNavigateProjectTab, onOpenSettings }: ReportsPageProps) {
  // null until the user picks a tab, so the default follows `isLead` even if the current user loads late.
  const [chosenTab, setChosenTab] = useState<ReportTab | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Esc closes the chat, even from its input (a chat has nothing to "cancel" first).
  useEffect(() => {
    if (!chatOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.defaultPrevented) setChatOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [chatOpen]);
  const isLead = project.leadIds.includes(currentUserId);

  // Hiding the Dashboard tab for non-leads is politeness; devboard-analytics returns
  // 403 for anyone else regardless.
  // Leads land on the Dashboard; everyone else only has Activity.
  const tabs: { id: ReportTab; label: string }[] = [
    ...(isLead ? [{ id: 'dashboard' as const, label: 'Dashboard' }] : []),
    { id: 'activity', label: 'Activity' },
  ];
  const activeTab = tabs.find(t => t.id === chosenTab)?.id ?? tabs[0].id;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
      <ProjectTopBar
        teamName={teamName}
        onGoToTeam={onGoToTeam}
        project={project}
        activeTab="reports"
        onTabChange={onNavigateProjectTab}
        onOpenReports={() => {}}
        onOpenSettings={onOpenSettings}
      />

      {/* Report-type sub-tabs */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setChosenTab(t.id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'activity' && <ActivityTab project={project} isLead={isLead} />}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VelocityCard projectId={project.id} />
            <CycleTimeCard projectId={project.id} />
            <div className="lg:col-span-2">
              <BurndownCard teamId={teamId} projectId={project.id} />
            </div>
          </div>
        )}
      </div>

      {/* Chat toggle */}
      <button onClick={() => setChatOpen(v => !v)}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'} aria-expanded={chatOpen}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors z-20">
        {chatOpen ? (
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 4.5h15v9h-8l-3.5 3v-3h-3.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        )}
      </button>

      {/* Chat slide-over */}
      {chatOpen && (
        <>
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30 z-10" onClick={() => setChatOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 z-20 w-full sm:w-[380px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
            <ChatPanel projectId={project.id} projectName={project.name} isLead={isLead} onClose={() => setChatOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
