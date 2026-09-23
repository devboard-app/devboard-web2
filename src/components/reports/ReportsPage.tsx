import { useState } from 'react';
import type { Project } from '@/types';
import { ActivityRow } from '@/components/activity/ActivityRow';
import { useReport } from '@/hooks/useReport';
import { useProjectActivity } from '@/hooks/useProjectActivity';
import { listSprints, type ApiSprintSummary } from '@/api/sprints';
import {
  getVelocity, getCycleTime, getBurndown,
  type BurndownReport, type SprintVelocity,
} from '@/api/reports';
import { ChatPanel } from './ChatPanel';

type ReportTab = 'activity' | 'velocity' | 'cycle-time' | 'burndown' | 'chat';

function ReportState({ loading, error, empty, emptyText, children }: {
  loading: boolean; error: string | null; empty?: boolean; emptyText?: string; children: React.ReactNode;
}) {
  if (loading) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (empty) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-5 py-10 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
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
  const { events, total, loading, loadingMore, error, loadMore, userFor } = useProjectActivity(project.id, project.members);

  return (
    <div className="max-w-2xl space-y-3">
      {!isLead && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Showing your own activity. Project leads see everyone's.</p>
      )}
      <ReportState loading={loading} error={events.length === 0 ? error : null} empty={events.length === 0} emptyText="No activity yet.">
        <div className={`${card} divide-y divide-zinc-100 dark:divide-zinc-800`}>
          {events.map((e, i) => <ActivityRow key={e._id ?? i} event={e} userFor={userFor} />)}
        </div>
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

function VelocityTab({ projectId }: { projectId: string }) {
  const { data, loading, error } = useReport(() => getVelocity(projectId), projectId);
  const sprints = data?.sprints ?? [];

  const committed = sprints.reduce((sum, s) => sum + s.committed_points, 0);
  const completed = sprints.reduce((sum, s) => sum + s.completed_points, 0);
  const best = sprints.reduce<SprintVelocity | null>((b, s) => (!b || s.completed_points > b.completed_points ? s : b), null);

  return (
    <div className="max-w-2xl space-y-4">
      <ReportState loading={loading} error={error} empty={sprints.length === 0} emptyText="No sprints have been started yet, so there is no velocity to show.">
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sprint velocity</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Story points committed at start vs. completed per sprint</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
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
        </div>
      </ReportState>
    </div>
  );
}

const MAX_CYCLE_ROWS = 20;

function CycleTimeTab({ projectId }: { projectId: string }) {
  const { data, loading, error } = useReport(() => getCycleTime(projectId), projectId);
  // Server sorts longest lead time first.
  const rows = (data?.tickets ?? []).slice(0, MAX_CYCLE_ROWS);
  const maxLead = Math.max(...rows.map(r => r.lead_time_days), 1);

  return (
    <div className="max-w-2xl space-y-4">
      <ReportState loading={loading} error={error} empty={!data || data.completed_tickets === 0} emptyText="No tickets have been completed yet, so there is no cycle time to show.">
        <div className={`${card} p-5`}>
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cycle time</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Lead time is creation → Done. Cycle time is the days a ticket spent In progress or In review.
            </p>
          </div>
          <StatTiles stats={[
            { label: 'Completed tickets', value: String(data?.completed_tickets ?? 0) },
            { label: 'Median lead time', value: `${data?.median_lead_time_days ?? 0} days` },
            { label: 'Median cycle time', value: `${data?.median_cycle_time_days ?? 0} days` },
          ]} />
        </div>

        <div className={`${card} divide-y divide-zinc-100 dark:divide-zinc-800`}>
          {rows.map(t => (
            <div key={t.ticket_key} className="flex items-center gap-4 px-5 py-3">
              <span className="text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 w-24 flex-shrink-0">{t.ticket_key}</span>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(t.lead_time_days / maxLead) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-16 text-right">{t.lead_time_days}d</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 w-24 text-right">
                {t.cycle_time_days !== null ? `${t.cycle_time_days}d active` : 'not worked'}
                {t.reopened > 0 && ` · reopened ${t.reopened}×`}
              </span>
            </div>
          ))}
        </div>
        {data && data.completed_tickets > rows.length && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Showing the {rows.length} longest of {data.completed_tickets} completed tickets.</p>
        )}
      </ReportState>
    </div>
  );
}

function BurndownTab({ teamId, projectId }: { teamId: string; projectId: string }) {
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

  return (
    <div className="max-w-2xl space-y-4">
      <ReportState loading={sprintsQ.loading} error={sprintsQ.error} empty={sprints.length === 0} emptyText="Start a sprint to see its burndown.">
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {report?.sprint_name ?? sprint?.name} burndown
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                {report ? `${dayLabel(utcDay(report.start_date))} – ${dayLabel(utcDay(report.end_date))} · ${report.committed_points} story points committed` : ' '}
              </p>
            </div>
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
          <ReportState loading={reportQ.loading} error={reportQ.error} empty={!report || series.length === 0} emptyText="No burndown data for this sprint yet.">
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
        </div>
      </ReportState>
    </div>
  );
}

export function ReportsPage({ teamId, project, currentUserId }: { teamId: string; project: Project; currentUserId: string }) {
  const [tab, setTab] = useState<ReportTab>('activity');
  const isLead = project.leadIds.includes(currentUserId);

  // Hiding the lead-only tabs is politeness; devboard-analytics returns 403 for
  // anyone else regardless.
  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'activity', label: 'Activity' },
    ...(isLead ? [
      { id: 'velocity' as const, label: 'Velocity' },
      { id: 'cycle-time' as const, label: 'Cycle time' },
      { id: 'burndown' as const, label: 'Burndown' },
    ] : []),
    { id: 'chat', label: 'Chat' },
  ];
  const activeTab = tabs.some(t => t.id === tab) ? tab : 'activity';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-5 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-indigo-600 dark:text-indigo-400">
            <rect x="1" y="10" width="4" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="7" y="6" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="13" y="2" width="4" height="15" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Reports</h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">· {project.name}</span>
        </div>
        <div className="flex gap-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
        {activeTab === 'velocity' && <VelocityTab projectId={project.id} />}
        {activeTab === 'cycle-time' && <CycleTimeTab projectId={project.id} />}
        {activeTab === 'burndown' && <BurndownTab teamId={teamId} projectId={project.id} />}
        {activeTab === 'chat' && <ChatPanel projectId={project.id} projectName={project.name} />}
      </div>
    </div>
  );
}
