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

/**
 * Garantiza que un contenido sea HTML válido para TipTap. Si ya contiene tags
 * de párrafo/br (HTML de TipTap), lo devuelve tal cual; si es texto plano o
 * markdown (con saltos de línea), lo convierte con proseToHtml. Evita guardar
 * contenido "crudo" que TipTap muestre todo de corrido.
 */
export function ensureHtml(content: string): string {
  const trimmed = (content ?? '').trim();
  if (!trimmed) return '';
  if (/<\s*(p|br|div|h[1-6]|ul|ol|li)[\s>]/i.test(trimmed)) return trimmed;
  return proseToHtml(trimmed);
}
