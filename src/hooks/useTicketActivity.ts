import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { getActivity, type ActivityEvent } from '@/api/reports';
import { useActorLookup } from './useActorLookup';

const PAGE_SIZE = 100; // the API's maximum
const MAX_PAGES = 5;

/**
 * devboard-analytics has no per-ticket filter (BACKEND_GAPS.md #18), so this pulls
 * the project feed newest-first, up to MAX_PAGES pages, and keeps the events that
 * belong to this ticket: the ticket's own events, plus comment events, which are
 * keyed by comment id and only point back to the ticket in their metadata.
 * `truncated` is true when older events were left unsearched.
 */
export function useTicketActivity(projectId: string, ticketId: string, members: User[]) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolve, reset, userFor } = useActorLookup(members);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);
    reset();

    (async () => {
      const mine: ActivityEvent[] = [];
      let offset = 0;
      let count = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getActivity(projectId, PAGE_SIZE, offset);
        count = res.count;
        mine.push(...res.results.filter(e => e.entity_id === ticketId || e.metadata.ticket_id === ticketId));
        offset += res.results.length;
        if (res.results.length === 0 || offset >= count) break;
      }
      await resolve(mine);
      if (cancelled) return;
      setEvents(mine);
      setTruncated(offset < count);
    })()
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // `members` is a fresh array whenever teams reload; only a different ticket needs a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ticketId]);

  return { events, truncated, loading, error, userFor };
}
