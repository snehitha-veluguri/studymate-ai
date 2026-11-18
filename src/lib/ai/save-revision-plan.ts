
import { createClient } from "@/lib/supabase/server";
import type { RevisionPlan } from "./revision-plan";

export async function saveRevisionPlan(
  plan: RevisionPlan,
  availableMinutes: number
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before saving your plan.");
  }

  if (!plan.tasks.length) {
    throw new Error("Cannot save a revision plan without tasks.");
  }

  const { data: savedPlan, error: planError } = await supabase
    .from("revision_plans")
    .insert({
      user_id: user.id,
      title: plan.title,
      available_minutes: availableMinutes,
      status: "active",
    })
    .select("id, title, available_minutes, status")
    .single();

  if (planError || !savedPlan) {
    throw new Error(
      `Could not save revision plan: ${planError?.message}`
    );
  }

  try {
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

    const taskRecords = plan.tasks.map((task) => ({
      user_id: user.id,
      plan_id: savedPlan.id,
      topic_id: topicMap.get(task.topic.toLowerCase()) ?? null,
      task_title: `${task.activity} Reason: ${task.reason}`,
      duration_minutes: task.durationMinutes,
      completed: false,
      scheduled_date: null,
    }));

    const { data: savedTasks, error: taskError } = await supabase
      .from("revision_tasks")
      .insert(taskRecords)
      .select("*");

    if (taskError) {
      throw new Error(taskError.message);
    }

    return {
      success: true,
      plan: savedPlan,
      tasks: savedTasks,
      taskCount: savedTasks.length,
    };
  } catch (error) {
    await supabase
      .from("revision_plans")
      .delete()
      .eq("id", savedPlan.id)
      .eq("user_id", user.id);

    throw error;
  }
}
