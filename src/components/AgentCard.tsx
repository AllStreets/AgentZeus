"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";
import { AgentInfo } from "@/types";
import AgentMiniIcon from "./AgentMiniIcon";

interface AgentCardProps {
  agent: AgentInfo;
  isActive: boolean;
  lastMessage?: string;
  onClick?: () => void;
}

// Deterministic pseudo-random bar heights per agent name
function getBarSeeds(name: string): number[] {
  const seeds = [];
  for (let i = 0; i < 5; i++) {
    let h = 0;
    for (let j = 0; j < name.length; j++) h += name.charCodeAt(j) * (i + 1) * (j + 1);
    seeds.push(0.25 + (h % 100) / 133);
  }
  return seeds;
}

function ActivityBars({ color, isActive, seeds }: { color: string; isActive: boolean; seeds: number[] }) {
  const [heights, setHeights] = useState(seeds);
  const lastUpdate = useRef(0);

  useAnimationFrame((t) => {
    if (!isActive) return;
    if (t - lastUpdate.current < 180) return;
    lastUpdate.current = t;
    setHeights((prev) =>
      prev.map((h) => {
        const next = h + (Math.random() - 0.48) * 0.35;
        return Math.min(0.95, Math.max(0.12, next));
      })
    );
  });

  return (
    <div className="flex items-end gap-px" style={{ height: 16, width: 30 }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: h * 16 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          style={{
            width: 4,
            backgroundColor: isActive ? color : "rgba(255,255,255,0.08)",
            borderRadius: 1,
            opacity: isActive ? 0.7 + h * 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
}

export default function AgentCard({ agent, isActive, lastMessage, onClick }: AgentCardProps) {
  const seeds = getBarSeeds(agent.name);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative rounded-lg cursor-pointer select-none overflow-hidden"
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        borderColor: isActive
          ? `${agent.color}55`
          : hovered
          ? `${agent.color}22`
          : "rgba(255,255,255,0.05)",
      }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25 }}
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: isActive
          ? `linear-gradient(135deg, ${agent.color}0a 0%, rgba(0,0,0,0) 60%)`
          : "rgba(255,255,255,0.015)",
        minHeight: 100,
      }}
    >
      {/* Top accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }}
        animate={{ opacity: isActive ? 1 : hovered ? 0.4 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Corner brackets */}
      {[
        { top: 4, left: 4, borderTop: true, borderLeft: true },
        { top: 4, right: 4, borderTop: true, borderRight: true },
        { bottom: 4, left: 4, borderBottom: true, borderLeft: true },
        { bottom: 4, right: 4, borderBottom: true, borderRight: true },
      ].map((corner, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 pointer-events-none"
          style={{
            top: corner.top,
            left: corner.left,
            right: corner.right,
            bottom: corner.bottom,
            borderColor: agent.color,
            borderTopWidth: corner.borderTop ? 1 : 0,
            borderLeftWidth: corner.borderLeft ? 1 : 0,
            borderBottomWidth: corner.borderBottom ? 1 : 0,
            borderRightWidth: corner.borderRight ? 1 : 0,
          }}
          animate={{ opacity: isActive ? 0.8 : hovered ? 0.4 : 0 }}
          transition={{ duration: 0.3 }}
        />
      ))}

      {/* Scan line sweep when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${agent.color}06 50%, transparent 100%)`,
          }}
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
        />
      )}

      {/* Radial glow on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${agent.color}08 0%, transparent 70%)`,
        }}
        animate={{ opacity: hovered || isActive ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="relative z-10 p-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5">
          {/* Icon with ring */}
          <div className="relative shrink-0">
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ border: `1px solid ${agent.color}`, opacity: 0 }}
              animate={isActive ? { opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] } : { opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${agent.color}14`,
                color: agent.color,
                boxShadow: isActive ? `0 0 10px ${agent.color}30` : "none",
              }}
            >
              <AgentMiniIcon name={agent.name} color={agent.color} size={14} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[11px] font-semibold text-white leading-tight truncate tracking-wide">
              {agent.displayName}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono truncate uppercase tracking-wider">
              {agent.domain}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: agent.color }}
              animate={isActive ? { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] } : { opacity: 0.2 }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </div>
        </div>

        {/* Bottom row: message + activity bars (only when active) */}
        <div className="flex items-end justify-between gap-2">
          <p className="text-[9px] text-slate-500 leading-relaxed line-clamp-2 flex-1 font-mono">
            {lastMessage
              ? <span style={{ color: `${agent.color}cc` }}>{lastMessage.slice(0, 52)}{lastMessage.length > 52 ? "…" : ""}</span>
              : agent.description}
          </p>
          {isActive && <ActivityBars color={agent.color} isActive={isActive} seeds={seeds} />}
        </div>
      </div>
    </motion.div>
  );
}
