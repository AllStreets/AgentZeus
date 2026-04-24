"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import ParticleField from "./ParticleField";

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export default function VoiceOrb({ isListening, isSpeaking, isProcessing, onClick }: VoiceOrbProps) {
  const isActive = isListening || isSpeaking || isProcessing;

  const stateColor = isListening ? "#3b82f6" : isProcessing ? "#f59e0b" : isSpeaking ? "#10b981" : "#3b82f6";

  const statusText = isListening ? "LISTENING" : isProcessing ? "PROCESSING" : isSpeaking ? "SPEAKING" : "STANDBY";

  return (
    <div className="relative flex flex-col items-center gap-5">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ParticleField isActive={isActive} color={stateColor} size={160} />

        {/* Outer rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              inset: -8 - i * 12,
              border: `1px solid ${stateColor}`,
            }}
            animate={{
              opacity: isActive ? [0.1, 0.25, 0.1] : 0.04,
              scale: isActive ? [1, 1.02, 1] : 1,
              rotate: isActive ? 360 : 0,
            }}
            transition={{
              opacity: { duration: 2, repeat: Infinity, delay: i * 0.4 },
              scale: { duration: 3, repeat: Infinity, delay: i * 0.3 },
              rotate: { duration: 20 + i * 10, repeat: Infinity, ease: "linear" },
            }}
          />
        ))}

        {/* Main orb button */}
        <motion.button
          onClick={onClick}
          className="absolute inset-6 rounded-full cursor-pointer flex items-center justify-center overflow-hidden"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${stateColor}${isActive ? "30" : "15"}, #060b18 70%)`,
            boxShadow: `0 0 40px ${stateColor}${isActive ? "40" : "15"}, inset 0 0 30px ${stateColor}10`,
            border: `1px solid ${stateColor}${isActive ? "40" : "15"}`,
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
          transition={{ scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
        >
          {/* Waveform bars when active */}
          {isActive ? (
            <div className="flex items-center gap-[3px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ backgroundColor: stateColor }}
                  animate={{ height: [4, 14 + Math.random() * 10, 4] }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          ) : (
            <Mic size={24} className="text-slate-400" />
          )}
        </motion.button>
      </div>

      {/* Status label */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: stateColor }}
          animate={{ opacity: isActive ? [1, 0.3, 1] : 0.5 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">
          {statusText}
        </span>
      </div>
    </div>
  );
}
