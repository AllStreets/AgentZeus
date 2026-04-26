// Shared mutable ref — updated by mic (listening) or TTS analyser (speaking).
// Read every animation frame by VoiceOrb — zero React overhead.
export const audioLevel = { current: 0 };

// When true, Zeus is speaking or processing — clap detector and auto-listen must not trigger.
export const zeusBusy = { current: false };
