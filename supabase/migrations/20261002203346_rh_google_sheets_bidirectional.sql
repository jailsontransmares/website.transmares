alter table public.rh_vinculos_profissionais
  add column if not exists carga_horaria_mensal numeric(6, 2);

alter table public.rh_vinculos_profissionais
  drop constraint if exists rh_vinculos_carga_horaria_mensal_check;

alter table public.rh_vinculos_profissionais
  add constraint rh_vinculos_carga_horaria_mensal_check
  check (carga_horaria_mensal is null or carga_horaria_mensal >= 0);
