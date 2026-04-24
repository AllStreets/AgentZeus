"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ExternalLink, RefreshCw, MapPin } from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  startFormatted: string;
  endFormatted: string;
  location: string | null;
  url: string;
  minutesUntil: number | null;
  isNow: boolean;
}

interface CalendarData {
  connected: boolean;
  events?: CalEvent[];
  nextEvent?: CalEvent | null;
}

function minutesLabel(min: number): string {
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

export default function ApolloPanel() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "tomorrow">("today");

  const fetchEvents = useCallback(async (day: "today" | "tomorrow") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?action=${day}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(tab); }, [tab, fetchEvents]);

  async function disconnect() {
    await fetch("/api/calendar", { method: "DELETE" });
    setData({ connected: false });
  }

  if (loading && !data) {
    return <div className="p-5"><p className="text-xs text-slate-600 text-center py-8">Checking connection...</p></div>;
  }

  if (!data?.connected) {
    return (
      <div className="p-5 space-y-4">
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Calendar</p>

        <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(249,115,22,0.12)", color: "#f97316" }}>
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-sm text-white">Google Calendar</p>
              <p className="text-[10px] font-mono text-slate-500">Not connected</p>
            </div>
          </div>
          <a
            href="/api/auth/google?service=calendar"
            className="w-full py-2 rounded-md text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}
          >
            Connect Google Calendar <ExternalLink size={10} />
          </a>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Connect your calendar to see today&apos;s schedule, get meeting reminders, and create events by voice.
        </p>
      </div>
    );
  }

  const events = data.events || [];

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <p className="text-xs text-slate-300">Calendar connected</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchEvents(tab)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={disconnect} className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
            Disconnect
          </button>
        </div>
      </div>

      {/* Next event highlight */}
      {data.nextEvent && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)" }}>
          <p className="text-[10px] font-mono text-orange-400/60 uppercase tracking-wider mb-1">Next up</p>
          <p className="text-sm text-white">{data.nextEvent.title}</p>
          <p className="text-[11px] text-orange-400/70 font-mono">
            {data.nextEvent.startFormatted} · {data.nextEvent.minutesUntil !== null ? minutesLabel(data.nextEvent.minutesUntil) : ""}
          </p>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-1">
        {(["today", "tomorrow"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className="px-3 py-1 rounded text-[10px] font-mono capitalize transition-colors"
            style={{
              backgroundColor: tab === d ? "rgba(249,115,22,0.12)" : "transparent",
              color: tab === d ? "#f97316" : "#64748b",
              border: `1px solid ${tab === d ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)"}`,
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Event list */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {events.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-6">No events {tab}</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg group transition-colors hover:bg-white/[0.03]"
                  style={{
                    backgroundColor: ev.isNow ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${ev.isNow ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)"}`,
                  }}
                >
                  <Clock size={12} className="text-orange-400/50 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{ev.title}</p>
                    <p className="text-[10px] font-mono text-slate-500">{ev.startFormatted} — {ev.endFormatted}</p>
                    {ev.location && (
                      <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin size={9} /> {ev.location}
                      </p>
                    )}
                  </div>
                  {ev.isNow && <span className="text-[9px] font-mono text-orange-400 shrink-0 mt-0.5">NOW</span>}
                  {!ev.isNow && ev.minutesUntil !== null && ev.minutesUntil > 0 && (
                    <span className="text-[9px] font-mono text-slate-600 shrink-0 mt-0.5">{minutesLabel(ev.minutesUntil)}</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
        Say &quot;Apollo, what&apos;s on my calendar today?&quot;
      </p>
    </div>
  );
}
