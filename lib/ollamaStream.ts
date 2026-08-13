/**
 * Ollama streaming parser.
 *
 * Ollama with `stream: true` returns NDJSON line by line:
 *   {"message":{"content":"..."},"done":false}
 *   ...
 *   {"message":{"content":"","role":"assistant"},"done":true}
 *
 * The response arrives in arbitrary chunks that may split a line in half.
 * This parser keeps an internal buffer and returns only the text fragments
 * (`message.content`) of the complete lines it receives.
 *
 * It is exposed as a pure function with internal state via closure so the
 * cross-chunk behavior can be tested (a chunk may contain several lines, a
 * line may be split across two chunks, etc.).
 */
export function createOllamaStreamParser() {
  let buffer = '';

  return {
    /**
     * Feeds the parser with a text chunk and returns the content fragments
     * of the complete NDJSON lines that could be parsed.
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
