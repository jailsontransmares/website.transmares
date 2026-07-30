-- Financeiro / Fase 1: estrutura e segurança.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.fin_empresas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  origem text not null default 'manual',
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_empresas_codigo_key unique (codigo),
  constraint fin_empresas_codigo_check check (codigo ~ '^[a-z0-9][a-z0-9_-]{1,29}$'),
  constraint fin_empresas_cnpj_check check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint fin_empresas_origem_check check (origem in ('corretora_configuracoes', 'manual', 'importacao')),
  constraint fin_empresas_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create unique index if not exists fin_empresas_cnpj_unique_idx
  on public.fin_empresas (cnpj)
  where cnpj is not null;

create index if not exists fin_empresas_status_nome_idx
  on public.fin_empresas (status, nome_fantasia, razao_social);

create index if not exists fin_empresas_created_by_idx
  on public.fin_empresas (created_by);

create index if not exists fin_empresas_updated_by_idx
  on public.fin_empresas (updated_by);

create table if not exists public.fin_usuario_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  principal boolean not null default false,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_usuario_empresas_empresa_usuario_key unique (empresa_id, usuario_id),
  constraint fin_usuario_empresas_status_check check (status in ('ativo', 'inativo'))
);

create unique index if not exists fin_usuario_empresas_principal_unique_idx
  on public.fin_usuario_empresas (usuario_id)
  where principal and status = 'ativo';

create index if not exists fin_usuario_empresas_usuario_status_empresa_idx
  on public.fin_usuario_empresas (usuario_id, status, empresa_id);

create index if not exists fin_usuario_empresas_empresa_status_usuario_idx
  on public.fin_usuario_empresas (empresa_id, status, usuario_id);

create index if not exists fin_usuario_empresas_created_by_idx
  on public.fin_usuario_empresas (created_by);

create index if not exists fin_usuario_empresas_updated_by_idx
  on public.fin_usuario_empresas (updated_by);

create table if not exists public.fin_parametros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.fin_empresas(id) on delete restrict,
  chave text not null,
  valor jsonb not null default 'null'::jsonb,
  descricao text,
  sensivel boolean not null default false,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_parametros_chave_check check (chave ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  constraint fin_parametros_status_check check (status in ('ativo', 'inativo')),
  constraint fin_parametros_empresa_chave_key unique nulls not distinct (empresa_id, chave)
);

create index if not exists fin_parametros_empresa_status_chave_idx
  on public.fin_parametros (empresa_id, status, chave);

create index if not exists fin_parametros_created_by_idx
  on public.fin_parametros (created_by);

create index if not exists fin_parametros_updated_by_idx
  on public.fin_parametros (updated_by);

create table if not exists public.fin_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.fin_empresas(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  entidade text not null,
  registro_id text,
  dados_anteriores jsonb,
  dados_posteriores jsonb,
  motivo text,
  contexto jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fin_auditoria_acao_check check (acao in ('insert', 'update', 'delete', 'archive', 'restore', 'close', 'reopen', 'execute'))
);

create index if not exists fin_auditoria_empresa_created_at_idx
  on public.fin_auditoria (empresa_id, created_at desc);

create index if not exists fin_auditoria_usuario_created_at_idx
  on public.fin_auditoria (usuario_id, created_at desc);

create index if not exists fin_auditoria_entidade_registro_created_at_idx
  on public.fin_auditoria (entidade, registro_id, created_at desc);

create or replace function private.fin_preparar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := public.app_usuario_atual_id();
  return new;
end;
$$;

create or replace function private.fin_auditar_linha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registro_id text;
  v_empresa_id uuid;
  v_dados_anteriores jsonb;
  v_dados_posteriores jsonb;
