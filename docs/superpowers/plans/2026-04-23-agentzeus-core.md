# AgentZeus Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-activated agentic dashboard with Zeus orchestrator, animated high-tech UI, and two starter agents (Artemis for tasks, Hera for memory/knowledge).

**Architecture:** Next.js 15 app on Vercel with Supabase backend (Auth, Postgres, Edge Functions, Realtime). Zeus receives voice input, classifies intent via OpenAI GPT-5.4 mini, delegates to agent Edge Functions which stream responses back via Supabase Realtime. Voice output via OpenAI TTS.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Supabase (Auth, DB, Edge Functions, Realtime, pgvector), OpenAI API (GPT-5.4 mini, Whisper, TTS, Embeddings)

---

## File Structure

```
AgentZeus/
├── .env.local                          # API keys (OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, etc.)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with providers, fonts, global styles
│   │   ├── page.tsx                    # Dashboard page
│   │   ├── globals.css                 # Tailwind directives + custom CSS (grid bg, glows)
│   │   └── api/
│   │       ├── zeus/route.ts           # Zeus orchestrator endpoint
│   │       ├── tts/route.ts            # OpenAI TTS proxy endpoint
│   │       └── agents/
│   │           ├── artemis/route.ts    # Artemis task agent endpoint
│   │           └── hera/route.ts       # Hera memory agent endpoint
│   ├── components/
│   │   ├── Dashboard.tsx               # Main dashboard layout + agent grid
│   │   ├── VoiceOrb.tsx                # Central voice activation orb with particles
│   │   ├── TranscriptDisplay.tsx       # Shows voice transcript with typing effect
│   │   ├── AgentCard.tsx               # Individual agent card with glow + expand
│   │   ├── ActivityFeed.tsx            # Right sidebar activity log
│   │   └── ParticleField.tsx           # Canvas particle effect for orb
│   ├── hooks/
│   │   ├── useVoiceInput.ts            # Web Speech API hook
│   │   ├── useVoiceOutput.ts           # OpenAI TTS playback hook
│   │   ├── useAgentEvents.ts           # Supabase Realtime subscription hook
│   │   └── useZeus.ts                  # Orchestrator hook (send command, get response)
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client singleton
│   │   ├── openai.ts                   # OpenAI client singleton
│   │   └── agents.ts                   # Agent registry (names, colors, descriptions)
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_initial.sql             # Database schema
└── features-to-add-later.md            # (already exists)
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.local`, `.gitignore`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/connorevans/Downloads/AgentZeus
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the scaffold with Tailwind already configured.

- [ ] **Step 2: Install dependencies**

```bash
npm install framer-motion @supabase/supabase-js @supabase/ssr openai
```

- [ ] **Step 3: Create .env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

- [ ] **Step 4: Update tailwind.config.ts with custom theme**

Replace the contents of `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#060b18",
          800: "#0a1128",
          700: "#101d3a",
        },
        zeus: "#f59e0b",
        hermes: "#14b8a6",
        athena: "#8b5cf6",
        apollo: "#f97316",
        artemis: "#10b981",
        ares: "#ef4444",
        hera: "#f43f5e",
        accent: "#3b82f6",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Write globals.css**

Replace the contents of `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --navy-900: #060b18;
  --accent: #3b82f6;
}

body {
  background-color: var(--navy-900);
  color: #e2e8f0;
  overflow-x: hidden;
}

.grid-bg {
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.glow-blue {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15), 0 0 60px rgba(59, 130, 246, 0.05);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.08), transparent);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}
```

- [ ] **Step 6: Write root layout**

Replace the contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AgentZeus",
  description: "Voice-activated agentic dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Write placeholder page**

Replace the contents of `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen grid-bg flex items-center justify-center">
      <h1 className="text-4xl font-bold text-accent">AgentZeus</h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify it runs**

```bash
npm run dev
```

