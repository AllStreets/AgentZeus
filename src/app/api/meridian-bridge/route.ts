import { NextRequest, NextResponse } from "next/server";

// In-memory command queue — stores multiple commands so multi-step voice commands work
// Meridian dashboard polls GET repeatedly, consuming one command per poll
interface MeridianCommand {
  cmd: string;
  payload?: Record<string, unknown>;
  ts: number;
}

const _queue: MeridianCommand[] = [];

export async function GET() {
  // Pop the oldest pending command — one per poll cycle
  if (_queue.length > 0) {
    const command = _queue.shift()!;
    return NextResponse.json({ command }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }
  return NextResponse.json({ command: null }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  _queue.push({ cmd: body.cmd, payload: body.payload || {}, ts: Date.now() });
  // Trim to prevent unbounded growth if Meridian isn't polling
  while (_queue.length > 50) _queue.shift();
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
