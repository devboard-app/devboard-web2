import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ticket, TicketStatus, TicketType, Priority, User, Label, Comment } from '@/types';
import { STORY_POINTS } from '@/types';
import type { UpdateTicketInput } from '@/api/tickets';
import { ApiError } from '@/api/client';
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES, deleteAttachment } from '@/api/attachments';
import { useTicketComments } from '@/hooks/useTicketComments';
import { useTicketActivity } from '@/hooks/useTicketActivity';
import { ActivityRow } from '@/components/activity/ActivityRow';
import { Avatar } from '@/components/layout/AppShell';

interface Props {
  teamId: string;
  projectId: string;
  ticket: Ticket;
  projectMembers: User[];
  // Non-leads only ever get their own actions back from the activity API.
  isLead: boolean;
  projectLabels: Label[];
  onCreateProjectLabel: (name: string, color?: string) => Promise<void>;
  onClose: () => void;
  onCommit: (patch: UpdateTicketInput) => void;
  onAddLabel: (labelId: string) => Promise<void>;
  onRemoveLabel: (labelId: string) => Promise<void>;
}

const statusOptions: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' },
  { value: 'todo', label: 'Todo', color: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  { value: 'in_review', label: 'In Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  { value: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
];

const typeOptions: TicketType[] = ['task', 'bug', 'feature', 'improvement', 'epic'];
const LABEL_PRESET_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#8B5CF6', '#EC4899'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.detail;
  return err instanceof Error ? err.message : fallback;
}

