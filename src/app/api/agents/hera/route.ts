import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  let relevantNotes: Array<{ id: string; content: string; tags: string[]; similarity: number }> = [];

  try {
    const queryEmbedding = await getEmbedding(transcript);
    const { data } = await supabase.rpc("match_notes", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
    });
    relevantNotes = data || [];
  } catch {
    // No notes yet or vector search unavailable
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Hera, the Memory & Knowledge agent. You store and retrieve personal notes, bookmarks, and knowledge. You have perfect recall.

Relevant notes from memory:
${JSON.stringify(relevantNotes, null, 2)}

Based on the user's request, respond with JSON:
{
  "response": "<your spoken response to the user>",
  "actions": [
    {
      "type": "save_note" | "search" | "delete_note",
      "data": { "content": "...", "tags": ["..."], "id": "..." }
    }
  ]
}

When saving, extract the key information to store. When searching, summarize what you found conversationally. Keep responses concise — they will be spoken aloud.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  for (const action of content.actions || []) {
    if (action.type === "save_note") {
      const embedding = await getEmbedding(action.data.content);
      await supabase.from("notes").insert({
        content: action.data.content,
        tags: action.data.tags || [],
        embedding,
      });
    } else if (action.type === "delete_note" && action.data.id) {
      await supabase.from("notes").delete().eq("id", action.data.id);
    }
  }

  await supabase.from("agent_events").insert({
    session_id: session_id,
    agent_name: "hera",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
