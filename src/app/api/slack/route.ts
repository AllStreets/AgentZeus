import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { webhookUrl, message, channel } = await req.json();

  if (!webhookUrl) return NextResponse.json({ error: "No webhook URL" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "No message" }, { status: 400 });

  const payload: Record<string, string> = { text: message };
  if (channel) payload.channel = channel;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Slack error: ${text}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
