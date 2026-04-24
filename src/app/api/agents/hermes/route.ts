import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getGoogleToken } from "@/lib/googleAuth";

async function getGmailContext(): Promise<string> {
  const token = await getGoogleToken("gmail");
  if (!token) return "Gmail is not connected.";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/gmail`, {
      headers: { Cookie: "" }, // server-to-server, no cookies needed
    });
    const data = await res.json();
    if (!data.connected) return "Gmail is not connected.";

    const subjects = (data.messages || []).slice(0, 5).map((m: { subject: string; from: string }) => `"${m.subject}" from ${m.from}`).join("; ");
    return `Gmail connected. Unread: ${data.unreadCount}. Recent unread: ${subjects || "none"}.`;
  } catch {
    return "Gmail connected but failed to fetch.";
  }
}

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  const gmailContext = await getGmailContext();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Hermes, the Communications agent. You help users manage email and messaging.

Current Gmail context:
${gmailContext}

If the user asks to read an email, summarize the most relevant one from the context. If they ask to draft or send, write the draft and note it needs confirmation. If Gmail isn't connected, tell them how to connect it.

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
    agent_name: "hermes",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
