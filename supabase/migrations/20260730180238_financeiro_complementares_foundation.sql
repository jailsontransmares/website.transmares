-- Financeiro / Fase 8: fundacao de recursos complementares.

insert into public.recursos_acesso (chave, nome, tipo, recurso_pai, rota, ordem, status)
values
  ('financeiro.complementares', 'Complementares', 'aba', 'financeiro', '/financeiro/configuracoes', 61, 'ativo'),
  ('financeiro.patrimonio', 'Patrimonio', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 62, 'ativo'),
  ('financeiro.estoque', 'Estoque', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 63, 'ativo'),
  ('financeiro.compras', 'Solicitacoes de compra', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 64, 'ativo'),
  ('financeiro.recibos', 'Recibos', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 65, 'ativo'),
  ('financeiro.alertas', 'Alertas', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 66, 'ativo'),
  ('financeiro.importacoes_especiais', 'Importacoes especiais', 'funcao', 'financeiro.complementares', '/financeiro/configuracoes', 67, 'ativo')
on conflict (chave) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    recurso_pai = excluded.recurso_pai,
    rota = excluded.rota,
    ordem = excluded.ordem,
    status = excluded.status,
    updated_at = now();

create table if not exists public.fin_patrimonios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  codigo text,
  nome text not null,
  tipo text not null,
  valor_aquisicao numeric(15,2) not null default 0,
  data_aquisicao date,
  status text not null default 'ativo',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_patrimonios_valor_check check (valor_aquisicao >= 0),
  constraint fin_patrimonios_status_check check (status in ('ativo', 'baixado', 'manutencao', 'arquivado'))
);

create unique index if not exists fin_patrimonios_empresa_codigo_idx
  on public.fin_patrimonios (empresa_id, codigo)
  where codigo is not null;
create index if not exists fin_patrimonios_empresa_status_idx on public.fin_patrimonios (empresa_id, status, nome);
create index if not exists fin_patrimonios_created_by_idx on public.fin_patrimonios (created_by);
create index if not exists fin_patrimonios_updated_by_idx on public.fin_patrimonios (updated_by);

create table if not exists public.fin_estoque_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  codigo text,
  nome text not null,
  unidade text not null default 'un',
  saldo_atual numeric(15,3) not null default 0,
  estoque_minimo numeric(15,3) not null default 0,
  status text not null default 'ativo',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_estoque_itens_saldos_check check (saldo_atual >= 0 and estoque_minimo >= 0),
  constraint fin_estoque_itens_status_check check (status in ('ativo', 'inativo', 'arquivado'))
);

create unique index if not exists fin_estoque_itens_empresa_codigo_idx
  on public.fin_estoque_itens (empresa_id, codigo)
  where codigo is not null;
create unique index if not exists fin_estoque_itens_id_empresa_id_unique_idx on public.fin_estoque_itens (id, empresa_id);
create index if not exists fin_estoque_itens_empresa_status_idx on public.fin_estoque_itens (empresa_id, status, nome);
create index if not exists fin_estoque_itens_created_by_idx on public.fin_estoque_itens (created_by);
create index if not exists fin_estoque_itens_updated_by_idx on public.fin_estoque_itens (updated_by);

create table if not exists public.fin_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  item_id uuid not null,
  tipo text not null,
  quantidade numeric(15,3) not null,
  data_movimento date not null default current_date,
  origem text,
  documento text,
  status text not null default 'confirmado',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_estoque_movimentos_item_empresa_fkey
    foreign key (item_id, empresa_id) references public.fin_estoque_itens(id, empresa_id) on delete restrict,
  constraint fin_estoque_movimentos_tipo_check check (tipo in ('entrada', 'saida', 'ajuste')),
  constraint fin_estoque_movimentos_quantidade_check check (quantidade > 0),
  constraint fin_estoque_movimentos_status_check check (status in ('confirmado', 'cancelado'))
);

create index if not exists fin_estoque_movimentos_item_empresa_idx on public.fin_estoque_movimentos (item_id, empresa_id);
create index if not exists fin_estoque_movimentos_empresa_data_idx on public.fin_estoque_movimentos (empresa_id, data_movimento desc);
create index if not exists fin_estoque_movimentos_created_by_idx on public.fin_estoque_movimentos (created_by);
create index if not exists fin_estoque_movimentos_updated_by_idx on public.fin_estoque_movimentos (updated_by);

