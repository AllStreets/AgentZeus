"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, ExternalLink, MessageSquare, Circle } from "lucide-react";

interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
}

interface GmailData {
  connected: boolean;
  unreadCount?: number;
  messages?: EmailSummary[];
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.split("@")[0];
}

export default function HermesPanel() {
  const [gmail, setGmail] = useState<GmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slackWebhook, setSlackWebhook] = useState("");

  useEffect(() => {
    setSlackWebhook(localStorage.getItem("slack_webhook") || "");
  }, []);

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

  function saveSlack() {
    localStorage.setItem("slack_webhook", slackWebhook);
  }

  if (loading) {
    return <div className="p-5"><p className="text-xs text-slate-600 text-center py-8">Checking connection...</p></div>;
  }

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Gmail section */}
      {!gmail?.connected ? (
        <div className="space-y-3">
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Gmail</p>
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
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <p className="text-xs text-slate-300">Gmail</p>
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
              <button onClick={disconnect} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">Disconnect</button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-md px-3 py-2">{error}</p>}

          <AnimatePresence initial={false}>
            {(gmail.messages || []).length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">No messages</p>
            ) : (
              <div className="space-y-1.5">
                {(gmail.messages || []).map((email) => (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "rgba(255,255,255,0.02)", border: `1px solid ${email.unread ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.03)"}` }}
                  >
                    <div className="flex items-start gap-2">
                      {email.unread && <Circle size={6} className="text-teal-400 fill-teal-400 mt-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${email.unread ? "text-white font-medium" : "text-slate-300"}`}>
                          {email.subject !== "(no subject)" ? email.subject : email.snippet.split(" ").slice(0, 6).join(" ") + "…"}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{senderName(email.from)}</p>
                        {email.snippet && (
                          <p className="text-[10px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{email.snippet}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
            Say &quot;Hermes, read my latest email&quot; or &quot;draft a reply&quot;
          </p>
        </div>
      )}

      {/* Slack section */}
      <div className="pt-4 border-t border-white/[0.04] space-y-3">
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Slack</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(20,184,166,0.12)", color: "#14b8a6" }}>
            <MessageSquare size={14} />
          </div>
          <div>
            <p className="text-sm text-white">Slack Webhook</p>
            <p className="text-[10px] font-mono text-slate-500">{slackWebhook ? "Connected" : "Not configured"}</p>
          </div>
        </div>
        <input
          type="password"
          value={slackWebhook}
          onChange={(e) => setSlackWebhook(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-teal-500/30 transition-colors"
        />
        <button
          onClick={saveSlack}
          className="w-full py-2 rounded-md text-xs font-mono transition-colors"
          style={{ backgroundColor: "rgba(20,184,166,0.1)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.15)" }}
        >
          Save Webhook
        </button>
        <p className="text-[10px] text-slate-600">Slack → Your workspace → Apps → Incoming Webhooks → Add New</p>
      </div>
    </div>
  );
}
