import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

interface RunParams { intent: string; transcript: string; session_id: string }

export async function runIris({ intent, transcript, session_id }: RunParams): Promise<string> {
  const supabase = createServiceClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Iris, the Screen & Vision agent. You help users with:
- Analyzing screenshots and images
- OCR and text extraction from visuals
- Describing visual content and UI elements
- Comparing visual designs
- Interpreting charts, graphs, and data visualizations
- Screen context understanding

You are the messenger between the visual world and understanding — named after the goddess of the rainbow who bridges heaven and earth.

Keep responses concise (under 3 sentences). If no image is provided, explain what you would need to see and offer guidance based on the description.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const reply = response.choices[0].message.content!;

  Promise.resolve(supabase.from("agent_events").insert({
    session_id, agent_name: "iris", event_type: "complete", content: reply,
  })).catch(() => {});

  return reply;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await runIris(body);
  return NextResponse.json({ response });
}
