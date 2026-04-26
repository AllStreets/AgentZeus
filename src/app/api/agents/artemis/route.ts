import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { safeParseAgent } from "@/lib/safeJson";

interface RunParams { intent: string; transcript: string; session_id: string }

export async function runArtemis({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Artemis, the Tasks & Productivity agent.

Current tasks:
${JSON.stringify(tasks || [], null, 2)}

If the user asks to "break down" a project or task, generate 3-7 specific subtasks as create_task actions, then generate one "save_note" action with a structured breakdown summary (for Hera's memory).

Respond with JSON:
{
  "response": "<spoken response>",
  "actions": [
    {
      "type": "create_task" | "update_task" | "delete_task" | "list_tasks" | "save_note",
      "data": { title?, description?, status?, priority?, due_date?, id?, content?, tags? }
    }
  ]
}

Keep responses concise — spoken aloud. If listing tasks, summarize naturally.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = safeParseAgent(response.choices[0].message.content!);

  for (const action of content.actions || []) {
    switch (action.type) {
      case "create_task":
        await supabase.from("tasks").insert({
          title: action.data.title,
          description: action.data.description || "",
          priority: action.data.priority || "medium",
          due_date: action.data.due_date || null,
        });
        break;
      case "update_task":
        await supabase.from("tasks").update({
          status: action.data.status,
          title: action.data.title,
          priority: action.data.priority,
        }).eq("id", action.data.id);
        break;
      case "delete_task":
        await supabase.from("tasks").delete().eq("id", action.data.id);
        break;
      case "save_note":
        await supabase.from("notes").insert({
          content: action.data.content,
          tags: action.data.tags || ["task-breakdown"],
        });
        break;
    }
  }

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "artemis", event_type: "complete", content: content.response,
  })).catch(() => {});

  return content.response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runArtemis(body);
  return NextResponse.json({ response });
}
