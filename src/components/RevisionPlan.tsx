
"use client";

import { useState } from "react";

interface RevisionTask {
  topic: string;
  activity: string;
  durationMinutes: number;
  priority: string;
  reason: string;
}

interface Plan {
  title: string;
  totalStudyMinutes: number;
  tasks: RevisionTask[];
  advice: string;
}

export default function RevisionPlan() {
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generatePlan() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/revision-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableMinutes }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Plan generation failed.");
      }

      setPlan(result.plan);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Personalized Revision Plan</h2>
      <p className="mt-1 text-sm text-gray-500">
        Create a study plan based on your performance.
      </p>

      <label className="mt-5 block text-sm font-medium">
        Available study time (minutes)
      </label>

      <input
        type="number"
        min={15}
        max={1440}
        value={availableMinutes}
        onChange={(event) => setAvailableMinutes(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border p-3"
      />

      <button
        onClick={generatePlan}
        disabled={loading}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Creating plan..." : "Generate Revision Plan"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}

      {plan && (
        <div className="mt-6">
          <h3 className="font-semibold">{plan.title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            Total study time: {plan.totalStudyMinutes} minutes
          </p>

          {plan.tasks.map((task, index) => (
            <div key={index} className="mt-3 rounded-lg bg-gray-50 p-4">
              <p className="font-medium">{task.topic}</p>
              <p className="mt-1 text-sm">{task.activity}</p>
              <p className="mt-1 text-sm text-gray-600">
                Duration: {task.durationMinutes} minutes | Priority: {task.priority}
              </p>
              <p className="mt-1 text-sm text-gray-600">{task.reason}</p>
            </div>
          ))}

          <p className="mt-4 rounded-lg bg-blue-50 p-4 text-sm">
            <strong>Study advice:</strong> {plan.advice}
          </p>
        </div>
      )}
    </section>
  );
}
