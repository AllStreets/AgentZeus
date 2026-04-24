"use client";

import { useState, useCallback } from "react";
import { AgentName, ZeusResponse } from "@/types";

interface UseZeusReturn {
  isProcessing: boolean;
  activeAgent: AgentName | null;
  lastResponse: ZeusResponse | null;
  sendCommand: (transcript: string) => Promise<ZeusResponse | null>;
}

export function useZeus(): UseZeusReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentName | null>(null);
  const [lastResponse, setLastResponse] = useState<ZeusResponse | null>(null);

  const sendCommand = useCallback(async (transcript: string): Promise<ZeusResponse | null> => {
    if (!transcript.trim()) return null;

    setIsProcessing(true);
    setActiveAgent("zeus");

    try {
      const github_token = typeof window !== "undefined" ? localStorage.getItem("github_token") || undefined : undefined;

      const res = await fetch("/api/zeus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, github_token }),
      });

      const data: ZeusResponse = await res.json();
      setActiveAgent(data.agent);
      setLastResponse(data);
      return data;
    } catch (error) {
      console.error("Zeus error:", error);
      return null;
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setActiveAgent(null);
      }, 2000);
    }
  }, []);

  return { isProcessing, activeAgent, lastResponse, sendCommand };
}