create table if not exists public.fin_solicitacoes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  codigo text,
  solicitante_id uuid references public.usuarios(id) on delete set null,
  data_solicitacao date not null default current_date,
  justificativa text,
  valor_estimado numeric(15,2) not null default 0,
  status text not null default 'rascunho',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_solicitacoes_compra_valor_check check (valor_estimado >= 0),
  constraint fin_solicitacoes_compra_status_check check (status in ('rascunho', 'solicitada', 'aprovada', 'rejeitada', 'comprada', 'cancelada'))
);

create unique index if not exists fin_solicitacoes_compra_empresa_codigo_idx
  on public.fin_solicitacoes_compra (empresa_id, codigo)
  where codigo is not null;
create unique index if not exists fin_solicitacoes_compra_id_empresa_id_unique_idx on public.fin_solicitacoes_compra (id, empresa_id);
create index if not exists fin_solicitacoes_compra_empresa_status_idx on public.fin_solicitacoes_compra (empresa_id, status, data_solicitacao desc);
create index if not exists fin_solicitacoes_compra_solicitante_idx on public.fin_solicitacoes_compra (solicitante_id);
create index if not exists fin_solicitacoes_compra_created_by_idx on public.fin_solicitacoes_compra (created_by);
create index if not exists fin_solicitacoes_compra_updated_by_idx on public.fin_solicitacoes_compra (updated_by);

create table if not exists public.fin_solicitacao_compra_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  solicitacao_id uuid not null,
  descricao text not null,
  quantidade numeric(15,3) not null,
  valor_unitario_estimado numeric(15,2) not null default 0,
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_solicitacao_compra_itens_solicitacao_empresa_fkey
    foreign key (solicitacao_id, empresa_id) references public.fin_solicitacoes_compra(id, empresa_id) on delete cascade,
  constraint fin_solicitacao_compra_itens_quantidade_check check (quantidade > 0),
  constraint fin_solicitacao_compra_itens_valor_check check (valor_unitario_estimado >= 0)
);

create index if not exists fin_solicitacao_compra_itens_solicitacao_empresa_idx on public.fin_solicitacao_compra_itens (solicitacao_id, empresa_id);
create index if not exists fin_solicitacao_compra_itens_created_by_idx on public.fin_solicitacao_compra_itens (created_by);
create index if not exists fin_solicitacao_compra_itens_updated_by_idx on public.fin_solicitacao_compra_itens (updated_by);

create table if not exists public.fin_recibos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  lancamento_id uuid references public.fin_lancamentos(id) on delete set null,
  numero text,
  pessoa_nome text not null,
  descricao text not null,
  valor numeric(15,2) not null,
  data_recibo date not null default current_date,
  status text not null default 'emitido',
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_recibos_valor_check check (valor > 0),
  constraint fin_recibos_status_check check (status in ('rascunho', 'emitido', 'cancelado'))
);

create unique index if not exists fin_recibos_empresa_numero_idx
  on public.fin_recibos (empresa_id, numero)
  where numero is not null;
create index if not exists fin_recibos_empresa_status_idx on public.fin_recibos (empresa_id, status, data_recibo desc);
create index if not exists fin_recibos_lancamento_idx on public.fin_recibos (lancamento_id);
create index if not exists fin_recibos_created_by_idx on public.fin_recibos (created_by);
create index if not exists fin_recibos_updated_by_idx on public.fin_recibos (updated_by);

create table if not exists public.fin_alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.fin_empresas(id) on delete cascade,
  tipo text not null,
  severidade text not null default 'info',
  titulo text not null,
  mensagem text not null,
  referencia_tipo text,
  referencia_id uuid,
  status text not null default 'aberto',
  vencimento_em timestamptz,
  lido_em timestamptz,
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_alertas_severidade_check check (severidade in ('info', 'aviso', 'critico')),
  constraint fin_alertas_status_check check (status in ('aberto', 'lido', 'resolvido', 'arquivado'))
);

create index if not exists fin_alertas_empresa_status_idx on public.fin_alertas (empresa_id, status, severidade, created_at desc);
create index if not exists fin_alertas_created_by_idx on public.fin_alertas (created_by);
create index if not exists fin_alertas_updated_by_idx on public.fin_alertas (updated_by);