Expected: App starts on localhost:3000, shows "AgentZeus" text on navy background with grid pattern.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with Tailwind theme and AgentZeus branding"
```

---

### Task 2: Types and Agent Registry

**Files:**
- Create: `src/types/index.ts`, `src/lib/agents.ts`

- [ ] **Step 1: Create shared types**

Create `src/types/index.ts`:

```ts
export type AgentName = "zeus" | "hermes" | "athena" | "apollo" | "artemis" | "ares" | "hera";

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
```

- [ ] **Step 2: Create agent registry**

Create `src/lib/agents.ts`:

```ts
import { AgentInfo } from "@/types";

export const agents: AgentInfo[] = [
  {
    name: "zeus",
    displayName: "Zeus",
    domain: "Orchestrator",
    description: "Receives commands and delegates to the right agent",
    color: "#f59e0b",
    icon: "⚡",
  },
  {
    name: "hermes",
    displayName: "Hermes",
    domain: "Communications",
    description: "Email, Slack, and Discord management",
    color: "#14b8a6",
    icon: "✉️",
  },
  {
    name: "athena",
    displayName: "Athena",
    domain: "Code & Dev",
    description: "GitHub, PRs, code generation, deployments",
    color: "#8b5cf6",
    icon: "🦉",
  },
  {
    name: "apollo",
    displayName: "Apollo",
    domain: "Calendar",
    description: "Scheduling, events, and daily briefings",
    color: "#f97316",
    icon: "☀️",
  },
  {
    name: "artemis",
    displayName: "Artemis",
    domain: "Tasks & Productivity",
    description: "Todos, habits, goals, and focus sessions",
    color: "#10b981",
    icon: "🎯",
  },
  {
    name: "ares",
    displayName: "Ares",
    domain: "System & DevOps",
    description: "Monitoring, deployments, and error analysis",
    color: "#ef4444",
    icon: "🛡️",
  },
  {
    name: "hera",
    displayName: "Hera",
    domain: "Memory & Knowledge",
    description: "Notes, bookmarks, and semantic search",
    color: "#f43f5e",
    icon: "👑",
  },
];

