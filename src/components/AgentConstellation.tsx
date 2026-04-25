"use client";

import { useAnimationFrame, motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { AgentInfo, AgentName } from "@/types";
import VoiceOrb from "./VoiceOrb";

interface ConstellationProps {
  agents: AgentInfo[];
  activeAgent: AgentName | null;
  openPanel: AgentName | null;
  agentMessages: Record<string, string>;
  onSelectAgent: (name: AgentName) => void;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onOrbClick: () => void;
  response: string | null;
  responseAgent: AgentInfo | null;
  transcript: string;
  interimTranscript: string;
}

// Zeus SVG center = CSS 53% (pushed down to clear command bar)
const ZX = 50, ZY = 53;

// All Y shifted +6 from original to clear the command bar at top
const AGENT_POS = [
  { x: 50,   y: 17 }, // 0 top-center   (hermes)
  { x: 76,   y: 26 }, // 1 top-right    (athena)
  { x: 89,   y: 49 }, // 2 right        (apollo)
  { x: 85,   y: 70 }, // 3 bottom-right (artemis)
  { x: 64,   y: 83 }, // 4 btm-r-ctr    (ares)
  { x: 36,   y: 83 }, // 5 btm-l-ctr    (hera)
  { x: 15,   y: 70 }, // 6 bottom-left  (meridian)
  { x: 11,   y: 49 }, // 7 left         (chicago)
  { x: 24,   y: 26 }, // 8 top-left     (flexport)
];

function bezierPt(t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  const u = 1 - t;
  return {
    x: u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3,
    y: u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3,
  };
}

// ─── Custom SVG art per agent ─────────────────────────────────────────────────
function AgentArt({ name, color, lit, hover }: { name: string; color: string; lit: boolean; hover: boolean }) {
  const so  = lit ? 1.0  : hover ? 0.95 : 0.82; // stroke opacity — bright by default
  const fo  = lit ? 0.28 : hover ? 0.22 : 0.15; // fill opacity
  const dot = lit ? 0.85 : hover ? 0.75 : 0.55; // accent dot opacity
  const sw  = "1.4";
  const sw2 = "1.0";

  const S = { stroke: color, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const F = { fill: color, fillOpacity: fo };

  switch (name) {
    // ── Hermes: envelope with fold lines ────────────────────────────────────
    case "hermes":
      return (
        <svg viewBox="0 0 80 68" width={84} height={72}>
          <rect x="6" y="14" width="68" height="46" rx="3" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          <path d="M 6 14 L 40 44 L 74 14" stroke={color} strokeWidth={sw} strokeOpacity={so} fill="none" strokeLinecap="round" />
          <line x1="6" y1="60" x2="28" y2="40" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.5} />
          <line x1="74" y1="60" x2="52" y2="40" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.5} />
        </svg>
      );

    // ── Athena: hexagon with code brackets ───────────────────────────────────
    case "athena":
      return (
        <svg viewBox="0 0 80 76" width={84} height={80}>
          <polygon points="40,4 72,22 72,54 40,72 8,54 8,22" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* < */}
          <polyline points="28,30 19,38 28,46" stroke={color} strokeWidth="2.2" strokeOpacity={so} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* / */}
          <line x1="37" y1="28" x2="43" y2="48" stroke={color} strokeWidth="2.2" strokeOpacity={so} />
          {/* > */}
          <polyline points="52,30 61,38 52,46" stroke={color} strokeWidth="2.2" strokeOpacity={so} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // ── Apollo: circle / calendar with clock hands ────────────────────────────
    case "apollo":
      return (
        <svg viewBox="0 0 76 76" width={80} height={80}>
          <circle cx="38" cy="38" r="32" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Top bar */}
          <line x1="6" y1="26" x2="70" y2="26" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.65} />
          {/* Calendar tabs */}
          <line x1="24" y1="10" x2="24" y2="22" stroke={color} strokeWidth="2" strokeOpacity={so} />
          <line x1="52" y1="10" x2="52" y2="22" stroke={color} strokeWidth="2" strokeOpacity={so} />
          {/* Grid dots */}
          {[18, 30, 42, 54].map(cx => [32, 44, 56].map(cy => (
            <rect key={`${cx}-${cy}`} x={cx - 2} y={cy - 2} width={4} height={4} rx={1}
              fill={color} fillOpacity={so * (cx === 18 && cy === 32 ? dot * 1.4 : dot * 0.8)} />
          )))}
        </svg>
      );

    // ── Artemis: upward triangle with target crosshair ───────────────────────
    case "artemis":
      return (
        <svg viewBox="0 0 78 74" width={82} height={78}>
          <polygon points="39,4 74,70 4,70" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Target rings */}
          <circle cx="39" cy="52" r="11" stroke={color} strokeWidth={sw2} strokeOpacity={so} fill="none" />
          <circle cx="39" cy="52" r="4" fill={color} fillOpacity={dot} />
          {/* Cross */}
          <line x1="39" y1="37" x2="39" y2="43" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.7} />
          <line x1="39" y1="61" x2="39" y2="67" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.7} />
          <line x1="24" y1="52" x2="30" y2="52" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.7} />
          <line x1="48" y1="52" x2="54" y2="52" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.7} />
        </svg>
      );

    // ── Ares: shield with lightning bolt ─────────────────────────────────────
    case "ares":
      return (
        <svg viewBox="0 0 72 80" width={76} height={84}>
          <path d="M 36 4 L 66 16 L 66 46 Q 66 66 36 76 Q 6 66 6 46 L 6 16 Z"
            {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Lightning bolt */}
          <path d="M 44 20 L 30 42 L 39 42 L 28 62 L 46 36 L 36 36 Z"
            fill={color} fillOpacity={dot} stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.6} strokeLinejoin="round" />
        </svg>
      );

    // ── Hera: organic oval with brainwave lines ───────────────────────────────
    case "hera":
      return (
        <svg viewBox="0 0 80 72" width={84} height={76}>
          <ellipse cx="40" cy="36" rx="34" ry="28" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Brainwave 1 */}
          <path d="M 10 30 Q 16 18 22 30 Q 28 42 34 30 Q 40 18 46 30 Q 52 42 58 30 Q 63 22 70 30"
            stroke={color} strokeWidth="1.8" strokeOpacity={so} fill="none" strokeLinecap="round" />
          {/* Brainwave 2 */}
          <path d="M 10 43 Q 16 31 22 43 Q 28 55 34 43 Q 40 31 46 43 Q 52 55 58 43 Q 63 35 70 43"
            stroke={color} strokeWidth="1.2" strokeOpacity={so * 0.5} fill="none" strokeLinecap="round" />
        </svg>
      );

    // ── Meridian: globe with lat/long lines ──────────────────────────────────
    case "meridian":
      return (
        <svg viewBox="0 0 80 80" width={84} height={84}>
          <circle cx="40" cy="40" r="34" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Equator */}
          <line x1="6" y1="40" x2="74" y2="40" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.6} />
          {/* Latitude arcs */}
          <path d="M 9 27 Q 40 18 71 27" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.55} fill="none" />
          <path d="M 9 53 Q 40 62 71 53" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.55} fill="none" />
          {/* Central meridian ellipse */}
          <ellipse cx="40" cy="40" rx="14" ry="34" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.65} fill="none" />
          {/* Pole dots */}
          <circle cx="40" cy="6" r="2.5" fill={color} fillOpacity={dot} />
          <circle cx="40" cy="74" r="2.5" fill={color} fillOpacity={dot} />
        </svg>
      );

    // ── Chicago: city skyline silhouette ─────────────────────────────────────
    case "chicago":
      return (
        <svg viewBox="0 0 84 72" width={88} height={76}>
          {/* Ground line */}
          <line x1="2" y1="62" x2="82" y2="62" stroke={color} strokeWidth="1.8" strokeOpacity={so} />
          {/* Buildings (filled shapes feel more like icons) */}
          <rect x="3"  y="46" width="10" height="16" {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} rx="1"/>
          <rect x="15" y="36" width="9"  height="26" {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} rx="1"/>
          <rect x="26" y="18" width="14" height="44" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} rx="1"/>
          {/* Antenna on tallest */}
          <line x1="33" y1="18" x2="33" y2="7" stroke={color} strokeWidth="1.8" strokeOpacity={so} />
          <line x1="30" y1="12" x2="36" y2="12" stroke={color} strokeWidth="1.2" strokeOpacity={so * 0.7} />
          <rect x="42" y="38" width="11" height="24" {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} rx="1"/>
          <rect x="55" y="28" width="9"  height="34" {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} rx="1"/>
          <rect x="66" y="48" width="16" height="14" {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} rx="1"/>
          {/* Lit windows */}
          {[[28,24],[34,24],[28,32],[34,32],[57,34],[57,42]].map(([x,y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={3} height={3} fill={color} fillOpacity={dot * 0.9} />
          ))}
        </svg>
      );

    // ── Flexport: container ship over water ──────────────────────────────────
    case "flexport":
      return (
        <svg viewBox="0 0 88 72" width={92} height={76}>
          {/* Hull — wide flat bottom, raked bow on right */}
          <path d="M 4 46 L 4 54 Q 4 58 10 58 L 70 58 L 80 50 L 80 46 Z"
            {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Superstructure (bridge tower left of center) */}
          <rect x="10" y="32" width="18" height="14" rx="1"
            {...F} stroke={color} strokeWidth={sw2} strokeOpacity={so} />
          {/* Bridge window strip */}
          <rect x="12" y="34" width="14" height="5" rx="0.5"
            fill={color} fillOpacity={dot * 0.9} />
          {/* Cargo containers — two rows on deck */}
          <rect x="31" y="38" width="14" height="8" rx="1" fill={color} fillOpacity={fo * 1.4} stroke={color} strokeWidth={sw2} strokeOpacity={so} />
          <rect x="47" y="38" width="14" height="8" rx="1" fill={color} fillOpacity={fo * 1.4} stroke={color} strokeWidth={sw2} strokeOpacity={so} />
          <rect x="63" y="38" width="10" height="8" rx="1" fill={color} fillOpacity={fo * 1.2} stroke={color} strokeWidth={sw2} strokeOpacity={so} />
          {/* Container dividers */}
          <line x1="38" y1="38" x2="38" y2="46" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.5} />
          <line x1="54" y1="38" x2="54" y2="46" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.5} />
          {/* Water squiggle */}
          <path d="M 2 64 Q 13 59 24 64 Q 35 69 46 64 Q 57 59 68 64 Q 79 69 88 64"
            stroke={color} strokeWidth="1.8" strokeOpacity={so * 0.75} fill="none" strokeLinecap="round" />
        </svg>
      );

    default:
      return <svg viewBox="0 0 60 60" width={64} height={64}><circle cx="30" cy="30" r="26" fill={color} fillOpacity={fo} stroke={color} strokeWidth={sw} strokeOpacity={so} /></svg>;
  }
}

