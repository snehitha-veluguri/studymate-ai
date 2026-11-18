
import { createClient } from "@/lib/supabase/server";
import { generateQueryEmbedding } from "./embeddings";

export interface RetrievedChunk {
  id: string;
  material_id: string;
  content: string;
  chapter: string | null;
  section: string | null;
  page_number: number | null;
  similarity: number;
}

export async function retrieveRelevantChunks(
  question: string,
  matchCount = 5
): Promise<RetrievedChunk[]> {
  if (!question.trim()) {
    throw new Error("Please provide a question.");
  }

  const supabase = await createClient();

  // Verify the logged-in student.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in to search study materials.");
  }

  // Convert the student's question into a query embedding.
  const queryEmbedding = await generateQueryEmbedding(question);

  // Search for similar document chunks in Supabase.
  const { data, error } = await supabase.rpc(
    "match_document_chunks",
    {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: 0.35,
      match_count: Math.min(Math.max(matchCount, 1), 10),
      filter_user_id: user.id,
    }
  );

  if (error) {
    console.error("Document retrieval failed:", error);
    throw new Error(
      `Could not retrieve study material: ${error.message}`
    );
  }

  return (data ?? []) as RetrievedChunk[];
}
