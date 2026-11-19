import React from 'react';
import { ExternalLink, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import {
  AI_PROVIDERS,
  type AiProviderId,
  getAiProvider,
} from '../utils/aiProviders';

const PROVIDER_IDS: AiProviderId[] = ['gemini', 'groq', 'openrouter', 'cerebras', 'custom'];
const KEY_PREFIX = 'tmg-ai-provider-key-v1:';

export function readProviderKey(provider: AiProviderId): string {
  try { return localStorage.getItem(`${KEY_PREFIX}${provider}`) || ''; }
  catch { return ''; }
}

export interface AiProviderSetupProps {
  provider: AiProviderId;
  model: string;
  endpoint: string;
  onChange: (next: { provider: AiProviderId; model: string; endpoint: string }) => void;
  onToast?: (message: string) => void;
  compact?: boolean;
}

export function AiProviderSetup({ provider, model, endpoint, onChange, onToast, compact = false }: AiProviderSetupProps) {
  const [keyDraft, setKeyDraft] = React.useState(() => readProviderKey(provider));
  const [showKey, setShowKey] = React.useState(false);
  const config = getAiProvider(provider);
  const connected = Boolean(readProviderKey(provider));

  React.useEffect(() => { setKeyDraft(readProviderKey(provider)); }, [provider]);

  const chooseProvider = (id: AiProviderId) => {
    const next = AI_PROVIDERS[id];
    onChange({ provider: id, model: next.defaultModel, endpoint: next.endpoint });
  };

  const saveKey = () => {
    const value = keyDraft.trim();
    try {
      if (value) localStorage.setItem(`${KEY_PREFIX}${provider}`, value);
      else localStorage.removeItem(`${KEY_PREFIX}${provider}`);
      onToast?.(value ? `${config.name} key saved on this device` : `${config.name} key removed`);
    } catch {
      onToast?.('Could not access local browser storage');
    }
  };

  const forgetKey = () => {
    try { localStorage.removeItem(`${KEY_PREFIX}${provider}`); } catch { /* Storage may be unavailable. */ }
    setKeyDraft('');
    onToast?.(`${config.name} key removed from this device`);
  };

  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[20px] ${compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0"><KeyRound size={17} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-[15px]">AI provider · bring your own key</p>
            <span className={`text-[11px] font-medium ${connected ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>{connected ? 'Key saved locally' : 'Not connected'}</span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">Your key is stored in this browser on this device, not in workspace backups. Requests go directly from your browser to the selected provider.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="ai-provider-select" className="block text-xs text-[var(--muted)] mb-1">Provider</label>
          <select id="ai-provider-select" value={provider} onChange={(e) => chooseProvider(e.target.value as AiProviderId)} className="w-full h-10 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm">
            {PROVIDER_IDS.map((id) => <option key={id} value={id}>{AI_PROVIDERS[id].name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ai-model-input" className="block text-xs text-[var(--muted)] mb-1">Model ID</label>
          <input id="ai-model-input" value={model} onChange={(e) => onChange({ provider, model: e.target.value, endpoint })} placeholder="Provider model identifier" className="w-full h-10 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm font-mono" />
        </div>
      </div>

      {provider === 'custom' && (
        <div>
          <label htmlFor="ai-endpoint-input" className="block text-xs text-[var(--muted)] mb-1">OpenAI-compatible API base URL</label>
          <input id="ai-endpoint-input" type="url" value={endpoint} onChange={(e) => onChange({ provider, model, endpoint: e.target.value })} placeholder="https://api.example.com/v1" className="w-full h-10 px-3 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm font-mono" />
        </div>
      )}

      <div>
        <label htmlFor="ai-provider-key" className="block text-xs text-[var(--muted)] mb-1">{config.name} API key</label>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <input id="ai-provider-key" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Paste your API key" className="w-full h-10 pl-3 pr-10 rounded-xl bg-[var(--card-alt)] border border-[var(--border)] text-sm font-mono" />
            <button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey((visible) => !visible)} className="absolute right-1 top-1 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--hover)]">{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
          <button type="button" onClick={saveKey} className="h-10 px-4 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-xs font-medium">Save key</button>
          {connected && <button type="button" onClick={forgetKey} aria-label="Forget API key" title="Forget API key" className="w-10 h-10 rounded-xl border border-[var(--border)] text-[var(--danger)] flex items-center justify-center"><Trash2 size={15} /></button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <p className="flex-1 min-w-[220px]">{config.note} Free tiers, quotas, and models can change; model IDs are editable.</p>
        {config.keyUrl && <a href={config.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--accent)] font-medium whitespace-nowrap">Get {config.name} key <ExternalLink size={13} /></a>}
      </div>
    </div>
  );
}
