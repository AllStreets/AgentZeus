import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/url";
import { AgentName } from "@/types";
import { runArtemis } from "@/app/api/agents/artemis/route";
import { runHera } from "@/app/api/agents/hera/route";
import { runHermes } from "@/app/api/agents/hermes/route";
import { runAthena } from "@/app/api/agents/athena/route";
import { runApollo } from "@/app/api/agents/apollo/route";
import { runAres } from "@/app/api/agents/ares/route";
import { runMeridian } from "@/app/api/agents/meridian/route";
import { runChicago } from "@/app/api/agents/chicago/route";
import { runFlexport } from "@/app/api/agents/flexport/route";
import { runClio } from "@/app/api/agents/clio/route";
import { runPoseidon } from "@/app/api/agents/poseidon/route";
import { runIris } from "@/app/api/agents/iris/route";

export const maxDuration = 30;

const AGENT_DESCRIPTIONS: Record<Exclude<AgentName, "zeus">, string> = {
  hermes: "Communications — email, Slack, Discord messaging",
  athena: "Code & Dev — GitHub, PRs, code generation, deployments",
  apollo: "Calendar & Scheduling — events, meetings, daily briefings",
  artemis: "Tasks & Productivity — todos, habits, goals, task management",
  ares: "System & DevOps — server monitoring, deployments, error logs",
  hera: "Memory & Knowledge — storing/retrieving notes, bookmarks, semantic search",
  meridian: "Geopolitical Intelligence — globe control, news briefings, conflict analysis, MERIDIAN dashboard",
  chicago: "City Intelligence — Chicago transit (CTA), weather, events, food, sports, nightlife",
  flexport: "Sales Intelligence — Flexport prospects, pipeline, trade signals, vessel tracking",
  clio: "Voice Notes — recording, transcribing, saving, and summarizing spoken notes",
  poseidon: "Web Intelligence — deep web research, fact-checking, competitive analysis, source verification",
  iris: "Screen & Vision — screenshot analysis, OCR, visual understanding, image description",
};

