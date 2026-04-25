"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef } from "react";
import ParticleField from "./ParticleField";
import { audioLevel } from "@/lib/audioLevel";

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

const WAVE_COUNT = 5;

function OracleWaves({
  isListening,
  isSpeaking,
  isProcessing,
  color,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  color: string;
}) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const centerDotRef = useRef<SVGCircleElement | null>(null);
  const phaseRef = useRef(0);
  const smoothedLevel = useRef(0);

  const isActive = isListening || isSpeaking || isProcessing;

  useAnimationFrame((_t, delta) => {
    const speed = isListening ? 0.005 : isSpeaking ? 0.004 : isProcessing ? 0.003 : 0.0007;
    phaseRef.current += delta * speed;

    // Smooth the raw audio level with a fast attack, slow decay
    const raw = audioLevel.current;
    const attack = raw > smoothedLevel.current ? 0.65 : 0.12;
    smoothedLevel.current = smoothedLevel.current * (1 - attack) + raw * attack;
    const level = smoothedLevel.current;

    // Map audio level to wave amplitude
    // Mic/TTS RMS typically peaks ~0.08–0.35 during speech
    const audioAmplitude = Math.min(36, level * 180);

    const baseAmplitude = isListening
      ? Math.max(5, audioAmplitude)
      : isSpeaking
      ? Math.max(5, audioAmplitude)
      : isProcessing
      ? 8
      : 3;

    const W = 100;
    const H = 100;
    const steps = 48;

    pathRefs.current.forEach((el, w) => {
      if (!el) return;

      // Each wave has a different amplitude scale and frequency
      const waveScale = 0.55 + w * 0.12;
      const amplitude = baseAmplitude * waveScale;
      const freq = 1.35 + w * 0.18;
      const yBase = H * (0.15 + w * 0.175);
      const freqShift = w * (Math.PI * 0.45);

      let d = "";
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * W;
        const y =
          yBase +
          amplitude *
            Math.sin((i / steps) * Math.PI * 2 * freq + phaseRef.current + freqShift);
        d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      el.setAttribute("d", d);

      // Opacity reacts to audio level too
      const baseOpacity = isActive ? 0.15 + (w / WAVE_COUNT) * 0.35 : 0.03 + (w / WAVE_COUNT) * 0.05;
      const audioOpacityBoost = isActive ? level * 1.2 : 0;
      el.setAttribute("stroke-opacity", Math.min(0.9, baseOpacity + audioOpacityBoost).toFixed(3));

      // Center wave is thicker
      el.setAttribute("stroke-width", w === 2 ? "1.5" : "1");
    });

    // Center dot pulses with audio level
    if (centerDotRef.current) {
      const dotR = isActive ? (1.5 + level * 12).toFixed(2) : "0";
      const dotOpacity = isActive ? Math.min(0.9, 0.3 + level * 4) : 0;
      centerDotRef.current.setAttribute("r", dotR);
      centerDotRef.current.setAttribute("fill-opacity", dotOpacity.toFixed(3));
    }
  });

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden
    >
      <defs>
        <clipPath id="orb-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
        <radialGradient id="orb-fade" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="50" fill="url(#orb-fade)" clipPath="url(#orb-clip)" />

      <g clipPath="url(#orb-clip)">
        {Array.from({ length: WAVE_COUNT }).map((_, i) => (
          <path
            key={i}
            ref={(el) => { pathRefs.current[i] = el; }}
            d=""
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeOpacity="0.05"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Center dot — pulses with every loud sound */}
      <circle
        ref={(el) => { centerDotRef.current = el; }}
        cx="50"
        cy="50"
        r="0"
        fill={color}
        fillOpacity="0"
      />
    </svg>
  );
}

