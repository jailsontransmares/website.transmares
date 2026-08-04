create table if not exists public.ar_crm_comment_links (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  clickup_comment_id text not null,
  parent_clickup_comment_id text not null,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id, clickup_comment_id)
);

create index if not exists ar_crm_comment_links_task_idx
  on public.ar_crm_comment_links(task_id);

create index if not exists ar_crm_comment_links_parent_idx
  on public.ar_crm_comment_links(parent_clickup_comment_id);

alter table public.ar_crm_comment_links enable row level security;

grant select on table public.ar_crm_comment_links to authenticated;

drop policy if exists ar_crm_comment_links_select_permission on public.ar_crm_comment_links;
create policy ar_crm_comment_links_select_permission on public.ar_crm_comment_links
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));
