import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGapAnalysis } from "@/lib/ai/gap-analysis";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view gap analysis." },
        { status: 401 }
      );
    }

    const { data: performance, error: performanceError } = await supabase
      .from("topic_performance")
      .select("topic_id, score, level, attempts")
      .eq("user_id", user.id);

    if (performanceError) throw performanceError;

    if (!performance?.length) {
      return NextResponse.json(
        {
          error:
            "Complete a diagnostic quiz after generating your topic map first.",
        },
        { status: 400 }
      );
    }

    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, name, exam_importance")
      .eq("user_id", user.id);

    if (topicsError) throw topicsError;

    const topicNames = new Map(
      (topics ?? []).map((topic) => [topic.id, topic.name])
    );

    const topicScores = performance
      .filter((item) => topicNames.has(item.topic_id))
      .map((item) => {
        const score = Math.max(
          0,
          Math.min(100, Number(item.score ?? 0))
        );

        return {
          topic: topicNames.get(item.topic_id) ?? "Unknown topic",
          totalQuestions: 100,
          correctAnswers: Math.round(score),
          scorePercentage: score,
        };
      });

    if (!topicScores.length) {
      return NextResponse.json(
        {
          error:
            "Your quiz results are not linked to mapped topics. Generate a topic map and take a new quiz using one of its topic names.",
        },
        { status: 400 }
      );
    }

    const analysis = await generateGapAnalysis(topicScores);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Gap analysis error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate gap analysis.",
      },
      { status: 500 }
    );
  }
}