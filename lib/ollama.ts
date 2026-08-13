import type { Settings } from '@/types';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  ollamaUrl: string;
  model: string;
  messages: OllamaMessage[];
  signal?: AbortSignal;
  temperature?: number;
}

export async function ollamaChat({
  ollamaUrl,
  model,
  messages,
  signal,
  temperature = 0.8,
}: OllamaChatOptions): Promise<string> {
  const res = await fetch('/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ollamaUrl, model, messages, temperature }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  return data.content ?? '';
}

export async function checkOllama(settings: Settings): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    const res = await fetch('/api/ollama/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ollamaUrl: settings.ollamaUrl }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, models: data.models ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}