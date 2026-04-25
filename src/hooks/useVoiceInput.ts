"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { audioLevel } from "@/lib/audioLevel";

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
  recognitionError: string | null;
}

export function useVoiceInput(onFinalTranscript?: (text: string) => void): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const toggleRef = useRef<() => void>(() => {});

  // ── Speech Recognition ──────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) {
        setTranscript(final);
        setInterimTranscript("");
        onFinalTranscript?.(final);
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      setRecognitionError(event.error);
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setInterimTranscript("");
      setRecognitionError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => { toggleRef.current = toggleListening; }, [toggleListening]);

  // ── Double-Clap Detection ────────────────────────────────────────────────
  // Strategy:
  //   1. Request mic + create AudioContext immediately on mount.
  //      getUserMedia doesn't need a gesture if permission was already granted.
  //      AudioContext may start suspended — that's fine.
  //   2. On any user gesture (click/keydown) call resume() so it becomes "running".
  //   3. The tick loop checks state each frame — starts processing the moment it's running.
  //   4. Two rising-edge spikes within MIN_GAP–MAX_GAP ms trigger toggleListening.
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyserRef: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;

    let prevEnergy = 0;
    let firstClapAt = 0;
    let lastTriggerAt = 0;

    const CLAP_SILENCE = 0.04;   // frame must be below this to be "quiet"
    const CLAP_THRESH  = 0.13;   // frame must spike above this to be a "clap"
    const MIN_GAP_MS   = 100;    // two events < 100 ms apart = single hit, ignore
    const MAX_GAP_MS   = 650;    // second clap must arrive within 650 ms
    const COOLDOWN_MS  = 2000;   // lockout after a successful double-clap

    function tick() {
      rafId = requestAnimationFrame(tick);

      // Wait until AudioContext is actually running before processing audio
      if (!audioCtx || audioCtx.state !== "running" || !analyserRef) return;

      const buf = new Float32Array(analyserRef.fftSize);
      analyserRef.getFloatTimeDomainData(buf);

      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);

      const now = Date.now();

      // Detect a rising edge: silence → loud
      if (prevEnergy < CLAP_SILENCE && rms > CLAP_THRESH) {
        if (now - lastTriggerAt > COOLDOWN_MS) {
          if (firstClapAt > 0 && now - firstClapAt >= MIN_GAP_MS && now - firstClapAt <= MAX_GAP_MS) {
            // ✓ Valid double-clap
            toggleRef.current();
            lastTriggerAt = now;
            firstClapAt = 0;
          } else {
            firstClapAt = now;
          }
        }
      }

      // Expire a stale first-clap
      if (firstClapAt > 0 && now - firstClapAt > MAX_GAP_MS) firstClapAt = 0;

      // Drive the orb visualizer with live mic level
      audioLevel.current = rms;
      prevEnergy = rms;
    }

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.0; // raw frames — essential for transient spikes
        source.connect(analyser);
        analyserRef = analyser;

        // Try to resume immediately (works if mic permission was already granted before)
        audioCtx.resume().catch(() => {});

        tick(); // start the loop — will no-op until state === "running"
      } catch {
        // No mic permission yet — gesture handler below will retry
      }
    }

    // Resume (or retry init) on any user interaction — satisfies autoplay policy
    function onGesture() {
      if (audioCtx) {
        // Already have context — just make sure it's running
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      } else {
        // First interaction and init() failed earlier (no permission yet)
        init();
      }
    }

    // Listen on every interaction, not just once — panels may mount after first gesture
    window.addEventListener("click",   onGesture, { passive: true, capture: true });
    window.addEventListener("keydown", onGesture, { passive: true, capture: true });
    window.addEventListener("touchend",onGesture, { passive: true, capture: true });

    init(); // attempt immediately

    return () => {
      window.removeEventListener("click",    onGesture, { capture: true });
      window.removeEventListener("keydown",  onGesture, { capture: true });
      window.removeEventListener("touchend", onGesture, { capture: true });
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening, toggleListening, isSupported, recognitionError };
}
