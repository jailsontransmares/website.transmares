import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { novoCorrelationId, registrarLogIntegracao } from "../_shared/integrationLog.ts";

type RecordData = Record<string, unknown>;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function authorizeHubUser(client: ReturnType<typeof createClient>, authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessao nao informada.");

  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth?.user?.id) throw new Error("Sessao invalida ou expirada.");

  const { data: user, error: userError } = await client
    .from("usuarios")
    .select("id,status,is_master,perfil_id,perfil")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (userError || !user || user.status !== "ativo") throw new Error("Usuario sem acesso ativo ao Hub.");

  if (user.is_master || ["admin", "administrador"].includes(text(user.perfil).toLowerCase())) return;

  const { data: override } = await client
    .from("usuario_permissoes")
    .select("efeito")
    .eq("usuario_id", user.id)
    .eq("recurso_chave", "painel_ar.crm")
    .eq("acao", "execute")
    .maybeSingle();
  if (override?.efeito === "negar") throw new Error("Seu usuario nao possui permissao para sincronizar o CRM AR.");
  if (override?.efeito === "permitir") return;
  if (!user.perfil_id) throw new Error("Perfil sem permissao para o CRM AR.");

  const { data: permission } = await client
    .from("perfil_permissoes")
    .select("permitido")
    .eq("perfil_id", user.perfil_id)
    .eq("recurso_chave", "painel_ar.crm")
    .eq("acao", "execute")
    .maybeSingle();
  if (!permission?.permitido) throw new Error("Seu perfil nao possui permissao para sincronizar o CRM AR.");
}

async function updateClickUpTask(taskId: string, payload: RecordData, token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou a atualização (${response.status}). ${detail.slice(0, 220)}`);
  }
  return response.json() as Promise<RecordData>;
}

async function createClickUpTask(listId: string, payload: RecordData, token: string) {
  const { list_id: _listId, item_id: _itemId, custom_fields: _customFields, ...taskPayload } = payload;
  const response = await fetch(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(taskPayload)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou a criaÃ§Ã£o (${response.status}). ${detail.slice(0, 220)}`);
  }
  return response.json() as Promise<RecordData>;
}

async function getClickUpTask(taskId: string, token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: token }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou a leitura da tarefa (${response.status}). ${detail.slice(0, 220)}`);
  }
  return response.json() as Promise<RecordData>;
}

function normalizeTaskFields(fields: unknown, fallbackFields: unknown = []) {
  const taskFields = Array.isArray(fields) ? fields as RecordData[] : [];
  const localFields = Array.isArray(fallbackFields) ? fallbackFields as RecordData[] : [];
  const byId = new Map(localFields.map((field) => [text(field.id), field]).filter(([id]) => id));
  const merged = taskFields.map((field) => {
    const item = field as RecordData;
    const fallback = byId.get(text(item.id)) || {};
    const mergedField = { ...fallback, ...item };
    const rawValue = mergedField.value;
    const displayValue = rawValue && typeof rawValue === "object"
      ? text((rawValue as RecordData).name || (rawValue as RecordData).label || (rawValue as RecordData).value || rawValue)
      : text(rawValue);
    byId.delete(text(item.id));
    return { ...mergedField, valor_original: rawValue ?? null, display_value: displayValue || "-" };
  });
  for (const field of byId.values()) {
    const rawValue = field.value;
    const displayValue = rawValue && typeof rawValue === "object"
      ? text((rawValue as RecordData).name || (rawValue as RecordData).label || (rawValue as RecordData).value || rawValue)
      : text(rawValue);
    merged.push({ ...field, valor_original: rawValue ?? null, display_value: displayValue || "-" });
  }
  return merged;
}

async function updateClickUpCustomField(taskId: string, fieldId: string, value: unknown, token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ value })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou o campo personalizado (${response.status}). ${detail.slice(0, 220)}`);
  }
  return response.json().catch(() => ({}));
}

