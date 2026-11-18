
import { extractText } from "unpdf";
import type { DocumentPage } from "./chunking";

export async function extractPdfPages(
  file: File
): Promise<DocumentPage[]> {
  if (file.type !== "application/pdf") {
    throw new Error("Please upload a valid PDF file.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  const result = await extractText(buffer, {
    mergePages: false,
  });

  const pages: DocumentPage[] = result.text
    .map((text, index) => ({
      pageNumber: index + 1,
      text: text.trim(),
    }))
    .filter((page) => page.text.length > 0);

  if (pages.length === 0) {
    throw new Error(
      "No readable text found. This PDF may contain scanned images."
    );
  }

  return pages;
}
