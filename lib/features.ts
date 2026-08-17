/**
 * Feature flags de Kanam Story.
 *
 * El co-writer (el chat con manos, el corazón del producto) es una feature
 * **de pago**: la versión open source lo tiene deshabilitado, y los planes
 * SaaS (BYOK y premium) lo habilitan. Esto es lo que diferencia los públicos.
 *
 * Flag de entorno: `NEXT_PUBLIC_ENABLE_COWRITER`
 * - `true`  → co-writer habilitado (SaaS: BYOK 5 USD / premium con LLM)
 * - `false` / ausente → co-writer deshabilitado (open source, default)
 *
 * El open source conserva todo el producto de escritura (editor, Story Bible,
 * outline, export, PWA) pero sin el chat con manos.
 */

/** ¿Está habilitado el co-writer (chat con manos)? Default: NO (open source). */
export const ENABLE_COWRITER: boolean =
  process.env.NEXT_PUBLIC_ENABLE_COWRITER === 'true';

/** ¿Está habilitado el sync a la nube? (futuro SaaS; hoy siempre false). */
export const ENABLE_CLOUD_SYNC: boolean =
  process.env.NEXT_PUBLIC_ENABLE_CLOUD_SYNC === 'true';
