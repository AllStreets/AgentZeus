import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

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
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Flexport, a sales intelligence agent for the Flexport SDR Dashboard (${FLEXPORT_URL}).
You have live access to prospect data, pipeline stages, trade signals, and vessel tracking.

Live Flexport data:
${JSON.stringify(results, null, 2)}

Respond with JSON:
{
  "response": "<spoken sales intelligence — concise, actionable, SDR-focused>",
  "actions": [
    { "type": "open_app" },
    { "type": "navigate", "page": "prospects"|"pipeline"|"vessels"|"signals"|"performance"|"trade" }
  ]
}

Speak like a sharp sales ops analyst. Lead with the most actionable insight — who to call, what deal to push, what signal to act on. Keep it under 5 sentences unless listing prospects.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "flexport", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runFlexport(body);
  return NextResponse.json({ response });
}
