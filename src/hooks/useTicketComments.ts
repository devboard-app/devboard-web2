import { useCallback, useEffect, useState } from 'react';
import type { Comment, User } from '@/types';
import {
  listComments, createComment as apiCreateComment, updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment, type ApiComment,
} from '@/api/comments';
import { uploadAttachment } from '@/api/attachments';
import { colorFor, initialsFor } from '@/lib/avatar';

function toUser(userId: string, membersById: Record<string, User>): User {
  return membersById[userId] ?? { id: userId, username: userId, initials: initialsFor(userId), color: colorFor(userId) };
}

function toComment(api: ApiComment, membersById: Record<string, User>): Comment {
  return {
    id: api.id,
    author: toUser(api.author_id, membersById),
    body: api.body,
    attachments: api.attachments.map(a => ({ id: a.id, filename: a.filename, contentType: a.content_type, size: a.size, url: a.url })),
    isEdited: api.is_edited,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function useTicketComments(teamId: string, projectId: string, ticketId: string | null, membersById: Record<string, User>) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!ticketId) { setComments([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    listComments(teamId, projectId, ticketId)
      .then(page => { if (!cancelled) setComments(page.results.map(c => toComment(c, membersById))); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load comments'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, projectId, ticketId, reloadToken]);

  const refetch = useCallback(() => setReloadToken(t => t + 1), []);

  // Uploads each file to devboard-attachments first (request-upload -> PUT ->
  // confirm), then creates the comment with the resulting attachment ids.
  // Max 5 attachments per comment, server-enforced.
  async function addComment(body: string, files: File[]) {
    setSubmitting(true);
    try {
      const uploaded = await Promise.all(files.map(uploadAttachment));
      await apiCreateComment(teamId, projectId, ticketId!, body, uploaded.map(a => a.id));
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function editComment(commentId: string, body: string) {
    await apiUpdateComment(teamId, projectId, ticketId!, commentId, body);
    refetch();
  }

  async function removeComment(commentId: string) {
    await apiDeleteComment(teamId, projectId, ticketId!, commentId);
    refetch();
  }

  return { comments, loading, error, submitting, addComment, editComment, removeComment };
}
