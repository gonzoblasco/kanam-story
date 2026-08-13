/**
 * Parser de streaming de Ollama.
 *
 * Ollama con `stream: true` devuelve NDJSON línea a línea:
 *   {"message":{"content":"..."},"done":false}
 *   ...
 *   {"message":{"content":"","role":"assistant"},"done":true}
 *
 * La respuesta llega en chunks arbitrarios que pueden cortar una línea a la
 * mitad. Este parser mantiene un buffer interno y devuelve solo los fragmentos
 * de texto (`message.content`) de las líneas completas que va recibiendo.
 *
 * Se expone como función pura y estado interno vía closure para poder testear
 * el comportamiento cross-chunk (un chunk puede contener varias líneas, una
 * línea puede repartirse entre dos chunks, etc.).
 */
export function createOllamaStreamParser() {
  let buffer = '';

  return {
    /**
     * Alimenta el parser con un chunk de texto y devuelve los fragmentos de
     * contenido de las líneas NDJSON completas que se pudieron parsear.
     */
    push(chunk: string): string[] {
      buffer += chunk;
      const contents: string[] = [];
      let newlineIndex: number;

      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        try {
          const obj = JSON.parse(line);
          const content = obj?.message?.content;
          if (typeof content === 'string' && content.length > 0) {
            contents.push(content);
          }
        } catch {
          // Línea inválida o parcial: se descarta. No aborta el stream.
        }
      }

      return contents;
    },
  };
}