async function classifyIntent(transcript: string): Promise<{ agent: AgentName; intent: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Zeus, the orchestrator of a personal AI assistant system. Classify the user's voice command to determine which agent should handle it.

Available agents:
${Object.entries(AGENT_DESCRIPTIONS)
  .map(([name, desc]) => `- ${name}: ${desc}`)
  .join("\n")}

If the command is a general greeting or doesn't fit any agent, use "zeus" as the agent.

Also detect these special intents:
- Navigation: "open clio" / "voice notes" / "take a note" / "start recording" → agent: "clio", intent: "navigate:clio"
- Navigation: "show my tasks" / "open tasks" / "show Artemis" → agent: "artemis", intent: "navigate:artemis"
- Navigation: "show notes" / "open Hera" / "my notes" → agent: "hera", intent: "navigate:hera"
- Navigation: "open settings" / "go to settings" → agent: "zeus", intent: "navigate:settings"
- Navigation: "show [agent name]" / "open [agent name]" → agent: that agent's name, intent: "navigate:[agent]"
- Daily briefing: "good morning" / "give me my briefing" / "morning briefing" / "daily briefing" → agent: "zeus", intent: "briefing"
- Quick task add: "add task [title]" / "remind me to [task]" → agent: "artemis", intent: "quick_task:[title]"
- Quick note: "remember [content]" / "note that [content]" → agent: "hera", intent: "quick_note:[content]"
- Meridian globe: ANY command mentioning meridian, globe, geopolitical, world news, toggle overlays, cables, cities, threats, analyst, briefing → agent: "meridian", intent: describe the action (NEVER use navigate:meridian — always route to the agent so it can process commands)
- Chicago city: ANY command mentioning chicago, CTA, transit, weather in chicago, games, events, train times → agent: "chicago", intent: describe the action (NEVER use navigate:chicago)
- Flexport sales: ANY command mentioning flexport, prospects, pipeline, vessels, hot leads, trade signals → agent: "flexport", intent: describe the action (NEVER use navigate:flexport)
- Poseidon web: "research this" / "look up" / "web search" / "fact check" → agent: "poseidon", intent: describe the action
- Iris vision: "take screenshot" / "analyze screen" / "what am I looking at" / "OCR this" → agent: "iris", intent: describe the action

IMPORTANT: For meridian, chicago, and flexport — NEVER return navigate: intents. Always route to the agent so it can handle multi-step commands (e.g., "toggle cities and cables then open meridian" must go to the meridian agent, not be a navigate).

Respond with JSON: { "agent": "<agent_name>", "intent": "<brief description or navigate:target>" }`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = response.choices[0].message.content!;
  try {
    return JSON.parse(content);
  } catch {
    return { agent: "zeus" as AgentName, intent: "general" };
  }
}

function logEvent(supabase: ReturnType<typeof createServiceClient>, sessionId: string, agentName: string, type: string, content: string) {
  // Fire-and-forget — never block the response on DB writes
  Promise.resolve(supabase.from("agent_events").insert({
    session_id: sessionId,
    agent_name: agentName,
    event_type: type,
    content,
  })).catch(() => {});
}

async function handleAgentRequest(
  agent: AgentName,
  intent: string,
  transcript: string,
  sessionId: string,
  extras?: Record<string, string | undefined>
): Promise<string> {
  const supabase = createServiceClient();
  logEvent(supabase, sessionId, agent, "thinking", intent);

  if (intent === "briefing") {
    try {
      const res = await fetch(`${getBaseUrl()}/api/briefing`);
      const data = await res.json();
      const reply = data.briefing;
      logEvent(supabase, sessionId, "zeus", "complete", reply);
      // Return agents_used for multi-agent line illumination
      return JSON.stringify({ __multi: true, response: reply, agents_used: data.agents_used || ["zeus"] });
    } catch {
      return "I had trouble assembling your briefing. Please try again.";
    }
  }

  if (intent.startsWith("navigate:")) {
    const target = intent.replace("navigate:", "");
    const EXTERNAL_LABELS: Record<string, string> = {
      meridian: "Meridian dashboard",
      chicago: "Chicago Explorer",
      flexport: "Flexport dashboard",
    };
    const label = EXTERNAL_LABELS[target] ?? (target === "settings" ? "settings" : `${target.charAt(0).toUpperCase() + target.slice(1)}'s panel`);
    const reply = `Opening ${label}.`;
    logEvent(supabase, sessionId, agent, "complete", reply);
    return reply;
  }

  if (agent === "zeus") {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "You are Zeus, a powerful AI assistant orchestrator. You are the main interface of the AgentZeus dashboard. Be helpful, concise, and speak with quiet authority. Keep responses under 3 sentences unless more detail is needed.",
        },
        { role: "user", content: transcript },
      ],
    });
    const reply = response.choices[0].message.content!;
    logEvent(supabase, sessionId, "zeus", "complete", reply);
    return reply;
  }

  // Call agent logic directly — no internal HTTP hop
  const params = { intent, transcript, session_id: sessionId, ...extras };
  switch (agent) {
    case "artemis":  return runArtemis(params);
    case "hera":     return runHera(params);
    case "hermes":   return runHermes(params);
    case "athena":   return runAthena(params);
    case "apollo":   return runApollo(params);
    case "ares":     return runAres(params);
    case "meridian": return runMeridian(params);
    case "chicago":  return runChicago(params);
    case "flexport": return runFlexport(params);
    case "clio":     return runClio(params);
    case "poseidon": return runPoseidon(params);
    case "iris":     return runIris(params);
    default:         return "Agent not found.";
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, github_token, vercel_token, slack_webhook } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();

    const { agent, intent } = await classifyIntent(transcript);
    const extras: Record<string, string | undefined> = {};
    if (agent === "athena" && github_token) extras.github_token = github_token;
    if (agent === "ares" && vercel_token) extras.vercel_token = vercel_token;
    if (agent === "hermes" && slack_webhook) extras.slack_webhook = slack_webhook;
    let response = await handleAgentRequest(agent, intent, transcript, sessionId, Object.keys(extras).length ? extras : undefined);

    // Check if this is a structured agent response (multi-agent or agent with open_app)
    let agents_used: string[] | undefined;
    let open_app: string | null = null;
    let bridge_actions: Array<{ cmd: string; payload: Record<string, unknown> }> | undefined;
    let navigate_page: string | undefined;
    try {
      const parsed = JSON.parse(response);
      if (parsed.__multi) {
        response = parsed.response;
        agents_used = parsed.agents_used;
      }
      if (parsed.__agent_response) {
        response = parsed.response;
        open_app = parsed.open_app || null;
        bridge_actions = parsed.bridge_actions;
        navigate_page = parsed.navigate_page;
      }
    } catch { /* not structured JSON, use as-is */ }

    // Fire-and-forget — don't await these, they must not delay the response
    const supabase = createServiceClient();
    Promise.resolve(supabase.from("conversations").insert({ transcript, agent_name: agent, response })).catch(() => {});
    extractMemoryFacts(transcript, response, agent).catch(() => {});

    return NextResponse.json({
      agent, intent, response, session_id: sessionId,
      ...(agents_used ? { agents_used } : {}),
      ...(open_app ? { open_app } : {}),
      ...(bridge_actions ? { bridge_actions } : {}),
      ...(navigate_page ? { navigate_page } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Zeus POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractMemoryFacts(transcript: string, response: string, agent: string): Promise<void> {
  const supabase = createServiceClient();

  const extraction = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Extract any memorable facts from this conversation exchange — names, decisions, commitments, preferences, or key information the user shared. Return only if something genuinely worth remembering was said.

Respond with JSON: { "facts": ["fact1", "fact2"] } — empty array if nothing worth saving.`,
      },
      { role: "user", content: `User: ${transcript}\nAgent (${agent}): ${response}` },
    ],
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extraction.choices[0].message.content!);
  } catch {
    return; // malformed JSON — skip memory extraction
  }
  const facts: string[] = (parsed.facts as string[]) || [];

  if (facts.length > 0) {
    const content = facts.map((f) => `- ${f}`).join("\n");
    await supabase.from("notes").insert({
      content: `[Memory from conversation]\n${content}`,
      tags: ["memory", "conversation", agent],
    });
  }
}
