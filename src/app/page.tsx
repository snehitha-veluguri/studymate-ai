
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import UploadMaterial from "@/components/UploadMaterial";
import AskAssistant from "@/components/AskAssistant";
import DiagnosticQuiz from "@/components/DiagnosticQuiz";
import GapAnalysis from "@/components/GapAnalysis";
import RevisionPlan from "@/components/RevisionPlan";
import ProgressDashboard from "@/components/ProgressDashboard";

const navigation = [
  { name: "Dashboard", icon: "▦" },
  { name: "My Materials", icon: "▤" },
  { name: "Topic Map", icon: "⌘" },
  { name: "Diagnostic Quiz", icon: "✓" },
  { name: "Gap Analysis", icon: "◈" },
  { name: "Revision Plan", icon: "▣" },
  { name: "AI Study Assistant", icon: "✧" },
  { name: "My Progress", icon: "↗" },
];

interface Material {
  id: string;
  title: string;
  file_name: string | null;
  material_type: string | null;
  status: string | null;
  created_at: string;
}

interface Topic {
  topic: string;
  chapter: string | null;
  description: string;
  subtopics: string[];
  source: {
    materialId: string;
    section: string | null;
    pageNumber: number | null;
  };
}

function MaterialsPanel() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMaterials() {
    setLoading(true);

    try {
      const response = await fetch("/api/materials");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not load materials.");
      }

      setMaterials(result.materials ?? []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load materials."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  return (
    <div className="space-y-6">
      <UploadMaterial />

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Uploaded Materials
          </h2>

          <button
            onClick={loadMaterials}
            className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <p className="mt-4 text-sm text-gray-500">
            Loading materials...
          </p>
        )}

        {message && (
          <p className="mt-4 text-sm text-red-600">{message}</p>
        )}

        {!loading && !message && materials.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No materials uploaded yet. Upload your first PDF above.
          </p>
        )}

        {materials.map((material) => (
          <div
            key={material.id}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {material.title}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {material.file_name} · {material.material_type}
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {material.status ?? "Uploaded"}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function TopicMapPanel() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateMap() {
    setLoading(true);
    setMessage("");
    setTopics([]);

    try {
      const response = await fetch("/api/topic-mapping", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Topic map generation failed."
        );
      }

      setTopics(result.topicMap?.topics ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate topic map."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Syllabus Topic Map
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Identify chapters, topics and subtopics from your uploaded study
        material.
      </p>

      <button
        onClick={generateMap}
        disabled={loading}
        className="mt-5 rounded-lg bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Generating topic map..." : "Generate Topic Map"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-red-600">{message}</p>
      )}

      <div className="mt-6 space-y-4">
        {topics.map((topic, index) => (
          <div
            key={`${topic.topic}-${index}`}
            className="rounded-xl bg-gray-50 p-4"
          >
            <h3 className="font-semibold text-slate-900">
              {topic.topic}
            </h3>

            <p className="mt-1 text-sm text-indigo-600">
              {topic.chapter ?? "Chapter not specified"}
            </p>

            <p className="mt-2 text-sm text-gray-600">
              {topic.description}
            </p>

            {topic.subtopics?.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
                {topic.subtopics.map((subtopic, subIndex) => (
                  <li key={subIndex}>{subtopic}</li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-xs text-gray-400">
              Source: {topic.source?.section ?? "Study material"}
              {topic.source?.pageNumber
                ? ` · Page ${topic.source.pageNumber}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [userName, setUserName] = useState("Student");
  const [userLoading, setUserLoading] = useState(true);

  // Retrieve the logged-in student's name from Supabase.
  useEffect(() => {
    async function loadUserName() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Unable to retrieve user:", error.message);
          return;
        }

        const fullName = user?.user_metadata?.full_name;

        if (typeof fullName === "string" && fullName.trim()) {
          setUserName(fullName.trim().split(/\s+/)[0]);
        } else if (user?.email) {
          setUserName(user.email.split("@")[0]);
        }
      } catch (error) {
        console.error("User profile loading error:", error);
      } finally {
        setUserLoading(false);
      }
    }

    loadUserName();
  }, []);

  function renderContent() {
    switch (active) {
      case "My Materials":
        return <MaterialsPanel />;

      case "Topic Map":
        return <TopicMapPanel />;

      case "Diagnostic Quiz":
        return <DiagnosticQuiz />;

      case "Gap Analysis":
        return <GapAnalysis />;

      case "Revision Plan":
        return <RevisionPlan />;

      case "AI Study Assistant":
        return <AskAssistant />;

      case "My Progress":
        return <ProgressDashboard />;

      default:
        return (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm md:p-8">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  YOUR LEARNING JOURNEY
                </span>

                <h3 className="mt-4 text-2xl font-bold">
                  Learn smarter, not harder.
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-indigo-100">
                  Upload study material, understand difficult topics,
                  practise questions and improve with personalized revision.
                </p>

                <button
                  onClick={() => setActive("Diagnostic Quiz")}
                  className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Start Diagnostic Quiz →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900">
                  Get Started
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Follow these steps to start learning.
                </p>

                <ol className="mt-5 space-y-4 text-sm text-slate-700">
                  <li>1. Upload your syllabus and notes.</li>
                  <li>2. Generate your syllabus topic map.</li>
                  <li>3. Take a diagnostic quiz.</li>
                  <li>4. Review your learning gaps.</li>
                  <li>5. Follow your revision plan.</li>
                </ol>

                <button
                  onClick={() => setActive("My Materials")}
                  className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  + Upload Materials
                </button>
              </div>
            </section>

            <ProgressDashboard />

            <section className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setActive("AI Study Assistant")}
                className="rounded-2xl border bg-white p-6 text-left shadow-sm hover:border-indigo-300"
              >
                <h3 className="font-semibold text-slate-900">
                  AI Study Assistant
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Ask questions using your uploaded study material.
                </p>
              </button>

              <button
                onClick={() => setActive("Revision Plan")}
                className="rounded-2xl border bg-white p-6 text-left shadow-sm hover:border-indigo-300"
              >
                <h3 className="font-semibold text-slate-900">
                  Personalized Revision
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Create a study plan based on your learning needs.
                </p>
              </button>
            </section>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800 md:flex">
      <aside className="w-full border-r border-slate-200 bg-white md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
            S
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              StudyMate <span className="text-indigo-600">AI</span>
            </h1>

            <p className="text-xs text-slate-400">
              Your personal study assistant
            </p>
          </div>
        </div>

        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => setActive(item.name)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  active === item.name
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span className="w-5 text-center text-lg">
                  {item.icon}
                </span>

                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto hidden p-4 md:block">
          <div className="rounded-2xl bg-indigo-50 p-4">
            <div className="mb-2 text-xl">💡</div>

            <p className="text-sm font-semibold text-indigo-900">
              Small steps, big results!
            </p>

            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Stay consistent with your daily revision plan.
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:ml-64 md:p-8 lg:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              StudyMate AI Workspace
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {active === "Dashboard"
                ? userLoading
                  ? "Welcome to StudyMate AI!"
                  : `Welcome back, ${userName}!`
                : active}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Let's make today a productive learning day.
            </p>
          </div>

          <button
            onClick={() => setActive("My Materials")}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Upload Materials
          </button>
        </header>

        {renderContent()}

        <p className="mt-8 text-center text-xs text-slate-400">
          StudyMate AI · Personalized learning workspace
        </p>
      </main>
    </div>
  );
}
