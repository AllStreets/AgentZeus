"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ExternalLink, Radio, BarChart2, Ship, Zap, Target, Plane, Truck, Map } from "lucide-react";
import { agentBus } from "@/lib/agentBus";

const FLEXPORT_URL = "http://localhost:5174";

// Route map — matches actual Flexport app sidebar navigation.
const PAGES = [
  { id: "",            label: "Home",               icon: TrendingUp,  color: "#f59e0b", keywords: ["home","dashboard","overview"] },
  { id: "flights",     label: "Air Freight",        icon: Plane,       color: "#64D2FF", keywords: ["flight","air","airfreight","airline","cargo plane","air cargo"] },
  { id: "land",        label: "Land Freight",       icon: Truck,       color: "#FF9F0A", keywords: ["land","truck","road","ground","drayage","ltl","ftl","inland"] },
  { id: "vessels",     label: "Ocean Freight",      icon: Ship,        color: "#0A84FF", keywords: ["vessel","ship","ocean","freight","cargo","container","shipping","port"] },
  { id: "market",      label: "Market Map",         icon: Map,         color: "#5E5CE6", keywords: ["market","market map","territory","geographic","coverage","region map"] },
  { id: "trade",       label: "Trade Intelligence", icon: Target,      color: "#30D158", keywords: ["trade","import","export","trade map","trade flow","intelligence"] },
  { id: "pilot",       label: "Agentic Outreach",   icon: Zap,         color: "#FF2D55", keywords: ["outreach","agentic","signal","prospect","lead","contact","who should i call"] },
  { id: "performance", label: "Sales CRM",          icon: BarChart2,   color: "#10b981", keywords: ["pipeline","deal","stage","kanban","close","opportunity","crm","sales"] },
];

async function askZeus(query: string): Promise<string | null> {
  try {
    const res = await fetch("/api/zeus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: query }),
    });
    const data = await res.json();
    return data.response || null;
  } catch { return null; }
}

function detectPage(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const page of PAGES) {
    if (page.keywords.some((kw) => lower.includes(kw))) return page.id;
  }
  return undefined;
}

export default function FlexportPanel() {
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);

  function openPage(page: string) {
    setActivePage(page);
    setTimeout(() => setActivePage(null), 1500);
    const url = page ? `${FLEXPORT_URL}/${page}` : FLEXPORT_URL;
    window.open(url, "zeus_app_flexport");
  }

  async function handleQuickAsk(query: string) {
    setLoading(true);
    setLastQuery(query);
    setResponse(null);
    const result = await askZeus(query);
    setResponse(result);
    setLoading(false);
  }

  // Listen for voice commands routed to Flexport agent
  useEffect(() => {
    return agentBus.on(({ agent, intent, transcript, response: agentResponse }) => {
      if (agent !== "flexport") return;
      setResponse(agentResponse);
      setLastQuery(transcript);

      // Highlight the matching section in the panel
      const page = detectPage(transcript) ?? detectPage(agentResponse);
      if (page !== undefined) {
        setActivePage(page);
        setTimeout(() => setActivePage(null), 3000);
      }
    });
  }, []);

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Open App */}
      <button
        onClick={() => window.open(FLEXPORT_URL, "zeus_app_flexport")}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all w-full"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
      >
        <ExternalLink size={11} />
        OPEN FLEXPORT DASHBOARD
      </button>

      {/* Live response */}
      <AnimatePresence>
        {(lastQuery || response) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5 px-3 py-2 rounded text-[10px] font-mono"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            {lastQuery && (
              <div className="flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                <Radio size={9} className={loading ? "animate-pulse" : ""} />
                {loading ? `Querying: ${lastQuery}` : lastQuery}
              </div>
            )}
            {response && (
              <p className="text-slate-300 text-[10px] leading-relaxed">{response}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section buttons */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Open Section</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PAGES.map((p) => {
            const Icon = p.icon;
            const isActive = activePage === p.id;
            return (
              <button
                key={p.label}
                onClick={() => openPage(p.id)}
                className="flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-mono text-left transition-all"
                style={{
                  background: isActive ? `${p.color}12` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? `${p.color}35` : "rgba(255,255,255,0.04)"}`,
                  color: isActive ? p.color : "#64748b",
                }}
              >
                <Icon size={10} style={{ color: p.color }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick intel */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Quick Intel</p>
        <div className="flex flex-col gap-1">
          {[
            "Who should I call today?",
            "Pipeline stage summary",
            "Hot trade signals",
            "Top prospects by urgency",
            "Vessel tracking update",
            "Air freight status",
            "Land freight alerts",
            "Performance vs quota",
            "Tariff changes this week",
            "Market coverage gaps",
            "Research top account",
          ].map((q) => (
            <button
              key={q}
              onClick={() => handleQuickAsk(q)}
              disabled={loading}
              className="text-left px-3 py-1.5 rounded text-[10px] font-mono text-slate-400 hover:text-white transition-all disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
