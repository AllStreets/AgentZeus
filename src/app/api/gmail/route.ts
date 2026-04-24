import { NextRequest, NextResponse } from "next/server";
import { getGoogleToken } from "@/lib/googleAuth";

interface GmailMessage {
  id: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers?: { name: string; value: string }[];
  };
}

interface GmailLabel {
  id: string;
  name: string;
  messagesUnread?: number;
}

async function gmailFetch(path: string, token: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "summary";
  const token = await getGoogleToken("gmail");

  if (!token) return NextResponse.json({ connected: false });

  try {
    if (action === "summary") {
      // Fetch INBOX label detail (has messagesUnread) + inbox messages in parallel
      const [inboxLabel, listData] = await Promise.all([
        gmailFetch("/users/me/labels/INBOX", token) as Promise<GmailLabel>,
        gmailFetch("/users/me/messages?labelIds=INBOX&maxResults=15", token),
      ]);

      const unreadCount = inboxLabel?.messagesUnread ?? 0;

      const messages: { id: string; subject: string; from: string; snippet: string; date: string; unread: boolean }[] = [];

      if (listData.messages?.length) {
        // Fetch metadata for each message — each header must be a separate metadataHeaders param
        const details = await Promise.all(
          (listData.messages as { id: string }[]).slice(0, 12).map((m) =>
            gmailFetch(
              `/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              token
            )
          )
        );

        for (const msg of details as GmailMessage[]) {
          const headers = msg.payload?.headers || [];
          const get = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
          messages.push({
            id: msg.id,
            subject: get("Subject") || "(no subject)",
            from: get("From"),
            snippet: msg.snippet,
            date: get("Date"),
            unread: msg.labelIds?.includes("UNREAD") ?? false,
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
