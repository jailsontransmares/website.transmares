create sequence if not exists public.rh_colaboradores_codigo_seq;

alter table public.rh_colaboradores
  add column if not exists codigo text;

with colaboradores_ordenados as (
  select
    id,
    row_number() over (order by created_at, id) as numero
  from public.rh_colaboradores
  where codigo is null
)
update public.rh_colaboradores as colaborador
set codigo = 'COL-' || lpad(colaboradores_ordenados.numero::text, 6, '0')
from colaboradores_ordenados
where colaborador.id = colaboradores_ordenados.id;

do $$
declare
  v_total bigint;
begin
  select count(*) into v_total from public.rh_colaboradores;
  if v_total > 0 then
    perform setval('public.rh_colaboradores_codigo_seq', v_total, true);
  else
    perform setval('public.rh_colaboradores_codigo_seq', 1, false);
  end if;
end;
$$;

alter table public.rh_colaboradores
  alter column codigo set default 'COL-' || lpad(nextval('public.rh_colaboradores_codigo_seq')::text, 6, '0'),
  alter column codigo set not null;

alter table public.rh_colaboradores
  add constraint rh_colaboradores_codigo_check
  check (codigo ~ '^COL-[0-9]{6,}$');

create unique index if not exists rh_colaboradores_codigo_key
  on public.rh_colaboradores (codigo);
