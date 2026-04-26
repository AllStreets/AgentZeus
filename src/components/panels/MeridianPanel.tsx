"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, RefreshCw, ExternalLink, Radio } from "lucide-react";
import { agentBus } from "@/lib/agentBus";

const MERIDIAN_URL = "http://localhost:8765";

const CATEGORIES = [
  { id: "all",      label: "ALL",  color: "#7B61FF" },
  { id: "geo",      label: "GEO",  color: "#FF2D55" },
  { id: "military", label: "MIL",  color: "#FF9F0A" },
  { id: "finance",  label: "FIN",  color: "#FFD60A" },
  { id: "climate",  label: "CLM",  color: "#30D158" },
  { id: "tech",     label: "TECH", color: "#0A84FF" },
];

const OVERLAYS = [
  { id: "cities",    label: "Cities" },
  { id: "countries", label: "Countries" },
  { id: "cables",    label: "Cables" },
  { id: "flights",   label: "Flights" },
  { id: "threats",   label: "Threats" },
  { id: "sanctions", label: "Sanctions" },
  { id: "shipping",  label: "Shipping" },
  { id: "eq",        label: "Quakes" },
];

const ANALYSIS_TOOLS = [
  { id: "silence",  label: "Silence" },
  { id: "diverge",  label: "Diverge" },
  { id: "cascade",  label: "Cascade" },
  { id: "livenews", label: "Broadcast" },
  { id: "webcams",  label: "Webcams" },
  { id: "wargame",  label: "Wargame" },
];

const PAGES = [
  { id: "analyst",  label: "Analyst Board" },
  { id: "brief",    label: "Daily Brief" },
  { id: "mapkey",   label: "Map Key" },
];

async function sendCmd(cmd: string, payload: Record<string, unknown> = {}) {
  await fetch("/api/meridian-bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd, payload }),
  });
}

