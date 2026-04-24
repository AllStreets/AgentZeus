import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text, voice } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const selectedVoice = (voice as string) || "onyx";

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: selectedVoice as "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer",
    input: text,
    response_format: "mp3",
  });

  // Stream the response body directly — client starts playing before full download
  return new NextResponse(response.body as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
