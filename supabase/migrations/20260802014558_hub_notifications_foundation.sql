create table if not exists public.hub_notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('mencao', 'atribuicao', 'comentario', 'prazo', 'status', 'erro')),
  titulo text not null,
  descricao text,
  modulo text not null default 'hub',
  registro_tipo text,
  registro_id text,
  rota text,
  lida_em timestamptz,
  arquivada_em timestamptz,
  dedupe_key text not null,
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (usuario_id, dedupe_key)
);

create index if not exists hub_notificacoes_usuario_created_idx
  on public.hub_notificacoes(usuario_id, created_at desc);

create index if not exists hub_notificacoes_usuario_unread_idx
  on public.hub_notificacoes(usuario_id, lida_em)
  where lida_em is null and arquivada_em is null;

create index if not exists hub_notificacoes_tipo_idx
  on public.hub_notificacoes(usuario_id, tipo, created_at desc);

alter table public.hub_notificacoes enable row level security;

grant select, update, delete on table public.hub_notificacoes to authenticated;

drop policy if exists hub_notificacoes_select_own on public.hub_notificacoes;
create policy hub_notificacoes_select_own on public.hub_notificacoes
  for select to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = usuario_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists hub_notificacoes_update_own on public.hub_notificacoes;
create policy hub_notificacoes_update_own on public.hub_notificacoes
  for update to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = usuario_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  )
  with check (
    exists (
      select 1
      from public.usuarios u
      where u.id = usuario_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists hub_notificacoes_delete_own on public.hub_notificacoes;
create policy hub_notificacoes_delete_own on public.hub_notificacoes
  for delete to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = usuario_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );
