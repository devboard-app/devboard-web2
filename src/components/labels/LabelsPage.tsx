import { useState } from 'react';
import type { Project } from '@/types';
import { useProjectLabels } from '@/hooks/useProjectLabels';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/ListSkeleton';

interface Props {
  teamId: string;
  project: Project;
  currentUserId: string;
}

const PRESET_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#8B5CF6', '#EC4899', '#64748B'];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.detail;
  return err instanceof Error ? err.message : fallback;
}

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" aria-label={`Color ${color}`} aria-pressed={selected}
      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 scale-110' : ''}`}
      style={{ backgroundColor: color }}
    />
  );
}

export function LabelsPage({ teamId, project, currentUserId }: Props) {
  // Creating, editing and deleting labels is lead-only in devboard-work.
  const isLead = project.leadIds.includes(currentUserId);
  const { labels, loading, error: loadError, createLabel: apiCreateLabel, updateLabel: apiUpdateLabel, deleteLabel: apiDeleteLabel } =
    useProjectLabels(teamId, project.id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function startEdit(label: { id: string; name: string; color: string }) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  }

  async function commitEdit() {
    if (!editingId) return;
    setActionError(null);
    setBusyId(editingId);
    try {
      await apiUpdateLabel(editingId, { name: editName, color: editColor });
      setEditingId(null);
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save label.'));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLabel(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await apiDeleteLabel(id);
    } catch (err) {
      setActionError(errorMessage(err, 'Could not delete label.'));
    } finally {
      setBusyId(null);
    }
  }

  async function createLabel() {
    if (!newName.trim()) return;
    setActionError(null);
    try {
      await apiCreateLabel(newName.trim(), newColor);
      setNewName('');
      setNewColor('#6366F1');
      setCreating(false);
    } catch (err) {
      setActionError(errorMessage(err, 'Could not create label.'));
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Labels</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{project.name} · {labels.length} labels</p>
          </div>
          {isLead && (
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              New label
            </button>
          )}
        </div>

        {actionError && (
          <div role="alert" className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {actionError}
          </div>
        )}

        {loadError && (
          <div role="alert" className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {loadError}
          </div>
        )}

        {/* Create form */}
        {creating && isLead && (
          <div className="mb-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">New label</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-label-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name</label>
                <input
                  id="new-label-name"
                  autoFocus
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. bug, feature, help-wanted"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={e => { if (e.key === 'Enter') void createLabel(); if (e.key === 'Escape') setCreating(false); }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Color</label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <ColorSwatch key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
                    ))}
                  </div>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                </div>
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-400">Preview:</p>
                {newName && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: newColor + '22', color: newColor }}>
                    {newName}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => void createLabel()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Create
                </button>
                <button onClick={() => { setCreating(false); setNewName(''); }}
                  className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Labels list */}
        {loading && labels.length === 0 ? (
          <ListSkeleton rows={4} />
        ) : labels.length === 0 && !creating ? (
          <EmptyState
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 7.5L10 2l7 5.5v9a1 1 0 01-1 1H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7.5 16V10h5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            title="No labels yet"
            description={isLead ? 'Labels help categorize and filter tickets' : 'The project lead manages labels'}
            action={isLead ? { label: 'Create first label', onClick: () => setCreating(true) } : undefined}
          />
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {labels.map(label => (
              <div key={label.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                {editingId === label.id ? (
                  <>
                    {/* Color picker inline */}
                    <div className="flex gap-1 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <ColorSwatch key={c} color={c} selected={editColor === c} onClick={() => setEditColor(c)} />
                      ))}
                    </div>
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      onKeyDown={e => { if (e.key === 'Enter') void commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <button onClick={() => void commitEdit()} disabled={busyId === label.id}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors">
                      {busyId === label.id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} disabled={busyId === label.id} aria-label="Cancel editing label" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-60">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: label.color + '22', color: label.color }}>
                      {label.name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">{label.color}</span>

                    {isLead && <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <button onClick={() => startEdit(label)} disabled={busyId === label.id} aria-label={`Edit label ${label.name}`}
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 11L2 8.5L9.5 1 12 3.5 4.5 11H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={() => void deleteLabel(label.id)} disabled={busyId === label.id} aria-label={`Delete label ${label.name}`}
                        className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 6v4M7.5 6v4M3 3.5L3.5 11h6L10 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
