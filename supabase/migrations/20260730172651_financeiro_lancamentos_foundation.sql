-- Financeiro / Fase 5: fundacao do motor de lancamentos.
-- Cria estruturas operacionais sem backfill e sem dados ficticios.

create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  pessoa_id uuid references public.cad_pessoas(id) on delete restrict,
  conta_id uuid references public.fin_contas(id) on delete restrict,
  categoria_id uuid references public.fin_categorias(id) on delete restrict,
  centro_custo_id uuid references public.fin_centros_custo(id) on delete restrict,
  linha_negocio_id uuid references public.fin_linhas_negocio(id) on delete restrict,
  contrato_id uuid references public.fin_contratos(id) on delete restrict,
  lancamento_pai_id uuid references public.fin_lancamentos(id) on delete restrict,
  idempotency_key text,
  natureza text not null,
  tipo text not null,
  descricao text not null,
  valor_total numeric(15,2) not null,
  data_emissao date,
  data_competencia date not null,
  data_vencimento date not null,
  forma_pagamento text,
  dados_pagamento jsonb not null default '{}'::jsonb,
  observacoes text,
  status text not null default 'aberto',
  motivo_status text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamentos_natureza_check check (natureza in ('entrada', 'saida', 'transferencia')),
  constraint fin_lancamentos_tipo_check check (tipo in ('receita', 'despesa', 'conta_receber', 'conta_pagar', 'transferencia', 'provisao', 'recorrencia', 'parcelamento', 'emprestimo', 'tributo', 'folha_beneficio')),
  constraint fin_lancamentos_valor_check check (valor_total > 0),
  constraint fin_lancamentos_competencia_check check (data_competencia = date_trunc('month', data_competencia)::date),
  constraint fin_lancamentos_status_check check (status in ('rascunho', 'aberto', 'parcial', 'liquidado', 'cancelado', 'estornado', 'arquivado')),
  constraint fin_lancamentos_transferencia_check check (
    (tipo = 'transferencia' and natureza = 'transferencia')
    or (tipo <> 'transferencia' and natureza in ('entrada', 'saida'))
  )
);

create unique index if not exists fin_lancamentos_empresa_idempotency_key_idx
  on public.fin_lancamentos (empresa_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists fin_lancamentos_id_empresa_id_unique_idx
  on public.fin_lancamentos (id, empresa_id);

create index if not exists fin_lancamentos_empresa_status_vencimento_idx
  on public.fin_lancamentos (empresa_id, status, data_vencimento);

create index if not exists fin_lancamentos_empresa_competencia_idx
  on public.fin_lancamentos (empresa_id, data_competencia, natureza);

create index if not exists fin_lancamentos_pessoa_idx on public.fin_lancamentos (pessoa_id);
create index if not exists fin_lancamentos_conta_idx on public.fin_lancamentos (conta_id);
create index if not exists fin_lancamentos_categoria_idx on public.fin_lancamentos (categoria_id);
create index if not exists fin_lancamentos_centro_custo_idx on public.fin_lancamentos (centro_custo_id);
create index if not exists fin_lancamentos_linha_negocio_idx on public.fin_lancamentos (linha_negocio_id);
create index if not exists fin_lancamentos_contrato_idx on public.fin_lancamentos (contrato_id);
create index if not exists fin_lancamentos_pai_idx on public.fin_lancamentos (lancamento_pai_id);
create index if not exists fin_lancamentos_created_by_idx on public.fin_lancamentos (created_by);
create index if not exists fin_lancamentos_updated_by_idx on public.fin_lancamentos (updated_by);

create table if not exists public.fin_lancamento_parcelas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  lancamento_id uuid not null,
  numero integer not null,
  total integer not null,
  valor numeric(15,2) not null,
  data_vencimento date not null,
  status text not null default 'aberta',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamento_parcelas_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete cascade,
  constraint fin_lancamento_parcelas_key unique (empresa_id, lancamento_id, numero),
  constraint fin_lancamento_parcelas_numero_check check (numero >= 1 and total >= numero),
  constraint fin_lancamento_parcelas_valor_check check (valor > 0),
  constraint fin_lancamento_parcelas_status_check check (status in ('aberta', 'parcial', 'liquidada', 'cancelada', 'estornada'))
);

create index if not exists fin_lancamento_parcelas_lancamento_empresa_idx
  on public.fin_lancamento_parcelas (lancamento_id, empresa_id);

create index if not exists fin_lancamento_parcelas_empresa_status_vencimento_idx
  on public.fin_lancamento_parcelas (empresa_id, status, data_vencimento);

