-- Financeiro: area operacional de cartoes, compras, faturas e pagamentos.

create unique index if not exists fin_contas_id_empresa_id_unique_idx
  on public.fin_contas (id, empresa_id);

create unique index if not exists fin_lancamentos_id_empresa_id_unique_idx
  on public.fin_lancamentos (id, empresa_id);

create table if not exists public.fin_cartoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  conta_id uuid not null,
  nome text not null,
  bandeira text,
  tipo text not null default 'credito',
  limite_credito numeric(15,2) not null default 0,
  dia_fechamento integer not null default 1,
  dia_vencimento integer not null default 10,
  status text not null default 'ativo',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartoes_conta_empresa_fkey
    foreign key (conta_id, empresa_id) references public.fin_contas(id, empresa_id) on delete restrict,
  constraint fin_cartoes_empresa_nome_key unique (empresa_id, nome),
  constraint fin_cartoes_tipo_check check (tipo in ('credito', 'debito', 'beneficio', 'corporativo')),
  constraint fin_cartoes_limite_check check (limite_credito >= 0),
  constraint fin_cartoes_dias_check check (dia_fechamento between 1 and 31 and dia_vencimento between 1 and 31),
  constraint fin_cartoes_status_check check (status in ('ativo', 'inativo', 'cancelado', 'arquivado'))
);

create unique index if not exists fin_cartoes_id_empresa_id_unique_idx
  on public.fin_cartoes (id, empresa_id);
create index if not exists fin_cartoes_empresa_status_nome_idx
  on public.fin_cartoes (empresa_id, status, nome);
create index if not exists fin_cartoes_conta_empresa_idx on public.fin_cartoes (conta_id, empresa_id);
create index if not exists fin_cartoes_created_by_idx on public.fin_cartoes (created_by);
create index if not exists fin_cartoes_updated_by_idx on public.fin_cartoes (updated_by);

create table if not exists public.fin_cartao_faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  cartao_id uuid not null,
  competencia date not null,
  data_fechamento date not null,
  data_vencimento date not null,
  valor_total numeric(15,2) not null default 0,
  valor_pago numeric(15,2) not null default 0,
  status text not null default 'aberta',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartao_faturas_cartao_empresa_fkey
    foreign key (cartao_id, empresa_id) references public.fin_cartoes(id, empresa_id) on delete restrict,
  constraint fin_cartao_faturas_empresa_cartao_comp_key unique (empresa_id, cartao_id, competencia),
  constraint fin_cartao_faturas_competencia_check check (competencia = date_trunc('month', competencia)::date),
  constraint fin_cartao_faturas_datas_check check (data_vencimento >= data_fechamento),
  constraint fin_cartao_faturas_valores_check check (valor_total >= 0 and valor_pago >= 0),
  constraint fin_cartao_faturas_status_check check (status in ('aberta', 'fechada', 'paga', 'parcial', 'cancelada'))
);

create unique index if not exists fin_cartao_faturas_id_empresa_id_unique_idx
  on public.fin_cartao_faturas (id, empresa_id);
create index if not exists fin_cartao_faturas_empresa_status_venc_idx
  on public.fin_cartao_faturas (empresa_id, status, data_vencimento);
create index if not exists fin_cartao_faturas_cartao_empresa_idx on public.fin_cartao_faturas (cartao_id, empresa_id);
create index if not exists fin_cartao_faturas_created_by_idx on public.fin_cartao_faturas (created_by);
create index if not exists fin_cartao_faturas_updated_by_idx on public.fin_cartao_faturas (updated_by);

