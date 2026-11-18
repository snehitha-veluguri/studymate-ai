import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRevisionPlan } from "@/lib/ai/revision-plan";
import { saveRevisionPlan } from "@/lib/ai/save-revision-plan";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to create a revision plan." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const availableMinutes = Number(body.availableMinutes);

    if (
      !Number.isInteger(availableMinutes) ||
      availableMinutes < 15 ||
      availableMinutes > 1440
    ) {
      return NextResponse.json(
        { error: "Available study time must be between 15 and 1440 minutes." },
        { status: 400 }
      );
    }

    const { data: performance, error: performanceError } = await supabase
      .from("topic_performance")
      .select("topic_id, score, level")
      .eq("user_id", user.id);

    if (performanceError) throw performanceError;

    if (!performance?.length) {
      return NextResponse.json(
        { error: "Complete a diagnostic quiz before creating a revision plan." },
        { status: 400 }
      );
    }

    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, name, exam_importance")
      .eq("user_id", user.id);

    if (topicsError) throw topicsError;

    const topicMap = new Map(
      (topics ?? []).map((topic) => [topic.id, topic])
    );

    const revisionTopics = performance
      .filter((item) => topicMap.has(item.topic_id))
      .map((item) => {
        const topic = topicMap.get(item.topic_id)!;
        const score = Math.max(
          0,
          Math.min(100, Number(item.score ?? 0))
        );

        return {
          topic: topic.name,
          scorePercentage: score,
          level: (
  score >= 80 ? "strong" : score >= 50 ? "medium" : "weak"
) as "strong" | "medium" | "weak",
          examImportance: topic.exam_importance ?? "medium",
        };
      });

    if (!revisionTopics.length) {
      return NextResponse.json(
        {
          error:
            "No quiz results are linked to your topic map. Generate a topic map and take a new quiz using one of its topic names.",
        },
        { status: 400 }
      );
    }

    const plan = await generateRevisionPlan(
      revisionTopics,
      availableMinutes
    );

    const savedPlan = await saveRevisionPlan(plan, availableMinutes);

    return NextResponse.json({
      success: true,
      plan,
      savedPlan,
    });
  } catch (error) {
    console.error("Revision plan error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create revision plan.",
      },
      { status: 500 }
    );
  }
}