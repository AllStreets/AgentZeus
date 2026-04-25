"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Circle, Clock } from "lucide-react";
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
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-green-500/30 transition-colors"
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
                  title={task.status === "pending" ? "Start" : task.status === "in_progress" ? "Complete" : "Reset"}
                  style={{ color: task.status === "completed" ? "#10b981" : task.status === "in_progress" ? "#f59e0b" : "#334155" }}
                >
                  {task.status === "completed" ? <Check size={15} /> : task.status === "in_progress" ? <Clock size={15} /> : <Circle size={15} />}
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
