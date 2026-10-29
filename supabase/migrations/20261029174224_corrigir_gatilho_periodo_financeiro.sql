create or replace function private.fin_bloquear_periodo_fechado()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_linha jsonb;
  v_empresa_id uuid;
  v_data date;
begin
  v_linha := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_empresa_id := (v_linha ->> 'empresa_id')::uuid;
  v_data := case tg_table_name
    when 'fin_lancamentos' then (v_linha ->> 'data_competencia')::date
    when 'fin_lancamento_parcelas' then (v_linha ->> 'data_vencimento')::date
    when 'fin_lancamento_baixas' then (v_linha ->> 'data_baixa')::date
    else null
  end;

  if v_data is not null and exists (
    select 1 from public.fin_fechamento_periodos periodo
    where periodo.empresa_id = v_empresa_id
      and periodo.status = 'fechado'
      and v_data between periodo.periodo_inicio and periodo.periodo_fim
  ) then
    raise exception 'Periodo financeiro fechado para alteracoes.' using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
