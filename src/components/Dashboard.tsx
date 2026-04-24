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
import PanelContainer from "./panels/PanelContainer";
import ArtemisPanel from "./panels/ArtemisPanel";
import HeraPanel from "./panels/HeraPanel";
import HermesPanel from "./panels/HermesPanel";
import AthenaPanel from "./panels/AthenaPanel";
import ApolloPanel from "./panels/ApolloPanel";
import AresPanel from "./panels/AresPanel";
import SettingsPanel from "./SettingsPanel";
import AmbientToast from "./AmbientToast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { useAmbientMonitor } from "@/hooks/useAmbientMonitor";
import { agents, getAgent } from "@/lib/agents";
import { AgentEvent, AgentName } from "@/types";

interface ConversationEntry {
  transcript: string;
  response: string;
  agent: string;
}

const PANEL_COMPONENTS: Partial<Record<AgentName, React.ComponentType>> = {
  artemis: ArtemisPanel,
  hera: HeraPanel,
  hermes: HermesPanel,
  athena: AthenaPanel,
  apollo: ApolloPanel,
  ares: AresPanel,
};

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [openPanel, setOpenPanel] = useState<AgentName | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const { isSpeaking, speak } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);
  const { notifications, dismiss } = useAmbientMonitor();

  const handleTranscript = useCallback(
    async (text: string) => {
      const response = await sendCommand(text);
      if (response) {
        // Handle navigation intents
        if (response.intent?.startsWith("navigate:")) {
          const target = response.intent.replace("navigate:", "");
          if (target === "settings") {
            setSettingsOpen(true);
          } else {
            setOpenPanel(target as AgentName);
          }
        }
        setAgentMessages((prev) => ({ ...prev, [response.agent]: response.response }));
        setConversationHistory((prev) => [
          ...prev,
          { transcript: text, response: response.response, agent: response.agent },
        ]);
        speak(response.response);
      }
    },
    [sendCommand, speak]
  );

  const { isListening, transcript, interimTranscript, toggleListening, isSupported } =
    useVoiceInput(handleTranscript);

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
      if (e.key === "Escape") {
        setOpenPanel(null);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  const [replayEntry, setReplayEntry] = useState<ConversationEntry | null>(null);

  function handleReplay(entry: ConversationEntry) {
    setReplayEntry(entry);
    // Clear after 100ms so TranscriptDisplay re-animates
    setTimeout(() => setReplayEntry(null), 100);
    setTimeout(() => setReplayEntry(entry), 150);
  }

  const displayAgents = agents.filter((a) => a.name !== "zeus");
  const currentActiveAgent = activeAgent || selectedAgent;
  const openPanelAgent = openPanel ? getAgent(openPanel) : null;
  const PanelContent = openPanel ? PANEL_COMPONENTS[openPanel] : null;
  const displayResponse = replayEntry ? replayEntry.response : (lastResponse?.response || null);
  const displayAgent = replayEntry ? replayEntry.agent as AgentName : activeAgent;

  return (
    <main className="h-screen grid-bg scan-line relative overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar */}
        <motion.div
          className="w-56 border-r border-white/[0.03] flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
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

          <div className="flex-1 overflow-y-auto py-2">
            <AgentSidebar
              activeAgent={currentActiveAgent}
              agentMessages={agentMessages}
              onSelectAgent={(name) => setOpenPanel(name)}
            />
          </div>

          <div className="px-4 py-3 border-t border-white/[0.03]">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <Settings size={14} />
              <span className="text-[11px] font-mono">Settings</span>
            </button>
          </div>
        </motion.div>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          <motion.div className="px-6 py-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <CommandBar isProcessing={isProcessing} activeAgent={activeAgent} lastIntent={lastResponse?.intent || null} />
          </motion.div>

          <div className="flex-1 flex flex-col items-center px-6 pb-6 overflow-hidden">
            <motion.div className="py-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <VoiceOrb isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} onClick={toggleListening} />
            </motion.div>

            <motion.div className="w-full max-w-2xl flex-1 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <TranscriptDisplay
                transcript={replayEntry ? replayEntry.transcript : transcript}
                interimTranscript={replayEntry ? "" : interimTranscript}
                response={displayResponse}
                activeAgent={displayAgent}
                history={conversationHistory}
              />
            </motion.div>
          </div>

          <motion.div className="px-6 pb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {displayAgents.map((agent, i) => (
                <motion.div key={agent.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                  <AgentCard
                    agent={agent}
                    isActive={currentActiveAgent === agent.name}
                    lastMessage={agentMessages[agent.name]}
                    onClick={() => setOpenPanel(agent.name)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <motion.div className="w-72 border-l border-white/[0.03] p-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <ActivityFeed events={allEvents} history={conversationHistory} onReplay={handleReplay} />
        </motion.div>
      </div>

      {/* Agent Detail Panel */}
      <PanelContainer agent={openPanelAgent || null} onClose={() => setOpenPanel(null)}>
        {PanelContent && <PanelContent />}
      </PanelContainer>

      {/* Settings Panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Ambient Notifications */}
      <AmbientToast notifications={notifications} onDismiss={dismiss} />
    </main>
  );
}
