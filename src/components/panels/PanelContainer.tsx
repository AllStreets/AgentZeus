"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AgentInfo } from "@/types";

// Mini versions of the constellation AgentArt SVGs for panel headers
function PanelAgentIcon({ name, color }: { name: string; color: string }) {
  const s = { stroke: color, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const f = { fill: color, fillOpacity: 0.2 };

  switch (name) {
    case "hermes":
      return <svg viewBox="0 0 80 68" width={18} height={16}><rect x="6" y="14" width="68" height="46" rx="3" {...f} stroke={color} strokeWidth="2.5" /><path d="M 6 14 L 40 44 L 74 14" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>;
    case "athena":
      return <svg viewBox="0 0 80 76" width={18} height={17}><polygon points="40,4 72,22 72,54 40,72 8,54 8,22" {...f} stroke={color} strokeWidth="2.5" /><polyline points="28,30 19,38 28,46" {...s} strokeWidth="3.5" /><line x1="37" y1="28" x2="43" y2="48" stroke={color} strokeWidth="3.5" /><polyline points="52,30 61,38 52,46" {...s} strokeWidth="3.5" /></svg>;
    case "apollo":
      return <svg viewBox="0 0 76 76" width={18} height={18}><circle cx="38" cy="38" r="32" {...f} stroke={color} strokeWidth="2.5" /><line x1="9" y1="26" x2="67" y2="26" stroke={color} strokeWidth="2" strokeOpacity="0.6" /><line x1="24" y1="10" x2="24" y2="22" stroke={color} strokeWidth="3" /><line x1="52" y1="10" x2="52" y2="22" stroke={color} strokeWidth="3" /></svg>;
    case "artemis":
      return <svg viewBox="0 0 78 74" width={18} height={17}><polygon points="39,4 74,70 4,70" {...f} stroke={color} strokeWidth="2.5" /><circle cx="39" cy="52" r="11" stroke={color} strokeWidth="2" fill="none" /><circle cx="39" cy="52" r="4" fill={color} fillOpacity="0.6" /></svg>;
    case "ares":
      return <svg viewBox="0 0 72 80" width={16} height={18}><path d="M 36 4 L 66 16 L 66 46 Q 66 66 36 76 Q 6 66 6 46 L 6 16 Z" {...f} stroke={color} strokeWidth="2.5" /><path d="M 44 20 L 30 42 L 39 42 L 28 62 L 46 36 L 36 36 Z" fill={color} fillOpacity="0.6" /></svg>;
    case "hera":
      return <svg viewBox="0 0 80 72" width={18} height={16}><ellipse cx="40" cy="36" rx="34" ry="28" {...f} stroke={color} strokeWidth="2.5" /><path d="M 10 30 Q 16 18 22 30 Q 28 42 34 30 Q 40 18 46 30 Q 52 42 58 30 Q 63 22 70 30" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M 10 43 Q 16 31 22 43 Q 28 55 34 43 Q 40 31 46 43 Q 52 55 58 43 Q 63 35 70 43" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" fill="none" strokeLinecap="round" /></svg>;
    case "meridian":
      return <svg viewBox="0 0 80 80" width={18} height={18}><circle cx="40" cy="40" r="34" {...f} stroke={color} strokeWidth="2.5" /><ellipse cx="40" cy="40" rx="14" ry="34" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" fill="none" /><line x1="6" y1="40" x2="74" y2="40" stroke={color} strokeWidth="1.5" strokeOpacity="0.4" /></svg>;
    case "chicago":
      return <svg viewBox="0 0 84 72" width={18} height={15}><line x1="2" y1="62" x2="82" y2="62" stroke={color} strokeWidth="2.5" /><rect x="26" y="18" width="14" height="44" {...f} stroke={color} strokeWidth="2" rx="1"/><rect x="15" y="36" width="9" height="26" {...f} stroke={color} strokeWidth="1.5" rx="1"/><rect x="42" y="38" width="11" height="24" {...f} stroke={color} strokeWidth="1.5" rx="1"/><rect x="55" y="28" width="9" height="34" {...f} stroke={color} strokeWidth="1.5" rx="1"/></svg>;
    case "flexport":
      return <svg viewBox="0 0 88 72" width={18} height={15}><path d="M 4 46 L 4 54 Q 4 58 10 58 L 70 58 L 80 50 L 80 46 Z" {...f} stroke={color} strokeWidth="2.5" /><rect x="31" y="38" width="14" height="8" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" /><rect x="47" y="38" width="14" height="8" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" /><path d="M 2 64 Q 13 59 24 64 Q 35 69 46 64 Q 57 59 68 64 Q 79 69 88 64" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;
    case "clio":
      return <svg viewBox="0 0 76 80" width={16} height={18}><rect x="8" y="10" width="44" height="58" rx="3" {...f} stroke={color} strokeWidth="2.5" /><line x1="14" y1="30" x2="44" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><line x1="14" y1="40" x2="44" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><line x1="14" y1="50" x2="38" y2="50" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><line x1="58" y1="8" x2="46" y2="72" stroke={color} strokeWidth="3.5" strokeLinecap="round" /></svg>;
    case "poseidon":
      return <svg viewBox="0 0 76 80" width={16} height={18}><path d="M 38 4 Q 68 20 68 48 Q 68 72 38 76 Q 8 72 8 48 Q 8 20 38 4 Z" {...f} stroke={color} strokeWidth="2.5" /><line x1="38" y1="18" x2="38" y2="62" stroke={color} strokeWidth="3" strokeLinecap="round" /><line x1="24" y1="30" x2="52" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><path d="M 14 52 Q 22 46 30 52 Q 38 58 46 52 Q 54 46 62 52" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;
    case "iris":
      return <svg viewBox="0 0 84 68" width={18} height={14}><path d="M 4 34 Q 42 4 80 34 Q 42 64 4 34 Z" {...f} stroke={color} strokeWidth="2.5" /><circle cx="42" cy="34" r="14" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" /><circle cx="42" cy="34" r="5" fill={color} fillOpacity="0.6" /><circle cx="46" cy="30" r="2.5" fill={color} fillOpacity="0.7" /></svg>;
    default:
      return <svg viewBox="0 0 60 60" width={18} height={18}><circle cx="30" cy="30" r="26" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.5" /></svg>;
  }
}

interface PanelContainerProps {
  agent: AgentInfo | null;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PanelContainer({ agent, onClose, children }: PanelContainerProps) {
  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col"
            style={{ backgroundColor: "#070d1e", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}12`, color: agent.color }}
                >
                  <PanelAgentIcon name={agent.name} color={agent.color} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{agent.displayName}</h2>
                  <p className="text-[10px] font-mono text-slate-500">{agent.domain}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
