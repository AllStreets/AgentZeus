export type AgentName = "zeus" | "hermes" | "athena" | "apollo" | "artemis" | "ares" | "hera" | "meridian" | "chicago" | "flexport";

export interface AgentEvent {
  id: string;
  session_id: string;
  agent_name: AgentName;
  event_type: "thinking" | "responding" | "complete" | "error";
  content: string;
  created_at: string;
}

export interface AgentInfo {
  name: AgentName;
  displayName: string;
  domain: string;
  description: string;
  color: string;
  icon: string;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
}

export interface ZeusResponse {
  agent: AgentName;
  intent: string;
  response: string;
  session_id: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  created_at: string;
}
