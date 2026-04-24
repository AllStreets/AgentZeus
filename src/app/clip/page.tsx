"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

export default function ClipPage() {
  const [appUrl, setAppUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const bookmarkletCode = `javascript:(function(){fetch('${appUrl}/api/clip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:location.href})}).then(r=>r.json()).then(d=>alert('Hera saved: '+d.title)).catch(()=>alert('Clip failed'));})();`;

  function copy() {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="h-screen flex items-center justify-center" style={{ backgroundColor: "#060b18" }}>
      <div className="max-w-lg w-full px-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Hera Web Clipper</h1>
          <p className="text-sm text-slate-400 mt-1">Save any web page to Hera&apos;s memory with one click.</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-slate-400 mb-3">Step 1 — Drag this button to your bookmarks bar:</p>
            <a
              href={bookmarkletCode}
              onClick={(e) => e.preventDefault()}
              className="inline-block px-4 py-2 rounded-md text-sm font-medium cursor-grab active:cursor-grabbing"
              style={{ backgroundColor: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}
            >
              Save to Hera
            </a>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs text-slate-400 mb-3">Step 2 (alternative) — Copy the bookmarklet code manually:</p>
            <div className="relative">
              <code className="block text-[10px] text-slate-500 font-mono bg-black/20 p-3 rounded overflow-x-auto break-all">
                {bookmarkletCode}
              </code>
              <button
                onClick={copy}
                className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">In Chrome: Bookmarks bar → right-click → Add page → paste as URL</p>
          </div>

          <p className="text-xs text-slate-500">
            When on any webpage, click &quot;Save to Hera&quot; and it will summarize the page and save it to your notes. View clipped notes in the Hera panel (tagged &quot;clip&quot;).
          </p>
        </div>
      </div>
    </main>
  );
}
