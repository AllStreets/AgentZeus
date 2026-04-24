import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Ares, the System & DevOps agent. You help users monitor infrastructure, track deployments, analyze errors, and maintain system health.

Note: Monitoring API integrations are currently being configured. For now, help the user plan their infrastructure tasks and discuss system status — but do not claim to have accessed live monitoring data.

Respond with JSON:
{
  "response": "<spoken response to the user>",
  "actions": [
    {
      "type": "check_status" | "list_deployments" | "analyze_errors" | "run_health_check",
      "data": { ...relevant fields }
    }
  ]
}

Keep responses concise and conversational — they will be spoken aloud.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  await supabase.from("agent_events").insert({
    session_id,
    agent_name: "ares",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
