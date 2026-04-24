import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/url";
import { AgentName } from "@/types";

export const maxDuration = 30;

const AGENT_DESCRIPTIONS: Record<Exclude<AgentName, "zeus">, string> = {
  hermes: "Communications — email, Slack, Discord messaging",
  athena: "Code & Dev — GitHub, PRs, code generation, deployments",
  apollo: "Calendar & Scheduling — events, meetings, daily briefings",
  artemis: "Tasks & Productivity — todos, habits, goals, task management",
  ares: "System & DevOps — server monitoring, deployments, error logs",
  hera: "Memory & Knowledge — storing/retrieving notes, bookmarks, semantic search",
};

async function classifyIntent(transcript: string): Promise<{ agent: AgentName; intent: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
- Navigation: "show my tasks" / "open tasks" / "show Artemis" → agent: "artemis", intent: "navigate:artemis"
- Navigation: "show notes" / "open Hera" / "my notes" → agent: "hera", intent: "navigate:hera"
- Navigation: "open settings" / "go to settings" → agent: "zeus", intent: "navigate:settings"
- Navigation: "show [agent name]" / "open [agent name]" → agent: that agent's name, intent: "navigate:[agent]"
- Daily briefing: "good morning" / "give me my briefing" / "morning briefing" / "daily briefing" → agent: "zeus", intent: "briefing"
- Quick task add: "add task [title]" / "remind me to [task]" → agent: "artemis", intent: "quick_task:[title]"
- Quick note: "remember [content]" / "note that [content]" → agent: "hera", intent: "quick_note:[content]"

Respond with JSON: { "agent": "<agent_name>", "intent": "<brief description or navigate:target>" }`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = response.choices[0].message.content!;
  return JSON.parse(content);
}

async function handleAgentRequest(
  agent: AgentName,
  intent: string,
  transcript: string,
  sessionId: string,
  extras?: Record<string, string | undefined>
): Promise<string> {
  const supabase = createServiceClient();

  // Write "thinking" event
  await supabase.from("agent_events").insert({
    session_id: sessionId,
    agent_name: agent,
    event_type: "thinking",
    content: intent,
  });

  // Daily briefing — multi-agent sequence
  if (intent === "briefing") {
    const baseUrl = getBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/briefing`);
      const data = await res.json();
      const reply = data.briefing;
      await supabase.from("agent_events").insert({
        session_id: sessionId,
        agent_name: "zeus",
        event_type: "complete",
        content: reply,
      });
      return reply;
    } catch {
      return "I had trouble assembling your briefing. Please try again.";
    }
  }

  // Navigation intents — short acknowledgment, no agent sub-call needed
  if (intent.startsWith("navigate:")) {
    const target = intent.replace("navigate:", "");
    const label = target === "settings" ? "settings" : `${target.charAt(0).toUpperCase() + target.slice(1)}'s panel`;
    const reply = `Opening ${label}.`;
    await supabase.from("agent_events").insert({
      session_id: sessionId,
      agent_name: agent,
      event_type: "complete",
      content: reply,
    });
    return reply;
  }

  if (agent === "zeus") {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Zeus, a powerful AI assistant orchestrator. You are the main interface of the AgentZeus dashboard. Be helpful, concise, and speak with quiet authority. Keep responses under 3 sentences unless more detail is needed.",
        },
        { role: "user", content: transcript },
      ],
    });

    const reply = response.choices[0].message.content!;

    await supabase.from("agent_events").insert({
      session_id: sessionId,
      agent_name: "zeus",
      event_type: "complete",
      content: reply,
    });

    return reply;
  }

  // Delegate to agent-specific API route
  const baseUrl = getBaseUrl();
  const agentResponse = await fetch(`${baseUrl}/api/agents/${agent}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, transcript, session_id: sessionId, ...extras }),
  });

  const data = await agentResponse.json();
  return data.response;
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
    const response = await handleAgentRequest(agent, intent, transcript, sessionId, Object.keys(extras).length ? extras : undefined);

    // Fire-and-forget — don't await these, they must not delay the response
    const supabase = createServiceClient();
    supabase.from("conversations").insert({ transcript, agent_name: agent, response }).catch(() => {});
    extractMemoryFacts(transcript, response, agent).catch(() => {});

    return NextResponse.json({ agent, intent, response, session_id: sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Zeus POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function extractMemoryFacts(transcript: string, response: string, agent: string): Promise<void> {
  const supabase = createServiceClient();

  const extraction = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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

  const parsed = JSON.parse(extraction.choices[0].message.content!);
  const facts: string[] = parsed.facts || [];

  if (facts.length > 0) {
    const content = facts.map((f) => `- ${f}`).join("\n");
    await supabase.from("notes").insert({
      content: `[Memory from conversation]\n${content}`,
      tags: ["memory", "conversation", agent],
    });
  }
}
