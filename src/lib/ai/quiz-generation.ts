
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "./retrieval";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Use the Gemini model that worked successfully for Topic Mapping.
const MODEL = "gemini-3.5-flash-lite";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  chapter: string | null;
  section: string | null;
  pageNumber: number | null;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
  sourceCount: number;
}

// Retry temporary Gemini availability and rate-limit errors.
async function generateWithRetry(prompt: string) {
  const delays = [3000, 6000, 12000];

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(
        `[Diagnostic Quiz] Gemini request started. Attempt ${attempt}/4`
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

      console.log("[Diagnostic Quiz] Gemini generation successful.");

      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;

      const isTemporaryError =
        status === 503 ||
        status === 429 ||
        message.includes("UNAVAILABLE") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.toLowerCase().includes("high demand") ||
        message.toLowerCase().includes("overloaded");

      console.error(
        `[Diagnostic Quiz] Attempt ${attempt} failed:`,
        message
      );

      if (!isTemporaryError || attempt === 4) {
        throw error;
      }

      const delay = delays[attempt - 1];

      console.log(
        `[Diagnostic Quiz] Retrying in ${delay / 1000} seconds...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unable to generate the quiz. Please try again.");
}

export async function generateDiagnosticQuiz(
  topic: string,
  questionCount = 5
): Promise<GeneratedQuiz> {
  if (!topic.trim()) {
    throw new Error("Please provide a quiz topic.");
  }

  if (
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 10
  ) {
    throw new Error("Question count must be between 1 and 10.");
  }

  // 1. Retrieve relevant study material.
  console.log("[Diagnostic Quiz] Starting document retrieval...");

  const chunks = await retrieveRelevantChunks(topic, 10);

  console.log(
    `[Diagnostic Quiz] Retrieved ${chunks.length} relevant chunks.`
  );

  if (chunks.length === 0) {
    throw new Error(
      "No relevant study material found. Please upload your notes first."
    );
  }

  // 2. Prepare source context.
  const context = chunks
    .map(
      (chunk, index) => `
SOURCE ${index + 1}
Chapter: ${chunk.chapter ?? "Not specified"}
Section: ${chunk.section ?? "Not specified"}
Page: ${chunk.page_number ?? "Not specified"}
Content: ${chunk.content}
`
    )
    .join("\n");

  // 3. Prepare a subject-independent prompt.
  const prompt = `
You are StudyMate AI, an expert tutor and diagnostic assessment creator.

Generate exactly ${questionCount} multiple-choice diagnostic questions
about this topic: ${topic}.

IMPORTANT:
The uploaded study material determines the subject and academic level.
Do not assume the subject is Science, Java, or any other subject.
Identify the subject from the supplied content.

Use ONLY the uploaded study material below.

Rules:
- Every question must be based on the supplied content.
- Generate exactly ${questionCount} questions.
- Provide exactly four options per question.
- Provide exactly one correct answer.
- The correct answer must exactly match one of the four options.
- Use simple, clear English.
- Include a meaningful explanation based on the material.
- Include the source chapter, section and page number when available.
- If chapter or section information is unavailable, use null.
- If page information is unavailable, use null.
- Do not invent facts or citations.
- Include a mix of conceptual and application-based questions.
- Return valid JSON only, without Markdown code fences.

Required JSON structure:
{
  "title": "Diagnostic Quiz: Topic",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Exact correct option",
      "explanation": "Explanation based on the study material",
      "chapter": null,
      "section": null,
      "pageNumber": null
    }
  ]
}

UPLOADED STUDY MATERIAL:
${context}
`;

  // 4. Generate questions with retry handling.
  const response = await generateWithRetry(prompt);

  const responseText = response.text?.trim();

  if (!responseText) {
    throw new Error("Gemini did not generate quiz questions.");
  }

  // 5. Parse and validate the generated JSON.
  let parsed: {
    title?: string;
    questions?: QuizQuestion[];
  };

  try {
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Diagnostic Quiz] Invalid JSON:", responseText);
    throw new Error("Gemini returned invalid quiz JSON.");
  }

  if (
    !Array.isArray(parsed.questions) ||
    parsed.questions.length !== questionCount
  ) {
    throw new Error("Generated quiz has an invalid question count.");
  }

  for (const question of parsed.questions) {
    if (
      !question.question ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      typeof question.correctAnswer !== "string" ||
      !question.options.includes(question.correctAnswer) ||
      !question.explanation
    ) {
      throw new Error("Generated quiz contains an invalid question.");
    }
  }

  console.log(
    `[Diagnostic Quiz] Successfully generated ${parsed.questions.length} questions.`
  );

  return {
    title: parsed.title || `Diagnostic Quiz: ${topic}`,
    questions: parsed.questions,
    sourceCount: chunks.length,
  };
}
