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
