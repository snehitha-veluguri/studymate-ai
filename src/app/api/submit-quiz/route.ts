import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveQuizAttempt } from "@/lib/ai/save-quiz-attempt";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to submit your quiz." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const quizId =
      typeof body.quizId === "string" ? body.quizId.trim() : "";
    const answers = body.answers;

    if (!quizId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "A quiz ID and answers are required." },
        { status: 400 }
      );
    }

    const validAnswers = answers.every(
      (answer) =>
        answer &&
        typeof answer.questionId === "string" &&
        typeof answer.selectedAnswer === "string"
    );

    if (!validAnswers) {
      return NextResponse.json(
        { error: "One or more submitted answers are invalid." },
        { status: 400 }
      );
    }

    // Correct answers are fetched and checked by the server-side helper.
    const result = await saveQuizAttempt(quizId, answers);

    // Update topic performance if the quiz questions are linked to topics.
    const { data: savedQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("id, topic_id")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id);

    if (questionsError) {
      console.error("Could not load quiz topics:", questionsError);
    } else if (savedQuestions?.length) {
      const attemptId = result.attempt.id;

      const { data: savedAnswers, error: answersError } = await supabase
        .from("student_answers")
        .select("question_id, is_correct")
        .eq("attempt_id", attemptId)
        .eq("user_id", user.id);

      if (answersError) {
        console.error("Could not load submitted answers:", answersError);
      } else {
        const questionTopicMap = new Map(
          savedQuestions.map((question) => [
            question.id,
            question.topic_id,
          ])
        );

        const topicTotals = new Map<
          string,
          { total: number; correct: number }
        >();

        for (const answer of savedAnswers ?? []) {
          const topicId = questionTopicMap.get(answer.question_id);

          if (!topicId) continue;

          const current = topicTotals.get(topicId) ?? {
            total: 0,
            correct: 0,
          };

          current.total += 1;
          if (answer.is_correct) current.correct += 1;

          topicTotals.set(topicId, current);
        }

        for (const [topicId, totals] of topicTotals) {
          const score = Math.round(
            (totals.correct / totals.total) * 100
          );

          const level =
            score >= 80 ? "strong" : score >= 50 ? "medium" : "weak";

          const { data: existing, error: lookupError } = await supabase
            .from("topic_performance")
            .select("id, score, attempts")
            .eq("user_id", user.id)
            .eq("topic_id", topicId)
            .maybeSingle();

          if (lookupError) {
            console.error("Topic performance lookup error:", lookupError);
            continue;
          }

          const previousAttempts = Number(existing?.attempts ?? 0);
          const previousScore = Number(existing?.score ?? 0);
          const newAttempts = previousAttempts + 1;
          const averageScore =
            (previousScore * previousAttempts + score) / newAttempts;

          const performanceData = {
            score: Math.round(averageScore),
            level:
              averageScore >= 80
                ? "strong"
                : averageScore >= 50
                  ? "medium"
                  : "weak",
            attempts: newAttempts,
            updated_at: new Date().toISOString(),
          };

          const saveResult = existing
            ? await supabase
                .from("topic_performance")
                .update(performanceData)
                .eq("id", existing.id)
                .eq("user_id", user.id)
            : await supabase.from("topic_performance").insert({
                user_id: user.id,
                topic_id: topicId,
                ...performanceData,
              });

          if (saveResult.error) {
            console.error(
              "Topic performance save error:",
              saveResult.error
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      attempt: result.attempt,
      evaluation: result.evaluation,
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit quiz.",
      },
      { status: 500 }
    );
  }
}