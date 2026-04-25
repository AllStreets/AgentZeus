import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

interface RunParams { intent: string; transcript: string; session_id: string }

const CHICAGO_API = process.env.CHICAGO_API_URL || "http://localhost:3001";
const CHICAGO_URL = process.env.CHICAGO_URL || "http://localhost:5173";

async function fetchChicago(path: string) {
  try {
    const res = await fetch(`${CHICAGO_API}${path}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function runChicago({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  // Determine what data to fetch based on intent keywords
  const lower = transcript.toLowerCase();
  const fetches: Record<string, Promise<unknown>> = {};

  if (lower.includes("train") || lower.includes("cta") || lower.includes("transit") || lower.includes("l "))
    fetches.cta = fetchChicago("/api/cta");
  if (lower.includes("weather") || lower.includes("rain") || lower.includes("cold") || lower.includes("warm") || lower.includes("lake"))
    fetches.weather = fetchChicago("/api/weather");
  if (lower.includes("event") || lower.includes("concert") || lower.includes("show") || lower.includes("ticket"))
    fetches.events = fetchChicago("/api/events");
  if (lower.includes("sport") || lower.includes("cubs") || lower.includes("bulls") || lower.includes("bears") || lower.includes("hawks") || lower.includes("sox") || lower.includes("fire") || lower.includes("sky"))
    fetches.sports = fetchChicago("/api/sports");
  if (lower.includes("food") || lower.includes("eat") || lower.includes("restaurant") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("breakfast"))
    fetches.food = fetchChicago("/api/yelp?type=restaurant&limit=5");
  if (lower.includes("bar") || lower.includes("night") || lower.includes("drink") || lower.includes("cocktail"))
    fetches.nightlife = fetchChicago("/api/yelp?type=bar&limit=5");
  if (lower.includes("neighborhood") || lower.includes("area") || lower.includes("streeterville") || lower.includes("wicker") || lower.includes("lincoln"))
    fetches.neighborhoods = fetchChicago("/api/neighborhoods");

  // Default: fetch home feed for general queries
  if (Object.keys(fetches).length === 0)
    fetches.feed = fetchChicago("/api/home-feed");

  const results: Record<string, unknown> = {};
  await Promise.all(Object.entries(fetches).map(async ([k, p]) => { results[k] = await p; }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Chicago, a city intelligence agent for the Chicago Explorer app (${CHICAGO_URL}).
You have live data from Chicago's transit, weather, sports, events, food, and nightlife.

Live Chicago data:
${JSON.stringify(results, null, 2)}

Respond with JSON:
{
  "response": "<spoken city intelligence — concise, helpful, conversational>",
  "actions": [
    { "type": "open_app" },
    { "type": "navigate", "page": "transit"|"food"|"sports"|"events"|"nightlife"|"neighborhoods"|"weather" }
  ]
}

Speak naturally — you're a local expert. Mention specific details from the data (train arrivals, scores, restaurant names, event times). Keep it under 4 sentences unless listing multiple items.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "chicago", event_type: "complete", content: content.response,
  })).catch(() => {});

  // Encode navigation target into response so Dashboard can open it
  if (content.actions?.some((a: { type: string }) => a.type === "open_app")) {
    content._openUrl = CHICAGO_URL;
  }
  if (content.actions?.some((a: { type: string; page?: string }) => a.type === "navigate")) {
    const nav = content.actions.find((a: { type: string; page?: string }) => a.type === "navigate");
    content._openUrl = `${CHICAGO_URL}/${nav.page}`;
  }

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runChicago(body);
  return NextResponse.json({ response });
}
