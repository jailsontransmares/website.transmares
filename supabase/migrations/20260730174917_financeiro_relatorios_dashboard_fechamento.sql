-- Financeiro / Fase 7: relatorios, dashboard e fechamento.

create table if not exists public.fin_fechamento_periodos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  periodo_inicio date not null,
  periodo_fim date not null,
  tipo text not null default 'mensal',
  status text not null default 'aberto',
  snapshot jsonb not null default '{}'::jsonb,
  hash_snapshot text,
  fechado_em timestamptz,
  fechado_by uuid references public.usuarios(id) on delete set null,
  reaberto_em timestamptz,
  reaberto_by uuid references public.usuarios(id) on delete set null,
  motivo_reabertura text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_fechamento_periodos_periodo_check check (periodo_fim >= periodo_inicio),
  constraint fin_fechamento_periodos_tipo_check check (tipo in ('parcial', 'mensal')),
  constraint fin_fechamento_periodos_status_check check (status in ('aberto', 'fechado', 'reaberto', 'cancelado')),
  constraint fin_fechamento_periodos_reabertura_check check (
    status <> 'reaberto' or nullif(trim(coalesce(motivo_reabertura, '')), '') is not null
  )
);

create unique index if not exists fin_fechamento_periodos_empresa_periodo_tipo_idx
  on public.fin_fechamento_periodos (empresa_id, periodo_inicio, periodo_fim, tipo)
  where status <> 'cancelado';

create index if not exists fin_fechamento_periodos_empresa_status_idx
  on public.fin_fechamento_periodos (empresa_id, status, periodo_inicio desc);
create index if not exists fin_fechamento_periodos_fechado_by_idx on public.fin_fechamento_periodos (fechado_by);
create index if not exists fin_fechamento_periodos_reaberto_by_idx on public.fin_fechamento_periodos (reaberto_by);
create index if not exists fin_fechamento_periodos_created_by_idx on public.fin_fechamento_periodos (created_by);
create index if not exists fin_fechamento_periodos_updated_by_idx on public.fin_fechamento_periodos (updated_by);

create table if not exists public.fin_relatorio_execucoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  tipo_relatorio text not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  filtros jsonb not null default '{}'::jsonb,
  filtros_hash text not null,
  resultado jsonb not null default '{}'::jsonb,
  status text not null default 'gerado',
  exportado_em timestamptz,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_relatorio_execucoes_periodo_check check (periodo_fim >= periodo_inicio),
  constraint fin_relatorio_execucoes_tipo_check check (tipo_relatorio in (
    'fluxo_caixa',
    'contas_pagar_receber',
    'inadimplencia',
    'dre_gerencial',
    'orcamento_realizado',
    'dashboard'
  )),
  constraint fin_relatorio_execucoes_status_check check (status in ('gerado', 'exportado', 'cancelado', 'erro'))
);

create index if not exists fin_relatorio_execucoes_empresa_tipo_idx
  on public.fin_relatorio_execucoes (empresa_id, tipo_relatorio, created_at desc);
create index if not exists fin_relatorio_execucoes_empresa_periodo_idx
  on public.fin_relatorio_execucoes (empresa_id, periodo_inicio, periodo_fim);
create index if not exists fin_relatorio_execucoes_created_by_idx on public.fin_relatorio_execucoes (created_by);
create index if not exists fin_relatorio_execucoes_updated_by_idx on public.fin_relatorio_execucoes (updated_by);

