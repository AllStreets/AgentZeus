import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { AgentName } from "@/types";

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

Also detect navigation commands and return a navigate: intent:
- "show my tasks" / "open tasks" / "show Artemis" → agent: "artemis", intent: "navigate:artemis"
- "show notes" / "open Hera" / "my notes" → agent: "hera", intent: "navigate:hera"
- "open settings" / "go to settings" → agent: "zeus", intent: "navigate:settings"
- "show [agent name]" / "open [agent name]" → agent: that agent's name, intent: "navigate:[agent]"

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
      model: "gpt-5.4-mini",
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const agentResponse = await fetch(`${baseUrl}/api/agents/${agent}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, transcript, session_id: sessionId, ...extras }),
  });

  const data = await agentResponse.json();
  return data.response;
}

export async function POST(req: NextRequest) {
  const { transcript, github_token } = await req.json();

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();

  const { agent, intent } = await classifyIntent(transcript);
  const extras = agent === "athena" && github_token ? { github_token } : undefined;
  const response = await handleAgentRequest(agent, intent, transcript, sessionId, extras);

  const supabase = createServiceClient();
  await supabase.from("conversations").insert({
    transcript,
    agent_name: agent,
    response,
  });

  return NextResponse.json({ agent, intent, response, session_id: sessionId });
}
