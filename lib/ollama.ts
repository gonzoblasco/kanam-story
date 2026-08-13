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

/** Non-streaming call: returns the full response as a string. */
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
    body: JSON.stringify({ ollamaUrl, model, messages, temperature, stream: false }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json();
  return data.content ?? '';
}

/**
 * Streaming call (SSE). Returns an iterable of text fragments that are
 * accumulated in `onChunk`. Supported by all `ReadableStream` (Node 18+ and
 * modern browsers).
 */
export async function ollamaChatStream(
  {
    ollamaUrl,
    model,
    messages,
    signal,
    temperature = 0.8,
  }: OllamaChatOptions,
  onChunk: (text: string) => void,
): Promise<void> {
  const res = await fetch('/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ollamaUrl, model, messages, temperature, stream: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama request failed (${res.status}): ${text || res.statusText}`);
  }
  if (!res.body) {
    throw new Error('Ollama stream returned no body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE separates events with "\n\n". Each event is "data: {...}".
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        for (const line of eventBlock.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (typeof parsed?.content === 'string') {
              onChunk(parsed.content);
            }
          } catch {
            // invalid event: ignored
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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