// Shared mutable ref — updated by mic (listening) or TTS analyser (speaking).
// Read every animation frame by VoiceOrb — zero React overhead.
export const audioLevel = { current: 0 };
