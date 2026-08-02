create table if not exists public.ar_crm_items (
  id uuid primary key default gen_random_uuid(),
  nome text not null default '',
  status text,
  responsavel text,
  data_vencimento date,
  dados jsonb not null default '{}'::jsonb,
  sync_status text not null default 'pending'
    check (sync_status in ('pending', 'synced', 'error', 'conflict')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_crm_clickup_mapping (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ar_crm_items(id) on delete cascade,
  workspace_id text,
  list_id text,
  folder_id text,
  task_id text not null unique,
  last_clickup_updated_at timestamptz,
  last_synced_at timestamptz,
  sync_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id)
);

create table if not exists public.ar_crm_sync_runs (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'manual'
    check (origem in ('manual', 'scheduled', 'webhook', 'retry')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'success', 'partial', 'error')),
  total_processados integer not null default 0,
  total_criados integer not null default 0,
  total_atualizados integer not null default 0,
  total_erros integer not null default 0,
  mensagem_erro text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ar_crm_items_status_idx on public.ar_crm_items(status);
create index if not exists ar_crm_items_sync_status_idx on public.ar_crm_items(sync_status);
create index if not exists ar_crm_mapping_item_idx on public.ar_crm_clickup_mapping(item_id);
create index if not exists ar_crm_sync_runs_created_idx on public.ar_crm_sync_runs(created_at desc);

alter table public.ar_crm_items enable row level security;
alter table public.ar_crm_clickup_mapping enable row level security;
alter table public.ar_crm_sync_runs enable row level security;

grant select on table public.ar_crm_items to authenticated;
grant select on table public.ar_crm_clickup_mapping to authenticated;
grant select on table public.ar_crm_sync_runs to authenticated;

drop policy if exists ar_crm_items_select_permission on public.ar_crm_items;
create policy ar_crm_items_select_permission on public.ar_crm_items
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));

drop policy if exists ar_crm_mapping_select_permission on public.ar_crm_clickup_mapping;
create policy ar_crm_mapping_select_permission on public.ar_crm_clickup_mapping
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));

drop policy if exists ar_crm_sync_runs_select_permission on public.ar_crm_sync_runs;
create policy ar_crm_sync_runs_select_permission on public.ar_crm_sync_runs
  for select to authenticated
  using (public.app_tem_permissao('painel_ar.crm', 'view'));

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('painel_ar.crm', 'CRM', 'aba', 'painel_ar', '/painel-ar', 15, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select perfil.id, 'painel_ar.crm', 'view', true
from public.perfis perfil
where perfil.slug in ('admin', 'usuario', 'especial')
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();
