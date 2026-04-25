"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Tag, Brain, Sparkles, RefreshCw } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";

interface SemanticResult {
  content: string;
  score: number;
  tags: string[];
}

export default function HeraPanel() {
  const { notes, loading, deleteNote, query, setQuery } = useNotes();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"notes" | "semantic">("notes");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const runSemanticSearch = useCallback(async () => {
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);
    try {
      const res = await fetch("/api/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: semanticQuery }),
      });
      const data = await res.json();
      setSemanticResults(data.results || []);
    } catch {} finally {
      setSemanticLoading(false);
    }
  }, [semanticQuery]);

  const TABS = [
    { id: "notes" as const, label: "Notes", icon: Tag },
    { id: "semantic" as const, label: "Context", icon: Brain },
  ];

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono flex-1 justify-center transition-all"
            style={{
              background: tab === id ? "rgba(217,70,239,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${tab === id ? "rgba(217,70,239,0.25)" : "rgba(255,255,255,0.04)"}`,
              color: tab === id ? "#d946ef" : "#64748b",
            }}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "semantic" && (
          <motion.div key="semantic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Sparkles size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-400/50" />
                <input
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSemanticSearch()}
                  placeholder="Ask Hera anything..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md pl-8 pr-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-fuchsia-500/30 transition-colors"
                />
              </div>
              <button
                onClick={runSemanticSearch}
                disabled={semanticLoading}
                className="px-3 py-2 rounded-md text-xs font-mono transition-colors"
                style={{ backgroundColor: "rgba(217,70,239,0.1)", color: "#d946ef", border: "1px solid rgba(217,70,239,0.2)" }}
              >
                {semanticLoading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              </button>
            </div>
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Semantic Search</p>
            {semanticResults.length === 0 ? (
              <div className="text-center py-6">
                <Brain size={24} className="mx-auto mb-3 text-slate-700" />
                <p className="text-xs text-slate-600">Search your knowledge by meaning, not just keywords</p>
                <p className="text-[10px] text-slate-700 mt-1">Hera understands context and finds related notes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {semanticResults.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-fuchsia-400">{Math.round(r.score * 100)}% match</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{r.content}</p>
                    {r.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {r.tags.map((tag) => (
                          <span key={tag} className="text-[9px] font-mono text-fuchsia-400/50 bg-fuchsia-500/5 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === "notes" && (
          <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md pl-8 pr-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/30 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          Say &quot;Hera, remember that...&quot;
        </p>
        <a href="/clip" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-purple-400/60 hover:text-purple-400 transition-colors">
          Web clipper
        </a>
      </div>

      {loading ? (
        <p className="text-xs text-slate-600 text-center py-8">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-8">{query ? "No results" : "No notes yet"}</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded-lg group cursor-pointer"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm text-slate-300 leading-relaxed ${expanded !== note.id ? "line-clamp-2" : ""}`}>
                    {note.content}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag size={9} className="text-slate-600" />
                    {note.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono text-purple-400/60 bg-purple-500/5 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-600 mt-2">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
