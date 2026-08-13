import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ollamaUrl, model, messages, temperature } = body ?? {};
  if (!ollamaUrl || !model || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const url = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
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
    const data = await upstream.json();
    const content = data?.message?.content ?? '';
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to reach Ollama';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}