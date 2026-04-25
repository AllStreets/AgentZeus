import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

interface RunParams { intent: string; transcript: string; session_id: string }

export async function runPoseidon({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Poseidon, the Web Intelligence agent. You help users with:
- Deep web research and information gathering
- Summarizing web content and articles
- Finding and analyzing online sources
- Competitive intelligence and market research
- Fact-checking and source verification
- URL analysis and link context

You speak with calm authority like the god of the seas — measured, deep, all-knowing about the currents of information flowing through the web.

Keep responses concise (under 3 sentences). If you cannot actually browse the web, explain what you would search for and provide your best knowledge-based answer.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const reply = response.choices[0].message.content!;

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "poseidon", event_type: "complete", content: reply,
  })).catch(() => {});

  return reply;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runPoseidon(body);
  return NextResponse.json({ response });
}
