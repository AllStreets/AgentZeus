"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Link, Key, Info } from "lucide-react";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = typeof VOICES[number];

const tabs = [
  { id: "voice", label: "Voice", icon: Volume2 },
  { id: "integrations", label: "Integrations", icon: Link },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "about", label: "About", icon: Info },
] as const;

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<"voice" | "integrations" | "keys" | "about">("voice");
  const [voice, setVoice] = useState<Voice>("onyx");
  const [githubToken, setGithubToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");

  useEffect(() => {
    if (open) {
      setVoice((localStorage.getItem("tts_voice") as Voice) || "onyx");
      setGithubToken(localStorage.getItem("github_token") || "");
      setVercelToken(localStorage.getItem("vercel_token") || "");
    }
  }, [open]);

  function save() {
    localStorage.setItem("tts_voice", voice);
    localStorage.setItem("github_token", githubToken);
    localStorage.setItem("vercel_token", vercelToken);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/40 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          <motion.div
            className="fixed inset-0 m-auto w-[560px] h-[480px] z-50 flex flex-col rounded-xl overflow-hidden"
            style={{ backgroundColor: "#070d1e", border: "1px solid rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <h2 className="text-sm font-semibold text-white">Settings</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Tab nav */}
              <div className="w-40 flex flex-col gap-0.5 p-2" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left"
                    style={{
                      backgroundColor: tab === id ? "rgba(255,255,255,0.04)" : "transparent",
                      color: tab === id ? "#e2e8f0" : "#64748b",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 p-5 overflow-y-auto">
                {tab === "voice" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">TTS Voice</label>
                      <div className="grid grid-cols-3 gap-2">
                        {VOICES.map((v) => (
                          <button
                            key={v}
                            onClick={() => setVoice(v)}
                            className="py-2 rounded-md text-xs font-mono capitalize transition-colors"
                            style={{
                              backgroundColor: voice === v ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                              color: voice === v ? "#3b82f6" : "#64748b",
                              border: `1px solid ${voice === v ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)"}`,
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "integrations" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">GitHub Personal Access Token</label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-blue-500/30 transition-colors"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Needs repo, read:user scopes</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Vercel API Token</label>
                      <input
                        type="password"
                        value={vercelToken}
                        onChange={(e) => setVercelToken(e.target.value)}
                        placeholder="vercel_..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-blue-500/30 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {tab === "keys" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">OpenAI API Key</label>
                      <p className="text-xs font-mono text-slate-600 bg-white/[0.02] px-3 py-2 rounded-md border border-white/[0.04]">sk-proj-••••••••••••••••</p>
                      <p className="text-[10px] text-slate-600 mt-1">Set in .env.local — OPENAI_API_KEY</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Supabase URL</label>
                      <p className="text-xs font-mono text-slate-600 bg-white/[0.02] px-3 py-2 rounded-md border border-white/[0.04] truncate">
                        {process.env.NEXT_PUBLIC_SUPABASE_URL || "Set in .env.local"}
                      </p>
                    </div>
                  </div>
                )}

                {tab === "about" && (
                  <div className="space-y-3">
                    <p className="text-sm text-white font-semibold">AgentZeus</p>
                    <p className="text-xs text-slate-400 leading-relaxed">A voice-activated agentic dashboard powered by GPT-4o mini. Say a command to route it to the right agent.</p>
                    <div className="space-y-1.5 mt-4">
                      {[["Version", "1.0.0"], ["Model", "gpt-4o-mini"], ["Agents", "7 active"], ["Voice", "Web Speech API + OpenAI TTS"]].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-slate-500">{k}</span>
                          <span className="text-slate-300 font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={onClose} className="px-4 py-1.5 rounded-md text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
