"use client";

import { useState, useCallback, useRef } from "react";

interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === "open") {
      try { mediaSourceRef.current.endOfStream(); } catch { /* ignore */ }
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

      // Use MediaSource for streaming playback — starts playing immediately
      const canStream = typeof MediaSource !== "undefined" && MediaSource.isTypeSupported("audio/mpeg");

      if (canStream) {
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        const url = URL.createObjectURL(mediaSource);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };

        await new Promise<void>((resolve, reject) => {
          mediaSource.addEventListener("sourceopen", async () => {
            try {
              const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
              const reader = response.body!.getReader();
              let started = false;

              const pump = async () => {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    // Wait for any pending updates before ending stream
                    if (sourceBuffer.updating) {
                      await new Promise((r) => sourceBuffer.addEventListener("updateend", r, { once: true }));
                    }
                    if (mediaSource.readyState === "open") mediaSource.endOfStream();
                    break;
                  }
                  if (sourceBuffer.updating) {
                    await new Promise((r) => sourceBuffer.addEventListener("updateend", r, { once: true }));
                  }
                  sourceBuffer.appendBuffer(value);
                  if (!started) {
                    started = true;
                    audio.play().catch(() => {});
                    resolve();
                  }
                }
              };
              pump().catch(reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      } else {
        // Fallback: buffer full response then play
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        await audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, [stop]);

  return { isSpeaking, speak, stop };
}