create table if not exists public.fin_orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  competencia date not null,
  natureza text not null,
  categoria_id uuid references public.fin_categorias(id) on delete restrict,
  centro_custo_id uuid references public.fin_centros_custo(id) on delete restrict,
  valor_previsto numeric(15,2) not null,
  observacoes text,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_orcamentos_competencia_check check (competencia = date_trunc('month', competencia)::date),
  constraint fin_orcamentos_natureza_check check (natureza in ('entrada', 'saida')),
  constraint fin_orcamentos_valor_check check (valor_previsto >= 0),
  constraint fin_orcamentos_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create unique index if not exists fin_orcamentos_empresa_chave_idx
  on public.fin_orcamentos (
    empresa_id,
    competencia,
    natureza,
    coalesce(categoria_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(centro_custo_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status <> 'arquivado';
create index if not exists fin_orcamentos_categoria_idx on public.fin_orcamentos (categoria_id);
create index if not exists fin_orcamentos_centro_custo_idx on public.fin_orcamentos (centro_custo_id);
create index if not exists fin_orcamentos_created_by_idx on public.fin_orcamentos (created_by);
create index if not exists fin_orcamentos_updated_by_idx on public.fin_orcamentos (updated_by);

create or replace function private.fin_preparar_fechamento_periodo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := public.app_usuario_atual_id();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, public.app_usuario_atual_id());
  end if;

  if new.status = 'fechado' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.fechado_em := coalesce(new.fechado_em, now());
    new.fechado_by := coalesce(new.fechado_by, public.app_usuario_atual_id());
    new.hash_snapshot := md5(concat_ws('|', new.empresa_id::text, new.periodo_inicio::text, new.periodo_fim::text, new.tipo, new.snapshot::text));
  end if;

  if new.status = 'reaberto' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.reaberto_em := coalesce(new.reaberto_em, now());
    new.reaberto_by := coalesce(new.reaberto_by, public.app_usuario_atual_id());
  end if;

  return new;
end;
$$;

revoke all on function private.fin_preparar_fechamento_periodo() from public;
revoke all on function private.fin_preparar_fechamento_periodo() from anon;
revoke all on function private.fin_preparar_fechamento_periodo() from authenticated;

create or replace function private.fin_bloquear_periodo_fechado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa_id uuid;
  v_data date;
begin
  v_empresa_id := case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  v_data := case
    when tg_table_name = 'fin_lancamentos' and tg_op = 'DELETE' then old.data_competencia
    when tg_table_name = 'fin_lancamentos' then new.data_competencia
    when tg_table_name = 'fin_lancamento_parcelas' and tg_op = 'DELETE' then old.data_vencimento
    when tg_table_name = 'fin_lancamento_parcelas' then new.data_vencimento
    when tg_table_name = 'fin_lancamento_baixas' and tg_op = 'DELETE' then old.data_baixa
    when tg_table_name = 'fin_lancamento_baixas' then new.data_baixa
    else null
  end;

  if v_data is not null and exists (
    select 1
    from public.fin_fechamento_periodos periodo
    where periodo.empresa_id = v_empresa_id
      and periodo.status = 'fechado'
      and v_data between periodo.periodo_inicio and periodo.periodo_fim
  ) then
    raise exception 'Periodo financeiro fechado para alteracoes.'
      using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.fin_bloquear_periodo_fechado() from public;
revoke all on function private.fin_bloquear_periodo_fechado() from anon;
revoke all on function private.fin_bloquear_periodo_fechado() from authenticated;

drop trigger if exists fin_fechamento_periodos_prepare on public.fin_fechamento_periodos;
create trigger fin_fechamento_periodos_prepare
before insert or update on public.fin_fechamento_periodos
for each row execute function private.fin_preparar_fechamento_periodo();

drop trigger if exists fin_lancamentos_block_closed_period on public.fin_lancamentos;
create trigger fin_lancamentos_block_closed_period
before insert or update or delete on public.fin_lancamentos
for each row execute function private.fin_bloquear_periodo_fechado();

drop trigger if exists fin_lancamento_parcelas_block_closed_period on public.fin_lancamento_parcelas;
create trigger fin_lancamento_parcelas_block_closed_period
before insert or update or delete on public.fin_lancamento_parcelas
for each row execute function private.fin_bloquear_periodo_fechado();

drop trigger if exists fin_lancamento_baixas_block_closed_period on public.fin_lancamento_baixas;
create trigger fin_lancamento_baixas_block_closed_period
before insert or update or delete on public.fin_lancamento_baixas
for each row execute function private.fin_bloquear_periodo_fechado();

drop view if exists public.fin_fluxo_caixa_resumo;
create view public.fin_fluxo_caixa_resumo
with (security_invoker = true)
as
with movimentos as (
  select
    lancamento.empresa_id,
    date_trunc('month', baixa.data_baixa)::date as competencia,
    'realizado'::text as regime,
    lancamento.natureza,
    baixa.valor_total as valor
  from public.fin_lancamento_baixas baixa
  join public.fin_lancamentos lancamento
    on lancamento.id = baixa.lancamento_id
   and lancamento.empresa_id = baixa.empresa_id
  where baixa.status = 'confirmada'
    and lancamento.natureza in ('entrada', 'saida')
    and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
  union all
  select
    lancamento.empresa_id,
    date_trunc('month', parcela.data_vencimento)::date as competencia,
    'projetado'::text as regime,
    lancamento.natureza,
    parcela.valor as valor
  from public.fin_lancamento_parcelas parcela
  join public.fin_lancamentos lancamento
    on lancamento.id = parcela.lancamento_id
   and lancamento.empresa_id = parcela.empresa_id
  where parcela.status in ('aberta', 'parcial')
    and lancamento.natureza in ('entrada', 'saida')
    and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
)
select
  empresa_id,
  competencia,
  regime,
  coalesce(sum(valor) filter (where natureza = 'entrada'), 0)::numeric(15,2) as entradas,
  coalesce(sum(valor) filter (where natureza = 'saida'), 0)::numeric(15,2) as saidas,
  (
    coalesce(sum(valor) filter (where natureza = 'entrada'), 0)
    - coalesce(sum(valor) filter (where natureza = 'saida'), 0)
  )::numeric(15,2) as saldo
from movimentos
group by empresa_id, competencia, regime;

drop view if exists public.fin_contas_pagar_receber_resumo;
create view public.fin_contas_pagar_receber_resumo
with (security_invoker = true)
as
select
  lancamento.empresa_id,
  lancamento.natureza,
  count(parcela.id)::integer as parcelas_abertas,
  count(parcela.id) filter (where parcela.data_vencimento < current_date)::integer as vencidas,
  count(parcela.id) filter (where parcela.data_vencimento >= current_date)::integer as a_vencer,
  coalesce(sum(parcela.valor), 0)::numeric(15,2) as valor_aberto,
  coalesce(sum(parcela.valor) filter (where parcela.data_vencimento < current_date), 0)::numeric(15,2) as valor_vencido
from public.fin_lancamento_parcelas parcela
join public.fin_lancamentos lancamento
  on lancamento.id = parcela.lancamento_id
 and lancamento.empresa_id = parcela.empresa_id
where parcela.status in ('aberta', 'parcial')
  and lancamento.natureza in ('entrada', 'saida')
  and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
group by lancamento.empresa_id, lancamento.natureza;

drop view if exists public.fin_inadimplencia_resumo;
create view public.fin_inadimplencia_resumo
with (security_invoker = true)
as
select
  lancamento.empresa_id,
  count(parcela.id)::integer as titulos_vencidos,
  coalesce(sum(parcela.valor), 0)::numeric(15,2) as valor_vencido
from public.fin_lancamento_parcelas parcela
join public.fin_lancamentos lancamento
  on lancamento.id = parcela.lancamento_id
 and lancamento.empresa_id = parcela.empresa_id
where parcela.status in ('aberta', 'parcial')
  and parcela.data_vencimento < current_date
  and lancamento.natureza = 'entrada'
  and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
group by lancamento.empresa_id;

drop view if exists public.fin_dre_gerencial_resumo;
create view public.fin_dre_gerencial_resumo
with (security_invoker = true)
as
select
  lancamento.empresa_id,
  lancamento.data_competencia as competencia,
  coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'entrada'), 0)::numeric(15,2) as receitas,
  coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'saida'), 0)::numeric(15,2) as despesas,
  (
    coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'entrada'), 0)
    - coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'saida'), 0)
  )::numeric(15,2) as resultado
