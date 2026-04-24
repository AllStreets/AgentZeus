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
