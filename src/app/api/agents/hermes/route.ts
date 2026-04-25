import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { getGoogleToken } from "@/lib/googleAuth";
import { getBaseUrl } from "@/lib/url";

interface EmailMsg { subject: string; from: string; snippet: string }
interface RunParams { intent: string; transcript: string; session_id: string; slack_webhook?: string }

async function getGmailContext(): Promise<{ summary: string; messages: EmailMsg[] }> {
  const token = await getGoogleToken("gmail");
  if (!token) return { summary: "Gmail is not connected.", messages: [] };
  try {
    const res = await fetch(`${getBaseUrl()}/api/gmail`, { cache: "no-store" });
    const data = await res.json();
    if (!data.connected) return { summary: "Gmail is not connected.", messages: [] };
    const messages: EmailMsg[] = (data.messages || []).slice(0, 8);
    const list = messages.map((m: EmailMsg) => {
      // Extract bare email address from "Display Name <email@domain.com>" format
      const emailMatch = m.from.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : m.from;
      return `Subject: "${m.subject}" | From: ${m.from} | ReplyTo: ${email} | Preview: ${m.snippet}`;
    }).join("\n");
    return { summary: `Gmail connected. Unread: ${data.unreadCount}.\n\nRecent emails:\n${list || "none"}`, messages };
  } catch {
    return { summary: "Gmail fetch failed.", messages: [] };
  }
}

async function createGmailDraft(token: string, to: string, subject: string, body: string): Promise<string | null> {
  try {
    const raw = btoa(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw } }),
    });
    const data = await res.json();
    return data.id || null;
  } catch { return null; }
}

export async function runHermes({ intent, transcript, session_id, slack_webhook }: RunParams): Promise<string> {
  const supabase = createServiceClient();
  const { summary: gmailSummary } = await getGmailContext();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Hermes, the Communications agent.

${gmailSummary}

${slack_webhook ? "Slack webhook is connected — you can send Slack messages." : "Slack is not connected."}

You can draft emails to any address the user specifies — new emails, replies to anyone, or follow-ups. If the user mentions replying to a recent email, use the ReplyTo address from the list above. If the user provides an email address explicitly, use it exactly as given. If the user mentions a name that matches a sender in the list, use that sender's address.
If the user wants to send a Slack message, include a send_slack action.

Respond with JSON:
{
  "response": "<spoken response — concise, under 3 sentences>",
  "actions": [
    {
      "type": "draft_email" | "send_slack",
      "data": { "to"?: "email", "subject"?: "subject", "body"?: "email body", "message"?: "slack text" }
    }
  ]
}`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  for (const action of content.actions || []) {
    if (action.type === "draft_email" && action.data?.body) {
      const gmailToken = await getGoogleToken("gmail");
      if (gmailToken) {
        const draftId = await createGmailDraft(gmailToken, action.data.to || "", action.data.subject || "Re:", action.data.body);
        if (draftId) content.response += " Draft saved to Gmail.";
      }
    }
    if (action.type === "send_slack" && action.data?.message && slack_webhook) {
      fetch(`${getBaseUrl()}/api/slack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: slack_webhook, message: action.data.message }),
      }).catch(() => {});
    }
  }

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "hermes", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runHermes(body);
  return NextResponse.json({ response });
}
