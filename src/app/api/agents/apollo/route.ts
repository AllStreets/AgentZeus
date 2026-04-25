import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getGoogleToken } from "@/lib/googleAuth";
import { getBaseUrl } from "@/lib/url";

interface CalEvent { title: string; startFormatted: string; endFormatted: string; start: string; end: string; minutesUntil: number | null }
interface FreeBusyPeriod { start: string; end: string }
interface RunParams { intent: string; transcript: string; session_id: string }

async function createCalendarEvent(token: string, title: string, start: string, end: string, description?: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        description: description || "",
        start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      }),
    });
    const data = await res.json();
    return data.id || null;
  } catch { return null; }
}

async function getCalendarContext(): Promise<{ summary: string }> {
  const token = await getGoogleToken("calendar");
  if (!token) return { summary: "Google Calendar is not connected." };
  try {
    const res = await fetch(`${getBaseUrl()}/api/calendar?action=today`, { cache: "no-store" });
    const data = await res.json();
    if (!data.connected) return { summary: "Google Calendar is not connected." };
    if (!data.events?.length) return { summary: "Calendar connected. No events today." };
    const eventList = data.events.map((e: CalEvent) => `${e.title} (${e.startFormatted}–${e.endFormatted})`).slice(0, 8).join(", ");
    const next = data.nextEvent ? ` Next: ${data.nextEvent.title} in ${data.nextEvent.minutesUntil} minutes.` : "";
    return { summary: `Today: ${eventList}.${next}` };
  } catch {
    return { summary: "Calendar fetch failed." };
  }
}

async function findFreeSlots(token: string, days: number, durationMinutes: number): Promise<string> {
  const now = new Date();
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: now.toISOString(), timeMax: new Date(now.getTime() + days * 86400000).toISOString(), items: [{ id: "primary" }] }),
  });
  if (!res.ok) return "Could not fetch availability.";
  const data = await res.json();
  const busy: FreeBusyPeriod[] = data.calendars?.primary?.busy || [];
  const workStart = 9 * 60, workEnd = 18 * 60;
  const freeSlots: string[] = [];

  for (let d = 0; d < days && freeSlots.length < 5; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const dayBusy = busy.map((b) => ({
      start: Math.floor((new Date(b.start).getTime() - day.getTime()) / 60000),
      end: Math.ceil((new Date(b.end).getTime() - day.getTime()) / 60000),
    })).filter((b) => b.end > workStart && b.start < workEnd).sort((a, b) => a.start - b.start);
    let cursor = Math.max(workStart, Math.floor((now.getTime() - day.getTime()) / 60000) + 30);
    for (const b of dayBusy) {
      if (b.start - cursor >= durationMinutes) {
        const s = new Date(day.getTime() + cursor * 60000);
        freeSlots.push(`${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
        cursor = b.end;
        if (freeSlots.length >= 5) break;
      } else { cursor = Math.max(cursor, b.end); }
    }
    if (freeSlots.length < 5 && workEnd - cursor >= durationMinutes) {
      const s = new Date(day.getTime() + cursor * 60000);
      freeSlots.push(`${s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    }
  }
  return freeSlots.length > 0 ? `Available ${durationMinutes}-min slots: ${freeSlots.join("; ")}.` : "No free slots found in the next week during work hours.";
}

export async function runApollo({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();
  const { summary: calContext } = await getCalendarContext();

  let slotContext = "";
  if (/find.*slot|free.*time|schedule.*call|when.*free|available/i.test(transcript)) {
    const token = await getGoogleToken("calendar");
    if (token) {
      const durationMatch = transcript.match(/(\d+)[- ]?min/i);
      slotContext = await findFreeSlots(token, 7, durationMatch ? parseInt(durationMatch[1]) : 30);
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Apollo, the Calendar & Scheduling agent. Today is ${new Date().toISOString()}.

Calendar context:
${calContext}

${slotContext ? `Free slot analysis:\n${slotContext}` : ""}

If the calendar isn't connected, tell the user to connect it via the Apollo panel.
If they asked about free slots, present the options naturally.
If the user wants to add/create/schedule an event, include a create_event action with ISO 8601 start and end times. Infer reasonable defaults (1 hour duration if not specified).

Respond with JSON:
{
  "response": "<spoken response — concise, under 3 sentences>",
  "actions": [
    {
      "type": "create_event",
      "data": { "title": "...", "start": "2025-01-01T10:00:00", "end": "2025-01-01T11:00:00", "description": "..." }
    }
  ]
}`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  for (const action of content.actions || []) {
    if (action.type === "create_event" && action.data?.title && action.data?.start) {
      const token = await getGoogleToken("calendar");
      if (token) {
        const end = action.data.end || new Date(new Date(action.data.start).getTime() + 3600000).toISOString();
        const id = await createCalendarEvent(token, action.data.title, action.data.start, end, action.data.description);
        if (id) content.response += " Event added to your calendar.";
      }
    }
  }

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "apollo", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runApollo(body);
  return NextResponse.json({ response });
}
