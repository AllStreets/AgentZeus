import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const checks = {
    openai: !!process.env.OPENAI_API_KEY,
    supabase: false,
  };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("notes").select("id").limit(1);
    checks.supabase = !error;
  } catch {}

  return NextResponse.json(checks);
}