create index if not exists fin_lancamento_parcelas_created_by_idx on public.fin_lancamento_parcelas (created_by);
create index if not exists fin_lancamento_parcelas_updated_by_idx on public.fin_lancamento_parcelas (updated_by);

create table if not exists public.fin_lancamento_rateios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  lancamento_id uuid not null,
  categoria_id uuid references public.fin_categorias(id) on delete restrict,
  centro_custo_id uuid references public.fin_centros_custo(id) on delete restrict,
  linha_negocio_id uuid references public.fin_linhas_negocio(id) on delete restrict,
  percentual numeric(7,4),
  valor numeric(15,2) not null,
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamento_rateios_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete cascade,
  constraint fin_lancamento_rateios_valor_check check (valor > 0),
  constraint fin_lancamento_rateios_percentual_check check (percentual is null or (percentual > 0 and percentual <= 100))
);

create index if not exists fin_lancamento_rateios_lancamento_empresa_idx
  on public.fin_lancamento_rateios (lancamento_id, empresa_id);

create index if not exists fin_lancamento_rateios_categoria_idx on public.fin_lancamento_rateios (categoria_id);
create index if not exists fin_lancamento_rateios_centro_custo_idx on public.fin_lancamento_rateios (centro_custo_id);
create index if not exists fin_lancamento_rateios_linha_negocio_idx on public.fin_lancamento_rateios (linha_negocio_id);
create index if not exists fin_lancamento_rateios_created_by_idx on public.fin_lancamento_rateios (created_by);
create index if not exists fin_lancamento_rateios_updated_by_idx on public.fin_lancamento_rateios (updated_by);

create table if not exists public.fin_lancamento_baixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  lancamento_id uuid not null,
  parcela_id uuid references public.fin_lancamento_parcelas(id) on delete restrict,
  conta_id uuid references public.fin_contas(id) on delete restrict,
  idempotency_key text,
  data_baixa date not null,
  valor_principal numeric(15,2) not null,
  juros numeric(15,2) not null default 0,
  multa numeric(15,2) not null default 0,
  desconto numeric(15,2) not null default 0,
  outros_ajustes numeric(15,2) not null default 0,
  valor_total numeric(15,2) generated always as (valor_principal + juros + multa - desconto + outros_ajustes) stored,
  forma_pagamento text,
  justificativa text,
  status text not null default 'confirmada',
  estorno_de_baixa_id uuid references public.fin_lancamento_baixas(id) on delete restrict,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamento_baixas_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete restrict,
  constraint fin_lancamento_baixas_valores_check check (valor_principal > 0 and juros >= 0 and multa >= 0 and desconto >= 0),
  constraint fin_lancamento_baixas_total_check check (valor_total > 0),
  constraint fin_lancamento_baixas_status_check check (status in ('confirmada', 'estornada', 'cancelada'))
);

create unique index if not exists fin_lancamento_baixas_empresa_idempotency_key_idx
  on public.fin_lancamento_baixas (empresa_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists fin_lancamento_baixas_lancamento_empresa_idx
  on public.fin_lancamento_baixas (lancamento_id, empresa_id);

create index if not exists fin_lancamento_baixas_parcela_idx on public.fin_lancamento_baixas (parcela_id);
create index if not exists fin_lancamento_baixas_conta_idx on public.fin_lancamento_baixas (conta_id);
create index if not exists fin_lancamento_baixas_estorno_idx on public.fin_lancamento_baixas (estorno_de_baixa_id);
create index if not exists fin_lancamento_baixas_created_by_idx on public.fin_lancamento_baixas (created_by);
create index if not exists fin_lancamento_baixas_updated_by_idx on public.fin_lancamento_baixas (updated_by);

create table if not exists public.fin_lancamento_status_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  lancamento_id uuid not null,
  status_anterior text,
  status_novo text not null,
  motivo text,
  contexto jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint fin_lancamento_status_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete cascade
);

create index if not exists fin_lancamento_status_lancamento_empresa_idx
  on public.fin_lancamento_status_historico (lancamento_id, empresa_id);

create index if not exists fin_lancamento_status_created_by_idx on public.fin_lancamento_status_historico (created_by);

create table if not exists public.fin_lancamento_recorrencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  lancamento_modelo_id uuid references public.fin_lancamentos(id) on delete restrict,
  periodicidade text not null,
  data_inicio date not null,
  data_fim date,
  proxima_geracao date,
  status text not null default 'ativa',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamento_recorrencias_periodo_check check (data_fim is null or data_fim >= data_inicio),
  constraint fin_lancamento_recorrencias_periodicidade_check check (periodicidade in ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  constraint fin_lancamento_recorrencias_status_check check (status in ('ativa', 'pausada', 'encerrada', 'cancelada'))
);

