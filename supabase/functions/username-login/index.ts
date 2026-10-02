import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function getPublishableKey() {
  const keyMap = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keyMap) {
    try {
      const keys = JSON.parse(keyMap);
      if (keys.default) return String(keys.default);
    } catch (_error) {
      // Use the legacy injected key below when the project has not migrated its key variables.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

async function hashKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const publishableKey = getPublishableKey();
    if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
      return jsonResponse({ ok: false, message: "Serviço de autenticação indisponível." }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[a-z0-9._-]{3,32}$/.test(username) || !password) {
      return jsonResponse({ ok: false, message: "Usuário ou senha inválidos." }, 401);
    }

    const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
    const clientIp = forwardedFor.split(",")[0].trim().slice(0, 128) || "unknown";
    const [ipKey, loginKey, accountKey] = await Promise.all([
      hashKey(`${serviceRoleKey}:ip:${clientIp}`),
      hashKey(`${serviceRoleKey}:login:${username}:${clientIp}`),
      hashKey(`${serviceRoleKey}:account:${username}`)
    ]);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
      "app_consumir_limite_login_nome_usuario",
      { p_ip_key: ipKey, p_login_key: loginKey, p_account_key: accountKey }
    );
    if (rateLimitError) {
      return jsonResponse({ ok: false, message: "Serviço de autenticação indisponível." }, 503);
    }
    if (rateLimitAllowed !== true) {
      return jsonResponse({ ok: false, message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);
    }

    const { data: usuario, error: usuarioError } = await adminClient
      .from("usuarios")
      .select("auth_user_id, email, status")
      .eq("nome_usuario", username)
      .maybeSingle();

    if (usuarioError || !usuario?.email || !usuario.auth_user_id || usuario.status !== "ativo") {
      return jsonResponse({ ok: false, message: "Usuário ou senha inválidos." }, 401);
    }

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: usuario.email,
      password
    });

    if (authError || !authData.session || authData.user?.id !== usuario.auth_user_id) {
      return jsonResponse({ ok: false, message: "Usuário ou senha inválidos." }, 401);
    }

    return jsonResponse({ ok: true, session: authData.session });
  } catch (_error) {
    return jsonResponse({ ok: false, message: "Não foi possível iniciar a sessão. Tente novamente." }, 500);
  }
});
