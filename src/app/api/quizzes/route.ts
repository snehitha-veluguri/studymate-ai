
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

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, topic_id, question_text, options, difficulty, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const quizGroups = new Map<string, typeof data>();

    for (const question of data) {
      const quizId = question.quiz_id ?? question.id;
      const existing = quizGroups.get(quizId) ?? [];
      existing.push(question);
      quizGroups.set(quizId, existing);
    }

    const quizzes = Array.from(quizGroups.entries()).map(
      ([quizId, questions]) => ({
        quizId,
        questionCount: questions.length,
        createdAt: questions[0]?.created_at,
        questions: questions.map((question) => ({
          id: question.id,
          topicId: question.topic_id,
          question: question.question_text,
          options: question.options,
          difficulty: question.difficulty,
        })),
      })
    );

    return NextResponse.json({
      success: true,
      quizzes,
      count: quizzes.length,
    });
  } catch (error) {
    console.error("Quiz retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not retrieve quizzes.",
      },
      { status: 500 }
    );
  }
}
