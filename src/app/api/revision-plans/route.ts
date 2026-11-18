
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

    const { data: plans, error: planError } = await supabase
      .from("revision_plans")
      .select("id, title, available_minutes, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (planError) {
      throw new Error(planError.message);
    }

    const planIds = (plans ?? []).map((plan) => plan.id);

    const { data: tasks, error: taskError } = planIds.length
      ? await supabase
          .from("revision_tasks")
          .select(
            "id, plan_id, topic_id, task_title, duration_minutes, completed, scheduled_date"
          )
          .eq("user_id", user.id)
          .in("plan_id", planIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (taskError) {
      throw new Error(taskError.message);
    }

    const result = (plans ?? []).map((plan) => ({
      ...plan,
      tasks: (tasks ?? []).filter(
        (task) => task.plan_id === plan.id
      ),
    }));

    return NextResponse.json({
      success: true,
      plans: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Revision plan retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not retrieve revision plans.",
      },
      { status: 500 }
    );
  }
}