function TicketActivityTab({ projectId, ticketId, members, isLead }: { projectId: string; ticketId: string; members: User[]; isLead: boolean }) {
  const { events, truncated, loading, error, userFor } = useTicketActivity(projectId, ticketId, members);

  if (loading) return <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">Loading…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400 py-4">{error}</p>;

  return (
    <div>
      {!isLead && <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">Showing your own activity. Project leads see everyone's.</p>}
      {events.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">No activity yet</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {events.map((e, i) => <ActivityRow key={e._id ?? i} event={e} userFor={userFor} className="py-3" />)}
        </div>
      )}
      {truncated && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">Searched only the most recent project activity; older events for this ticket may not appear.</p>}
    </div>
  );
}

export function TicketPanel({
  teamId, projectId, ticket, projectMembers, isLead, projectLabels, onCreateProjectLabel,
  onClose, onCommit, onAddLabel, onRemoveLabel,
}: Props) {
  const [local, setLocal] = useState<Ticket>(ticket);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [labelActionError, setLabelActionError] = useState<string | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'attachments'>('comments');

  const membersById = useMemo(() => Object.fromEntries(projectMembers.map(m => [m.id, m])), [projectMembers]);
  const { comments, loading: commentsLoading, error: commentsError, submitting, addComment, editComment, removeComment } =
    useTicketComments(teamId, projectId, ticket.id, membersById);

  // Resyncs on every ticket prop change (not just a different ticket id) —
  // label add/remove and other mutations refetch the whole ticket list, and
  // the panel needs the freshly server-resolved fields (labels especially,
  // since those are never in the local edit state to begin with).
  useEffect(() => {
    setLocal(ticket);
  }, [ticket]);

  // Local-only — used while typing, doesn't hit the network.
  function setField(patch: Partial<Ticket>) {
    setLocal(prev => ({ ...prev, ...patch }));
  }

  // Fires the real PATCH. Used for discrete picks (status/priority/type/
  // assignee/story points) and on blur for the free-text title/description,
  // not on every keystroke.
  function commit(patch: UpdateTicketInput) {
    onCommit(patch);
  }

  async function handleAddLabel(labelId: string) {
    setLabelActionError(null);
    setShowLabelPicker(false);
    try {
      await onAddLabel(labelId);
    } catch (err) {
      setLabelActionError(errorMessage(err, 'Could not add label.'));
    }
  }

  async function handleRemoveLabel(labelId: string) {
    setLabelActionError(null);
    try {
      await onRemoveLabel(labelId);
    } catch (err) {
      setLabelActionError(errorMessage(err, 'Could not remove label.'));
    }
  }

  // LEAD-only server-side (see src/api/labels.ts) — a CONTRIBUTOR sees the
  // ApiError surfaced here rather than the label silently not appearing.
  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    setLabelActionError(null);
    try {
      await onCreateProjectLabel(newLabelName.trim());
      setNewLabelName('');
      setCreatingLabel(false);
    } catch (err) {
      setLabelActionError(errorMessage(err, 'Could not create label.'));
    }
  }

  const unappliedLabels = projectLabels.filter(pl => !local.labels.some(l => l.id === pl.id));
  const allAttachments = useMemo(
    () => comments.flatMap(c => c.attachments.map(a => ({ attachment: a, comment: c }))),
    [comments]
  );

  const statusConfig = statusOptions.find(s => s.value === local.status)!;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-40 w-full md:w-[560px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500">{local.key}</span>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5">
            {/* Title */}
            {editingTitle ? (
              <textarea
                autoFocus
                value={local.title}
                onChange={e => setField({ title: e.target.value })}
                onBlur={() => { setEditingTitle(false); if (local.title !== ticket.title) commit({ title: local.title }); }}
                rows={2}
                className="w-full text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent resize-none focus:outline-none border-b-2 border-indigo-500"
              />
            ) : (
              <h2 onClick={() => setEditingTitle(true)}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 cursor-text hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors leading-snug mb-4">
                {local.title}
              </h2>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 text-sm">
              {/* Type */}
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Type</p>
                <select
                  value={local.type}
                  onChange={e => { const type = e.target.value as TicketType; setField({ type }); commit({ type }); }}
                  className="text-xs font-medium px-2.5 py-1 rounded-full appearance-none cursor-pointer focus:outline-none bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 capitalize">
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Status</p>
                <div className="relative">
                  <select
                    value={local.status}
                    onChange={e => { const status = e.target.value as TicketStatus; setField({ status }); commit({ status }); }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full appearance-none cursor-pointer focus:outline-none ${statusConfig.color}`}>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Priority</p>
                <select
                  value={local.priority}
                  onChange={e => { const priority = e.target.value as Priority; setField({ priority }); commit({ priority }); }}
                  className="text-xs font-medium px-2.5 py-1 rounded-full appearance-none cursor-pointer focus:outline-none bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
                    <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Assignee</p>
                <div className="relative">
                  <button onClick={() => setShowAssigneePicker(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    {local.assignee ? (
                      <>
                        <Avatar user={local.assignee} size="xs" />
                        <span>{local.assignee.username}</span>
                      </>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">Unassigned</span>
                    )}
                  </button>
                  {showAssigneePicker && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button onClick={() => { setField({ assignee: undefined }); commit({ assignee_id: null }); setShowAssigneePicker(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        Unassigned
                      </button>
                      {projectMembers.map(m => (
                        <button key={m.id} onClick={() => { setField({ assignee: m }); commit({ assignee_id: m.id }); setShowAssigneePicker(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                          <Avatar user={m} size="xs" />
                          {m.username}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Story points */}
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Story points</p>
                <select
                  value={local.storyPoints ?? ''}
                  onChange={e => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    setField({ storyPoints: value });
                    commit({ story_points: value });
                  }}
                  className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">—</option>
                  {STORY_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Labels */}
            <div className="mb-5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">Labels</p>
              {labelActionError && <p className="text-xs text-red-600 dark:text-red-400 mb-1.5">{labelActionError}</p>}
              <div className="flex flex-wrap items-center gap-1.5">
                {local.labels.length === 0 && <span className="text-xs text-zinc-400 dark:text-zinc-600">No labels</span>}
                {local.labels.map(label => (
                  <span key={label.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium group"
                    style={{ backgroundColor: label.color + '22', color: label.color }}>
                    {label.name}
                    <button onClick={() => void handleRemoveLabel(label.id)} className="opacity-50 hover:opacity-100 transition-opacity" aria-label={`Remove ${label.name}`}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button onClick={() => setShowLabelPicker(v => !v)}
                    className="px-2 py-0.5 rounded-full text-xs text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                    + Label
                  </button>
                  {showLabelPicker && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 overflow-hidden">
                      <div className="max-h-40 overflow-y-auto">
                        {unappliedLabels.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-zinc-400">No more labels to add</p>
                        ) : unappliedLabels.map(label => (
                          <button key={label.id} onClick={() => void handleAddLabel(label.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                            {label.name}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                        {creatingLabel ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') void handleCreateLabel(); if (e.key === 'Escape') setCreatingLabel(false); }}
                              placeholder="Label name" maxLength={50}
                              className="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            <button onClick={() => void handleCreateLabel()} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-1">Add</button>
                          </div>
                        ) : (
                          <button onClick={() => setCreatingLabel(true)} className="w-full text-left text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                            + New label
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">Description</p>
              {editingDesc ? (
                <textarea
                  autoFocus
                  value={local.description}
                  onChange={e => setField({ description: e.target.value })}
                  onBlur={() => { setEditingDesc(false); if (local.description !== ticket.description) commit({ description: local.description }); }}
                  rows={6}
                  className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 resize-none focus:outline-none border border-indigo-500"
                />
              ) : (
                <div onClick={() => setEditingDesc(true)}
                  className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed cursor-text hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg p-3 -mx-3 transition-colors whitespace-pre-wrap">
                  {local.description || <span className="text-zinc-400 dark:text-zinc-600">Add a description…</span>}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <div className="flex gap-4">
                {(['comments', 'activity', 'attachments'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-xs font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}>
                    {tab === 'attachments' ? `attachments${allAttachments.length > 0 ? ` (${allAttachments.length})` : ''}` : tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'comments' && (
              <CommentsTab
                comments={comments}
                loading={commentsLoading}
                error={commentsError}
                submitting={submitting}
                onAdd={addComment}
                onEdit={editComment}
                onDelete={removeComment}
              />
            )}

            {activeTab === 'activity' && (
              <TicketActivityTab projectId={projectId} ticketId={ticket.id} members={projectMembers} isLead={isLead} />
            )}

            {activeTab === 'attachments' && <AttachmentsTab items={allAttachments} onRefetch={() => void 0} />}
          </div>
        </div>
      </div>
    </>
  );
}

function CommentsTab({
  comments, loading, error, submitting, onAdd, onEdit, onDelete,
}: {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  submitting: boolean;
  onAdd: (body: string, files: File[]) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilePick(picked: FileList | null) {
    if (!picked) return;
    setFileError(null);
    const next = [...files];
    for (const f of Array.from(picked)) {
      if (next.length >= 5) { setFileError('Max 5 attachments per comment.'); break; }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(f.type)) { setFileError(`${f.name}: unsupported file type.`); continue; }
      if (f.size > MAX_ATTACHMENT_SIZE_BYTES) { setFileError(`${f.name}: exceeds 5 MB limit.`); continue; }
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function submit() {
    if (!draft.trim() && files.length === 0) return;
    setPostError(null);
    try {
      await onAdd(draft.trim(), files);
      setDraft('');
      setFiles([]);
    } catch (err) {
      setPostError(errorMessage(err, 'Could not post comment.'));
    }
  }

  async function commitEdit(commentId: string) {
    setRowError(prev => ({ ...prev, [commentId]: '' }));
    try {
      await onEdit(commentId, editDraft.trim());
      setEditingId(null);
    } catch (err) {
      setRowError(prev => ({ ...prev, [commentId]: errorMessage(err, 'Could not save.') }));
    }
  }

  async function handleDelete(commentId: string) {
    setRowError(prev => ({ ...prev, [commentId]: '' }));
    try {
      await onDelete(commentId);
    } catch (err) {
      setRowError(prev => ({ ...prev, [commentId]: errorMessage(err, 'Could not delete.') }));
    }
  }

  return (
    <div>
      {/* Composer */}
      <div className="mb-5">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Write a comment…"
          rows={3}
          className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 resize-none focus:outline-none border border-zinc-200 dark:border-zinc-700 focus:border-indigo-500"
        />
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {f.name}
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">×</button>
              </span>
            ))}
          </div>
        )}
        {fileError && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fileError}</p>}
        {postError && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{postError}</p>}
        <div className="flex items-center gap-2 mt-2">
          <input ref={fileInputRef} type="file" multiple className="hidden" id="comment-file-input"
            onChange={e => handleFilePick(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={files.length >= 5}
            className="px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors">
            Attach file
          </button>
          <button onClick={() => void submit()} disabled={submitting || (!draft.trim() && files.length === 0)}
            className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
            {submitting ? 'Posting…' : 'Comment'}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-4">Loading comments…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">{error}</p>}
      {!loading && !error && comments.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">No comments yet</p>
      )}

      <div className="space-y-4">
        {comments.map(c => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar user={c.author} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{c.author.username}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">{new Date(c.createdAt).toLocaleString()}</span>
                {c.isEdited && <span className="text-xs text-zinc-400 dark:text-zinc-600">(edited)</span>}
              </div>
              {editingId === c.id ? (
                <div className="mt-1">
                  <textarea autoFocus value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={2}
                    className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 resize-none focus:outline-none border border-indigo-500" />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => void commitEdit(c.id)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-zinc-500 dark:text-zinc-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              )}
              {c.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {c.attachments.map(a => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      {a.filename} <span className="text-zinc-400">{formatSize(a.size)}</span>
                    </a>
                  ))}
                </div>
              )}
              {rowError[c.id] && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{rowError[c.id]}</p>}
              {editingId !== c.id && (
                <div className="flex gap-3 mt-1">
                  <button onClick={() => { setEditingId(c.id); setEditDraft(c.body); }} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Edit</button>
                  <button onClick={() => void handleDelete(c.id)} className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400">Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttachmentsTab({ items }: { items: { attachment: Comment['attachments'][number]; comment: Comment }[]; onRefetch: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(attachmentId: string) {
    setDeleting(attachmentId);
    setError(null);
    try {
      await deleteAttachment(attachmentId);
      // The comment's embedded attachment list won't refresh until the
      // comment itself is refetched (see Comments tab) — deleting here
      // removes the file from storage immediately; the stale chip clears
      // next time comments reload.
    } catch (err) {
      setError(errorMessage(err, 'Could not delete attachment.'));
    } finally {
      setDeleting(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">No attachments yet — attach files from the Comments tab.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {items.map(({ attachment, comment }) => (
        <div key={attachment.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <a href={attachment.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{attachment.filename}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">{formatSize(attachment.size)} · from {comment.author.username}'s comment</p>
          </a>
          <button onClick={() => void handleDelete(attachment.id)} disabled={deleting === attachment.id}
            className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2h3v1.5M5.5 6v4M7.5 6v4M3 3.5L3.5 11h6L10 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
