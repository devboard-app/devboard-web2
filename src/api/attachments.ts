import { apiPost, apiDelete } from './client';

// devboard-attachments is a separate FastAPI service (proxied at /attachments,
// see vite.config.ts) with its own owner-only auth check — no team/project/role
// awareness at all, just "does this JWT's sub own this attachment."

export const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // server-enforced (MAX_FILE_SIZE_MB=5 env)

export const AVATAR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface UploadRequestInput {
  filename: string;
  content_type: string;
  size: number;
  // Public files land under public/ in the bucket and get a permanent,
  // unsigned URL (avatars). Server rejects anything but images here.
  is_public?: boolean;
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
  public_url: string | null; // set only for is_public uploads
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

// Uploads an image as a public file and returns it with a permanent `public_url`.
// The filename is normalised because it ends up in the URL, and devboard-core's
// avatar URLField caps the whole URL at 200 chars.
export async function uploadPublicImage(file: File, baseName: string): Promise<ApiAttachment & { public_url: string }> {
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
  const { attachment_id, upload_url } = await requestUpload({
    filename: `${baseName}.${ext}`,
    content_type: file.type,
    size: file.size,
    is_public: true,
  });
  await putFile(upload_url, file);
  const confirmed = await confirmUpload(attachment_id);
  if (!confirmed.public_url) throw new Error('Upload did not return a public URL');
  return confirmed as ApiAttachment & { public_url: string };
}

// Public URLs look like .../public/{attachment_id}/{filename}; returns that id,
// or null for anything else (an external link, initials-only, etc.).
export function publicAttachmentId(url: string | null | undefined): string | null {
  return url?.match(/\/public\/([0-9a-f-]{36})\//i)?.[1] ?? null;
}
