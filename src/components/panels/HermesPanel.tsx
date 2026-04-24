"use client";

import { Mail, MessageSquare, ExternalLink } from "lucide-react";

function IntegrationCard({ icon: Icon, name, status, color }: { icon: React.ElementType; name: string; status: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}12`, color }}>
          <Icon size={14} />
        </div>
        <div>
          <p className="text-sm text-white">{name}</p>
          <p className="text-[10px] font-mono text-slate-500">{status}</p>
        </div>
      </div>
      <button className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded transition-colors text-slate-400 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        Connect <ExternalLink size={10} />
      </button>
    </div>
  );
}

export default function HermesPanel() {
  return (
    <div className="p-5 space-y-3">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-4">Integrations</p>
      <IntegrationCard icon={Mail} name="Gmail" status="Not connected — Phase 3" color="#14b8a6" />
      <IntegrationCard icon={MessageSquare} name="Slack" status="Coming soon" color="#14b8a6" />
      <p className="text-xs text-slate-500 mt-6 leading-relaxed">
        Connect Gmail in Settings to let Hermes read, draft, and send emails by voice.
      </p>
    </div>
  );
}
