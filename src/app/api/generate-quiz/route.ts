import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDiagnosticQuiz } from "@/lib/ai/quiz-generation";
import { saveQuiz } from "@/lib/ai/save-quiz";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to generate a quiz." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const count = Number(body.count ?? 5);

    if (!topic) {
      return NextResponse.json(
        { error: "Please enter a topic." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return NextResponse.json(
        { error: "Question count must be between 1 and 10." },
        { status: 400 }
      );
    }

    const generatedQuiz = await generateDiagnosticQuiz(topic, count);
    const savedQuiz = await saveQuiz(topic, generatedQuiz.questions);

    return NextResponse.json({
      success: true,
      quiz: {
        quizId: savedQuiz.quizId,
        title: generatedQuiz.title,
        questions: savedQuiz.questions,
        sourceCount: generatedQuiz.sourceCount,
      },
    });
  } catch (error) {
    console.error("Generate quiz error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate quiz.",
      },
      { status: 500 }
    );
  }
}