create or replace function public.ar_crm_enqueue_create(
  p_item jsonb,
  p_outbox jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.ar_crm_items;
  v_outbox public.ar_crm_sync_outbox;
begin
  insert into public.ar_crm_items (
    nome,
    status,
    data_vencimento,
    dados,
    sync_status,
    updated_at
  )
  values (
    coalesce(p_item->>'nome', ''),
    nullif(p_item->>'status', ''),
    nullif(p_item->>'data_vencimento', '')::date,
    coalesce(p_item->'dados', '{}'::jsonb),
    'pending',
    coalesce(nullif(p_item->>'updated_at', '')::timestamptz, now())
  )
  returning * into v_item;

  insert into public.ar_crm_sync_outbox (
    item_id,
    task_id,
    action,
    payload,
    status,
    available_at,
    updated_at
  )
  values (
    v_item.id,
    null,
    'create',
    coalesce(p_outbox->'payload', '{}'::jsonb),
    'pending',
    coalesce(nullif(p_outbox->>'available_at', '')::timestamptz, now()),
    coalesce(nullif(p_outbox->>'updated_at', '')::timestamptz, now())
  )
  returning * into v_outbox;

  return jsonb_build_object(
    'item', to_jsonb(v_item),
    'queued', true,
    'outboxId', v_outbox.id,
    'taskId', null
  );
end;
$$;

revoke all on function public.ar_crm_enqueue_create(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ar_crm_enqueue_create(jsonb, jsonb) to service_role;
