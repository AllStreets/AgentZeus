"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap, ChevronLeft, ChevronRight } from "lucide-react";
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
import MeridianPanel from "./panels/MeridianPanel";
import ChicagoPanel from "./panels/ChicagoPanel";
import FlexportPanel from "./panels/FlexportPanel";
import SettingsPanel from "./SettingsPanel";
import AmbientToast from "./AmbientToast";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { useAmbientMonitor } from "@/hooks/useAmbientMonitor";
import { agents, getAgent } from "@/lib/agents";
import { agentBus } from "@/lib/agentBus";
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
  meridian: MeridianPanel,
  chicago: ChicagoPanel,
  flexport: FlexportPanel,
};

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [openPanel, setOpenPanel] = useState<AgentName | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const { isSpeaking, speak, unlockAudio } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);
  const { notifications, dismiss } = useAmbientMonitor();

  // Pre-opened blank tab from the user-gesture handler.
  // Chrome blocks window.open() from async speech callbacks, so we open
  // a blank tab during the Space/click gesture and navigate it once we
  // know the target URL.
  const pendingWindowRef = useRef<Window | null>(null);

  function preOpenTab() {
    try {
      pendingWindowRef.current = window.open("about:blank", "_blank");
    } catch {
      pendingWindowRef.current = null;
    }
  }

  // Fires BEFORE the server responds — opens panels and external apps instantly
  const handleOptimisticActions = useCallback((text: string) => {
    const t = text.toLowerCase();

    let externalUrl: string | null = null;

    if (/\bmeridian\b|\bglobe\b|\bgeopolit/.test(t)) {
      setOpenPanel("meridian");
      externalUrl = "http://localhost:8765";
    } else if (/\bchicago\b|\bcta\b|\btransit\b|\bcubs\b|\bbulls\b|\bbears\b/.test(t)) {
      setOpenPanel("chicago");
      externalUrl = "http://localhost:5173";
    } else if (/\bflexport\b|\bpipeline\b|\bprospects?\b|\bvessel\b|\bhot leads?\b/.test(t)) {
      setOpenPanel("flexport");
      externalUrl = "http://localhost:5174";
    } else if (/\bhermes\b|\bemail\b|\bmail\b|\binbox\b|\bslack\b/.test(t)) {
      setOpenPanel("hermes");
    } else if (/\bathena\b|\bgithub\b|\bcode\b|\bpull request\b|\bpr\b/.test(t)) {
      setOpenPanel("athena");
    } else if (/\bapollo\b|\bcalendar\b|\bschedule\b|\bmeeting\b/.test(t)) {
      setOpenPanel("apollo");
    } else if (/\bartemis\b|\btasks?\b|\btodo\b|\breminder\b/.test(t)) {
      setOpenPanel("artemis");
    } else if (/\bares\b|\bdeployment\b|\bvercel\b|\bdevops\b|\bserver\b/.test(t)) {
      setOpenPanel("ares");
    } else if (/\bhera\b|\bnotes?\b|\bmemory\b|\bremember\b/.test(t)) {
      setOpenPanel("hera");
    }

    if (externalUrl) {
      if (pendingWindowRef.current && !pendingWindowRef.current.closed) {
        // Navigate the pre-opened tab — works because it was opened during a user gesture
        pendingWindowRef.current.location.href = externalUrl;
      } else {
        // Fallback (e.g. double-clap trigger): try a direct open
        window.open(externalUrl, "_blank");
      }
      pendingWindowRef.current = null;
    } else {
      // No external app — close the blank tab we speculatively opened
      if (pendingWindowRef.current && !pendingWindowRef.current.closed) {
        pendingWindowRef.current.close();
      }
      pendingWindowRef.current = null;
    }
  }, []);

  const handleTranscript = useCallback(
    async (text: string) => {
      // Act immediately — don't wait for the server
      handleOptimisticActions(text);

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
        // Clear the tile message after 5 s so it doesn't linger
        setTimeout(() => {
          setAgentMessages((prev) => {
            if (prev[response.agent] !== response.response) return prev;
            const next = { ...prev };
            delete next[response.agent];
            return next;
          });
        }, 5000);
        setConversationHistory((prev) => [
          ...prev,
          { transcript: text, response: response.response, agent: response.agent },
        ]);
        agentBus.emit({ agent: response.agent, intent: response.intent, transcript: text, response: response.response });
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
        // Pre-open a blank tab while we still have the user gesture token.
        // handleOptimisticActions will navigate it once the transcript is known.
        if (!isListening) preOpenTab();
        toggleListening();
      }
      if (e.key === "Escape") {
        setOpenPanel(null);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening, isListening]);

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
        <div className="relative flex-shrink-0 flex">
          <motion.div
            className="border-r border-white/[0.03] flex flex-col overflow-hidden"
            initial={{ width: 224, opacity: 0, x: -20 }}
            animate={{ width: leftOpen ? 224 : 0, opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="w-56 flex flex-col h-full">
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
            </div>
          </motion.div>
          <button
            onClick={() => setLeftOpen((o) => !o)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            {leftOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          <motion.div className="px-6 py-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <CommandBar isProcessing={isProcessing} activeAgent={activeAgent} lastIntent={lastResponse?.intent || null} />
          </motion.div>

          <div className="flex-1 flex flex-col items-center px-6 pb-6 overflow-hidden">
            <motion.div className="py-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <VoiceOrb isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} onClick={() => { unlockAudio(); if (!isListening) preOpenTab(); toggleListening(); }} />
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

          <motion.div
            className="px-6 pb-4 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-zeus"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">
                  Agent Array
                </span>
              </div>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.05), transparent)" }} />
              <span className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(245,158,11,0.5)" }}>
                {displayAgents.length} ONLINE
              </span>
            </div>

            {/* Scrollable grid */}
            <div
              className="overflow-y-auto [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 240, scrollbarWidth: "none" }}
            >
              <div className="grid grid-cols-3 gap-2 pr-0.5">
                {displayAgents.map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
                  >
                    <AgentCard
                      agent={agent}
                      isActive={currentActiveAgent === agent.name}
                      lastMessage={agentMessages[agent.name]}
                      onClick={() => setOpenPanel(agent.name)}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="relative flex-shrink-0 flex">
          <button
            onClick={() => setRightOpen((o) => !o)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            {rightOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
          <motion.div
            className="border-l border-white/[0.03] overflow-hidden"
            initial={{ width: 288, opacity: 0, x: 20 }}
            animate={{ width: rightOpen ? 288 : 0, opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="w-72 p-4">
              <ActivityFeed events={allEvents} history={conversationHistory} onReplay={handleReplay} />
            </div>
          </motion.div>
        </div>
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
