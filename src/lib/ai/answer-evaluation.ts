
import type { QuizQuestion } from "./quiz-generation";

export interface StudentResponse {
  questionId: string;
  selectedAnswer: string;
}

export interface EvaluatedAnswer {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  chapter: string | null;
  section: string | null;
}

export interface EvaluationResult {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercentage: number;
  results: EvaluatedAnswer[];
}

export function evaluateQuizAnswers(
  questions: QuizQuestion[],
  studentResponses: StudentResponse[]
): EvaluationResult {
  if (questions.length === 0) {
    throw new Error("There are no questions to evaluate.");
  }

  const responseMap = new Map(
    studentResponses.map((response) => [
      response.questionId,
      response.selectedAnswer,
    ])
  );

  const results: EvaluatedAnswer[] = questions.map((question) => {
    const selectedAnswer =
      responseMap.get(question.id) ?? "";

    const isCorrect =
      selectedAnswer === question.correctAnswer;

    return {
      questionId: question.id,
      question: question.question,
      selectedAnswer: selectedAnswer || "Not answered",
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      chapter: question.chapter,
      section: question.section,
    };
  });

  const correctAnswers = results.filter(
    (result) => result.isCorrect
  ).length;

  const totalQuestions = questions.length;

  return {
    totalQuestions,
    correctAnswers,
    incorrectAnswers: totalQuestions - correctAnswers,
    scorePercentage: Math.round(
      (correctAnswers / totalQuestions) * 100
    ),
    results,
  };
}
