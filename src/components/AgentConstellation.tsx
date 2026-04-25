"use client";

import { useAnimationFrame, motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { AgentInfo, AgentName } from "@/types";
import VoiceOrb from "./VoiceOrb";

interface ConstellationProps {
  agents: AgentInfo[];
  activeAgent: AgentName | null;
  activeAgents: AgentName[];
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

// 12 agents evenly distributed at 30° intervals on an ellipse (rx=40, ry=30)
// centered on Zeus at (50, 53), clockwise from top.
// Meridian, Chicago, Flexport are kept adjacent (positions 7-9 on the left).
const AGENT_POS = [
  { x: 50, y: 23 }, // 0   top           (hermes)
  { x: 70, y: 27 }, // 1   upper-right   (clio)
  { x: 85, y: 38 }, // 2   right-upper   (athena)
  { x: 90, y: 53 }, // 3   right         (apollo)
  { x: 85, y: 68 }, // 4   right-lower   (artemis)
  { x: 70, y: 79 }, // 5   lower-right   (ares)
  { x: 50, y: 83 }, // 6   bottom        (hera)
  { x: 30, y: 79 }, // 7   lower-left    (meridian)
  { x: 15, y: 68 }, // 8   left-lower    (chicago)
  { x: 10, y: 53 }, // 9   left          (flexport)
  { x: 15, y: 38 }, // 10  left-upper    (poseidon)
  { x: 30, y: 27 }, // 11  upper-left    (iris)
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
          {/* Top bar — clipped to circle boundary at y=26 */}
          <line x1="9" y1="26" x2="67" y2="26" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.65} />
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

    // ── Hera: memory chip / IC chip ─────────────────────────────────────────
    case "hera":
      return (
        <svg viewBox="0 0 80 80" width={84} height={84}>
          {/* Chip body */}
          <rect x="16" y="16" width="48" height="48" rx="4" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Inner die */}
          <rect x="26" y="26" width="28" height="28" rx="2" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.6} fill={color} fillOpacity={fo * 1.5} />
          {/* Circuit traces on die */}
          <path d="M 32 32 L 32 38 L 38 38" stroke={color} strokeWidth="1.0" strokeOpacity={so * 0.5} fill="none" strokeLinecap="round" />
          <path d="M 48 32 L 48 36 L 42 36 L 42 42" stroke={color} strokeWidth="1.0" strokeOpacity={so * 0.5} fill="none" strokeLinecap="round" />
          <path d="M 32 48 L 38 48 L 38 44" stroke={color} strokeWidth="1.0" strokeOpacity={so * 0.5} fill="none" strokeLinecap="round" />
          <path d="M 48 48 L 44 48 L 44 44" stroke={color} strokeWidth="1.0" strokeOpacity={so * 0.5} fill="none" strokeLinecap="round" />
          {/* Center dot */}
          <circle cx="40" cy="40" r="3" fill={color} fillOpacity={dot * 0.7} />
          {/* Pins — top */}
          {[26, 34, 42, 50].map(x => <line key={`t${x}`} x1={x} y1="16" x2={x} y2="6" stroke={color} strokeWidth="1.8" strokeOpacity={so * 0.7} strokeLinecap="round" />)}
          {/* Pins — bottom */}
          {[26, 34, 42, 50].map(x => <line key={`b${x}`} x1={x} y1="64" x2={x} y2="74" stroke={color} strokeWidth="1.8" strokeOpacity={so * 0.7} strokeLinecap="round" />)}
          {/* Pins — left */}
          {[26, 34, 42, 50].map(y => <line key={`l${y}`} x1="16" y1={y} x2="6" y2={y} stroke={color} strokeWidth="1.8" strokeOpacity={so * 0.7} strokeLinecap="round" />)}
          {/* Pins — right */}
          {[26, 34, 42, 50].map(y => <line key={`r${y}`} x1="64" y1={y} x2="74" y2={y} stroke={color} strokeWidth="1.8" strokeOpacity={so * 0.7} strokeLinecap="round" />)}
        </svg>
      );

    // ── Meridian: globe with realistic continent silhouettes and location pin ─
    case "meridian":
      return (
        <svg viewBox="0 0 80 80" width={84} height={84}>
          <defs>
            <clipPath id="globe-clip"><circle cx="40" cy="40" r="34" /></clipPath>
          </defs>
          <circle cx="40" cy="40" r="34" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          <g clipPath="url(#globe-clip)">
            {/* Subtle grid */}
            <line x1="6" y1="40" x2="74" y2="40" stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.15} />
            <path d="M 8 28 Q 40 20 72 28" stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.12} fill="none" />
            <path d="M 8 52 Q 40 60 72 52" stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.12} fill="none" />
            <ellipse cx="40" cy="40" rx="14" ry="34" stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.15} fill="none" />

            {/* North America — Alaska hook, wide Canada, Great Lakes indent, Florida peninsula, Mexico tapering to Central America isthmus */}
            <path d="M 8 22 C 9 20, 11 18, 13 19 C 14 17, 16 16, 18 17 L 20 16 L 23 17 L 26 18 L 28 17 L 29 19 L 28 21 L 30 22 L 29 24 L 27 23 L 25 24 C 26 26, 27 27, 26 29 L 24 28 L 23 30 L 25 32 L 24 34 L 22 33 L 20 35 L 21 37 C 22 38, 23 39, 22 40 L 20 39 L 19 41 L 20 42 L 18 42 L 17 40 L 15 38 L 13 36 L 11 32 L 10 28 L 9 25 Z"
              fill={color} fillOpacity={fo * 2.2} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.45} strokeLinejoin="round" />

            {/* South America — broad Brazil shoulder, Amazon coast bulge, tapers through Argentina to Tierra del Fuego */}
            <path d="M 20 44 C 22 43, 24 42, 26 43 C 27 43, 28 44, 29 46 C 30 47, 30 49, 29 51 L 28 48 L 29 50 C 29 53, 28 55, 27 57 C 26 59, 25 61, 24 63 C 23 64, 22 65, 21 66 C 20 66, 19 65, 19 63 L 18 60 L 17 56 L 16 52 L 17 48 L 18 46 L 19 45 Z"
              fill={color} fillOpacity={fo * 2.0} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.4} strokeLinejoin="round" />

            {/* Europe — Scandinavian peninsula, British Isles dot, Iberian peninsula, Italian boot, Balkans */}
            <path d="M 35 16 C 36 15, 37 14, 39 15 L 41 14 L 43 15 C 44 15, 45 16, 44 18 L 46 18 C 47 19, 47 21, 46 22 L 44 21 L 43 23 C 44 24, 45 25, 44 27 L 42 26 C 41 27, 40 28, 39 29 L 37 28 C 37 29, 38 30, 37 31 L 38 32 L 37 34 C 36 34, 35 33, 34 32 L 34 30 L 33 27 L 34 24 L 33 21 L 34 19 Z"
              fill={color} fillOpacity={fo * 2.2} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.45} strokeLinejoin="round" />
            {/* British Isles */}
            <ellipse cx="32" cy="20" rx="2" ry="3" fill={color} fillOpacity={fo * 2.0} stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.35} />

            {/* Africa — Mediterranean coast, West African bulge, Horn of East Africa, Great Rift narrowing, Cape */}
            <path d="M 33 34 C 35 33, 37 34, 39 33 L 42 34 C 44 34, 46 35, 48 36 L 50 37 C 51 38, 51 40, 50 41 L 51 43 C 50 44, 49 43, 48 44 L 47 42 C 46 43, 46 45, 47 47 C 47 49, 46 51, 45 53 C 44 55, 43 57, 42 58 C 41 60, 40 61, 39 61 C 38 61, 37 60, 37 58 L 36 55 L 35 52 L 34 48 L 33 44 L 32 40 L 32 37 Z"
              fill={color} fillOpacity={fo * 2.0} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.4} strokeLinejoin="round" />
            {/* Madagascar */}
            <path d="M 50 52 L 51 50 L 52 52 L 51 55 Z" fill={color} fillOpacity={fo * 1.6} stroke={color} strokeWidth="0.3" strokeOpacity={so * 0.3} />

            {/* Asia — Middle East, Central Asia plateau, Siberia, Korea/Japan peninsula, Kamchatka */}
            <path d="M 48 20 C 50 18, 53 16, 56 15 L 59 14 C 62 14, 65 16, 67 18 C 69 20, 70 22, 69 25 L 71 26 C 71 28, 70 30, 68 30 L 66 29 C 65 30, 64 32, 65 34 L 63 35 C 61 34, 59 35, 58 34 L 56 36 C 54 35, 52 34, 51 33 L 49 34 L 48 32 L 47 29 L 48 26 L 47 23 Z"
              fill={color} fillOpacity={fo * 2.0} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.4} strokeLinejoin="round" />
            {/* India — triangular peninsula */}
            <path d="M 53 36 C 55 36, 56 37, 57 39 C 57 41, 56 43, 54 45 C 53 44, 52 42, 51 40 C 51 38, 52 37, 53 36 Z"
              fill={color} fillOpacity={fo * 1.8} stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.35} />
            {/* Southeast Asia + Indonesia archipelago */}
            <path d="M 60 36 C 62 37, 63 36, 64 38 L 66 37 C 67 38, 67 40, 66 41 L 63 40 L 61 39 Z"
              fill={color} fillOpacity={fo * 1.5} stroke={color} strokeWidth="0.4" strokeOpacity={so * 0.3} />
            {/* Japan arc */}
            <path d="M 68 24 C 69 22, 71 23, 70 26 C 69 28, 68 27, 68 24 Z"
              fill={color} fillOpacity={fo * 1.4} stroke={color} strokeWidth="0.3" strokeOpacity={so * 0.3} />

            {/* Australia — distinctive shape with Gulf of Carpentaria indent */}
            <path d="M 60 49 C 63 47, 66 47, 69 49 C 71 50, 72 53, 71 55 C 70 57, 68 58, 66 58 C 64 58, 62 57, 60 55 C 59 53, 58 51, 60 49 Z"
              fill={color} fillOpacity={fo * 1.8} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.35} />
          </g>
          {/* Location pin on Europe */}
          <circle cx="40" cy="24" r="3" stroke={color} strokeWidth="1.2" strokeOpacity={so} fill={color} fillOpacity={dot * 0.6} />
          <circle cx="40" cy="24" r="1.2" fill={color} fillOpacity={dot} />
          <path d="M 40 27 L 38 31 L 42 31 Z" fill={color} fillOpacity={dot * 0.7} />
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

    // ── Clio: notepad with ruled lines and pen ───────────────────────────────
    case "clio":
      return (
        <svg viewBox="0 0 76 80" width={80} height={84}>
          {/* Notepad body */}
          <rect x="8" y="10" width="44" height="58" rx="3" {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Top binding strip */}
          <rect x="8" y="10" width="44" height="9" rx="2" fill={color} fillOpacity={fo * 2.0} stroke={color} strokeWidth="0.5" strokeOpacity={so * 0.5} />
          {/* Binding holes */}
          {[20, 30, 40].map((cx) => (
            <circle key={cx} cx={cx} cy={14.5} r="2.5" fill={color} fillOpacity={dot} />
          ))}
          {/* Ruled lines */}
          <line x1="14" y1="30" x2="44" y2="30" stroke={color} strokeWidth="1.8" strokeOpacity={so} strokeLinecap="round" />
          <line x1="14" y1="40" x2="44" y2="40" stroke={color} strokeWidth="1.8" strokeOpacity={so} strokeLinecap="round" />
          <line x1="14" y1="50" x2="38" y2="50" stroke={color} strokeWidth="1.8" strokeOpacity={so} strokeLinecap="round" />
          <line x1="14" y1="60" x2="42" y2="60" stroke={color} strokeWidth="1.4" strokeOpacity={so * 0.65} strokeLinecap="round" />
          {/* Pen (diagonal, crossing the notepad) */}
          <line x1="58" y1="8" x2="46" y2="72" stroke={color} strokeWidth="2.8" strokeOpacity={so} strokeLinecap="round" />
          {/* Pen nib */}
          <path d="M 46 72 L 42 78 L 48 68 Z" fill={color} fillOpacity={dot} strokeWidth="0" />
        </svg>
      );

    // ── Poseidon: magnifying glass over interconnected web nodes ─────────────
    case "poseidon":
      return (
        <svg viewBox="0 0 80 80" width={84} height={84}>
          {/* Web network nodes */}
          <circle cx="22" cy="24" r="3.5" fill={color} fillOpacity={dot * 0.7} />
          <circle cx="56" cy="18" r="3.5" fill={color} fillOpacity={dot * 0.7} />
          <circle cx="16" cy="52" r="3.5" fill={color} fillOpacity={dot * 0.7} />
          <circle cx="48" cy="48" r="3.5" fill={color} fillOpacity={dot * 0.7} />
          <circle cx="64" cy="40" r="3.5" fill={color} fillOpacity={dot * 0.7} />
          <circle cx="36" cy="36" r="3.5" fill={color} fillOpacity={dot * 0.9} />
          {/* Network connections */}
          <line x1="22" y1="24" x2="56" y2="18" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="22" y1="24" x2="36" y2="36" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="22" y1="24" x2="16" y2="52" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="56" y1="18" x2="64" y2="40" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="56" y1="18" x2="36" y2="36" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="36" y1="36" x2="48" y2="48" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="36" y1="36" x2="16" y2="52" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="48" y1="48" x2="64" y2="40" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          <line x1="48" y1="48" x2="16" y2="52" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.35} />
          {/* Magnifying glass */}
          <circle cx="42" cy="38" r="18" stroke={color} strokeWidth={sw} strokeOpacity={so} fill={color} fillOpacity={fo * 0.6} />
          <line x1="55" y1="51" x2="70" y2="70" stroke={color} strokeWidth="3" strokeOpacity={so} strokeLinecap="round" />
          {/* Search highlight — inner ring */}
          <circle cx="42" cy="38" r="10" stroke={color} strokeWidth={sw2} strokeOpacity={so * 0.4} fill="none" />
          {/* Glint */}
          <path d="M 32 30 Q 36 24 42 26" stroke={color} strokeWidth="1.4" strokeOpacity={so * 0.6} fill="none" strokeLinecap="round" />
        </svg>
      );

    // ── Iris: eye with rainbow iris ──────────────────────────────────────────
    case "iris":
      return (
        <svg viewBox="0 0 84 68" width={88} height={72}>
          {/* Eye outline */}
          <path d="M 4 34 Q 42 4 80 34 Q 42 64 4 34 Z"
            {...F} stroke={color} strokeWidth={sw} strokeOpacity={so} />
          {/* Outer iris */}
          <circle cx="42" cy="34" r="14" stroke={color} strokeWidth="1.6" strokeOpacity={so} fill={color} fillOpacity={fo * 1.6} />
          {/* Inner iris ring */}
          <circle cx="42" cy="34" r="9" stroke={color} strokeWidth="1.0" strokeOpacity={so * 0.7} fill="none" />
          {/* Pupil */}
          <circle cx="42" cy="34" r="5" fill={color} fillOpacity={dot} />
          {/* Highlight */}
          <circle cx="46" cy="30" r="2.5" fill={color} fillOpacity={dot * 0.9} />
          {/* Iris detail lines */}
          <line x1="42" y1="20" x2="42" y2="24" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.4} />
          <line x1="42" y1="44" x2="42" y2="48" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.4} />
          <line x1="28" y1="34" x2="32" y2="34" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.4} />
          <line x1="52" y1="34" x2="56" y2="34" stroke={color} strokeWidth="0.8" strokeOpacity={so * 0.4} />
        </svg>
      );

    default:
      return <svg viewBox="0 0 60 60" width={64} height={64}><circle cx="30" cy="30" r="26" fill={color} fillOpacity={fo} stroke={color} strokeWidth={sw} strokeOpacity={so} /></svg>;
  }
}

// ─── Synaptic field ───────────────────────────────────────────────────────────
function SynapticField({ agents, activeAgent, activeAgents, openPanel, hoveredAgent }: {
  agents: AgentInfo[]; activeAgent: string | null; activeAgents: string[]; openPanel: string | null; hoveredAgent: string | null;
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

      const isActive  = activeAgent === agent.name || activeAgents.includes(agent.name);
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
  agents, activeAgent, activeAgents, openPanel, agentMessages, onSelectAgent,
  isListening, isSpeaking, isProcessing, onOrbClick,
  response, responseAgent, transcript, interimTranscript,
}: ConstellationProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  return (
    <div className="absolute inset-0">
      <SynapticField
        agents={agents}
        activeAgent={activeAgent}
        activeAgents={activeAgents}
        openPanel={openPanel}
        hoveredAgent={hoveredAgent}
      />

      {agents.map((agent, i) => {
        const pos = AGENT_POS[i];
        const isLit = activeAgent === agent.name || activeAgents.includes(agent.name) || openPanel === agent.name;
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
