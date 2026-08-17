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
  /** Max time to wait for the whole request before aborting (ms). Default 120s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Combines an external `signal` (manual abort) with an internal timeout into a
 * single AbortSignal. If no external signal is given, just returns a timeout
 * signal. Falls back to manual wiring when `AbortSignal.any` is unavailable.
 */
export function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, timeoutSignal]);
  }
  // Fallback for environments without AbortSignal.any: abort the combined
  // signal when either the external signal or the timeout fires.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  timeoutSignal.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

/** Non-streaming call: returns the full response as a string. */
export async function ollamaChat({
  ollamaUrl,
  model,
  messages,
  signal,
  temperature = 0.8,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: OllamaChatOptions): Promise<string> {
  const res = await fetch('/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ollamaUrl, model, messages, temperature, stream: false }),
    signal: withTimeout(signal, timeoutMs),
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
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: OllamaChatOptions,
  onChunk: (text: string) => void,
): Promise<void> {
  const res = await fetch('/api/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ollamaUrl, model, messages, temperature, stream: true }),
    signal: withTimeout(signal, timeoutMs),
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

const HEALTH_CHECK_TIMEOUT_MS = 15_000;

export async function checkOllama(
  settings: Settings,
  timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS,
): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    // Health check: short timeout so the settings modal never hangs waiting on
    // a dead Ollama.
    const res = await fetch('/api/ollama/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ollamaUrl: settings.ollamaUrl }),
      signal: withTimeout(undefined, timeoutMs),
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