create table if not exists public.ar_crm_clickup_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  webhook_id text not null,
  event text not null,
  task_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'error')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_crm_clickup_webhook_events_task_idx
  on public.ar_crm_clickup_webhook_events(task_id, created_at desc);

create index if not exists ar_crm_clickup_webhook_events_status_idx
  on public.ar_crm_clickup_webhook_events(status, created_at desc);

alter table public.ar_crm_clickup_webhook_events enable row level security;

-- Eventos de integração: acesso somente pela Edge Function com service role.
revoke all on table public.ar_crm_clickup_webhook_events from anon, authenticated;
