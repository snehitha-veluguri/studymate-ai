
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "./retrieval";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Updated Gemini model
const MODEL = "gemini-3.5-flash-lite";

// Retry delays: 3, 6 and 12 seconds
const RETRY_DELAYS = [3000, 6000, 12000];

export interface MappedTopic {
  topic: string;
  chapter: string | null;
  description: string;
  subtopics: string[];
  source: {
    materialId: string;
    section: string | null;
    pageNumber: number | null;
  };
}

export interface TopicMappingResult {
  title: string;
  topics: MappedTopic[];
  sourceCount: number;
}

// Generate Gemini response with automatic retries.
async function generateWithRetry(prompt: string) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      console.log(
        `[Topic Map] Gemini request started. Attempt ${attempt + 1}/4`
      );

      return await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const isTemporaryError =
        /503|UNAVAILABLE|high demand|temporarily unavailable|overloaded|429|RESOURCE_EXHAUSTED/i.test(
          message
        );

      if (!isTemporaryError || attempt === RETRY_DELAYS.length) {
        console.error("[Topic Map] Gemini generation failed:", message);
        throw error;
      }

      const delay = RETRY_DELAYS[attempt];

      console.log(
        `[Topic Map] Gemini temporarily unavailable. Retrying in ${
          delay / 1000
        } seconds. Attempt ${attempt + 1}/3`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini could not generate the topic map.");
}

export async function generateTopicMapping(): Promise<TopicMappingResult> {
  // 1. Retrieve uploaded study material.
  console.log("[Topic Map] Starting document retrieval...");

  const retrievalStart = Date.now();

  const chunks = await retrieveRelevantChunks(
    "syllabus chapters units topics subtopics and learning objectives",
    10
  );

  console.log(
    `[Topic Map] Retrieval completed in ${
      (Date.now() - retrievalStart) / 1000
    } seconds. Chunks: ${chunks.length}`
  );

  if (chunks.length === 0) {
    throw new Error(
      "No study material found. Please upload your syllabus or notes first."
    );
  }

  // 2. Prepare source content.
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

  // 3. Prepare Gemini prompt.
  const prompt = `
You are StudyMate AI, an educational syllabus organizer.

Create a topic map from the uploaded study material below.

Rules:
- Use ONLY information in the supplied material.
- Identify chapters, main topics, and subtopics.
- Do not invent chapters or topics.
- Write descriptions in simple English.
- Every topic must reference a valid source number.
- Use the source number that best supports each topic.
- Return valid JSON only, without Markdown code fences.

Required JSON structure:
{
  "title": "Syllabus Topic Map",
  "topics": [
    {
      "topic": "Topic name",
      "chapter": "Chapter name or null",
      "description": "Short explanation of the topic.",
      "subtopics": [
        "Subtopic 1",
        "Subtopic 2"
      ],
      "sourceIndex": 1
    }
  ]
}

UPLOADED STUDY MATERIAL:
${context}
`;

  // 4. Generate topic map.
  console.log("[Topic Map] Starting Gemini generation...");

  const geminiStart = Date.now();

  const response = await generateWithRetry(prompt);

  console.log(
    `[Topic Map] Gemini generation completed in ${
      (Date.now() - geminiStart) / 1000
    } seconds`
  );

  // 5. Read Gemini response.
  const responseText = response.text?.trim();

  if (!responseText) {
    throw new Error("Gemini could not generate the topic map.");
  }

  // 6. Parse generated JSON.
  let parsed: {
    title?: string;
    topics?: Array<{
      topic: string;
      chapter: string | null;
      description: string;
      subtopics: string[];
      sourceIndex: number;
    }>;
  };

  try {
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Topic Map] Invalid Gemini response:", responseText);

    throw new Error("Gemini returned invalid topic mapping JSON.");
  }

  if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error("No topics were identified in the study material.");
  }

  // 7. Validate topics and attach source references.
  const topics: MappedTopic[] = parsed.topics.map((topic) => {
    if (
      typeof topic.topic !== "string" ||
      !topic.topic.trim() ||
      typeof topic.description !== "string" ||
      !Array.isArray(topic.subtopics) ||
      !topic.subtopics.every(
        (subtopic) => typeof subtopic === "string"
      ) ||
      !Number.isInteger(topic.sourceIndex) ||
      topic.sourceIndex < 1 ||
      topic.sourceIndex > chunks.length
    ) {
      throw new Error("Generated topic map contains invalid data.");
    }

    const source = chunks[topic.sourceIndex - 1];

    return {
      topic: topic.topic,
      chapter: topic.chapter ?? source.chapter,
      description: topic.description,
      subtopics: topic.subtopics,
      source: {
        materialId: source.material_id,
        section: source.section,
        pageNumber: source.page_number,
      },
    };
  });

  console.log(
    `[Topic Map] Successfully created ${topics.length} topics.`
  );

  // 8. Return final topic map.
  return {
    title: parsed.title || "Syllabus Topic Map",
    topics,
    sourceCount: chunks.length,
  };
}
