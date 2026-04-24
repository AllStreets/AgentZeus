"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import VoiceOrb from "./VoiceOrb";
import TranscriptDisplay from "./TranscriptDisplay";
import AgentCard from "./AgentCard";
import ActivityFeed from "./ActivityFeed";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { agents } from "@/lib/agents";
import { AgentEvent, AgentName } from "@/types";

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const { isSpeaking, speak } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);

  const handleTranscript = useCallback(
    async (text: string) => {
      const response = await sendCommand(text);
      if (response) {
        setAgentMessages((prev) => ({
          ...prev,
          [response.agent]: response.response,
        }));
        speak(response.response);
      }
    },
    [sendCommand, speak]
  );

  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSupported,
  } = useVoiceInput(handleTranscript);

  // Accumulate events across sessions
  useEffect(() => {
    if (events.length > 0) {
      setAllEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !ids.has(e.id));
        return [...prev, ...newEvents];
      });
    }
  }, [events]);

  // Keyboard shortcut: Space to toggle voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  // Filter out Zeus from the agent grid (Zeus is the orb)
  const displayAgents = agents.filter((a) => a.name !== "zeus");

  return (
    <main className="min-h-screen grid-bg">
      <div className="flex h-screen">
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center px-8 py-6">
          {/* Header */}
          <motion.header
            className="w-full flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Agent<span className="text-zeus">Zeus</span>
              </h1>
            </div>
            {!isSupported && (
              <span className="text-xs text-red-400 font-mono">
                Voice not supported in this browser
              </span>
            )}
          </motion.header>

          {/* Voice Orb */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <VoiceOrb
              isListening={isListening}
              isSpeaking={isSpeaking}
              isProcessing={isProcessing}
              onClick={toggleListening}
            />
          </motion.div>

          {/* Transcript */}
          <div className="mb-8 w-full max-w-2xl">
            <TranscriptDisplay
              transcript={transcript}
              interimTranscript={interimTranscript}
              response={lastResponse?.response || null}
              activeAgent={activeAgent}
            />
          </div>

          {/* Agent Grid */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {displayAgents.map((agent) => (
              <motion.div
                key={agent.name}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <AgentCard
                  agent={agent}
                  isActive={activeAgent === agent.name}
                  lastMessage={agentMessages[agent.name]}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Activity Feed Sidebar */}
        <motion.aside
          className="w-80 border-l border-white/5 p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ActivityFeed events={allEvents} />
        </motion.aside>
      </div>
    </main>
  );
}
