import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/url";

interface RunParams { intent: string; transcript: string; session_id: string }

const MERIDIAN_URL = process.env.MERIDIAN_URL || "http://localhost:8765";

async function sendToMeridian(cmd: string, payload?: Record<string, unknown>) {
  try {
    await fetch(`${getBaseUrl()}/api/meridian-bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd, payload }),
    });
  } catch { /* non-fatal */ }
}

// Instantly parse the transcript for known actions — fires BEFORE OpenAI responds
function detectImmediateActions(transcript: string): Array<{ cmd: string; payload: Record<string, unknown> }> {
  const t = transcript.toLowerCase();
  const actions: Array<{ cmd: string; payload: Record<string, unknown> }> = [];

  // Overlays — check for each word explicitly
  if (/\bcities\b|\bcity\b/.test(t))     actions.push({ cmd: "toggle_overlay", payload: { overlay: "cities" } });
  if (/\bcables?\b/.test(t))             actions.push({ cmd: "toggle_overlay", payload: { overlay: "cables" } });
  if (/\bflights?\b/.test(t))            actions.push({ cmd: "toggle_overlay", payload: { overlay: "flights" } });
  if (/\bcountri(es|y)\b|\bborders?\b/.test(t)) actions.push({ cmd: "toggle_overlay", payload: { overlay: "countries" } });
  if (/\bthreats?\b/.test(t))            actions.push({ cmd: "toggle_overlay", payload: { overlay: "threats" } });
  if (/\bsanctions?\b/.test(t))          actions.push({ cmd: "toggle_overlay", payload: { overlay: "sanctions" } });
  if (/\bshipping\b|\bvessels?\b|\bships?\b|\bfreight\b/.test(t)) actions.push({ cmd: "toggle_overlay", payload: { overlay: "shipping" } });
  if (/\bearthquakes?\b|\bquakes?\b|\beq\b/.test(t)) actions.push({ cmd: "toggle_overlay", payload: { overlay: "eq" } });

  // Analysis tools
  if (/\bsilence\b|\bblackout\b|\bmedia silence\b/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "silence" } });
  if (/\bdiverge\b|\bdivergence\b|\bnarrative diverge/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "diverge" } });
  if (/\bcascade\b|\bcascading\b/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "cascade" } });
  if (/\blive news\b|\bbroadcast\b|\blive broadcast\b/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "livenews" } });
  if (/\bwebcam\b|\bcam\b|\bcameras?\b/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "webcams" } });
  if (/\bwargame\b|\bwar game\b|\bscenario\b/.test(t)) actions.push({ cmd: "toggle_tool", payload: { tool: "wargame" } });

  // Page opens
  if (/\banalyst\b|\banalyst (board|mode|view)\b/.test(t)) actions.push({ cmd: "open_page", payload: { page: "analyst" } });
  if (/\b(daily )?brief\b|\bbriefing\b/.test(t)) actions.push({ cmd: "open_page", payload: { page: "brief" } });
  if (/\bmap key\b|\bmapkey\b|\blegend\b/.test(t)) actions.push({ cmd: "open_page", payload: { page: "mapkey" } });

  // Category filter — only the most specific match wins
  if (/\bmilitary\b|\bwar\b|\barmy\b|\btroops\b|\bmil\b/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "military" } });
  else if (/\bgeo(politic)?\b/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "geo" } });
  else if (/\bfinance\b|\bfinancial\b|\bmarket\b|\beconom/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "finance" } });
  else if (/\bclimate\b|\benvironment\b/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "climate" } });
  else if (/\btech(nolog)?\b|\bcyber\b/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "tech" } });
  else if (/\ball\b/.test(t) && /categor|filter|show all/.test(t))
    actions.push({ cmd: "set_cat", payload: { cat: "all" } });

  // Globe controls
  const stopSpin = /\b(stop|pause|turn off|disable)\b.{0,15}\b(spin|rotat)/.test(t)
    || /\b(spin|rotat).{0,15}\b(stop|off)\b/.test(t);
  const startSpin = /\b(start|begin|turn on|enable|spin)\b.{0,15}\b(spin|rotat)/.test(t)
    || (/\bspin(ning)?\b/.test(t) && !stopSpin);
  if (stopSpin)  actions.push({ cmd: "set_spin", payload: { on: false } });
  if (startSpin) actions.push({ cmd: "set_spin", payload: { on: true } });

  if (/\breset\b/.test(t)) actions.push({ cmd: "reset_view", payload: {} });

  return actions;
}

export async function runMeridian({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  // ── IMMEDIATE: fire detected actions + fetch context in parallel ──────
  const immediateActions = detectImmediateActions(transcript);

  const [, storiesResult] = await Promise.all([
    // Fire all detected bridge commands NOW — before OpenAI responds
    Promise.all(immediateActions.map(({ cmd, payload }) => sendToMeridian(cmd, payload))),
    // Fetch stories for the AI briefing context
    supabase.from("stories")
      .select("title, summary, cat, region, src, time")
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  const recentStories = storiesResult.data;

  // ── AI: briefing + any additional actions not already handled ─────────
  const alreadyFiredCmds = new Set(immediateActions.map((a) => a.cmd));

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Meridian, a geopolitical intelligence agent connected to the MERIDIAN globe dashboard at ${MERIDIAN_URL}.

Current stories:
${JSON.stringify(recentStories || [], null, 2)}

Commands already executed from this request: ${JSON.stringify(immediateActions)}

You may issue ADDITIONAL globe commands if needed (don't repeat already-executed ones):
- set_cat: (cat: "all"|"geo"|"military"|"finance"|"climate"|"tech")
- toggle_overlay: (overlay: "cities"|"countries"|"cables"|"flights"|"threats"|"sanctions")
- reset_view, set_spin (on: bool), open_meridian

If the user said "open", "launch", or "show" MERIDIAN — include { "type": "open_app" }.

Respond with JSON:
{
  "response": "<spoken confirmation + any intelligence briefing>",
  "actions": []
}`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  // Execute any AI-decided actions not already fired
  for (const action of content.actions || []) {
    if (action.type === "globe_command" && !alreadyFiredCmds.has(action.cmd)) {
      await sendToMeridian(action.cmd, action.payload || {});
    }
    if (action.type === "open_app") {
      await sendToMeridian("open_meridian", { url: MERIDIAN_URL });
    }
  }

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "meridian", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runMeridian(body);
  return NextResponse.json({ response });
}
