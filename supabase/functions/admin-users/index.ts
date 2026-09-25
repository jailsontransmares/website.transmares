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

  return { ...usuario, requester_auth_user_id: authData.user.id };
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
        trocar_senha_proximo_acesso: Boolean(passwordInput) || Boolean(atual.trocar_senha_proximo_acesso),
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
      trocar_senha_proximo_acesso: true,
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

async function completeFirstPasswordChange(serviceClient: ReturnType<typeof createClient>, authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessão não informada.");

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !authData?.user?.id) throw new Error("Sessão inválida.");

  const { data, error } = await serviceClient
    .from("usuarios")
    .update({ trocar_senha_proximo_acesso: false, updated_at: new Date().toISOString() })
    .eq("auth_user_id", authData.user.id)
    .eq("trocar_senha_proximo_acesso", true)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message || "Não foi possível concluir a troca da senha.");
  if (!data) throw new Error("Não há troca de senha pendente para este usuário.");
  return { ok: true };
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
    .select("id, auth_user_id, email, nome")
    .eq("id", id)
    .maybeSingle();

  if (consultaError || !usuario) throw new Error("Usuário não encontrado.");

  const { error: flagError } = await serviceClient
    .from("usuarios")
    .update({ trocar_senha_proximo_acesso: true, updated_at: new Date().toISOString() })
    .eq("id", usuario.id);
  if (flagError) throw new Error(flagError.message || "Não foi possível exigir a troca da senha no próximo acesso.");

  let authUserId = usuario.auth_user_id || "";
  if (authUserId) {
    const { error } = await serviceClient.auth.admin.updateUserById(authUserId, { password });
    if (error) throw new Error(error.message || "Não foi possível alterar a senha.");
  } else {
    const { data: createdAuth, error: createError } = await serviceClient.auth.admin.createUser({
      email: usuario.email,
      password,
      email_confirm: true,
      user_metadata: { name: usuario.nome || usuario.email }
    });
    if (createError || !createdAuth?.user?.id) {
      throw new Error(createError?.message || "Não foi possível criar o acesso no Supabase Auth.");
    }

    authUserId = createdAuth.user.id;
    const { error: linkError } = await serviceClient
      .from("usuarios")
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq("id", usuario.id);
    if (linkError) {
      await serviceClient.auth.admin.deleteUser(authUserId).catch(() => null);
      throw new Error(linkError.message || "Não foi possível vincular o usuário ao Supabase Auth.");
    }
  }

  await registrarAuditoria(serviceClient, {
    p_acao: "usuario.senha_alterar_admin",
    p_recurso: "admin.usuarios",
    p_alvo_usuario_id: usuario.id,
    p_detalhes: { email: usuario.email }
  });

  return { ok: true };
}

async function deleteUser(
  serviceClient: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
  requesterAuthUserId: string
) {
  const id = normalizeText(payload.id);
  if (!id) throw new Error("Informe o usuário que será excluído.");

  const { data: usuario, error: consultaError } = await serviceClient
    .from("usuarios")
    .select("id, auth_user_id, email, nome, perfil, perfil_id, is_master, status")
    .eq("id", id)
    .maybeSingle();

  if (consultaError || !usuario) throw new Error("Usuário não encontrado.");
  if (usuario.auth_user_id && usuario.auth_user_id === requesterAuthUserId) {
    throw new Error("Não é possível excluir o próprio usuário.");
  }

  const { data: perfis, error: perfisError } = await serviceClient
    .from("perfis")
    .select("id, slug, nome")
    .eq("status", "ativo");
  if (perfisError) throw new Error(perfisError.message || "Não foi possível validar os perfis administrativos.");

  const perfisAtivos = new Map((perfis || []).map((perfil) => [
    perfil.id,
    normalizeText(perfil.slug || perfil.nome).toLowerCase()
  ]));
  const ehAdministrador = (registro: Record<string, unknown>) => {
    const slug = perfisAtivos.get(String(registro.perfil_id || "")) || normalizeText(registro.perfil).toLowerCase();
    return registro.is_master === true || slug === "admin" || slug === "administrador";
  };

  const { data: usuariosAtivos, error: ativosError } = await serviceClient
    .from("usuarios")
    .select("id, perfil, perfil_id, is_master")
    .eq("status", "ativo");
  if (ativosError) throw new Error(ativosError.message || "Não foi possível validar os administradores ativos.");

  if (usuario.status === "ativo" && ehAdministrador(usuario) && !(usuariosAtivos || []).some((item) => item.id !== id && ehAdministrador(item))) {
    throw new Error("Não é possível excluir o último administrador ativo. Promova outro usuário antes.");
  }

  const { error: deleteRecordError } = await serviceClient.rpc("app_excluir_usuario_admin", {
    p_usuario_id: id
  });
  if (deleteRecordError) {
    throw new Error(deleteRecordError.message || "Não foi possível excluir o cadastro do Hub.");
  }

  let authDeleted: boolean | null = usuario.auth_user_id ? true : null;
  if (usuario.auth_user_id) {
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(usuario.auth_user_id);
    if (authDeleteError) {
      authDeleted = false;
    }
  }

  await registrarAuditoria(serviceClient, {
    p_acao: "usuario.excluir",
    p_recurso: "admin.usuarios",
    p_detalhes: { usuario_id: usuario.id, email: usuario.email, auth_deleted: authDeleted }
  });

  return {
    record_deleted: true,
    auth_deleted: authDeleted,
    warning: authDeleted ? null : "O cadastro foi removido do Hub, mas a conta do Supabase Auth ainda precisa ser removida."
  };
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

    const payload = await req.json().catch(() => ({}));
    const action = normalizeText(payload.action);

    if (action === "completeFirstPasswordChange") {
      const result = await completeFirstPasswordChange(serviceClient, authorization);
      return jsonResponse({ ok: true, ...result });
    }

    const admin = await requireAdmin(serviceClient, authorization);

    if (action === "saveUser") {
      const result = await saveUser(serviceClient, payload);
      return jsonResponse({ ok: true, ...result });
    }

    if (action === "setPassword") {
      const result = await setPassword(serviceClient, payload);
      return jsonResponse({ ok: true, ...result });
    }

    if (action === "deleteUser") {
      const result = await deleteUser(serviceClient, payload, String(admin.requester_auth_user_id || ""));
      return jsonResponse({ ok: true, ...result });
    }

    return jsonResponse({ ok: false, message: "Ação não suportada." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado na gestão de usuários.";
    return jsonResponse({ ok: false, message }, 400);
  }
});

