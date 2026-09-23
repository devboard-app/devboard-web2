import { useState } from 'react';
import { createRepoLink, deleteRepoLink } from '@/api/integrations';
import { ApiError } from '@/api/client';

export interface RepoLink {
  id: string;
  projectId: string;
  githubRepo: string;
  linkedAt: string;
}

const storageKey = (teamId: string) => `devboard_repo_links:${teamId}`;

function load(teamId: string): RepoLink[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(teamId)) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(teamId: string, links: RepoLink[]) {
  try {
    localStorage.setItem(storageKey(teamId), JSON.stringify(links));
  } catch {
    // Storage blocked: links just won't survive a reload.
  }
}

/**
 * devboard-integrations has no endpoint that lists a team's repo links (see
 * BACKEND_GAPS.md #14), so this can only remember the links this browser created.
 * It is a cache, not a source of truth: a link made elsewhere won't appear, and
 * deleting a link the server no longer has just drops it from the cache.
 */
export function useRepoLinks(teamId: string) {
  const [links, setLinks] = useState<RepoLink[]>(() => load(teamId));

  function update(next: RepoLink[]) {
    setLinks(next);
    persist(teamId, next);
  }

  async function addLink(projectId: string, githubRepo: string) {
    const created = await createRepoLink(teamId, projectId, githubRepo);
    update([...links, { id: created.id, projectId: created.project_id, githubRepo: created.github_repo, linkedAt: new Date().toISOString() }]);
  }

  async function removeLink(linkId: string) {
    try {
      await deleteRepoLink(teamId, linkId);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
      // Already gone on the server: fall through and forget it locally too.
    }
    update(links.filter(l => l.id !== linkId));
  }

  return { links, addLink, removeLink };
}
