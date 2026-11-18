
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL = "gemini-3.5-flash-lite";

export interface RevisionTopic {
  topic: string;
  scorePercentage: number;
  level: "strong" | "medium" | "weak";
  examImportance: "high" | "medium" | "low";
}

export interface RevisionTask {
  topic: string;
  activity: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface RevisionPlan {
  title: string;
  totalStudyMinutes: number;
  tasks: RevisionTask[];
  advice: string;
}

async function generateWithRetry(contents: string) {
  const delays = [3000, 6000, 12000];

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      const isTemporary =
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("high demand") ||
        message.includes("overloaded") ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!isTemporary || attempt === 3) {
        throw error;
      }

      console.warn(
        `[Revision Plan] Gemini temporarily unavailable. Retry ${attempt + 1}/3 in ${delays[attempt] / 1000} seconds.`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delays[attempt])
      );
    }
  }

  throw new Error("Revision plan generation failed after retries.");
}

export async function generateRevisionPlan(
  topics: RevisionTopic[],
  availableMinutes: number
): Promise<RevisionPlan> {
  if (!topics.length) {
    throw new Error("Please provide topic performance data.");
  }

  if (
    !Number.isInteger(availableMinutes) ||
    availableMinutes < 15 ||
    availableMinutes > 1440
  ) {
    throw new Error(
      "Available study time must be between 15 and 1440 minutes."
    );
  }

  for (const topic of topics) {
    if (
      !topic.topic.trim() ||
      !Number.isFinite(topic.scorePercentage) ||
      topic.scorePercentage < 0 ||
      topic.scorePercentage > 100 ||
      !["strong", "medium", "weak"].includes(topic.level) ||
      !["high", "medium", "low"].includes(topic.examImportance)
    ) {
      throw new Error("Invalid revision topic data.");
    }
  }

  const response = await generateWithRetry(`
You are StudyMate AI, a personalized study planner.

Create a practical revision plan for a student.

Available study time: ${availableMinutes} minutes.

Prioritize:
1. Weak topics with high exam importance.
2. Weak topics with medium or low exam importance.
3. Medium topics.
4. Strong topics for short revision.

Rules:
- Use only the supplied topic performance and importance data.
- Total task duration must not exceed available study time.
- Give each task a duration of at least 5 minutes.
- Include practical activities such as revising notes, solving questions, and taking a short test.
- Do not assign unnecessary time to strong topics.
- Give a clear reason for each task.
- Return valid JSON only, without Markdown code fences.

Required structure:
{
  "title": "Personalized Revision Plan",
  "tasks": [
    {
      "topic": "Topic name",
      "activity": "Revise key concepts and solve practice questions.",
      "durationMinutes": 20,
      "priority": "high",
      "reason": "This topic is weak and has high exam importance."
    }
  ],
  "advice": "Short personalized study advice."
}

Topic performance:
${JSON.stringify(topics, null, 2)}
`);

  const responseText = response.text?.trim();

  if (!responseText) {
    throw new Error("AI could not generate a revision plan.");
  }

  let parsed: {
    title?: string;
    tasks?: RevisionTask[];
    advice?: string;
  };

  try {
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid revision plan JSON.");
  }

  if (!Array.isArray(parsed.tasks) || !parsed.tasks.length) {
    throw new Error("Revision plan contains no tasks.");
  }

  let totalStudyMinutes = 0;

  for (const task of parsed.tasks) {
    if (
      typeof task.topic !== "string" ||
      !topics.some((topic) => topic.topic === task.topic) ||
      typeof task.activity !== "string" ||
      !Number.isInteger(task.durationMinutes) ||
      task.durationMinutes < 5 ||
      !["high", "medium", "low"].includes(task.priority) ||
      typeof task.reason !== "string"
    ) {
      throw new Error("Revision plan contains an invalid task.");
    }

    totalStudyMinutes += task.durationMinutes;
  }

  if (totalStudyMinutes > availableMinutes) {
    throw new Error(
      "Generated revision plan exceeds available study time."
    );
  }

  if (typeof parsed.advice !== "string" || !parsed.advice.trim()) {
    throw new Error("Revision plan advice is missing.");
  }

  return {
    title: parsed.title || "Personalized Revision Plan",
    totalStudyMinutes,
    tasks: parsed.tasks,
    advice: parsed.advice,
  };
}
