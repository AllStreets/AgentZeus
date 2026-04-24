"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitPullRequest, AlertCircle, GitBranch, Star, RefreshCw, ExternalLink, Key } from "lucide-react";

interface PR {
  number: number;
  title: string;
  url: string;
  repo: string;
  age: number;
  draft: boolean;
}

interface Issue {
  number: number;
  title: string;
  url: string;
  repo: string;
  age: number;
}

interface Repo {
  name: string;
  description: string | null;
  stars: number;
  pushedAgo: number;
  url: string;
}

interface GitHubData {
  login: string;
  prs: PR[];
  issues: Issue[];
  repos: Repo[];
}

export default function AthenaPanel() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"prs" | "issues" | "repos">("prs");

  useEffect(() => {
    const stored = localStorage.getItem("github_token") || "";
    setToken(stored);
    setTokenInput(stored);
  }, []);

  const fetchData = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, action: "summary" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, fetchData]);

  function saveToken() {
    localStorage.setItem("github_token", tokenInput);
    setToken(tokenInput);
  }

  if (!token) {
    return (
      <div className="p-5 space-y-4">
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">GitHub Integration</p>
        <div className="space-y-2">
          <label className="text-xs text-slate-400 flex items-center gap-1.5"><Key size={11} /> Personal Access Token</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
            placeholder="ghp_..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/30 font-mono transition-colors"
          />
          <p className="text-[10px] text-slate-600">Needs repo, read:user scopes. Press Enter or click Save.</p>
          <button
            onClick={saveToken}
            className="w-full py-2 rounded-md text-xs font-mono transition-colors"
            style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            Save Token
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header with user + refresh */}
      <div className="flex items-center justify-between">
        <div>
          {data && <p className="text-xs text-slate-300 font-mono">@{data.login}</p>}
          <p className="text-[10px] text-slate-600">GitHub</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(token)}
            disabled={loading}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setToken(""); setData(null); }}
            className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Open PRs", count: data.prs.length, tab: "prs" as const, color: "#8b5cf6" },
            { label: "Issues", count: data.issues.length, tab: "issues" as const, color: "#ef4444" },
            { label: "Repos", count: data.repos.length, tab: "repos" as const, color: "#3b82f6" },
          ].map(({ label, count, tab: t, color }) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="p-3 rounded-lg text-center transition-colors"
              style={{
                backgroundColor: tab === t ? `${color}12` : "rgba(255,255,255,0.02)",
                border: `1px solid ${tab === t ? `${color}25` : "rgba(255,255,255,0.03)"}`,
              }}
            >
              <p className="text-lg font-semibold" style={{ color }}>{count}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {loading && !data && (
        <p className="text-xs text-slate-600 text-center py-8">Fetching from GitHub...</p>
      )}

      <AnimatePresence mode="wait">
        {data && (
          <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1.5">
            {tab === "prs" && (
              data.prs.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">No open PRs assigned to you</p>
              ) : data.prs.map((pr) => (
                <a key={pr.number} href={pr.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <GitPullRequest size={13} className="text-violet-400/60 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-snug truncate">{pr.title}</p>
                    <p className="text-[10px] font-mono text-slate-600">{pr.repo} · {pr.age}d ago{pr.draft ? " · draft" : ""}</p>
                  </div>
                  <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </a>
              ))
            )}

            {tab === "issues" && (
              data.issues.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">No open issues</p>
              ) : data.issues.map((issue) => (
                <a key={issue.number} href={issue.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <AlertCircle size={13} className="text-red-400/60 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-snug truncate">{issue.title}</p>
                    <p className="text-[10px] font-mono text-slate-600">{issue.repo} · {issue.age}d ago</p>
                  </div>
                  <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </a>
              ))
            )}

            {tab === "repos" && (
              data.repos.map((repo) => (
                <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <GitBranch size={13} className="text-blue-400/60 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{repo.name}</p>
                    {repo.description && <p className="text-[10px] text-slate-600 truncate">{repo.description}</p>}
                    <p className="text-[10px] font-mono text-slate-600">pushed {repo.pushedAgo}d ago</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={9} className="text-slate-600" />
                    <span className="text-[10px] font-mono text-slate-600">{repo.stars}</span>
                  </div>
                </a>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
