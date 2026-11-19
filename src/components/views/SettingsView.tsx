import React from 'react';
import { Download, Lock, ShieldCheck, Upload } from 'lucide-react';
import type {
  EqPresetId,
  ThemeId,
  VaultItem,
  WorkspaceSettings,
} from '../../types/workspace';
import { EQ_PRESETS, setEqBands, setVolumeLeveler } from '../../utils/audioEngine';
import { estimateVaultQuota } from '../../utils/vaultDb';
import { formatBytes, hashPinSecret } from '../../utils/vaultUtils';
import { ModalShell, ToggleSwitch } from '../ui/Controls';

interface SettingsViewProps {
  settings: WorkspaceSettings;
  vaultItems: VaultItem[];
  onUpdateSettings: (next: WorkspaceSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onLockNow: () => void;
  onResetWorkspace: () => void;
  onToast: (msg: string) => void;
}

const THEME_OPTIONS: Array<{
  id: ThemeId;
  bg: string;
  dot: string;
}> = [
  { id: 'Light', bg: '#F2F1ED', dot: '#D94E32' },
  { id: 'Claude', bg: '#191919', dot: '#D97757' },
  { id: 'Dark', bg: '#171716', dot: '#EE6C4D' },
  { id: 'OLED', bg: '#000000', dot: '#F0EFED' },
  { id: 'Night', bg: '#0B0D12', dot: '#7E97C9' },
  { id: 'Ocean', bg: '#1A2027', dot: '#2783DE' },
  { id: 'Forest', bg: '#1B211D', dot: '#46A171' },
  { id: 'Teal', bg: '#172124', dot: '#2CB5A9' },
  { id: 'System', bg: 'linear-gradient(135deg,#F2F1ED 50%,#191919 50%)', dot: '#D97757' },
];

export function SettingsView({
  settings,
  vaultItems,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onLockNow,
  onResetWorkspace,
  onToast,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [pinDraft, setPinDraft] = React.useState('');
  const [pinConfirm, setPinConfirm] = React.useState('');
  const [quota, setQuota] = React.useState<{
    usedBytes: number;
    quotaBytes: number;
  } | null>(null);
  const backupInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let alive = true;
    estimateVaultQuota()
      .then((res) => {
        if (alive) setQuota(res);
      })
      .catch(() => {
        if (alive) setQuota(null);
      });
    return () => {
      alive = false;
    };
  }, [vaultItems.length]);

  const storageByKind = React.useMemo(() => {
    const counts = { audio: 0, video: 0, photo: 0, bundle: 0 };
    for (const item of vaultItems) {
      counts[item.kind] += item.size || 0;
    }
    return counts;
  }, [vaultItems]);