create table if not exists public.fin_cartao_compras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  cartao_id uuid not null,
  lancamento_id uuid,
  descricao text not null,
  estabelecimento text,
  data_compra date not null,
  valor_total numeric(15,2) not null,
  parcelas integer not null default 1,
  categoria_id uuid references public.fin_categorias(id) on delete restrict,
  centro_custo_id uuid references public.fin_centros_custo(id) on delete restrict,
  linha_negocio_id uuid references public.fin_linhas_negocio(id) on delete restrict,
  status text not null default 'ativa',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartao_compras_cartao_empresa_fkey
    foreign key (cartao_id, empresa_id) references public.fin_cartoes(id, empresa_id) on delete restrict,
  constraint fin_cartao_compras_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete restrict,
  constraint fin_cartao_compras_valor_check check (valor_total > 0),
  constraint fin_cartao_compras_parcelas_check check (parcelas between 1 and 60),
  constraint fin_cartao_compras_status_check check (status in ('ativa', 'faturada', 'cancelada', 'estornada'))
);

create unique index if not exists fin_cartao_compras_id_empresa_id_unique_idx
  on public.fin_cartao_compras (id, empresa_id);
create index if not exists fin_cartao_compras_empresa_status_data_idx
  on public.fin_cartao_compras (empresa_id, status, data_compra desc);
create index if not exists fin_cartao_compras_cartao_empresa_idx on public.fin_cartao_compras (cartao_id, empresa_id);
create index if not exists fin_cartao_compras_lancamento_empresa_idx on public.fin_cartao_compras (lancamento_id, empresa_id);
create index if not exists fin_cartao_compras_created_by_idx on public.fin_cartao_compras (created_by);
create index if not exists fin_cartao_compras_updated_by_idx on public.fin_cartao_compras (updated_by);

create table if not exists public.fin_cartao_parcelas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  compra_id uuid not null,
  fatura_id uuid,
  numero integer not null,
  total integer not null,
  valor numeric(15,2) not null,
  competencia date not null,
  data_vencimento date not null,
  status text not null default 'aberta',
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartao_parcelas_compra_empresa_fkey
    foreign key (compra_id, empresa_id) references public.fin_cartao_compras(id, empresa_id) on delete cascade,
  constraint fin_cartao_parcelas_fatura_empresa_fkey
    foreign key (fatura_id, empresa_id) references public.fin_cartao_faturas(id, empresa_id) on delete restrict,
  constraint fin_cartao_parcelas_key unique (empresa_id, compra_id, numero),
  constraint fin_cartao_parcelas_numero_check check (numero >= 1 and total >= numero),
  constraint fin_cartao_parcelas_valor_check check (valor > 0),
  constraint fin_cartao_parcelas_competencia_check check (competencia = date_trunc('month', competencia)::date),
  constraint fin_cartao_parcelas_status_check check (status in ('aberta', 'faturada', 'paga', 'cancelada', 'estornada'))
);

create index if not exists fin_cartao_parcelas_empresa_status_venc_idx
  on public.fin_cartao_parcelas (empresa_id, status, data_vencimento);
create index if not exists fin_cartao_parcelas_compra_empresa_idx on public.fin_cartao_parcelas (compra_id, empresa_id);
create index if not exists fin_cartao_parcelas_fatura_empresa_idx on public.fin_cartao_parcelas (fatura_id, empresa_id);
create index if not exists fin_cartao_parcelas_created_by_idx on public.fin_cartao_parcelas (created_by);
create index if not exists fin_cartao_parcelas_updated_by_idx on public.fin_cartao_parcelas (updated_by);

create table if not exists public.fin_cartao_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  fatura_id uuid not null,
  conta_id uuid,
  lancamento_id uuid,
  baixa_id uuid,
  data_pagamento date not null,
  valor numeric(15,2) not null,
  forma_pagamento text,
  status text not null default 'confirmado',
  observacoes text,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartao_pagamentos_fatura_empresa_fkey
    foreign key (fatura_id, empresa_id) references public.fin_cartao_faturas(id, empresa_id) on delete restrict,
  constraint fin_cartao_pagamentos_conta_empresa_fkey
    foreign key (conta_id, empresa_id) references public.fin_contas(id, empresa_id) on delete restrict,
  constraint fin_cartao_pagamentos_lancamento_empresa_fkey
    foreign key (lancamento_id, empresa_id) references public.fin_lancamentos(id, empresa_id) on delete restrict,
  constraint fin_cartao_pagamentos_valor_check check (valor > 0),
  constraint fin_cartao_pagamentos_status_check check (status in ('confirmado', 'estornado', 'cancelado'))
);

