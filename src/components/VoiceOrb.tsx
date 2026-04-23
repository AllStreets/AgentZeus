"use client";

import { motion } from "framer-motion";
import ParticleField from "./ParticleField";

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export default function VoiceOrb({ isListening, isSpeaking, isProcessing, onClick }: VoiceOrbProps) {
  const isActive = isListening || isSpeaking || isProcessing;

  const getGlowColor = () => {
    if (isListening) return "rgba(59, 130, 246, 0.6)";
    if (isProcessing) return "rgba(245, 158, 11, 0.6)";
    if (isSpeaking) return "rgba(16, 185, 129, 0.6)";
    return "rgba(59, 130, 246, 0.2)";
  };

  const getLabel = () => {
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    return "Click or press Space";
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative w-32 h-32">
        <ParticleField isActive={isActive} color={isListening ? "#3b82f6" : isProcessing ? "#f59e0b" : "#10b981"} />

        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            scale: isActive ? [1, 1.3, 1] : 1,
            opacity: isActive ? [0.3, 0, 0.3] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            border: `1px solid ${getGlowColor()}`,
          }}
        />

        {/* Main orb */}
        <motion.button
          onClick={onClick}
          className="absolute inset-4 rounded-full cursor-pointer flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${getGlowColor()}, rgba(6, 11, 24, 0.8))`,
            boxShadow: `0 0 30px ${getGlowColor()}, 0 0 60px ${getGlowColor().replace("0.6", "0.2")}`,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            scale: isActive ? [1, 1.04, 1] : 1,
          }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <motion.div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: getGlowColor().replace("0.6", "0.9").replace("0.2", "0.9") }}
            animate={{
              scale: isListening ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </motion.button>
      </div>

      <motion.span
        className="text-sm font-mono text-slate-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {getLabel()}
      </motion.span>
    </div>
  );
}
