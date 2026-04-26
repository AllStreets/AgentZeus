import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { safeParseAgent } from "@/lib/safeJson";

interface RunParams { intent: string; transcript: string; session_id: string }

const FLEXPORT_API = process.env.FLEXPORT_API_URL || "http://localhost:5000";
const FLEXPORT_URL = process.env.FLEXPORT_URL || "http://localhost:5174";

async function fetchFlexport(path: string, method = "GET", body?: unknown) {
  try {
    const res = await fetch(`${FLEXPORT_API}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Detect which page to navigate to from voice commands — mirrors panel PAGES keywords
function detectPageFromTranscript(text: string): string | null {
  const t = text.toLowerCase();
  const PAGE_KEYWORDS: [string, string[]][] = [
    ["flights",     ["flight","air","airfreight","airline","cargo plane","air cargo"]],
    ["land",        ["land","truck","road","ground","drayage","ltl","ftl","inland"]],
    ["vessels",     ["vessel","ship","ocean","freight","cargo","container","shipping","port"]],
    ["market",      ["market map","territory","geographic","coverage","region map"]],
    ["trade",       ["trade","import","export","trade map","trade flow","intelligence"]],
    ["pilot",       ["outreach","agentic","who should i call","prospect","lead","contact"]],
    ["performance", ["pipeline","deal","stage","kanban","close","opportunity","crm","sales","performance","quota","metrics","kpi"]],
  ];
  for (const [page, keywords] of PAGE_KEYWORDS) {
    if (keywords.some((kw) => t.includes(kw))) return page;
  }
  return null;
}

export async function runFlexport({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  const lower = transcript.toLowerCase();
  const fetches: Record<string, Promise<unknown>> = {};

  if (lower.includes("prospect") || lower.includes("lead") || lower.includes("contact") || lower.includes("account"))
    fetches.prospects = fetchFlexport("/api/prospects?limit=10&sort=urgency_score");
  if (lower.includes("pipeline") || lower.includes("deal") || lower.includes("stage") || lower.includes("kanban"))
    fetches.pipeline = fetchFlexport("/api/pipeline");
  if (lower.includes("signal") || lower.includes("news") || lower.includes("alert") || lower.includes("trigger"))
    fetches.signals = fetchFlexport("/api/signals?limit=10");
  if (lower.includes("vessel") || lower.includes("ship") || lower.includes("ocean") || lower.includes("freight"))
    fetches.vessels = fetchFlexport("/api/vessels");
  if (lower.includes("tariff") || lower.includes("hs code") || lower.includes("duty") || lower.includes("tax"))
    fetches.tariffs = fetchFlexport("/api/globe-data");
  if (lower.includes("performance") || lower.includes("kpi") || lower.includes("quota") || lower.includes("metrics"))
    fetches.performance = fetchFlexport("/api/performance");

  // Default: top prospects + pipeline summary
  if (Object.keys(fetches).length === 0) {
    fetches.prospects = fetchFlexport("/api/prospects?limit=8&sort=urgency_score");
    fetches.pipeline = fetchFlexport("/api/pipeline");
  }

  const results: Record<string, unknown> = {};
  await Promise.all(Object.entries(fetches).map(async ([k, p]) => { results[k] = await p; }));

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Flexport, a sales intelligence agent for the Flexport SDR Dashboard (${FLEXPORT_URL}).
You have live access to prospect data, pipeline stages, trade signals, and vessel tracking.

Live Flexport data:
${JSON.stringify(results, null, 2)}

Available pages: home, flights (Air Freight), land (Land Freight), vessels (Ocean Freight), market (Market Map), trade (Trade Intelligence), pilot (Agentic Outreach), performance (Sales CRM)

Respond with JSON:
{
  "response": "<spoken sales intelligence — concise, actionable, SDR-focused>",
  "actions": [
    { "type": "open_app" },
    { "type": "navigate", "page": "<page_id>" }
  ]
}

Include { "type": "open_app" } ONLY if the user explicitly says "open", "show", "launch", or "pull up" Flexport.
Include { "type": "navigate", "page": "<id>" } if the user wants a specific section opened.

Speak like a sharp sales ops analyst. Lead with the most actionable insight — who to call, what deal to push, what signal to act on. Keep it under 5 sentences unless listing prospects.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = safeParseAgent(response.choices[0].message.content!);

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "flexport", event_type: "complete", content: content.response,
  })).catch(() => {});

  // Detect page navigation from transcript keywords
  const detectedPage = detectPageFromTranscript(transcript);

  // Detect if user wants to open the dashboard
  const shouldOpen = /\b(open|show|launch|pull up|go to)\b/i.test(transcript) && /\bflexport\b/i.test(transcript);

  let openUrl: string | null = null;
  if (shouldOpen || content.actions?.some((a: { type: string }) => a.type === "open_app")) {
    const navPage = detectedPage
      || content.actions?.find((a: { type: string; page?: string }) => a.type === "navigate")?.page;
    openUrl = navPage ? `${FLEXPORT_URL}/${navPage}` : FLEXPORT_URL;
  }

  return JSON.stringify({
    __agent_response: true,
    response: content.response,
    open_app: openUrl,
    navigate_page: detectedPage,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runFlexport(body);
  return NextResponse.json({ response });
}
