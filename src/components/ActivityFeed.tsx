"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentEvent } from "@/types";
import { getAgent } from "@/lib/agents";
import AgentIcon from "./AgentIcon";

interface ConversationEntry {
  transcript: string;
  response: string;
  agent: string;
}

interface ActivityFeedProps {
  events: AgentEvent[];
  history: ConversationEntry[];
  onReplay: (entry: ConversationEntry) => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ActivityFeed({ events, history, onReplay }: ActivityFeedProps) {
  const recentEvents = events
    .filter((e) => e.event_type === "complete")
    .slice(-30)
    .reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.15em]">Activity</h2>
        <span className="text-[10px] font-mono text-slate-600">{recentEvents.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        <AnimatePresence initial={false}>
          {recentEvents.length === 0 && (
            <p className="text-[11px] text-slate-600 text-center py-8">No activity yet</p>
          )}
          {recentEvents.map((event) => {
            const agent = getAgent(event.agent_name);
            // Find matching history entry for replay
            const historyEntry = history.find(
              (h) => h.agent === event.agent_name && h.response === event.content
            );

            return (
              <motion.div
                key={event.id}
                className={`flex items-start gap-2.5 px-2 py-2 rounded-md transition-colors ${historyEntry ? "cursor-pointer hover:bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => historyEntry && onReplay(historyEntry)}
                title={historyEntry ? "Click to replay" : undefined}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${agent?.color || "#3b82f6"}10`, color: agent?.color || "#3b82f6" }}
                >
                  {agent ? <AgentIcon icon={agent.icon} size={10} /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {agent?.displayName || event.agent_name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600 shrink-0">
                      {event.created_at ? timeAgo(event.created_at) : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{event.content}</p>
                  {historyEntry && (
                    <p className="text-[9px] font-mono text-slate-700 mt-0.5 truncate">
                      You: {historyEntry.transcript}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