from public.fin_lancamentos lancamento
where lancamento.natureza in ('entrada', 'saida')
  and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
group by lancamento.empresa_id, lancamento.data_competencia;

drop view if exists public.fin_orcamento_realizado_resumo;
create view public.fin_orcamento_realizado_resumo
with (security_invoker = true)
as
select
  orcamento.empresa_id,
  orcamento.competencia,
  orcamento.natureza,
  coalesce(sum(orcamento.valor_previsto), 0)::numeric(15,2) as valor_previsto,
  coalesce((
    select sum(lancamento.valor_total)
    from public.fin_lancamentos lancamento
    where lancamento.empresa_id = orcamento.empresa_id
      and lancamento.data_competencia = orcamento.competencia
      and lancamento.natureza = orcamento.natureza
      and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
  ), 0)::numeric(15,2) as valor_realizado
from public.fin_orcamentos orcamento
where orcamento.status = 'ativo'
group by orcamento.empresa_id, orcamento.competencia, orcamento.natureza;

drop view if exists public.fin_dashboard_resumo;
create view public.fin_dashboard_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  coalesce((
    select coalesce(sum(baixa.valor_total) filter (where lancamento.natureza = 'entrada'), 0)
         - coalesce(sum(baixa.valor_total) filter (where lancamento.natureza = 'saida'), 0)
    from public.fin_lancamento_baixas baixa
    join public.fin_lancamentos lancamento
      on lancamento.id = baixa.lancamento_id
     and lancamento.empresa_id = baixa.empresa_id
    where baixa.empresa_id = empresa.id
      and baixa.status = 'confirmada'
      and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
      and baixa.data_baixa >= date_trunc('month', current_date)::date
      and baixa.data_baixa < (date_trunc('month', current_date) + interval '1 month')::date
  ), 0)::numeric(15,2) as saldo_realizado_mes,
  coalesce((
    select coalesce(sum(parcela.valor) filter (where lancamento.natureza = 'entrada'), 0)
         - coalesce(sum(parcela.valor) filter (where lancamento.natureza = 'saida'), 0)
    from public.fin_lancamento_parcelas parcela
    join public.fin_lancamentos lancamento
      on lancamento.id = parcela.lancamento_id
     and lancamento.empresa_id = parcela.empresa_id
    where parcela.empresa_id = empresa.id
      and parcela.status in ('aberta', 'parcial')
      and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
      and parcela.data_vencimento between current_date and current_date + interval '30 days'
  ), 0)::numeric(15,2) as saldo_projetado_30d,
  coalesce((
    select sum(parcela.valor)
    from public.fin_lancamento_parcelas parcela
    join public.fin_lancamentos lancamento
      on lancamento.id = parcela.lancamento_id
     and lancamento.empresa_id = parcela.empresa_id
    where parcela.empresa_id = empresa.id
      and parcela.status in ('aberta', 'parcial')
      and parcela.data_vencimento < current_date
      and lancamento.natureza = 'entrada'
      and lancamento.status not in ('rascunho', 'cancelado', 'estornado', 'arquivado')
  ), 0)::numeric(15,2) as inadimplencia,
  (
    select count(*)::integer
    from public.fin_lancamento_parcelas parcela
    where parcela.empresa_id = empresa.id
      and parcela.status in ('aberta', 'parcial')
      and parcela.data_vencimento < current_date
  ) as parcelas_vencidas,
  (
    select count(*)::integer
    from public.fin_movimentos_bancarios movimento
    where movimento.empresa_id = empresa.id
      and movimento.status in ('pendente', 'sugerido')
  ) as conciliacao_pendente,
  (
    select count(*)::integer
    from public.fin_fechamento_periodos periodo
    where periodo.empresa_id = empresa.id
      and periodo.status = 'fechado'
  ) as periodos_fechados,
  (
    select count(*)::integer
    from public.fin_relatorio_execucoes relatorio
    where relatorio.empresa_id = empresa.id
      and relatorio.status in ('gerado', 'exportado')
  ) as relatorios_gerados
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_fechamento_periodos',
    'fin_relatorio_execucoes',
    'fin_orcamentos'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('revoke all on table public.%I from authenticated', v_tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_prepare_update', v_tabela);
    execute format('create trigger %I before update on public.%I for each row execute function private.fin_preparar_atualizacao()', v_tabela || '_prepare_update', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_audit', v_tabela);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.fin_auditar_linha()', v_tabela || '_audit', v_tabela);
  end loop;
end;
$$;

drop trigger if exists fin_fechamento_periodos_prepare_update on public.fin_fechamento_periodos;

revoke all on table public.fin_fluxo_caixa_resumo from anon;
revoke all on table public.fin_fluxo_caixa_resumo from authenticated;
grant select on table public.fin_fluxo_caixa_resumo to authenticated;
revoke all on table public.fin_contas_pagar_receber_resumo from anon;
revoke all on table public.fin_contas_pagar_receber_resumo from authenticated;
grant select on table public.fin_contas_pagar_receber_resumo to authenticated;
revoke all on table public.fin_inadimplencia_resumo from anon;
revoke all on table public.fin_inadimplencia_resumo from authenticated;
grant select on table public.fin_inadimplencia_resumo to authenticated;
revoke all on table public.fin_dre_gerencial_resumo from anon;
revoke all on table public.fin_dre_gerencial_resumo from authenticated;
grant select on table public.fin_dre_gerencial_resumo to authenticated;
revoke all on table public.fin_orcamento_realizado_resumo from anon;
revoke all on table public.fin_orcamento_realizado_resumo from authenticated;
grant select on table public.fin_orcamento_realizado_resumo to authenticated;
revoke all on table public.fin_dashboard_resumo from anon;
revoke all on table public.fin_dashboard_resumo from authenticated;
grant select on table public.fin_dashboard_resumo to authenticated;

drop policy if exists fin_fechamento_periodos_select_financeiro_fechamento on public.fin_fechamento_periodos;
create policy fin_fechamento_periodos_select_financeiro_fechamento
on public.fin_fechamento_periodos
for select
to authenticated
using (
  (
    (select public.app_tem_permissao('financeiro.fechamento', 'view'))
    or (select public.app_tem_permissao('financeiro.relatorios', 'view'))
    or (select public.app_tem_permissao('financeiro.dashboard', 'view'))
  )
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_fechamento_periodos_insert_financeiro_fechamento on public.fin_fechamento_periodos;
create policy fin_fechamento_periodos_insert_financeiro_fechamento
on public.fin_fechamento_periodos
for insert
to authenticated
with check (
  (select public.app_tem_permissao('financeiro.fechamento', 'close'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_fechamento_periodos_update_financeiro_fechamento on public.fin_fechamento_periodos;
create policy fin_fechamento_periodos_update_financeiro_fechamento
on public.fin_fechamento_periodos
for update
to authenticated
using (
  (
    (status = 'fechado' and (select public.app_tem_permissao('financeiro.fechamento', 'reopen')))
    or (status <> 'fechado' and (select public.app_tem_permissao('financeiro.fechamento', 'close')))
  )
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
)
with check (
  empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_relatorio_execucoes_select_financeiro_relatorios on public.fin_relatorio_execucoes;
create policy fin_relatorio_execucoes_select_financeiro_relatorios
on public.fin_relatorio_execucoes
for select
to authenticated
using (
  (
    (select public.app_tem_permissao('financeiro.relatorios', 'view'))
    or (select public.app_tem_permissao('financeiro.dashboard', 'view'))
  )
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_relatorio_execucoes_insert_financeiro_relatorios on public.fin_relatorio_execucoes;
create policy fin_relatorio_execucoes_insert_financeiro_relatorios
on public.fin_relatorio_execucoes
for insert
to authenticated
with check (
  (select public.app_tem_permissao('financeiro.relatorios', 'view'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_relatorio_execucoes_update_financeiro_relatorios on public.fin_relatorio_execucoes;
create policy fin_relatorio_execucoes_update_financeiro_relatorios
on public.fin_relatorio_execucoes
for update
to authenticated
using (
  (select public.app_tem_permissao('financeiro.relatorios', 'export'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
)
with check (
  (select public.app_tem_permissao('financeiro.relatorios', 'export'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_orcamentos_select_financeiro_relatorios on public.fin_orcamentos;
create policy fin_orcamentos_select_financeiro_relatorios
on public.fin_orcamentos
for select
to authenticated
using (
  (
    (select public.app_tem_permissao('financeiro.relatorios', 'view'))
    or (select public.app_tem_permissao('financeiro.dashboard', 'view'))
  )
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_orcamentos_insert_financeiro_relatorios on public.fin_orcamentos;
create policy fin_orcamentos_insert_financeiro_relatorios
on public.fin_orcamentos
for insert
to authenticated
with check (
  (select public.app_tem_permissao('financeiro.relatorios', 'export'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_baixas'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_relatorios_dashboard', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.relatorios'', ''view''))
          or (select public.app_tem_permissao(''financeiro.dashboard'', ''view''))
          or (select public.app_tem_permissao(''financeiro.fechamento'', ''view''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_relatorios_dashboard',
      v_tabela
    );
  end loop;
end;
$$;

drop policy if exists fin_movimentos_bancarios_select_financeiro_dashboard on public.fin_movimentos_bancarios;
create policy fin_movimentos_bancarios_select_financeiro_dashboard
on public.fin_movimentos_bancarios
for select
to authenticated
using (
  (select public.app_tem_permissao('financeiro.dashboard', 'view'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);

drop policy if exists fin_orcamentos_update_financeiro_relatorios on public.fin_orcamentos;
create policy fin_orcamentos_update_financeiro_relatorios
on public.fin_orcamentos
for update
to authenticated
using (
  (select public.app_tem_permissao('financeiro.relatorios', 'export'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
)
with check (
  (select public.app_tem_permissao('financeiro.relatorios', 'export'))
  and empresa_id in (
    select acesso.empresa_id
    from public.fin_usuario_empresas acesso
    where acesso.usuario_id = (select public.app_usuario_atual_id())
      and acesso.status = 'ativo'
  )
);
