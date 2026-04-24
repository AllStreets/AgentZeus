# AgentZeus Phase 1 — Agent Detail Panels + Settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add slide-out detail panels for each agent showing live data (tasks, notes, integration status) and a settings overlay for voice preferences and API tokens.

**Architecture:** Dashboard gains `openPanel` state. Clicking an agent opens its panel as an animated right-side overlay (AnimatePresence). Artemis/Hera panels fetch live data from new API routes. Settings are stored in localStorage. Zeus intent classification extended to handle navigation commands ("show my tasks" → opens Artemis panel).

**Tech Stack:** Next.js 15, React, Framer Motion, Tailwind, Supabase (tasks/notes), lucide-react, localStorage

---

## File Structure

```
src/
  app/api/
    tasks/route.ts          # GET all tasks, POST create task, PATCH update, DELETE
    notes/route.ts          # GET all notes, POST save note, DELETE
  components/
    panels/
      PanelContainer.tsx    # Animated slide-in wrapper, close button, title
      ArtemisPanel.tsx      # Task list with filters, add form, mark complete
      HeraPanel.tsx         # Note list, search bar, save form
      HermesPanel.tsx       # Integration status placeholder + connect buttons
      AthenaPanel.tsx       # GitHub token input + placeholder data
      ApolloPanel.tsx       # Google Calendar connect placeholder
      AresPanel.tsx         # System status cards
    SettingsPanel.tsx        # Full-screen overlay with tabs
  hooks/
    useTasks.ts             # CRUD operations for tasks
    useNotes.ts             # CRUD + search for notes
  types/index.ts            # Add Settings, UserIntegration interfaces
  components/Dashboard.tsx  # Add openPanel state, panel rendering, settings button handler
  app/api/zeus/route.ts     # Extend intent classification for navigation commands
```

---

### Task 1: Task and Note API Routes

**Files:**
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/notes/route.ts`

- [ ] **Step 1: Create tasks API route**

Create `src/app/api/tasks/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ title: body.title, description: body.description || "", priority: body.priority || "medium", due_date: body.due_date || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient();
  const { id } = await req.json();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create notes API route**

Create `src/app/api/notes/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, content, tags, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient();
  const { id } = await req.json();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks src/app/api/notes
git commit -m "feat: add tasks and notes CRUD API routes"
```

---

### Task 2: useTasks and useNotes hooks

**Files:**
- Create: `src/hooks/useTasks.ts`
- Create: `src/hooks/useNotes.ts`

- [ ] **Step 1: Create useTasks hook**

