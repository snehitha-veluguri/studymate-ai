
import { createClient } from "@/lib/supabase/server";
import type { QuizQuestion } from "./quiz-generation";

export async function saveQuiz(
  topic: string,
  questions: QuizQuestion[]
) {
  const supabase = await createClient();

  // Verify logged-in user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before saving a quiz.");
  }

  if (!questions.length) {
    throw new Error("No quiz questions to save.");
  }

  // Fetch mapped topics belonging to this user
  const { data: topics, error: topicError } = await supabase
    .from("topics")
    .select("id, name")
    .eq("user_id", user.id);

  if (topicError) {
    throw new Error(
      `Could not load mapped topics: ${topicError.message}`
    );
  }

  if (!topics || topics.length === 0) {
    throw new Error(
      "No mapped topics found. Generate your Topic Map first."
    );
  }

  // Normalize topic names
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  const searchTopic = normalize(topic);

  // Find exact topic match
  let matchedTopic = topics.find(
    (item) => normalize(item.name) === searchTopic
  );

  // Try prefix match if exact match is unavailable
  if (!matchedTopic) {
    const matches = topics.filter((item) =>
      normalize(item.name).startsWith(searchTopic)
    );

    if (matches.length === 1) {
      matchedTopic = matches[0];
    }
  }

  // Try partial match if prefix match is unavailable
  if (!matchedTopic) {
    const matches = topics.filter((item) =>
      normalize(item.name).includes(searchTopic)
    );

    if (matches.length === 1) {
      matchedTopic = matches[0];
    }
  }

  // Do not save questions without a valid topic
  if (!matchedTopic) {
    throw new Error(
      `Could not uniquely match "${topic}" to a mapped topic. Please enter the exact topic name from your Topic Map.`
    );
  }

  console.log("[Diagnostic Quiz] Matched topic:", matchedTopic.name);
  console.log("[Diagnostic Quiz] Topic ID:", matchedTopic.id);

  // Generate quiz ID
  const quizId = crypto.randomUUID();

  // Prepare question records
  const records = questions.map((question) => ({
    user_id: user.id,
    quiz_id: quizId,
    topic_id: matchedTopic.id,
    question_text: question.question,
    options: question.options,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    difficulty: "medium",
  }));

  console.log(
    "[Diagnostic Quiz] Records before insert:",
    records.length
  );

  console.log(
    "[Diagnostic Quiz] First record topic ID:",
    records[0]?.topic_id
  );

  // Save questions to Supabase
  const { data, error } = await supabase
    .from("questions")
    .insert(records)
    .select("id, quiz_id, topic_id, question_text");

  if (error) {
    console.error("[Diagnostic Quiz] Insert error:", error);

    throw new Error(
      `Could not save quiz questions: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Quiz questions were not returned after saving."
    );
  }

  // Log the actual saved topic IDs
  console.log(
    "[Diagnostic Quiz] Saved question topic IDs:",
    data.map((question) => question.topic_id)
  );

  // Return saved quiz
  return {
    quizId,
    title: `Diagnostic Quiz: ${matchedTopic.name}`,
    questions: data.map((question) => ({
      id: question.id,
      question: question.question_text,
      options: questions.find(
        (item) => item.question === question.question_text
      )?.options ?? [],
      difficulty: "medium",
    })),
    questionCount: data.length,
  };
}
