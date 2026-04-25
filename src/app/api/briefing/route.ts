import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getGoogleToken } from "@/lib/googleAuth";
import { createServiceClient } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/url";

export async function GET() {
  const supabase = createServiceClient();

  // 1. Fetch pending high-priority tasks (Artemis)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, priority, status")
    .in("status", ["pending", "in_progress"])
    .eq("priority", "high")
    .limit(5);

  // 2. Fetch Gmail unread count (Hermes)
  let gmailSummary = "Gmail not connected.";
  const gmailToken = await getGoogleToken("gmail");
  if (gmailToken) {
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/gmail`);
      const data = await res.json();
      if (data.connected) {
        const subjects = (data.messages || []).slice(0, 3).map((m: { subject: string }) => `"${m.subject}"`).join(", ");
        gmailSummary = `${data.unreadCount} unread emails. Top subjects: ${subjects || "none"}.`;
      }
    } catch {
      gmailSummary = "Gmail fetch failed.";
    }
  }

  // 3. Fetch today's calendar events (Apollo)
  let calSummary = "Calendar not connected.";
  const calToken = await getGoogleToken("calendar");
  if (calToken) {
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/calendar?action=today`);
      const data = await res.json();
      if (data.connected && data.events?.length) {
        const eventList = data.events
          .map((e: { title: string; startFormatted: string }) => `${e.title} at ${e.startFormatted}`)
          .slice(0, 5)
          .join(", ");
        calSummary = `${data.events.length} events today: ${eventList}.`;
      } else if (data.connected) {
        calSummary = "No events on your calendar today.";
      }
    } catch {
      calSummary = "Calendar fetch failed.";
    }
  }

  // 4. Assemble briefing via Zeus
  const taskSummary = tasks?.length
    ? `${tasks.length} high-priority task${tasks.length > 1 ? "s" : ""}: ${tasks.map((t) => t.title).join(", ")}.`
    : "No high-priority tasks pending.";

  const briefingPrompt = `Create a natural, energizing morning briefing for a personal AI dashboard. Be concise (under 8 sentences total), speak as Zeus — powerful but helpful. Use this data:

Calendar: ${calSummary}
Email: ${gmailSummary}
Tasks: ${taskSummary}

Start with a time-of-day greeting, then cover calendar, email, and tasks in order. End with one sentence of encouragement.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: briefingPrompt }],
  });

  const briefing = response.choices[0].message.content!;

  // Track which agents contributed
  const agentsUsed: string[] = ["zeus"];
  if (tasks?.length) agentsUsed.push("artemis");
  if (gmailToken) agentsUsed.push("hermes");
  if (calToken) agentsUsed.push("apollo");

  return NextResponse.json({
    briefing,
    agents_used: agentsUsed,
    data: { tasks: taskSummary, gmail: gmailSummary, calendar: calSummary },
  });
}
