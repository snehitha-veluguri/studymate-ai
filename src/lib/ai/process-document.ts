
import { createClient } from "@/lib/supabase/server";
import { extractPdfPages } from "./pdf-extractor";
import { createChunks } from "./chunking";
import { generateEmbedding } from "./embeddings";

interface ProcessDocumentInput {
  file: File;
  materialId: string;
  chapter?: string;
  section?: string;
}

export async function processDocument({
  file,
  materialId,
  chapter,
  section,
}: ProcessDocumentInput) {
  const supabase = await createClient();

  // Verify the logged-in student.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before processing documents.");
  }

  // Confirm that this material belongs to the student.
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("id")
    .eq("id", materialId)
    .eq("user_id", user.id)
    .single();

  if (materialError || !material) {
    throw new Error("Material not found or access denied.");
  }

  // Extract PDF text page by page.
  const pages = await extractPdfPages(file);

  // Split extracted text into overlapping chunks.
  const chunks = createChunks(pages);

  if (chunks.length === 0) {
    throw new Error("No text chunks were created from this PDF.");
  }

  // Generate embeddings and save chunks.
  const records = [];

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);

    records.push({
      user_id: user.id,
      material_id: materialId,
      content: chunk.content,
      chapter: chapter ?? null,
      section: section ?? null,
      page_number: chunk.pageNumber,
      chunk_index: chunk.chunkIndex,
      embedding: `[${embedding.join(",")}]`,
    });
  }

  const { error: insertError } = await supabase
    .from("document_chunks")
    .insert(records);

  if (insertError) {
    throw new Error(`Failed to save document chunks: ${insertError.message}`);
  }

  return {
    success: true,
    pageCount: pages.length,
    chunkCount: chunks.length,
    message: "Document processed and saved successfully.",
  };
}
