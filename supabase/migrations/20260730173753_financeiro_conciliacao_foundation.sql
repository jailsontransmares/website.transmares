-- Financeiro / Fase 6: fundacao de conciliacao bancaria.
-- Estrutura para importacoes, movimentos, sugestoes e conciliacoes.

create unique index if not exists fin_contas_id_empresa_id_unique_idx
  on public.fin_contas (id, empresa_id);

create unique index if not exists fin_lancamento_parcelas_id_empresa_id_unique_idx
  on public.fin_lancamento_parcelas (id, empresa_id);

create unique index if not exists fin_lancamento_baixas_id_empresa_id_unique_idx
  on public.fin_lancamento_baixas (id, empresa_id);

create table if not exists public.fin_extrato_importacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  conta_id uuid not null,
  formato text not null,
  nome_arquivo text not null,
  arquivo_hash text not null,
  periodo_inicio date,
  periodo_fim date,
  total_movimentos integer not null default 0,
  total_creditos numeric(15,2) not null default 0,
  total_debitos numeric(15,2) not null default 0,
  status text not null default 'importado',
  mensagem_erro text,
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_extrato_importacoes_formato_check check (formato in ('ofx', 'csv')),
  constraint fin_extrato_importacoes_conta_empresa_fkey
    foreign key (conta_id, empresa_id) references public.fin_contas(id, empresa_id) on delete restrict,
  constraint fin_extrato_importacoes_periodo_check check (periodo_fim is null or periodo_inicio is null or periodo_fim >= periodo_inicio),
  constraint fin_extrato_importacoes_totais_check check (total_movimentos >= 0 and total_creditos >= 0 and total_debitos >= 0),
  constraint fin_extrato_importacoes_status_check check (status in ('importado', 'processado', 'processado_com_alertas', 'cancelado', 'erro'))
);

create unique index if not exists fin_extrato_importacoes_empresa_conta_hash_idx
  on public.fin_extrato_importacoes (empresa_id, conta_id, arquivo_hash);

create unique index if not exists fin_extrato_importacoes_id_empresa_id_unique_idx
  on public.fin_extrato_importacoes (id, empresa_id);

create index if not exists fin_extrato_importacoes_empresa_status_idx
  on public.fin_extrato_importacoes (empresa_id, status, created_at desc);

create index if not exists fin_extrato_importacoes_conta_empresa_idx on public.fin_extrato_importacoes (conta_id, empresa_id);
create index if not exists fin_extrato_importacoes_created_by_idx on public.fin_extrato_importacoes (created_by);
create index if not exists fin_extrato_importacoes_updated_by_idx on public.fin_extrato_importacoes (updated_by);

create table if not exists public.fin_movimentos_bancarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  importacao_id uuid not null,
  conta_id uuid not null,
  movimento_hash text not null,
  data_movimento date not null,
  data_contabil date,
  descricao text not null,
  documento text,
  valor numeric(15,2) not null,
  tipo text not null,
  saldo_apos numeric(15,2),
  status text not null default 'pendente',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_movimentos_bancarios_importacao_empresa_fkey
    foreign key (importacao_id, empresa_id) references public.fin_extrato_importacoes(id, empresa_id) on delete cascade,
  constraint fin_movimentos_bancarios_conta_empresa_fkey
    foreign key (conta_id, empresa_id) references public.fin_contas(id, empresa_id) on delete restrict,
  constraint fin_movimentos_bancarios_valor_check check (valor <> 0),
  constraint fin_movimentos_bancarios_tipo_check check (tipo in ('credito', 'debito')),
  constraint fin_movimentos_bancarios_sinal_check check (
    (tipo = 'credito' and valor > 0)
    or (tipo = 'debito' and valor < 0)
  ),
  constraint fin_movimentos_bancarios_status_check check (status in ('pendente', 'sugerido', 'conciliado', 'ignorado', 'cancelado'))
);

create unique index if not exists fin_movimentos_bancarios_empresa_conta_hash_idx
  on public.fin_movimentos_bancarios (empresa_id, conta_id, movimento_hash);

create unique index if not exists fin_movimentos_bancarios_id_empresa_id_unique_idx
  on public.fin_movimentos_bancarios (id, empresa_id);

create index if not exists fin_movimentos_bancarios_importacao_empresa_idx
  on public.fin_movimentos_bancarios (importacao_id, empresa_id);

create index if not exists fin_movimentos_bancarios_empresa_status_data_idx
  on public.fin_movimentos_bancarios (empresa_id, status, data_movimento desc);

create index if not exists fin_movimentos_bancarios_conta_empresa_idx on public.fin_movimentos_bancarios (conta_id, empresa_id);
create index if not exists fin_movimentos_bancarios_created_by_idx on public.fin_movimentos_bancarios (created_by);
create index if not exists fin_movimentos_bancarios_updated_by_idx on public.fin_movimentos_bancarios (updated_by);

create table if not exists public.fin_conciliacao_sugestoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  movimento_id uuid not null,
  lancamento_id uuid,
  parcela_id uuid,
  score numeric(6,4) not null,
  criterios jsonb not null default '{}'::jsonb,
  status text not null default 'pendente',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_conciliacao_sugestoes_movimento_empresa_fkey
    foreign key (movimento_id, empresa_id) references public.fin_movimentos_bancarios(id, empresa_id) on delete cascade,
  constraint fin_conciliacao_sugestoes_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete cascade,
  constraint fin_conciliacao_sugestoes_parcela_empresa_fkey
    foreign key (parcela_id, empresa_id) references public.fin_lancamento_parcelas(id, empresa_id) on delete cascade,
  constraint fin_conciliacao_sugestoes_alvo_check check (lancamento_id is not null or parcela_id is not null),
  constraint fin_conciliacao_sugestoes_score_check check (score >= 0 and score <= 1),
  constraint fin_conciliacao_sugestoes_status_check check (status in ('pendente', 'aceita', 'rejeitada', 'expirada'))
);

