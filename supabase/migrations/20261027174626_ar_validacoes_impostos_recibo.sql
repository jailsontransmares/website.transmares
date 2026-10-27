create table if not exists public.ar_impostos_configuracoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  percentual numeric(7,4) not null check (percentual >= 0 and percentual <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_impostos_configuracoes_created_idx
  on public.ar_impostos_configuracoes (created_at, nome);

alter table public.ar_impostos_configuracoes enable row level security;
grant select, insert, update, delete on table public.ar_impostos_configuracoes to authenticated;

drop policy if exists ar_impostos_configuracoes_authenticated_all on public.ar_impostos_configuracoes;
create policy ar_impostos_configuracoes_authenticated_all on public.ar_impostos_configuracoes
  for all to authenticated using (true) with check (true);

alter table public.ar_recibos
  add column if not exists impostos jsonb not null default '[]'::jsonb,
  add column if not exists valor_impostos numeric(12,2) not null default 0,
  add column if not exists valor_liquido numeric(12,2) not null default 0;

update public.ar_recibos
set valor_liquido = valor_total
where valor_liquido = 0 and valor_total <> 0;

create or replace function public.ar_calcular_impostos_recibo()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_percentual_total numeric(9,4);
  v_valor_impostos numeric(12,2);
  v_impostos jsonb;
begin
  select coalesce(sum(config.percentual), 0)
    into v_percentual_total
  from public.ar_impostos_configuracoes config;

  if v_percentual_total > 100 then
    raise exception 'A soma dos percentuais de impostos não pode ultrapassar 100%%.';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', config.id,
          'nome', config.nome,
          'percentual', config.percentual,
          'valor', round(coalesce(new.valor_total, 0) * config.percentual / 100, 2)
        ) order by config.created_at, config.nome
      ),
      '[]'::jsonb
    ),
    coalesce(sum(round(coalesce(new.valor_total, 0) * config.percentual / 100, 2)), 0)
    into v_impostos, v_valor_impostos
  from public.ar_impostos_configuracoes config;

  new.impostos := v_impostos;
  new.valor_impostos := v_valor_impostos;
  new.valor_liquido := coalesce(new.valor_total, 0) - v_valor_impostos;
  return new;
end;
$$;

drop trigger if exists ar_recibos_calcular_impostos on public.ar_recibos;
create trigger ar_recibos_calcular_impostos
  before insert on public.ar_recibos
  for each row execute function public.ar_calcular_impostos_recibo();
