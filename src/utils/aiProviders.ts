export type AiProviderId = 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'custom';

export interface AiProviderConfig {
  id: AiProviderId;
  name: string;
  endpoint: string;
  defaultModel: string;
  keyUrl: string;
  protocol: 'gemini' | 'openai-compatible';
  note: string;
}

// Free-tier model availability, names, and quotas change often. Defaults are
// starting suggestions; users can select any model enabled for their key.
export const AI_PROVIDERS: Record<AiProviderId, AiProviderConfig> = {
  gemini: {
    id: 'gemini', name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey',
    protocol: 'gemini', note: 'Google AI Studio API key. Model and free-tier limits depend on your account and region.',
  },
  groq: {
    id: 'groq', name: 'Groq', endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-20b', keyUrl: 'https://console.groq.com/keys',
    protocol: 'openai-compatible', note: 'Fast inference with a free developer tier subject to rate limits.',
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', keyUrl: 'https://openrouter.ai/keys',
    protocol: 'openai-compatible', note: 'Free model availability and quotas rotate; choose a current :free model.',
  },
  cerebras: {
    id: 'cerebras', name: 'Cerebras', endpoint: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.1-8b', keyUrl: 'https://cloud.cerebras.ai/platform',
    protocol: 'openai-compatible', note: 'OpenAI-compatible inference API. Check your account for currently enabled models and limits.',
  },
  custom: {
    id: 'custom', name: 'Custom OpenAI-compatible', endpoint: '',
    defaultModel: '', keyUrl: '', protocol: 'openai-compatible',
    note: 'Connect another provider that offers an OpenAI-compatible chat completions endpoint.',
  },
};

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  endpoint?: string;
  messages: AiChatTurn[];
  signal?: AbortSignal;
}

export function getAiProvider(id: AiProviderId): AiProviderConfig {
  return AI_PROVIDERS[id] || AI_PROVIDERS.gemini;
}

async function responseError(response: Response): Promise<Error> {
  let detail = '';
  try {
    const body = await response.json() as { error?: { message?: string } | string; message?: string };
    detail = typeof body.error === 'string' ? body.error : body.error?.message || body.message || '';
  } catch { /* Response may not be JSON. */ }
  if (response.status === 401 || response.status === 403) {
    return new Error('The provider rejected this API key. Check that the key is valid and enabled for the selected model.');
  }
  if (response.status === 429) return new Error('Provider rate limit reached. Wait a little or try another model/provider.');
  return new Error(detail || `AI provider request failed (${response.status}).`);
}

export async function sendAiChat(options: AiChatOptions): Promise<string> {
  const { provider, model, apiKey, messages, signal } = options;
  if (!apiKey.trim()) throw new Error('Add an API key in Settings → AI providers to use AI chat.');
  if (!model.trim()) throw new Error('Choose a model in Settings → AI providers.');
  const config = getAiProvider(provider);
  if (config.protocol === 'gemini') {
    const endpoint = (options.endpoint || config.endpoint).replace(/\/$/, '');
    const url = `${endpoint}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const contents = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
    const response = await fetch(url, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } }),
    });
    if (!response.ok) throw await responseError(response);
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!answer) throw new Error('The model returned an empty response. Try a different model.');
    return answer;
  }

  const endpoint = (options.endpoint || config.endpoint).replace(/\/$/, '');
  if (!/^https:\/\//i.test(endpoint)) throw new Error('Provider endpoint must use HTTPS.');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://tmg.app';
    headers['X-Title'] = 'tmg Workspace';
  }
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST', signal, headers,
    body: JSON.stringify({ model, messages: messages.map(({ role, content }) => ({ role, content })), temperature: 0.7 }),
  });
  if (!response.ok) throw await responseError(response);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = data.choices?.[0]?.message?.content;
  const answer = typeof content === 'string' ? content.trim() : content?.map((part) => part.text || '').join('').trim();
  if (!answer) throw new Error('The model returned an empty response. Try a different model.');
  return answer;
}
