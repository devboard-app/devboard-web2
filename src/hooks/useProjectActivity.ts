import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/types';
import { getActivity, type ActivityEvent } from '@/api/reports';
import { useActorLookup } from './useActorLookup';

const PAGE_SIZE = 20;

/** Paged project activity feed (newest first). */
export function useProjectActivity(projectId: string, members: User[]) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken(t => t + 1), []);
  const { resolve, reset, userFor } = useActorLookup(members);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);
    reset();

    getActivity(projectId, PAGE_SIZE, 0)
      .then(async page => {
        await resolve(page.results);
        if (cancelled) return;
        setEvents(page.results);
        setTotal(page.count);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // `resolve` depends on `members`, which is a fresh array whenever teams reload; the
    // feed itself only needs to reload when the project changes (or `refetch` is called).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, reloadToken]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getActivity(projectId, PAGE_SIZE, events.length);
      await resolve(page.results);
      setEvents(prev => [...prev, ...page.results]);
      setTotal(page.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more activity');
    } finally {
      setLoadingMore(false);
    }
  }

  return { events, total, loading, loadingMore, error, loadMore, refetch, userFor };
}
