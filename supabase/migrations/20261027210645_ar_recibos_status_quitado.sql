alter table public.ar_recibos
  drop constraint if exists ar_recibos_status_check;

alter table public.ar_recibos
  add constraint ar_recibos_status_check
  check (status in ('emitido', 'cancelado', 'quitado'));
