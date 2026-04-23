"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AgentEvent } from "@/types";

interface UseAgentEventsReturn {
  events: AgentEvent[];
  latestEvent: AgentEvent | null;
  clearEvents: () => void;
}

export function useAgentEvents(sessionId: string | null): UseAgentEventsReturn {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch existing events for this session
    supabase
      .from("agent_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as AgentEvent[]);
      });

    // Subscribe to new events
    const channel = supabase
      .channel(`events-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as AgentEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return { events, latestEvent, clearEvents };
}
