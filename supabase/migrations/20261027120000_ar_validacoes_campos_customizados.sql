alter table public.ar_validacoes
  add column if not exists dados_adicionais jsonb not null default '{"campos": {}, "rotulos": {}, "tipos": {}}'::jsonb;

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
    dados_adicionais,
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
    case
      when jsonb_typeof(linha->'dados_adicionais') = 'object' then linha->'dados_adicionais'
      else '{"campos": {}, "rotulos": {}, "tipos": {}}'::jsonb
    end,
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
