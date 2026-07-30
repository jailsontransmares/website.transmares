create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.rh_configuracoes (
  id smallint primary key default 1,
  empresa_nome text not null default 'Transmares Corretora de Seguros',
  finalidade text not null default 'Controle e gestão interna. Os registros oficiais são mantidos pela contabilidade.',
  conta_google_drive text not null default 'gestao@transmaresseguros.com.br',
  caminho_raiz_google_drive text not null default 'Hub Transmares/DP e RH/Colaboradores',
  retencao_documentos_anos smallint not null default 10,
  exclusao_documentos_automatica boolean not null default false,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rh_configuracoes_singleton_check check (id = 1),
  constraint rh_configuracoes_retencao_check check (retencao_documentos_anos between 1 and 100)
);

create table if not exists public.rh_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  entidade text not null,
  registro_id text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  motivo text,
  created_at timestamptz not null default now()
);

create index if not exists rh_configuracoes_created_by_idx
  on public.rh_configuracoes (created_by);

create index if not exists rh_configuracoes_updated_by_idx
  on public.rh_configuracoes (updated_by);

create index if not exists rh_auditoria_usuario_created_at_idx
  on public.rh_auditoria (usuario_id, created_at desc);

create index if not exists rh_auditoria_entidade_registro_created_at_idx
  on public.rh_auditoria (entidade, registro_id, created_at desc);

create or replace function private.rh_preparar_atualizacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := public.app_usuario_atual_id();
  return new;
end;
$$;

create or replace function private.rh_auditar_linha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro_id text;
  v_dados_anteriores jsonb;
  v_dados_novos jsonb;