// Outer ring that throbs with audio level
function AudioRing({
  color,
  isActive,
  ringIndex,
}: {
  color: string;
  isActive: boolean;
  ringIndex: number;
}) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const smoothed = useRef(0);

  useAnimationFrame(() => {
    if (!ringRef.current) return;
    const raw = audioLevel.current;
    const attack = raw > smoothed.current ? 0.5 : 0.08;
    smoothed.current = smoothed.current * (1 - attack) + raw * attack;
    const lvl = smoothed.current;

    const baseOpacity = isActive ? 0.06 + ringIndex * 0.02 : 0.02;
    const audioOpacity = isActive ? lvl * 0.7 : 0;
    const scale = isActive ? 1 + lvl * (0.04 + ringIndex * 0.02) : 1;

    ringRef.current.style.opacity = Math.min(0.55, baseOpacity + audioOpacity).toFixed(3);
    ringRef.current.style.transform = `scale(${scale.toFixed(4)})`;
  });

  return (
    <div
      ref={ringRef}
      className="absolute rounded-full pointer-events-none"
      style={{
        inset: -8 - ringIndex * 12,
        border: `1px solid ${color}`,
        opacity: 0.02,
        transformOrigin: "center",
        transition: "none",
      }}
    />
  );
}

export default function VoiceOrb({ isListening, isSpeaking, isProcessing, onClick }: VoiceOrbProps) {
  const isActive = isListening || isSpeaking || isProcessing;

  const stateColor = isListening
    ? "#0A84FF"
    : isProcessing
    ? "#f59e0b"
    : isSpeaking
    ? "#10b981"
    : "#0A84FF";

  const statusText = isListening
    ? "LISTENING"
    : isProcessing
    ? "PROCESSING"
    : isSpeaking
    ? "SPEAKING"
    : "STANDBY";

  // Orb glow box-shadow reacts to audio level
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const smoothedGlow = useRef(0);
  useAnimationFrame(() => {
    if (!orbRef.current) return;
    const raw = audioLevel.current;
    const attack = raw > smoothedGlow.current ? 0.55 : 0.08;
    smoothedGlow.current = smoothedGlow.current * (1 - attack) + raw * attack;
    const lvl = smoothedGlow.current;
    const glowSize = isActive ? 40 + lvl * 80 : 20;
    const glowAlpha = isActive ? Math.min(0.7, 0.2 + lvl * 2.5) : 0.06;
    const hex = Math.round(glowAlpha * 255).toString(16).padStart(2, "0");
    orbRef.current.style.boxShadow =
      `0 0 ${glowSize}px ${stateColor}${hex}, 0 0 ${Math.round(glowSize * 0.4)}px ${stateColor}${Math.round(glowAlpha * 0.5 * 255).toString(16).padStart(2,"0")}, inset 0 0 40px ${stateColor}0c`;
  });

  return (
    <div className="relative flex flex-col items-center gap-5">
      <div className="relative" style={{ width: 180, height: 180 }}>
        {/* Audio-reactive outer rings — extend outside this div */}
        {[0, 1, 2].map((i) => (
          <AudioRing key={i} color={stateColor} isActive={isActive} ringIndex={i} />
        ))}

        {/* Main orb — fills full container, blue border at outer edge */}
        <motion.button
          ref={orbRef}
          onClick={onClick}
          className="absolute inset-0 rounded-full cursor-pointer overflow-hidden"
          style={{
            background: `radial-gradient(circle at 38% 32%, ${stateColor}${isActive ? "22" : "0c"} 0%, #060b18 65%)`,
            border: `1.5px solid ${stateColor}${isActive ? "60" : "30"}`,
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          aria-label={statusText}
        >
          <ParticleField isActive={isActive} color={stateColor} size={180} />
          <OracleWaves
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            color={stateColor}
          />
        </motion.button>
      </div>

      {/* Status label */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: stateColor }}
          animate={{ opacity: isActive ? [1, 0.25, 1] : 0.4 }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-[10px] font-mono tracking-[0.22em] text-slate-500 uppercase">
          {statusText}
        </span>
        {!isActive && (
          <span className="text-[9px] font-mono text-slate-700 ml-1">· SPACE or CLAP</span>
        )}
      </div>
    </div>
  );
}
