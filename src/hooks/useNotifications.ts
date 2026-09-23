import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification } from '@/types';
import {
  listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
  type ApiNotification,
} from '@/api/notifications';

const POLL_INTERVAL_MS = 30_000;

function toNotification(n: ApiNotification): Notification {
  return { id: n.id, type: n.type, message: n.message, read: n.read, createdAt: n.created_at, link: n.link };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Notifications have no push channel, so this polls while the tab is visible.
 * Mutations are optimistic and roll back to the pre-mutation snapshot on failure.
 */
export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // A poll that lands mid-mutation would overwrite the optimistic state with
  // pre-mutation server data, so polls are skipped while any mutation is pending.
  const pendingMutations = useRef(0);

  const refetch = useCallback(async () => {
    try {
      const page = await listNotifications();
      if (pendingMutations.current > 0) return;
      setNotifications(page.results.map(toNotification));
      setTotal(page.count);
    } catch {
      // Background refresh failure: keep showing what we have. Mutations surface their own errors.
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setTotal(0);
      setError(null);
      return;
    }

    void refetch();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refetch();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, refetch]);

  async function mutate(optimistic: (prev: Notification[]) => Notification[], request: () => Promise<unknown>, failure: string, totalDelta = 0) {
    const snapshot = notifications;
    const totalSnapshot = total;
    setError(null);
    setNotifications(optimistic);
    if (totalDelta) setTotal(t => t + totalDelta);
    pendingMutations.current += 1;
    try {
      await request();
    } catch (err) {
      setNotifications(snapshot);
      setTotal(totalSnapshot);
      setError(errorMessage(err, failure));
    } finally {
      pendingMutations.current -= 1;
    }
  }

  const markRead = (id: string) =>
    mutate(prev => prev.map(n => n.id === id ? { ...n, read: true } : n), () => markNotificationRead(id), 'Could not mark notification as read.');

  const markAllRead = () =>
    mutate(prev => prev.map(n => ({ ...n, read: true })), markAllNotificationsRead, 'Could not mark notifications as read.');

  const dismiss = (id: string) =>
    mutate(prev => prev.filter(n => n.id !== id), () => deleteNotification(id), 'Could not dismiss notification.', -1);

  return { notifications, total, error, markRead, markAllRead, dismiss, refetch };
}