begin
  if tg_op = 'INSERT' then
    v_dados_posteriores := to_jsonb(new);
    v_registro_id := v_dados_posteriores ->> 'id';
  elsif tg_op = 'UPDATE' then
    if old is not distinct from new then
      return new;
    end if;

    v_dados_anteriores := to_jsonb(old);
    v_dados_posteriores := to_jsonb(new);
    v_registro_id := coalesce(v_dados_posteriores ->> 'id', v_dados_anteriores ->> 'id');
  else
    v_dados_anteriores := to_jsonb(old);
    v_registro_id := v_dados_anteriores ->> 'id';
  end if;

  v_empresa_id := nullif(
    coalesce(
      v_dados_posteriores ->> 'empresa_id',
      v_dados_anteriores ->> 'empresa_id',
      case when tg_table_name = 'fin_empresas' then v_registro_id end
    ),
    ''
  )::uuid;

  insert into public.fin_auditoria (
    empresa_id,
    usuario_id,
    acao,
    entidade,
    registro_id,
    dados_anteriores,
    dados_posteriores,
    contexto
  )
  values (
    v_empresa_id,
    public.app_usuario_atual_id(),
    lower(tg_op),
    tg_table_name,
    v_registro_id,
    v_dados_anteriores,
    v_dados_posteriores,
    jsonb_build_object(
      'schema', tg_table_schema,
      'trigger', tg_name,
      'sensivel',
        coalesce((v_dados_posteriores ->> 'sensivel')::boolean, false)
        or coalesce((v_dados_anteriores ->> 'sensivel')::boolean, false)
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.fin_preparar_atualizacao() from public;
revoke all on function private.fin_preparar_atualizacao() from anon;
revoke all on function private.fin_preparar_atualizacao() from authenticated;
revoke all on function private.fin_auditar_linha() from public;
revoke all on function private.fin_auditar_linha() from anon;
revoke all on function private.fin_auditar_linha() from authenticated;

drop trigger if exists fin_empresas_prepare_update on public.fin_empresas;
create trigger fin_empresas_prepare_update
before update on public.fin_empresas
for each row execute function private.fin_preparar_atualizacao();

drop trigger if exists fin_empresas_audit on public.fin_empresas;
create trigger fin_empresas_audit
after insert or update or delete on public.fin_empresas
for each row execute function private.fin_auditar_linha();

drop trigger if exists fin_usuario_empresas_prepare_update on public.fin_usuario_empresas;
create trigger fin_usuario_empresas_prepare_update
before update on public.fin_usuario_empresas
for each row execute function private.fin_preparar_atualizacao();

drop trigger if exists fin_usuario_empresas_audit on public.fin_usuario_empresas;
create trigger fin_usuario_empresas_audit
after insert or update or delete on public.fin_usuario_empresas
for each row execute function private.fin_auditar_linha();

drop trigger if exists fin_parametros_prepare_update on public.fin_parametros;
create trigger fin_parametros_prepare_update
before update on public.fin_parametros
for each row execute function private.fin_preparar_atualizacao();

drop trigger if exists fin_parametros_audit on public.fin_parametros;
create trigger fin_parametros_audit
after insert or update or delete on public.fin_parametros
for each row execute function private.fin_auditar_linha();

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
  ('financeiro', 'Financeiro', 'modulo', null, '/financeiro', 50, 'ativo'),
  ('financeiro.dashboard', 'Dashboard', 'aba', 'financeiro', '/financeiro/dashboard', 51, 'ativo'),
  ('financeiro.lancamentos', 'Lançamentos', 'aba', 'financeiro', '/financeiro/lancamentos', 52, 'ativo'),
  ('financeiro.conciliacao', 'Conciliação bancária', 'aba', 'financeiro', '/financeiro/conciliacao', 53, 'ativo'),
  ('financeiro.cartoes', 'Cartões e faturas', 'aba', 'financeiro', '/financeiro/cartoes', 54, 'ativo'),
  ('financeiro.relatorios', 'Relatórios e Fechamento', 'aba', 'financeiro', '/financeiro/relatorios', 55, 'ativo'),
  ('financeiro.cadastros', 'Cadastros', 'aba', 'financeiro', '/financeiro/cadastros', 56, 'ativo'),
  ('financeiro.configuracoes', 'Configurações', 'aba', 'financeiro', '/financeiro/configuracoes', 59, 'ativo'),
  ('financeiro.fechamento', 'Fechamento', 'funcao', 'financeiro.relatorios', '/financeiro/relatorios', 57, 'ativo'),
  ('financeiro.auditoria', 'Auditoria', 'funcao', 'financeiro.configuracoes', '/financeiro/configuracoes', 58, 'ativo'),
  ('financeiro.dados_sensiveis', 'Dados sensíveis', 'funcao', 'financeiro', null, 60, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

update public.itens
set titulo = 'Financeiro',
    descricao = 'Controle financeiro interno e multiempresa',
    status = 'inativo',
    dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'slug', 'financeiro',
      'tipo', 'modulo',
      'ordem', 50,
      'bloqueavel', true,
      'exibir_home', false,
      'fase', 1
    ),
    updated_at = now()
where dados ->> 'slug' = 'financeiro'
  and dados ->> 'tipo' = 'modulo';

insert into public.itens (
  titulo,
  descricao,
  ordem,
  status,
  dados
)
select
  'Financeiro',
  'Controle financeiro interno e multiempresa',
  0,
  'inativo',
  jsonb_build_object(
    'slug', 'financeiro',
    'tipo', 'modulo',
    'ordem', 50,
    'bloqueavel', true,
    'exibir_home', false,
    'fase', 1
  )
where not exists (
  select 1
  from public.itens
  where dados ->> 'slug' = 'financeiro'
    and dados ->> 'tipo' = 'modulo'
);

alter table public.fin_empresas enable row level security;
alter table public.fin_usuario_empresas enable row level security;
alter table public.fin_parametros enable row level security;
alter table public.fin_auditoria enable row level security;

revoke all on table public.fin_empresas from anon;
revoke all on table public.fin_usuario_empresas from anon;
revoke all on table public.fin_parametros from anon;
revoke all on table public.fin_auditoria from anon;

revoke all on table public.fin_empresas from authenticated;
revoke all on table public.fin_usuario_empresas from authenticated;
revoke all on table public.fin_parametros from authenticated;
revoke all on table public.fin_auditoria from authenticated;

grant select on table public.fin_empresas to authenticated;
grant select on table public.fin_usuario_empresas to authenticated;
grant select on table public.fin_parametros to authenticated;
grant select on table public.fin_auditoria to authenticated;

drop policy if exists fin_usuario_empresas_select_own on public.fin_usuario_empresas;
create policy fin_usuario_empresas_select_own
on public.fin_usuario_empresas
for select
to authenticated
using (
  usuario_id = (select public.app_usuario_atual_id())
  and status = 'ativo'
  and (select public.app_tem_permissao('financeiro', 'view'))
);

drop policy if exists fin_empresas_select_membership on public.fin_empresas;
create policy fin_empresas_select_membership
on public.fin_empresas
for select
to authenticated
using (
  status = 'ativo'
  and (select public.app_tem_permissao('financeiro', 'view'))
  and id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_parametros_select_membership on public.fin_parametros;
create policy fin_parametros_select_membership
on public.fin_parametros
for select
to authenticated
using (
  status = 'ativo'
  and (select public.app_tem_permissao('financeiro', 'view'))
  and (
    empresa_id is null
    or empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
  and (
    not sensivel
    or (select public.app_tem_permissao('financeiro.dados_sensiveis', 'view_sensitive'))
  )
);

drop policy if exists fin_auditoria_select_membership on public.fin_auditoria;
create policy fin_auditoria_select_membership
on public.fin_auditoria
for select
to authenticated
using (
  (select public.app_tem_permissao('financeiro.auditoria', 'view'))
  and (
    not coalesce((contexto ->> 'sensivel')::boolean, false)
    or (select public.app_tem_permissao('financeiro.dados_sensiveis', 'view_sensitive'))
  )
  and (
    (
      empresa_id is null
      and exists (
        select 1
        from public.fin_usuario_empresas acesso
        where acesso.usuario_id = (select public.app_usuario_atual_id())
          and acesso.status = 'ativo'
      )
    )
    or empresa_id in (
      select acesso.empresa_id
      from public.fin_usuario_empresas acesso
      where acesso.usuario_id = (select public.app_usuario_atual_id())
        and acesso.status = 'ativo'
    )
  )
);
