"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  response: string | null;
  activeAgent: string | null;
}

export default function TranscriptDisplay({
  transcript,
  interimTranscript,
  response,
  activeAgent,
}: TranscriptDisplayProps) {
  const hasContent = transcript || interimTranscript || response;

  if (!hasContent) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="glass rounded-xl px-6 py-4 max-w-2xl w-full mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {(transcript || interimTranscript) && (
          <div className="mb-2">
            <span className="text-xs font-mono text-accent uppercase tracking-wider">You</span>
            <p className="text-slate-200 mt-1">
              {transcript}
              {interimTranscript && (
                <span className="text-slate-400 italic">{interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: activeAgent ? undefined : "#3b82f6" }}
            >
              {activeAgent || "Zeus"}
            </span>
            <p className="text-slate-200 mt-1">{response}</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
