"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Server, HardDrive, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Key } from "lucide-react";

interface Deployment {
  id: string;
  name: string;
  url: string;
  state: string;
  age: number;
  message: string | null;
}

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

export default function AresPanel() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vercel_token") || "";
    setToken(stored);
    setTokenInput(stored);
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

  useEffect(() => {
    if (token) fetchDeployments(token);
  }, [token, fetchDeployments]);

  function saveToken() {
    localStorage.setItem("vercel_token", tokenInput);
    setToken(tokenInput);
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">System Status</p>

      {/* Static status cards */}
      <div className="space-y-2">
        {[
          { icon: Activity, label: "App Status", value: "Running", status: "ok" as const },
          { icon: Server, label: "Environment", value: "Development", status: "ok" as const },
          { icon: HardDrive, label: "Supabase", value: "Connected", status: "ok" as const },
        ].map(({ icon: Icon, label, value, status }) => {
          const color = status === "ok" ? "#10b981" : "#f59e0b";
          return (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <Icon size={13} className="text-slate-500" />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color }}>{value}</span>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Vercel token input */}
      {!token ? (
        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
          <label className="text-xs text-slate-400 flex items-center gap-1.5"><Key size={11} /> Vercel API Token</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
            placeholder="vercel_..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/30 font-mono transition-colors"
          />
          <button
            onClick={saveToken}
            className="w-full py-2 rounded-md text-xs font-mono transition-colors"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            Connect Vercel
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-white/[0.04] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-xs text-slate-300">Vercel connected</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchDeployments(token)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => { setToken(""); setDeployments([]); localStorage.removeItem("vercel_token"); }} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                Disconnect
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-md px-3 py-2">{error}</p>
          )}

          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Recent Deployments</p>

          <AnimatePresence initial={false}>
            {loading && deployments.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">Fetching deployments...</p>
            ) : deployments.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">No deployments found</p>
            ) : (
              <div className="space-y-1.5">
                {deployments.map((d) => (
                  <motion.a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                    style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                  >
                    <StateIcon state={d.state} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{d.name}</p>
                      {d.message && <p className="text-[10px] text-slate-500 truncate">{d.message}</p>}
                      <p className="text-[10px] font-mono" style={{ color: statusColor(d.state) }}>
                        {d.state} · {ageLabel(d.age)}
                      </p>
                    </div>
                    <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </motion.a>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
