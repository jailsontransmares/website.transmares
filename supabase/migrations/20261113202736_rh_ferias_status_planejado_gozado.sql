-- Simplifica o status de férias para o controle operacional solicitado.
alter table public.rh_ferias
  drop constraint if exists rh_ferias_status_check;

update public.rh_ferias
set status = case
  when status = 'cancelado' then 'cancelado'
  when fim_gozo < current_date then 'gozado'
  else 'planejado'
end;

alter table public.rh_ferias
  alter column status set default 'planejado',
  add constraint rh_ferias_status_check check (status in ('planejado', 'gozado', 'cancelado'));

drop policy if exists rh_ferias_insert_permission on public.rh_ferias;
create policy rh_ferias_insert_permission on public.rh_ferias for insert to authenticated
with check (
  (select public.app_tem_permissao('rh_dp.ferias', 'create'))
  and status in ('planejado', 'gozado')
);

drop policy if exists rh_ferias_update_permission on public.rh_ferias;
create policy rh_ferias_update_permission on public.rh_ferias for update to authenticated
using (
  (select public.app_tem_permissao('rh_dp.ferias', 'update'))
  or (
    (select public.app_tem_permissao('rh_dp.ferias', 'cancel'))
    and status in ('planejado', 'gozado')
  )
)
with check (
  (select public.app_tem_permissao('rh_dp.ferias', 'update'))
  or (
    (select public.app_tem_permissao('rh_dp.ferias', 'cancel'))
    and status = 'cancelado'
  )
);
