import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { safeParseAgent } from "@/lib/safeJson";

interface RunParams { intent: string; transcript: string; session_id: string }

export async function runClio({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  // Fetch recent notes for context
  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .not("tags", "cs", '{"memory"}')
    .order("created_at", { ascending: false })
    .limit(10);

  const notesContext = notes && notes.length > 0
    ? notes.map((n: { content: string; created_at: string }) =>
        `[${new Date(n.created_at).toLocaleDateString()}] ${n.content.slice(0, 120)}${n.content.length > 120 ? "..." : ""}`
      ).join("\n")
    : "No notes yet.";

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Clio, the voice-notes and transcription agent. You help record, organize, and summarize spoken notes.

Recent notes:
${notesContext}

You can:
- Save a new voice note when the user says something to record
- Summarize recent notes
- Answer questions about what's been recorded
- Help find specific notes

Respond with JSON:
{
  "response": "<spoken response — concise, warm, under 3 sentences>",
  "action": "save" | "summarize" | "search" | null,
  "note_content": "<content to save if action is save, otherwise null>"
}`,
      },
      { role: "user", content: transcript },
    ],
  });

  const parsed = safeParseAgent(response.choices[0].message.content!);

  // If Clio wants to save a note, do it
  if (parsed.action === "save" && parsed.note_content) {
    await supabase.from("notes").insert({
      content: parsed.note_content,
      tags: ["voice-note", "clio"],
    });
  }

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "clio", event_type: "complete", content: parsed.response,
  })).catch(() => {});

  return parsed.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Summarize a specific note
  if (body.action === "summarize" && body.content) {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "Summarize this note concisely in 2-3 sentences. Capture the key points and any action items.",
        },
        { role: "user", content: body.content },
      ],
    });
    return NextResponse.json({ summary: response.choices[0].message.content });
  }

  const result = await runClio(body);
  return NextResponse.json({ response: result });
}
