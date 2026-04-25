"use client";

import { motion } from "framer-motion";
import { Zap, ChevronRight, Send } from "lucide-react";
import { useState, useRef } from "react";
import { getAgent } from "@/lib/agents";
import AgentMiniIcon from "./AgentMiniIcon";

interface CommandBarProps {
  isProcessing: boolean;
  activeAgent: string | null;
  lastIntent: string | null;
  onSubmit: (text: string) => void;
}

export default function CommandBar({ isProcessing, activeAgent, lastIntent, onSubmit }: CommandBarProps) {
  const agent = activeAgent ? getAgent(activeAgent) : null;
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const text = input.trim();
    if (!text || isProcessing) return;
    onSubmit(text);
    setInput("");
  }

  return (
    <motion.div
      className="glass rounded-lg px-4 py-2.5 flex items-center gap-3 w-full cursor-text"
      animate={{
        borderColor: isProcessing ? `${agent?.color || "#3b82f6"}30` : "rgba(255,255,255,0.04)",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <Zap size={14} className="text-zeus shrink-0" />

      {isProcessing && agent ? (
        <motion.div
          className="flex items-center gap-2 flex-1 min-w-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="text-[11px] font-mono text-slate-500">Routing to</span>
          <div className="flex items-center gap-1.5" style={{ color: agent.color }}>
            <AgentMiniIcon name={agent.name} color={agent.color} size={12} />
            <span className="text-[11px] font-mono font-medium">{agent.displayName}</span>
          </div>
          {lastIntent && (
            <>
              <ChevronRight size={10} className="text-slate-600" />
              <span className="text-[11px] text-slate-500 truncate">{lastIntent}</span>
            </>
          )}
        </motion.div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ready for command"
          disabled={isProcessing}
          className="flex-1 bg-transparent text-[11px] font-mono text-slate-300 placeholder-slate-600 outline-none disabled:opacity-40"
        />
      )}

      {!isProcessing && input.trim() && (
        <button
          onClick={handleSubmit}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          <Send size={11} />
        </button>
      )}

      {isProcessing && (
        <motion.div
          className="w-12 h-[2px] rounded-full overflow-hidden bg-white/5 shrink-0"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: agent?.color || "#3b82f6" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
