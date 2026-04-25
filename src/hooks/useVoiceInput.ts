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
  // Improvements over the previous version:
  //   • Peak amplitude (not RMS) — clap transients are ~2ms; RMS over 512 samples
  //     dilutes them so much they often fall below the threshold entirely.
  //   • Adaptive noise floor — self-calibrates to the room so the effective
  //     threshold rises/falls with background noise automatically.
  //   • Requires QUIET_FRAMES consecutive quiet frames before a clap can register —
  //     far more robust than a single-frame silence check.
  //   • DECAY_MS suppression window after each clap so its natural ring-down
  //     can't re-trigger the detector.
  //   • Clap must exceed both an absolute floor AND be CLAP_RATIO × the noise floor,
  //     so speech (sustained, much less spiky) is filtered out.
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyserRef: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;

    // Adaptive state
    let noiseFloor    = 0.02;  // rolling background peak — self-calibrates
    let quietFrames   = 0;     // consecutive frames below the quiet threshold
    let inDecay       = false; // suppression window after a clap fires
    let decayEndAt    = 0;
    let firstClapAt   = 0;
    let lastTriggerAt = 0;

    // Tuning constants
    const QUIET_FRAMES   = 5;    // ~83 ms of quiet needed before each clap (at 60fps)
    const DECAY_MS       = 130;  // ignore audio for 130 ms after a clap to skip ring-down
    const MIN_GAP_MS     = 150;  // two claps < 150 ms apart = one hit, reject
    const MAX_GAP_MS     = 900;  // second clap must arrive within 900 ms
    const COOLDOWN_MS    = 1800; // lockout after a successful double-clap
    const CLAP_RATIO     = 7.0;  // peak must be 7× above noise floor
    const ABS_MIN_THRESH = 0.15; // absolute floor regardless of noise calibration

    function tick() {
      rafId = requestAnimationFrame(tick);
      if (!audioCtx || audioCtx.state !== "running" || !analyserRef) return;

      const buf = new Float32Array(analyserRef.fftSize);
      analyserRef.getFloatTimeDomainData(buf);

      // Peak amplitude — the key improvement. A 2 ms clap transient is buried in
      // RMS but shows up clearly as a peak in the raw waveform.
      let peak = 0, rmsSum = 0;
      for (let i = 0; i < buf.length; i++) {
        const abs = Math.abs(buf[i]);
        if (abs > peak) peak = abs;
        rmsSum += buf[i] * buf[i];
      }
      const rms = Math.sqrt(rmsSum / buf.length);

      const now = Date.now();

      // ── Adaptive noise floor ─────────────────────────────────────────────
      // During quiet frames pull the floor down slowly; during loud frames
      // let it creep up just enough to track a noisy room.
      const quietCeiling = Math.max(0.07, noiseFloor * 2.2);
      if (peak < quietCeiling) {
        quietFrames++;
        noiseFloor = noiseFloor * 0.994 + peak * 0.006;
      } else {
        quietFrames = 0;
        noiseFloor  = noiseFloor * 0.997 + peak * 0.003;
      }
      // Clamp so the floor never drifts into pathological territory
      noiseFloor = Math.max(0.008, Math.min(0.09, noiseFloor));

      // ── Suppress during clap decay ────────────────────────────────────────
      if (inDecay) {
        if (now >= decayEndAt) inDecay = false;
        audioLevel.current = rms;
        return;
      }

      // ── Clap event: enough silence + strong enough spike ─────────────────
      const dynamicThresh = Math.max(ABS_MIN_THRESH, noiseFloor * CLAP_RATIO);
      if (quietFrames >= QUIET_FRAMES && peak > dynamicThresh) {
        inDecay      = true;
        decayEndAt   = now + DECAY_MS;
        quietFrames  = 0;

        if (now - lastTriggerAt > COOLDOWN_MS) {
          const gap = now - firstClapAt;
          if (firstClapAt > 0 && gap >= MIN_GAP_MS && gap <= MAX_GAP_MS) {
            // ✓ Valid double-clap
            toggleRef.current();
            lastTriggerAt = now;
            firstClapAt   = 0;
          } else {
            firstClapAt = now;
          }
        }
      }

      // Expire a stale first-clap
      if (firstClapAt > 0 && now - firstClapAt > MAX_GAP_MS) firstClapAt = 0;

      // Drive the orb visualizer
      audioLevel.current = rms;
    }

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;              // smaller = finer time resolution (~5.8 ms)
        analyser.smoothingTimeConstant = 0.0; // raw frames — essential for transient peaks
        source.connect(analyser);
        analyserRef = analyser;
        audioCtx.resume().catch(() => {});
        tick();
      } catch {
        // No mic permission yet — gesture handler below will retry
      }
    }

    function onGesture() {
      if (audioCtx) {
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      } else {
        init();
      }
    }

    window.addEventListener("click",    onGesture, { passive: true, capture: true });
    window.addEventListener("keydown",  onGesture, { passive: true, capture: true });
    window.addEventListener("touchend", onGesture, { passive: true, capture: true });

    init();

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
