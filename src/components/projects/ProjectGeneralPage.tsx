import type { Project } from '@/types';
import { ProfileHeader } from '@/components/ui/ImageField';

interface Props {
  project: Project;
  currentUserId: string;
  onUpdateImages: (patch: { avatar?: string; banner?: string }) => Promise<void>;
}

// Indigo, matching the project mark in the top bar and sidebar.
const PROJECT_ACCENT = '#6366F1';

export function ProjectGeneralPage({ project, currentUserId, onUpdateImages }: Props) {
  // Mirrors devboard-work: project PATCH is lead-only.
  const canEdit = project.leadIds.includes(currentUserId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <ProfileHeader
          title={project.name}
          subtitle={project.key}
          avatarUrl={project.avatar}
          bannerUrl={project.banner}
          avatarFallback={project.key[0]}
          accentColor={PROJECT_ACCENT}
          canEdit={canEdit}
          onSave={onUpdateImages}>
          {project.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4 whitespace-pre-wrap">{project.description}</p>
          )}
        </ProfileHeader>
      </div>
    </div>
  );
}