export default function MeridianPanel() {
  const [activeCat, setActiveCat] = useState("all");
  const [spinning, setSpinning] = useState(true);
  const [lastCmd, setLastCmd] = useState<string | null>(null);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(new Set());

  function flash(label: string) { setLastCmd(label); }

  async function handleCat(cat: string) {
    setActiveCat(cat);
    setTimeout(() => setActiveCat("all"), 1500);
    flash(`Category → ${cat.toUpperCase()}`);
    await sendCmd("set_cat", { cat });
  }

  async function handleOverlay(overlay: string) {
    setActiveOverlays(prev => {
      const next = new Set(prev);
      next.has(overlay) ? next.delete(overlay) : next.add(overlay);
      return next;
    });
    flash(`Toggle → ${overlay}`);
    setTimeout(() => setActiveOverlays(prev => {
      const next = new Set(prev);
      next.delete(overlay);
      return next;
    }), 1500);
    await sendCmd("toggle_overlay", { overlay });
  }

  async function handleTool(tool: string) {
    flash(`Toggle → ${tool}`);
    await sendCmd("toggle_tool", { tool });
  }

  async function handlePage(page: string) {
    flash(`Open → ${page}`);
    await sendCmd("open_page", { page });
  }

  async function handleReset() {
    flash("Reset view");
    await sendCmd("reset_view");
  }

  async function handleSpin() {
    const next = !spinning;
    setSpinning(next);
    flash(next ? "Spin ON" : "Spin OFF");
    await sendCmd("set_spin", { on: next });
  }

  useEffect(() => {
    if (lastCmd) {
      const t = setTimeout(() => setLastCmd(null), 2500);
      return () => clearTimeout(t);
    }
  }, [lastCmd]);

  useEffect(() => {
    return agentBus.on(({ agent, intent, transcript }) => {
      if (agent !== "meridian") return;
      flash(transcript.slice(0, 48));

      const lower = transcript.toLowerCase();

      // Update panel UI state to reflect voice-triggered actions
      const catMap: Record<string, string> = {
        geo: "geo", geopolit: "geo",
        mil: "military", military: "military", army: "military", war: "military",
        fin: "finance", finance: "finance", market: "finance", economic: "finance",
        clim: "climate", climate: "climate", environment: "climate",
        tech: "tech", technolog: "tech", cyber: "tech",
      };
      for (const [kw, cat] of Object.entries(catMap)) {
        if (lower.includes(kw)) { setActiveCat(cat); break; }
      }

      // Reflect overlay toggles in panel UI
      const overlayMap: Record<string, string> = {
        cities: "cities", city: "cities",
        cables: "cables", cable: "cables",
        flights: "flights", flight: "flights",
        countries: "countries", country: "countries", borders: "countries",
        threats: "threats", threat: "threats",
        sanctions: "sanctions", sanction: "sanctions",
        shipping: "shipping", vessels: "shipping", ships: "shipping",
        earthquakes: "eq", quakes: "eq", eq: "eq",
      };
      for (const [kw, overlay] of Object.entries(overlayMap)) {
        if (lower.includes(kw)) {
          setActiveOverlays(prev => {
            const next = new Set(prev);
            next.has(overlay) ? next.delete(overlay) : next.add(overlay);
            return next;
          });
        }
      }
    });
  }, []);

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Open App */}
      <button
        onClick={() => window.open(MERIDIAN_URL, "zeus_app_meridian", "width=1280,height=900,menubar=no,toolbar=no")}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all w-full"
        style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}
      >
        <ExternalLink size={11} />
        OPEN MERIDIAN DASHBOARD
      </button>

      {/* Status */}
      <AnimatePresence>
        {lastCmd && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono"
            style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)", color: "#00d4ff" }}
          >
            <Radio size={9} className="animate-pulse" />
            CMD: {lastCmd}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Story Category</p>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => handleCat(c.id)}
              className="px-2 py-1.5 rounded text-[10px] font-mono transition-all"
              style={{
                background: activeCat === c.id ? `${c.color}18` : "rgba(255,255,255,0.02)",
                border: `1px solid ${activeCat === c.id ? `${c.color}40` : "rgba(255,255,255,0.04)"}`,
                color: activeCat === c.id ? c.color : "#64748b",
              }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overlays */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Overlays</p>
        <div className="grid grid-cols-2 gap-1.5">
          {OVERLAYS.map((o) => {
            const on = activeOverlays.has(o.id);
            return (
              <button key={o.id} onClick={() => handleOverlay(o.id)}
                className="px-2 py-1.5 rounded text-[10px] font-mono transition-all text-left"
                style={{
                  background: on ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${on ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.04)"}`,
                  color: on ? "#00d4ff" : "#64748b",
                }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Analysis Tools */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Analysis Tools</p>
        <div className="grid grid-cols-2 gap-1.5">
          {ANALYSIS_TOOLS.map((t) => (
            <button key={t.id} onClick={() => handleTool(t.id)}
              className="px-2 py-1.5 rounded text-[10px] font-mono text-slate-400 hover:text-white transition-all text-left"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pages / Modes */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Open Mode</p>
        <div className="flex flex-col gap-1.5">
          {PAGES.map((p) => (
            <button key={p.id} onClick={() => handlePage(p.id)}
              className="px-3 py-2 rounded text-[10px] font-mono text-slate-300 hover:text-white transition-all text-left"
              style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.12)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Globe Controls */}
      <div>
        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Globe Controls</p>
        <div className="flex gap-2">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono text-slate-400 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <RefreshCw size={10} /> Reset View
          </button>
          <button onClick={handleSpin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono transition-all"
            style={{
              background: spinning ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${spinning ? "rgba(0,212,255,0.25)" : "rgba(255,255,255,0.04)"}`,
              color: spinning ? "#00d4ff" : "#64748b",
            }}>
            <Globe size={10} /> {spinning ? "Spinning" : "Stopped"}
          </button>
        </div>
      </div>
    </div>
  );
}
