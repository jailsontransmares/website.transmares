import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const VALID_STATUSES = new Set(["pendente", "ativo", "bloqueado", "inativo", "arquivado"]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  const status = normalizeText(value).toLowerCase();
  return VALID_STATUSES.has(status) ? status : "ativo";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => chars[byte % chars.length]).join("");
}

async function requireAdmin(serviceClient: ReturnType<typeof createClient>, authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new Error("Sessão não informada.");
  }

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    throw new Error("Sessão inválida.");
  }

  const { data: usuario, error: usuarioError } = await serviceClient
    .from("usuarios")
    .select("id, status, is_master, perfil, perfil_id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (usuarioError || !usuario) {
    throw new Error("Usuário administrativo não encontrado.");
  }

  if (usuario.status !== "ativo") {
    throw new Error("Usuário administrativo inativo.");
  }

  let perfilSlug = normalizeText(usuario.perfil).toLowerCase();

  if (usuario.perfil_id) {
    const { data: perfil } = await serviceClient
      .from("perfis")
      .select("slug, nome")
      .eq("id", usuario.perfil_id)
      .maybeSingle();

    perfilSlug = normalizeText(perfil?.slug || perfil?.nome || perfilSlug).toLowerCase();
  }

  if (!usuario.is_master && perfilSlug !== "admin" && perfilSlug !== "administrador") {
    throw new Error("Acesso permitido apenas para administrador.");
  }

  return usuario;
}

async function registrarAuditoria(serviceClient: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  try {
    await serviceClient.rpc("app_registrar_auditoria", params);
  } catch (_error) {
    // Auditoria é complementar. Não bloqueia o fluxo administrativo principal.
  }
}

async function saveUser(serviceClient: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  const user = (payload.user || {}) as Record<string, unknown>;
  const id = normalizeText(user.id);
  const nome = normalizeText(user.nome);
  const email = normalizeEmail(user.email);
  const perfilId = normalizeText(user.perfil_id) || null;
  const status = normalizeStatus(user.status);
  const cpf = normalizeText(user.cpf) || null;
  const telefone = normalizeText(user.telefone) || null;
  const passwordInput = normalizeText(user.password || user.senha_temporaria);

  if (!nome) {
    throw new Error("Informe o nome do usuário.");
  }

  if (!email) {
    throw new Error("Informe o e-mail do usuário.");
  }

  if (!perfilId) {
    throw new Error("Informe o perfil do usuário.");
  }

  let authUserId = "";
  let temporaryPassword = "";

  if (id) {
    const { data: atual, error: consultaError } = await serviceClient
      .from("usuarios")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (consultaError || !atual) {
      throw new Error("Usuário não encontrado.");
    }

    authUserId = atual.auth_user_id || "";

    if (authUserId) {
      const authPayload: Record<string, unknown> = {
        email,
        user_metadata: { name: nome }
      };

      if (passwordInput) {
        if (passwordInput.length < 6) {
          throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        }
        authPayload.password = passwordInput;
        temporaryPassword = passwordInput;
      }

      const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(authUserId, authPayload);

      if (authUpdateError) {
        throw new Error(authUpdateError.message || "Não foi possível atualizar o acesso no Supabase Auth.");
      }
    } else if (passwordInput) {
      const { data: createdAuth, error: authCreateError } = await serviceClient.auth.admin.createUser({
        email,
        password: passwordInput,
        email_confirm: true,
        user_metadata: { name: nome }
      });

      if (authCreateError || !createdAuth?.user?.id) {
        throw new Error(authCreateError?.message || "Não foi possível criar o acesso no Supabase Auth.");
      }

      authUserId = createdAuth.user.id;
      temporaryPassword = passwordInput;
    }

    const { data, error } = await serviceClient
      .from("usuarios")
      .update({
        auth_user_id: authUserId || null,
        nome,
        email,
        perfil_id: perfilId,
        status,
        cpf,
        telefone,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message || "Não foi possível atualizar o usuário.");
    }

    await registrarAuditoria(serviceClient, {
      p_acao: "usuario.atualizar",
      p_recurso: "admin.usuarios",
      p_alvo_usuario_id: data.id,
      p_detalhes: { email, status, perfil_id: perfilId }
    });

    return { record: data, temporary_password: temporaryPassword || null };
  }

  temporaryPassword = passwordInput || generatePassword();

  if (temporaryPassword.length < 6) {
    throw new Error("A senha inicial deve ter pelo menos 6 caracteres.");
  }

  const { data: createdAuth, error: authCreateError } = await serviceClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name: nome }
  });

  if (authCreateError || !createdAuth?.user?.id) {
    throw new Error(authCreateError?.message || "Não foi possível criar o acesso no Supabase Auth.");
  }

  authUserId = createdAuth.user.id;

  const { data, error } = await serviceClient
    .from("usuarios")
    .insert({
      auth_user_id: authUserId,
      nome,
      email,
      perfil_id: perfilId,
      status,
      cpf,
      telefone
    })
    .select("*")
    .single();

  if (error) {
    await serviceClient.auth.admin.deleteUser(authUserId).catch(() => null);
    throw new Error(error.message || "Não foi possível salvar o usuário.");
  }

  await registrarAuditoria(serviceClient, {
    p_acao: "usuario.criar",
    p_recurso: "admin.usuarios",
    p_alvo_usuario_id: data.id,
    p_detalhes: { email, status, perfil_id: perfilId }
  });

  return { record: data, temporary_password: temporaryPassword };
}

async function setPassword(serviceClient: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  const id = normalizeText(payload.id);
  const password = normalizeText(payload.password);

  if (!id) {
    throw new Error("Informe o usuário.");
  }

  if (password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  const { data: usuario, error: consultaError } = await serviceClient
    .from("usuarios")
    .select("id, auth_user_id, email")
    .eq("id", id)
    .maybeSingle();

  if (consultaError || !usuario?.auth_user_id) {
    throw new Error("Usuário sem vínculo com Supabase Auth.");
  }

  const { error } = await serviceClient.auth.admin.updateUserById(usuario.auth_user_id, { password });

  if (error) {
    throw new Error(error.message || "Não foi possível alterar a senha.");
  }

  await registrarAuditoria(serviceClient, {
    p_acao: "usuario.senha_alterar_admin",
    p_recurso: "admin.usuarios",
    p_alvo_usuario_id: usuario.id,
    p_detalhes: { email: usuario.email }
  });

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Variáveis do Supabase não configuradas na Edge Function.");
    }

    const authorization = req.headers.get("Authorization") || "";
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    await requireAdmin(serviceClient, authorization);

    const payload = await req.json().catch(() => ({}));
    const action = normalizeText(payload.action);

    if (action === "saveUser") {
      const result = await saveUser(serviceClient, payload);
      return jsonResponse({ ok: true, ...result });
    }

    if (action === "setPassword") {
      const result = await setPassword(serviceClient, payload);
      return jsonResponse({ ok: true, ...result });
    }

    return jsonResponse({ ok: false, message: "Ação não suportada." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado na gestão de usuários.";
    return jsonResponse({ ok: false, message }, 400);
  }
});

