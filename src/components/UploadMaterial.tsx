
"use client";

import { useState } from "react";

export default function UploadMaterial() {
  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState("notes");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !title.trim()) {
      setMessage("Please enter a title and select a PDF.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("materialType", materialType);

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed.");
      }

      setMessage(
        `Success! ${result.chunkCount} text chunks processed.`
      );
      setTitle("");
      setFile(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Upload Study Material</h2>
      <p className="mt-1 text-sm text-gray-500">
        Upload your syllabus, notes or past question papers.
      </p>

      <form onSubmit={handleUpload} className="mt-5 space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter material title"
          className="w-full rounded-lg border p-3"
          required
        />

        <select
          value={materialType}
          onChange={(event) => setMaterialType(event.target.value)}
          className="w-full rounded-lg border p-3"
        >
          <option value="syllabus">Syllabus</option>
          <option value="notes">Study Notes</option>
          <option value="past_paper">Past Question Paper</option>
        </select>

        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) =>
            setFile(event.target.files?.[0] ?? null)
          }
          className="w-full rounded-lg border p-3"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Uploading and processing..." : "Upload PDF"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-blue-700">{message}</p>
      )}
    </section>
  );
}
