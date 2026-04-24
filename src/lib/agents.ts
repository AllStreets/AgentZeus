import { AgentInfo } from "@/types";

export const agents: AgentInfo[] = [
  {
    name: "zeus",
    displayName: "Zeus",
    domain: "Orchestrator",
    description: "Receives commands and delegates to the right agent",
    color: "#f59e0b",
    icon: "Z",
  },
  {
    name: "hermes",
    displayName: "Hermes",
    domain: "Communications",
    description: "Email, Slack, and Discord management",
    color: "#14b8a6",
    icon: "H",
  },
  {
    name: "athena",
    displayName: "Athena",
    domain: "Code & Dev",
    description: "GitHub, PRs, code generation, deployments",
    color: "#8b5cf6",
    icon: "A",
  },
  {
    name: "apollo",
    displayName: "Apollo",
    domain: "Calendar",
    description: "Scheduling, events, and daily briefings",
    color: "#f97316",
    icon: "Ap",
  },
  {
    name: "artemis",
    displayName: "Artemis",
    domain: "Tasks & Productivity",
    description: "Todos, habits, goals, and focus sessions",
    color: "#10b981",
    icon: "Ar",
  },
  {
    name: "ares",
    displayName: "Ares",
    domain: "System & DevOps",
    description: "Monitoring, deployments, and error analysis",
    color: "#ef4444",
    icon: "As",
  },
  {
    name: "hera",
    displayName: "Hera",
    domain: "Memory & Knowledge",
    description: "Notes, bookmarks, and semantic search",
    color: "#f43f5e",
    icon: "Hr",
  },
];

export function getAgent(name: string): AgentInfo | undefined {
  return agents.find((a) => a.name === name);
}
