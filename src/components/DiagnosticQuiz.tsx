
"use client";

import { useState } from "react";

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Quiz {
  quizId: string;
  title: string;
  questions: Question[];
}

interface Evaluation {
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  results: {
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export default function DiagnosticQuiz() {
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateQuiz(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setQuiz(null);
    setEvaluation(null);
    setAnswers({});

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questionCount: 5 }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Quiz generation failed.");
      }

      setQuiz(result.quiz);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    if (!quiz) return;

    setLoading(true);
    setMessage("");

    try {
      const submittedAnswers = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedAnswer: answers[question.id] ?? "",
      }));

      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.quizId,
          answers: submittedAnswers,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Quiz submission failed.");
      }

      setEvaluation(result.evaluation);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Diagnostic Quiz</h2>
      <p className="mt-1 text-sm text-gray-500">
        Test your understanding using questions from your notes.
      </p>

      <form onSubmit={generateQuiz} className="mt-5 flex flex-wrap gap-3">
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Enter topic, e.g. Photosynthesis"
          className="min-w-0 flex-1 rounded-lg border p-3"
          required
        />

        <button
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Quiz"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}

      {quiz && !evaluation && (
        <div className="mt-6 space-y-6">
          <h3 className="font-semibold">{quiz.title}</h3>

          {quiz.questions.map((question, index) => (
            <div key={question.id} className="rounded-xl bg-gray-50 p-4">
              <p className="font-medium">
                {index + 1}. {question.question}
              </p>

              <div className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: option,
                        }))
                      }
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={submitQuiz}
            disabled={loading || Object.keys(answers).length !== quiz.questions.length}
            className="rounded-lg bg-green-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}

      {evaluation && (
        <div className="mt-6 rounded-xl bg-green-50 p-4">
          <h3 className="text-lg font-semibold">Quiz Results</h3>
          <p className="mt-2 text-2xl font-bold">
            {evaluation.scorePercentage}%
          </p>
          <p className="text-sm">
            {evaluation.correctAnswers} correct out of{" "}
            {evaluation.totalQuestions}
          </p>

          {evaluation.results.map((result, index) => (
            <div key={index} className="mt-4 border-t pt-3 text-sm">
              <p className="font-medium">
                {result.isCorrect ? "Correct" : "Incorrect"}: {result.question}
              </p>
              <p>Your answer: {result.selectedAnswer}</p>
              <p>Correct answer: {result.correctAnswer}</p>
              <p className="mt-1 text-gray-600">{result.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
