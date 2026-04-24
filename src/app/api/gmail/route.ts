import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/googleAuth";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
  internalDate?: string;
}

interface GmailLabel {
  id: string;
  name: string;
  messagesUnread?: number;
}

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "summary";
  const token = await getGoogleToken("gmail");

  if (!token) {
    return NextResponse.json({ connected: false });
  }

  try {
    if (action === "summary") {
      const [labelsData, listData] = await Promise.all([
        gmailFetch("/users/me/labels", token),
        gmailFetch("/users/me/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=10", token),
      ]);

      const inboxLabel = (labelsData.labels as GmailLabel[]).find((l) => l.id === "INBOX");
      const unreadCount = inboxLabel?.messagesUnread ?? 0;

      const messages: { id: string; subject: string; from: string; snippet: string; date: string }[] = [];

      if (listData.messages?.length) {
        const details = await Promise.all(
          listData.messages.slice(0, 8).map((m: { id: string }) =>
            gmailFetch(`/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject,From,Date`, token)
          )
        );

        for (const msg of details as GmailMessage[]) {
          const headers = msg.payload?.headers || [];
          const get = (name: string) => headers.find((h) => h.name === name)?.value || "";
          messages.push({
            id: msg.id,
            subject: get("Subject") || "(no subject)",
            from: get("From"),
            snippet: msg.snippet,
            date: get("Date"),
          });
        }
      }

      return NextResponse.json({ connected: true, unreadCount, messages });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const { disconnectService } = await import("@/lib/googleAuth");
  await disconnectService("gmail");
  return NextResponse.json({ success: true });
}
