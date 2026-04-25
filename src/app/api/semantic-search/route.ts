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

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createServiceClient();

    // Fetch all notes
    const { data: notes } = await supabase
      .from("notes")
      .select("content, tags")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!notes?.length) {
      return NextResponse.json({ results: [] });
    }

    // Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // Get embeddings for all notes and compute similarity
    const noteTexts = notes.map((n) => n.content);
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: noteTexts,
    });

    const scored = notes.map((note, i) => ({
      content: note.content,
      tags: note.tags || [],
      score: cosineSimilarity(queryEmbedding, embeddingResponse.data[i].embedding),
    }));

    // Sort by similarity and return top results
    scored.sort((a, b) => b.score - a.score);
    const results = scored.filter((r) => r.score > 0.3).slice(0, 10);

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message, results: [] }, { status: 500 });
  }
}
