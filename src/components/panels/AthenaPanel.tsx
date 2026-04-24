"use client";

import { useEffect, useState } from "react";
import { GitBranch, GitPullRequest, AlertCircle } from "lucide-react";

export default function AthenaPanel() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("github_token") || "");
  }, []);

  function saveToken() {
    localStorage.setItem("github_token", token);
  }

  return (
    <div className="p-5 space-y-5">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">GitHub Integration</p>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">Personal Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/30 font-mono transition-colors"
        />
        <button
          onClick={saveToken}
          className="w-full py-2 rounded-md text-xs font-mono transition-colors"
          style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          Save Token
        </button>
      </div>

      <div className="space-y-2 opacity-40 pointer-events-none">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Preview — Phase 2</p>
        {[{ icon: GitPullRequest, label: "Open PRs", value: "—" }, { icon: AlertCircle, label: "Open Issues", value: "—" }, { icon: GitBranch, label: "Repos", value: "—" }].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-2">
              <Icon size={13} className="text-slate-500" />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <span className="text-sm font-mono text-slate-600">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