create index if not exists fin_cartao_pagamentos_empresa_status_data_idx
  on public.fin_cartao_pagamentos (empresa_id, status, data_pagamento desc);
create index if not exists fin_cartao_pagamentos_fatura_empresa_idx on public.fin_cartao_pagamentos (fatura_id, empresa_id);
create index if not exists fin_cartao_pagamentos_conta_empresa_idx on public.fin_cartao_pagamentos (conta_id, empresa_id);
create index if not exists fin_cartao_pagamentos_created_by_idx on public.fin_cartao_pagamentos (created_by);
create index if not exists fin_cartao_pagamentos_updated_by_idx on public.fin_cartao_pagamentos (updated_by);

drop view if exists public.fin_cartoes_resumo;
create view public.fin_cartoes_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  (
    select count(*)::integer
    from public.fin_cartoes cartao
    where cartao.empresa_id = empresa.id
      and cartao.status = 'ativo'
  ) as cartoes_ativos,
  (
    select count(*)::integer
    from public.fin_cartao_compras compra
    where compra.empresa_id = empresa.id
      and compra.status in ('ativa', 'faturada')
  ) as compras_ativas,
  (
    select count(*)::integer
    from public.fin_cartao_faturas fatura
    where fatura.empresa_id = empresa.id
      and fatura.status in ('aberta', 'fechada', 'parcial')
  ) as faturas_abertas,
  (
    select coalesce(sum(fatura.valor_total - fatura.valor_pago), 0)::numeric(15,2)
    from public.fin_cartao_faturas fatura
    where fatura.empresa_id = empresa.id
      and fatura.status in ('aberta', 'fechada', 'parcial')
  ) as valor_faturas_abertas,
  (
    select count(*)::integer
    from public.fin_cartao_parcelas parcela
    where parcela.empresa_id = empresa.id
      and parcela.status in ('aberta', 'faturada')
  ) as parcelas_pendentes,
  (
    select count(*)::integer
    from public.fin_cartao_pagamentos pagamento
    where pagamento.empresa_id = empresa.id
      and pagamento.status = 'confirmado'
  ) as pagamentos_confirmados
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_cartoes',
    'fin_cartao_compras',
    'fin_cartao_parcelas',
    'fin_cartao_faturas',
    'fin_cartao_pagamentos'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_tabela);
    execute format('revoke all on table public.%I from anon', v_tabela);
    execute format('revoke all on table public.%I from authenticated', v_tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_prepare_update', v_tabela);
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.fin_preparar_atualizacao()', v_tabela || '_prepare_update', v_tabela);
    execute format('drop trigger if exists %I on public.%I', v_tabela || '_audit', v_tabela);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.fin_auditar_linha()', v_tabela || '_audit', v_tabela);
  end loop;
end;
$$;

grant select on public.fin_cartoes_resumo to authenticated;
revoke all on public.fin_cartoes_resumo from anon;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_cartoes',
    'fin_cartao_compras',
    'fin_cartao_parcelas',
    'fin_cartao_faturas',
    'fin_cartao_pagamentos'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_cartoes', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (select public.app_tem_permissao(''financeiro.cartoes'', ''view''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_select_financeiro_cartoes',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_cartoes', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (select public.app_tem_permissao(''financeiro.cartoes'', ''create''))
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_insert_financeiro_cartoes',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_cartoes', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.cartoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.cartoes'', ''cancel''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.cartoes'', ''update''))
          or (select public.app_tem_permissao(''financeiro.cartoes'', ''cancel''))
        )
        and empresa_id in (
          select acesso.empresa_id
          from public.fin_usuario_empresas acesso
          where acesso.usuario_id = (select public.app_usuario_atual_id())
            and acesso.status = ''ativo''
        )
      )',
      v_tabela || '_update_financeiro_cartoes',
      v_tabela
    );
  end loop;
end;
$$;
