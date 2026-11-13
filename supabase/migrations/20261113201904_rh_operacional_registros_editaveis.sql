-- Novos registros operacionais entram em acompanhamento e podem ser alterados
-- ou cancelados por usuários com as permissões existentes.
alter table public.rh_ferias
  alter column status set default 'pendente_envio';

alter table public.rh_afastamentos
  alter column status set default 'pendente_envio';

alter table public.rh_desligamentos
  alter column status set default 'pendente_envio';

drop policy if exists rh_ferias_insert_permission on public.rh_ferias;
create policy rh_ferias_insert_permission on public.rh_ferias for insert to authenticated
with check (
  (select public.app_tem_permissao('rh_dp.ferias', 'create'))
  and status in ('rascunho', 'pendente_envio')
);

drop policy if exists rh_afastamentos_insert_permission on public.rh_afastamentos;
create policy rh_afastamentos_insert_permission on public.rh_afastamentos for insert to authenticated
with check (
  (select public.app_tem_permissao('rh_dp.ocorrencias', 'create'))
  and status in ('rascunho', 'pendente_envio')
);

drop policy if exists rh_desligamentos_insert_permission on public.rh_desligamentos;
create policy rh_desligamentos_insert_permission on public.rh_desligamentos for insert to authenticated
with check (
  (select public.app_tem_permissao('rh_dp.desligamentos', 'create'))
  and status in ('rascunho', 'pendente_envio')
);
