create extension if not exists pgcrypto;

create table if not exists public.ar_recibo_sequencias (
  ano integer primary key,
  ultimo_numero integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_recibos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  ano integer not null,
  sequencial integer not null,
  parceiro_id uuid,
  parceiro_nome text,
  codigo_entidade text,
  valor_total numeric(12,2) not null default 0,
  status text not null default 'emitido' check (status in ('emitido', 'cancelado')),
  observacao text,
  data_emissao timestamptz not null default now(),
  data_cancelamento timestamptz,
  motivo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_validacoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid,
  parceiro_nome text,
  codigo_entidade text,
  data_validacao date not null default current_date,
  produto text,
  pedido text,
  nome_cliente text,
  valor_tot_comiss numeric(12,2) not null default 0,
  origem text not null default 'importacao' check (origem in ('importacao', 'manual')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente', 'pago')),
  recibo_id uuid references public.ar_recibos(id) on delete set null,
  data_pagamento timestamptz,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_recibo_itens (
  id uuid primary key default gen_random_uuid(),
  recibo_id uuid not null references public.ar_recibos(id) on delete cascade,
  validacao_id uuid not null references public.ar_validacoes(id) on delete restrict,
  descricao text,
  valor_tot_comiss numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (recibo_id, validacao_id)
);

create index if not exists ar_validacoes_status_idx on public.ar_validacoes(status_pagamento);
create index if not exists ar_validacoes_parceiro_idx on public.ar_validacoes(parceiro_id);
create index if not exists ar_validacoes_recibo_idx on public.ar_validacoes(recibo_id);
create index if not exists ar_validacoes_data_idx on public.ar_validacoes(data_validacao);
create index if not exists ar_recibos_status_idx on public.ar_recibos(status);
create index if not exists ar_recibos_data_idx on public.ar_recibos(data_emissao desc);
create index if not exists ar_recibo_itens_recibo_idx on public.ar_recibo_itens(recibo_id);

alter table public.ar_validacoes enable row level security;
alter table public.ar_recibos enable row level security;
alter table public.ar_recibo_itens enable row level security;
alter table public.ar_recibo_sequencias enable row level security;

grant select, insert, update on table public.ar_validacoes to authenticated;
grant select, insert, update on table public.ar_recibos to authenticated;
grant select, insert, update on table public.ar_recibo_itens to authenticated;
grant select, insert, update on table public.ar_recibo_sequencias to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ar_validacoes' and policyname = 'ar_validacoes_authenticated_all'
  ) then
    create policy ar_validacoes_authenticated_all on public.ar_validacoes
      for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ar_recibos' and policyname = 'ar_recibos_authenticated_all'
  ) then
    create policy ar_recibos_authenticated_all on public.ar_recibos
      for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ar_recibo_itens' and policyname = 'ar_recibo_itens_authenticated_all'
  ) then
    create policy ar_recibo_itens_authenticated_all on public.ar_recibo_itens
      for all to authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ar_recibo_sequencias' and policyname = 'ar_recibo_sequencias_authenticated_all'
  ) then
    create policy ar_recibo_sequencias_authenticated_all on public.ar_recibo_sequencias
      for all to authenticated using (true) with check (true);
  end if;
end $$;

create or replace function public.ar_proximo_numero_recibo(p_ano integer default extract(year from current_date)::integer)
returns table(numero text, ano integer, sequencial integer)
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.ar_recibo_sequencias as seq (ano, ultimo_numero, updated_at)
  values (p_ano, 1, now())
  on conflict (ano)
  do update set ultimo_numero = seq.ultimo_numero + 1, updated_at = now()
  returning seq.ano, seq.ultimo_numero
  into ano, sequencial;

  numero := 'REC-' || ano::text || '-' || lpad(sequencial::text, 4, '0');
  return next;
end;
$$;

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
    count(distinct coalesce(parceiro_id::text, codigo_entidade, parceiro_nome)),
    coalesce(sum(valor_tot_comiss), 0),
    max(parceiro_nome),
    max(codigo_entidade)
    into v_count, v_parceiro_count, v_total, v_parceiro_nome, v_codigo_entidade
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
  from public.ar_validacoes validacao
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

create or replace function public.ar_cancelar_recibo(
  p_recibo_id uuid,
  p_motivo text default null
)
returns public.ar_recibos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recibo public.ar_recibos;
begin
  select *
    into v_recibo
  from public.ar_recibos
  where id = p_recibo_id
    and status = 'emitido'
  for update;

  if not found then
    raise exception 'Recibo emitido não encontrado ou já cancelado.';
  end if;

  update public.ar_recibos
  set status = 'cancelado',
      data_cancelamento = now(),
      motivo_cancelamento = p_motivo,
      updated_at = now()
  where id = p_recibo_id
  returning * into v_recibo;

  update public.ar_validacoes
  set status_pagamento = 'pendente',
      recibo_id = null,
      data_pagamento = null,
      updated_at = now()
  where recibo_id = p_recibo_id;

  return v_recibo;
end;
$$;

revoke execute on function public.ar_proximo_numero_recibo(integer) from public;
revoke execute on function public.ar_emitir_recibo(uuid, uuid[], text) from public;
revoke execute on function public.ar_cancelar_recibo(uuid, text) from public;

grant execute on function public.ar_proximo_numero_recibo(integer) to authenticated;
grant execute on function public.ar_emitir_recibo(uuid, uuid[], text) to authenticated;
grant execute on function public.ar_cancelar_recibo(uuid, text) to authenticated;
