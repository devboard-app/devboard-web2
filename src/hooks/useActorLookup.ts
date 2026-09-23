import { useCallback, useRef, useState } from 'react';
import type { User } from '@/types';
import { SYSTEM_ACTOR_ID, type ActivityEvent } from '@/api/reports';
import { batchUsers } from '@/api/users';
import { colorFor, initialsFor } from '@/lib/avatar';

const GITHUB_ACTOR: User = { id: SYSTEM_ACTOR_ID, username: 'GitHub', initials: 'GH', color: '#24292F' };

function toUser(id: string, username: string, avatar?: string): User {
  return { id, username, avatar: avatar || undefined, initials: initialsFor(username), color: colorFor(username) };
}

/**
 * Names for the actor and assignee ids in activity events. Resolves against the
 * project's already-loaded members first, then makes one batch lookup for anyone
 * else (e.g. a former member) — never one call per event.
 */
export function useActorLookup(members: User[]) {
  const [users, setUsers] = useState<Record<string, User>>({});
  // Ids already sent to the batch endpoint, so a page that adds no new ids makes no call.
  const requested = useRef(new Set<string>());

  const resolve = useCallback(async (events: ActivityEvent[]) => {
    const wanted = new Set<string>();
    for (const e of events) {
      wanted.add(e.actor);
      if (e.metadata.assignee_id) wanted.add(e.metadata.assignee_id);
    }
    const missing = [...wanted].filter(id => id !== SYSTEM_ACTOR_ID && !requested.current.has(id) && !members.some(m => m.id === id));
    missing.forEach(id => requested.current.add(id));
    if (missing.length === 0) return;
    const found = await batchUsers(missing);
    setUsers(prev => ({ ...prev, ...Object.fromEntries(found.map(u => [u.user_id, toUser(u.user_id, u.username, u.avatar)])) }));
  }, [members]);

  const reset = useCallback(() => { requested.current = new Set(); }, []);

  function userFor(id: string): User {
    if (id === SYSTEM_ACTOR_ID) return GITHUB_ACTOR;
    return members.find(m => m.id === id) ?? users[id] ?? toUser(id, 'Unknown user');
  }

  return { resolve, reset, userFor };
}
