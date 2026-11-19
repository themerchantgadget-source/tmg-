import React from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Ellipsis,
  Eye,
  File,
  FilePlus2,
  FolderArchive,
  FolderPlus,
  FolderUp,
  Heart,
  LayoutGrid,
  List,
  ListPlus,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  VaultCollection,
  VaultItem,
  VaultKind,
  WorkspaceFile,
} from '../../types/workspace';
import { formatBytes, formatMediaClock } from '../../utils/vaultUtils';
import {
  formatFileSize,
  sortAndFilterVaultItems,
  type VaultSortBy,
} from '../../utils/workspaceLogic';
import { FileTypeIcon, IconButton, VaultThumb } from '../ui/Controls';

export type FilesScope = 'all' | 'files' | VaultKind;

interface FilesViewProps {
  files: WorkspaceFile[];
  vaultItems: VaultItem[];
  collections: VaultCollection[];
  currentFolderId: string | null;
  onChangeFolder: (folderId: string | null) => void;
  onOpenFile: (id: string) => void;
  onCreateFile: (
    name: string,
    content: string,
    parentId: string | null
  ) => WorkspaceFile | null;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFile: (id: string, newName: string) => void;
  onDuplicateFile: (id: string) => void;
  onTogglePinFile: (id: string) => void;
  onDownloadFile: (file: WorkspaceFile) => void;
  onTrashFile: (file: WorkspaceFile) => void;
  onOpenVaultItem: (item: VaultItem) => void;
  onUpdateVaultItem: (id: string, patch: Partial<VaultItem>) => void;
  onQueuePlayNext: (id: string) => void;
  onTrashVaultItem: (item: VaultItem) => void;
  onBatchTrashVault: (ids: string[]) => void;
  onBatchFavoriteVault: (ids: string[]) => void;
  onBatchAssignCollection: (ids: string[], collectionId: string | undefined) => void;
  onCreateCollection: (name: string) => void;
  onImportFiles: (fileList: FileList) => void;
  onImportFolder: (fileList: FileList) => void;
  onLoadSampleMedia: () => void;
  showNewFileForm: boolean;
  onShowNewFileFormChange: (show: boolean) => void;
  onToast: (msg: string) => void;
}

const SCOPE_TABS: Array<{ id: FilesScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'files', label: 'Files' },
  { id: 'audio', label: 'Music' },
  { id: 'video', label: 'Video' },
  { id: 'photo', label: 'Photos' },
  { id: 'bundle', label: 'Bundles' },
];