create index if not exists fin_lancamento_recorrencias_empresa_status_idx
  on public.fin_lancamento_recorrencias (empresa_id, status, proxima_geracao);

create index if not exists fin_lancamento_recorrencias_modelo_idx on public.fin_lancamento_recorrencias (lancamento_modelo_id);
create index if not exists fin_lancamento_recorrencias_created_by_idx on public.fin_lancamento_recorrencias (created_by);
create index if not exists fin_lancamento_recorrencias_updated_by_idx on public.fin_lancamento_recorrencias (updated_by);

create or replace function private.fin_registrar_status_lancamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.fin_lancamento_status_historico (
      empresa_id,
      lancamento_id,
      status_anterior,
      status_novo,
      motivo,
      contexto,
      created_by
    )
    values (
      new.empresa_id,
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      new.motivo_status,
      jsonb_build_object('origem', 'trigger'),
      public.app_usuario_atual_id()
    );
  end if;

  return new;
end;
$$;

revoke all on function private.fin_registrar_status_lancamento() from public;
revoke all on function private.fin_registrar_status_lancamento() from anon;
revoke all on function private.fin_registrar_status_lancamento() from authenticated;

drop trigger if exists fin_lancamentos_status_history on public.fin_lancamentos;
create trigger fin_lancamentos_status_history
after insert or update of status on public.fin_lancamentos
for each row execute function private.fin_registrar_status_lancamento();

drop view if exists public.fin_lancamentos_resumo;
create view public.fin_lancamentos_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  count(lancamento.id)::integer as total_lancamentos,
  count(lancamento.id) filter (where lancamento.status in ('aberto', 'parcial'))::integer as em_aberto,
  count(lancamento.id) filter (where lancamento.status = 'liquidado')::integer as liquidados,
  count(lancamento.id) filter (where lancamento.status = 'cancelado')::integer as cancelados,
  coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'entrada' and lancamento.status in ('aberto', 'parcial')), 0)::numeric(15,2) as valor_entradas_abertas,
  coalesce(sum(lancamento.valor_total) filter (where lancamento.natureza = 'saida' and lancamento.status in ('aberto', 'parcial')), 0)::numeric(15,2) as valor_saidas_abertas,
  count(parcela.id) filter (where parcela.status in ('aberta', 'parcial') and parcela.data_vencimento < current_date)::integer as parcelas_vencidas,
  count(baixa.id) filter (where baixa.status = 'confirmada')::integer as baixas_confirmadas
from public.fin_empresas empresa
left join public.fin_lancamentos lancamento on lancamento.empresa_id = empresa.id
left join public.fin_lancamento_parcelas parcela on parcela.empresa_id = empresa.id and parcela.lancamento_id = lancamento.id
left join public.fin_lancamento_baixas baixa on baixa.empresa_id = empresa.id and baixa.lancamento_id = lancamento.id
where empresa.status = 'ativo'
group by empresa.id;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_rateios',
    'fin_lancamento_baixas',
    'fin_lancamento_status_historico',
    'fin_lancamento_recorrencias'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('revoke all on table public.%I from authenticated', v_tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_prepare_update', v_tabela);
    if v_tabela <> 'fin_lancamento_status_historico' then
      execute format('create trigger %I before update on public.%I for each row execute function private.fin_preparar_atualizacao()', v_tabela || '_prepare_update', v_tabela);
    end if;
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_audit', v_tabela);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.fin_auditar_linha()', v_tabela || '_audit', v_tabela);
  end loop;
end;
$$;

grant select on public.fin_lancamentos_resumo to authenticated;
revoke all on public.fin_lancamentos_resumo from anon;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_lancamentos',
    'fin_lancamento_parcelas',
    'fin_lancamento_rateios',
    'fin_lancamento_baixas',
    'fin_lancamento_status_historico',
    'fin_lancamento_recorrencias'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_lancamentos', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (select public.app_tem_permissao(''financeiro.lancamentos'', ''view''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_lancamentos',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_lancamentos', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (select public.app_tem_permissao(''financeiro.lancamentos'', ''create''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_lancamentos',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_lancamentos', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (select public.app_tem_permissao(''financeiro.lancamentos'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (select public.app_tem_permissao(''financeiro.lancamentos'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_lancamentos',
      v_tabela
    );
  end loop;
end;
$$;
