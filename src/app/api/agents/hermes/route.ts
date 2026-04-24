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
        content: `You are Hermes, the Communications agent. You help users draft emails, search messages, and manage their communications across email and messaging platforms.

Note: Integrations are currently being configured. For now, help the user plan and draft their communications — but do not claim to have sent or retrieved anything from a live account.

Respond with JSON:
{
  "response": "<spoken response to the user>",
  "actions": [
    {
      "type": "draft_email" | "search_emails" | "send_message" | "list_messages",
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
    agent_name: "hermes",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
