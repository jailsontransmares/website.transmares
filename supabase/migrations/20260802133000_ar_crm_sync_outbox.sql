create table if not exists public.ar_crm_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ar_crm_items(id) on delete cascade,
  task_id text not null,
  action text not null
    check (action in ('update', 'delete')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'error')),
  attempts integer not null default 0
    check (attempts >= 0),
  last_error text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_crm_sync_outbox_pending_idx
  on public.ar_crm_sync_outbox(status, available_at);

create index if not exists ar_crm_sync_outbox_task_idx
  on public.ar_crm_sync_outbox(task_id, created_at desc);

alter table public.ar_crm_sync_outbox enable row level security;

-- A fila interna: somente Edge Functions com service role devem acessá-la.
revoke all on table public.ar_crm_sync_outbox from anon, authenticated;