Create `src/hooks/useTasks.ts`:

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { Task } from "@/types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = useCallback(async (title: string, priority: "low" | "medium" | "high" = "medium") => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });
    const task = await res.json();
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTask = useCallback(async (task: Task) => {
    const next = task.status === "completed" ? "pending" : "completed";
    return updateTask(task.id, { status: next });
  }, [updateTask]);

  return { tasks, loading, createTask, updateTask, deleteTask, toggleTask, refetch: fetchTasks };
}
```

- [ ] **Step 2: Create useNotes hook**

Create `src/hooks/useNotes.ts`:

```ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface NoteRecord {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const deleteNote = useCallback(async (id: string) => {
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const filtered = query
    ? notes.filter((n) =>
        n.content.toLowerCase().includes(query.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : notes;

  return { notes: filtered, allNotes: notes, loading, deleteNote, query, setQuery, refetch: fetchNotes };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useNotes.ts
git commit -m "feat: add useTasks and useNotes client hooks"
```

---

### Task 3: PanelContainer component

**Files:**
- Create: `src/components/panels/PanelContainer.tsx`

- [ ] **Step 1: Create animated panel container**

Create `src/components/panels/PanelContainer.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { AgentInfo } from "@/types";
import AgentIcon from "@/components/AgentIcon";

interface PanelContainerProps {
  agent: AgentInfo | null;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PanelContainer({ agent, onClose, children }: PanelContainerProps) {
  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col"
            style={{ backgroundColor: "#070d1e", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}12`, color: agent.color }}
                >
                  <AgentIcon icon={agent.icon} size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{agent.displayName}</h2>
                  <p className="text-[10px] font-mono text-slate-500">{agent.domain}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/panels/PanelContainer.tsx
git commit -m "feat: add animated PanelContainer component"
```

---

### Task 4: ArtemisPanel — Live Task Management

**Files:**
- Create: `src/components/panels/ArtemisPanel.tsx`

- [ ] **Step 1: Create ArtemisPanel**

Create `src/components/panels/ArtemisPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Circle } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/types";

const priorityColor: Record<Task["priority"], string> = {
  low: "#64748b",
  medium: "#f59e0b",
  high: "#ef4444",
};

const statusFilters = ["all", "pending", "in_progress", "completed"] as const;

export default function ArtemisPanel() {
  const { tasks, loading, createTask, toggleTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTask(newTitle.trim());
    setNewTitle("");
    setAdding(false);
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: filter === s ? "rgba(16,185,129,0.12)" : "transparent",
              color: filter === s ? "#10b981" : "#64748b",
              border: `1px solid ${filter === s ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)"}`,
            }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-colors"
          style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <Plus size={10} /> Add
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.form
            onSubmit={handleAdd}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              placeholder="Task title..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-artemis/30 transition-colors"
            />
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task list */}
      {loading ? (
        <p className="text-xs text-slate-600 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-8">No tasks</p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {filtered.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-3 p-3 rounded-lg group"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
              >
                <button
                  onClick={() => toggleTask(task)}
                  className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: task.status === "completed" ? "#10b981" : "#334155" }}
                >
                  {task.status === "completed" ? <Check size={15} /> : <Circle size={15} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${task.status === "completed" ? "line-through text-slate-500" : "text-slate-200"}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor[task.priority] }} />
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/panels/ArtemisPanel.tsx
git commit -m "feat: add ArtemisPanel with live task management"
```

---

### Task 5: HeraPanel — Notes and Semantic Search

**Files:**
- Create: `src/components/panels/HeraPanel.tsx`

- [ ] **Step 1: Create HeraPanel**

Create `src/components/panels/HeraPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Tag } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";

export default function HeraPanel() {
  const { notes, loading, deleteNote, query, setQuery } = useNotes();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md pl-8 pr-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-hera/30 transition-colors"
        />
      </div>

      <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
        Add notes by saying &quot;Hera, remember that...&quot;
      </p>

      {loading ? (
        <p className="text-xs text-slate-600 text-center py-8">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-8">{query ? "No results" : "No notes yet"}</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded-lg group cursor-pointer"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm text-slate-300 leading-relaxed ${expanded !== note.id ? "line-clamp-2" : ""}`}>
                    {note.content}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag size={9} className="text-slate-600" />
                    {note.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono text-hera/60 bg-hera/5 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-600 mt-2">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/panels/HeraPanel.tsx
git commit -m "feat: add HeraPanel with notes list and search"
```

---

### Task 6: Placeholder Panels (Hermes, Athena, Apollo, Ares)

**Files:**
- Create: `src/components/panels/HermesPanel.tsx`
- Create: `src/components/panels/AthenaPanel.tsx`
- Create: `src/components/panels/ApolloPanel.tsx`
- Create: `src/components/panels/AresPanel.tsx`

- [ ] **Step 1: Create a shared IntegrationStatus component inline and write all 4 panels**

Create `src/components/panels/HermesPanel.tsx`:

```tsx
"use client";

import { Mail, MessageSquare, ExternalLink } from "lucide-react";

function IntegrationCard({ icon: Icon, name, status, color }: { icon: React.ElementType; name: string; status: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}12`, color }}>
          <Icon size={14} />
        </div>
        <div>
          <p className="text-sm text-white">{name}</p>
          <p className="text-[10px] font-mono text-slate-500">{status}</p>
        </div>
      </div>
      <button className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded transition-colors text-slate-400 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        Connect <ExternalLink size={10} />
      </button>
    </div>
  );
}

export default function HermesPanel() {
  return (
    <div className="p-5 space-y-3">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-4">Integrations</p>
      <IntegrationCard icon={Mail} name="Gmail" status="Not connected — Phase 3" color="#14b8a6" />
      <IntegrationCard icon={MessageSquare} name="Slack" status="Coming soon" color="#14b8a6" />
      <p className="text-xs text-slate-500 mt-6 leading-relaxed">
        Connect Gmail in Settings to let Hermes read, draft, and send emails by voice.
      </p>
    </div>
  );
}
```

Create `src/components/panels/AthenaPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Github, GitPullRequest, AlertCircle } from "lucide-react";

export default function AthenaPanel() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("github_token") || "");
  }, []);

  function saveToken() {
    localStorage.setItem("github_token", token);
  }

  return (
    <div className="p-5 space-y-5">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">GitHub Integration</p>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">Personal Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-athena/30 font-mono transition-colors"
        />
        <button
          onClick={saveToken}
          className="w-full py-2 rounded-md text-xs font-mono transition-colors"
          style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          Save Token
        </button>
      </div>

      <div className="space-y-2 opacity-40 pointer-events-none">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Preview — Phase 2</p>
        {[{ icon: GitPullRequest, label: "Open PRs", value: "—" }, { icon: AlertCircle, label: "Open Issues", value: "—" }, { icon: Github, label: "Repos", value: "—" }].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-2">
              <Icon size={13} className="text-slate-500" />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <span className="text-sm font-mono text-slate-600">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Create `src/components/panels/ApolloPanel.tsx`:

```tsx
"use client";

import { Calendar, Clock, Plus } from "lucide-react";

export default function ApolloPanel() {
  return (
    <div className="p-5 space-y-5">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Calendar</p>

      <div className="p-4 rounded-lg text-center space-y-3" style={{ backgroundColor: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)" }}>
        <Calendar size={28} className="mx-auto text-apollo/40" />
        <p className="text-sm text-slate-400">Google Calendar not connected</p>
        <p className="text-xs text-slate-500">Connect in Settings to see today&apos;s events and schedule by voice.</p>
      </div>

      <div className="space-y-2 opacity-40 pointer-events-none">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Preview — Phase 3</p>
        {["Team standup — 9:00 AM", "Lunch with Alex — 12:30 PM", "Sprint review — 3:00 PM"].map((ev) => (
          <div key={ev} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
            <Clock size={12} className="text-apollo/50 shrink-0" />
            <span className="text-xs text-slate-500">{ev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Create `src/components/panels/AresPanel.tsx`:

```tsx
"use client";

import { Activity, Server, Cpu, HardDrive } from "lucide-react";

function StatusCard({ icon: Icon, label, value, status }: { icon: React.ElementType; label: string; value: string; status: "ok" | "warn" | "error" }) {
  const color = status === "ok" ? "#10b981" : status === "warn" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
      <div className="flex items-center gap-3">
        <Icon size={13} className="text-slate-500" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color }}>{value}</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AresPanel() {
  return (
    <div className="p-5 space-y-4">
      <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">System Status</p>

      <div className="space-y-2">
        <StatusCard icon={Activity} label="App Status" value="Running" status="ok" />
        <StatusCard icon={Server} label="Environment" value="Development" status="ok" />
        <StatusCard icon={Cpu} label="Vercel Deploys" value="Connect in settings" status="warn" />
        <StatusCard icon={HardDrive} label="Supabase" value="Connected" status="ok" />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mt-4">
        Add your Vercel API token in Settings to see deployment status, build logs, and get alerted on failures.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/panels/
git commit -m "feat: add placeholder panels for Hermes, Athena, Apollo, Ares"
```

---

### Task 7: SettingsPanel

**Files:**
- Create: `src/components/SettingsPanel.tsx`

- [ ] **Step 1: Create SettingsPanel with tabs**

Create `src/components/SettingsPanel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Link, Key, Info } from "lucide-react";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = typeof VOICES[number];

const tabs = [
  { id: "voice", label: "Voice", icon: Volume2 },
  { id: "integrations", label: "Integrations", icon: Link },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "about", label: "About", icon: Info },
] as const;

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<"voice" | "integrations" | "keys" | "about">("voice");
  const [voice, setVoice] = useState<Voice>("onyx");
  const [githubToken, setGithubToken] = useState("");
  const [vercelToken, setVercelToken] = useState("");

  useEffect(() => {
    if (open) {
      setVoice((localStorage.getItem("tts_voice") as Voice) || "onyx");
      setGithubToken(localStorage.getItem("github_token") || "");
      setVercelToken(localStorage.getItem("vercel_token") || "");
    }
  }, [open]);

  function save() {
    localStorage.setItem("tts_voice", voice);
    localStorage.setItem("github_token", githubToken);
    localStorage.setItem("vercel_token", vercelToken);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-black/40 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

          <motion.div
            className="fixed inset-0 m-auto w-[560px] h-[480px] z-50 flex flex-col rounded-xl overflow-hidden"
            style={{ backgroundColor: "#070d1e", border: "1px solid rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <h2 className="text-sm font-semibold text-white">Settings</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Tab nav */}
              <div className="w-40 flex flex-col gap-0.5 p-2" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left"
                    style={{
                      backgroundColor: tab === id ? "rgba(255,255,255,0.04)" : "transparent",
                      color: tab === id ? "#e2e8f0" : "#64748b",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 p-5 overflow-y-auto">
                {tab === "voice" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">TTS Voice</label>
                      <div className="grid grid-cols-3 gap-2">
                        {VOICES.map((v) => (
                          <button
                            key={v}
                            onClick={() => setVoice(v)}
                            className="py-2 rounded-md text-xs font-mono capitalize transition-colors"
                            style={{
                              backgroundColor: voice === v ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                              color: voice === v ? "#3b82f6" : "#64748b",
                              border: `1px solid ${voice === v ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)"}`,
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "integrations" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">GitHub Personal Access Token</label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-accent/30 transition-colors"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Needs repo, read:user scopes</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Vercel API Token</label>
                      <input
                        type="password"
                        value={vercelToken}
                        onChange={(e) => setVercelToken(e.target.value)}
                        placeholder="vercel_..."
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-accent/30 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {tab === "keys" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">OpenAI API Key</label>
                      <p className="text-xs font-mono text-slate-600 bg-white/[0.02] px-3 py-2 rounded-md border border-white/[0.04]">sk-proj-••••••••••••••••</p>
                      <p className="text-[10px] text-slate-600 mt-1">Set in .env.local — OPENAI_API_KEY</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Supabase URL</label>
                      <p className="text-xs font-mono text-slate-600 bg-white/[0.02] px-3 py-2 rounded-md border border-white/[0.04] truncate">
                        {process.env.NEXT_PUBLIC_SUPABASE_URL || "Set in .env.local"}
                      </p>
                    </div>
                  </div>
                )}

                {tab === "about" && (
                  <div className="space-y-3">
                    <p className="text-sm text-white font-semibold">AgentZeus</p>
                    <p className="text-xs text-slate-400 leading-relaxed">A voice-activated agentic dashboard powered by GPT-5.4 mini. Say a command to route it to the right agent.</p>
                    <div className="space-y-1.5 mt-4">
                      {[["Version", "1.0.0"], ["Model", "gpt-5.4-mini"], ["Agents", "7 active"], ["Voice", "Web Speech API + OpenAI TTS"]].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-slate-500">{k}</span>
                          <span className="text-slate-300 font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <button onClick={onClose} className="px-4 py-1.5 rounded-md text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsPanel.tsx
git commit -m "feat: add SettingsPanel with voice, integrations, keys, and about tabs"
```

---

### Task 8: Wire panels and settings into Dashboard + extend Zeus navigation

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/app/api/zeus/route.ts`
- Modify: `src/app/api/tts/route.ts` (read voice preference from header)

- [ ] **Step 1: Update Zeus route to classify navigation commands**

In `src/app/api/zeus/route.ts`, update the `classifyIntent` system prompt to include navigation agent:

Find this section in the system prompt string and add `navigate` to the agent list:
```ts
const AGENT_DESCRIPTIONS: Record<Exclude<AgentName, "zeus">, string> = {
  hermes: "Communications — email, Slack, Discord messaging",
  athena: "Code & Dev — GitHub, PRs, code generation, deployments",
  apollo: "Calendar & Scheduling — events, meetings, daily briefings",
  artemis: "Tasks & Productivity — todos, habits, goals, task management",
  ares: "System & DevOps — server monitoring, deployments, error logs",
  hera: "Memory & Knowledge — storing/retrieving notes, bookmarks, semantic search",
};
```

Add to the `classifyIntent` system prompt text (after the agent list):
```
Also detect navigation commands:
- "show my tasks" / "open tasks" / "show Artemis" → respond with agent: "artemis" and intent: "navigate:artemis"
- "show notes" / "open Hera" / "my notes" → agent: "hera", intent: "navigate:hera"
- "open settings" / "settings" → agent: "zeus", intent: "navigate:settings"
- "show [agent name]" → agent: that agent's name, intent: "navigate:[agent]"
```

- [ ] **Step 2: Update Dashboard.tsx to add panel and settings state**

Replace `src/components/Dashboard.tsx` entirely:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap } from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import TranscriptDisplay from "./TranscriptDisplay";
import AgentCard from "./AgentCard";
import ActivityFeed from "./ActivityFeed";
import AgentSidebar from "./AgentSidebar";
import CommandBar from "./CommandBar";
import PanelContainer from "./panels/PanelContainer";
import ArtemisPanel from "./panels/ArtemisPanel";
import HeraPanel from "./panels/HeraPanel";
import HermesPanel from "./panels/HermesPanel";
import AthenaPanel from "./panels/AthenaPanel";
import ApolloPanel from "./panels/ApolloPanel";
import AresPanel from "./panels/AresPanel";
import SettingsPanel from "./SettingsPanel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { useZeus } from "@/hooks/useZeus";
import { useAgentEvents } from "@/hooks/useAgentEvents";
import { agents, getAgent } from "@/lib/agents";
import { AgentEvent, AgentName } from "@/types";

interface ConversationEntry {
  transcript: string;
  response: string;
  agent: string;
}

const PANEL_COMPONENTS: Partial<Record<AgentName, React.ComponentType>> = {
  artemis: ArtemisPanel,
  hera: HeraPanel,
  hermes: HermesPanel,
  athena: AthenaPanel,
  apollo: ApolloPanel,
  ares: AresPanel,
};

export default function Dashboard() {
  const [allEvents, setAllEvents] = useState<AgentEvent[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [openPanel, setOpenPanel] = useState<AgentName | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { isProcessing, activeAgent, lastResponse, sendCommand } = useZeus();
  const { isSpeaking, speak } = useVoiceOutput();
  const { events } = useAgentEvents(lastResponse?.session_id || null);

  const handleTranscript = useCallback(
    async (text: string) => {
      const response = await sendCommand(text);
      if (response) {
        // Handle navigation intents
        if (response.intent?.startsWith("navigate:")) {
          const target = response.intent.replace("navigate:", "");
          if (target === "settings") {
            setSettingsOpen(true);
          } else {
            setOpenPanel(target as AgentName);
          }
        }
        setAgentMessages((prev) => ({ ...prev, [response.agent]: response.response }));
        setConversationHistory((prev) => [
          ...prev,
          { transcript: text, response: response.response, agent: response.agent },
        ]);
        speak(response.response);
      }
    },
    [sendCommand, speak]
  );

  const { isListening, transcript, interimTranscript, toggleListening, isSupported } =
    useVoiceInput(handleTranscript);

  useEffect(() => {
    if (events.length > 0) {
      setAllEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newEvents = events.filter((e) => !ids.has(e.id));
        return [...prev, ...newEvents];
      });
    }
  }, [events]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        toggleListening();
      }
      if (e.key === "Escape") {
        setOpenPanel(null);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  const displayAgents = agents.filter((a) => a.name !== "zeus");
  const currentActiveAgent = activeAgent || selectedAgent;
  const openPanelAgent = openPanel ? getAgent(openPanel) : null;
  const PanelContent = openPanel ? PANEL_COMPONENTS[openPanel] : null;

  return (
    <main className="h-screen grid-bg scan-line relative overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar */}
        <motion.div
          className="w-56 border-r border-white/[0.03] flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="px-4 py-5 flex items-center gap-2.5 border-b border-white/[0.03]">
            <div className="w-7 h-7 rounded-md bg-zeus/10 flex items-center justify-center">
              <Zap size={14} className="text-zeus" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Agent<span className="text-zeus">Zeus</span>
              </h1>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                {isSupported ? "Voice Active" : "Voice Unavailable"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <AgentSidebar
              activeAgent={currentActiveAgent}
              agentMessages={agentMessages}
              onSelectAgent={(name) => setOpenPanel(name)}
            />
          </div>

          <div className="px-4 py-3 border-t border-white/[0.03]">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <Settings size={14} />
              <span className="text-[11px] font-mono">Settings</span>
            </button>
          </div>
        </motion.div>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          <motion.div className="px-6 py-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <CommandBar isProcessing={isProcessing} activeAgent={activeAgent} lastIntent={lastResponse?.intent || null} />
          </motion.div>

          <div className="flex-1 flex flex-col items-center px-6 pb-6 overflow-hidden">
            <motion.div className="py-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <VoiceOrb isListening={isListening} isSpeaking={isSpeaking} isProcessing={isProcessing} onClick={toggleListening} />
            </motion.div>

            <motion.div className="w-full max-w-2xl flex-1 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <TranscriptDisplay
                transcript={transcript}
                interimTranscript={interimTranscript}
                response={lastResponse?.response || null}
                activeAgent={activeAgent}
                history={conversationHistory}
              />
            </motion.div>
          </div>

          <motion.div className="px-6 pb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {displayAgents.map((agent, i) => (
                <motion.div key={agent.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                  <AgentCard
                    agent={agent}
                    isActive={currentActiveAgent === agent.name}
                    lastMessage={agentMessages[agent.name]}
                    onClick={() => setOpenPanel(agent.name)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <motion.div className="w-72 border-l border-white/[0.03] p-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <ActivityFeed events={allEvents} />
        </motion.div>
      </div>

      {/* Agent Detail Panel */}
      <PanelContainer agent={openPanelAgent || null} onClose={() => setOpenPanel(null)}>
        {PanelContent && <PanelContent />}
      </PanelContainer>

      {/* Settings Panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Compiled successfully.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: wire agent panels and settings into dashboard with voice navigation"
git push origin main
```
