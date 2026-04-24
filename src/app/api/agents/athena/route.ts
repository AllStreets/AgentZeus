import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

async function fetchGitHubSummary(token: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action: "summary" }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  if (data.error) return "";
  return `GitHub user: @${data.login}. Open PRs assigned to you: ${data.prs.length}. Open issues you created: ${data.issues.length}. Recent repos: ${data.repos.slice(0, 3).map((r: { name: string }) => r.name).join(", ")}.`;
}

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id, github_token } = await req.json();
  const supabase = createServiceClient();

  let githubContext = "";
  if (github_token) {
    githubContext = await fetchGitHubSummary(github_token);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Athena, the Code & Development agent. You help with GitHub, code generation, PR reviews, and development workflows.

${githubContext ? `Current GitHub context:\n${githubContext}\n` : "GitHub is not connected. Encourage the user to add their token in Settings or the Athena panel."}

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
    agent_name: "athena",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
