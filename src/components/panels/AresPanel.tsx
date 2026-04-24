"use client";

import { Activity, Server, Cpu, HardDrive } from "lucide-react";

function StatusCard({ icon: Icon, label, value, status }: { icon: React.ElementType; label: string; value: string; status: "ok" | "warn" | "error" }) {
  const color = status === "ok" ? "#10b981" : status === "warn" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-3">
        <Icon size={13} className="text-slate-500" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color }}>{value}</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AresPanel() {
  return (
    <div className="p-5 space-y-4">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">System Status</p>

      <div className="space-y-2">
        <StatusCard icon={Activity} label="App Status" value="Running" status="ok" />
        <StatusCard icon={Server} label="Environment" value="Development" status="ok" />
        <StatusCard icon={Cpu} label="Vercel Deploys" value="Connect in settings" status="warn" />
        <StatusCard icon={HardDrive} label="Supabase" value="Connected" status="ok" />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mt-4">
        Add your Vercel API token in Settings to see deployment status, build logs, and get alerted on failures.
      </p>
    </div>
  );
}
