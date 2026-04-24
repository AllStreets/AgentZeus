"use client";

import { motion } from "framer-motion";
import { AgentInfo } from "@/types";
import AgentIcon from "./AgentIcon";

interface AgentCardProps {
  agent: AgentInfo;
  isActive: boolean;
  lastMessage?: string;
  onClick?: () => void;
}

export default function AgentCard({ agent, isActive, lastMessage, onClick }: AgentCardProps) {
  return (
    <motion.div
      className="glass glass-hover rounded-lg p-4 relative overflow-hidden cursor-pointer select-none"
      onClick={onClick}
      animate={{
        borderColor: isActive ? `${agent.color}60` : "rgba(255,255,255,0.04)",
      }}
      transition={{ duration: 0.3 }}
      style={{ border: "1px solid rgba(255,255,255,0.04)" }}
      whileHover={{ y: -2 }}
      layout
    >
      {/* Active glow bar at top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: agent.color }}
        animate={{ opacity: isActive ? 1 : 0, scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Shimmer sweep when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.color}08, transparent)`,
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          {/* Icon container */}
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${agent.color}12`, color: agent.color }}
          >
            <AgentIcon icon={agent.icon} size={16} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white leading-tight">{agent.displayName}</h3>
            <p className="text-[11px] text-slate-500 font-mono">{agent.domain}</p>
          </div>

          {/* Status dot */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: isActive ? agent.color : "#1e293b" }}
            animate={isActive ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Message or description */}
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
          {lastMessage || agent.description}
        </p>
      </div>
    </motion.div>
  );
}
