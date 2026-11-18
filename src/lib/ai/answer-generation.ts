
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "./retrieval";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL = "gemini-3.5-flash-lite";

export interface SourceCitation {
  materialId: string;
  chapter: string | null;
  section: string | null;
  pageNumber: number | null;
  similarity: number;
  excerpt: string;
}

export interface GroundedAnswer {
  answer: string;
  sources: SourceCitation[];
  foundInMaterials: boolean;
}

// Retry temporary Gemini errors
async function generateWithRetry(prompt: string) {
  const delays = [3000, 6000, 12000];

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      console.log(
        `[AI Assistant] Gemini request started. Attempt ${attempt + 1}/4`
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

      console.log("[AI Assistant] Gemini generation successful.");

      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const retryable =
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("high demand") ||
        message.includes("overloaded") ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!retryable || attempt === 3) {
        console.error("[AI Assistant] Gemini request failed:", error);
        throw error;
      }

      const delay = delays[attempt];

      console.warn(
        `[AI Assistant] Temporary Gemini error. Retrying in ${delay / 1000} seconds...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("AI answer generation failed after multiple attempts.");
}

export async function generateGroundedAnswer(
  question: string
): Promise<GroundedAnswer> {
  if (!question.trim()) {
    throw new Error("Please enter a question.");
  }

  // Step 1: Retrieve relevant content from uploaded documents.
  console.log("[AI Assistant] Starting document retrieval...");

  const chunks = await retrieveRelevantChunks(question, 5);

  console.log(
    `[AI Assistant] Retrieved ${chunks.length} relevant chunks.`
  );

  if (chunks.length === 0) {
    return {
      answer:
        "I could not find relevant information in your uploaded study materials. Please upload the related notes or syllabus.",
      sources: [],
      foundInMaterials: false,
    };
  }

  // Step 2: Prepare retrieved content as context.
  const context = chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}]
Chapter: ${chunk.chapter ?? "Not specified"}
Section: ${chunk.section ?? "Not specified"}
Page: ${chunk.page_number ?? "Not specified"}
Content: ${chunk.content}`
    )
    .join("\n\n");

  // Step 3: Generate an answer using uploaded material only.
  const prompt = `
You are StudyMate AI, an intelligent educational assistant.

Answer the student's question using ONLY the uploaded study material provided below.

Rules:
1. Do not use outside knowledge.
2. Do not invent facts or examples.
3. If the material does not contain enough information, clearly say so.
4. Explain in simple, student-friendly English.
5. Organize the answer using short paragraphs or bullet points.
6. Do not invent page numbers or source references.
7. Refer to the supplied sources where relevant.
8. Adapt your explanation to the subject of the uploaded material.

UPLOADED STUDY MATERIAL:

${context}

STUDENT QUESTION:

${question}
`;

  const response = await generateWithRetry(prompt);

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini could not generate an answer.");
  }

  // Step 4: Prepare source citations.
  const sources: SourceCitation[] = chunks.map((chunk) => ({
    materialId: chunk.material_id,
    chapter: chunk.chapter,
    section: chunk.section,
    pageNumber: chunk.page_number,
    similarity: chunk.similarity,
    excerpt: chunk.content.slice(0, 250),
  }));

  console.log("[AI Assistant] Answer generated successfully.");

  return {
    answer,
    sources,
    foundInMaterials: true,
  };
}
