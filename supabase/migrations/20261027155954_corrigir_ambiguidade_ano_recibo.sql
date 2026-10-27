create or replace function public.ar_proximo_numero_recibo(
  p_ano integer default extract(year from current_date)::integer
)
returns table(numero text, ano integer, sequencial integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ano integer;
  v_sequencial integer;
begin
  insert into public.ar_recibo_sequencias as seq (ano, ultimo_numero, updated_at)
  values (p_ano, 1, now())
  on conflict on constraint ar_recibo_sequencias_pkey
  do update set ultimo_numero = seq.ultimo_numero + 1, updated_at = now()
  returning seq.ano, seq.ultimo_numero
  into v_ano, v_sequencial;

  ano := v_ano;
  sequencial := v_sequencial;
  numero := 'REC-' || v_ano::text || '-' || lpad(v_sequencial::text, 4, '0');
  return next;
end;
$$;
