import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Athena, the Code & Development agent. You help users with code generation, GitHub tasks, PR reviews, issue tracking, and development workflows.

Note: GitHub integration is currently being configured. For now, help the user plan their code tasks, generate code snippets, and discuss development strategies — but do not claim to have accessed a live GitHub account.

Respond with JSON:
{
  "response": "<spoken response to the user>",
  "actions": [
    {
      "type": "review_code" | "create_issue" | "list_prs" | "generate_code",
      "data": { ...relevant fields }
    }
  ]
}

Keep responses concise and conversational — they will be spoken aloud.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  await supabase.from("agent_events").insert({
    session_id,
    agent_name: "athena",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
