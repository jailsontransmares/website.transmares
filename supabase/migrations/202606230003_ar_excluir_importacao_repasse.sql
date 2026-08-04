grant delete on table public.ar_validacoes to authenticated;
grant delete on table public.ar_importacoes to authenticated;

create or replace function public.ar_excluir_importacao_repasse(
  p_mes_base date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_importacao public.ar_importacoes;
  v_total integer;
  v_bloqueados integer;
begin
  if p_mes_base is null then
    raise exception 'Informe o mês-base do repasse.';
  end if;

  select *
    into v_importacao
  from public.ar_importacoes
  where tipo = 'repasse'
    and mes_base = date_trunc('month', p_mes_base)::date
    and status = 'importado'
  for update;

  if not found then
    raise exception 'Importação de repasse não encontrada para este mês-base.';
  end if;

  select count(*)
    into v_bloqueados
  from public.ar_validacoes
  where importacao_id = v_importacao.id
    and (
      status_pagamento <> 'pendente'
      or recibo_id is not null
      or data_pagamento is not null
    );

  if v_bloqueados > 0 then
    raise exception 'Não é possível excluir este mês-base porque existem lançamentos pagos ou vinculados a recibo.';
  end if;

  delete from public.ar_validacoes
  where importacao_id = v_importacao.id;

  get diagnostics v_total = row_count;

  delete from public.ar_importacoes
  where id = v_importacao.id;

  return jsonb_build_object(
    'mes_base', date_trunc('month', p_mes_base)::date,
    'total_excluidas', v_total
  );
end;
$$;

revoke execute on function public.ar_excluir_importacao_repasse(date) from public;
grant execute on function public.ar_excluir_importacao_repasse(date) to authenticated;
