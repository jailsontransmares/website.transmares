create table if not exists public.integracao_logs (
  id uuid primary key default gen_random_uuid(),
  sistema text not null,
  tipo text not null,
  evento text,
  nivel text not null default 'info' check (nivel in ('info', 'warning', 'error')),
  status text not null default 'success' check (status in ('started', 'success', 'failed', 'retrying')),
  mensagem text,
  correlation_id text,
  external_id text,
  duracao_ms integer,
  tentativa integer not null default 1,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists integracao_logs_created_at_idx
  on public.integracao_logs (created_at desc);

create index if not exists integracao_logs_sistema_status_idx
  on public.integracao_logs (sistema, status, created_at desc);

create index if not exists integracao_logs_correlation_id_idx
  on public.integracao_logs (correlation_id)
  where correlation_id is not null;

alter table public.integracao_logs enable row level security;

grant select on table public.integracao_logs to authenticated;

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values ('admin.logs_integracoes', 'Logs de Integrações', 'aba', 'admin', '/admin/sistema/logs-integracoes', 95, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

with admin_perfil as (
  select id from public.perfis where slug = 'admin'
), permissoes_admin as (
  select 'admin.logs_integracoes'::text as chave, acao
  from (values ('view'), ('create'), ('update'), ('delete')) as a(acao)
)
insert into public.perfil_permissoes (perfil_id, recurso_chave, acao, permitido)
select admin_perfil.id, permissoes_admin.chave, permissoes_admin.acao, true
from admin_perfil
cross join permissoes_admin
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = true,
    updated_at = now();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integracao_logs'
      and policyname = 'integracao_logs_select_admin'
  ) then
    create policy integracao_logs_select_admin on public.integracao_logs
      for select to authenticated
      using (public.app_tem_permissao('admin.logs_integracoes', 'view'));
  end if;
end $$;
