"use client";

import { useState, useEffect, useRef } from "react";

interface AmbientNotification {
  id: string;
  type: "gmail" | "calendar" | "task" | "system" | "agent";
  message: string;
  agent?: string;
  timestamp: Date;
}

export function useAmbientMonitor() {
  const [notifications, setNotifications] = useState<AmbientNotification[]>([]);
  const lastUnreadRef = useRef<number | null>(null);
  const lastEventCountRef = useRef<number | null>(null);
  // Track which alert messages have been shown today — persisted in localStorage
  // so duplicates don't reappear on page refresh
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const alertDateRef = useRef<string>("");

  // Hydrate from localStorage on mount
  if (alertDateRef.current === "") {
    try {
      const stored = JSON.parse(localStorage.getItem("zeus_shown_alerts") || "{}");
      const today = new Date().toDateString();
      if (stored.date === today && Array.isArray(stored.messages)) {
        shownAlertsRef.current = new Set(stored.messages);
      }
      alertDateRef.current = today;
    } catch {
      alertDateRef.current = new Date().toDateString();
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      // Poll Gmail
      try {
        const res = await fetch("/api/gmail");
        const data = await res.json();
        if (data.connected && typeof data.unreadCount === "number") {
          const prev = lastUnreadRef.current;
          if (prev !== null && data.unreadCount > prev) {
            const diff = data.unreadCount - prev;
            addNotification("gmail", `${diff} new email${diff > 1 ? "s" : ""} arrived`);
          }
          lastUnreadRef.current = data.unreadCount;
        }
      } catch {
        // silent
      }

      // Poll Calendar for upcoming events (within 10 minutes)
      try {
        const res = await fetch("/api/calendar?action=today");
        const data = await res.json();
        if (data.connected && data.nextEvent) {
          const { minutesUntil, title } = data.nextEvent;
          if (minutesUntil !== null && minutesUntil <= 10 && minutesUntil > 0) {
            const alreadyNotified = lastEventCountRef.current === minutesUntil;
            if (!alreadyNotified) {
              addNotification("calendar", `"${title}" starts in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`);
              lastEventCountRef.current = minutesUntil;
            }
          }
        }
      } catch {
        // silent
      }

      // Poll for proactive agent alerts (Artemis: overdue tasks, Ares: system health)
      try {
        // Reset shown alerts at midnight
        const today = new Date().toDateString();
        if (today !== alertDateRef.current) {
          shownAlertsRef.current = new Set();
          alertDateRef.current = today;
          try { localStorage.removeItem("zeus_shown_alerts"); } catch {}
        }

        const res = await fetch("/api/alerts");
        const data = await res.json();
        let added = false;
        for (const alert of data.alerts || []) {
          // Only show each unique alert message once per day
          if (!shownAlertsRef.current.has(alert.message)) {
            shownAlertsRef.current.add(alert.message);
            addNotification(alert.type || "agent", alert.message, alert.agent);
            added = true;
          }
        }
        // Persist to localStorage so refreshes don't re-trigger
        if (added) {
          try {
            localStorage.setItem("zeus_shown_alerts", JSON.stringify({
              date: alertDateRef.current,
              messages: [...shownAlertsRef.current],
            }));
          } catch { /* quota exceeded — non-fatal */ }
        }
      } catch {
        // silent — alerts endpoint may not exist yet
      }
    }

    function addNotification(type: AmbientNotification["type"], message: string, agent?: string) {
      const note: AmbientNotification = {
        id: crypto.randomUUID(),
        type,
        message,
        agent,
        timestamp: new Date(),
      };
      setNotifications((prev) => [note, ...prev.slice(0, 9)]);
    }

    // Initial poll after 10s delay, then every 5 minutes
    const initialTimeout = setTimeout(() => {
      poll();
      const interval = setInterval(poll, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }, 10_000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
    };
  }, []);

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, dismiss };
}
