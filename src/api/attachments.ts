import { apiPost, apiDelete } from './client';

// devboard-attachments is a separate FastAPI service (proxied at /attachments,
// see vite.config.ts) with its own owner-only auth check — no team/project/role
// awareness at all, just "does this JWT's sub own this attachment."

export const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // server-enforced (MAX_FILE_SIZE_MB=5 env)

interface UploadRequestInput {
  filename: string;
  content_type: string;
  size: number;
}

interface UploadRequestResponse {
  attachment_id: string;
  upload_url: string; // presigned MinIO/S3 PUT URL, ~15min TTL
}

export interface ApiAttachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  status: string;
  created_at: string;
}

const requestUpload = (input: UploadRequestInput) =>
  apiPost<UploadRequestResponse>('/attachments/request-upload/', input);

async function putFile(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  if (!res.ok) throw new Error(`Upload to storage failed (${res.status})`);
}

const confirmUpload = (attachmentId: string) =>
  apiPost<ApiAttachment>(`/attachments/${attachmentId}/confirm/`);

export const deleteAttachment = (attachmentId: string) =>
  apiDelete<void>(`/attachments/${attachmentId}/`);

// Full 3-call flow: request a presigned URL, PUT the bytes straight to
// storage, then confirm so the server validates and finalizes it.
export async function uploadAttachment(file: File): Promise<ApiAttachment> {
  const { attachment_id, upload_url } = await requestUpload({
    filename: file.name,
    content_type: file.type,
    size: file.size,
  });
  await putFile(upload_url, file);
  return confirmUpload(attachment_id);
}
