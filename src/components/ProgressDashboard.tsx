
"use client";

import { useEffect, useState } from "react";

interface ProgressData {
  summary: {
    totalAttempts: number;
    averageScore: number;
    totalTopicsTracked: number;
  };
  attempts: {
    id: string;
    score: number;
    total_questions: number;
    completed_at: string;
  }[];
  performance: {
    id: string;
    topic: string;
    chapter: string | null;
    score: number;
    level: string;
    attempts: number;
  }[];
}

export default function ProgressDashboard() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch("/api/progress");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Could not load progress.");
        }

        setData(result);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not load progress."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">Loading progress...</p>;
  }

  if (message) {
    return <p className="p-4 text-sm text-red-600">{message}</p>;
  }

  if (!data) return null;

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">My Learning Progress</h2>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-sm text-gray-600">Quiz Attempts</p>
          <p className="mt-2 text-2xl font-bold">
            {data.summary.totalAttempts}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-sm text-gray-600">Average Score</p>
          <p className="mt-2 text-2xl font-bold">
            {data.summary.averageScore}%
          </p>
        </div>

        <div className="rounded-xl bg-purple-50 p-4">
          <p className="text-sm text-gray-600">Topics Tracked</p>
          <p className="mt-2 text-2xl font-bold">
            {data.summary.totalTopicsTracked}
          </p>
        </div>
      </div>

      <h3 className="mt-6 font-semibold">Topic Performance</h3>

      {data.performance.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Complete a diagnostic quiz to see your topic performance.
        </p>
      )}

      {data.performance.map((item) => (
        <div key={item.id} className="mt-3 rounded-lg bg-gray-50 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-medium">{item.topic}</p>
            <p className="text-sm font-semibold">{Number(item.score)}%</p>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${Math.max(0, Math.min(100, Number(item.score)))}%`,
              }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Level: {item.level} | Attempts: {item.attempts}
          </p>
        </div>
      ))}

      <h3 className="mt-6 font-semibold">Recent Quiz Attempts</h3>

      {data.attempts.map((attempt) => (
        <div key={attempt.id} className="mt-3 flex justify-between rounded-lg bg-gray-50 p-3 text-sm">
          <span>
            {new Date(attempt.completed_at).toLocaleDateString()}
          </span>
          <span className="font-semibold">
            {Number(attempt.score)}% ({attempt.total_questions} questions)
          </span>
        </div>
      ))}
    </section>
  );
}
