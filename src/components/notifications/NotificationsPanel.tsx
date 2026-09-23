import type { Notification } from '@/types';

interface Props {
  notifications: Notification[];
  /** Server-side total; can exceed `notifications.length` since only the newest page is loaded. */
  total: number;
  error: string | null;
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpen: (notif: Notification) => void;
  onDismiss: (id: string) => void;
}

const typeIcons: Record<Notification['type'], string> = {
  mention: 'text-indigo-600 dark:text-indigo-400',
  assignment: 'text-blue-600 dark:text-blue-400',
  comment: 'text-emerald-600 dark:text-emerald-400',
  status_change: 'text-amber-600 dark:text-amber-400',
};

function NotifIcon({ type }: { type: Notification['type'] }) {
  return (
    <div className={`w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 ${typeIcons[type]}`}>
      {type === 'mention' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM9.5 6a4.5 4.5 0 11-2 3.78V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      )}
      {type === 'assignment' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M2 12c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      )}
      {type === 'comment' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2.5h10v7H8.5L7 11 5.5 9.5H2V2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      )}
      {type === 'status_change' && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </div>
  );
}

export function NotificationsPanel({ notifications, total, error, onClose, onMarkAllRead, onOpen, onDismiss }: Props) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[11px] font-medium rounded-full">
              {unread} new
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {unread > 0 && (
              <button onClick={onMarkAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 flex-shrink-0">
            {error}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-zinc-400">
                  <path d="M11 3a6 6 0 00-6 6v3L3 14h18l-2-2V9a6 6 0 00-6-6zM9 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">All caught up</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">No notifications right now</p>
            </div>
          ) : (
            <div>
              {/* Unread section */}
              {unread > 0 && (
                <>
                  <p className="px-5 py-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">New</p>
                  {notifications.filter(n => !n.read).map(notif => (
                    <NotifRow key={notif.id} notif={notif} onOpen={onOpen} onDismiss={onDismiss} />
                  ))}
                </>
              )}

              {/* Read section */}
              {notifications.some(n => n.read) && (
                <>
                  <p className="px-5 py-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 mt-1">Earlier</p>
                  {notifications.filter(n => n.read).map(notif => (
                    <NotifRow key={notif.id} notif={notif} onOpen={onOpen} onDismiss={onDismiss} />
                  ))}
                </>
              )}
              {total > notifications.length && (
                <p className="px-5 py-3 text-[11px] text-zinc-400 dark:text-zinc-600 text-center">
                  Showing the {notifications.length} most recent of {total}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const typeLabels: Record<Notification['type'], string> = {
  mention: 'Mention',
  assignment: 'Assignment',
  comment: 'Comment',
  status_change: 'Status change',
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifRow({ notif, onOpen, onDismiss }: { notif: Notification; onOpen: (notif: Notification) => void; onDismiss: (id: string) => void }) {
  return (
    <div
      onClick={() => onOpen(notif)}
      className={`flex gap-3 px-5 py-3.5 border-b border-zinc-50 dark:border-zinc-800/50 cursor-pointer transition-colors group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        !notif.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
      }`}>
      <NotifIcon type={notif.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notif.read ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {notif.message}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{typeLabels[notif.type]}</span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{timeAgo(notif.createdAt)}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
        className="p-1 opacity-0 group-hover:opacity-100 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 transition-all flex-shrink-0 rounded">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
