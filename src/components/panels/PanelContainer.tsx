"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AgentInfo } from "@/types";
import AgentMiniIcon from "../AgentMiniIcon";

interface PanelContainerProps {
  agent: AgentInfo | null;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PanelContainer({ agent, onClose, children }: PanelContainerProps) {
  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col"
            style={{ backgroundColor: "#070d1e", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}12`, color: agent.color }}
                >
                  <AgentMiniIcon name={agent.name} color={agent.color} size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{agent.displayName}</h2>
                  <p className="text-[10px] font-mono text-slate-500">{agent.domain}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
