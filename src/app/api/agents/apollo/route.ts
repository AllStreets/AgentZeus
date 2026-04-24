import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getGoogleToken } from "@/lib/googleAuth";
import { getBaseUrl } from "@/lib/url";

interface CalEvent {
  title: string;
  startFormatted: string;
  endFormatted: string;
  start: string;
  end: string;
  minutesUntil: number | null;
}

interface FreeBusyPeriod {
  start: string;
  end: string;
}

async function getCalendarContext(): Promise<{ summary: string; events: CalEvent[] }> {
  const token = await getGoogleToken("calendar");
  if (!token) return { summary: "Google Calendar is not connected.", events: [] };

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/calendar?action=today`, { cache: "no-store" });
    const data = await res.json();
    if (!data.connected) return { summary: "Google Calendar is not connected.", events: [] };
    if (!data.events?.length) return { summary: "Calendar connected. No events today.", events: [] };

    const eventList = data.events
      .map((e: CalEvent) => `${e.title} (${e.startFormatted}–${e.endFormatted})`)
      .slice(0, 8)
      .join(", ");
    const next = data.nextEvent ? ` Next: ${data.nextEvent.title} in ${data.nextEvent.minutesUntil} minutes.` : "";
    return { summary: `Today: ${eventList}.${next}`, events: data.events };
  } catch {
    return { summary: "Calendar fetch failed.", events: [] };
  }
}

async function findFreeSlots(token: string, days: number, durationMinutes: number): Promise<string> {
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 86400000).toISOString();

  // Use freebusy API
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) return "Could not fetch availability.";

  const data = await res.json();
  const busy: FreeBusyPeriod[] = data.calendars?.primary?.busy || [];

  // Find free slots during work hours (9am–6pm) of at least durationMinutes
  const freeSlots: string[] = [];
  const workStart = 9 * 60; // 9am in minutes
  const workEnd = 18 * 60; // 6pm

  for (let d = 0; d < days && freeSlots.length < 5; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);

    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends

    const dayBusy = busy
      .map((b) => ({
        start: Math.floor((new Date(b.start).getTime() - day.getTime()) / 60000),
        end: Math.ceil((new Date(b.end).getTime() - day.getTime()) / 60000),
      }))
      .filter((b) => b.end > workStart && b.start < workEnd)
      .sort((a, b) => a.start - b.start);

    let cursor = Math.max(workStart, Math.floor((now.getTime() - day.getTime()) / 60000) + 30);

    for (const busy of dayBusy) {
      if (busy.start - cursor >= durationMinutes) {
        const slotStart = new Date(day.getTime() + cursor * 60000);
        freeSlots.push(`${slotStart.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        cursor = busy.end;
        if (freeSlots.length >= 5) break;
      } else {
        cursor = Math.max(cursor, busy.end);
      }
    }

    if (freeSlots.length < 5 && workEnd - cursor >= durationMinutes) {
      const slotStart = new Date(day.getTime() + cursor * 60000);
      freeSlots.push(`${slotStart.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    }
  }

  return freeSlots.length > 0
    ? `Available ${durationMinutes}-min slots: ${freeSlots.join("; ")}.`
    : "No free slots found in the next week during work hours.";
}

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  const { summary: calContext } = await getCalendarContext();

  // Check if this is a scheduling/slot-finding request
  let slotContext = "";
  const isSchedulingRequest = /find.*slot|free.*time|schedule.*call|when.*free|available/i.test(transcript);
  if (isSchedulingRequest) {
    const token = await getGoogleToken("calendar");
    if (token) {
      const durationMatch = transcript.match(/(\d+)[- ]?min/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 30;
      slotContext = await findFreeSlots(token, 7, duration);
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Apollo, the Calendar & Scheduling agent.

Calendar context:
${calContext}

${slotContext ? `Free slot analysis:\n${slotContext}` : ""}

If the calendar isn't connected, tell the user to connect it via the Apollo panel.
If they asked about free slots, present the options naturally.

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
