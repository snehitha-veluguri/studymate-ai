
import { createClient } from "@/lib/supabase/server";
import type { TopicScore } from "./gap-analysis";

export async function saveTopicPerformance(
  topicScores: TopicScore[]
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before saving performance.");
  }

  if (!topicScores.length) {
    throw new Error("No topic performance data to save.");
  }

  const { data: studentTopics, error: topicError } = await supabase
    .from("topics")
    .select("id, name")
    .eq("user_id", user.id);

  if (topicError) {
    throw new Error(topicError.message);
  }

  const topicMap = new Map(
    (studentTopics ?? []).map((topic) => [
      topic.name.toLowerCase(),
      topic.id,
    ])
  );

  const savedResults = [];

  for (const item of topicScores) {
    if (
      !item.topic.trim() ||
      !Number.isInteger(item.totalQuestions) ||
      !Number.isInteger(item.correctAnswers) ||
      item.totalQuestions <= 0 ||
      item.correctAnswers < 0 ||
      item.correctAnswers > item.totalQuestions
    ) {
      throw new Error("Invalid topic performance data.");
    }

    const topicId = topicMap.get(item.topic.toLowerCase());

    if (!topicId) {
      throw new Error(`Topic not found in database: ${item.topic}`);
    }

    const currentScore = Math.round(
      (item.correctAnswers / item.totalQuestions) * 100
    );

    const level =
      currentScore >= 80
        ? "strong"
        : currentScore >= 50
          ? "medium"
          : "weak";

    const { data: existing, error: existingError } = await supabase
      .from("topic_performance")
      .select("id, score, attempts")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    const previousAttempts = existing?.attempts ?? 0;
    const previousScore = Number(existing?.score ?? 0);

    const averageScore = Math.round(
      (previousScore * previousAttempts + currentScore) /
        (previousAttempts + 1)
    );

    const averageLevel =
      averageScore >= 80
        ? "strong"
        : averageScore >= 50
          ? "medium"
          : "weak";

    const record = {
      user_id: user.id,
      topic_id: topicId,
      score: averageScore,
      level: averageLevel,
      attempts: previousAttempts + 1,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = existing
      ? await supabase
          .from("topic_performance")
          .update(record)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabase
          .from("topic_performance")
          .insert(record)
          .select("*")
          .single();

    if (error) {
      throw new Error(
        `Could not save performance for ${item.topic}: ${error.message}`
      );
    }

    savedResults.push(data);
  }

  return {
    success: true,
    savedCount: savedResults.length,
    performance: savedResults,
  };
}
