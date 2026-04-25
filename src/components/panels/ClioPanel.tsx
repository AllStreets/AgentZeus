"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Trash2, Edit3, Check, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface Note {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClioPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      // Filter out memory/hera notes — only show voice notes
      setNotes((data as Note[]).filter((n) => !n.tags?.includes("memory")));
    } catch {}
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Set up speech recognition for recording
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) setTranscript((prev) => prev + (prev ? " " : "") + final.trim());
      setInterimText(interim);
    };

    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    recognitionRef.current = rec;
  }, []);

  function startRecording() {
    if (!recognitionRef.current) return;
    setTranscript("");
    setInterimText("");
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch {}
  }

  function stopRecording() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
  }

  async function saveNote() {
    const content = (transcript + (interimText ? " " + interimText : "")).trim();
    if (!content) return;
    setSaving(true);
    stopRecording();
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags: ["voice-note", "clio"] }),
      });
      setTranscript("");
      setInterimText("");
      await fetchNotes();
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  async function saveEdit(id: string) {
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editContent }),
    });
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, content: editContent } : n));
    setEditingId(null);
  }

  async function summarize(note: Note) {
    setSummarizing(note.id);
    try {
      const res = await fetch("/api/agents/clio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize", content: note.content }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummaries((prev) => ({ ...prev, [note.id]: data.summary }));
        setExpandedId(note.id);
      }
    } finally {
      setSummarizing(null);
    }
  }

  const liveText = transcript + (interimText ? (transcript ? " " : "") + interimText : "");

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Recording area */}
      <div className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Voice Recording</p>
          <div className="flex items-center gap-1.5">
            {isRecording && (
              <motion.div className="w-1.5 h-1.5 rounded-full bg-red-400"
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
            <span className="text-[9px] font-mono" style={{ color: isRecording ? "#f87171" : "#64748b" }}>
              {isRecording ? "REC" : "READY"}
            </span>
          </div>
        </div>

        {/* Live transcript */}
        <div className="min-h-[52px] rounded p-2.5 text-[11px] leading-relaxed font-mono"
          style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(167,139,250,0.08)", color: liveText ? "#e2e8f0" : "#475569" }}>
          {liveText || "Press record and start speaking..."}
          {isRecording && interimText && (
            <span className="opacity-50"> {interimText}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all"
            style={{
              background: isRecording ? "rgba(248,113,113,0.12)" : "rgba(167,139,250,0.12)",
              border: `1px solid ${isRecording ? "rgba(248,113,113,0.3)" : "rgba(167,139,250,0.3)"}`,
              color: isRecording ? "#f87171" : "#a78bfa",
            }}
          >
            {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
            {isRecording ? "Stop" : "Record"}
          </button>

          {liveText && (
            <button
              onClick={saveNote}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-40"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}
            >
              <Check size={12} />
              {saving ? "Saving..." : "Save Note"}
            </button>
          )}

          {liveText && !isRecording && (
            <button
              onClick={() => { setTranscript(""); setInterimText(""); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Notes list */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          Saved Notes {notes.length > 0 && `(${notes.length})`}
        </p>

        {notes.length === 0 ? (
          <p className="text-[11px] text-slate-600 text-center py-6">No notes yet. Start recording.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="p-3">
                    {/* Note header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-mono text-slate-600">{timeAgo(note.created_at)}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => summarize(note)}
                          disabled={summarizing === note.id}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-violet-400 transition-colors disabled:opacity-40"
                          title="AI Summary"
                        >
                          <Sparkles size={10} />
                        </button>
                        <button
                          onClick={() => startEdit(note)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                        <button
                          onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          {expandedId === note.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-black/20 border border-violet-500/20 rounded p-2 text-[11px] font-mono text-slate-300 outline-none resize-none leading-relaxed"
                          rows={4}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(note.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono"
                            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}>
                            <Check size={9} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-slate-500 hover:text-slate-400">
                            <X size={9} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 leading-relaxed"
                        style={{ display: expandedId === note.id ? "block" : "-webkit-box", WebkitLineClamp: expandedId === note.id ? undefined : 2, WebkitBoxOrient: "vertical" as const, overflow: expandedId === note.id ? "visible" : "hidden" }}>
                        {note.content}
                      </p>
                    )}

                    {/* AI Summary */}
                    <AnimatePresence>
                      {summaries[note.id] && expandedId === note.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 pt-2 border-t"
                          style={{ borderColor: "rgba(167,139,250,0.12)" }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles size={9} style={{ color: "#a78bfa" }} />
                            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#a78bfa" }}>AI Summary</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed italic">{summaries[note.id]}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
