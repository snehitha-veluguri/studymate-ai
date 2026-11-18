
import { createClient } from "@/lib/supabase/server";
import type { MappedTopic } from "./topic-mapping";

export async function saveTopicMap(topics: MappedTopic[]) {
  if (!topics.length) {
    throw new Error("No topics available to save.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before saving topics.");
  }

  // Remove previously saved topics for this student.
  const { error: deleteError } = await supabase
    .from("topics")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(
      `Could not clear previous topics: ${deleteError.message}`
    );
  }

  // Prepare topic records for Supabase.
  const records = topics.map((topic) => ({
    user_id: user.id,
    name: topic.topic,
    chapter: topic.chapter,
    description: topic.description,
    exam_importance: "medium",
  }));

  const { data, error } = await supabase
    .from("topics")
    .insert(records)
    .select("id, name, chapter, description, exam_importance");

  if (error) {
    throw new Error(`Could not save topics: ${error.message}`);
  }

  return {
    success: true,
    savedCount: data.length,
    topics: data,
  };
}
