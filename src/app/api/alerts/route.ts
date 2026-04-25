import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface Alert {
  type: "task" | "system" | "agent";
  agent: string;
  message: string;
}

export async function GET() {
  const alerts: Alert[] = [];
  const supabase = createServiceClient();

  // Artemis: check for overdue or high-priority tasks
  try {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, priority, status, due_date")
      .in("status", ["pending", "in_progress"])
      .eq("priority", "high")
      .limit(5);

    if (tasks) {
      const now = new Date();
      for (const task of tasks) {
        if (task.due_date) {
          const due = new Date(task.due_date);
          const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntil < 0) {
            alerts.push({ type: "task", agent: "artemis", message: `Overdue: "${task.title}"` });
          } else if (hoursUntil < 2) {
            alerts.push({ type: "task", agent: "artemis", message: `Due soon: "${task.title}" (${Math.round(hoursUntil * 60)}m)` });
          }
        }
      }
    }
  } catch {
    // silent
  }

  // Ares: check system health
  try {
    const res = await fetch(new URL("/api/health", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").toString());
    const data = await res.json();
    if (!data.openai) {
      alerts.push({ type: "system", agent: "ares", message: "OpenAI API key not configured" });
    }
    if (!data.supabase) {
      alerts.push({ type: "system", agent: "ares", message: "Supabase connection issue detected" });
    }
  } catch {
    // silent
  }

  return NextResponse.json({ alerts });
}
