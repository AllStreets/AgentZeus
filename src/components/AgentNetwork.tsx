"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";
import { AgentInfo, AgentName } from "@/types";
import AgentIcon from "./AgentIcon";

interface Props {
  agents: AgentInfo[];
  zeusAgent: AgentInfo;
  activeAgent: AgentName | null;
  agentMessages: Record<string, string>;
  onSelectAgent: (name: AgentName) => void;
}

// SVG canvas dimensions
const W = 400;
const H = 278;
const CX = W / 2;
const CY = H / 2 + 2;
const RX = 148;
const RY = 100;

function getPos(i: number, total: number) {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle) };
}

// ─── Traveling data particles along a synapse ─────────────────────────────
function Particles({
  x1, y1, x2, y2, color,
}: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const refs = useRef<(SVGCircleElement | null)[]>([null, null, null]);
  const phases = useRef([0, 0.38, 0.72]);

  useAnimationFrame((_t, delta) => {
    phases.current = phases.current.map(p => (p + delta * 0.00044) % 1);
    phases.current.forEach((phase, idx) => {
      const el = refs.current[idx];
      if (!el) return;
      el.setAttribute("cx", (x1 + (x2 - x1) * phase).toFixed(1));
      el.setAttribute("cy", (y1 + (y2 - y1) * phase).toFixed(1));
      el.setAttribute("opacity", (Math.sin(phase * Math.PI) * 0.9).toFixed(3));
    });
  });

  return (
    <>
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          ref={el => { refs.current[i] = el; }}
          r={2.4}
          fill={color}
          opacity={0}
        />
      ))}
    </>
  );
}

// ─── Synapse line from Zeus to agent ──────────────────────────────────────
function Synapse({
  x1, y1, x2, y2, color, isActive, isHovered,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; isActive: boolean; isHovered: boolean;
}) {
  const dashRef = useRef<SVGLineElement | null>(null);
  const phaseRef = useRef(Math.random() * 12);

  useAnimationFrame((_t, delta) => {
    if (!dashRef.current || !isActive) return;
    phaseRef.current += delta * 0.018;
    dashRef.current.setAttribute("stroke-dashoffset", (-(phaseRef.current % 12)).toFixed(2));
  });

  const show = isActive || isHovered;

  return (
    <g>
      {/* Wide glow behind line */}
      {show && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={isActive ? 9 : 4}
          strokeOpacity={isActive ? 0.18 : 0.08}
          filter="url(#glow-blur)"
          strokeLinecap="round"
        />
      )}
      {/* Crisp base line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={show ? color : "#ffffff"}
        strokeWidth={isActive ? 1.2 : isHovered ? 0.9 : 0.5}
        strokeOpacity={isActive ? 0.85 : isHovered ? 0.4 : 0.055}
        strokeLinecap="round"
      />
      {/* Animated dashes (flow effect) */}
      {isActive && (
        <line
          ref={dashRef}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={1.6}
          strokeOpacity={0.55}
          strokeDasharray="5 8"
          strokeLinecap="round"
        />
      )}
      {/* Data packets */}
      {isActive && <Particles x1={x1} y1={y1} x2={x2} y2={y2} color={color} />}
    </g>
  );
}

