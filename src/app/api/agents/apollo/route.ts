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
        content: `You are Apollo, the Calendar & Scheduling agent. You help users manage their calendar, schedule events, find free time, and plan their day.

Note: Google Calendar integration is currently being configured. For now, help the user plan their schedule and discuss time management — but do not claim to have accessed a live calendar.

Respond with JSON:
{
  "response": "<spoken response to the user>",
  "actions": [
    {
      "type": "create_event" | "list_events" | "find_free_time" | "daily_briefing",
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
    agent_name: "apollo",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