export function FilesView({
  files,
  vaultItems,
  collections,
  currentFolderId,
  onChangeFolder,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDuplicateFile,
  onTogglePinFile,
  onDownloadFile,
  onTrashFile,
  onOpenVaultItem,
  onUpdateVaultItem,
  onQueuePlayNext,
  onTrashVaultItem,
  onBatchTrashVault,
  onBatchFavoriteVault,
  onBatchAssignCollection,
  onCreateCollection,
  onImportFiles,
  onImportFolder,
  onLoadSampleMedia,
  showNewFileForm,
  onShowNewFileFormChange,
  onToast,
}: FilesViewProps) {
  const [scope, setScope] = React.useState<FilesScope>('all');
  const [layout, setLayout] = React.useState<'list' | 'grid'>('list');
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<VaultSortBy>('recent');
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);
  const [activeCollectionId, setActiveCollectionId] = React.useState<string | null>(
    null
  );
  const [showNewColForm, setShowNewColForm] = React.useState(false);
  const [newColName, setNewColName] = React.useState('');
  const [selectedVaultIds, setSelectedVaultIds] = React.useState<string[]>([]);
  const [newFileName, setNewFileName] = React.useState('');
  const [showNewFolderForm, setShowNewFolderForm] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [menuId, setMenuId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);

  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!menuId) return;
    const closeMenu = () => setMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [menuId]);

  const breadcrumbs = React.useMemo(() => {
    const chain: WorkspaceFile[] = [];
    const visited = new Set<string>();
    let cursor = currentFolderId
      ? files.find((item) => item.id === currentFolderId && item.kind === 'folder')
      : undefined;
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      chain.unshift(cursor);
      cursor = cursor.parentId
        ? files.find((item) => item.id === cursor?.parentId && item.kind === 'folder')
        : undefined;
    }
    return chain;
  }, [files, currentFolderId]);

  const showWorkspaceFiles =
    (scope === 'all' || scope === 'files') && !favoritesOnly && !activeCollectionId;

  const currentEntries = React.useMemo(() => {
    if (!showWorkspaceFiles) return [];
    const q = filterText.trim().toLowerCase();
    return files
      .filter((item) => (item.parentId ?? null) === currentFolderId)
      .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : b.updatedAt - a.updatedAt;
      });
  }, [files, currentFolderId, filterText, showWorkspaceFiles, sortBy]);

  const filteredVaultItems = React.useMemo(() => {
    if (scope === 'files') return [];
    if (scope === 'all' && currentFolderId !== null) return [];
    return sortAndFilterVaultItems(vaultItems, {
      scope: scope === 'all' ? 'all' : scope,
      query: filterText,
      favoritesOnly,
      collectionId: activeCollectionId,
      sortBy,
    });
  }, [
    vaultItems,
    scope,
    currentFolderId,
    filterText,
    favoritesOnly,
    activeCollectionId,
    sortBy,
  ]);

  const toggleVaultSelection = (id: string) => {
    setSelectedVaultIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateFileSubmit = () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      onToast('Enter a file name');
      return;
    }
    const created = onCreateFile(trimmed, `# ${trimmed}\n\n`, currentFolderId);
    setNewFileName('');
    onShowNewFileFormChange(false);
    if (created) {
      onOpenFile(created.id);
    }
  };

  const handleCreateFolderSubmit = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      onToast('Enter a folder name');
      return;
    }
    onCreateFolder(trimmed, currentFolderId);
    setNewFolderName('');
    setShowNewFolderForm(false);
  };

  const handleOpenEntry = (entry: WorkspaceFile) => {
    if (entry.kind === 'folder') {
      onChangeFolder(entry.id);
    } else {
      onOpenFile(entry.id);
    }
  };

  const commitRename = (entry: WorkspaceFile) => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== entry.name) {
      onRenameFile(entry.id, trimmed);
    }
    setRenamingId(null);
  };

  const renderFileActionMenu = (entry: WorkspaceFile) => {
    if (menuId !== entry.id) return null;
    return (
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-11 z-20 w-[190px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-1.5 text-sm"
      >
        <button
          type="button"
          onClick={() => {
            setMenuId(null);
            handleOpenEntry(entry);
          }}
          className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-left"
        >
          <Eye size={15} />
          <span>Open</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMenuId(null);
            onTogglePinFile(entry.id);
          }}
          className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-left"
        >
          <Pin size={15} />
          <span>{entry.pinned ? 'Unpin' : 'Pin to top'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMenuId(null);
            setRenamingId(entry.id);
            setRenameDraft(entry.name);
          }}
          className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-left"
        >
          <Pencil size={15} />
          <span>Rename</span>
        </button>
        {entry.kind === 'file' && (
          <>
            <button
              type="button"
              onClick={() => {
                setMenuId(null);
                onDuplicateFile(entry.id);
              }}
              className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-left"
            >
              <Copy size={15} />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuId(null);
                onDownloadFile(entry);
              }}
              className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-left"
            >
              <Download size={15} />
              <span>Download</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMenuId(null);
            onTrashFile(entry);
          }}
          className="w-full flex gap-2.5 items-center px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] text-[var(--danger)] text-left"
        >
          <Trash2 size={15} />
          <span>Move to Trash</span>
        </button>
      </div>
    );
  };

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer?.files?.length) {
          onImportFiles(e.dataTransfer.files);
        }
      }}
      className={`fade-up space-y-5 rounded-3xl transition-colors ${
        dragOver ? 'ring-2 ring-[var(--accent)] ring-offset-4 ring-offset-[var(--page)]' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-[var(--muted)] flex-wrap">
            <button
              type="button"
              onClick={() => onChangeFolder(null)}
              className="hover:text-[var(--text)] transition-colors"
            >
              workspace
            </button>
            {breadcrumbs.map((folder) => (
              <React.Fragment key={folder.id}>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => onChangeFolder(folder.id)}
                  className="hover:text-[var(--text)] transition-colors truncate max-w-[160px]"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {currentFolderId && (
              <IconButton
                label="Back to parent folder"
                onClick={() => {
                  const parent =
                    breadcrumbs[breadcrumbs.length - 1]?.parentId ?? null;
                  onChangeFolder(parent);
                }}
              >
                <ArrowLeft size={18} />
              </IconButton>
            )}
            <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
              {breadcrumbs.length
                ? breadcrumbs[breadcrumbs.length - 1].name
                : 'Files & Vault'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            label="New file"
            active={showNewFileForm}
            onClick={() => {
              setShowNewFolderForm(false);
              onShowNewFileFormChange(!showNewFileForm);
            }}
          >
            <FilePlus2 size={19} />
          </IconButton>
          <IconButton
            label="New folder"
            active={showNewFolderForm}
            onClick={() => {
              onShowNewFileFormChange(false);
              setShowNewFolderForm(!showNewFolderForm);
            }}
          >
            <FolderPlus size={19} />
          </IconButton>
          <IconButton
            label="Import media or ZIP"
            onClick={() => uploadInputRef.current?.click()}
          >
            <Upload size={19} />
          </IconButton>
          <IconButton
            label="Import web folder bundle"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderUp size={19} />
          </IconButton>
          <IconButton
            label={layout === 'list' ? 'Grid view' : 'List view'}
            active={layout === 'grid'}
            onClick={() => setLayout((prev) => (prev === 'list' ? 'grid' : 'list'))}
          >
            {layout === 'list' ? <LayoutGrid size={19} /> : <List size={19} />}
          </IconButton>
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        aria-label="Import files, audio, video, photos, or ZIP bundles"
        onChange={(e) => {
          if (e.target.files?.length) {
            onImportFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard folder upload attributes supported by Chromium/Safari
        webkitdirectory=""
        directory=""
        className="hidden"
        aria-label="Import web project folder"
        onChange={(e) => {
          if (e.target.files?.length) {
            onImportFolder(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Scope Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Files and Vault categories"
          className="flex items-center gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto no-scrollbar max-w-full"
        >
          {SCOPE_TABS.map((tab) => {
            const active = scope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setScope(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[var(--dark-btn)] text-[var(--page)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFavoritesOnly((f) => !f)}
            aria-label="Filter favorites"
            className={`h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              favoritesOnly
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Heart size={14} className={favoritesOnly ? 'fill-current' : ''} />
            <span>Favorites</span>
          </button>

          <select
            aria-label="Sort items"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as VaultSortBy)}
            className="h-9 px-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-medium outline-none"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="plays">Most played</option>
          </select>
        </div>
      </div>

      {/* Collections filter strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setActiveCollectionId(null)}
          className={`h-8 px-3 rounded-xl text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
            activeCollectionId === null
              ? 'bg-[var(--card)] border-[var(--text)] text-[var(--text)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          All collections
        </button>
        {collections.map((col) => {
          const active = activeCollectionId === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() =>
                setActiveCollectionId(active ? null : col.id)
              }
              className={`h-8 px-3 rounded-xl text-xs font-medium border whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                active
                  ? 'bg-[var(--card)] border-[var(--accent)] text-[var(--text)]'
                  : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>{col.glyph}</span>
              <span>{col.name}</span>
            </button>
          );
        })}
        {showNewColForm ? (
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-2 h-8 shrink-0">
            <input
              autoFocus
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newColName.trim()) {
                  onCreateCollection(newColName.trim());
                  setNewColName('');
                  setShowNewColForm(false);
                }
                if (e.key === 'Escape') setShowNewColForm(false);
              }}
              placeholder="Collection..."
              className="w-24 bg-transparent outline-none text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (newColName.trim()) {
                  onCreateCollection(newColName.trim());
                  setNewColName('');
                }
                setShowNewColForm(false);
              }}
              aria-label="Save collection"
              className="text-[var(--accent)]"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewColForm(true)}
            className="h-8 px-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus size={13} />
            <span>Collection</span>
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl px-3.5 h-11">
        <Search size={16} className="text-[var(--muted)] shrink-0" />
        <input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter files, audio, video, photos, or bundles..."
          aria-label="Filter files and vault"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-[var(--faint)]"
        />
        {filterText && (
          <button
            type="button"
            aria-label="Clear file filter"
            onClick={() => setFilterText('')}
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Batch Bar for Vault Selection */}
      {selectedVaultIds.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--accent)] rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 fade-up">
          <span className="text-xs font-mono font-medium">
            {selectedVaultIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onBatchFavoriteVault(selectedVaultIds);
                setSelectedVaultIds([]);
              }}
              className="h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)]"
            >
              Favorite
            </button>
            {collections.length > 0 && (
              <select
                aria-label="Assign selection to collection"
                defaultValue=""
                onChange={(e) => {
                  const val = e.target.value;
                  onBatchAssignCollection(
                    selectedVaultIds,
                    val === 'none' ? undefined : val
                  );
                  setSelectedVaultIds([]);
                }}
                className="h-8 px-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-alt)] text-xs"
              >
                <option value="" disabled>
                  Move to collection...
                </option>
                <option value="none">Unassigned</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                onBatchTrashVault(selectedVaultIds);
                setSelectedVaultIds([]);
              }}
              className="h-8 px-3 rounded-xl bg-[var(--danger)] text-white text-xs font-medium"
            >
              Trash
            </button>
            <button
              type="button"
              onClick={() => setSelectedVaultIds([])}
              className="h-8 px-2.5 rounded-xl text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showNewFileForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-3 flex items-center gap-2 fade-up">
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFileSubmit();
              if (e.key === 'Escape') onShowNewFileFormChange(false);
            }}
            placeholder="filename.html or notes.md"
            aria-label="New file name"
            className="flex-1 min-w-0 bg-transparent outline-none px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            aria-label="Create file"
            onClick={handleCreateFileSubmit}
            className="w-9 h-9 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            aria-label="Cancel new file"
            onClick={() => onShowNewFileFormChange(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-[var(--card-alt)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showNewFolderForm && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-3 flex items-center gap-2 fade-up">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolderSubmit();
              if (e.key === 'Escape') setShowNewFolderForm(false);
            }}
            placeholder="Folder name"
            aria-label="New folder name"
            className="flex-1 min-w-0 bg-transparent outline-none px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            aria-label="Create folder"
            onClick={handleCreateFolderSubmit}
            className="w-9 h-9 rounded-full bg-[var(--dark-btn)] text-[var(--page)] flex items-center justify-center shrink-0"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            aria-label="Cancel new folder"
            onClick={() => setShowNewFolderForm(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-[var(--card-alt)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Workspace Files & Folders */}
      {showWorkspaceFiles && currentEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)]">
            Workspace files
          </p>
          {layout === 'list' ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] divide-y divide-[var(--border-2)]">
              {currentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="relative flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--hover)] transition-colors first:rounded-t-[20px] last:rounded-b-[20px]"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenEntry(entry)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span className="shrink-0">
                      <FileTypeIcon file={entry} />
                    </span>
                    {renamingId === entry.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(entry);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => commitRename(entry)}
                        aria-label={`Rename ${entry.name}`}
                        className="flex-1 min-w-0 bg-[var(--card-alt)] text-[var(--text)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-sm outline-none"
                      />
                    ) : (
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-medium text-[15px] truncate">
                          {entry.name}
                        </span>
                        {entry.pinned && (
                          <Pin size={12} className="text-[var(--accent)] shrink-0" />
                        )}
                      </span>
                    )}
                    <span className="text-xs font-mono tabular-nums text-[var(--muted)] shrink-0 hidden sm:block">
                      {entry.kind === 'folder'
                        ? `${files.filter((f) => f.parentId === entry.id).length} items`
                        : formatFileSize(entry.content)}
                    </span>
                    <span className="text-xs text-[var(--muted)] shrink-0">
                      {entry.date}
                    </span>
                  </button>

                  <div className="relative shrink-0">
                    <IconButton
                      label={`Actions for ${entry.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuId === entry.id ? null : entry.id);
                      }}
                    >
                      <Ellipsis size={18} />
                    </IconButton>
                    {renderFileActionMenu(entry)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="relative bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-4 hover:bg-[var(--hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEntry(entry)}
                      aria-label={`Open ${entry.name}`}
                      className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center shrink-0"
                    >
                      <FileTypeIcon file={entry} />
                    </button>
                    <div className="relative">
                      <IconButton
                        label={`Actions for ${entry.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === entry.id ? null : entry.id);
                        }}
                      >
                        <Ellipsis size={17} />
                      </IconButton>
                      {renderFileActionMenu(entry)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEntry(entry)}
                    className="block w-full text-left mt-3"
                  >
                    <span className="block font-medium text-sm truncate">
                      {entry.name}
                    </span>
                    <span className="block text-xs text-[var(--muted)] mt-1 tabular-nums">
                      {entry.date} ·{' '}
                      {entry.kind === 'folder'
                        ? 'Folder'
                        : formatFileSize(entry.content)}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vault Media & Web Bundles */}
      {scope !== 'files' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Media &amp; Web Bundles ({filteredVaultItems.length})
            </p>
            {vaultItems.length === 0 && (
              <button
                type="button"
                onClick={onLoadSampleMedia}
                className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                <Sparkles size={13} />
                <span>Load sample track &amp; poster</span>
              </button>
            )}
          </div>

          {filteredVaultItems.length > 0 ? (
            layout === 'list' ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] divide-y divide-[var(--border-2)]">
                {filteredVaultItems.map((item) => {
                  const selected = selectedVaultIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover)] transition-colors first:rounded-t-[20px] last:rounded-b-[20px]"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleVaultSelection(item.id)}
                        aria-label={`Select ${item.title || item.name}`}
                        className="w-4 h-4 accent-[var(--accent)] shrink-0 rounded"
                      />
                      <button
                        type="button"
                        onClick={() => onOpenVaultItem(item)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <VaultThumb item={item} size={42} />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="font-medium text-[15px] truncate">
                              {item.title || item.name}
                            </span>
                            {item.pinned && (
                              <Pin
                                size={12}
                                className="text-[var(--accent)] shrink-0"
                              />
                            )}
                          </span>
                          <span className="block text-xs text-[var(--muted)] font-mono tabular-nums truncate">
                            {item.kind.toUpperCase()} · {formatBytes(item.size)}
                            {item.duration
                              ? ` · ${formatMediaClock(item.duration)}`
                              : ''}
                            {item.bundlePaths
                              ? ` · ${item.bundlePaths.length} files`
                              : ''}
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {(item.kind === 'audio' || item.kind === 'video') && (
                          <IconButton
                            label={`Queue ${item.title} next`}
                            onClick={() => onQueuePlayNext(item.id)}
                          >
                            <ListPlus size={16} />
                          </IconButton>
                        )}
                        <IconButton
                          label={
                            item.favorite
                              ? `Unfavorite ${item.title}`
                              : `Favorite ${item.title}`
                          }
                          active={Boolean(item.favorite)}
                          onClick={() =>
                            onUpdateVaultItem(item.id, {
                              favorite: !item.favorite,
                            })
                          }
                        >
                          <Heart
                            size={16}
                            className={item.favorite ? 'fill-current' : ''}
                          />
                        </IconButton>
                        <IconButton
                          label={`Move ${item.title} to Trash`}
                          onClick={() => onTrashVaultItem(item)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredVaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] p-3.5 hover:bg-[var(--hover)] transition-colors space-y-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenVaultItem(item)}
                      className="w-full flex items-center justify-between gap-2 text-left"
                    >
                      <VaultThumb item={item} size={46} />
                      <span className="text-[11px] font-mono uppercase text-[var(--muted)]">
                        {item.ext}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVaultItem(item)}
                      className="block w-full text-left"
                    >
                      <p className="font-medium text-sm truncate">
                        {item.title || item.name}
                      </p>
                      <p className="text-xs text-[var(--muted)] font-mono tabular-nums mt-0.5">
                        {formatBytes(item.size)}
                        {item.duration
                          ? ` · ${formatMediaClock(item.duration)}`
                          : ''}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-8 flex flex-col items-center text-center">
              <FolderArchive size={26} className="text-[var(--faint)]" />
              <p className="mt-2.5 text-sm font-medium">
                {scope === 'all'
                  ? 'Drop audio, video, photos, or .zip web bundles anywhere here'
                  : `No ${scope} items in your vault`}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-[380px]">
                Everything stays private on this device via IndexedDB, ready for Studio playback or sandboxed preview.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  <span>Import files / ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={onLoadSampleMedia}
                  className="h-9 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--hover)] inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-[var(--accent)]" />
                  <span>Load sample kit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showWorkspaceFiles &&
        currentEntries.length === 0 &&
        filteredVaultItems.length === 0 &&
        scope === 'files' && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] py-12 px-4 flex flex-col items-center text-center text-[var(--muted)]">
            <File size={26} className="text-[var(--faint)]" />
            <p className="mt-2.5 text-sm font-medium text-[var(--text)]">
              {filterText ? 'No matching files' : 'This folder is empty'}
            </p>
            <p className="mt-1 text-xs">
              {filterText
                ? 'Try a different filter or clear the search.'
                : 'Create a file or folder above to get started.'}
            </p>
          </div>
        )}
    </section>
  );
}
