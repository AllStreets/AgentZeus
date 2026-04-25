"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Camera, Upload, RefreshCw, Sparkles, Image, FileText, ScanLine } from "lucide-react";

interface AnalysisResult {
  id: string;
  type: "screenshot" | "upload";
  summary: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function IrisPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [prompt, setPrompt] = useState("");
  const [tab, setTab] = useState<"analyze" | "history">("analyze");

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agents/iris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "analyze", transcript: prompt, session_id: crypto.randomUUID() }),
      });
      const data = await res.json();
      setResults((prev) => [
        {
          id: crypto.randomUUID(),
          type: "screenshot",
          summary: data.response,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setPrompt("");
    } catch {} finally {
      setLoading(false);
    }
  }, [prompt]);

  const TABS = [
    { id: "analyze" as const, label: "Analyze", icon: ScanLine },
    { id: "history" as const, label: "History", icon: FileText },
  ];

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex gap-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono flex-1 justify-center transition-all"
            style={{
              background: tab === id ? "rgba(251,113,133,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${tab === id ? "rgba(251,113,133,0.25)" : "rgba(255,255,255,0.04)"}`,
              color: tab === id ? "#fb7185" : "#64748b",
            }}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "analyze" && (
          <motion.div key="analyze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Describe what to analyze..."
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-rose-400/30 font-mono transition-colors"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-3 py-2 rounded-md text-xs font-mono transition-colors"
                style={{ backgroundColor: "rgba(251,113,133,0.1)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.2)" }}
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 rounded-lg text-center transition-colors hover:bg-white/[0.03]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                onClick={() => setPrompt("Take a screenshot and describe what's on screen")}>
                <Camera size={16} className="mx-auto mb-1.5 text-slate-600" />
                <span className="text-[10px] text-slate-500 font-mono">Screenshot</span>
              </button>
              <button className="p-3 rounded-lg text-center transition-colors hover:bg-white/[0.03]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                onClick={() => setPrompt("Analyze the current UI and suggest improvements")}>
                <ScanLine size={16} className="mx-auto mb-1.5 text-slate-600" />
                <span className="text-[10px] text-slate-500 font-mono">UI Audit</span>
              </button>
            </div>

            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="text-center py-6">
                  <Eye size={24} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-xs text-slate-600">Iris sees what you see</p>
                  <p className="text-[10px] text-slate-700 mt-1">Screenshot analysis, OCR, visual understanding</p>
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {r.type === "screenshot" ? <Camera size={10} className="text-rose-400" /> : <Image size={10} className="text-rose-400" />}
                        <span className="text-[10px] font-mono text-rose-400 capitalize">{r.type}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-700">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{r.summary}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {tab === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {results.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">No analysis history yet</p>
            ) : (
              <div className="space-y-1.5">
                {results.map((r) => (
                  <div key={r.id} className="p-2.5 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{r.summary}</p>
                    <span className="text-[9px] font-mono text-slate-700">{timeAgo(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
