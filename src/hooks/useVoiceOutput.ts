"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { audioLevel } from "@/lib/audioLevel";

interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  unlockAudio: () => void;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsRafRef = useRef<number | null>(null);

  // Poll TTS analyser to drive the orb visualizer
  useEffect(() => {
    const buf = new Float32Array(256);
    function tick() {
      ttsRafRef.current = requestAnimationFrame(tick);
      const analyser = ttsAnalyserRef.current;
      if (!analyser) { audioLevel.current = 0; return; }
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      audioLevel.current = Math.sqrt(sum / buf.length);
    }
    tick();
    return () => {
      if (ttsRafRef.current) cancelAnimationFrame(ttsRafRef.current);
    };
  }, []);

  // Call this synchronously inside a user gesture (orb tap) to satisfy mobile autoplay policy.
  // AudioContext and HTMLAudioElement share the same permission on Chrome/Safari.
  const unlockAudio = useCallback(() => {
    try {
      if (audioCtxRef.current) return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioCtxRef.current = ctx;
    } catch { /* non-fatal — TTS may not work but voice input should */ }
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }
    ttsAnalyserRef.current = null;
    audioLevel.current = 0;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stop();

    const voice = typeof window !== "undefined" ? (localStorage.getItem("tts_voice") || "onyx") : "onyx";

    try {
      setIsSpeaking(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });

      if (!response.ok || !response.body) throw new Error("TTS failed");

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Reuse the unlocked AudioContext — decodeAudioData + BufferSource works on all mobile browsers
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error("AudioContext not supported");
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      // Resume context if suspended (happens after a period of inactivity on mobile)
      if (ctx.state === "suspended") await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Tap an analyser so the orb can visualize TTS audio in real-time
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ttsAnalyserRef.current = analyser;

      source.onended = () => {
        ttsAnalyserRef.current = null;
        audioLevel.current = 0;
        setIsSpeaking(false);
      };
      source.start(0);
      sourceNodeRef.current = source;
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, [stop]);

  return { isSpeaking, speak, stop, unlockAudio };
}
