"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentEvent } from "@/types";
import { getAgent } from "@/lib/agents";

interface ActivityFeedProps {
  events: AgentEvent[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const recentEvents = events.slice(-20).reverse();

  return (
    <div className="glass rounded-xl p-4 h-full overflow-hidden flex flex-col">
      <h2 className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
        Activity Feed
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {recentEvents.length === 0 && (
            <p className="text-xs text-slate-500 italic">No activity yet. Try a voice command.</p>
          )}
          {recentEvents.map((event) => {
            const agent = getAgent(event.agent_name);
            return (
              <motion.div
                key={event.id}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: agent?.color || "#3b82f6" }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: agent?.color || "#3b82f6" }}
                    >
                      {agent?.displayName || event.agent_name}
                    </span>
                    <span className="text-xs text-slate-600">
                      {event.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {event.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
