import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { getTicketActivity, type ActivityEvent } from '@/api/reports';
import { useActorLookup } from './useActorLookup';

const PAGE_SIZE = 100; // the API's maximum
// A single ticket has far fewer events than this; the cap only guards against a runaway loop.
const MAX_PAGES = 20;

/** Every event on this ticket (its own and its comments), newest first, from the ticket-scoped endpoint. */
export function useTicketActivity(projectId: string, ticketId: string, members: User[]) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
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
      const all: ActivityEvent[] = [];
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await getTicketActivity(projectId, ticketId, PAGE_SIZE, offset);
        all.push(...res.results);
        offset += res.results.length;
        if (res.results.length === 0 || offset >= res.count) break;
      }
      await resolve(all);
      if (cancelled) return;
      setEvents(all);
    })()
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // `members` is a fresh array whenever teams reload; only a different ticket needs a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, ticketId]);

  return { events, loading, error, userFor };
}
