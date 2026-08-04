create table if not exists public.hub_notificacao_dispositivos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_notificacao_dispositivos_user_idx
  on public.hub_notificacao_dispositivos(auth_user_id, ativo);

alter table public.hub_notificacao_dispositivos enable row level security;

grant select, insert, update, delete on table public.hub_notificacao_dispositivos to authenticated;

drop policy if exists hub_notificacao_dispositivos_select_own on public.hub_notificacao_dispositivos;
create policy hub_notificacao_dispositivos_select_own on public.hub_notificacao_dispositivos
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists hub_notificacao_dispositivos_insert_own on public.hub_notificacao_dispositivos;
create policy hub_notificacao_dispositivos_insert_own on public.hub_notificacao_dispositivos
  for insert to authenticated
  with check (auth_user_id = (select auth.uid()));

drop policy if exists hub_notificacao_dispositivos_update_own on public.hub_notificacao_dispositivos;
create policy hub_notificacao_dispositivos_update_own on public.hub_notificacao_dispositivos
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

drop policy if exists hub_notificacao_dispositivos_delete_own on public.hub_notificacao_dispositivos;
create policy hub_notificacao_dispositivos_delete_own on public.hub_notificacao_dispositivos
  for delete to authenticated
  using (auth_user_id = (select auth.uid()));
