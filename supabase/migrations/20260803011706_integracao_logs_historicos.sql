-- Importa históricos de integrações já registrados nas tabelas legadas.
-- A marca legacy_source/legacy_id torna a migração segura para reexecução.

insert into public.integracao_logs (
  sistema, tipo, evento, nivel, status, mensagem, external_id,
  duracao_ms, tentativa, detalhes, created_at
)
select
  'clickup',
  'sincronizacao',
  'ar_crm_sync',
  case
    when run.status = 'error' then 'error'
    when run.status = 'partial' or run.total_erros > 0 then 'warning'
    else 'info'
  end,
  case run.status
    when 'success' then 'success'
    when 'partial' then 'success'
    when 'error' then 'failed'
    else 'started'
  end,
  coalesce(
    run.mensagem_erro,
    format(
      'Sincronização %s: %s processado(s), %s criado(s), %s atualizado(s), %s erro(s).',
      run.status, run.total_processados, run.total_criados,
      run.total_atualizados, run.total_erros
    )
  ),
  run.id::text,
  case
    when run.started_at is not null and run.finished_at is not null
      then greatest(0, extract(epoch from (run.finished_at - run.started_at)) * 1000)::integer
    else null
  end,
  1,
  jsonb_build_object(
    'legacy_source', 'ar_crm_sync_runs',
    'legacy_id', run.id,
    'origem', run.origem,
    'status_original', run.status,
    'total_processados', run.total_processados,
    'total_criados', run.total_criados,
    'total_atualizados', run.total_atualizados,
    'total_erros', run.total_erros,
    'started_at', run.started_at,
    'finished_at', run.finished_at
  ),
  coalesce(run.started_at, run.created_at)
from public.ar_crm_sync_runs run
where not exists (
  select 1
  from public.integracao_logs log
  where log.detalhes ->> 'legacy_source' = 'ar_crm_sync_runs'
    and log.detalhes ->> 'legacy_id' = run.id::text
);

insert into public.integracao_logs (
  sistema, tipo, evento, nivel, status, mensagem, external_id,
  duracao_ms, tentativa, detalhes, created_at
)
select
  'clickup',
  'webhook',
  webhook.event,
  case when webhook.status = 'error' then 'error' else 'info' end,
  case webhook.status
    when 'processed' then 'success'
    when 'error' then 'failed'
    else 'started'
  end,
  coalesce(
    webhook.error_message,
    format('Webhook %s: %s.', webhook.event, webhook.status)
  ),
  coalesce(webhook.task_id, webhook.webhook_id),
  case
    when webhook.processed_at is not null
      then greatest(0, extract(epoch from (webhook.processed_at - webhook.created_at)) * 1000)::integer
    else null
  end,
  1,
  jsonb_build_object(
    'legacy_source', 'ar_crm_clickup_webhook_events',
    'legacy_id', webhook.id,
    'event_key', webhook.event_key,
    'webhook_id', webhook.webhook_id,
    'task_id', webhook.task_id,
    'status_original', webhook.status,
    'processed_at', webhook.processed_at
  ),
  webhook.created_at
from public.ar_crm_clickup_webhook_events webhook
where not exists (
  select 1
  from public.integracao_logs log
  where log.detalhes ->> 'legacy_source' = 'ar_crm_clickup_webhook_events'
    and log.detalhes ->> 'legacy_id' = webhook.id::text
);