// ─── Synaptic field ───────────────────────────────────────────────────────────
function SynapticField({ agents, activeAgent, openPanel, hoveredAgent }: {
  agents: AgentInfo[]; activeAgent: string | null; openPanel: string | null; hoveredAgent: string | null;
}) {
  const coreRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRefs = useRef<(SVGPathElement | null)[]>([]);
  const ptRefs   = useRef<(SVGCircleElement | null)[][]>([]);
  const phases   = useRef<number[]>(agents.map((_, i) => i * 0.83));
  const pPhases  = useRef<number[][]>(agents.map(() => [0, 0.35, 0.7]));
  const cpStore  = useRef<{ cp1x: number; cp1y: number; cp2x: number; cp2y: number }[]>(
    agents.map(() => ({ cp1x: 0, cp1y: 0, cp2x: 0, cp2y: 0 }))
  );

  useAnimationFrame((_t, delta) => {
    phases.current = phases.current.map(p => p + delta * 0.00055);

    agents.forEach((agent, i) => {
      const pos = AGENT_POS[i];
      const phase = phases.current[i];
      const ax = pos.x, ay = pos.y;
      const dx = ax - ZX, dy = ay - ZY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len, ny = dx / len;

      const isActive  = activeAgent === agent.name;
      const isPanel   = openPanel === agent.name;
      const isHovered = hoveredAgent === agent.name;
      const isLit     = isActive || isPanel;
      const amp = isLit ? 0.22 : isHovered ? 0.17 : 0.10;

      const cp1x = ZX + dx * 0.28 + nx * len * amp * Math.sin(phase);
      const cp1y = ZY + dy * 0.28 + ny * len * amp * Math.sin(phase);
      const cp2x = ZX + dx * 0.72 + nx * len * amp * Math.cos(phase * 0.7 + 1.1);
      const cp2y = ZY + dy * 0.72 + ny * len * amp * Math.cos(phase * 0.7 + 1.1);
      cpStore.current[i] = { cp1x, cp1y, cp2x, cp2y };

      const d = `M ${ZX} ${ZY} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${ax} ${ay}`;

      const core = coreRefs.current[i];
      if (core) {
        core.setAttribute("d", d);
        core.setAttribute("stroke", isLit || isHovered ? agent.color : "#4a6080");
        core.setAttribute("stroke-width", isLit ? "0.28" : isHovered ? "0.2" : "0.1");
        core.setAttribute("stroke-opacity", isLit ? "0.9" : isHovered ? "0.55" : "0.08");
      }

      const glow = glowRefs.current[i];
      if (glow) {
        glow.setAttribute("d", d);
        glow.setAttribute("stroke", agent.color);
        glow.setAttribute("stroke-width", isLit ? "1.8" : isHovered ? "1.0" : "0.3");
        glow.setAttribute("stroke-opacity", isLit ? "0.22" : isHovered ? "0.1" : "0.018");
      }

      // Particles — keep alive when panel is open
      if (!ptRefs.current[i]) ptRefs.current[i] = [null, null, null];
      if (isLit || isHovered) {
        pPhases.current[i] = pPhases.current[i].map(p => (p + delta * 0.00043) % 1);
      }
      pPhases.current[i].forEach((pp, j) => {
        const el = ptRefs.current[i]?.[j];
        if (!el) return;
        if (!isLit && !isHovered) { el.setAttribute("opacity", "0"); return; }
        const { cp1x, cp1y, cp2x, cp2y } = cpStore.current[i];
        const pt = bezierPt(pp, ZX, ZY, cp1x, cp1y, cp2x, cp2y, ax, ay);
        el.setAttribute("cx", pt.x.toFixed(2));
        el.setAttribute("cy", pt.y.toFixed(2));
        el.setAttribute("fill", agent.color);
        el.setAttribute("opacity", (Math.sin(pp * Math.PI) * (isLit ? 0.9 : 0.5)).toFixed(3));
      });
    });
  });

  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <filter id="syn-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {agents.map((agent, i) => {
        if (!ptRefs.current[i]) ptRefs.current[i] = [null, null, null];
        return (
          <g key={agent.name}>
            <path ref={el => { glowRefs.current[i] = el; }} fill="none" strokeLinecap="round" filter="url(#syn-glow)" />
            <path ref={el => { coreRefs.current[i] = el; }} fill="none" strokeLinecap="round" />
            {[0, 1, 2].map(j => (
              <circle key={j} ref={el => {
                if (!ptRefs.current[i]) ptRefs.current[i] = [null, null, null];
                ptRefs.current[i][j] = el;
              }} r="0.45" opacity={0} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Agent node ───────────────────────────────────────────────────────────────
function AgentNode({ agent, isLit, isHovered, onClick, onMouseEnter, onMouseLeave }: {
  agent: AgentInfo; isLit: boolean; isHovered: boolean;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 cursor-pointer select-none"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        className="relative flex items-center justify-center"
        animate={{ scale: isLit ? 1.12 : isHovered ? 1.06 : 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Expanding glow halo (active / panel open) */}
        {isLit && (
          <>
            <motion.div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${agent.color}28 0%, transparent 65%)` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${agent.color}18 0%, transparent 65%)` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
            />
          </>
        )}

        {/* SVG art — drop-shadow driven by state */}
        <motion.div
          animate={{
            filter: isLit
              ? [
                  `drop-shadow(0 0 6px ${agent.color}70)`,
                  `drop-shadow(0 0 18px ${agent.color}aa)`,
                  `drop-shadow(0 0 6px ${agent.color}70)`,
                ]
              : isHovered
              ? `drop-shadow(0 0 10px ${agent.color}70)`
              : `drop-shadow(0 0 4px ${agent.color}44)`,
          }}
          transition={{ duration: isLit ? 1.6 : 0.3, repeat: isLit ? Infinity : 0 }}
        >
          <AgentArt name={agent.name} color={agent.color} lit={isLit} hover={isHovered} />
        </motion.div>
      </motion.div>

      <motion.span className="font-mono tracking-widest"
        style={{ fontSize: 8, lineHeight: 1 }}
        animate={{ color: isLit ? agent.color : isHovered ? agent.color : `${agent.color}bb` }}
        transition={{ duration: 0.25 }}
      >
        {agent.displayName.toUpperCase()}
      </motion.span>
    </div>
  );
}

// ─── Response strip ───────────────────────────────────────────────────────────
function ResponseStrip({ response, responseAgent, transcript, interimTranscript, isListening, isProcessing }: {
  response: string | null; responseAgent: AgentInfo | null;
  transcript: string; interimTranscript: string;
  isListening: boolean; isProcessing: boolean;
}) {
  const showVoice = isListening && (transcript || interimTranscript);
  const text = isProcessing ? "Processing..." : showVoice ? (transcript || interimTranscript) : response;

  return (
    <AnimatePresence>
      {text && (
        <motion.div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-6"
          style={{
            height: 38,
            background: "rgba(6,11,24,0.88)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            zIndex: 5,
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25 }}
        >
          {showVoice ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
              <span className="font-mono text-[8px] tracking-wider text-blue-400">YOU</span>
            </div>
          ) : responseAgent && !isProcessing ? (
            <div className="flex items-center gap-1.5 shrink-0" style={{ color: responseAgent.color }}>
              <motion.div className="w-1.5 h-1.5 rounded-full"
                style={{ background: responseAgent.color }}
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <span className="font-mono text-[8px] tracking-wider">{responseAgent.displayName.toUpperCase()}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-zeus"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
              <span className="font-mono text-[8px] tracking-wider text-zeus">ZEUS</span>
            </div>
          )}
          <div className="w-px h-3 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="flex-1 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <p className="font-mono text-slate-300 whitespace-nowrap" style={{ fontSize: 9.5 }}>{text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AgentConstellation({
  agents, activeAgent, openPanel, agentMessages, onSelectAgent,
  isListening, isSpeaking, isProcessing, onOrbClick,
  response, responseAgent, transcript, interimTranscript,
}: ConstellationProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  return (
    <div className="absolute inset-0">
      <SynapticField
        agents={agents}
        activeAgent={activeAgent}
        openPanel={openPanel}
        hoveredAgent={hoveredAgent}
      />

      {agents.map((agent, i) => {
        const pos = AGENT_POS[i];
        const isLit = activeAgent === agent.name || openPanel === agent.name;
        return (
          <div key={agent.name} style={{
            position: "absolute",
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 5,
          }}>
            <AgentNode
              agent={agent}
              isLit={isLit}
              isHovered={hoveredAgent === agent.name}
              onClick={() => onSelectAgent(agent.name as AgentName)}
              onMouseEnter={() => setHoveredAgent(agent.name)}
              onMouseLeave={() => setHoveredAgent(null)}
            />
          </div>
        );
      })}

      {/* Zeus nucleus — VoiceOrb, pushed down slightly to match ZY=53 */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "53%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
      }}>
        <VoiceOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          onClick={onOrbClick}
        />
      </div>

      <ResponseStrip
        response={response}
        responseAgent={responseAgent}
        transcript={transcript}
        interimTranscript={interimTranscript}
        isListening={isListening}
        isProcessing={isProcessing}
      />
    </div>
  );
}
