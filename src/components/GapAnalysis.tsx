
"use client";

import { useState } from "react";

interface TopicGap {
  topic: string;
  scorePercentage: number;
  level: "strong" | "medium" | "weak";
  reason: string;
  recommendation: string;
}

interface Analysis {
  overallPercentage: number;
  strongTopics: TopicGap[];
  mediumTopics: TopicGap[];
  weakTopics: TopicGap[];
  summary: string;
}

export default function GapAnalysis() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Analysis failed.");
      }

      setAnalysis(result.analysis);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function renderGroup(title: string, topics: TopicGap[]) {
    return (
      <div className="mt-5">
        <h3 className="font-semibold">{title} ({topics.length})</h3>

        {topics.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No topics here yet.</p>
        )}

        {topics.map((topic) => (
          <div key={topic.topic} className="mt-3 rounded-lg bg-gray-50 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">{topic.topic}</p>
              <span className="text-sm font-semibold">
                {topic.scorePercentage}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{topic.reason}</p>
            <p className="mt-2 text-sm">
              <strong>Recommendation:</strong> {topic.recommendation}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Learning Gap Analysis</h2>
      <p className="mt-1 text-sm text-gray-500">
        Identify your strong and weak study topics.
      </p>

      <button
        onClick={analyze}
        disabled={loading}
        className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze My Performance"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}

      {analysis && (
        <div className="mt-6">
          <p className="text-2xl font-bold">
            Overall: {analysis.overallPercentage}%
          </p>
          <p className="mt-2 text-sm text-gray-600">{analysis.summary}</p>

          {renderGroup("Weak Topics", analysis.weakTopics)}
          {renderGroup("Medium Topics", analysis.mediumTopics)}
          {renderGroup("Strong Topics", analysis.strongTopics)}
        </div>
      )}
    </section>
  );
}
