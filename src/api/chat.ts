import { apiPost } from './client';

export interface ChatResponse {
  answer: string;
}

export const askProjectChat = (projectId: string, message: string, projectName?: string) =>
  apiPost<ChatResponse>(`/projects/${projectId}/chat/`, { message, project_name: projectName });
