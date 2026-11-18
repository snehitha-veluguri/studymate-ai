
export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

export function createChunks(
  pages: DocumentPage[],
  chunkSize = 1000,
  overlap = 150
): DocumentChunk[] {
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error("Invalid chunk size or overlap.");
  }

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();

    if (!text) continue;

    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Prefer ending at a word boundary.
      if (end < text.length) {
        const boundary = text.lastIndexOf(" ", end);

        if (boundary > start) {
          end = boundary;
        }
      }

      const content = text.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          pageNumber: page.pageNumber,
          chunkIndex,
        });

        chunkIndex++;
      }

      if (end >= text.length) break;

      start = end - overlap;
    }
  }

  return chunks;
}
