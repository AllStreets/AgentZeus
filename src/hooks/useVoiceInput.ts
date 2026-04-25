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
  // Root causes of previous failures and what this version fixes:
  //   1. Chrome's default audio processing (echoCancellation, noiseSuppression,
  //      autoGainControl) compresses and mangles clap transients — disabled here.
  //   2. QUIET_FRAMES requirement was the #1 source of false negatives; replaced
  //      with a simple time-based suppression window after each detected clap.
  //   3. fftSize=2048 gives a 46ms analysis window; with 10ms polling every read
  //      overlaps by 36ms — a 2ms clap transient is captured in ~23 consecutive reads.
  //   4. Thresholds lowered (0.09 absolute, 5× noise floor) to work with quiet mics.
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    let noiseFloor    = 0.015; // rolling background — self-calibrates
    let suppressUntil = 0;    // ignore audio until this timestamp (post-clap ring-down)
    let firstClapAt   = 0;    // timestamp of first clap in a pair
    let lastTriggerAt = 0;    // timestamp of last successful double-clap

    const DECAY_MS       = 200;   // suppress this many ms after each detected clap
    const MIN_GAP_MS     = 100;   // two events < 100ms apart = one hit (reject)
    const MAX_GAP_MS     = 1000;  // second clap must arrive within 1 second
    const COOLDOWN_MS    = 1800;  // lockout window after triggering
    const CLAP_RATIO     = 5.0;   // peak must be 5× the noise floor
    const ABS_MIN_THRESH = 0.09;  // absolute minimum regardless of noise floor

    function tick() {
      if (!audioCtx || audioCtx.state !== "running" || !analyserNode) return;

      const buf = new Float32Array(analyserNode.fftSize);
      analyserNode.getFloatTimeDomainData(buf);

      let peak = 0, rmsSum = 0;
      for (let i = 0; i < buf.length; i++) {
        const abs = Math.abs(buf[i]);
        if (abs > peak) peak = abs;
        rmsSum += buf[i] * buf[i];
      }
      const rms = Math.sqrt(rmsSum / buf.length);

      // Adaptive noise floor: rises slowly on any loud frame, falls slowly on quiet
      if (peak < noiseFloor * 3) {
        noiseFloor = noiseFloor * 0.995 + peak * 0.005;
      } else {
        noiseFloor = noiseFloor * 0.998 + peak * 0.002;
      }
      noiseFloor = Math.max(0.004, Math.min(0.06, noiseFloor));

      audioLevel.current = rms;

      const now = Date.now();
      if (now < suppressUntil) return; // inside post-clap window

      const threshold = Math.max(ABS_MIN_THRESH, noiseFloor * CLAP_RATIO);

      if (peak > threshold) {
        suppressUntil = now + DECAY_MS;

        if (now - lastTriggerAt > COOLDOWN_MS) {
          const gap = now - firstClapAt;
          if (firstClapAt > 0 && gap >= MIN_GAP_MS && gap <= MAX_GAP_MS) {
            // ✓ Valid double-clap
            toggleRef.current();
            lastTriggerAt = now;
            firstClapAt   = 0;
          } else {
            firstClapAt = now; // register first clap, wait for second
          }
        }
      }

      // Expire a stale first clap
      if (firstClapAt > 0 && now - firstClapAt > MAX_GAP_MS) firstClapAt = 0;
    }

    let initBusy = false;
    async function init() {
      if (initBusy) return;
      initBusy = true;
      try {
        // Disable ALL browser audio processing — noise suppression and AGC
        // aggressively compress sharp transients like claps.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl:  false,
          },
          video: false,
        });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        // 2048 samples ≈ 46ms window at 44.1 kHz; 10ms polling → 36ms overlap.
        // Any transient is captured in ~23 consecutive reads — none can slip through.
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        analyserNode = analyser;
        await audioCtx.resume().catch(() => {});
        intervalId = setInterval(tick, 10);
      } catch {
        // Permission denied or no mic — will retry on next user gesture
        initBusy = false;
      }
    }

    function onGesture() {
      if (!audioCtx) {
        initBusy = false; // allow retry
        init();
      } else if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
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
      if (intervalId !== null) clearInterval(intervalId);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, []);

  return { isListening, transcript, interimTranscript, startListening, stopListening, toggleListening, isSupported, recognitionError };
}
