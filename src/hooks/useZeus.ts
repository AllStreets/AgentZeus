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

    const body = JSON.stringify({
      transcript,
      github_token: typeof window !== "undefined" ? localStorage.getItem("github_token") || undefined : undefined,
      vercel_token: typeof window !== "undefined" ? localStorage.getItem("vercel_token") || undefined : undefined,
      slack_webhook: typeof window !== "undefined" ? localStorage.getItem("slack_webhook") || undefined : undefined,
    });

    const attemptFetch = async (): Promise<Response> => {
      return fetch("/api/zeus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(28000),
      });
    };

    try {
      let res: Response;
      try {
        res = await attemptFetch();
      } catch {
        // Single retry on network failure (flaky mobile connection)
        await new Promise((r) => setTimeout(r, 1000));
        res = await attemptFetch();
      }

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const e = await res.json(); detail = e.error || detail; } catch { /* ignore */ }
        const errResponse: ZeusResponse = { agent: "zeus", intent: "error", response: `Error: ${detail}`, session_id: "" };
        setActiveAgent("zeus");
        setLastResponse(errResponse);
        return errResponse;
      }

      const data: ZeusResponse = await res.json();
      setActiveAgent(data.agent);
      setLastResponse(data);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Network error";
      const errResponse: ZeusResponse = { agent: "zeus", intent: "error", response: `Error: ${msg}`, session_id: "" };
      setActiveAgent("zeus");
      setLastResponse(errResponse);
      return errResponse;
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setActiveAgent(null);
      }, 2000);
    }
  }, []);

  return { isProcessing, activeAgent, lastResponse, sendCommand };
}
