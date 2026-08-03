import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type AppUser = {
  id: string;
  status: string;
  is_master: boolean;
  perfil_id: string | null;
  perfil: string | null;
};

const CRM_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado no CRM AR.";
  const token = clickUpToken();
  return token ? message.replaceAll(token, "[secret redacted]") : message;
}

function isMissingInteractionTable(error: unknown) {
  const item = error as Record<string, unknown> | null;
  return text(item?.code) === "42P01" || /relation .* does not exist/i.test(text(item?.message));
}

function clickUpListSecret() {
  return text(
    Deno.env.get("CLICKUP_LIST_IDS") ||
    Deno.env.get("CLICKUP_LIST_ID") ||
    Deno.env.get("List ID _ CRM.AR") ||
    Deno.env.get("Lista ID _ CRM.AR") ||
    Deno.env.get("ID Lista _ CRM.AR")
  );
}

function listIds() {
  const raw = clickUpListSecret();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
  } catch (_error) {
    // Aceita também o formato simples: lista1,lista2.
  }

  return raw.split(/[;,\s]+/).map(text).filter(Boolean);
}

function clickUpConfigured() {
  const configuration = clickUpConfiguration();
  return configuration.token && configuration.listas > 0;
}

function clickUpToken() {
  return text(Deno.env.get("CLICKUP_API_TOKEN") || Deno.env.get("API Token _ CRM.AR"));
}

function clickUpConfiguration() {
  const listas = listIds();
  return {
    token: Boolean(clickUpToken()),
    listas: listas.length,
    fonteListas: listas.length ? "secret configurado" : null
  };
}

function dateFromEpoch(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizedCpf(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  return digits.length === 11 ? digits : "";
}

function customFieldValue(fields: unknown, terms: string[]) {
  if (!Array.isArray(fields)) return "";
  const field = fields.find((candidate) => {
    const item = candidate as Record<string, unknown>;
    const name = text(item.name || item.field_name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return terms.some((term) => name.includes(term));
  }) as Record<string, unknown> | undefined;
  if (!field) return "";
  return text(field.display_value || field.value || field.valor_original);
}

function normalizeCustomFields(fields: unknown) {
  if (!Array.isArray(fields)) return [];

  return fields.map((field) => {
    const item = field as Record<string, unknown>;
    const config = item.type_config as Record<string, unknown> | null;
    const options = Array.isArray(config?.options) ? config.options as Record<string, unknown>[] : [];
    const rawValue = item.value;
    const rawId = rawValue && typeof rawValue === "object"
      ? ((rawValue as Record<string, unknown>).id ?? (rawValue as Record<string, unknown>).orderindex)
      : rawValue;
    const option = options.find((candidate) => [candidate.id, candidate.orderindex, candidate.value].some((value) => text(value) === text(rawId)));

    return {
      ...item,
      valor_original: rawValue ?? null,
      display_value: option ? text(option.name || option.label || option.value) : text((rawValue as Record<string, unknown> | null)?.name || rawValue)
    };
  });
}

function normalizeTask(task: Record<string, unknown>) {
  const status = task.status as Record<string, unknown> | null;
  const assignees = Array.isArray(task.assignees) ? task.assignees as Record<string, unknown>[] : [];
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

async function requireUser(client: ReturnType<typeof createClient>, authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessão não informada.");

  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth?.user?.id) throw new Error("Sessão inválida ou expirada.");

  const { data: user, error: userError } = await client
    .from("usuarios")
    .select("id,status,is_master,perfil_id,perfil")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();

  if (userError || !user || user.status !== "ativo") {
    throw new Error("Usuário sem acesso ativo ao Hub.");
  }

  return user as AppUser;
}

function isAdmin(user: AppUser) {
  return Boolean(user.is_master) || ["admin", "administrador"].includes(text(user.perfil).toLowerCase());
}

async function requirePermission(client: ReturnType<typeof createClient>, user: AppUser, action: string) {
  if (isAdmin(user)) return;

  const { data: override } = await client
    .from("usuario_permissoes")
    .select("efeito")
    .eq("usuario_id", user.id)
    .eq("recurso_chave", "painel_ar.crm")
    .eq("acao", action)
    .maybeSingle();

  if (override?.efeito === "negar") throw new Error("Seu usuário não possui permissão para esta operação no CRM AR.");
  if (override?.efeito === "permitir") return;

  if (!user.perfil_id) throw new Error("Perfil sem permissão para o CRM AR.");

  const { data: permission } = await client
    .from("perfil_permissoes")
    .select("permitido")
    .eq("perfil_id", user.perfil_id)
    .eq("recurso_chave", "painel_ar.crm")
    .eq("acao", action)
    .maybeSingle();

  if (!permission?.permitido) throw new Error("Seu perfil não possui permissão para esta operação no CRM AR.");
}

async function clickupRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", clickUpToken());
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`https://api.clickup.com/api/v2/${path}`, { ...options, headers });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("O ClickUp atingiu o limite de requisições. Tente novamente em alguns instantes.");
    throw new Error(`O ClickUp recusou a importação (${response.status}). ${detail.slice(0, 220)}`);
  }

  if (response.status === 204) return {};
  return response.json().catch(() => ({}));
}

