"use client";

import { useState, useCallback, useRef } from "react";

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

  // Call this synchronously inside a user gesture (orb tap) to satisfy mobile autoplay policy.
  // AudioContext and HTMLAudioElement share the same permission on Chrome/Safari.
  const unlockAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    // Play a 1-sample silent buffer to activate the context
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    audioCtxRef.current = ctx;
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      sourceNodeRef.current = null;
    }
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
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;

      // Resume context if suspended (happens after a period of inactivity on mobile)
      if (ctx.state === "suspended") await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start(0);
      sourceNodeRef.current = source;
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, [stop]);

  return { isSpeaking, speak, stop, unlockAudio };
}
