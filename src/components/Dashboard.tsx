"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import AgentConstellation from "./AgentConstellation";
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
import ClioPanel from "./panels/ClioPanel";
import PoseidonPanel from "./panels/PoseidonPanel";
import IrisPanel from "./panels/IrisPanel";
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
import { zeusBusy } from "@/lib/audioLevel";

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
  clio: ClioPanel,
  poseidon: PoseidonPanel,
  iris: IrisPanel,
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
  // Sidebars start collapsed — constellation fills the full screen by default
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const [activeAgents, setActiveAgents] = useState<AgentName[]>([]);
  const { isSpeaking, speak, stop: stopSpeaking, unlockAudio } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);
  const { notifications, dismiss } = useAmbientMonitor();

  const handleOptimisticActions = useCallback((text: string) => {
    const t = text.toLowerCase();
    // Open side panels for internal agents — external apps (meridian/chicago/flexport)
    // are handled AFTER the agent processes the command via open_app in the response
    if (/\bhermes\b|\bemail\b|\bmail\b|\binbox\b|\bslack\b/.test(t)) {
      setOpenPanel("hermes");
    } else if (/\bathena\b|\bgithub\b|\bpull request\b|\bpr\b/.test(t)) {
      setOpenPanel("athena");
    } else if (/\bapollo\b|\bcalendar\b|\bschedule\b|\bmeeting\b/.test(t)) {
      setOpenPanel("apollo");
    } else if (/\bartemis\b|\btasks?\b|\btodo\b|\breminder\b/.test(t)) {
      setOpenPanel("artemis");
    } else if (/\bares\b|\bdeployment\b|\bvercel\b|\bdevops\b|\bserver\b/.test(t)) {
      setOpenPanel("ares");
    } else if (/\bclio\b|\bvoice note\b|\brecord note\b|\btranscribe\b/.test(t)) {
      setOpenPanel("clio");
    } else if (/\bhera\b|\bnotes?\b|\bmemory\b|\bremember\b/.test(t)) {
      setOpenPanel("hera");
    } else if (/\bposeidon\b|\bweb search\b|\blook up\b|\bfact.?check\b/.test(t)) {
      setOpenPanel("poseidon");
    } else if (/\biris\b|\bscreenshot\b|\bscreen\b|\bvision\b|\banalyze.*image\b|\bocr\b/.test(t)) {
      setOpenPanel("iris");
    }
  }, []);

  const handleTranscript = useCallback(
    async (text: string) => {
      // Reset active agents on new prompt
      setActiveAgents([]);
      handleOptimisticActions(text);
      const response = await sendCommand(text);
      if (response) {
        if (response.intent?.startsWith("navigate:")) {
          const target = response.intent.replace("navigate:", "");
          if (target === "settings") setSettingsOpen(true);
          else setOpenPanel(target as AgentName);
        }
        // Open external app tab if the agent requested it (reuses same tab per app)
        if (response.open_app) {
          window.open(response.open_app, `zeus_app_${response.agent}`, "width=1280,height=900,menubar=no,toolbar=no");
          setOpenPanel(response.agent as AgentName);
          // Re-fire bridge commands after tab has time to load (fixes timing for multi-step Meridian commands)
          if (response.bridge_actions?.length) {
            const actions = response.bridge_actions;
            setTimeout(() => {
              for (const action of actions) {
                fetch("/api/meridian-bridge", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cmd: action.cmd, payload: action.payload }),
                }).catch(() => {});
              }
            }, 1500);
          }
        }
        // Track active agents (illuminated lines) — support multi-agent synthesis
        if (response.agents_used?.length) {
          setActiveAgents(response.agents_used as AgentName[]);
        } else {
          setActiveAgents((prev) => prev.includes(response.agent as AgentName) ? prev : [...prev, response.agent as AgentName]);
        }
        setAgentMessages((prev) => ({ ...prev, [response.agent]: response.response }));
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

  const { isListening, transcript, interimTranscript, startListening, stopListening, toggleListening, isSupported } =
    useVoiceInput(handleTranscript);

  // Clear illuminated lines when listening starts
  useEffect(() => {
    if (isListening) setActiveAgents([]);
  }, [isListening]);

  // Suppress clap detector and auto-listen while Zeus is speaking or processing
  useEffect(() => {
    zeusBusy.current = isSpeaking || isProcessing;
  }, [isSpeaking, isProcessing]);

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
    setTimeout(() => setReplayEntry(null), 100);
    setTimeout(() => setReplayEntry(entry), 150);
    speak(entry.response);
  }

  const displayAgents = agents.filter((a) => a.name !== "zeus");
  const currentActiveAgent = activeAgent || selectedAgent;
  const openPanelAgent = openPanel ? getAgent(openPanel) : null;
  const PanelContent = openPanel ? PANEL_COMPONENTS[openPanel] : null;
  const displayResponse = replayEntry ? replayEntry.response : (lastResponse?.response || null);
  const displayAgent = replayEntry ? replayEntry.agent as AgentName : activeAgent;
  const responseAgent = displayAgent ? getAgent(displayAgent) ?? null : null;

  return (
    <main className="h-screen grid-bg scan-line relative overflow-hidden">

      {/* ── Layer 0: Full-screen constellation ── */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <AgentConstellation
          agents={displayAgents}
          activeAgent={currentActiveAgent}
          activeAgents={activeAgents}
          openPanel={openPanel}
          agentMessages={agentMessages}
          onSelectAgent={(name) => setOpenPanel(name)}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          onOrbClick={() => {
            unlockAudio();
            if (isListening || isSpeaking || isProcessing) {
              // Stop everything — listening, audio output, processing display
              stopListening();
              stopSpeaking();
            } else {
              startListening();
            }
          }}
          response={displayResponse}
          responseAgent={responseAgent}
          transcript={replayEntry ? replayEntry.transcript : transcript}
          interimTranscript={replayEntry ? "" : interimTranscript}
        />
      </div>

      {/* ── Layer 10: Sidebars + command bar overlay ── */}
      <div className="flex h-full" style={{ position: "relative", zIndex: 10, pointerEvents: "none" }}>

        {/* Left Sidebar */}
        <div className="flex-shrink-0 flex" style={{ pointerEvents: "auto" }}>
          <motion.div
            className="border-r border-white/[0.03] flex flex-col overflow-hidden"
            style={{ background: "rgba(6,11,24,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftOpen ? 224 : 0, opacity: 1 }}
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
          {/* Toggle button — always-visible column */}
          <div className="flex items-center justify-center w-6 flex-shrink-0">
            <button
              onClick={() => setLeftOpen((o) => !o)}
              className="w-6 h-6 rounded-full border flex items-center justify-center text-slate-500 hover:text-white transition-all"
              style={{ background: "rgba(6,11,24,0.9)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {leftOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* Center: command bar only (transparent) */}
        <div className="flex-1 flex flex-col min-w-0" style={{ pointerEvents: "none" }}>
          <motion.div
            className="px-6 py-3"
            style={{ pointerEvents: "auto" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CommandBar
              isProcessing={isProcessing}
              activeAgent={activeAgent}
              lastIntent={lastResponse?.intent || null}
              onSubmit={handleTranscript}
            />
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="flex-shrink-0 flex" style={{ pointerEvents: "auto" }}>
          {/* Toggle button — always-visible column */}
          <div className="flex items-center justify-center w-6 flex-shrink-0">
            <button
              onClick={() => setRightOpen((o) => !o)}
              className="w-6 h-6 rounded-full border flex items-center justify-center text-slate-500 hover:text-white transition-all"
              style={{ background: "rgba(6,11,24,0.9)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {rightOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>
          <motion.div
            className="border-l border-white/[0.03] overflow-hidden"
            style={{ background: "rgba(6,11,24,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightOpen ? 288 : 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="w-72 p-4 h-full overflow-y-auto">
              <ActivityFeed
                events={allEvents}
                history={conversationHistory}
                onReplay={handleReplay}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Layer 30+: Panels & modals ── */}
      <PanelContainer agent={openPanelAgent || null} onClose={() => setOpenPanel(null)}>
        {PanelContent && <PanelContent />}
      </PanelContainer>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AmbientToast notifications={notifications} onDismiss={dismiss} />
    </main>
  );
}
