import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  let pageText = "";
  let pageTitle = "";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgentZeus/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    pageTitle = titleMatch ? titleMatch[1].trim() : url;

    // Strip HTML tags and collapse whitespace
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 6000);
  } catch {
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Summarize the key points from this web page content in 2-4 sentences. Be concise. Extract any important names, facts, or decisions. Return only the summary — no preamble.`,
      },
      { role: "user", content: `Title: ${pageTitle}\n\nContent: ${pageText}` },
    ],
  });

  const summary = completion.choices[0].message.content!;
  const note = `[Clipped from ${url}]\n\n${summary}`;

  // Save to Hera notes (no embedding for clip — keeps it free)
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("notes")
    .insert({ content: note, tags: ["clip", "web"] })
    .select("id")
    .single();

  return NextResponse.json({ success: true, id: data?.id, summary, title: pageTitle });
}
