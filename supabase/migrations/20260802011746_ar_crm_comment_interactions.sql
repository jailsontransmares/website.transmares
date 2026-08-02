create table if not exists public.ar_crm_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  clickup_comment_id text not null,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '😮', '😢', '🎉')),
  created_at timestamptz not null default now(),
  unique (task_id, clickup_comment_id, user_id, emoji)
);

create index if not exists ar_crm_comment_reactions_task_idx
  on public.ar_crm_comment_reactions(task_id);

create table if not exists public.ar_crm_comment_mentions (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  clickup_comment_id text not null,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  display_name text not null,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id, clickup_comment_id, user_id, display_name)
);

create index if not exists ar_crm_comment_mentions_task_idx
  on public.ar_crm_comment_mentions(task_id);

alter table public.ar_crm_comment_reactions enable row level security;
alter table public.ar_crm_comment_mentions enable row level security;

drop policy if exists ar_crm_comment_reactions_select_permission on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_select_permission on public.ar_crm_comment_reactions
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));

drop policy if exists ar_crm_comment_reactions_insert_self on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_insert_self on public.ar_crm_comment_reactions
  for insert to authenticated
  with check (
    public.app_tem_permissao('painel_ar.crm', 'execute')
    and exists (
      select 1 from public.usuarios u
      where u.id = user_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists ar_crm_comment_reactions_delete_self on public.ar_crm_comment_reactions;
create policy ar_crm_comment_reactions_delete_self on public.ar_crm_comment_reactions
  for delete to authenticated
  using (
    public.app_tem_permissao('painel_ar.crm', 'execute')
    and exists (
      select 1 from public.usuarios u
      where u.id = user_id
        and u.auth_user_id = (select auth.uid())
        and u.status = 'ativo'
    )
  );

drop policy if exists ar_crm_comment_mentions_select_permission on public.ar_crm_comment_mentions;
create policy ar_crm_comment_mentions_select_permission on public.ar_crm_comment_mentions
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));
