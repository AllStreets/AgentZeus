import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
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
        content: `You are Artemis, the Tasks & Productivity agent. You manage todos, habits, goals, and focus sessions.

Current tasks:
${JSON.stringify(tasks || [], null, 2)}

Based on the user's request, respond with JSON:
{
  "response": "<your spoken response to the user>",
  "actions": [
    {
      "type": "create_task" | "update_task" | "delete_task" | "list_tasks",
      "data": { ...relevant fields: title, description, status, priority, due_date, id }
    }
  ]
}

Keep responses concise and conversational — these will be spoken aloud. If listing tasks, summarize them naturally rather than reading raw data.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

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
        await supabase
          .from("tasks")
          .update({
            status: action.data.status,
            title: action.data.title,
            priority: action.data.priority,
          })
          .eq("id", action.data.id);
        break;
      case "delete_task":
        await supabase.from("tasks").delete().eq("id", action.data.id);
        break;
    }
  }

  await supabase.from("agent_events").insert({
    session_id: session_id,
    agent_name: "artemis",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
