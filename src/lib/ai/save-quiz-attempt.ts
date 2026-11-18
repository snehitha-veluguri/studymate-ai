
import { createClient } from "@/lib/supabase/server";
import {
  evaluateQuizAnswers,
  type StudentResponse,
} from "./answer-evaluation";
import type { QuizQuestion } from "./quiz-generation";

export async function saveQuizAttempt(
  quizId: string,
  answers: StudentResponse[]
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in before submitting a quiz.");
  }

  const { data: savedQuestions, error: questionError } =
    await supabase
      .from("questions")
      .select(
        "id, question_text, options, correct_answer, explanation, topic_id"
      )
      .eq("quiz_id", quizId)
      .eq("user_id", user.id);

  if (questionError || !savedQuestions?.length) {
    throw new Error(
      `Could not retrieve quiz questions: ${questionError?.message ?? "Quiz not found."}`
    );
  }

  if (answers.length > savedQuestions.length) {
    throw new Error("Too many answers were submitted.");
  }

  const questionMap = new Map(
    savedQuestions.map((question) => [question.id, question])
  );

  if (
    new Set(answers.map((answer) => answer.questionId)).size !==
    answers.length
  ) {
    throw new Error("Duplicate answers were submitted.");
  }

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);

    if (
      !question ||
      typeof answer.selectedAnswer !== "string" ||
      !(question.options as string[]).includes(answer.selectedAnswer)
    ) {
      throw new Error("An invalid quiz answer was submitted.");
    }
  }

  const questions: QuizQuestion[] = savedQuestions.map((question) => ({
    id: question.id,
    question: question.question_text,
    options: question.options as string[],
    correctAnswer: question.correct_answer ?? "",
    explanation: question.explanation ?? "",
    chapter: null,
    section: null,
    pageNumber: null,
  }));

  const evaluation = evaluateQuizAnswers(questions, answers);

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      score: evaluation.scorePercentage,
      total_questions: evaluation.totalQuestions,
      completed_at: new Date().toISOString(),
    })
    .select("id, score, total_questions, completed_at")
    .single();

  if (attemptError || !attempt) {
    throw new Error(
      `Could not save quiz attempt: ${attemptError?.message}`
    );
  }

  try {
    const answerRecords = evaluation.results.map((result) => ({
      user_id: user.id,
      attempt_id: attempt.id,
      question_id: result.questionId,
      answer_text:
        result.selectedAnswer === "Not answered"
          ? null
          : result.selectedAnswer,
      is_correct: result.isCorrect,
      feedback: result.explanation,
    }));

    const { error: answerError } = await supabase
      .from("student_answers")
      .insert(answerRecords);

    if (answerError) {
      throw new Error(answerError.message);
    }

    return {
      success: true,
      attempt,
      evaluation,
    };
  } catch (error) {
    await supabase
      .from("quiz_attempts")
      .delete()
      .eq("id", attempt.id)
      .eq("user_id", user.id);

    throw error;
  }
}