create table if not exists public.fin_importacoes_especiais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.fin_empresas(id) on delete restrict,
  tipo text not null,
  nome_arquivo text not null,
  arquivo_hash text not null,
  total_registros integer not null default 0,
  registros_processados integer not null default 0,
  status text not null default 'recebida',
  resultado jsonb not null default '{}'::jsonb,
  metadados jsonb not null default '{}'::jsonb,
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_importacoes_especiais_registros_check check (total_registros >= 0 and registros_processados >= 0),
  constraint fin_importacoes_especiais_status_check check (status in ('recebida', 'processando', 'processada', 'processada_com_alertas', 'erro', 'cancelada'))
);

create unique index if not exists fin_importacoes_especiais_empresa_hash_idx on public.fin_importacoes_especiais (empresa_id, arquivo_hash);
create index if not exists fin_importacoes_especiais_empresa_status_idx on public.fin_importacoes_especiais (empresa_id, status, created_at desc);
create index if not exists fin_importacoes_especiais_created_by_idx on public.fin_importacoes_especiais (created_by);
create index if not exists fin_importacoes_especiais_updated_by_idx on public.fin_importacoes_especiais (updated_by);

drop view if exists public.fin_complementares_resumo;
create view public.fin_complementares_resumo
with (security_invoker = true)
as
select
  empresa.id as empresa_id,
  (select count(*)::integer from public.fin_patrimonios item where item.empresa_id = empresa.id and item.status = 'ativo') as patrimonios_ativos,
  (select count(*)::integer from public.fin_estoque_itens item where item.empresa_id = empresa.id and item.status = 'ativo') as itens_estoque,
  (select count(*)::integer from public.fin_estoque_itens item where item.empresa_id = empresa.id and item.status = 'ativo' and item.saldo_atual <= item.estoque_minimo) as itens_estoque_baixo,
  (select count(*)::integer from public.fin_solicitacoes_compra item where item.empresa_id = empresa.id and item.status in ('solicitada', 'aprovada')) as compras_abertas,
  (select count(*)::integer from public.fin_recibos item where item.empresa_id = empresa.id and item.status = 'emitido') as recibos_emitidos,
  (select count(*)::integer from public.fin_alertas item where (item.empresa_id = empresa.id or item.empresa_id is null) and item.status = 'aberto') as alertas_abertos,
  (select count(*)::integer from public.fin_importacoes_especiais item where item.empresa_id = empresa.id and item.status in ('recebida', 'processando', 'processada_com_alertas', 'erro')) as importacoes_pendentes
from public.fin_empresas empresa
where empresa.status = 'ativo';

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_patrimonios',
    'fin_estoque_itens',
    'fin_estoque_movimentos',
    'fin_solicitacoes_compra',
    'fin_solicitacao_compra_itens',
    'fin_recibos',
    'fin_alertas',
    'fin_importacoes_especiais'
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

revoke all on table public.fin_complementares_resumo from anon;
revoke all on table public.fin_complementares_resumo from authenticated;
grant select on table public.fin_complementares_resumo to authenticated;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'fin_patrimonios',
    'fin_estoque_itens',
    'fin_estoque_movimentos',
    'fin_solicitacoes_compra',
    'fin_solicitacao_compra_itens',
    'fin_recibos',
    'fin_alertas',
    'fin_importacoes_especiais'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_tabela || '_select_financeiro_complementares', v_tabela);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''view''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''view''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_select_financeiro_complementares',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_insert_financeiro_complementares', v_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_insert_financeiro_complementares',
      v_tabela
    );

    execute format('drop policy if exists %I on public.%I', v_tabela || '_update_financeiro_complementares', v_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      ) with check (
        (
          (select public.app_tem_permissao(''financeiro.complementares'', ''edit''))
          or (select public.app_tem_permissao(''financeiro.configuracoes'', ''edit''))
        )
        and (
          empresa_id is null
          or empresa_id in (
            select acesso.empresa_id
            from public.fin_usuario_empresas acesso
            where acesso.usuario_id = (select public.app_usuario_atual_id())
              and acesso.status = ''ativo''
          )
        )
      )',
      v_tabela || '_update_financeiro_complementares',
      v_tabela
    );
  end loop;
end;
$$;
