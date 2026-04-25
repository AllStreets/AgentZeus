import { NextRequest, NextResponse } from "next/server";

// In-memory command queue — simple ring buffer, no DB needed
// MERIDIAN polls GET, Meridian agent writes via POST
interface MeridianCommand {
  cmd: string;
  payload?: Record<string, unknown>;
  ts: number;
}

let _latest: MeridianCommand | null = null;
let _lastConsumed = 0;

export async function GET() {
  // Return command only if it's new (not yet consumed)
  if (_latest && _latest.ts > _lastConsumed) {
    _lastConsumed = _latest.ts;
    return NextResponse.json({ command: _latest }, {
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
  _latest = { cmd: body.cmd, payload: body.payload || {}, ts: Date.now() };
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
