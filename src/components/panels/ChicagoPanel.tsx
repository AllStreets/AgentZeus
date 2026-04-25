"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ExternalLink, Radio, Train, Cloud, Utensils, Music, Trophy, Moon, Home, Compass, User, Star, Sun, Phone, DollarSign, Newspaper, Heart } from "lucide-react";
import { agentBus } from "@/lib/agentBus";

const CHICAGO_URL = "http://localhost:5173";

const PAGES = [
  { id: "",              label: "Home",          icon: Home,     color: "#7B61FF",  keywords: ["home","dashboard","overview","main"] },
  { id: "transit",       label: "Transit",       icon: Train,    color: "#0A84FF",  keywords: ["train","cta","transit","l ","rail","bus","stop","line","blue","red","green"] },
  { id: "weather",       label: "Weather",       icon: Cloud,    color: "#30D158",  keywords: ["weather","rain","cold","warm","wind","lake","forecast","temperature","snow"] },
  { id: "food",          label: "Food",          icon: Utensils, color: "#FF9F0A",  keywords: ["food","eat","restaurant","dinner","lunch","breakfast","brunch","cuisine","pizza"] },
  { id: "sports",        label: "Sports",        icon: Trophy,   color: "#FF2D55",  keywords: ["sport","cubs","bulls","bears","hawks","sox","fire","sky","game","score","stadium"] },
  { id: "events",        label: "Events",        icon: Music,    color: "#BF5AF2",  keywords: ["event","concert","show","ticket","festival","performance","theatre"] },
  { id: "nightlife",     label: "Nightlife",     icon: Moon,     color: "#FF6B35",  keywords: ["bar","night","drink","cocktail","club","lounge","nightlife","after hours"] },
  { id: "neighborhoods", label: "Areas",         icon: MapPin,   color: "#64D2FF",  keywords: ["neighborhood","area","streeterville","wicker","lincoln","logan","pilsen","loop"] },
  { id: "explore",       label: "Explore",       icon: Compass,  color: "#34C759",  keywords: ["explore","discover","find","attractions","sightseeing","tourist","what to do"] },
  { id: "me",            label: "My Chicago",    icon: User,     color: "#5E5CE6",  keywords: ["my chicago","personalized","saved","favorites","profile","my places"] },
  { id: "tonight",       label: "Tonight",       icon: Star,     color: "#FFD60A",  keywords: ["tonight","tonight","what to do tonight","evening","tonight's"] },
  { id: "beach",         label: "Beach",         icon: Sun,      color: "#FF9F0A",  keywords: ["beach","lake michigan","lakefront","swim","sand","navy pier","montrose"] },
  { id: "311",           label: "311 Reports",   icon: Phone,    color: "#FF453A",  keywords: ["311","report","pothole","complaint","service request","city services","issue"] },
  { id: "finance",       label: "Finance",       icon: DollarSign, color: "#30D158", keywords: ["finance","money","stock","market","invest","economy","financial","budget"] },
  { id: "news",          label: "News",          icon: Newspaper, color: "#636366", keywords: ["news","politics","government","mayor","city hall","alderman","policy","chicago news"] },
  { id: "health",        label: "Health",        icon: Heart,    color: "#FF375F",  keywords: ["health","hospital","clinic","doctor","wellness","covid","public health","medical"] },
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

function detectPage(text: string): string | null {
  const lower = text.toLowerCase();
  for (const page of PAGES) {
    if (page.keywords.some((kw) => lower.includes(kw))) return page.id;
  }
  return null;
}

export default function ChicagoPanel() {
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);

  function openPage(page: string) {
    setActivePage(page);
    const url = page ? `${CHICAGO_URL}/${page}` : CHICAGO_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleQuickAsk(query: string) {
    setLoading(true);
    setLastQuery(query);
    setResponse(null);
    const detected = detectPage(query);
    if (detected) openPage(detected);
    const result = await askZeus(query);
    setResponse(result);
    setLoading(false);
  }

  // Listen for voice commands routed to Chicago agent
  useEffect(() => {
    return agentBus.on(({ agent, intent, transcript, response: agentResponse }) => {
      if (agent !== "chicago") return;
      setResponse(agentResponse);
      setLastQuery(transcript);

      // Navigate to the specific section that matches the query
      const page = detectPage(transcript) || detectPage(agentResponse);
      if (page) openPage(page);
    });
  }, []);

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Open App */}
      <a
        href={CHICAGO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}
      >
        <ExternalLink size={11} />
        OPEN CHICAGO EXPLORER
      </a>

      {/* Live response */}
      <AnimatePresence>
        {(lastQuery || response) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5 px-3 py-2 rounded text-[10px] font-mono"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            {lastQuery && (
              <div className="flex items-center gap-1.5" style={{ color: "#3b82f6" }}>
                <Radio size={9} className={loading ? "animate-pulse" : ""} />
                {loading ? `Asking: ${lastQuery}` : lastQuery}
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

      {/* Quick asks */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Quick Ask</p>
        <div className="flex flex-col gap-1">
          {[
            "CTA train status",
            "Chicago weather today",
            "Best restaurants nearby",
            "Cubs or Sox scores",
            "Events on tonight",
            "Bars open now",
            "Best neighborhoods to visit",
            "What to explore this weekend",
            "Chicago beach conditions",
            "Chicago news today",
            "Health resources in Chicago",
            "File a 311 report",
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
