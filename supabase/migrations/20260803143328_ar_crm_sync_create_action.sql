alter table public.ar_crm_sync_outbox
  alter column task_id drop not null;

alter table public.ar_crm_sync_outbox
  drop constraint if exists ar_crm_sync_outbox_action_check;

alter table public.ar_crm_sync_outbox
  add constraint ar_crm_sync_outbox_action_check
  check (action in ('create', 'update', 'delete'));
