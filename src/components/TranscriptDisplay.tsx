"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getAgent } from "@/lib/agents";
import AgentIcon from "./AgentIcon";

interface ConversationEntry {
  transcript: string;
  response: string;
  agent: string;
}

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  response: string | null;
  activeAgent: string | null;
  history: ConversationEntry[];
}

export default function TranscriptDisplay({
  transcript,
  interimTranscript,
  response,
  activeAgent,
  history,
}: TranscriptDisplayProps) {
  const agent = activeAgent ? getAgent(activeAgent) : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Auto-scroll to bottom unless the user has manually scrolled up
  useEffect(() => {
    if (!userScrolledUp && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, transcript, interimTranscript, response, userScrolledUp]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolledUp(!atBottom);
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex flex-col gap-3 w-full overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{
        maxHeight: "calc(100vh - 420px)",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.08) transparent",
      }}
    >
      {/* Conversation history */}
      {history.map((entry, i) => {
        const histAgent = getAgent(entry.agent);
        return (
          <div key={i} className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-mono text-accent">YOU</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{entry.transcript}</p>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${histAgent?.color || "#3b82f6"}15`, color: histAgent?.color || "#3b82f6" }}
              >
                {histAgent ? <AgentIcon icon={histAgent.icon} size={12} /> : <span className="text-[10px] font-mono">Z</span>}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{entry.response}</p>
            </div>
          </div>
        );
      })}

      {/* Current interaction */}
      <AnimatePresence mode="wait">
        {(transcript || interimTranscript) && (
          <motion.div
            key="user-input"
            className="flex items-start gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-mono text-accent">YOU</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {transcript}
              {interimTranscript && <span className="text-slate-500"> {interimTranscript}</span>}
            </p>
          </motion.div>
        )}

        {response && (
          <motion.div
            key="agent-response"
            className="flex items-start gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${agent?.color || "#3b82f6"}15`, color: agent?.color || "#3b82f6" }}
            >
              {agent ? <AgentIcon icon={agent.icon} size={12} /> : <span className="text-[10px] font-mono">Z</span>}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: agent?.color || "#3b82f6" }}>
                {agent?.displayName || "Zeus"}
              </span>
              <p className="text-sm text-slate-300 leading-relaxed mt-0.5">{response}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible anchor at bottom */}
      <div style={{ height: 1, flexShrink: 0 }} />
    </div>
  );
}
