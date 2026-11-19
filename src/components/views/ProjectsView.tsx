import React from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FolderKanban,
  Globe,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Project } from '../../types/workspace';
import { calculateProjectProgress } from '../../utils/workspaceLogic';
import { IconButton } from '../ui/Controls';

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: (input: {
    name: string;
    description?: string;
    location?: string;
    date?: string;
  }) => void;
  onDeleteProject: (project: Project) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
  onAddTask: (projectId: string, text: string) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onOpenPreview: () => void;
}

export function ProjectsView({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onOpenPreview,
}: ProjectsViewProps) {
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [newProjectLocation, setNewProjectLocation] = React.useState('');
  const [newProjectDate, setNewProjectDate] = React.useState('');
  const [newTaskText, setNewTaskText] = React.useState('');
  const [taskFilter, setTaskFilter] = React.useState<'all' | 'active' | 'done'>(
    'all'
  );

  const selected =
    projects.find((p) => p.id === selectedProjectId) || null;

  const handleCreateProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onCreateProject({
      name: trimmed,
      location: newProjectLocation.trim() || undefined,
      date: newProjectDate.trim() || undefined,
    });
    setNewProjectName('');
    setNewProjectLocation('');
    setNewProjectDate('');
    setShowNewForm(false);
  };

  const handleAddTask = () => {
    if (!selected) return;
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    onAddTask(selected.id, trimmed);
    setNewTaskText('');
  };

  if (selected) {
    const progress = calculateProjectProgress(selected.tasks);
    const visibleTasks = selected.tasks.filter((task) => {
      if (taskFilter === 'active') return !task.done;
      if (taskFilter === 'done') return task.done;
      return true;
    });

    return (
      <section className="fade-up space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <IconButton
              label="Back to projects"
              onClick={() => onSelectProject(null)}
            >
              <ArrowLeft size={18} />
            </IconButton>
            <div className="min-w-0">
              <h1 className="text-[clamp(26px,4vw,32px)] leading-[1.15] font-bold tracking-tight [overflow-wrap:anywhere]">
                {selected.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] mt-1 tabular-nums">
                <span>
                  {progress.done} of {progress.total} tasks complete · {progress.percent}%
                </span>
                {selected.date && <span>· {selected.date}</span>}
                {selected.location && (
                  <span className="inline-flex items-center gap-1">
                    · <MapPin size={12} /> {selected.location}
                  </span>
                )}
              </div>
              {selected.description && (
                <p className="text-sm text-[var(--muted)] mt-2">
                  {selected.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <IconButton
              label="Open site preview"
              onClick={onOpenPreview}
            >
              <Globe size={18} />
            </IconButton>
            <IconButton
              label={`Move ${selected.name} to trash`}
              onClick={() => onDeleteProject(selected)}
            >
              <Trash2 size={18} />
            </IconButton>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress.percent}%`,
              background: selected.accent || 'var(--accent)',
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl w-fit">
            {(['all', 'active', 'done'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTaskFilter(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  taskFilter === mode
                    ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {selected.members && selected.members.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted)]">Team:</span>
              <div className="flex items-center -space-x-1.5">
                {selected.members.map((m, idx) => (
                  <span
                    key={`${m}-${idx}`}
                    className="w-6 h-6 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--hover)] transition-colors"
            >
              <button
                type="button"
                aria-label={
                  task.done
                    ? `Mark "${task.text}" not done`
                    : `Mark "${task.text}" done`
                }
                onClick={() => onToggleTask(selected.id, task.id)}
                className={`w-6 h-6 rounded-[7px] border flex items-center justify-center shrink-0 transition-colors ${
                  task.done
                    ? 'bg-[var(--dark-btn)] border-[var(--dark-btn)] text-[var(--page)]'
                    : 'border-[var(--border)] hover:border-[var(--faint)]'
                }`}
              >
                {task.done && <Check size={14} />}
              </button>
              <span
                className={`flex-1 min-w-0 text-[15px] [overflow-wrap:anywhere] ${
                  task.done ? 'line-through text-[var(--faint)]' : ''
                }`}
              >
                {task.text}
              </span>
              <button
                type="button"
                aria-label={`Delete task ${task.text}`}
                onClick={() => onDeleteTask(selected.id, task.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--faint)] hover:text-[var(--danger)] hover:bg-[var(--card-alt)] transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ))}

          {visibleTasks.length === 0 && (
            <div className="py-8 px-4 text-center text-sm text-[var(--muted)]">
              No {taskFilter === 'all' ? '' : `${taskFilter} `}tasks yet.
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--card-alt)]/50">
            <span className="w-6 h-6 rounded-[7px] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--muted)]">
              <Plus size={14} />
            </span>
            <input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
              }}
              placeholder="Add a task..."
              aria-label="New task name"
              className="flex-1 min-w-0 bg-transparent outline-none py-1.5 text-sm placeholder:text-[var(--faint)]"
            />
            <button
              type="button"
              aria-label="Add task"
              disabled={!newTaskText.trim()}
              onClick={handleAddTask}
              className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium disabled:opacity-35 transition-opacity shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fade-up space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 tabular-nums">
            {projects.length} active projects
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm((prev) => !prev)}
          className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          <span>New project</span>
        </button>
      </div>

      {showNewForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-3.5 space-y-2.5 fade-up">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') setShowNewForm(false);
              }}
              placeholder="Project name"
              aria-label="Project name"
              className="flex-1 min-w-0 bg-transparent outline-none px-2 py-1.5 text-sm font-medium"
            />
            <button
              type="button"
              aria-label="Create project"
              onClick={handleCreateProject}
              className="w-9 h-9 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              aria-label="Cancel new project"
              onClick={() => setShowNewForm(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-[var(--card-alt)]"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={newProjectDate}
              onChange={(e) => setNewProjectDate(e.target.value)}
              placeholder="Schedule (e.g. Fri, 21 Jun · 10:00)"
              aria-label="Project schedule"
              className="bg-[var(--card-alt)] border border-[var(--border-2)] rounded-xl px-3 py-1.5 text-xs outline-none"
            />
            <input
              value={newProjectLocation}
              onChange={(e) => setNewProjectLocation(e.target.value)}
              placeholder="Location (e.g. Studio · Remote)"
              aria-label="Project location"
              className="bg-[var(--card-alt)] border border-[var(--border-2)] rounded-xl px-3 py-1.5 text-xs outline-none"
            />
          </div>
        </div>
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
        {projects.map((project) => {
          const progress = calculateProjectProgress(project.tasks);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject(project.id)}
              className="w-full px-4 py-4 text-left hover:bg-[var(--hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center shrink-0"
                  style={{ color: project.accent || 'var(--muted)' }}
                >
                  <FolderKanban size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium truncate">
                    {project.name}
                  </span>
                  <span className="block text-xs text-[var(--muted)] tabular-nums truncate">
                    {progress.done}/{progress.total} tasks
                    {project.location ? ` · ${project.location}` : ''}
                    {project.date ? ` · ${project.date}` : ''}
                  </span>
                </span>
                {project.members && project.members.length > 0 && (
                  <span className="hidden sm:inline-flex items-center -space-x-1.5 shrink-0 mr-1">
                    {project.members.map((m, idx) => (
                      <span
                        key={`${m}-${idx}`}
                        className="w-6 h-6 rounded-full bg-[var(--card-alt)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold"
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                )}
                <span className="text-xs font-mono tabular-nums text-[var(--muted)] shrink-0">
                  {progress.percent}%
                </span>
                <ChevronRight
                  size={17}
                  className="text-[var(--faint)] shrink-0"
                />
              </div>
              <div className="mt-3 ml-[52px] h-1 rounded-full bg-[var(--track)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progress.percent}%`,
                    background: project.accent || 'var(--accent)',
                  }}
                />
              </div>
            </button>
          );
        })}

        {projects.length === 0 && (
          <div className="py-12 px-4 flex flex-col items-center text-center text-[var(--muted)]">
            <FolderKanban size={26} className="text-[var(--faint)]" />
            <p className="mt-2.5 text-sm font-medium text-[var(--text)]">
              No projects yet
            </p>
            <p className="mt-1 text-xs">
              Create a project to organize tasks and track completion.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
