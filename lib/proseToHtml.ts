/**
 * Convierte texto plano con saltos de línea en HTML estructurado para TipTap.
 * Doble salto de línea separa párrafos; salto simple dentro de un párrafo se
 * conserva como salto de línea HTML.
 */
export function proseToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const escaped = paragraph
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      return `<p>${escaped}</p>`;
    })
    .join('');
}
