import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { ollamaUrl } = body ?? {};
  if (!ollamaUrl) {
    return NextResponse.json({ error: 'Missing ollamaUrl' }, { status: 400 });
  }

  const url = `${ollamaUrl.replace(/\/$/, '')}/api/tags`;
  try {
    const upstream = await fetch(url, { method: 'GET' });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Ollama error (${upstream.status}): ${text || upstream.statusText}` },
        { status: 502 },
      );
    }
    const data = await upstream.json();
    const models = (data?.models ?? []).map((m: any) => m.name).filter(Boolean);
    return NextResponse.json({ models });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to reach Ollama';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}