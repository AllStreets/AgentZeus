"use client";

import { Calendar, Clock } from "lucide-react";

export default function ApolloPanel() {
  return (
    <div className="p-5 space-y-5">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Calendar</p>

      <div className="p-4 rounded-lg text-center space-y-3" style={{ backgroundColor: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)" }}>
        <Calendar size={28} className="mx-auto text-orange-500/40" />
        <p className="text-sm text-slate-400">Google Calendar not connected</p>
        <p className="text-xs text-slate-500">Connect in Settings to see today&apos;s events and schedule by voice.</p>
      </div>

      <div className="space-y-2 opacity-40 pointer-events-none">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Preview — Phase 3</p>
        {["Team standup — 9:00 AM", "Lunch with Alex — 12:30 PM", "Sprint review — 3:00 PM"].map((ev) => (
          <div key={ev} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <Clock size={12} className="text-orange-500/50 shrink-0" />
            <span className="text-xs text-slate-500">{ev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
