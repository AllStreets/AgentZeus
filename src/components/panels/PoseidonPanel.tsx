"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Anchor, Search, Globe, RefreshCw, ExternalLink, Sparkles, Link2, FileText } from "lucide-react";

interface ResearchResult {
  id: string;
  query: string;
  summary: string;
  sources: string[];
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

export default function PoseidonPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [tab, setTab] = useState<"search" | "history">("search");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agents/poseidon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "research", transcript: query, session_id: crypto.randomUUID() }),
      });
      const data = await res.json();
      setResults((prev) => [
        {
          id: crypto.randomUUID(),
          query: query,
          summary: data.response,
          sources: [],
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setQuery("");
    } catch {} finally {
      setLoading(false);
    }
  }, [query]);

  const TABS = [
    { id: "search" as const, label: "Research", icon: Search },
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
              background: tab === id ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${tab === id ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.04)"}`,
              color: tab === id ? "#38bdf8" : "#64748b",
            }}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "search" && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask Poseidon to research..."
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/30 font-mono transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-3 py-2 rounded-md text-xs font-mono transition-colors"
                style={{ backgroundColor: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              </button>
            </div>

            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <Anchor size={24} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-xs text-slate-600">Ask Poseidon to research any topic</p>
                  <p className="text-[10px] text-slate-700 mt-1">Web research, fact-checking, competitive intel</p>
                </div>
              ) : (
                results.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-sky-400">{r.query}</span>
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
              <p className="text-xs text-slate-600 text-center py-6">No research history yet</p>
            ) : (
              <div className="space-y-1.5">
                {results.map((r) => (
                  <div key={r.id} className="p-2.5 rounded" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <p className="text-[10px] font-mono text-sky-400 mb-1">{r.query}</p>
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
