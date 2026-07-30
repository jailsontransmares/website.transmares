import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain"
]);

type AppUser = { id: string; is_master: boolean; perfil_id: string | null; perfil: string | null; status: string };
type DriveFile = { id: string; name: string; mimeType: string; size?: string };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function text(value: unknown) { return String(value ?? "").trim(); }
function safeName(value: string) { return value.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").slice(0, 150) || "arquivo"; }
function escapeDriveQuery(value: string) { return value.replace(/'/g, "\\'"); }
function configured() {
  return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_ROOT_FOLDER_ID"].every((key) => Boolean(Deno.env.get(key)));
}

async function getAccessToken() {
  if (!configured()) throw new Error("Integração do Google Drive ainda não foi configurada pelo administrador.");
  const body = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!, client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN")!, grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Não foi possível autenticar no Google Drive.");
  return result.access_token as string;
}
async function driveFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive recusou a operação (${response.status}). ${detail.slice(0, 240)}`);
  }
  return response;
}
async function driveUpload(metadata: Record<string, unknown>, file: File) {
  const token = await getAccessToken();
  const boundary = `rh-drive-${crypto.randomUUID()}`;
  const prefix = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;
  const payload = new Uint8Array(new TextEncoder().encode(prefix).length + file.size + new TextEncoder().encode(suffix).length);
  payload.set(new TextEncoder().encode(prefix), 0);
  payload.set(new Uint8Array(await file.arrayBuffer()), new TextEncoder().encode(prefix).length);
  payload.set(new TextEncoder().encode(suffix), new TextEncoder().encode(prefix).length + file.size);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: payload
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error("Não foi possível enviar o arquivo ao Google Drive.");
  return result as DriveFile;
}
async function sha256(file: File) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireUser(client: ReturnType<typeof createClient>, authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const { data: auth, error } = await client.auth.getUser(token);
  if (error || !auth?.user?.id) throw new Error("Sessão inválida ou expirada.");
  const { data: user } = await client.from("usuarios").select("id,is_master,perfil_id,perfil,status").eq("auth_user_id", auth.user.id).maybeSingle();
  if (!user || user.status !== "ativo") throw new Error("Usuário sem acesso ativo ao Hub.");
  const profileSlug = text(user.perfil).toLowerCase();
  const { data: profile } = user.perfil_id ? await client.from("perfis").select("slug").eq("id", user.perfil_id).maybeSingle() : { data: null };
  return { user: user as AppUser, isAdmin: Boolean(user.is_master) || ["admin", "administrador"].includes(text(profile?.slug || profileSlug).toLowerCase()) };
}
async function requirePermission(client: ReturnType<typeof createClient>, user: AppUser, isAdmin: boolean, action: string) {
  if (isAdmin) return;
  if (!user.perfil_id) throw new Error("Perfil sem permissão para documentos.");
  const { data } = await client.from("perfil_permissoes").select("permitido").eq("perfil_id", user.perfil_id).eq("recurso_chave", "rh_dp.documentos").eq("acao", action).maybeSingle();
  if (!data?.permitido) throw new Error("Seu perfil não possui permissão para esta operação em documentos.");
}
async function log(client: ReturnType<typeof createClient>, values: Record<string, unknown>) {
  await client.from("rh_drive_operacoes").insert(values).catch(() => null);
}
async function getFolder(client: ReturnType<typeof createClient>, collaborator: { id: string; nome_completo: string }) {
  const { data: saved } = await client.from("rh_drive_pastas").select("google_drive_folder_id").eq("colaborador_id", collaborator.id).maybeSingle();
  if (saved?.google_drive_folder_id) return saved.google_drive_folder_id as string;
  const root = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID")!;
  const name = safeName(`${collaborator.nome_completo} - ${collaborator.id.slice(0, 8)}`);
  const query = encodeURIComponent(`'${escapeDriveQuery(root)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const existing = await driveFetch(`files?q=${query}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`).then((r) => r.json());
  const folderId = existing.files?.[0]?.id || await driveFetch("files?fields=id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [root], writersCanShare: false }) }).then((r) => r.json()).then((r) => r.id);
  if (!folderId) throw new Error("Não foi possível criar a pasta do colaborador no Drive.");
  await client.from("rh_drive_pastas").upsert({ colaborador_id: collaborator.id, google_drive_folder_id: folderId, nome_pasta: name }, { onConflict: "colaborador_id" });
  return folderId as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) return json({ ok: false, message: "Função sem configuração do Supabase." }, 500);
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let parsed: Record<string, unknown> = {};
  let user: AppUser | null = null;
  try {
    const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
    let file: File | null = null;
    if (isMultipart) { const form = await req.formData(); form.forEach((value, key) => { if (key !== "file") parsed[key] = value; }); file = form.get("file") instanceof File ? form.get("file") as File : null; }
    else parsed = await req.json().catch(() => ({}));
    const action = text(parsed.action);
    const identity = await requireUser(client, req.headers.get("Authorization") || ""); user = identity.user;

    if (action === "status") { await requirePermission(client, user, identity.isAdmin, "view"); return json({ ok: true, configured: configured(), max_file_size: MAX_FILE_SIZE }); }
    if (!configured()) return json({ ok: false, message: "A integração do Google Drive ainda não foi configurada pelo administrador." }, 503);

    const fileId = text(parsed.arquivo_id);
    if (action === "upload" || action === "nova_versao") {
      await requirePermission(client, user, identity.isAdmin, action === "upload" ? "create" : "update");
      if (!file || !file.size || file.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Arquivo inválido, tipo não permitido ou maior que 20 MB.");
      let existing: Record<string, unknown> | null = null;
      let collaboratorId = text(parsed.colaborador_id);
      if (action === "nova_versao") { const { data } = await client.from("rh_arquivos_colaboradores").select("*").eq("id", fileId).eq("status", "ativo").maybeSingle(); existing = data; collaboratorId = text(data?.colaborador_id); if (!data) throw new Error("Arquivo ativo não encontrado."); }
      const { data: collaborator } = await client.from("rh_colaboradores").select("id,nome_completo").eq("id", collaboratorId).maybeSingle();
      if (!collaborator) throw new Error("Colaborador não encontrado.");
      const folderId = await getFolder(client, collaborator);
      const stored = await driveUpload({ name: safeName(file.name), parents: [folderId], writersCanShare: false }, file);
      const digest = await sha256(file);
      const now = new Date().toISOString();
      let documentId = fileId;
      let version = 1;
      if (existing) {
        version = Number(existing.versao_atual || 0) + 1;
        const { error } = await client.from("rh_arquivos_colaboradores").update({ nome_arquivo: text(parsed.nome_arquivo) || stored.name, google_drive_file_id: stored.id, google_drive_folder_id: folderId, google_drive_web_url: null, google_drive_preview_url: null, mime_type: stored.mimeType || file.type, tamanho_bytes: file.size, sha256_atual: digest, versao_atual: version, updated_at: now }).eq("id", documentId);
        if (error) throw new Error("Não foi possível registrar a nova versão.");
      } else {
        const record = { colaborador_id: collaboratorId, categoria: text(parsed.categoria), tipo_documento: text(parsed.tipo_documento) || null, nome_arquivo: text(parsed.nome_arquivo) || stored.name, descricao: text(parsed.descricao) || null, origem: "google_drive", google_drive_file_id: stored.id, google_drive_folder_id: folderId, mime_type: stored.mimeType || file.type, tamanho_bytes: file.size, data_referencia: text(parsed.data_referencia) || null, data_validade: text(parsed.data_validade) || null, observacoes: text(parsed.observacoes) || null, versao_atual: 1, sha256_atual: digest };
        const { data, error } = await client.from("rh_arquivos_colaboradores").insert(record).select("id").single();
        if (error || !data?.id) throw new Error("Não foi possível registrar o arquivo no Hub.");
        documentId = data.id;
      }
      await client.from("rh_arquivos_colaboradores_versoes").insert({ arquivo_id: documentId, versao: version, google_drive_file_id: stored.id, nome_arquivo: stored.name, mime_type: stored.mimeType || file.type, tamanho_bytes: file.size, sha256: digest, enviado_por: user.id, enviado_at: now });
      await log(client, { usuario_id: user.id, colaborador_id: collaboratorId, arquivo_id: documentId, acao: action, detalhes: { versao: version, tamanho_bytes: file.size, mime_type: file.type } });
      return json({ ok: true, id: documentId, versao: version });
    }

    const { data: document } = await client.from("rh_arquivos_colaboradores").select("id,colaborador_id,nome_arquivo,google_drive_file_id,mime_type,status").eq("id", fileId).maybeSingle();
    if (!document || document.status !== "ativo" || !document.google_drive_file_id) throw new Error("Arquivo ativo não encontrado.");
    if (action === "baixar") {
      await requirePermission(client, user, identity.isAdmin, "download");
      const drive = await driveFetch(`files/${encodeURIComponent(document.google_drive_file_id)}?alt=media&supportsAllDrives=true`);
      await log(client, { usuario_id: user.id, colaborador_id: document.colaborador_id, arquivo_id: document.id, acao: text(parsed.disposition) === "inline" ? "visualizar" : "baixar", detalhes: {} });
      return new Response(drive.body, { headers: { ...corsHeaders, "Content-Type": drive.headers.get("content-type") || document.mime_type || "application/octet-stream", "Content-Disposition": `${text(parsed.disposition) === "inline" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(document.nome_arquivo)}`, "X-RH-Filename": encodeURIComponent(document.nome_arquivo), "Cache-Control": "no-store" } });
    }
    if (action === "descartar") {
      await requirePermission(client, user, identity.isAdmin, "delete");
      if (!identity.isAdmin) throw new Error("O descarte de arquivos requer confirmação de administrador.");
      const justification = text(parsed.justificativa); if (justification.length < 8) throw new Error("Informe uma justificativa para o descarte.");
      await driveFetch(`files/${encodeURIComponent(document.google_drive_file_id)}?supportsAllDrives=true`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
      await client.from("rh_arquivos_colaboradores").update({ status: "excluido", descartado_motivo: justification, descartado_drive_at: new Date().toISOString() }).eq("id", document.id);
      await log(client, { usuario_id: user.id, colaborador_id: document.colaborador_id, arquivo_id: document.id, acao: "descartar", detalhes: { justificativa: justification } });
      return json({ ok: true });
    }
    return json({ ok: false, message: "Ação não suportada." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no Google Drive.";
    if (user) await log(client, { usuario_id: user.id, acao: "erro", detalhes: { message: message.slice(0, 500) } });
    return json({ ok: false, message }, message.includes("sem permissão") || message.includes("requer confirmação") ? 403 : 400);
  }
});
