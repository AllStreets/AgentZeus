"use client";

import { motion } from "framer-motion";
import { AgentInfo } from "@/types";

interface AgentCardProps {
  agent: AgentInfo;
  isActive: boolean;
  lastMessage?: string;
}

export default function AgentCard({ agent, isActive, lastMessage }: AgentCardProps) {
  return (
    <motion.div
      className="glass rounded-xl p-4 relative overflow-hidden"
      animate={{
        borderColor: isActive ? agent.color : "rgba(255,255,255,0.06)",
        boxShadow: isActive
          ? `0 0 20px ${agent.color}33, 0 0 40px ${agent.color}11`
          : "0 0 0px transparent",
      }}
      transition={{ duration: 0.4 }}
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      layout
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: `${agent.color}15` }}
            animate={{
              scale: isActive ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
          >
            {agent.icon}
          </motion.div>
          <div>
            <h3 className="font-semibold text-white text-sm">{agent.displayName}</h3>
            <p className="text-xs text-slate-400">{agent.domain}</p>
          </div>

          <motion.div
            className="ml-auto w-2 h-2 rounded-full"
            style={{ backgroundColor: isActive ? agent.color : "#334155" }}
            animate={{
              scale: isActive ? [1, 1.5, 1] : 1,
              opacity: isActive ? [1, 0.5, 1] : 0.5,
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>

        <p className="text-xs text-slate-400 line-clamp-2">
          {lastMessage || agent.description}
        </p>
      </div>
    </motion.div>
  );
}
