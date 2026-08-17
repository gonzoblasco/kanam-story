import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout, ollamaChat, ollamaChatStream, checkOllama } from '@/lib/ollama';

const BASE = { ollamaUrl: 'http://localhost:11434', model: 'test-model' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A fetch stub that never resolves on its own but rejects with an AbortError
 * when the passed AbortSignal aborts - matching the real `fetch` behavior that
 * the timeout/manual-abort relies on.
 */
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
      });
    });
  });
}

describe('withTimeout', () => {
  it('returns a non-aborted signal when no external signal is given', () => {
    const signal = withTimeout(undefined, 1000);
    expect(signal.aborted).toBe(false);
  });

  it('aborts when the timeout elapses', async () => {
    const signal = withTimeout(undefined, 5);
    await new Promise((r) => setTimeout(r, 30));
    expect(signal.aborted).toBe(true);
  });

  it('aborts when the external signal aborts', () => {
    const controller = new AbortController();
    const signal = withTimeout(controller.signal, 10_000);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });
});

describe('ollamaChat', () => {
  it('aborts with AbortError when the request exceeds the timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    await expect(
      ollamaChat({ ...BASE, messages: [], timeoutMs: 5 }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('passes through the external signal so a manual abort still works', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', hangingFetch());
    const p = ollamaChat({ ...BASE, messages: [], signal: controller.signal, timeoutMs: 10_000 });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('ollamaChatStream', () => {
  it('aborts with AbortError on timeout while streaming', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    await expect(
      ollamaChatStream({ ...BASE, messages: [], timeoutMs: 5 }, () => {}),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('checkOllama', () => {
  it('returns a failure without hanging when Ollama is unresponsive', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const result = await checkOllama(
      {
        id: 'singleton',
        ollamaUrl: BASE.ollamaUrl,
        ollamaModel: 'test',
        theme: 'dark',
        sidebarCollapsed: false,
        rightPanelCollapsed: false,
      },
      5,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/abort/i);
  });
});