create index if not exists fin_conciliacao_sugestoes_movimento_empresa_idx
  on public.fin_conciliacao_sugestoes (movimento_id, empresa_id);

create index if not exists fin_conciliacao_sugestoes_lancamento_empresa_idx on public.fin_conciliacao_sugestoes (lancamento_id, empresa_id);
create index if not exists fin_conciliacao_sugestoes_parcela_empresa_idx on public.fin_conciliacao_sugestoes (parcela_id, empresa_id);
create index if not exists fin_conciliacao_sugestoes_empresa_status_score_idx
  on public.fin_conciliacao_sugestoes (empresa_id, status, score desc);
create index if not exists fin_conciliacao_sugestoes_created_by_idx on public.fin_conciliacao_sugestoes (created_by);
create index if not exists fin_conciliacao_sugestoes_updated_by_idx on public.fin_conciliacao_sugestoes (updated_by);

create table if not exists public.fin_conciliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  movimento_id uuid not null,
  lancamento_id uuid not null,
  parcela_id uuid,
  baixa_id uuid,
  tipo_vinculo text not null default 'manual',
  valor_conciliado numeric(15,2) not null,
  data_conciliacao date not null default current_date,
  status text not null default 'conciliada',
  motivo_desconciliacao text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_conciliacoes_movimento_empresa_fkey
    foreign key (movimento_id, empresa_id) references public.fin_movimentos_bancarios(id, empresa_id) on delete restrict,
  constraint fin_conciliacoes_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete restrict,
  constraint fin_conciliacoes_parcela_empresa_fkey
    foreign key (parcela_id, empresa_id) references public.fin_lancamento_parcelas(id, empresa_id) on delete restrict,
  constraint fin_conciliacoes_baixa_empresa_fkey
    foreign key (baixa_id, empresa_id) references public.fin_lancamento_baixas(id, empresa_id) on delete restrict,
  constraint fin_conciliacoes_valor_check check (valor_conciliado > 0),
  constraint fin_conciliacoes_tipo_check check (tipo_vinculo in ('manual', 'sugestao', 'lote')),
  constraint fin_conciliacoes_status_check check (status in ('conciliada', 'desconciliada', 'cancelada'))
);

create index if not exists fin_conciliacoes_movimento_empresa_idx
  on public.fin_conciliacoes (movimento_id, empresa_id);

create index if not exists fin_conciliacoes_lancamento_empresa_idx on public.fin_conciliacoes (lancamento_id, empresa_id);
create index if not exists fin_conciliacoes_parcela_empresa_idx on public.fin_conciliacoes (parcela_id, empresa_id);
create index if not exists fin_conciliacoes_baixa_empresa_idx on public.fin_conciliacoes (baixa_id, empresa_id);
create index if not exists fin_conciliacoes_empresa_status_data_idx
  on public.fin_conciliacoes (empresa_id, status, data_conciliacao desc);
create index if not exists fin_conciliacoes_created_by_idx on public.fin_conciliacoes (created_by);
create index if not exists fin_conciliacoes_updated_by_idx on public.fin_conciliacoes (updated_by);

drop view if exists public.fin_conciliacao_resumo;
create view public.fin_conciliacao_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  (
    select count(*)::integer
    from public.fin_extrato_importacoes importacao
    where importacao.empresa_id = empresa.id
  ) as importacoes,
  (
    select count(*)::integer
    from public.fin_movimentos_bancarios movimento
    where movimento.empresa_id = empresa.id
  ) as movimentos,
  (
    select count(*)::integer
    from public.fin_movimentos_bancarios movimento
    where movimento.empresa_id = empresa.id
      and movimento.status = 'pendente'
  ) as pendentes,
  (
    select count(*)::integer
    from public.fin_movimentos_bancarios movimento
    where movimento.empresa_id = empresa.id
      and movimento.status = 'sugerido'
  ) as sugeridos,
  (
    select count(*)::integer
    from public.fin_movimentos_bancarios movimento
    where movimento.empresa_id = empresa.id
      and movimento.status = 'conciliado'
  ) as conciliados,
  (
    select count(*)::integer
    from public.fin_conciliacao_sugestoes sugestao
    where sugestao.empresa_id = empresa.id
      and sugestao.status = 'pendente'
  ) as sugestoes_pendentes,
  (
    select count(*)::integer
    from public.fin_conciliacoes conciliacao
    where conciliacao.empresa_id = empresa.id
      and conciliacao.status = 'conciliada'
  ) as conciliacoes_confirmadas
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_extrato_importacoes',
    'fin_movimentos_bancarios',
    'fin_conciliacao_sugestoes',
    'fin_conciliacoes'
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

grant select on public.fin_conciliacao_resumo to authenticated;
revoke all on public.fin_conciliacao_resumo from anon;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_extrato_importacoes',
    'fin_movimentos_bancarios',
    'fin_conciliacao_sugestoes',
    'fin_conciliacoes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_conciliacao', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (select public.app_tem_permissao(''financeiro.conciliacao'', ''view''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_conciliacao',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_conciliacao', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (select public.app_tem_permissao(''financeiro.conciliacao'', ''create''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_conciliacao',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_conciliacao', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (select public.app_tem_permissao(''financeiro.conciliacao'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (select public.app_tem_permissao(''financeiro.conciliacao'', ''edit''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_conciliacao',
      v_tabela
    );
  end loop;
end;
$$;