async function clearClickUpCustomField(taskId: string, fieldId: string, token: string) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, {
    method: "DELETE",
    headers: { Authorization: token }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp recusou a limpeza do campo personalizado (${response.status}). ${detail.slice(0, 220)}`);
  }
  return response.json().catch(() => ({}));
}

async function processRow(client: ReturnType<typeof createClient>, row: RecordData, clickupToken: string) {
  let taskId = text(row.task_id);
  const action = text(row.action);
  const payload = (row.payload || {}) as RecordData;
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await client
    .from("ar_crm_sync_outbox")
    .update({ status: "processing", locked_at: now, updated_at: now })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id,item_id,task_id,payload,attempts")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { skipped: true };

  const correlationId = novoCorrelationId();
  const startedAt = Date.now();
  await registrarLogIntegracao(client, {
    sistema: "clickup",
    tipo: "sincronizacao",
    evento: "sync_outbox",
    status: "started",
    correlation_id: correlationId,
    external_id: taskId,
    tentativa: Number(row.attempts || 0) + 1,
    detalhes: { outbox_id: row.id, item_id: row.item_id }
  });

  try {
    const { custom_fields: customFields, list_id: listId, item_id: payloadItemId, ...taskPayload } = payload;
    let task: RecordData = {};
    if (action === "create") {
      const { data: existingMapping, error: existingMappingError } = await client
        .from("ar_crm_clickup_mapping")
        .select("id,item_id,task_id")
        .eq("item_id", row.item_id)
        .maybeSingle();
      if (existingMappingError) throw existingMappingError;
      if (existingMapping?.task_id) {
        taskId = text(existingMapping.task_id);
      } else if (!taskId) {
        const created = await createClickUpTask(text(listId), { ...taskPayload, custom_fields: customFields }, clickupToken);
        task = created;
        taskId = text(created.id);
        if (!taskId) throw new Error("ClickUp nao retornou o ID da tarefa criada.");
        await client.from("ar_crm_sync_outbox").update({ task_id: taskId, updated_at: new Date().toISOString() }).eq("id", row.id);
      }
      if (!existingMapping?.task_id) {
        const { error: mappingError } = await client.from("ar_crm_clickup_mapping").insert({
          item_id: row.item_id,
          workspace_id: text(task.team_id || task.workspace_id),
          list_id: text(listId),
          folder_id: text((task.folder as RecordData | null)?.id),
          task_id: taskId,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        if (mappingError) throw mappingError;
      }
    } else {
      task = Object.keys(taskPayload).length ? await updateClickUpTask(taskId, { ...taskPayload, ...(payloadItemId ? {} : {}) }, clickupToken) : {};
    }
    if (Array.isArray(customFields)) {
      for (const field of customFields) {
        const fieldId = text((field as RecordData).id);
        if (!fieldId) throw new Error("Campo personalizado sem ID.");
        if ((field as RecordData).clear === true) {
          await clearClickUpCustomField(taskId, fieldId, clickupToken);
        } else {
          await updateClickUpCustomField(taskId, fieldId, (field as RecordData).value, clickupToken);
        }
      }
    }
    task = await getClickUpTask(taskId, clickupToken);
    const syncedAt = new Date().toISOString();
    await client.from("ar_crm_sync_outbox").update({ status: "success", processed_at: syncedAt, locked_at: null, updated_at: syncedAt }).eq("id", row.id);
    const { data: localItem, error: localItemError } = await client
      .from("ar_crm_items")
      .select("dados")
      .eq("id", row.item_id)
      .single();
    if (localItemError) throw localItemError;
    const localData = (localItem?.dados || {}) as RecordData;
    const syncedData = {
      ...localData,
      clickup_task_id: taskId,
      clickup_url: text(task.url) || text((localData.clickup_url as string) || "") || null,
      data_criacao: task.date_created || localData.data_criacao || null,
      data_atualizacao: task.date_updated || localData.data_atualizacao || null,
      campos_personalizados: normalizeTaskFields(task.custom_fields, localData.campos_personalizados),
      lista: task.list || localData.lista || null,
      pasta: task.folder || localData.pasta || null,
      cadastro_pendente_clickup: false,
      cadastro_sincronizado_em: syncedAt
    };
    const { error: itemUpdateError } = await client
      .from("ar_crm_items")
      .update({ sync_status: "synced", last_synced_at: syncedAt, updated_at: syncedAt, dados: syncedData })
      .eq("id", row.item_id);
    if (itemUpdateError) throw itemUpdateError;
    await client.from("ar_crm_clickup_mapping").update({ last_clickup_updated_at: task.date_updated ? new Date(Number(task.date_updated)).toISOString() : syncedAt, last_synced_at: syncedAt, updated_at: syncedAt }).eq("task_id", taskId);
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "sincronizacao", evento: "sync_outbox", status: "success", mensagem: "Tarefa sincronizada com o ClickUp.", correlation_id: correlationId, external_id: taskId, tentativa: Number(row.attempts || 0) + 1, duracao_ms: Date.now() - startedAt, detalhes: { outbox_id: row.id, item_id: row.item_id } });
    return { id: row.id, taskId, status: "success" };
  } catch (error) {
    const attempts = Number(row.attempts || 0) + 1;
    const retry = attempts < 5;
    const nextAt = new Date(Date.now() + Math.min(15, 2 ** attempts) * 60_000).toISOString();
    const message = error instanceof Error ? error.message : "Erro ao sincronizar tarefa.";
    await client.from("ar_crm_sync_outbox").update({ status: retry ? "pending" : "error", attempts, last_error: message, available_at: nextAt, locked_at: null, updated_at: new Date().toISOString() }).eq("id", row.id);
    await client.from("ar_crm_items").update({ sync_status: retry ? "pending" : "error", updated_at: new Date().toISOString() }).eq("id", row.item_id);
    await registrarLogIntegracao(client, { sistema: "clickup", tipo: "sincronizacao", evento: "sync_outbox", status: retry ? "retrying" : "failed", nivel: "error", mensagem: message, correlation_id: correlationId, external_id: taskId, tentativa: attempts, duracao_ms: Date.now() - startedAt, detalhes: { outbox_id: row.id, item_id: row.item_id, retry } });
    return { id: row.id, taskId, status: retry ? "retry" : "error", message };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  const serviceKey = text(Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"));
  const workerToken = text(Deno.env.get("WORKER_TOKEN") || Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"));
  const providedToken = text(req.headers.get("X-Worker-Token") || req.headers.get("apikey"));
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const clickupToken = text(Deno.env.get("CLICKUP_API_TOKEN"));
  if (!serviceKey || !supabaseUrl || !clickupToken) return json({ ok: false, message: "Worker sem configuração obrigatória." }, 500);

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(workerToken && sameSecret(providedToken, workerToken))) {
    try {
      await authorizeHubUser(client, req.headers.get("Authorization") || "");
    } catch (error) {
      return json({ ok: false, message: error instanceof Error ? error.message : "Worker não autorizado." }, 401);
    }
  }
  const requestPayload = await req.json().catch(() => ({})) as RecordData;
  const requestedItemId = text(requestPayload.itemId);
  await client.from("ar_crm_sync_outbox").update({ status: "pending", locked_at: null, updated_at: new Date().toISOString() }).eq("status", "processing").lt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  let pendingQuery = client.from("ar_crm_sync_outbox").select("id,item_id,task_id,action,payload,attempts").eq("status", "pending").lte("available_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(20);
  if (requestedItemId) pendingQuery = pendingQuery.eq("item_id", requestedItemId);
  const { data: pendingRows, error } = await pendingQuery;
  if (error) return json({ ok: false, message: error.message }, 500);
  let rows = pendingRows || [];
  if (requestedItemId && !rows.length) {
    const [{ data: mapping, error: mappingError }, { data: localItem, error: localItemError }] = await Promise.all([
      client.from("ar_crm_clickup_mapping").select("task_id").eq("item_id", requestedItemId).maybeSingle(),
      client.from("ar_crm_items").select("dados").eq("id", requestedItemId).maybeSingle()
    ]);
    if (mappingError || localItemError) return json({ ok: false, message: (mappingError || localItemError)?.message || "Nao foi possivel carregar o cadastro." }, 500);
    const localData = (localItem?.dados || {}) as RecordData;
    const customFields = (Array.isArray(localData.campos_personalizados) ? localData.campos_personalizados : [])
      .map((field) => field as RecordData)
      .filter((field) => text(field.id) && !text(field.id).startsWith("local-cadastro-") && (field.value !== null && field.value !== undefined && text(field.value) !== ""))
      .map((field) => ({ id: text(field.id), value: field.value }));
    if (mapping?.task_id && customFields.length) {
      const { data: requeued, error: requeueError } = await client
        .from("ar_crm_sync_outbox")
        .insert({ item_id: requestedItemId, task_id: text(mapping.task_id), action: "update", payload: { custom_fields: customFields }, status: "pending", available_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select("id,item_id,task_id,action,payload,attempts")
        .single();
      if (requeueError) return json({ ok: false, message: requeueError.message }, 500);
      if (requeued) rows = [requeued];
    }
  }
  const results = [];
  for (const row of rows || []) results.push(await processRow(client, row, clickupToken));
  return json({ ok: true, processed: results.length, results });
});
