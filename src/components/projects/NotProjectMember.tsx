import type { Project } from '@/types';
import { Avatar } from '@/components/layout/AppShell';
import { EntityMark } from '@/components/ui/ImageField';

/**
 * Shown instead of a project's screens to a team member who isn't on the project.
 * devboard-work only serves tickets, sprints and labels to project leads and
 * contributors, so without this every request would 403.
 */
export function NotProjectMember({ project }: { project: Project }) {
  const leads = project.members.filter(m => project.leadIds.includes(m.id));

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <EntityMark url={project.avatar} fallback={project.key[0]}
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-lg font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">You're not on {project.name}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Only project members can see its board, backlog and sprints. Ask a project lead to add you.
        </p>
        {leads.length > 0 && (
          <div className="mt-5 inline-flex flex-col items-start gap-2">
            <p className="text-[11px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-600 uppercase">
              {leads.length === 1 ? 'Project lead' : 'Project leads'}
            </p>
            {leads.map(lead => (
              <div key={lead.id} className="flex items-center gap-2">
                <Avatar user={lead} size="xs" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{lead.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
