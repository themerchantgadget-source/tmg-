import {
  ChevronRight,
  CodeXml,
  Disc3,
  Folder,
  FolderKanban,
  Globe,
  Layers,
  MapPin,
  Pause,
  Pin,
  Play,
  Sparkles,
  SquareTerminal,
  Upload,
} from 'lucide-react';
import type {
  Artifact,
  NavSection,
  Project,
  VaultItem,
  WorkspaceFile,
} from '../../types/workspace';
import type { StudioPlaybackState } from '../../utils/audioEngine';
import { formatBytes, formatMediaClock } from '../../utils/vaultUtils';
import {
  calculateProjectProgress,
  formatFileSize,
} from '../../utils/workspaceLogic';
import { FileTypeIcon, VaultThumb } from '../ui/Controls';

interface HomeViewProps {
  files: WorkspaceFile[];
  vaultItems: VaultItem[];
  projects: Project[];
  artifacts: Artifact[];
  playback: StudioPlaybackState;
  activePlaybackItem: VaultItem | null;
  onTogglePlayback: () => void;
  onOpenFile: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onOpenVaultItem: (item: VaultItem) => void;
  onOpenProject: (id: string) => void;
  onOpenArtifact: (id: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenPreview: () => void;
  onImportMedia: () => void;
  onLoadSampleMedia: () => void;
}

export function HomeView({
  files,
  vaultItems,
  projects,
  artifacts,
  playback,
  activePlaybackItem,
  onTogglePlayback,
  onOpenFile,
  onOpenFolder,
  onOpenVaultItem,
  onOpenProject,
  onOpenArtifact,
  onNavigate,
  onOpenPreview,
  onImportMedia,
  onLoadSampleMedia,
}: HomeViewProps) {
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const recentFiles = [...files]
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 4);

