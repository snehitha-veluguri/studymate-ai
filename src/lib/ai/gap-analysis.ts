
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MODEL = "gemini-3.5-flash-lite";

export interface TopicScore {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
}

export interface TopicGap {
  topic: string;
  scorePercentage: number;
  level: "strong" | "medium" | "weak";
  reason: string;
  recommendation: string;
}

export interface GapAnalysisResult {
  overallPercentage: number;
  strongTopics: TopicGap[];
  mediumTopics: TopicGap[];
  weakTopics: TopicGap[];
  summary: string;
}

async function generateWithRetry(prompt: string) {
  const delays = [3000, 6000, 12000];

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      console.log(
        `[Gap Analysis] Gemini request started. Attempt ${attempt + 1}/4`
      );

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

      console.log("[Gap Analysis] Gemini generation successful.");

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
        console.error("[Gap Analysis] Gemini request failed:", error);
        throw error;
      }

      const delay = delays[attempt];

      console.warn(
        `[Gap Analysis] Retrying in ${delay / 1000} seconds...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gap analysis failed after multiple attempts.");
}

function getLevel(
  percentage: number
): "strong" | "medium" | "weak" {
  if (percentage >= 80) return "strong";
  if (percentage >= 50) return "medium";
  return "weak";
}

function normalizeTopic(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function generateGapAnalysis(
  topicScores: TopicScore[]
): Promise<GapAnalysisResult> {
  if (!topicScores.length) {
    throw new Error("No topic performance data available.");
  }

  for (const score of topicScores) {
    if (
      !score.topic.trim() ||
      !Number.isInteger(score.totalQuestions) ||
      !Number.isInteger(score.correctAnswers) ||
      score.totalQuestions <= 0 ||
      score.correctAnswers < 0 ||
      score.correctAnswers > score.totalQuestions
    ) {
      throw new Error("Invalid topic performance data.");
    }
  }

  const normalizedScores = topicScores.map((score) => ({
    ...score,
    scorePercentage: Math.round(
      (score.correctAnswers / score.totalQuestions) * 100
    ),
  }));

  const overallCorrect = normalizedScores.reduce(
    (total, score) => total + score.correctAnswers,
    0
  );

  const overallQuestions = normalizedScores.reduce(
    (total, score) => total + score.totalQuestions,
    0
  );

  const overallPercentage = Math.round(
    (overallCorrect / overallQuestions) * 100
  );

  const prompt = `
You are StudyMate AI, an educational performance analyst.

Analyze the student's topic-wise quiz performance.

For every topic, provide:
1. A short explanation of the student's performance.
2. One practical revision recommendation.

IMPORTANT:
- Return exactly one result for every input topic.
- Copy every topic name EXACTLY as provided.
- Do not change topic names.
- Do not calculate or modify scores.
- Return valid JSON only.
- Do not use Markdown code fences.

Required JSON structure:
{
  "topics": [
    {
      "topic": "Exact input topic name",
      "reason": "Explanation of the student's performance.",
      "recommendation": "Practical revision recommendation."
    }
  ],
  "summary": "Overall performance summary."
}

Student performance:
${JSON.stringify(normalizedScores, null, 2)}
`;

  const response = await generateWithRetry(prompt);
  const responseText = response.text?.trim();

  if (!responseText) {
    throw new Error("AI could not generate the gap analysis.");
  }

  let parsed: {
    topics?: {
      topic?: string;
      reason?: string;
      recommendation?: string;
    }[];
    summary?: string;
  };

  try {
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Gap Analysis] Invalid Gemini response:", responseText);
    throw new Error("AI returned invalid gap analysis JSON.");
  }

  if (!Array.isArray(parsed.topics)) {
    throw new Error("AI did not return a valid topic analysis.");
  }

  console.log(
    "[Gap Analysis] AI returned topics:",
    parsed.topics.map((item) => item.topic)
  );

  const analyzedTopics: TopicGap[] = normalizedScores.map(
    (score, index) => {
      const expectedName = normalizeTopic(score.topic);

      // First try an exact topic-name match.
      let aiTopic = parsed.topics?.find(
        (item) =>
          typeof item.topic === "string" &&
          normalizeTopic(item.topic) === expectedName
      );

      // If Gemini changes a topic name, use its corresponding
      // position when the response contains the expected count.
      if (!aiTopic && parsed.topics?.length === normalizedScores.length) {
        aiTopic = parsed.topics[index];
      }

      const level = getLevel(score.scorePercentage);

      let reason = aiTopic?.reason?.trim();
      let recommendation = aiTopic?.recommendation?.trim();

      if (!reason) {
        reason = `You answered ${score.correctAnswers} out of ${score.totalQuestions} questions correctly, scoring ${score.scorePercentage}%.`;
      }

      if (!recommendation) {
        recommendation =
          level === "strong"
            ? "Continue practising questions to maintain your understanding."
            : level === "medium"
              ? "Revise the important concepts and practise more questions."
              : "Start with the basic concepts, review your study material, and practise simple questions.";
      }

      return {
        topic: score.topic,
        scorePercentage: score.scorePercentage,
        level,
        reason,
        recommendation,
      };
    }
  );

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : `Your overall performance is ${overallPercentage}%. Review your weak topics and continue practising regularly.`;

  const result: GapAnalysisResult = {
    overallPercentage,
    strongTopics: analyzedTopics.filter(
      (topic) => topic.level === "strong"
    ),
    mediumTopics: analyzedTopics.filter(
      (topic) => topic.level === "medium"
    ),
    weakTopics: analyzedTopics.filter(
      (topic) => topic.level === "weak"
    ),
    summary,
  };

  console.log("[Gap Analysis] Analysis completed successfully.");
  console.log("[Gap Analysis] Overall score:", overallPercentage);
  console.log("[Gap Analysis] Strong topics:", result.strongTopics.length);
  console.log("[Gap Analysis] Medium topics:", result.mediumTopics.length);
  console.log("[Gap Analysis] Weak topics:", result.weakTopics.length);

  return result;
}
