create table if not exists public.ar_importacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('repasse')),
  mes_base date not null,
  nome_arquivo text,
  total_linhas integer not null default 0,
  total_importadas integer not null default 0,
  status text not null default 'importado' check (status in ('importado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo, mes_base)
);

alter table public.ar_validacoes
  add column if not exists importacao_id uuid references public.ar_importacoes(id) on delete set null,
  add column if not exists mes_base date,
  add column if not exists cod_vendedor text,
  add column if not exists nome_vendedor text,
  add column if not exists agente_validacao text,
  add column if not exists cod_produto text,
  add column if not exists status_pedido text,
  add column if not exists data_pedido date,
  add column if not exists data_verificacao date,
  add column if not exists data_emissao_renovacao date,
  add column if not exists cod_ac text,
  add column if not exists grupo_produto text,
  add column if not exists link_repasse text,
  add column if not exists valor_bruto numeric(12,2),
  add column if not exists valor_faturamento numeric(12,2);

create index if not exists ar_importacoes_tipo_mes_idx on public.ar_importacoes(tipo, mes_base);
create index if not exists ar_validacoes_importacao_idx on public.ar_validacoes(importacao_id);
create index if not exists ar_validacoes_mes_base_idx on public.ar_validacoes(mes_base);

alter table public.ar_importacoes enable row level security;

grant select, insert, update on table public.ar_importacoes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ar_importacoes' and policyname = 'ar_importacoes_authenticated_all'
  ) then
    create policy ar_importacoes_authenticated_all on public.ar_importacoes
      for all to authenticated using (true) with check (true);
  end if;
end $$;

create or replace function public.ar_importar_repasse(
  p_mes_base date,
  p_nome_arquivo text,
  p_linhas jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_importacao public.ar_importacoes;
  v_total integer;
begin
  if p_mes_base is null then
    raise exception 'Informe o mês-base do repasse.';
  end if;

  if p_linhas is null or jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) = 0 then
    raise exception 'Nenhuma linha válida para importar.';
  end if;

  if exists (
    select 1
    from public.ar_importacoes
    where tipo = 'repasse'
      and mes_base = date_trunc('month', p_mes_base)::date
      and status = 'importado'
  ) then
    raise exception 'Já existe importação de repasse para este mês-base.';
  end if;

  v_total := jsonb_array_length(p_linhas);

  insert into public.ar_importacoes (
    tipo,
    mes_base,
    nome_arquivo,
    total_linhas,
    total_importadas
  )
  values (
    'repasse',
    date_trunc('month', p_mes_base)::date,
    p_nome_arquivo,
    v_total,
    v_total
  )
  returning * into v_importacao;

  insert into public.ar_validacoes (
    importacao_id,
    mes_base,
    parceiro_nome,
    codigo_entidade,
    data_validacao,
    produto,
    pedido,
    nome_cliente,
    valor_tot_comiss,
    origem,
    status_pagamento,
    cod_vendedor,
    nome_vendedor,
    agente_validacao,
    cod_produto,
    status_pedido,
    data_pedido,
    data_verificacao,
    data_emissao_renovacao,
    cod_ac,
    grupo_produto,
    link_repasse,
    valor_bruto,
    valor_faturamento,
    observacao
  )
  select
    v_importacao.id,
    v_importacao.mes_base,
    linha->>'nome_vendedor',
    linha->>'codigo_entidade',
    coalesce(nullif(linha->>'data_validacao', '')::date, v_importacao.mes_base),
    linha->>'produto',
    linha->>'pedido',
    linha->>'nome_cliente',
    coalesce(nullif(linha->>'valor_tot_comiss', '')::numeric, 0),
    'importacao',
    'pendente',
    linha->>'cod_vendedor',
    linha->>'nome_vendedor',
    linha->>'agente_validacao',
    linha->>'cod_produto',
    linha->>'status_pedido',
    nullif(linha->>'data_pedido', '')::date,
    nullif(linha->>'data_verificacao', '')::date,
    nullif(linha->>'data_emissao_renovacao', '')::date,
    linha->>'cod_ac',
    linha->>'grupo_produto',
    linha->>'link_repasse',
    nullif(linha->>'valor_bruto', '')::numeric,
    nullif(linha->>'valor_faturamento', '')::numeric,
    'Importado via repasse: ' || coalesce(p_nome_arquivo, '')
  from jsonb_array_elements(p_linhas) as linha;

  return jsonb_build_object(
    'importacao_id', v_importacao.id,
    'mes_base', v_importacao.mes_base,
    'total_importadas', v_total
  );
end;
$$;

revoke execute on function public.ar_importar_repasse(date, text, jsonb) from public;
grant execute on function public.ar_importar_repasse(date, text, jsonb) to authenticated;
