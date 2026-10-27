alter table public.ar_recibos
  add column if not exists cod_vendedor text;

-- Recupera o código correto nos recibos já emitidos a partir dos lançamentos
-- vinculados. codigo_entidade permanece separado como código da entidade.
with codigos_vendedor as (
  select
    item.recibo_id,
    max(nullif(btrim(validacao.cod_vendedor), '')) as cod_vendedor
  from public.ar_recibo_itens as item
  join public.ar_validacoes as validacao on validacao.id = item.validacao_id
  group by item.recibo_id
)
update public.ar_recibos as recibo
set cod_vendedor = codigos_vendedor.cod_vendedor
from codigos_vendedor
where recibo.id = codigos_vendedor.recibo_id
  and nullif(btrim(recibo.cod_vendedor), '') is null
  and codigos_vendedor.cod_vendedor is not null;

create or replace function public.ar_emitir_recibo(
  p_parceiro_id uuid,
  p_validacao_ids uuid[],
  p_observacao text default null
)
returns public.ar_recibos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ano integer := extract(year from current_date)::integer;
  v_numero text;
  v_sequencial integer;
  v_recibo public.ar_recibos;
  v_total numeric(12,2);
  v_count integer;
  v_parceiro_count integer;
  v_parceiro_nome text;
  v_codigo_entidade text;
  v_cod_vendedor text;
begin
  if p_validacao_ids is null or array_length(p_validacao_ids, 1) is null then
    raise exception 'Selecione ao menos um lançamento para emitir o recibo.';
  end if;

  with selecionadas as (
    select *
    from public.ar_validacoes
    where id = any(p_validacao_ids)
      and status_pagamento = 'pendente'
      and (p_parceiro_id is null or parceiro_id = p_parceiro_id)
    for update
  )
  select
    count(*),
    count(distinct coalesce(parceiro_id::text, cod_vendedor, parceiro_nome, codigo_entidade)),
    coalesce(sum(valor_tot_comiss), 0),
    max(parceiro_nome),
    max(codigo_entidade),
    max(nullif(btrim(cod_vendedor), ''))
  into
    v_count,
    v_parceiro_count,
    v_total,
    v_parceiro_nome,
    v_codigo_entidade,
    v_cod_vendedor
  from selecionadas;

  if v_count <> array_length(p_validacao_ids, 1) then
    raise exception 'Um ou mais lançamentos selecionados não estão pendentes.';
  end if;

  if v_parceiro_count <> 1 then
    raise exception 'Selecione lançamentos de um único parceiro para emitir o recibo.';
  end if;

  select seq.numero, seq.sequencial
    into v_numero, v_sequencial
  from public.ar_proximo_numero_recibo(v_ano) as seq;

  insert into public.ar_recibos (
    numero,
    ano,
    sequencial,
    parceiro_id,
    parceiro_nome,
    codigo_entidade,
    cod_vendedor,
    valor_total,
    observacao
  )
  values (
    v_numero,
    v_ano,
    v_sequencial,
    p_parceiro_id,
    v_parceiro_nome,
    v_codigo_entidade,
    v_cod_vendedor,
    v_total,
    p_observacao
  )
  returning * into v_recibo;

  insert into public.ar_recibo_itens (recibo_id, validacao_id, descricao, valor_tot_comiss)
  select
    v_recibo.id,
    validacao.id,
    concat_ws(' | ', validacao.produto, validacao.pedido, validacao.nome_cliente),
    validacao.valor_tot_comiss
  from public.ar_validacoes as validacao
  where validacao.id = any(p_validacao_ids);

  update public.ar_validacoes
  set status_pagamento = 'pago',
      recibo_id = v_recibo.id,
      data_pagamento = now(),
      updated_at = now()
  where id = any(p_validacao_ids);

  return v_recibo;
end;
$$;