// ─── Zeus nucleus ─────────────────────────────────────────────────────────
function ZeusNucleus({
  agent, isActive,
}: { agent: AgentInfo; isActive: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ width: 68 }}>
      <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
        {/* Slow outer ripple rings */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 52 + i * 22,
              height: 52 + i * 22,
              top: "50%", left: "50%",
              marginLeft: -(26 + i * 11),
              marginTop: -(26 + i * 11),
              border: `1px solid ${agent.color}`,
            }}
            animate={{
              opacity: [0.28 - i * 0.07, 0.04, 0.28 - i * 0.07],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 2.8 + i * 0.9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Active surge ring */}
        {isActive && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -2, border: `2px solid ${agent.color}` }}
            animate={{ opacity: [0.8, 0.2, 0.8], scale: [1, 1.18, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main nucleus */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 38% 36%, ${agent.color}28 0%, ${agent.color}0c 55%, transparent 100%)`,
            border: `2px solid ${agent.color}`,
          }}
          animate={{
            borderColor: isActive
              ? [agent.color, `${agent.color}77`, agent.color]
              : [`${agent.color}88`, `${agent.color}44`, `${agent.color}88`],
            boxShadow: isActive
              ? [
                  `0 0 22px ${agent.color}40, inset 0 0 16px ${agent.color}12`,
                  `0 0 48px ${agent.color}70, inset 0 0 28px ${agent.color}22`,
                  `0 0 22px ${agent.color}40, inset 0 0 16px ${agent.color}12`,
                ]
              : [
                  `0 0 10px ${agent.color}20`,
                  `0 0 20px ${agent.color}35`,
                  `0 0 10px ${agent.color}20`,
                ],
          }}
          transition={{ duration: isActive ? 1.5 : 3.0, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Icon */}
        <span
          className="relative z-10 flex"
          style={{ color: agent.color }}
        >
          <AgentIcon icon={agent.icon} size={20} />
        </span>
      </div>

      <motion.span
        className="font-mono tracking-[0.18em]"
        style={{ fontSize: 7, color: agent.color }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        ZEUS
      </motion.span>
    </div>
  );
}

// ─── Agent node ───────────────────────────────────────────────────────────
function AgentNode({
  agent, isActive, isHovered, onClick, onMouseEnter, onMouseLeave,
}: {
  agent: AgentInfo; isActive: boolean; isHovered: boolean;
  onClick: () => void; onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-[3px] cursor-pointer select-none"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      animate={{ scale: isActive ? 1.14 : isHovered ? 1.08 : 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{ width: 50 }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
        {/* Pulse expand rings on active */}
        {isActive && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `1px solid ${agent.color}` }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `1px solid ${agent.color}` }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut", delay: 0.55 }}
            />
          </>
        )}

        {/* Static dim border (always present) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: `1.5px solid ${agent.color}22` }}
        />

        {/* Active / hover border */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            opacity: isActive ? 1 : isHovered ? 0.55 : 0,
            boxShadow: isActive
              ? [
                  `0 0 10px ${agent.color}35, inset 0 0 8px ${agent.color}0c`,
                  `0 0 22px ${agent.color}65, inset 0 0 14px ${agent.color}18`,
                  `0 0 10px ${agent.color}35, inset 0 0 8px ${agent.color}0c`,
                ]
              : `0 0 6px ${agent.color}25`,
          }}
          transition={{ duration: isActive ? 1.6 : 0.3, repeat: isActive ? Infinity : 0 }}
          style={{ border: `1.5px solid ${agent.color}` }}
        />

        {/* Fill */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: isActive
              ? `radial-gradient(circle at 40% 38%, ${agent.color}20 0%, ${agent.color}06 65%, transparent 100%)`
              : isHovered
              ? `radial-gradient(circle at 40% 38%, ${agent.color}12 0%, transparent 70%)`
              : "rgba(6,11,24,0.92)",
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Icon */}
        <motion.span
          className="relative z-10 flex"
          animate={{ color: isActive ? agent.color : isHovered ? `${agent.color}cc` : `${agent.color}55` }}
          transition={{ duration: 0.25 }}
          style={{ color: `${agent.color}55` }}
        >
          <AgentIcon icon={agent.icon} size={13} />
        </motion.span>
      </div>

      {/* Label */}
      <motion.span
        className="font-mono leading-none text-center block"
        style={{
          fontSize: 6.5,
          letterSpacing: "0.05em",
          maxWidth: 50,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        animate={{ color: isActive ? agent.color : isHovered ? "#94a3b8" : "#2d3f55" }}
        transition={{ duration: 0.25 }}
      >
        {agent.displayName.toUpperCase()}
      </motion.span>
    </motion.div>
  );
}

// ─── Main network ─────────────────────────────────────────────────────────
export default function AgentNetwork({
  agents, zeusAgent, activeAgent, agentMessages, onSelectAgent,
}: Props) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  return (
    <div className="relative w-full" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="relative w-full" style={{ aspectRatio: `${W}/${H}` }}>

        {/* SVG: synaptic lines */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
          aria-hidden
        >
          <defs>
            <filter id="glow-blur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {agents.map((agent, i) => {
            const pos = getPos(i, agents.length);
            return (
              <Synapse
                key={agent.name}
                x1={CX} y1={CY}
                x2={pos.x} y2={pos.y}
                color={agent.color}
                isActive={activeAgent === agent.name}
                isHovered={hoveredAgent === agent.name}
              />
            );
          })}
        </svg>

        {/* Agent nodes (HTML for icon rendering) */}
        {agents.map((agent, i) => {
          const pos = getPos(i, agents.length);
          return (
            <div
              key={agent.name}
              style={{
                position: "absolute",
                left: `${(pos.x / W) * 100}%`,
                top: `${(pos.y / H) * 100}%`,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
              }}
            >
              <AgentNode
                agent={agent}
                isActive={activeAgent === agent.name}
                isHovered={hoveredAgent === agent.name}
                onClick={() => onSelectAgent(agent.name as AgentName)}
                onMouseEnter={() => setHoveredAgent(agent.name)}
                onMouseLeave={() => setHoveredAgent(null)}
              />
            </div>
          );
        })}

        {/* Zeus nucleus at center */}
        <div
          style={{
            position: "absolute",
            left: `${(CX / W) * 100}%`,
            top: `${(CY / H) * 100}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 20,
          }}
        >
          <ZeusNucleus agent={zeusAgent} isActive={activeAgent !== null} />
        </div>
      </div>

      {/* Active agent status strip */}
      <div style={{ height: 18, marginTop: 2 }}>
        {activeAgent && agentMessages[activeAgent] && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center font-mono truncate px-4"
            style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}
          >
            {agentMessages[activeAgent].slice(0, 90)}
          </motion.p>
        )}
      </div>
    </div>
  );
}
