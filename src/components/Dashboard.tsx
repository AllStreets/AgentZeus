"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap } from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import TranscriptDisplay from "./TranscriptDisplay";
import AgentCard from "./AgentCard";
import ActivityFeed from "./ActivityFeed";
import AgentSidebar from "./AgentSidebar";
import CommandBar from "./CommandBar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { agents } from "@/lib/agents";
import { AgentEvent, AgentName } from "@/types";

interface ConversationEntry {
  transcript: string;
  response: string;
  agent: string;
}

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);

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
        setConversationHistory((prev) => [
          ...prev,
          { transcript: text, response: response.response, agent: response.agent },
        ]);
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

  useEffect(() => {
    if (events.length > 0) {
      setAllEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !ids.has(e.id));
        return [...prev, ...newEvents];
      });
    }
  }, [events]);

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

  const displayAgents = agents.filter((a) => a.name !== "zeus");
  const currentActiveAgent = activeAgent || selectedAgent;

  return (
    <main className="h-screen grid-bg scan-line relative overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar — Agent Navigation */}
        <motion.div
          className="w-56 border-r border-white/[0.03] flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="px-4 py-5 flex items-center gap-2.5 border-b border-white/[0.03]">
            <div className="w-7 h-7 rounded-md bg-zeus/10 flex items-center justify-center">
              <Zap size={14} className="text-zeus" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Agent<span className="text-zeus">Zeus</span>
              </h1>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                {isSupported ? "Voice Active" : "Voice Unavailable"}
              </p>
            </div>
          </div>

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto py-2">
            <AgentSidebar
              activeAgent={currentActiveAgent}
              agentMessages={agentMessages}
              onSelectAgent={setSelectedAgent}
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.03]">
            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors">
              <Settings size={14} />
              <span className="text-[11px] font-mono">Settings</span>
            </button>
          </div>
        </motion.div>

        {/* Center — Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Command Bar */}
          <motion.div
            className="px-6 py-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CommandBar
              isProcessing={isProcessing}
              activeAgent={activeAgent}
              lastIntent={lastResponse?.intent || null}
            />
          </motion.div>

          {/* Voice Orb + Conversation */}
          <div className="flex-1 flex flex-col items-center px-6 pb-6 overflow-hidden">
            {/* Orb */}
            <motion.div
              className="py-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <VoiceOrb
                isListening={isListening}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                onClick={toggleListening}
              />
            </motion.div>

            {/* Conversation area */}
            <motion.div
              className="w-full max-w-2xl flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TranscriptDisplay
                transcript={transcript}
                interimTranscript={interimTranscript}
                response={lastResponse?.response || null}
                activeAgent={activeAgent}
                history={conversationHistory}
              />
            </motion.div>
          </div>

          {/* Agent Cards Row — Bottom */}
          <motion.div
            className="px-6 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {displayAgents.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <AgentCard
                    agent={agent}
                    isActive={currentActiveAgent === agent.name}
                    lastMessage={agentMessages[agent.name]}
                    onClick={() => setSelectedAgent(agent.name)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar — Activity Feed */}
        <motion.div
          className="w-72 border-l border-white/[0.03] p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ActivityFeed events={allEvents} />
        </motion.div>
      </div>
    </main>
  );
}
