"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, ExternalLink, MessageSquare } from "lucide-react";

interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

interface GmailData {
  connected: boolean;
  unreadCount?: number;
  messages?: EmailSummary[];
}

export default function HermesPanel() {
  const [gmail, setGmail] = useState<GmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGmail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail");
      const data = await res.json();
      setGmail(data);
    } catch {
      setError("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGmail(); }, [fetchGmail]);

  async function disconnect() {
    await fetch("/api/gmail", { method: "DELETE" });
    setGmail({ connected: false });
  }

  if (loading) {
    return <div className="p-5"><p className="text-xs text-slate-600 text-center py-8">Checking connection...</p></div>;
  }

  if (!gmail?.connected) {
    return (
      <div className="p-5 space-y-4">
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Integrations</p>

        <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "#14b8a6" }}>
              <Mail size={14} />
            </div>
            <div>
              <p className="text-sm text-white">Gmail</p>
              <p className="text-[10px] font-mono text-slate-500">Not connected</p>
            </div>
          </div>
          <a
            href="/api/auth/google?service=gmail"
            className="w-full py-2 rounded-md text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.2)" }}
          >
            Connect Gmail <ExternalLink size={10} />
          </a>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg opacity-50" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "#14b8a6" }}>
              <MessageSquare size={14} />
            </div>
            <div>
              <p className="text-sm text-white">Slack</p>
              <p className="text-[10px] font-mono text-slate-500">Coming soon</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Connect Gmail to let Hermes read emails, count unread messages, and draft replies by voice.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400" />
          <p className="text-xs text-slate-300">Gmail connected</p>
          {gmail.unreadCount !== undefined && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "#14b8a6" }}>
              {gmail.unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchGmail} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={disconnect} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Email list */}
      <AnimatePresence initial={false}>
        {(gmail.messages || []).length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-6">No unread messages</p>
        ) : (
          <div className="space-y-1.5">
            {(gmail.messages || []).map((email) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 truncate font-medium">{email.subject}</p>
                    <p className="text-[10px] text-slate-500 truncate">{email.from}</p>
                  </div>
                </div>
                {email.snippet && (
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{email.snippet}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
        Say &quot;Hermes, read my latest email&quot; to hear it aloud
      </p>
    </div>
  );
}
