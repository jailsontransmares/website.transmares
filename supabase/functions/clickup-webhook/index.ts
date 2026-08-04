import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { novoCorrelationId, registrarLogIntegracao } from "../_shared/integrationLog.ts";

type RecordData = Record<string, unknown>;

const encoder = new TextEncoder();

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function dateFromEpoch(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeCustomFields(fields: unknown) {
  if (!Array.isArray(fields)) return [];

  return fields.map((field) => {
    const item = field as RecordData;
    const config = item.type_config as RecordData | null;
    const options = Array.isArray(config?.options) ? config.options as RecordData[] : [];
    const rawValue = item.value;
    const rawId = rawValue && typeof rawValue === "object"
      ? ((rawValue as RecordData).id ?? (rawValue as RecordData).orderindex)
      : rawValue;
    const option = options.find((candidate) =>
      [candidate.id, candidate.orderindex, candidate.value].some((value) => text(value) === text(rawId))
    );

    return {
      ...item,
      valor_original: rawValue ?? null,
      display_value: option
        ? text(option.name || option.label || option.value)
        : text((rawValue as RecordData | null)?.name || rawValue)
    };
  });
}

function normalizeTask(task: RecordData) {
  const status = task.status as RecordData | null;
  const assignees = Array.isArray(task.assignees) ? task.assignees as RecordData[] : [];
  const assignee = assignees[0] || {};

  return {
    nome: text(task.name) || "Sem nome",
    status: text(status?.status || status?.type) || null,
    responsavel: text(assignee.username || assignee.email || assignee.name) || null,
    data_vencimento: dateFromEpoch(task.due_date),
    dados: {
      clickup_task_id: text(task.id),
      clickup_url: text(task.url) || null,
      descricao: text(task.description) || null,
      data_criacao: task.date_created || null,
      data_atualizacao: task.date_updated || null,
      prioridade: task.priority || null,
      etiquetas: task.tags || [],
      campos_personalizados: normalizeCustomFields(task.custom_fields),
      lista: task.list || null,
      pasta: task.folder || null
    },
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function toIsoDate(value: unknown) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp).toISOString() : null;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function signaturesEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function clickupTask(taskId: string, token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: token }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou a consulta da tarefa (${response.status}). ${detail.slice(0, 220)}`);
  }

  return response.json() as Promise<RecordData>;
}

async function upsertTask(client: ReturnType<typeof createClient>, task: RecordData) {
  const taskId = text(task.id);
  if (!taskId) throw new Error("Webhook sem ID de tarefa.");

  const payload = normalizeTask(task);
  const { data: mapping, error: mappingError } = await client
    .from("ar_crm_clickup_mapping")
    .select("id,item_id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (mappingError) throw mappingError;

  if (mapping?.item_id) {
    const { data: pendingOutbox, error: outboxError } = await client
      .from("ar_crm_sync_outbox")
      .select("id")
      .eq("item_id", mapping.item_id)
      .in("status", ["pending", "processing"])
      .limit(1)
      .maybeSingle();
    if (outboxError) throw outboxError;
    if (pendingOutbox?.id) return "deferred_local_sync";

    const { error } = await client
      .from("ar_crm_items")
      .update(payload)
      .eq("id", mapping.item_id);
    if (error) throw error;

    const { error: mappingUpdateError } = await client
      .from("ar_crm_clickup_mapping")
      .update({
        last_clickup_updated_at: toIsoDate(task.date_updated),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", mapping.id);
    if (mappingUpdateError) throw mappingUpdateError;
    return "updated";
  }

  const { data: item, error: itemError } = await client
    .from("ar_crm_items")
    .insert(payload)
    .select("id")
    .single();
  if (itemError || !item) throw itemError || new Error("Não foi possível criar o item do CRM.");

  const { error: mappingInsertError } = await client
    .from("ar_crm_clickup_mapping")
    .insert({
      item_id: item.id,
      workspace_id: text(task.team_id || (task.workspace as RecordData | null)?.id),
      list_id: text((task.list as RecordData | null)?.id),
      folder_id: text((task.folder as RecordData | null)?.id),
      task_id: taskId,
      last_clickup_updated_at: toIsoDate(task.date_updated),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  if (mappingInsertError) throw mappingInsertError;
  return "created";
}

async function deleteTask(client: ReturnType<typeof createClient>, taskId: string) {
  const { data: mapping, error } = await client
    .from("ar_crm_clickup_mapping")
    .select("item_id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!mapping?.item_id) return "ignored";

  const { error: deleteError } = await client
    .from("ar_crm_items")
    .delete()
    .eq("id", mapping.item_id);
  if (deleteError) throw deleteError;
  return "deleted";
}

async function eventKey(webhookId: string, payload: RecordData, body: string) {
  const historyId = text((payload.history_items as RecordData[] | undefined)?.[0]?.id);
  if (historyId) return `${webhookId}:${historyId}`;
  return `${webhookId}:${await hmacHex(webhookId, body)}`;
}

function eventAuditPayload(payload: RecordData) {
  const historyItems = Array.isArray(payload.history_items) ? payload.history_items : [];
  return {
    event: text(payload.event),
    webhook_id: text(payload.webhook_id),
    task_id: text(payload.task_id) || null,
    history_items: historyItems.map((item) => {
      const history = item as RecordData;
      return {
        id: text(history.id) || null,
        field: text(history.field) || null,
        date: text(history.date) || null
      };
    })
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);

  const secret = text(Deno.env.get("CLICKUP_WEBHOOK_SECRET"));
  const serviceRoleKey = text(
    Deno.env.get("SB_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SB_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY")
  );
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const clickupToken = text(Deno.env.get("CLICKUP_API_TOKEN"));
  if (!secret || !serviceRoleKey || !supabaseUrl || !clickupToken) {
    return json({ ok: false, message: "Webhook sem configuração obrigatória." }, 500);
  }

  const body = await req.text();
  const expectedSignature = await hmacHex(secret, body);
  const receivedSignature = text(req.headers.get("X-Signature"));
  if (!signaturesEqual(receivedSignature, expectedSignature)) {
    return json({ ok: false, message: "Assinatura inválida." }, 401);
  }

  let payload: RecordData;
  try {
    payload = JSON.parse(body) as RecordData;
  } catch (_error) {
    return json({ ok: false, message: "Payload JSON inválido." }, 400);
  }

  const event = text(payload.event);
  const webhookId = text(payload.webhook_id);
  const taskId = text(payload.task_id);
  if (!event || !webhookId) return json({ ok: false, message: "Webhook incompleto." }, 400);
  if (!event.startsWith("task")) return json({ ok: true, ignored: true });
  if (!taskId && event !== "taskDeleted") return json({ ok: false, message: "Evento sem task_id." }, 400);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const correlationId = novoCorrelationId();
  const startedAt = Date.now();
  await registrarLogIntegracao(client, {
    sistema: "clickup",
    tipo: "webhook",
    evento: event,
    status: "started",
    correlation_id: correlationId,
    external_id: taskId || webhookId,
    detalhes: { webhook_id: webhookId, task_id: taskId || null }
  });
  const key = await eventKey(webhookId, payload, body);
  const { data: existing, error: existingError } = await client
    .from("ar_crm_clickup_webhook_events")
    .select("id,status")
    .eq("event_key", key)
    .maybeSingle();
  if (existingError) {
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "webhook", evento: event, status: "failed", mensagem: existingError.message, correlation_id: correlationId, external_id: taskId || webhookId, duracao_ms: Date.now() - startedAt });
    return json({ ok: false, message: existingError.message }, 500);
  }
  if (existing?.status === "processed") {
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "webhook", evento: event, status: "success", mensagem: "Evento duplicado ignorado.", correlation_id: correlationId, external_id: taskId || webhookId, duracao_ms: Date.now() - startedAt });
    return json({ ok: true, duplicate: true });
  }

  const eventRecord = {
    event_key: key,
    webhook_id: webhookId,
    event,
    task_id: taskId || null,
    payload: eventAuditPayload(payload),
    status: "processing",
    error_message: null,
    updated_at: new Date().toISOString()
  };
  const { error: eventError } = existing?.id
    ? await client.from("ar_crm_clickup_webhook_events").update(eventRecord).eq("id", existing.id)
    : await client.from("ar_crm_clickup_webhook_events").insert(eventRecord);
  if (eventError) {
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "webhook", evento: event, status: "failed", mensagem: eventError.message, correlation_id: correlationId, external_id: taskId || webhookId, duracao_ms: Date.now() - startedAt });
    return json({ ok: false, message: eventError.message }, 500);
  }

  try {
    let result = "ignored";
    if (event === "taskDeleted") {
      result = await deleteTask(client, taskId);
    } else if (taskId) {
      result = await upsertTask(client, await clickupTask(taskId, clickupToken));
    }

    const { error: processedError } = await client
      .from("ar_crm_clickup_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("event_key", key);
    if (processedError) throw processedError;

    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "webhook", evento: event, status: "success", mensagem: `Evento processado: ${result}.`, correlation_id: correlationId, external_id: taskId || webhookId, duracao_ms: Date.now() - startedAt, detalhes: { result, task_id: taskId || null } });
    return json({ ok: true, event, taskId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook.";
    await client
      .from("ar_crm_clickup_webhook_events")
      .update({ status: "error", error_message: message, updated_at: new Date().toISOString() })
      .eq("event_key", key);
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "webhook", evento: event, status: "failed", mensagem: message, correlation_id: correlationId, external_id: taskId || webhookId, duracao_ms: Date.now() - startedAt, detalhes: { task_id: taskId || null } });
    return json({ ok: false, message }, 500);
  }
});