export function getAgent(name: string): AgentInfo | undefined {
  return agents.find((a) => a.name === name);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types src/lib/agents.ts
git commit -m "feat: add TypeScript types and agent registry"
```

---

### Task 3: Supabase Client and Database Schema

**Files:**
- Create: `src/lib/supabase.ts`, `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 2: Create database migration**

Create `supabase/migrations/001_initial.sql`:

```sql
-- Enable pgvector for Hera's semantic search
create extension if not exists vector;

-- Agent events for realtime streaming
create table agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  agent_name text not null,
  event_type text not null check (event_type in ('thinking', 'responding', 'complete', 'error')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create index idx_agent_events_session on agent_events(session_id, created_at);

-- Enable realtime on agent_events
alter publication supabase_realtime add table agent_events;

-- Tasks for Artemis
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  created_at timestamptz not null default now()
);

-- Notes for Hera
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  content text not null,
  embedding vector(1536),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Similarity search function for Hera
create or replace function match_notes(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (id uuid, content text, tags text[], similarity float)
language sql stable
as $$
  select
    notes.id,
    notes.content,
    notes.tags,
    1 - (notes.embedding <=> query_embedding) as similarity
  from notes
  where 1 - (notes.embedding <=> query_embedding) > match_threshold
  order by notes.embedding <=> query_embedding
  limit match_count;
$$;

-- Conversations log
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  transcript text not null,
  agent_name text not null,
  response text not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts supabase/
git commit -m "feat: add Supabase client and database migration schema"
```

Note: Run this migration in your Supabase dashboard SQL editor before proceeding to tasks that need the database.

---

### Task 4: Voice Input Hook

**Files:**
- Create: `src/hooks/useVoiceInput.ts`

- [ ] **Step 1: Create voice input hook using Web Speech API**

Create `src/hooks/useVoiceInput.ts`:

```ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
}

export function useVoiceInput(onFinalTranscript?: (text: string) => void): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (final) {
          setTranscript(final);
          setInterimTranscript("");
          onFinalTranscript?.(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onFinalTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setInterimTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { isListening, transcript, interimTranscript, startListening, stopListening, toggleListening, isSupported };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVoiceInput.ts
git commit -m "feat: add voice input hook using Web Speech API"
```

---

### Task 5: Voice Output Hook (OpenAI TTS)

**Files:**
- Create: `src/app/api/tts/route.ts`, `src/hooks/useVoiceOutput.ts`

- [ ] **Step 1: Create TTS API route**

Create `src/app/api/tts/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
    },
  });
}
```

- [ ] **Step 2: Create voice output hook**

Create `src/hooks/useVoiceOutput.ts`:

```ts
"use client";

import { useState, useCallback, useRef } from "react";

interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsSpeaking(true);

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, speak, stop };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tts src/hooks/useVoiceOutput.ts
git commit -m "feat: add OpenAI TTS API route and voice output hook"
```

---

### Task 6: Agent Events Realtime Hook

**Files:**
- Create: `src/hooks/useAgentEvents.ts`

- [ ] **Step 1: Create realtime subscription hook**

Create `src/hooks/useAgentEvents.ts`:

```ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AgentEvent } from "@/types";

interface UseAgentEventsReturn {
  events: AgentEvent[];
  latestEvent: AgentEvent | null;
  clearEvents: () => void;
}

export function useAgentEvents(sessionId: string | null): UseAgentEventsReturn {
  const [events, setEvents] = useState<AgentEvent[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch existing events for this session
    supabase
      .from("agent_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as AgentEvent[]);
      });

    // Subscribe to new events
    const channel = supabase
      .channel(`events-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as AgentEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return { events, latestEvent, clearEvents };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAgentEvents.ts
git commit -m "feat: add Supabase Realtime hook for agent events"
```

---

### Task 7: Zeus Orchestrator Hook and API Route

**Files:**
- Create: `src/lib/openai.ts`, `src/app/api/zeus/route.ts`, `src/hooks/useZeus.ts`

- [ ] **Step 1: Create OpenAI client**

Create `src/lib/openai.ts`:

```ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

- [ ] **Step 2: Create Zeus API route**

Create `src/app/api/zeus/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";
import { AgentName } from "@/types";

const AGENT_DESCRIPTIONS: Record<Exclude<AgentName, "zeus">, string> = {
  hermes: "Communications — email, Slack, Discord messaging",
  athena: "Code & Dev — GitHub, PRs, code generation, deployments",
  apollo: "Calendar & Scheduling — events, meetings, daily briefings",
  artemis: "Tasks & Productivity — todos, habits, goals, task management",
  ares: "System & DevOps — server monitoring, deployments, error logs",
  hera: "Memory & Knowledge — storing/retrieving notes, bookmarks, semantic search",
};

async function classifyIntent(transcript: string): Promise<{ agent: AgentName; intent: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Zeus, the orchestrator of a personal AI assistant system. Classify the user's voice command to determine which agent should handle it.

Available agents:
${Object.entries(AGENT_DESCRIPTIONS)
  .map(([name, desc]) => `- ${name}: ${desc}`)
  .join("\n")}

If the command is a general greeting or doesn't fit any agent, use "zeus" as the agent.

Respond with JSON: { "agent": "<agent_name>", "intent": "<brief description of what the user wants>" }`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = response.choices[0].message.content!;
  return JSON.parse(content);
}

async function handleAgentRequest(
  agent: AgentName,
  intent: string,
  transcript: string,
  sessionId: string
): Promise<string> {
  const supabase = createServiceClient();

  // Write "thinking" event
  await supabase.from("agent_events").insert({
    session_id: sessionId,
    agent_name: agent,
    event_type: "thinking",
    content: intent,
  });

  if (agent === "zeus") {
    // Zeus handles general conversation directly
    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Zeus, a powerful AI assistant orchestrator. You are the main interface of the AgentZeus dashboard. Be helpful, concise, and speak with quiet authority. Keep responses under 3 sentences unless more detail is needed.",
        },
        { role: "user", content: transcript },
      ],
    });

    const reply = response.choices[0].message.content!;

    await supabase.from("agent_events").insert({
      session_id: sessionId,
      agent_name: "zeus",
      event_type: "complete",
      content: reply,
    });

    return reply;
  }

  // Delegate to agent-specific API route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const agentResponse = await fetch(`${baseUrl}/api/agents/${agent}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, transcript, session_id: sessionId }),
  });

  const data = await agentResponse.json();
  return data.response;
}

