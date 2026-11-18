
"use client";

import { useState } from "react";

interface Source {
  materialId: string;
  chapter: string | null;
  section: string | null;
  pageNumber: number | null;
  excerpt: string;
}

export default function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) return;

    setLoading(true);
    setMessage("");
    setAnswer("");
    setSources([]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to answer.");
      }

      setAnswer(result.answer);
      setSources(result.sources ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Ask StudyMate AI</h2>
      <p className="mt-1 text-sm text-gray-500">
        Get answers based on your uploaded study materials.
      </p>

      <form onSubmit={askQuestion} className="mt-5 space-y-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about your notes..."
          rows={3}
          className="w-full rounded-lg border p-3"
          required
        />

        <button
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Finding an answer..." : "Ask Question"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}

      {answer && (
        <div className="mt-6 rounded-xl bg-blue-50 p-4">
          <h3 className="font-semibold">Answer</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
            {answer}
          </p>

          {sources.length > 0 && (
            <div className="mt-4 border-t border-blue-200 pt-3">
              <h4 className="font-semibold">Sources</h4>

              {sources.map((source, index) => (
                <div key={`${source.materialId}-${index}`} className="mt-3 text-sm">
                  <p className="font-medium">
                    {source.chapter ?? "Study Material"}
                    {source.section ? ` — ${source.section}` : ""}
                    {source.pageNumber
                      ? ` (Page ${source.pageNumber})`
                      : ""}
                  </p>
                  <p className="mt-1 text-gray-600">
                    {source.excerpt}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