async function clickupFetch(path: string) {
  return clickupRequest(path);
}

async function carregarTarefasClickUp() {
  const tasks: Record<string, unknown>[] = [];

  for (const listId of listIds()) {
    for (let page = 0; page < 100; page += 1) {
      const params = new URLSearchParams({
        include_closed: "true",
        subtasks: "true",
        include_timl: "true",
        order_by: "updated",
        reverse: "true",
        page: String(page)
      });
      const result = await clickupFetch(`list/${encodeURIComponent(listId)}/task?${params}`);
      const pageTasks = Array.isArray(result?.tasks) ? result.tasks as Record<string, unknown>[] : [];
      tasks.push(...pageTasks);
      if (pageTasks.length < 100) break;
    }
  }

  return Array.from(new Map(tasks.map(task => [text(task.id), task])).values()).filter(task => text(task.id));
}

async function upsertTask(client: ReturnType<typeof createClient>, task: Record<string, unknown>, now: string) {
  const taskId = text(task.id);
  const payload = normalizeTask(task);
  const { data: mapping, error: mappingError } = await client
    .from("ar_crm_clickup_mapping")
    .select("id,item_id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (mappingError) throw mappingError;

  if (mapping?.item_id) {
    const { error } = await client.from("ar_crm_items").update(payload).eq("id", mapping.item_id);
    if (error) throw error;
    await client.from("ar_crm_clickup_mapping").update({ last_clickup_updated_at: task.date_updated ? new Date(Number(task.date_updated)).toISOString() : null, last_synced_at: now, updated_at: now }).eq("id", mapping.id);
    return "updated";
  }

  const { data: item, error: itemError } = await client.from("ar_crm_items").insert(payload).select("id").single();
  if (itemError || !item) throw itemError || new Error("Não foi possível criar o registro local do CRM.");

  const { error: insertMappingError } = await client.from("ar_crm_clickup_mapping").insert({
    item_id: item.id,
    workspace_id: text((task.team_id as unknown) || ((task.workspace as Record<string, unknown> | null)?.id)),
    list_id: text((task.list as Record<string, unknown> | null)?.id),
    folder_id: text((task.folder as Record<string, unknown> | null)?.id),
    task_id: taskId,
    last_clickup_updated_at: task.date_updated ? new Date(Number(task.date_updated)).toISOString() : null,
    last_synced_at: now,
    updated_at: now
  });
  if (insertMappingError) throw insertMappingError;
  return "created";
}

async function carregarItensCrm(client: ReturnType<typeof createClient>, pagina = 1, limite = 20) {
  const pageSize = Math.max(1, Math.min(Number(limite) || 20, 20));
  const pageNumber = Math.max(1, Number(pagina) || 1);
  const offset = (pageNumber - 1) * pageSize;
  const { data, count, error } = await client
    .from("ar_crm_items")
    .select("id,nome,status,responsavel,data_vencimento,sync_status,last_synced_at,dados", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { items: data || [], totalItens: count || 0, pagina: pageNumber };
}

async function getData(client: ReturnType<typeof createClient>, payload = {}) {
  const [{ data: runs, error: runsError }, paginacao] = await Promise.all([
    client.from("ar_crm_sync_runs").select("finished_at,status").in("status", ["success", "partial"]).order("created_at", { ascending: false }).limit(1),
    carregarItensCrm(client, payload.pagina, payload.limite)
  ]);

  if (runsError) throw runsError;

  return {
    items: paginacao.items,
    totalItens: paginacao.totalItens,
    pagina: paginacao.pagina,
    configurado: clickUpConfigured(),
    configuracao: clickUpConfiguration(),
    ultimaSincronizacao: runs?.[0]?.finished_at || null
  };
}

async function getRelatedByCpf(client: ReturnType<typeof createClient>, payload = {}) {
  const cpf = normalizedCpf(payload.cpf);
  if (!cpf) throw new Error("CPF inválido para localizar pedidos relacionados.");

  const { data, error } = await client
    .from("ar_crm_items")
    .select("id,nome,dados")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const items = (data || []).filter((item) => {
    const fields = (item.dados as Record<string, unknown> | null)?.campos_personalizados;
    return normalizedCpf(customFieldValue(fields, ["cpf"])) === cpf;
  }).map((item) => ({
    id: item.id,
    nome: item.nome,
    campos_personalizados: (item.dados as Record<string, unknown> | null)?.campos_personalizados || []
  }));

  return { cpf, items };
}

function dateToEpoch(value: unknown) {
  const date = text(value);
  if (!date) return null;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) throw new Error("Data de vencimento inválida.");
  return timestamp;
}

async function updateTaskFromHub(client: ReturnType<typeof createClient>, payload = {}) {
  const taskId = text(payload.taskId);
  const itemId = text(payload.itemId);
  const changes = payload.changes as Record<string, unknown> | null;
  if (!taskId || !changes || typeof changes !== "object") {
    throw new Error("Informe a tarefa e as alterações.");
  }

  const { data: mapping, error: mappingError } = await client
    .from("ar_crm_clickup_mapping")
    .select("id,item_id,task_id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (mappingError) throw mappingError;
  if (!mapping?.item_id || (itemId && mapping.item_id !== itemId)) {
    throw new Error("A tarefa não pertence aos cadastros disponíveis no CRM AR.");
  }

  const { data: item, error: itemError } = await client
    .from("ar_crm_items")
    .select("id,nome,status,responsavel,data_vencimento,dados")
    .eq("id", mapping.item_id)
    .single();
  if (itemError || !item) throw itemError || new Error("Cadastro do CRM não encontrado.");

  const localChanges: Record<string, unknown> = {};
  const clickupChanges: Record<string, unknown> = {};
  const dados = { ...((item.dados || {}) as Record<string, unknown>) };

  if (Object.prototype.hasOwnProperty.call(changes, "name")) {
    const name = text(changes.name);
    if (!name) throw new Error("O nome da tarefa não pode ficar vazio.");
    localChanges.nome = name;
    dados.nome = name;
    clickupChanges.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(changes, "status")) {
    const status = text(changes.status);
    if (!status) throw new Error("O status da tarefa não pode ficar vazio.");
    localChanges.status = status;
    clickupChanges.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(changes, "due_date")) {
    const dueDate = text(changes.due_date) || null;
    localChanges.data_vencimento = dueDate;
    clickupChanges.due_date = dateToEpoch(dueDate);
    clickupChanges.due_date_time = false;
  }
  if (Object.prototype.hasOwnProperty.call(changes, "description")) {
    const description = text(changes.description);
    dados.descricao = description || null;
    clickupChanges.description = description || " ";
  }
  if (Object.prototype.hasOwnProperty.call(changes, "priority")) {
    const priority = changes.priority === null || changes.priority === "" ? null : Number(changes.priority);
    if (priority !== null && !Number.isInteger(priority)) throw new Error("Prioridade inválida.");
    dados.prioridade = priority;
    clickupChanges.priority = priority;
  }

  if (Object.prototype.hasOwnProperty.call(changes, "custom_fields")) {
    const requestedFields = Array.isArray(changes.custom_fields) ? changes.custom_fields : [];
    const currentFields = Array.isArray(dados.campos_personalizados) ? dados.campos_personalizados as Record<string, unknown>[] : [];
    const customFields = requestedFields.flatMap((requested) => {
      const change = requested as Record<string, unknown>;
      const fieldId = text(change.id);
      const current = currentFields.find((field) => text(field.id) === fieldId);
      if (!fieldId || !current) throw new Error("Campo personalizado inválido para este cadastro.");
      if (!Object.prototype.hasOwnProperty.call(change, "value")) throw new Error("Valor do campo personalizado não informado.");
      const value = change.value;
      const type = text(current.type).toLowerCase();
      if (!["text", "short_text", "textarea", "date", "number", "currency", "dropdown", "drop_down", "url", "email", "phone"].includes(type)) {
        throw new Error(`O tipo do campo "${text(current.name || current.field_name)}" ainda não é editável.`);
      }
      const isDropdown = type === "dropdown" || type === "drop_down";
      const isEmptyDropdown = isDropdown && (value === null || value === undefined || text(value) === "");
      const clickupValue = type === "date" && text(value)
        ? dateToEpoch(value)
        : isDropdown && typeof value === "string" && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : value;
      const updated = { ...current, value, valor_original: value, display_value: text(value) || "—" };
      currentFields[currentFields.indexOf(current)] = updated;
      return isEmptyDropdown ? [{ id: fieldId, clear: true }] : [{ id: fieldId, value: clickupValue }];
    });
    dados.campos_personalizados = currentFields;
    if (customFields.length) clickupChanges.custom_fields = customFields;
  }

  if (!Object.keys(clickupChanges).length) throw new Error("Nenhuma alteração suportada foi informada.");

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from("ar_crm_items")
    .update({ ...localChanges, dados, sync_status: "pending", updated_at: now })
    .eq("id", mapping.item_id);
  if (updateError) throw updateError;

  const { data: queued, error: queueError } = await client
    .from("ar_crm_sync_outbox")
    .insert({
      item_id: mapping.item_id,
      task_id: taskId,
      action: "update",
      payload: clickupChanges,
      status: "pending",
      available_at: now,
      updated_at: now
    })
    .select("id")
    .single();
  if (queueError || !queued) throw queueError || new Error("Não foi possível enfileirar a atualização.");

  return { queued: true, outboxId: queued.id, taskId, itemId: mapping.item_id };
}

async function carregarUsuariosAtivos(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("usuarios")
    .select("id,nome,email")
    .eq("status", "ativo")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => ({
    id: text(item.id),
    nome: text(item.nome) || text(item.email) || "Usuário",
    email: text(item.email)
  })).filter((item) => item.id);
}

async function getTaskActivity(_client: ReturnType<typeof createClient>, payload = {}, user: AppUser) {
  const taskId = text(payload.taskId);
  const itemId = text(payload.itemId);
  if (!taskId) throw new Error("Cadastro sem tarefa do ClickUp vinculada.");
  await requireMappedTask(_client, taskId, itemId);
  const [task, comments, activeUsers] = await Promise.all([
    clickupFetch(`task/${encodeURIComponent(taskId)}`),
    carregarComentariosTarefa(taskId),
    carregarUsuariosAtivos(_client)
  ]);
  return {
    comments: await organizarComentariosHub(_client, taskId, comments),
    attachments: Array.isArray(task?.attachments) ? task.attachments : [],
    activeUsers,
    viewerId: user.id,
    taskId,
    itemId
  };
}

async function requireMappedTask(client: ReturnType<typeof createClient>, taskId: string, itemId = "") {
  let query = client
    .from("ar_crm_clickup_mapping")
    .select("task_id")
    .eq("task_id", taskId)
    .limit(1);
  if (itemId) query = query.eq("item_id", itemId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data?.task_id) throw new Error("A tarefa não pertence aos cadastros disponíveis no CRM AR.");
  return taskId;
}

async function carregarComentariosTarefa(taskId: string, stopAtCommentId = "") {
  const comentarios = [] as Record<string, unknown>[];
  let start = "";
  let startId = "";

  for (let pagina = 0; pagina < 50; pagina += 1) {
    const params = new URLSearchParams();
    if (start && startId) {
      params.set("start", start);
      params.set("start_id", startId);
    }
    const query = params.toString();
    const response = await clickupFetch(`task/${encodeURIComponent(taskId)}/comment${query ? `?${query}` : ""}`);
    const paginaComentarios = Array.isArray(response?.comments) ? response.comments as Record<string, unknown>[] : [];
    comentarios.push(...paginaComentarios);
    if (stopAtCommentId && paginaComentarios.some((comentario) => text(comentario.id) === stopAtCommentId)) break;
    if (paginaComentarios.length < 25) break;
    const ultimo = paginaComentarios[paginaComentarios.length - 1];
    const proximoStart = text(ultimo.date);
    const proximoStartId = text(ultimo.id);
    if (!proximoStart || !proximoStartId || (proximoStart === start && proximoStartId === startId)) break;
    start = proximoStart;
    startId = proximoStartId;
  }

  return comentarios;
}

function comentarioCriadoId(response: unknown) {
  const item = response as Record<string, unknown>;
  const comment = item?.comment as Record<string, unknown> | null;
  const data = item?.data as Record<string, unknown> | null;
  return text(item?.id || comment?.id || data?.id);
}

async function organizarComentariosHub(client: ReturnType<typeof createClient>, taskId: string, comentarios: unknown[]) {
  const [linksResult, reactionsResult, mentionsResult] = await Promise.all([
    client.from("ar_crm_comment_links").select("clickup_comment_id,parent_clickup_comment_id").eq("task_id", taskId),
    client.from("ar_crm_comment_reactions").select("clickup_comment_id,user_id,emoji").eq("task_id", taskId),
    client.from("ar_crm_comment_mentions").select("clickup_comment_id,user_id,display_name").eq("task_id", taskId)
  ]);
  if (linksResult.error) throw linksResult.error;
  if (reactionsResult.error && !isMissingInteractionTable(reactionsResult.error)) throw reactionsResult.error;
  if (mentionsResult.error && !isMissingInteractionTable(mentionsResult.error)) throw mentionsResult.error;

  const linksByChild = new Map((linksResult.data || []).map((link) => [text(link.clickup_comment_id), text(link.parent_clickup_comment_id)]));
  const reactionsByComment = new Map<string, Record<string, unknown>[]>();
  for (const reaction of reactionsResult.error ? [] : (reactionsResult.data || [])) {
    const key = text(reaction.clickup_comment_id);
    const list = reactionsByComment.get(key) || [];
    list.push({ user_id: text(reaction.user_id), emoji: text(reaction.emoji) });
    reactionsByComment.set(key, list);
  }
  const mentionsByComment = new Map<string, Record<string, unknown>[]>();
  for (const mention of mentionsResult.error ? [] : (mentionsResult.data || [])) {
    const key = text(mention.clickup_comment_id);
    const list = mentionsByComment.get(key) || [];
    list.push({ user_id: text(mention.user_id), display_name: text(mention.display_name) });
    mentionsByComment.set(key, list);
  }

  const nodes = (comentarios || []).map((comentario) => {
    const item = comentario as Record<string, unknown>;
    const commentId = text(item.id);
    return {
      ...item,
      hub_reactions: reactionsByComment.get(commentId) || [],
      hub_mentions: mentionsByComment.get(commentId) || [],
      replies: [] as Record<string, unknown>[]
    };
  });
  const byId = new Map(nodes.map((comentario) => [text(comentario.id), comentario]));
  const roots: Record<string, unknown>[] = [];

  for (const comentario of nodes) {
    const parentId = linksByChild.get(text(comentario.id));
    const parent = parentId ? byId.get(parentId) : null;
    if (parent) (parent.replies as Record<string, unknown>[]).push(comentario);
    else roots.push(comentario);
  }

  return roots;
}

function comentarioPertence(comentarios: unknown[], commentId: string): boolean {
  return comentarios.some((comentario) => {
    const item = comentario as Record<string, unknown>;
    const replies = Array.isArray(item.replies) ? item.replies : [];
    return text(item.id) === commentId || comentarioPertence(replies, commentId);
  });
}

async function requireMappedComment(client: ReturnType<typeof createClient>, taskId: string, commentId: string) {
  await requireMappedTask(client, taskId);
  const comentarios = await carregarComentariosTarefa(taskId, commentId);
  if (!comentarioPertence(comentarios, commentId)) throw new Error("O comentário não pertence à tarefa informada.");
}

async function persistCommentMentions(client: ReturnType<typeof createClient>, taskId: string, commentId: string, mentions: unknown[], createdBy: string) {
  if (!commentId || !Array.isArray(mentions) || !mentions.length) return;
  const activeUsers = await carregarUsuariosAtivos(client);
  const activeById = new Map(activeUsers.map((item) => [item.id, item]));
  const rows = mentions.map((mention) => {
    const item = mention as Record<string, unknown>;
    const activeUser = activeById.get(text(item.userId));
    return activeUser ? {
      task_id: taskId,
      clickup_comment_id: commentId,
      user_id: activeUser.id,
      display_name: activeUser.nome,
      created_by: createdBy
    } : null;
  }).filter(Boolean);
  if (!rows.length) return;
  const { error } = await client.from("ar_crm_comment_mentions").upsert(rows, { onConflict: "task_id,clickup_comment_id,user_id,display_name" });
  if (error) throw error;
}

async function createTaskComment(_client: ReturnType<typeof createClient>, payload = {}, user: AppUser) {
  const taskId = text(payload.taskId);
  const commentText = text(payload.commentText);
  if (!taskId || !commentText) throw new Error("Informe a tarefa e o texto do comentário.");
  await requireMappedTask(_client, taskId);
  const created = await clickupRequest(`task/${encodeURIComponent(taskId)}/comment`, { method: "POST", body: JSON.stringify({ comment_text: commentText, notify_all: false }) });
  await persistCommentMentions(_client, taskId, comentarioCriadoId(created), payload.mentions, user.id);
  return created;
}

async function createThreadedComment(_client: ReturnType<typeof createClient>, payload = {}, user: AppUser) {
  const taskId = text(payload.taskId);
  const commentId = text(payload.commentId);
  const commentText = text(payload.commentText);
  if (!taskId || !commentId || !commentText) throw new Error("Informe a tarefa, o comentário e o texto da resposta.");
  await requireMappedComment(_client, taskId, commentId);
  const created = await clickupRequest(`task/${encodeURIComponent(taskId)}/comment`, { method: "POST", body: JSON.stringify({ comment_text: commentText, notify_all: false }) });
  const createdId = comentarioCriadoId(created);
  if (!createdId) throw new Error("O comentário foi enviado, mas não foi possível registrar a referência visual no HUB.");

  const { error } = await _client.from("ar_crm_comment_links").upsert({
    task_id: taskId,
    clickup_comment_id: createdId,
    parent_clickup_comment_id: commentId,
    created_by: user.id
  }, { onConflict: "task_id,clickup_comment_id" });
  if (error) throw error;
  await persistCommentMentions(_client, taskId, createdId, payload.mentions, user.id);
  return created;
}

async function toggleCommentReaction(_client: ReturnType<typeof createClient>, payload = {}, user: AppUser) {
  const taskId = text(payload.taskId);
  const commentId = text(payload.commentId);
  const emoji = text(payload.emoji);
  if (!taskId || !commentId || !CRM_REACTION_EMOJIS.includes(emoji)) throw new Error("Reação inválida.");
  await requireMappedComment(_client, taskId, commentId);

  const { data: existing, error: existingError } = await _client
    .from("ar_crm_comment_reactions")
    .select("id")
    .eq("task_id", taskId)
    .eq("clickup_comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await _client.from("ar_crm_comment_reactions").delete().eq("id", existing.id);
    if (error) throw error;
    return { active: false };
  }

  const { error } = await _client.from("ar_crm_comment_reactions").insert({
    task_id: taskId,
    clickup_comment_id: commentId,
    user_id: user.id,
    emoji
  });
  if (error) throw error;
  return { active: true };
}

async function updateTaskComment(_client: ReturnType<typeof createClient>, payload = {}) {
  const taskId = text(payload.taskId);
  const commentId = text(payload.commentId);
  const commentText = text(payload.commentText);
  if (!taskId || !commentId || !commentText) throw new Error("Informe a tarefa, o comentário e o novo texto.");
  await requireMappedComment(_client, taskId, commentId);
  return clickupRequest(`comment/${encodeURIComponent(commentId)}`, { method: "PUT", body: JSON.stringify({ comment_text: commentText, resolved: false }) });
}

async function deleteTaskComment(_client: ReturnType<typeof createClient>, payload = {}) {
  const taskId = text(payload.taskId);
  const commentId = text(payload.commentId);
  if (!taskId || !commentId) throw new Error("Informe a tarefa e o comentário.");
  await requireMappedComment(_client, taskId, commentId);
  return clickupRequest(`comment/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

async function addTaskAttachment(_client: ReturnType<typeof createClient>, payload = {}) {
  const taskId = text(payload.taskId);
  const filename = text(payload.filename);
  const base64 = text(payload.contentBase64);
  if (!taskId || !filename || !base64) throw new Error("Arquivo ou tarefa não informado.");
  await requireMappedTask(_client, taskId);
  const encoded = base64.replace(/^data:[^;]+;base64,/, "");
  if (encoded.length > Math.ceil(10 * 1024 * 1024 * 4 / 3) + 4) throw new Error("O arquivo deve ter no máximo 10 MB.");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 10 MB.");
  const form = new FormData();
  form.append("attachment[0]", new Blob([bytes], { type: text(payload.contentType) || "application/octet-stream" }), filename);
  return clickupRequest(`task/${encodeURIComponent(taskId)}/attachment`, { method: "POST", body: form });
}

async function sync(client: ReturnType<typeof createClient>) {
  if (!clickUpConfigured()) throw new Error("Integração ClickUp ainda não configurada pelo administrador.");

  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await client
    .from("ar_crm_sync_runs")
    .update({ status: "partial", mensagem_erro: "Execução encerrada por timeout ou nova tentativa.", finished_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("created_at", staleBefore);

  const { data: activeRun } = await client
    .from("ar_crm_sync_runs")
    .select("id")
    .eq("status", "running")
    .gte("created_at", staleBefore)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRun?.id) throw new Error("Já existe uma sincronização do CRM em andamento. Aguarde a conclusão.");

  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await client.from("ar_crm_sync_runs").insert({ origem: "manual", status: "running", started_at: startedAt }).select("id").single();
  if (runError || !run) throw runError || new Error("Não foi possível iniciar a sincronização.");

  try {
    const tasks = await carregarTarefasClickUp();
    let created = 0;
    let updated = 0;

    const batchSize = 50;
    for (let index = 0; index < tasks.length; index += batchSize) {
      const batch = tasks.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map((task) => upsertTask(client, task, new Date().toISOString()))
      );
      created += results.filter((result) => result === "created").length;
      updated += results.filter((result) => result === "updated").length;
    }

    const finishedAt = new Date().toISOString();
    await client.from("ar_crm_sync_runs").update({ status: "success", total_processados: tasks.length, total_criados: created, total_atualizados: updated, finished_at: finishedAt }).eq("id", run.id);
    return { totalProcessados: tasks.length, totalCriados: created, totalAtualizados: updated, finishedAt };
  } catch (error) {
    const message = safeErrorMessage(error);
    await client.from("ar_crm_sync_runs").update({ status: "error", mensagem_erro: message, finished_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ ok: false, message: "Função sem configuração do Supabase." }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const user = await requireUser(client, req.headers.get("Authorization") || "");
    const payload = await req.json().catch(() => ({}));
    const action = text(payload.action);
    const actionRequiresExecution = action === "sync" || action === "updateTask" || action === "createComment" || action === "replyComment" || action === "toggleReaction" || action === "updateComment" || action === "deleteComment" || action === "addAttachment";
    await requirePermission(client, user, actionRequiresExecution ? "execute" : "view");

    if (action === "getData") return jsonResponse({ ok: true, ...(await getData(client, payload)) });
    if (action === "getRelatedByCpf") return jsonResponse({ ok: true, ...(await getRelatedByCpf(client, payload)) });
    if (action === "updateTask") return jsonResponse({ ok: true, data: await updateTaskFromHub(client, payload) });
    if (action === "getTaskActivity") return jsonResponse({ ok: true, ...(await getTaskActivity(client, payload, user)) });
    if (action === "createComment") return jsonResponse({ ok: true, data: await createTaskComment(client, payload, user) });
    if (action === "replyComment") return jsonResponse({ ok: true, data: await createThreadedComment(client, payload, user) });
    if (action === "toggleReaction") return jsonResponse({ ok: true, data: await toggleCommentReaction(client, payload, user) });
    if (action === "updateComment") return jsonResponse({ ok: true, data: await updateTaskComment(client, payload) });
    if (action === "deleteComment") return jsonResponse({ ok: true, data: await deleteTaskComment(client, payload) });
    if (action === "addAttachment") return jsonResponse({ ok: true, data: await addTaskAttachment(client, payload) });
    if (action === "sync") return jsonResponse({ ok: true, ...(await sync(client)) });
    return jsonResponse({ ok: false, message: "Ação não suportada." }, 400);
  } catch (error) {
    const message = safeErrorMessage(error);
    return jsonResponse({ ok: false, message }, 400);
  }
});
