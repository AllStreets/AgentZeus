"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Tag } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";

export default function HeraPanel() {
  const { notes, loading, deleteNote, query, setQuery } = useNotes();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-5 flex flex-col gap-4">
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

      <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
        Add notes by saying &quot;Hera, remember that...&quot;
      </p>

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
    </div>
  );
}
