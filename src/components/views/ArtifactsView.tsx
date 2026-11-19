import React from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Artifact } from '../../types/workspace';
import { IconButton } from '../ui/Controls';

interface ArtifactsViewProps {
  artifacts: Artifact[];
  selectedArtifactId: string | null;
  onSelectArtifact: (id: string | null) => void;
  onCreateArtifact: (name: string, content: string, detail: string) => void;
  onUpdateArtifact: (id: string, name: string, content: string, detail: string) => void;
  onTrashArtifact: (artifact: Artifact) => void;
  onDownloadArtifact: (artifact: Artifact) => void;
  onCopy: (text: string, msg?: string) => void;
}

export function ArtifactsView({
  artifacts,
  selectedArtifactId,
  onSelectArtifact,
  onCreateArtifact,
  onUpdateArtifact,
  onTrashArtifact,
  onDownloadArtifact,
  onCopy,
}: ArtifactsViewProps) {
  const [showNew, setShowNew] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [newDetail, setNewDetail] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editContent, setEditContent] = React.useState('');
  const [editDetail, setEditDetail] = React.useState('');

  const selected =
    artifacts.find((item) => item.id === selectedArtifactId) || null;

  React.useEffect(() => {
    setEditing(false);
  }, [selected?.id]);

  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) return;
    onCreateArtifact(
      newName.trim(),
      newContent.trim(),
      newDetail.trim() || newContent.trim()
    );
    setNewName('');
    setNewContent('');
    setNewDetail('');
    setShowNew(false);
  };

  if (selected) {
    return (
      <section className="fade-up space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton
              label="Back to artifacts"
              onClick={() => onSelectArtifact(null)}
            >
              <ArrowLeft size={18} />
            </IconButton>
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">{selected.date}</p>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {selected.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <IconButton
              label="Copy artifact"
              onClick={() => onCopy(selected.content, 'Artifact copied')}
            >
              <Copy size={18} />
            </IconButton>
            <IconButton
              label={editing ? 'Cancel edit' : 'Edit artifact'}
              active={editing}
              onClick={() => {
                if (!editing) {
                  setEditName(selected.name);
                  setEditContent(selected.content);
                  setEditDetail(selected.detail);
                }
                setEditing((prev) => !prev);
              }}
            >
              <Pencil size={18} />
            </IconButton>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-6 sm:p-8">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Title
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Description
                </label>
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm font-mono outline-none resize-y"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editName.trim() && editContent.trim()) {
                      onUpdateArtifact(
                        selected.id,
                        editName.trim(),
                        editContent.trim(),
                        editDetail.trim()
                      );
                      setEditing(false);
                    }
                  }}
                  className="h-9 px-4 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Save changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-9 px-4 rounded-xl border border-[var(--border)] text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[24px] font-bold tracking-tight [overflow-wrap:anywhere]">
                {selected.name}
              </h2>
              <p className="text-[15px] leading-[1.65] mt-2.5 text-[var(--muted)]">
                {selected.detail}
              </p>
              <pre className="mt-6 bg-[var(--card-alt)] border border-[var(--border-2)] rounded-2xl p-5 text-[14px] font-mono whitespace-pre-wrap [overflow-wrap:anywhere]">
                {selected.content}
              </pre>
              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => onDownloadArtifact(selected)}
                  className="flex items-center gap-2 bg-[var(--dark-btn)] text-[var(--page)] px-4 py-2 rounded-xl text-sm font-medium"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTrashArtifact(selected)}
                  className="flex items-center gap-2 border border-[var(--border)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--card-alt)]"
                >
                  <Trash2 size={15} />
                  <span>Move to Trash</span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="fade-up space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
            Artifacts
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 tabular-nums">
            {artifacts.length} saved drafts and snapshots
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((prev) => !prev)}
          className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          <span>New artifact</span>
        </button>
      </div>

      {showNew && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-4 space-y-3 fade-up">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">New artifact</span>
            <button
              type="button"
              aria-label="Close new artifact form"
              onClick={() => setShowNew(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--card-alt)]"
            >
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Artifact title"
            aria-label="Artifact title"
            className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none"
          />
          <input
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            placeholder="Short summary (optional)"
            aria-label="Artifact summary"
            className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            placeholder="Artifact content or snippet..."
            aria-label="Artifact content"
            className="w-full bg-[var(--card-alt)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-mono outline-none resize-y"
          />
          <button
            type="button"
            disabled={!newName.trim() || !newContent.trim()}
            onClick={handleCreate}
            className="h-9 px-4 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium disabled:opacity-35"
          >
            Save artifact
          </button>
        </div>
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden divide-y divide-[var(--border-2)]">
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            type="button"
            onClick={() => onSelectArtifact(artifact.id)}
            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--hover)] transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center text-[var(--muted)] shrink-0">
              <Layers size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-[15px] truncate">
                {artifact.name}
              </span>
              <span className="block text-xs text-[var(--muted)] truncate">
                {artifact.content}
              </span>
            </span>
            <span className="text-xs text-[var(--muted)] shrink-0">
              {artifact.date}
            </span>
            <ChevronRight
              size={17}
              className="text-[var(--faint)] shrink-0"
            />
          </button>
        ))}

        {artifacts.length === 0 && (
          <div className="py-12 px-4 flex flex-col items-center text-center text-[var(--muted)]">
            <Layers size={26} className="text-[var(--faint)]" />
            <p className="mt-2.5 text-sm font-medium text-[var(--text)]">
              No artifacts saved
            </p>
            <p className="mt-1 text-xs">
              Save outputs from Chat or create a new artifact above.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