  const totalVaultBytes =
    storageByKind.audio +
    storageByKind.video +
    storageByKind.photo +
    storageByKind.bundle;

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(pinDraft)) {
      onToast('Enter a 4-digit PIN');
      return;
    }
    if (pinDraft !== pinConfirm) {
      onToast('PIN confirmation does not match');
      return;
    }
    try {
      const { hash, salt } = await hashPinSecret(pinDraft);
      onUpdateSettings({ ...settings, pinHash: hash, pinSalt: salt });
      setPinDraft('');
      setPinConfirm('');
      setShowPinModal(false);
      onToast('Vault PIN enabled');
    } catch {
      onToast('Could not save PIN');
    }
  };

  return (
    <section className="fade-up space-y-6">
      <div>
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.15] font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1">
          Preferences, themes, Studio audio, PIN security, and local backup
        </p>
      </div>

      {/* Profile */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--muted)]">Profile</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="profile-name-input"
              className="block text-xs text-[var(--muted)] mb-1"
            >
              Display name
            </label>
            <input
              id="profile-name-input"
              value={settings.profileName}
              onChange={(e) =>
                onUpdateSettings({ ...settings, profileName: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="profile-email-input"
              className="block text-xs text-[var(--muted)] mb-1"
            >
              Workspace handle / email
            </label>
            <input
              id="profile-email-input"
              value={settings.profileEmail}
              onChange={(e) =>
                onUpdateSettings({ ...settings, profileEmail: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Theme Picker (9 Themes) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[15px]">Theme</p>
            <p className="text-xs text-[var(--muted)]">
              Select a workspace surface palette
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--muted)]">
            {settings.appearance}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {THEME_OPTIONS.map((t) => {
            const active = settings.appearance === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onUpdateSettings({ ...settings, appearance: t.id })
                }
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold'
                    : 'border-[var(--border)] bg-[var(--card-alt)]/50 hover:bg-[var(--hover)]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/15 shrink-0 flex items-center justify-center"
                  style={{ background: t.bg }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: t.dot }}
                  />
                </span>
                <span className="text-xs truncate">{t.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace & Studio Toggles */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden divide-y divide-[var(--border-2)]">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Editor line numbers</p>
            <p className="text-xs text-[var(--muted)]">
              Show synced line numbers in the code editor gutter
            </p>
          </div>
          <ToggleSwitch
            label="Editor line numbers"
            on={settings.lineNumbers}
            onChange={(val) =>
              onUpdateSettings({ ...settings, lineNumbers: val })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Chat auto-scroll</p>
            <p className="text-xs text-[var(--muted)]">
              Automatically scroll to the newest message
            </p>
          </div>
          <ToggleSwitch
            label="Chat auto-scroll"
            on={settings.autoScroll}
            onChange={(val) =>
              onUpdateSettings({ ...settings, autoScroll: val })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Voice auto-transcribe</p>
            <p className="text-xs text-[var(--muted)]">
              Draft spoken audio into the chat composer when supported
            </p>
          </div>
          <ToggleSwitch
            label="Voice auto-transcribe"
            on={settings.autoTranscribe}
            onChange={(val) =>
              onUpdateSettings({ ...settings, autoTranscribe: val })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Compact spacing</p>
            <p className="text-xs text-[var(--muted)]">
              Tighten vertical margins across workspace views
            </p>
          </div>
          <ToggleSwitch
            label="Compact spacing"
            on={settings.compact}
            onChange={(val) => onUpdateSettings({ ...settings, compact: val })}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Studio EQ preset</p>
            <p className="text-xs text-[var(--muted)]">
              Default 5-band audio equalizer curve
            </p>
          </div>
          <select
            aria-label="Default Studio EQ preset"
            value={settings.eqPreset}
            onChange={(e) => {
              const preset = e.target.value as EqPresetId;
              const bands = EQ_PRESETS[preset];
              setEqBands(bands);
              onUpdateSettings({
                ...settings,
                eqPreset: preset,
                eqBands: bands,
              });
            }}
            className="h-9 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-xs font-medium shrink-0"
          >
            {(Object.keys(EQ_PRESETS) as EqPresetId[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="font-medium text-[15px]">Studio volume leveler</p>
            <p className="text-xs text-[var(--muted)]">
              Dynamics compressor to balance quiet and loud audio tracks
            </p>
          </div>
          <ToggleSwitch
            label="Studio volume leveler"
            on={settings.volumeLeveler}
            onChange={(val) => {
              setVolumeLeveler(val);
              onUpdateSettings({ ...settings, volumeLeveler: val });
            }}
          />
        </div>
      </div>

      {/* Vault Security (PIN Lock) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] overflow-hidden divide-y divide-[var(--border-2)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[var(--accent)] shrink-0" />
            <div>
              <p className="font-medium text-[15px]">Workspace PIN Lock</p>
              <p className="text-xs text-[var(--muted)]">
                {settings.pinHash
                  ? '4-digit PBKDF2 lock is active'
                  : 'Protect your local vault & files with a 4-digit PIN'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {settings.pinHash ? (
              <>
                <button
                  type="button"
                  onClick={onLockNow}
                  className="h-9 px-3 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Lock size={13} />
                  <span>Lock now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      pinHash: undefined,
                      pinSalt: undefined,
                      autoLockMinutes: 0,
                    });
                    onToast('PIN removed');
                  }}
                  className="h-9 px-3 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)]"
                >
                  Remove PIN
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="h-9 px-3.5 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium"
              >
                Set PIN
              </button>
            )}
          </div>
        </div>

        {settings.pinHash && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-sm font-medium">Auto-lock after idle</p>
              <p className="text-xs text-[var(--muted)]">
                Automatically lock after inactivity
              </p>
            </div>
            <select
              aria-label="Auto lock timeout"
              value={settings.autoLockMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  autoLockMinutes: Number(e.target.value) as 0 | 1 | 5,
                })
              }
              className="h-9 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-xs font-medium"
            >
              <option value={0}>Off</option>
              <option value={1}>1 min</option>
              <option value={5}>5 min</option>
            </select>
          </div>
        )}
      </div>

      {/* Storage Breakdown & Backup */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-medium text-[15px]">Local Vault Storage</p>
            <p className="text-xs text-[var(--muted)] font-mono tabular-nums mt-0.5">
              {formatBytes(totalVaultBytes)} across {vaultItems.length} vault items
              {quota && quota.quotaBytes > 0
                ? ` · ${formatBytes(quota.usedBytes)} / ${formatBytes(
                    quota.quotaBytes
                  )} browser quota`
                : ''}
            </p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[var(--track)] overflow-hidden flex">
          {totalVaultBytes > 0 && (
            <>
              <div
                style={{
                  width: `${(storageByKind.audio / totalVaultBytes) * 100}%`,
                  background: '#D97757',
                }}
                title={`Audio: ${formatBytes(storageByKind.audio)}`}
              />
              <div
                style={{
                  width: `${(storageByKind.video / totalVaultBytes) * 100}%`,
                  background: '#2783DE',
                }}
                title={`Video: ${formatBytes(storageByKind.video)}`}
              />
              <div
                style={{
                  width: `${(storageByKind.photo / totalVaultBytes) * 100}%`,
                  background: '#46A171',
                }}
                title={`Photos: ${formatBytes(storageByKind.photo)}`}
              />
              <div
                style={{
                  width: `${(storageByKind.bundle / totalVaultBytes) * 100}%`,
                  background: '#8B5CF6',
                }}
                title={`Bundles: ${formatBytes(storageByKind.bundle)}`}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums text-[var(--muted)]">
          <span>Audio: {formatBytes(storageByKind.audio)}</span>
          <span>Video: {formatBytes(storageByKind.video)}</span>
          <span>Photos: {formatBytes(storageByKind.photo)}</span>
          <span>Bundles: {formatBytes(storageByKind.bundle)}</span>
        </div>

        <div className="pt-3 border-t border-[var(--border-2)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="h-9 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)] inline-flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Export JSON backup</span>
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="h-9 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)] inline-flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>Restore backup</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportBackup(f);
                e.target.value = '';
              }}
            />
          </div>

          {confirmReset ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onResetWorkspace();
                  setConfirmReset(false);
                }}
                className="h-9 px-3.5 rounded-xl bg-[var(--danger)] text-white text-xs font-medium"
              >
                Confirm reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="h-9 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="h-9 px-3.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--card-alt)] transition-colors"
            >
              Reset defaults
            </button>
          )}
        </div>
      </div>

      <ModalShell
        open={showPinModal}
        title="Set 4-digit Vault PIN"
        onClose={() => setShowPinModal(false)}
        maxWidth="max-w-[380px]"
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="pin-new-input"
              className="block text-xs text-[var(--muted)] mb-1"
            >
              New 4-digit PIN
            </label>
            <input
              id="pin-new-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full h-11 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-center font-mono text-lg tracking-[0.4em] outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="pin-confirm-input"
              className="block text-xs text-[var(--muted)] mb-1"
            >
              Confirm PIN
            </label>
            <input
              id="pin-confirm-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full h-11 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-center font-mono text-lg tracking-[0.4em] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSavePin()}
            className="w-full h-10 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium mt-2"
          >
            Save PIN
          </button>
        </div>
      </ModalShell>
    </section>
  );
}
