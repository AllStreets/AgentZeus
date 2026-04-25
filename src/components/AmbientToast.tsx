"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, Calendar, X, AlertTriangle, Target, Zap } from "lucide-react";

interface Notification {
  id: string;
  type: "gmail" | "calendar" | "task" | "system" | "agent";
  message: string;
  agent?: string;
  timestamp: Date;
}

const AGENT_COLORS: Record<string, string> = {
  zeus: "#f59e0b", hermes: "#14b8a6", athena: "#8b5cf6", apollo: "#f97316",
  artemis: "#10b981", ares: "#ef4444", hera: "#d946ef", meridian: "#00d4ff",
  chicago: "#3b82f6", flexport: "#f59e0b", clio: "#a3e635",
  poseidon: "#38bdf8", iris: "#fb7185",
};

interface AmbientToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export default function AmbientToast({ notifications, onDismiss }: AmbientToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-60 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.slice(0, 3).map((note) => {
          const Icon = note.type === "gmail" ? Mail : note.type === "calendar" ? Calendar : note.type === "task" ? Target : note.type === "system" ? AlertTriangle : Zap;
          const color = note.agent ? (AGENT_COLORS[note.agent] || "#64748b") : (note.type === "gmail" ? "#14b8a6" : "#f97316");

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg pointer-events-auto"
              style={{
                backgroundColor: "#070d1e",
                border: `1px solid ${color}25`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${color}10`,
                minWidth: "240px",
                maxWidth: "320px",
              }}
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12`, color }}>
                <Icon size={13} />
              </div>
              <p className="flex-1 text-xs text-slate-300 leading-relaxed">{note.message}</p>
              <button
                onClick={() => onDismiss(note.id)}
                className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