export async function POST(req: NextRequest) {
  const { transcript } = await req.json();

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();

  const { agent, intent } = await classifyIntent(transcript);
  const response = await handleAgentRequest(agent, intent, transcript, sessionId);

  // Log conversation
  const supabase = createServiceClient();
  await supabase.from("conversations").insert({
    transcript,
    agent_name: agent,
    response,
  });

  return NextResponse.json({ agent, intent, response, session_id: sessionId });
}
```

- [ ] **Step 3: Create Zeus hook**

Create `src/hooks/useZeus.ts`:

```ts
"use client";

import { useState, useCallback } from "react";
import { AgentName, ZeusResponse } from "@/types";

interface UseZeusReturn {
  isProcessing: boolean;
  activeAgent: AgentName | null;
  lastResponse: ZeusResponse | null;
  sendCommand: (transcript: string) => Promise<ZeusResponse | null>;
}

export function useZeus(): UseZeusReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentName | null>(null);
  const [lastResponse, setLastResponse] = useState<ZeusResponse | null>(null);

  const sendCommand = useCallback(async (transcript: string): Promise<ZeusResponse | null> => {
    if (!transcript.trim()) return null;

    setIsProcessing(true);
    setActiveAgent("zeus");

    try {
      const res = await fetch("/api/zeus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data: ZeusResponse = await res.json();
      setActiveAgent(data.agent);
      setLastResponse(data);
      return data;
    } catch (error) {
      console.error("Zeus error:", error);
      return null;
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setActiveAgent(null);
      }, 2000);
    }
  }, []);

  return { isProcessing, activeAgent, lastResponse, sendCommand };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/openai.ts src/app/api/zeus src/hooks/useZeus.ts
git commit -m "feat: add Zeus orchestrator API route and hook with intent classification"
```

---

### Task 8: Artemis Agent (Tasks & Productivity)

**Files:**
- Create: `src/app/api/agents/artemis/route.ts`

- [ ] **Step 1: Create Artemis API route**

Create `src/app/api/agents/artemis/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  // Get current tasks for context
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Artemis, the Tasks & Productivity agent. You manage todos, habits, goals, and focus sessions.

Current tasks:
${JSON.stringify(tasks || [], null, 2)}

Based on the user's request, respond with JSON:
{
  "response": "<your spoken response to the user>",
  "actions": [
    {
      "type": "create_task" | "update_task" | "delete_task" | "list_tasks",
      "data": { ...relevant fields: title, description, status, priority, due_date, id }
    }
  ]
}

