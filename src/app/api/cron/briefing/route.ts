import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/url";

// Called by Vercel Cron at 8am daily
export async function GET() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });

  const baseUrl = getBaseUrl();

  // Fetch briefing
  const res = await fetch(`${baseUrl}/api/briefing`);
  const data = await res.json();

  // Optional: POST to a Slack webhook if configured
  const slackWebhook = process.env.SLACK_BRIEFING_WEBHOOK;
  if (slackWebhook && data.briefing) {
    await fetch(slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*AgentZeus Morning Briefing*\n\n${data.briefing}` }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, briefing: data.briefing });
}
