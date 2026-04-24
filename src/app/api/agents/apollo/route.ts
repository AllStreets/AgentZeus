import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getGoogleToken } from "@/lib/googleAuth";

async function getCalendarContext(): Promise<string> {
  const token = await getGoogleToken("calendar");
  if (!token) return "Google Calendar is not connected.";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/calendar?action=today`);
    const data = await res.json();
    if (!data.connected) return "Google Calendar is not connected.";

    if (!data.events?.length) return "Calendar connected. No events today.";

    const eventList = data.events
      .map((e: { title: string; startFormatted: string; endFormatted: string }) => `${e.title} (${e.startFormatted}–${e.endFormatted})`)
      .join("; ");

    const next = data.nextEvent
      ? ` Next: ${data.nextEvent.title} in ${data.nextEvent.minutesUntil} minutes.`
      : "";

    return `Calendar connected. Today's events: ${eventList}.${next}`;
  } catch {
    return "Calendar connected but failed to fetch events.";
  }
}

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  const calContext = await getCalendarContext();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Apollo, the Calendar & Scheduling agent. You help users manage their time and schedule.

Current calendar context:
${calContext}

Use this data to answer questions about today's schedule, next meetings, and time remaining. If the calendar isn't connected, tell the user how to connect it via the Apollo panel.

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

  await supabase.from("agent_events").insert({
    session_id,
    agent_name: "apollo",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
