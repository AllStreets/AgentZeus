"use client";

import { motion } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";
import { getAgent } from "@/lib/agents";
import AgentIcon from "./AgentIcon";

interface CommandBarProps {
  isProcessing: boolean;
  activeAgent: string | null;
  lastIntent: string | null;
}

export default function CommandBar({ isProcessing, activeAgent, lastIntent }: CommandBarProps) {
  const agent = activeAgent ? getAgent(activeAgent) : null;

  return (
    <motion.div
      className="glass rounded-lg px-4 py-2.5 flex items-center gap-3 w-full"
      animate={{
        borderColor: isProcessing ? `${agent?.color || "#3b82f6"}30` : "rgba(255,255,255,0.04)",
      }}
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
            <AgentIcon icon={agent.icon} size={12} />
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
        <span className="text-[11px] font-mono text-slate-600">
          Ready for command
        </span>
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
