"use client";

import { motion } from "framer-motion";
import { agents } from "@/lib/agents";
import AgentMiniIcon from "./AgentMiniIcon";
import { AgentName } from "@/types";

interface AgentSidebarProps {
  activeAgent: AgentName | null;
  agentMessages: Record<string, string>;
  onSelectAgent?: (name: AgentName) => void;
}

export default function AgentSidebar({ activeAgent, agentMessages, onSelectAgent }: AgentSidebarProps) {
  const displayAgents = agents.filter((a) => a.name !== "zeus");

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="px-3 mb-3">
        <h2 className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.2em]">Agents</h2>
      </div>

      {displayAgents.map((agent) => {
        const isActive = activeAgent === agent.name;
        const hasMessage = !!agentMessages[agent.name];

        return (
          <motion.button
            key={agent.name}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-md mx-1 text-left transition-colors"
            style={{
              backgroundColor: isActive ? `${agent.color}08` : "transparent",
            }}
            whileHover={{ backgroundColor: `${agent.color}06` }}
            onClick={() => onSelectAgent?.(agent.name)}
          >
            {/* Active indicator bar */}
            {isActive && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full"
                style={{ backgroundColor: agent.color }}
                layoutId="sidebar-indicator"
              />
            )}

            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${agent.color}${isActive ? "25" : "12"}`,
                color: isActive ? agent.color : "#64748b",
              }}
            >
              <AgentMiniIcon name={agent.name} color={isActive ? agent.color : "#64748b"} size={14} />
            </div>

            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-400"}`}>
                {agent.displayName}
              </span>
              {hasMessage && (
                <p className="text-[10px] text-slate-600 truncate mt-0.5">
                  {agentMessages[agent.name]}
                </p>
              )}
            </div>

            {/* Activity dot */}
            {isActive && (
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: agent.color }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