  const recentVault = [...vaultItems]
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 4);

  const recentArtifacts = [...artifacts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 2);

  const featuredProject = projects[0] || null;
  const featuredProgress = featuredProject
    ? calculateProjectProgress(featuredProject.tasks)
    : null;

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = projects.reduce(
    (sum, p) => sum + p.tasks.filter((t) => t.done).length,
    0
  );

  return (
    <section className="fade-up space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{todayLabel}</p>
          <h1 className="text-[32px] leading-[1.15] font-bold tracking-tight mt-1 text-balance">
            Today
          </h1>
        </div>
        <p className="text-sm text-[var(--muted)] tabular-nums">
          {files.length} files · {vaultItems.length} vault · {doneTasks}/{totalTasks} tasks done
        </p>
      </div>

      {activePlaybackItem && playback.activeId && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 flex items-center gap-3.5">
          <VaultThumb item={activePlaybackItem} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)]">
              Continue in Studio
            </p>
            <p className="text-base font-semibold truncate">
              {activePlaybackItem.title || activePlaybackItem.name}
            </p>
            <p className="text-xs font-mono tabular-nums text-[var(--muted)]">
              {formatMediaClock(playback.time)} /{' '}
              {formatMediaClock(playback.duration || activePlaybackItem.duration || 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={onTogglePlayback}
            aria-label={playback.playing ? 'Pause active media' : 'Resume active media'}
            className="w-10 h-10 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
          >
            {playback.playing ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="h-10 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--hover)] whitespace-nowrap shrink-0"
          >
            Open Studio
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {featuredProject && featuredProgress && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    Featured project
                  </p>
                  <h2 className="text-xl font-bold tracking-tight mt-1 truncate">
                    {featuredProject.name}
                  </h2>
                  {featuredProject.description && (
                    <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                      {featuredProject.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenProject(featuredProject.id)}
                  className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Open
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-[var(--muted)]">
                {featuredProject.date && (
                  <span className="font-mono tabular-nums">{featuredProject.date}</span>
                )}
                {featuredProject.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} />
                    {featuredProject.location}
                  </span>
                )}
                {featuredProject.members && featuredProject.members.length > 0 && (
                  <span className="inline-flex items-center -space-x-1.5 ml-auto">
                    {featuredProject.members.map((m, idx) => (
                      <span
                        key={`${m}-${idx}`}
                        className="w-6 h-6 rounded-full bg-[var(--card-alt)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold text-[var(--text)]"
                      >
                        {m}
                      </span>
                    ))}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${featuredProgress.percent}%`,
                      background: featuredProject.accent || 'var(--accent)',
                    }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-[var(--muted)] shrink-0">
                  {featuredProgress.done}/{featuredProgress.total} · {featuredProgress.percent}%
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[var(--muted)]">
                Recent &amp; pinned files
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('files')}
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                View all
              </button>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
              {recentFiles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    item.kind === 'folder'
                      ? onOpenFolder(item.id)
                      : onOpenFile(item.id)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover)] transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center shrink-0">
                    <FileTypeIcon file={item} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[15px] font-medium truncate">
                        {item.name}
                      </span>
                      {item.pinned && (
                        <Pin size={12} className="text-[var(--accent)] shrink-0" />
                      )}
                    </span>
                    <span className="block text-xs text-[var(--muted)] tabular-nums">
                      {item.kind === 'folder'
                        ? 'Folder'
                        : `${item.ext} · ${formatFileSize(item.content)}`}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--muted)] shrink-0">
                    {item.date}
                  </span>
                  <ChevronRight
                    size={17}
                    className="text-[var(--faint)] shrink-0"
                  />
                </button>
              ))}
              {recentFiles.length === 0 && (
                <div className="py-10 px-4 text-center text-sm text-[var(--muted)]">
                  No files yet. Create a file to start working.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[var(--muted)]">
                Studio Vault
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                Open Studio
              </button>
            </div>
            {recentVault.length > 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
                {recentVault.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenVaultItem(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover)] transition-colors"
                  >
                    <VaultThumb item={item} size={40} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {item.title || item.name}
                      </span>
                      <span className="block text-xs text-[var(--muted)] font-mono tabular-nums">
                        {item.kind} · {formatBytes(item.size)}
                        {item.duration ? ` · ${formatMediaClock(item.duration)}` : ''}
                      </span>
                    </span>
                    <ChevronRight
                      size={17}
                      className="text-[var(--faint)] shrink-0"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Bring audio, video, photos, or ZIP web bundles
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Stored locally in IndexedDB with zero external uploads.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onLoadSampleMedia}
                    className="h-9 px-3 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--hover)] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles size={14} className="text-[var(--accent)]" />
                    <span>Sample kit</span>
                  </button>
                  <button
                    type="button"
                    onClick={onImportMedia}
                    className="h-9 px-3 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Upload size={14} />
                    <span>Import</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[var(--muted)]">
                Active projects
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                View all
              </button>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
              {projects.slice(0, 3).map((project) => {
                const progress = calculateProjectProgress(project.tasks);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                    className="w-full px-4 py-3.5 text-left hover:bg-[var(--hover)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderKanban
                        size={17}
                        className="text-[var(--muted)] shrink-0"
                      />
                      <span className="flex-1 min-w-0 text-sm font-medium truncate">
                        {project.name}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--muted)] shrink-0">
                        {progress.percent}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1 rounded-full bg-[var(--track)] overflow-hidden">
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
                <div className="py-8 px-4 text-center text-sm text-[var(--muted)]">
                  No active projects.
                </div>
              )}
            </div>
          </div>

          {recentArtifacts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-[var(--muted)]">
                  Artifacts
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('artifacts')}
                  className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
                {recentArtifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => onOpenArtifact(artifact.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--hover)] transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-[var(--card-alt)] flex items-center justify-center text-[var(--muted)] shrink-0">
                      <Layers size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {artifact.name}
                      </span>
                      <span className="block text-xs text-[var(--muted)] truncate">
                        {artifact.date}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-[var(--faint)] shrink-0"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-[var(--muted)] mb-3">
              Quick tools
            </h2>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden divide-y divide-[var(--border-2)]">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                <Disc3 size={17} className="text-[var(--accent)]" />
                <span className="flex-1">Open Studio player</span>
                <ChevronRight size={16} className="text-[var(--faint)]" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('editor')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                <CodeXml size={17} className="text-[var(--muted)]" />
                <span className="flex-1">Open code editor</span>
                <ChevronRight size={16} className="text-[var(--faint)]" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('terminal')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                <SquareTerminal size={17} className="text-[var(--muted)]" />
                <span className="flex-1">Launch terminal</span>
                <ChevronRight size={16} className="text-[var(--faint)]" />
              </button>
              <button
                type="button"
                onClick={onOpenPreview}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                <Globe size={17} className="text-[var(--muted)]" />
                <span className="flex-1">Preview workspace site</span>
                <ChevronRight size={16} className="text-[var(--faint)]" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('files')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--hover)] transition-colors"
              >
                <Folder size={17} className="text-[var(--muted)]" />
                <span className="flex-1">Browse files &amp; vault</span>
                <ChevronRight size={16} className="text-[var(--faint)]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
