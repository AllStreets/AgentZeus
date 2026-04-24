import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/url";

interface RunParams { intent: string; transcript: string; session_id: string; vercel_token?: string }

async function getVercelContext(token: string): Promise<string> {
  if (!token) return "Vercel not connected.";
  try {
    const res = await fetch(`${getBaseUrl()}/api/vercel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (data.error) return `Vercel error: ${data.error}`;
    const list = data.deployments.slice(0, 5).map((d: { name: string; state: string; age: number }) => `${d.name}: ${d.state} (${d.age}m ago)`).join("; ");
    return `Recent Vercel deployments: ${list}.`;
  } catch { return "Vercel fetch failed."; }
}

export async function runAres({ intent, transcript, session_id, vercel_token }: RunParams): Promise<string> {
  const supabase = createServiceClient();
  const vercelContext = await getVercelContext(vercel_token || "");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Ares, the System & DevOps agent. You monitor infrastructure and deployments.

Current system context:
${vercelContext}

Respond with JSON:
{
  "response": "<spoken response — concise, under 3 sentences>",
  "actions": []
}`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "ares", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runAres(body);
  return NextResponse.json({ response });
}
