import { NextRequest, NextResponse } from 'next/server';
import { createOllamaStreamParser } from '@/lib/ollamaStream';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ollamaUrl, model, messages, temperature, stream } = body ?? {};
  if (!ollamaUrl || !model || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const url = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
  const wantStream = stream === true;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: wantStream,
        options: { temperature: typeof temperature === 'number' ? temperature : 0.8 },
      }),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Ollama error (${upstream.status}): ${text || upstream.statusText}` },
        { status: 502 },
      );
    }

    if (!wantStream) {
      const data = await upstream.json();
      const content = data?.message?.content ?? '';
      return NextResponse.json({ content });
    }

    // Streaming: reenviar como SSE (event stream) los fragmentos de texto.
    const upstreamBody = upstream.body;
    if (!upstreamBody) {
      return NextResponse.json({ error: 'Ollama returned no body for streaming' }, { status: 502 });
    }

    const reader = upstreamBody.getReader();
    const parser = createOllamaStreamParser();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = new TextDecoder().decode(value, { stream: true });
            for (const content of parser.push(text)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to reach Ollama';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}