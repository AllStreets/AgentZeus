-- User integrations table for storing OAuth tokens
create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  service text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, service)
);

-- Helper to upsert tokens
create or replace function upsert_integration(
  p_service text,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_metadata jsonb default '{}'
) returns void language plpgsql as $$
begin
  insert into user_integrations (service, access_token, refresh_token, expires_at, metadata)
  values (p_service, p_access_token, p_refresh_token, p_expires_at, p_metadata)
  on conflict (user_id, service) do update set
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    expires_at = excluded.expires_at,
    metadata = excluded.metadata,
    updated_at = now();
end;
$$;
