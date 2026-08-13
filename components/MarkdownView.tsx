import type { ReactNode } from 'react';
import React from 'react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineFormat(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return out;
}

interface Block {
  kind: 'h' | 'ul' | 'ol' | 'quote' | 'code' | 'p';
  level?: number;
  items?: string[];
  text?: string;
  lang?: string;
}

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ kind: 'code', lang, text: buf.join('\n') });
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', text: buf.join('\n') });
      continue;
    }
    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      const items: string[] = [ul[1]];
      i++;
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      const items: string[] = [ol[1]];
      i++;
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: buf.join(' ') });
  }
  return blocks;
}

function renderBlocks(blocks: Block[]): ReactNode[] {
  return blocks.map((b, idx) => {
    if (b.kind === 'h') {
      const level = Math.min(Math.max(b.level ?? 2, 1), 6);
      const tag = `h${level}`;
      return React.createElement(tag, {
        key: idx,
        className: 'md-heading',
        dangerouslySetInnerHTML: { __html: inlineFormat(b.text || '') },
      });
    }
    if (b.kind === 'ul') {
      return (
        <ul key={idx} className="md-list">
          {(b.items || []).map((it, k) => (
            <li
              key={k}
              dangerouslySetInnerHTML={{ __html: inlineFormat(it) }}
            />
          ))}
        </ul>
      );
    }
    if (b.kind === 'ol') {
      return (
        <ol key={idx} className="md-list">
          {(b.items || []).map((it, k) => (
            <li
              key={k}
              dangerouslySetInnerHTML={{ __html: inlineFormat(it) }}
            />
          ))}
        </ol>
      );
    }
    if (b.kind === 'quote') {
      return (
        <blockquote
          key={idx}
          className="md-quote"
          dangerouslySetInnerHTML={{ __html: inlineFormat(b.text || '') }}
        />
      );
    }
    if (b.kind === 'code') {
      return (
        <pre key={idx} className="md-code">
          <code>{b.text}</code>
        </pre>
      );
    }
    return (
      <p
        key={idx}
        className="md-p"
        dangerouslySetInnerHTML={{ __html: inlineFormat(b.text || '') }}
      />
    );
  });
}

export default function MarkdownView({ source }: { source: string }) {
  if (!source.trim()) {
    return <div className="text-muted small">Sin contenido.</div>;
  }
  return <div className="md-view">{renderBlocks(parse(source))}</div>;
}