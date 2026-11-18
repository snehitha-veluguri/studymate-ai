
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

/**
 * Converts text into a 768-dimensional vector embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Failed to generate a valid 768-dimensional embedding.");
  }

  return embedding;
}

/**
 * Converts a student question into a search vector.
 */
export async function generateQueryEmbedding(
  question: string
): Promise<number[]> {
  if (!question || !question.trim()) {
    throw new Error("Cannot generate embedding for an empty question.");
  }

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: question,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_QUERY",
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Failed to generate a valid 768-dimensional query embedding.");
  }

  return embedding;
}