begin
  if tg_op = 'INSERT' then
    v_registro_id := to_jsonb(new) ->> 'id';
    v_dados_novos := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    if old is not distinct from new then
      return new;
    end if;

    v_registro_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');
    v_dados_anteriores := to_jsonb(old);
    v_dados_novos := to_jsonb(new);
  else
    v_registro_id := to_jsonb(old) ->> 'id';
    v_dados_anteriores := to_jsonb(old);
  end if;

  insert into public.rh_auditoria (
    usuario_id,
    acao,
    entidade,
    registro_id,
    dados_anteriores,
    dados_novos
  )
  values (
    public.app_usuario_atual_id(),
    lower(tg_op),
    tg_table_name,
    v_registro_id,
    v_dados_anteriores,
    v_dados_novos
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.rh_preparar_atualizacao() from public;
revoke all on function private.rh_preparar_atualizacao() from anon;
revoke all on function private.rh_preparar_atualizacao() from authenticated;
revoke all on function private.rh_auditar_linha() from public;
revoke all on function private.rh_auditar_linha() from anon;
revoke all on function private.rh_auditar_linha() from authenticated;

drop trigger if exists rh_configuracoes_prepare_update on public.rh_configuracoes;
create trigger rh_configuracoes_prepare_update
before update on public.rh_configuracoes
for each row
execute function private.rh_preparar_atualizacao();

drop trigger if exists rh_configuracoes_audit_update on public.rh_configuracoes;
create trigger rh_configuracoes_audit_update
after update on public.rh_configuracoes
for each row
execute function private.rh_auditar_linha();

insert into public.rh_configuracoes (id)
values (1)
on conflict (id) do update
set empresa_nome = excluded.empresa_nome,
    finalidade = excluded.finalidade,
    conta_google_drive = excluded.conta_google_drive,
    caminho_raiz_google_drive = excluded.caminho_raiz_google_drive,
    retencao_documentos_anos = excluded.retencao_documentos_anos,
    exclusao_documentos_automatica = excluded.exclusao_documentos_automatica;

insert into public.recursos_acesso (
  chave,
  nome,
  tipo,
  recurso_pai,
  rota,
  ordem,
  status
)
values
  ('rh_dp', 'RH & DP', 'modulo', null, '/rh-dp', 60, 'ativo'),
  ('rh_dp.dashboard', 'Dashboard', 'aba', 'rh_dp', '/rh-dp', 61, 'ativo'),
  ('rh_dp.colaboradores', 'Colaboradores', 'aba', 'rh_dp', '/rh-dp/colaboradores', 62, 'ativo'),
  ('rh_dp.documentos', 'Documentos', 'aba', 'rh_dp', '/rh-dp/documentos', 63, 'ativo'),
  ('rh_dp.historicos', 'Históricos', 'aba', 'rh_dp', '/rh-dp/historicos', 64, 'ativo'),
  ('rh_dp.ferias', 'Férias', 'aba', 'rh_dp', '/rh-dp/ferias', 65, 'ativo'),
  ('rh_dp.ocorrencias', 'Ocorrências e afastamentos', 'aba', 'rh_dp', '/rh-dp/ocorrencias', 66, 'ativo'),
  ('rh_dp.fechamentos', 'Fechamento mensal', 'aba', 'rh_dp', '/rh-dp/fechamentos', 67, 'ativo'),
  ('rh_dp.desligamentos', 'Desligamentos', 'aba', 'rh_dp', '/rh-dp/desligamentos', 68, 'ativo'),
  ('rh_dp.auditoria', 'Auditoria', 'aba', 'rh_dp', '/rh-dp/auditoria', 69, 'ativo'),
  ('rh_dp.configuracoes', 'Configurações', 'aba', 'rh_dp', '/rh-dp/configuracoes', 70, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

with permissoes(recurso_chave, acao) as (
  values
    ('rh_dp', 'view'),
    ('rh_dp.dashboard', 'view'),
    ('rh_dp.colaboradores', 'view'),
    ('rh_dp.colaboradores', 'create'),
    ('rh_dp.colaboradores', 'update'),
    ('rh_dp.colaboradores', 'archive'),
    ('rh_dp.colaboradores', 'view_sensitive'),
    ('rh_dp.documentos', 'view'),
    ('rh_dp.documentos', 'create'),
    ('rh_dp.documentos', 'update'),
    ('rh_dp.documentos', 'delete'),
    ('rh_dp.documentos', 'download'),
    ('rh_dp.historicos', 'view'),
    ('rh_dp.ferias', 'view'),
    ('rh_dp.ferias', 'create'),
    ('rh_dp.ferias', 'update'),
    ('rh_dp.ferias', 'cancel'),
    ('rh_dp.ocorrencias', 'view'),
    ('rh_dp.ocorrencias', 'create'),
    ('rh_dp.ocorrencias', 'update'),
    ('rh_dp.fechamentos', 'view'),
    ('rh_dp.fechamentos', 'create'),
    ('rh_dp.fechamentos', 'update'),
    ('rh_dp.fechamentos', 'close'),
    ('rh_dp.fechamentos', 'reopen'),
    ('rh_dp.desligamentos', 'view'),
    ('rh_dp.desligamentos', 'create'),
    ('rh_dp.desligamentos', 'update'),
    ('rh_dp.auditoria', 'view'),
    ('rh_dp.configuracoes', 'view'),
    ('rh_dp.configuracoes', 'update')
)
insert into public.perfil_permissoes (
  perfil_id,
  recurso_chave,
  acao,
  permitido
)
select p.id, permissoes.recurso_chave, permissoes.acao, true
from public.perfis p
cross join permissoes
where p.slug = 'admin'
on conflict (perfil_id, recurso_chave, acao) do update
set permitido = excluded.permitido,
    updated_at = now();

update public.itens
set titulo = 'RH & DP',
    descricao = 'Controle e gestão interna de colaboradores',
    status = 'ativo',
    dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'slug', 'rh-dp',
      'tipo', 'modulo',
      'ordem', 55,
      'bloqueavel', true,
      'exibir_home', true
    ),
    updated_at = now()
where dados ->> 'slug' = 'rh-dp'
  and dados ->> 'tipo' = 'modulo';

insert into public.itens (
  titulo,
  descricao,
  ordem,
  status,
  dados
)
select
  'RH & DP',
  'Controle e gestão interna de colaboradores',
  0,
  'ativo',
  jsonb_build_object(
    'slug', 'rh-dp',
    'tipo', 'modulo',
    'ordem', 55,
    'bloqueavel', true,
    'exibir_home', true
  )
where not exists (
  select 1
  from public.itens
  where dados ->> 'slug' = 'rh-dp'
    and dados ->> 'tipo' = 'modulo'
);

alter table public.rh_configuracoes enable row level security;
alter table public.rh_auditoria enable row level security;

revoke all on table public.rh_configuracoes from anon;
revoke all on table public.rh_auditoria from anon;
revoke all on table public.rh_configuracoes from authenticated;
revoke all on table public.rh_auditoria from authenticated;

grant select, update on table public.rh_configuracoes to authenticated;
grant select on table public.rh_auditoria to authenticated;

drop policy if exists rh_configuracoes_select_permission on public.rh_configuracoes;
create policy rh_configuracoes_select_permission
on public.rh_configuracoes
for select
to authenticated
using ((select public.app_tem_permissao('rh_dp', 'view')));

drop policy if exists rh_configuracoes_update_permission on public.rh_configuracoes;
create policy rh_configuracoes_update_permission
on public.rh_configuracoes
for update
to authenticated
using ((select public.app_tem_permissao('rh_dp.configuracoes', 'update')))
with check (
  id = 1
  and (select public.app_tem_permissao('rh_dp.configuracoes', 'update'))
);

drop policy if exists rh_auditoria_select_permission on public.rh_auditoria;
create policy rh_auditoria_select_permission
on public.rh_auditoria
for select
to authenticated
using ((select public.app_tem_permissao('rh_dp.auditoria', 'view')));
;
