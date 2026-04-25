import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export interface Automation {
  id: string;
  name: string;
  trigger_agent: string;
  trigger_event: string;
  trigger_pattern: string;
  action_agent: string;
  action_type: string;
  action_data: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

// In-memory store (would be Supabase table in production)
let automations: Automation[] = [
  {
    id: "auto-1",
    name: "Email → Task",
    trigger_agent: "hermes",
    trigger_event: "complete",
    trigger_pattern: "urgent|action required|deadline",
    action_agent: "artemis",
    action_type: "create_task",
    action_data: { priority: "high" },
    enabled: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "auto-2",
    name: "Deploy Alert",
    trigger_agent: "ares",
    trigger_event: "complete",
    trigger_pattern: "error|failed|down",
    action_agent: "hermes",
    action_type: "send_slack",
    action_data: { message: "Ares detected a deployment issue" },
    enabled: false,
    created_at: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "create") {
    const newAuto: Automation = {
      id: `auto-${Date.now()}`,
      name: body.name || "New Automation",
      trigger_agent: body.trigger_agent,
      trigger_event: body.trigger_event || "complete",
      trigger_pattern: body.trigger_pattern || ".*",
      action_agent: body.action_agent,
      action_type: body.action_type || "notify",
      action_data: body.action_data || {},
      enabled: true,
      created_at: new Date().toISOString(),
    };
    automations.push(newAuto);
    return NextResponse.json({ automation: newAuto });
  }

  if (body.action === "toggle") {
    const auto = automations.find((a) => a.id === body.id);
    if (auto) auto.enabled = !auto.enabled;
    return NextResponse.json({ automation: auto });
  }

  if (body.action === "delete") {
    automations = automations.filter((a) => a.id !== body.id);
    return NextResponse.json({ success: true });
  }

  // Check triggers against an event
  if (body.action === "check") {
    const { agent_name, event_type, content } = body;
    const matched = automations.filter(
      (a) =>
        a.enabled &&
        a.trigger_agent === agent_name &&
        a.trigger_event === event_type &&
        new RegExp(a.trigger_pattern, "i").test(content)
    );
    return NextResponse.json({ matched });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
