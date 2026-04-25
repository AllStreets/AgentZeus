import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/googleAuth";

interface CalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink: string;
}

async function calFetch(path: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "today";
  const token = await getGoogleToken("calendar");

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let from: Date;
    let to: Date;
    let maxResults = "10";

    if (action === "tomorrow") {
      from = new Date(today.getTime() + 86400000);
      to = new Date(today.getTime() + 86400000 * 2);
    } else if (action === "week") {
      from = today;
      to = new Date(today.getTime() + 86400000 * 7);
      maxResults = "50";
    } else {
      from = today;
      to = new Date(today.getTime() + 86400000);
    }

    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults,
    });

    const data = await calFetch(`/calendars/primary/events?${params}`, token);

    const events = (data.items as CalendarEvent[]).map((e) => {
      const start = e.start.dateTime || e.start.date || "";
      const end = e.end.dateTime || e.end.date || "";
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;

      const minutesUntil = startDate ? Math.floor((startDate.getTime() - now.getTime()) / 60000) : null;

      // For week view: label day relative to today
      let dayLabel: string | null = null;
      if (startDate) {
        const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86400000);
        if (diffDays === 0) dayLabel = "Today";
        else if (diffDays === 1) dayLabel = "Tomorrow";
        else dayLabel = startDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      }

      return {
        id: e.id,
        title: e.summary || "(no title)",
        start,
        end,
        startFormatted: startDate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || "",
        endFormatted: endDate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || "",
        location: e.location || null,
        url: e.htmlLink,
        minutesUntil,
        dayLabel,
        isNow: minutesUntil !== null && minutesUntil <= 0 && endDate ? endDate.getTime() > now.getTime() : false,
      };
    });

    const nextEvent = events.find((e) => e.minutesUntil !== null && e.minutesUntil > 0);

    return NextResponse.json({ connected: true, events, nextEvent: nextEvent || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const { disconnectService } = await import("@/lib/googleAuth");
  await disconnectService("calendar");
  return NextResponse.json({ success: true });
}
