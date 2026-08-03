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
  const taskId = text(row.task_id);
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
    const { custom_fields: customFields, ...taskPayload } = payload;
    const task = Object.keys(taskPayload).length ? await updateClickUpTask(taskId, taskPayload, clickupToken) : {};
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
    const syncedAt = new Date().toISOString();
    await client.from("ar_crm_sync_outbox").update({ status: "success", processed_at: syncedAt, locked_at: null, updated_at: syncedAt }).eq("id", row.id);
    await client.from("ar_crm_items").update({ sync_status: "synced", last_synced_at: syncedAt, updated_at: syncedAt }).eq("id", row.item_id);
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
  if (!serviceKey || !workerToken || !supabaseUrl || !clickupToken) return json({ ok: false, message: "Worker sem configuração obrigatória." }, 500);
  if (!sameSecret(providedToken, workerToken)) return json({ ok: false, message: "Worker não autorizado." }, 401);

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.from("ar_crm_sync_outbox").update({ status: "pending", locked_at: null, updated_at: new Date().toISOString() }).eq("status", "processing").lt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const { data: rows, error } = await client.from("ar_crm_sync_outbox").select("id,item_id,task_id,payload,attempts").eq("status", "pending").lte("available_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(20);
  if (error) return json({ ok: false, message: error.message }, 500);
  const results = [];
  for (const row of rows || []) results.push(await processRow(client, row, clickupToken));
  return json({ ok: true, processed: results.length, results });
});
