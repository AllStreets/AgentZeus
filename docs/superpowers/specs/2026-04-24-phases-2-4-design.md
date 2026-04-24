# AgentZeus Phase 2-4 Design Spec

## Overview
Four phases of features to make AgentZeus a fully operational personal command center.

---

## Phase 1 — Agent Detail Panels + Settings

### Agent Detail Panels
Each agent card is clickable and opens a slide-out right panel (replacing the activity feed column temporarily, or as an overlay). Each panel shows agent-specific data and controls.

- **Artemis panel:** Live task list with status filters (all/pending/in_progress/completed), add task form, mark complete, delete. Tasks pulled from Supabase.
- **Hera panel:** Note list, search bar (semantic search via embeddings), save note form. Notes pulled from Supabase.
- **Hermes panel:** Placeholder UI with "Connect Gmail" and "Connect Slack" buttons, shows integration status.
- **Athena panel:** Placeholder with "Connect GitHub" button + token input form.
- **Apollo panel:** Placeholder with "Connect Google Calendar" button.
- **Ares panel:** Static system status cards (app version, environment, uptime placeholder). Vercel integration added in Phase 4.

### Settings Panel
Accessible via sidebar Settings button. Full-screen overlay with tabs:
- **Voice:** TTS voice selector (alloy/echo/fable/onyx/nova/shimmer), speech rate
- **Integrations:** GitHub personal access token input, Google OAuth connect/disconnect, Slack webhook URL
- **API Keys:** OpenAI API key display (masked), Supabase URL display
- **About:** Version, links

Settings persisted in localStorage (no sensitive keys stored — just preferences). GitHub token stored in localStorage (personal tool, acceptable).

### Voice Commands for Navigation
Zeus classifies commands like "show my tasks", "open notes", "go to settings" and the dashboard navigates accordingly.

---

## Phase 2 — GitHub Integration (Athena)

### Auth
GitHub Personal Access Token entered in Settings > Integrations. Stored in localStorage. Sent to Athena API route via request body.

### Athena API enhancements
- Fetch open PRs assigned to user
- Fetch recent commits across repos
- List repos with last push date
- Create/list issues
- Summarize repo activity

### Athena panel additions
- Open PR list with title, repo, age
- Recent commits feed
- Repo list with stars and last activity
- Issue count badges

### Voice examples
- "Athena, what PRs need my review?"
- "How many open issues do I have?"
- "What did I commit today?"

---

## Phase 3 — Google Integration (Hermes + Apollo)

### Auth
Google OAuth via Supabase Auth (Google provider). Access token stored in Supabase `user_preferences` table per user session.

### Hermes (Gmail)
- Unread email count
- List recent unread emails (sender, subject, snippet)
- Read email by voice ("read my latest email")
- Draft reply (voice dictates, Hermes drafts, shows for confirmation)

### Apollo (Google Calendar)
- Today's events list
- Next meeting with time remaining
- Create event via voice
- "Daily briefing" — reads today's schedule

### Supabase schema addition
```sql
create table user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  service text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Phase 4 — Power Features

### Daily Briefing
Voice: "Good morning" or "Give me my briefing"
Zeus routes to a special multi-agent sequence:
1. Apollo fetches today's calendar events
2. Hermes fetches unread email count + top 3 subjects
3. Artemis fetches pending high-priority tasks
4. Zeus assembles and speaks a combined briefing

### Ares Live Monitoring (Vercel)
- Vercel API token in Settings
- Ares panel shows: recent deployments with status, build logs link, production URL
- Voice: "Ares, what's the deployment status?"

### Ambient Notifications
- Background polling every 5 min for new Gmail (if connected)
- Non-intrusive toast notification in activity feed
- Optional voice announcement for new emails

### Voice Shortcuts
Zeus intent system extended with shortcuts:
- "Add task [title]" → Artemis creates task immediately
- "Remember [content]" → Hera saves note immediately  
- "What's on my calendar tomorrow?" → Apollo fetches next day
- "Open [agent name]" → navigates to agent panel

---

## Tech Stack Additions
- `@google-cloud/local-auth` or direct Google OAuth via Supabase
- GitHub REST API via `fetch` (no SDK needed for personal token)
- Vercel REST API via `fetch`
- localStorage for GitHub token, Vercel token, voice preferences
