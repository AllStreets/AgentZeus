"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Server, Database, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Key, Zap, AlertTriangle } from "lucide-react";

interface Deployment {
  id: string;
  name: string;
  url: string;
  state: string;
  age: number;
  message: string | null;
}

interface HealthStatus {
  label: string;
  status: "ok" | "error" | "loading" | "unknown";
  value: string;
  latency?: number;
}

interface AgentEvent {
  id: string;
  agent_name: string;
  event_type: string;
  content: string;
  created_at: string;
}

const AGENT_COLORS: Record<string, string> = {
  zeus: "#f59e0b", hermes: "#14b8a6", athena: "#8b5cf6", apollo: "#f97316",
  artemis: "#10b981", ares: "#ef4444", hera: "#d946ef", meridian: "#00d4ff",
  chicago: "#3b82f6", flexport: "#f59e0b", clio: "#a3e635",
  poseidon: "#38bdf8", iris: "#fb7185",
};

function statusColor(state: string): string {
  if (state === "READY") return "#10b981";
  if (state === "ERROR" || state === "CANCELED") return "#ef4444";
  if (state === "BUILDING" || state === "QUEUED") return "#f59e0b";
  return "#64748b";
}

function StateIcon({ state }: { state: string }) {
  if (state === "READY") return <CheckCircle size={12} className="text-emerald-400" />;
  if (state === "ERROR") return <XCircle size={12} className="text-red-400" />;
  return <Clock size={12} className="text-amber-400" />;
}

function ageLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function AresPanel() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"health" | "deployments" | "logs">("health");
  const [health, setHealth] = useState<HealthStatus[]>([
    { label: "Zeus API", status: "loading", value: "Checking..." },
    { label: "OpenAI", status: "loading", value: "Checking..." },
    { label: "Supabase", status: "loading", value: "Checking..." },
    { label: "Environment", status: "ok", value: process.env.NODE_ENV || "development" },
  ]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vercel_token") || "";
    setToken(stored);
    setTokenInput(stored);
  }, []);

  const fetchHealth = useCallback(async () => {
    // Reset only the dynamic checks — Environment is static, never needs re-checking
    setHealth((prev) => prev.map((h) =>
      h.label === "Environment" ? h : { ...h, status: "loading" as const, value: "Checking..." }
    ));

    // Check Zeus API
    const t0 = Date.now();
    try {
      const res = await fetch("/api/zeus");
      const latency = Date.now() - t0;
      if (res.ok) {
        setHealth((prev) => prev.map((h) => h.label === "Zeus API"
          ? { ...h, status: "ok", value: `Online · ${latency}ms`, latency }
          : h));
      } else {
        setHealth((prev) => prev.map((h) => h.label === "Zeus API"
          ? { ...h, status: "error", value: `HTTP ${res.status}` }
          : h));
      }
    } catch {
      setHealth((prev) => prev.map((h) => h.label === "Zeus API"
        ? { ...h, status: "error", value: "Unreachable" }
        : h));
    }

    // Check OpenAI (via health endpoint)
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth((prev) => prev.map((h) => {
        if (h.label === "OpenAI") return { ...h, status: data.openai ? "ok" : "error", value: data.openai ? "Key set" : "No key" };
        if (h.label === "Supabase") return { ...h, status: data.supabase ? "ok" : "error", value: data.supabase ? "Connected" : "Error" };
        return h;
      }));
    } catch {
      setHealth((prev) => prev.map((h) =>
        (h.label === "OpenAI" || h.label === "Supabase")
          ? { ...h, status: "unknown" as const, value: "Unknown" }
          : h
      ));
    }
  }, []);

  const fetchDeployments = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDeployments(data.deployments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data || []);
    } catch {} finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  useEffect(() => {
    if (token) fetchDeployments(token);
  }, [token, fetchDeployments]);

  useEffect(() => {
    if (tab === "logs" && events.length === 0) fetchEvents();
  }, [tab, events.length, fetchEvents]);

  function saveToken() {
    localStorage.setItem("vercel_token", tokenInput);
    setToken(tokenInput);
  }

  function healthIcon(status: HealthStatus["status"]) {
    if (status === "ok") return <CheckCircle size={12} className="text-emerald-400" />;
    if (status === "error") return <XCircle size={12} className="text-red-400" />;
    if (status === "loading") return <motion.div className="w-3 h-3 rounded-full border border-slate-500 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />;
    return <AlertTriangle size={12} className="text-amber-400" />;
  }

  const TABS = [
    { id: "health" as const, label: "Health", icon: Activity },
    { id: "deployments" as const, label: "Deploy", icon: Zap },
    { id: "logs" as const, label: "Events", icon: Server },
  ];

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono flex-1 justify-center transition-all"
            style={{
              background: tab === id ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${tab === id ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.04)"}`,
              color: tab === id ? "#ef4444" : "#64748b",
            }}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "health" && (
          <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">System Status</p>
              <button onClick={fetchHealth}
                className="text-slate-600 hover:text-slate-400 transition-colors">
                <RefreshCw size={11} />
              </button>
            </div>
            {health.map((h) => (
              <div key={h.label} className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-3">
                  {h.label === "Zeus API" ? <Zap size={13} className="text-slate-500" /> :
                   h.label === "OpenAI" ? <Activity size={13} className="text-slate-500" /> :
                   h.label === "Supabase" ? <Database size={13} className="text-slate-500" /> :
                   <Server size={13} className="text-slate-500" />}
                  <span className="text-xs text-slate-400">{h.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">{h.value}</span>
                  {healthIcon(h.status)}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "deployments" && (
          <motion.div key="deployments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {!token ? (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 flex items-center gap-1.5"><Key size={11} /> Vercel API Token</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveToken()}
                  placeholder="vercel_..."
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/30 font-mono transition-colors"
                />
                <button onClick={saveToken}
                  className="w-full py-2 rounded-md text-xs font-mono transition-colors"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  Connect Vercel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <p className="text-xs text-slate-300">Vercel connected</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fetchDeployments(token)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => { setToken(""); setDeployments([]); localStorage.removeItem("vercel_token"); }}
                      className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                      Disconnect
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-md px-3 py-2">{error}</p>}

                {loading && deployments.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">Fetching deployments...</p>
                ) : deployments.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">No deployments found</p>
                ) : (
                  <div className="space-y-1.5">
                    {deployments.map((d) => (
                      <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                        style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <StateIcon state={d.state} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{d.name}</p>
                          {d.message && <p className="text-[10px] text-slate-500 truncate">{d.message}</p>}
                          <p className="text-[10px] font-mono" style={{ color: statusColor(d.state) }}>
                            {d.state} · {ageLabel(d.age)}
                          </p>
                        </div>
                        <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {tab === "logs" && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Agent Event Log</p>
              <button onClick={fetchEvents} className="text-slate-600 hover:text-slate-400 transition-colors">
                <RefreshCw size={11} className={eventsLoading ? "animate-spin" : ""} />
              </button>
            </div>
            {eventsLoading ? (
              <p className="text-xs text-slate-600 text-center py-6">Loading events...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">No events recorded yet</p>
            ) : (
              <div className="space-y-1.5">
                {events.map((ev) => {
                  const color = AGENT_COLORS[ev.agent_name] || "#64748b";
                  return (
                    <div key={ev.id} className="p-2.5 rounded"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color }}>
                            {ev.agent_name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-600">{ev.event_type}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-700">{timeAgo(ev.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{ev.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
