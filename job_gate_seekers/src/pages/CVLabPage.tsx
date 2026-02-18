import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { seekerApi } from "../services/api";

const weakTerms = ["responsible for", "helped", "worked on", "tasked with"];
const strongTerms = ["led", "delivered", "optimized", "increased", "built"];

const CVLabPage: React.FC = () => {
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const queryClient = useQueryClient();

  const cvsQ = useQuery({ queryKey: ["cvs"], queryFn: seekerApi.listCVs });
  const cvItems = useMemo(
    () => (Array.isArray(cvsQ.data) ? cvsQ.data : []),
    [cvsQ.data]
  );
  const selectedCv = useMemo(
    () => cvItems.find((cv) => cv.cv_id === selectedCvId) || cvItems[0],
    [cvItems, selectedCvId]
  );

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCv) throw new Error("Select CV first");
      return seekerApi.getCvAnalysis(selectedCv.cv_id);
    },
    onSuccess: (data) => setAnalysis(data),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("cv", file);
      fd.append("cv_title", file.name);
      return seekerApi.uploadCV(fd);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cvs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => seekerApi.deleteCV(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cvs"] }),
  });

  const weakFound = weakTerms.filter((w) => text.toLowerCase().includes(w));
  const strongFound = strongTerms.filter((s) => text.toLowerCase().includes(s));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass-card p-4">
        <h2 className="mb-3 text-xl font-semibold">CV Preview</h2>
        <div className="space-y-2">
          {cvItems.map((cv) => (
            <button key={cv.cv_id} onClick={() => setSelectedCvId(cv.cv_id)} className={`w-full rounded-xl border p-3 text-left ${selectedCv?.cv_id === cv.cv_id ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
              {cv.title}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <label className="btn-ghost cursor-pointer">
            Upload CV
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
          </label>
          {selectedCv && <button className="btn-ghost" onClick={() => deleteMutation.mutate(selectedCv.cv_id)}>Delete CV</button>}
          <button className="btn-primary" onClick={() => analyzeMutation.mutate()}>
            Analyze
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-xl font-semibold">AI Recommendations</h2>
        <textarea className="field min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste bullet points for live phrasing feedback..." />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-red-500/40 p-3 text-sm">
            <p className="font-semibold text-red-400">Weak Phrasing</p>
            <p>{weakFound.length ? weakFound.join(", ") : "No weak phrases detected"}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/40 p-3 text-sm">
            <p className="font-semibold text-emerald-400">Strong Impact</p>
            <p>{strongFound.length ? strongFound.join(", ") : "Add stronger impact verbs"}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
          Template switcher: use AI Consultant export for PDF/DOCX generation.
        </div>
        {analysis && <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-[var(--border)] p-3 text-xs">{JSON.stringify(analysis, null, 2)}</pre>}
      </div>
    </div>
  );
};

export default CVLabPage;
