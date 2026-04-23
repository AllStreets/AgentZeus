# AgentZeus — Design Spec

## Overview
A voice-activated, fully agentic dashboard — a personal Jarvis. Built with Next.js on Vercel, Supabase for backend, and OpenAI (GPT-5.4 mini) for AI reasoning. High-tech, animated UI with real-time agent responses.

## Agents

| Agent | Domain | Integrations |
|-------|--------|--------------|
| **Zeus** | Orchestrator — receives voice, classifies intent, delegates | OpenAI GPT-5.4 mini |
| **Hermes** | Communications — email, Slack, Discord | Gmail API, Slack API, Discord API |
| **Athena** | Code & Dev — PRs, issues, code gen, deployments | GitHub API |
| **Apollo** | Calendar & Scheduling — events, free time, daily briefings | Google Calendar API |
| **Artemis** | Tasks & Productivity — todos, habits, goals, focus sessions | Supabase (internal) |
| **Ares** | System & DevOps — monitoring, deploys, error logs, alerts | Vercel API, custom webhooks |
| **Hera** | Memory & Knowledge — notes, bookmarks, semantic search | OpenAI Embeddings, pgvector |

## Architecture

### Frontend (Next.js on Vercel)
- Central voice orb with particle effects (listening/speaking states)
- Agent cards in grid layout with glow effects and expansion animations
- Supabase Realtime subscriptions for live streaming agent responses
- Web Speech API for voice input, OpenAI TTS for voice output
- Framer Motion for all transitions and animations

### Backend (Supabase)
- **Auth:** Supabase Auth with Google OAuth (for Gmail/Calendar scopes)
- **Database:** Postgres — tables for tasks, notes, agent_events, user_preferences, conversations
- **Edge Functions:** One per agent (7 total). Zeus is the entry point, delegates to others.
- **Realtime:** Agents write to `agent_events` table; frontend subscribes per-session
- **Vector Store:** pgvector extension for Hera's semantic search

### OpenAI API
- **GPT-5.4 mini** — agent reasoning and responses
- **Whisper** — fallback voice-to-text
- **TTS** — voice responses
- **text-embedding-3-small** — Hera's knowledge embeddings

## Voice Flow
1. User speaks → Web Speech API transcribes in real-time
2. Transcript displays with typing animation
3. Zeus classifies intent → target agent card lights up with glow animation
4. Zeus invokes target agent's Edge Function
5. Agent writes streaming updates to `agent_events`
6. Frontend receives via Realtime → text streams in card + TTS speaks response
7. Card returns to idle with subtle pulse

## UI Design

### Color System
- **Background:** #060b18 (navy blue)
- **Surfaces:** rgba(255,255,255,0.03) with backdrop-blur (glassmorphism)
- **Primary accent:** electric blue (#3b82f6)
- **Agent colors:** Zeus: gold (#f59e0b), Hermes: teal (#14b8a6), Athena: violet (#8b5cf6), Apollo: orange (#f97316), Artemis: emerald (#10b981), Ares: red (#ef4444), Hera: rose (#f43f5e)

### Design Language
- Glassmorphism panels with subtle blur and border glow
- Grid/circuit-board background pattern
- Particle effects around voice orb
- Framer Motion: cards slide, fade, scale; staggered entrance animations
- Agent-specific glow colors on activation
- Monospace/tech fonts for data, clean sans-serif for UI

### Layout
- Top: minimal nav with AgentZeus branding + settings
- Center: voice command orb (always visible)
- Below orb: transcript display area
- Main area: agent cards in responsive grid
- Right sidebar: activity feed of recent agent actions

## Database Schema (Key Tables)

### agent_events
- id, session_id, agent_name, event_type (thinking/responding/complete/error), content, created_at

### tasks (Artemis)
- id, user_id, title, description, status, priority, due_date, created_at

### notes (Hera)
- id, user_id, content, embedding (vector), tags, created_at

### conversations
- id, user_id, transcript, agent_name, response, created_at

### user_preferences
- id, user_id, key, value

## Tech Stack Summary
- **Frontend:** Next.js 15, React, Tailwind CSS, Framer Motion
- **Backend:** Supabase (Auth, Postgres, Edge Functions, Realtime, pgvector)
- **Hosting:** Vercel
- **AI:** OpenAI GPT-5.4 mini, Whisper, TTS, Embeddings
- **Voice:** Web Speech API (input), OpenAI TTS (output)
