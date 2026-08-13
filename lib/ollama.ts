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

/** Llamada no-streaming: devuelve la respuesta completa como string. */
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
 * Llamada streaming (SSE). Devuelve un iterable de fragmentos de texto que se
 * van acumulando en `onChunk`. Soportado por todos los `ReadableStream` (Node 18+
 * y navegadores modernos).
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

      // El SSE separa eventos con "\n\n". Cada evento es "data: {...}".
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
            // evento inválido: se ignora
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