Keep responses concise and conversational — these will be spoken aloud. If listing tasks, summarize them naturally rather than reading raw data.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  // Execute actions
  for (const action of content.actions || []) {
    switch (action.type) {
      case "create_task":
        await supabase.from("tasks").insert({
          title: action.data.title,
          description: action.data.description || "",
          priority: action.data.priority || "medium",
          due_date: action.data.due_date || null,
        });
        break;
      case "update_task":
        await supabase
          .from("tasks")
          .update({
            status: action.data.status,
            title: action.data.title,
            priority: action.data.priority,
          })
          .eq("id", action.data.id);
        break;
      case "delete_task":
        await supabase.from("tasks").delete().eq("id", action.data.id);
        break;
    }
  }

  // Write completion event
  await supabase.from("agent_events").insert({
    session_id: session_id,
    agent_name: "artemis",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/artemis
git commit -m "feat: add Artemis task management agent with CRUD operations"
```

---

### Task 9: Hera Agent (Memory & Knowledge)

**Files:**
- Create: `src/app/api/agents/hera/route.ts`

- [ ] **Step 1: Create Hera API route**

Create `src/app/api/agents/hera/route.ts`:

```ts
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

export async function POST(req: NextRequest) {
  const { intent, transcript, session_id } = await req.json();
  const supabase = createServiceClient();

  // Search existing notes for context
  let relevantNotes: Array<{ id: string; content: string; tags: string[]; similarity: number }> = [];

  try {
    const queryEmbedding = await getEmbedding(transcript);
    const { data } = await supabase.rpc("match_notes", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
    });
    relevantNotes = data || [];
  } catch {
    // No notes yet or vector search unavailable
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Hera, the Memory & Knowledge agent. You store and retrieve personal notes, bookmarks, and knowledge. You have perfect recall.

Relevant notes from memory:
${JSON.stringify(relevantNotes, null, 2)}

Based on the user's request, respond with JSON:
{
  "response": "<your spoken response to the user>",
  "actions": [
    {
      "type": "save_note" | "search" | "delete_note",
      "data": { "content": "...", "tags": ["..."], "id": "..." }
    }
  ]
}

When saving, extract the key information to store. When searching, summarize what you found conversationally. Keep responses concise — they will be spoken aloud.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const content = JSON.parse(response.choices[0].message.content!);

  // Execute actions
  for (const action of content.actions || []) {
    if (action.type === "save_note") {
      const embedding = await getEmbedding(action.data.content);
      await supabase.from("notes").insert({
        content: action.data.content,
        tags: action.data.tags || [],
        embedding,
      });
    } else if (action.type === "delete_note" && action.data.id) {
      await supabase.from("notes").delete().eq("id", action.data.id);
    }
  }

  // Write completion event
  await supabase.from("agent_events").insert({
    session_id: session_id,
    agent_name: "hera",
    event_type: "complete",
    content: content.response,
  });

  return NextResponse.json({ response: content.response });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/hera
git commit -m "feat: add Hera memory agent with semantic search via pgvector"
```

---

### Task 10: ParticleField Component

**Files:**
- Create: `src/components/ParticleField.tsx`

- [ ] **Step 1: Create canvas-based particle effect**

Create `src/components/ParticleField.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";

interface ParticleFieldProps {
  isActive: boolean;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

export default function ParticleField({ isActive, color = "#3b82f6" }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    const cx = () => w() / 2;
    const cy = () => h() / 2;

    function spawnParticle(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      return {
        x: cx() + Math.cos(angle) * distance,
        y: cy() + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (0.3 + Math.random() * 0.7),
        vy: Math.sin(angle) * (0.3 + Math.random() * 0.7),
        size: 1 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4,
        life: 1,
      };
    }

    function animate() {
      ctx.clearRect(0, 0, w(), h());

      if (isActive && particlesRef.current.length < 60) {
        particlesRef.current.push(spawnParticle());
        particlesRef.current.push(spawnParticle());
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;
        p.opacity = p.life * 0.6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isActive, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ParticleField.tsx
git commit -m "feat: add canvas particle field effect component"
```

---

### Task 11: VoiceOrb Component

**Files:**
- Create: `src/components/VoiceOrb.tsx`

- [ ] **Step 1: Create the central voice orb**

Create `src/components/VoiceOrb.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import ParticleField from "./ParticleField";

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export default function VoiceOrb({ isListening, isSpeaking, isProcessing, onClick }: VoiceOrbProps) {
  const isActive = isListening || isSpeaking || isProcessing;

  const getGlowColor = () => {
    if (isListening) return "rgba(59, 130, 246, 0.6)";
    if (isProcessing) return "rgba(245, 158, 11, 0.6)";
    if (isSpeaking) return "rgba(16, 185, 129, 0.6)";
    return "rgba(59, 130, 246, 0.2)";
  };

  const getLabel = () => {
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    return "Click or press Space";
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative w-32 h-32">
        <ParticleField isActive={isActive} color={isListening ? "#3b82f6" : isProcessing ? "#f59e0b" : "#10b981"} />

        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            scale: isActive ? [1, 1.3, 1] : 1,
            opacity: isActive ? [0.3, 0, 0.3] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            border: `1px solid ${getGlowColor()}`,
          }}
        />

        {/* Main orb */}
        <motion.button
          onClick={onClick}
          className="absolute inset-4 rounded-full cursor-pointer flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${getGlowColor()}, rgba(6, 11, 24, 0.8))`,
            boxShadow: `0 0 30px ${getGlowColor()}, 0 0 60px ${getGlowColor().replace("0.6", "0.2")}`,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            scale: isActive ? [1, 1.04, 1] : 1,
          }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <motion.div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: getGlowColor().replace("0.6", "0.9").replace("0.2", "0.9") }}
            animate={{
              scale: isListening ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        </motion.button>
      </div>

      <motion.span
        className="text-sm font-mono text-slate-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {getLabel()}
      </motion.span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VoiceOrb.tsx
git commit -m "feat: add animated VoiceOrb component with particle effects"
```

---

### Task 12: TranscriptDisplay Component

**Files:**
- Create: `src/components/TranscriptDisplay.tsx`

- [ ] **Step 1: Create transcript display with typing effect**

Create `src/components/TranscriptDisplay.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  response: string | null;
  activeAgent: string | null;
}

export default function TranscriptDisplay({
  transcript,
  interimTranscript,
  response,
  activeAgent,
}: TranscriptDisplayProps) {
  const hasContent = transcript || interimTranscript || response;

  if (!hasContent) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="glass rounded-xl px-6 py-4 max-w-2xl w-full mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {/* User transcript */}
        {(transcript || interimTranscript) && (
          <div className="mb-2">
            <span className="text-xs font-mono text-accent uppercase tracking-wider">You</span>
            <p className="text-slate-200 mt-1">
              {transcript}
              {interimTranscript && (
                <span className="text-slate-400 italic">{interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {/* Agent response */}
        {response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="text-xs font-mono uppercase tracking-wider"
              style={{ color: activeAgent ? undefined : "#3b82f6" }}
            >
              {activeAgent || "Zeus"}
            </span>
            <p className="text-slate-200 mt-1">{response}</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TranscriptDisplay.tsx
git commit -m "feat: add TranscriptDisplay component with animations"
```

---

### Task 13: AgentCard Component

**Files:**
- Create: `src/components/AgentCard.tsx`

- [ ] **Step 1: Create the agent card with glow and expand**

Create `src/components/AgentCard.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { AgentInfo } from "@/types";

interface AgentCardProps {
  agent: AgentInfo;
  isActive: boolean;
  lastMessage?: string;
}

export default function AgentCard({ agent, isActive, lastMessage }: AgentCardProps) {
  return (
    <motion.div
      className="glass rounded-xl p-4 relative overflow-hidden"
      animate={{
        borderColor: isActive ? agent.color : "rgba(255,255,255,0.06)",
        boxShadow: isActive
          ? `0 0 20px ${agent.color}33, 0 0 40px ${agent.color}11`
          : "0 0 0px transparent",
      }}
      transition={{ duration: 0.4 }}
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      layout
    >
      {/* Active shimmer overlay */}
      {isActive && (
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: `${agent.color}15` }}
            animate={{
              scale: isActive ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
          >
            {agent.icon}
          </motion.div>
          <div>
            <h3 className="font-semibold text-white text-sm">{agent.displayName}</h3>
            <p className="text-xs text-slate-400">{agent.domain}</p>
          </div>

          {/* Status indicator */}
          <motion.div
            className="ml-auto w-2 h-2 rounded-full"
            style={{ backgroundColor: isActive ? agent.color : "#334155" }}
            animate={{
              scale: isActive ? [1, 1.5, 1] : 1,
              opacity: isActive ? [1, 0.5, 1] : 0.5,
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>

        {/* Description or last message */}
        <p className="text-xs text-slate-400 line-clamp-2">
          {lastMessage || agent.description}
        </p>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AgentCard.tsx
git commit -m "feat: add AgentCard component with glow effects and active state"
```

---

### Task 14: ActivityFeed Component

**Files:**
- Create: `src/components/ActivityFeed.tsx`

- [ ] **Step 1: Create activity feed sidebar**

Create `src/components/ActivityFeed.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentEvent } from "@/types";
import { getAgent } from "@/lib/agents";

interface ActivityFeedProps {
  events: AgentEvent[];
}

export default function ActivityFeed({ events }: ActivityFeedProps) {
  const recentEvents = events.slice(-20).reverse();

  return (
    <div className="glass rounded-xl p-4 h-full overflow-hidden flex flex-col">
      <h2 className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
        Activity Feed
      </h2>

      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {recentEvents.length === 0 && (
            <p className="text-xs text-slate-500 italic">No activity yet. Try a voice command.</p>
          )}
          {recentEvents.map((event) => {
            const agent = getAgent(event.agent_name);
            return (
              <motion.div
                key={event.id}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: agent?.color || "#3b82f6" }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: agent?.color || "#3b82f6" }}
                    >
                      {agent?.displayName || event.agent_name}
                    </span>
                    <span className="text-xs text-slate-600">
                      {event.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {event.content}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ActivityFeed.tsx
git commit -m "feat: add ActivityFeed sidebar component"
```

---

### Task 15: Dashboard Component and Main Page

**Files:**
- Create: `src/components/Dashboard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the Dashboard component**

Create `src/components/Dashboard.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import VoiceOrb from "./VoiceOrb";
import TranscriptDisplay from "./TranscriptDisplay";
import AgentCard from "./AgentCard";
import ActivityFeed from "./ActivityFeed";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { agents } from "@/lib/agents";
import { AgentEvent, AgentName } from "@/types";

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const { isSpeaking, speak } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);

  const handleTranscript = useCallback(
    async (text: string) => {
      const response = await sendCommand(text);
      if (response) {
        setAgentMessages((prev) => ({
          ...prev,
          [response.agent]: response.response,
        }));
        speak(response.response);
      }
    },
    [sendCommand, speak]
  );

  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSupported,
  } = useVoiceInput(handleTranscript);

  // Accumulate events across sessions
  useEffect(() => {
    if (events.length > 0) {
      setAllEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !ids.has(e.id));
        return [...prev, ...newEvents];
      });
    }
  }, [events]);

  // Keyboard shortcut: Space to toggle voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  // Filter out Zeus from the agent grid (Zeus is the orb)
  const displayAgents = agents.filter((a) => a.name !== "zeus");

  return (
    <main className="min-h-screen grid-bg">
      <div className="flex h-screen">
        {/* Main content */}
        <div className="flex-1 flex flex-col items-center px-8 py-6">
          {/* Header */}
          <motion.header
            className="w-full flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Agent<span className="text-zeus">Zeus</span>
              </h1>
            </div>
            {!isSupported && (
              <span className="text-xs text-red-400 font-mono">
                Voice not supported in this browser
              </span>
            )}
          </motion.header>

          {/* Voice Orb */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <VoiceOrb
              isListening={isListening}
              isSpeaking={isSpeaking}
              isProcessing={isProcessing}
              onClick={toggleListening}
            />
          </motion.div>

          {/* Transcript */}
          <div className="mb-8 w-full max-w-2xl">
            <TranscriptDisplay
              transcript={transcript}
              interimTranscript={interimTranscript}
              response={lastResponse?.response || null}
              activeAgent={activeAgent}
            />
          </div>

          {/* Agent Grid */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {displayAgents.map((agent) => (
              <motion.div
                key={agent.name}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <AgentCard
                  agent={agent}
                  isActive={activeAgent === agent.name}
                  lastMessage={agentMessages[agent.name]}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Activity Feed Sidebar */}
        <motion.aside
          className="w-80 border-l border-white/5 p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ActivityFeed events={allEvents} />
        </motion.aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update the main page**

Replace the contents of `src/app/page.tsx`:

```tsx
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

- [ ] **Step 3: Verify the app builds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx src/app/page.tsx
git commit -m "feat: add Dashboard layout with voice orb, agent grid, and activity feed"
```

---

### Task 16: Final Integration and Push

- [ ] **Step 1: Add NEXT_PUBLIC_APP_URL to .env.local**

Add to `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Verify full app runs locally**

```bash
npm run dev
```

Expected: Dashboard loads with voice orb, 6 agent cards, activity feed. Clicking orb or pressing Space starts listening (requires Chrome/Edge for Web Speech API).

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: complete AgentZeus core with voice activation and agent system"
git remote add origin https://github.com/AllStreets/AgentZeus.git
git branch -M main
git push -u origin main
```
