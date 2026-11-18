
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const [attemptsResult, performanceResult] = await Promise.all([
      supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false }),

      supabase
        .from("topic_performance")
        .select("id, topic_id, score, level, attempts, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    if (attemptsResult.error) {
      throw new Error(attemptsResult.error.message);
    }

    if (performanceResult.error) {
      throw new Error(performanceResult.error.message);
    }

    const topicIds = [
      ...new Set(
        (performanceResult.data ?? []).map((item) => item.topic_id)
      ),
    ];

    const { data: topics, error: topicError } = topicIds.length
      ? await supabase
          .from("topics")
          .select("id, name, chapter")
          .eq("user_id", user.id)
          .in("id", topicIds)
      : { data: [], error: null };

    if (topicError) {
      throw new Error(topicError.message);
    }

    const topicMap = new Map(
      (topics ?? []).map((topic) => [topic.id, topic])
    );

    const performance = (performanceResult.data ?? []).map((item) => ({
      ...item,
      topic: topicMap.get(item.topic_id)?.name ?? "Unknown topic",
      chapter: topicMap.get(item.topic_id)?.chapter ?? null,
    }));

    const attempts = attemptsResult.data ?? [];

    const averageScore = attempts.length
      ? Math.round(
          attempts.reduce(
            (total, item) => total + Number(item.score ?? 0),
            0
          ) / attempts.length
        )
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalAttempts: attempts.length,
        averageScore,
        totalTopicsTracked: performance.length,
      },
      attempts,
      performance,
    });
  } catch (error) {
    console.error("Progress retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not retrieve progress.",
      },
      { status: 500 }
    );
  }
}
