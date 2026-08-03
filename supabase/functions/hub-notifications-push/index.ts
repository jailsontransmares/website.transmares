import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { novoCorrelationId, registrarLogIntegracao } from "../_shared/integrationLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function clientAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !key) throw new Error("Credenciais administrativas do Supabase não configuradas.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function configurarVapid() {
  const subject = text(Deno.env.get("VAPID_SUBJECT"));
  const publicKey = text(Deno.env.get("VAPID_PUBLIC_KEY"));
  const privateKey = text(Deno.env.get("VAPID_PRIVATE_KEY"));
  if (!subject || !publicKey || !privateKey) throw new Error("Secrets VAPID não configurados.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function autorizado(request: Request) {
  const esperado = text(Deno.env.get("HUB_PUSH_INTERNAL_KEY"));
  return Boolean(esperado && request.headers.get("x-hub-internal-key") === esperado);
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  if (!autorizado(request)) return json({ ok: false, message: "Não autorizado." }, 401);

  try {
    configurarVapid();
    const payload = await request.json().catch(() => ({}));
    const notificationId = text(payload.notification_id || payload.id);
    if (!notificationId) return json({ ok: false, message: "notification_id é obrigatório." }, 400);

    const supabase = clientAdmin();
    const correlationId = novoCorrelationId();
    const startedAt = Date.now();
    await registrarLogIntegracao(supabase, {
      sistema: "hub",
      tipo: "notificacao_push",
      evento: "envio_push",
      status: "started",
      correlation_id: correlationId,
      external_id: notificationId,
      detalhes: { notification_id: notificationId }
    });
    const { data: notification, error: notificationError } = await supabase
      .from("hub_notificacoes")
      .select("id, usuario_id, titulo, descricao, rota, metadados")
      .eq("id", notificationId)
      .maybeSingle();
    if (notificationError) throw notificationError;
    if (!notification) return json({ ok: false, message: "Notificação não encontrada." }, 404);

    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("auth_user_id")
      .eq("id", notification.usuario_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user?.auth_user_id) return json({ ok: true, enviados: 0, removidos: 0 });

    const { data: devices, error: devicesError } = await supabase
      .from("hub_notificacao_dispositivos")
      .select("id, endpoint, p256dh, auth")
      .eq("auth_user_id", user.auth_user_id)
      .eq("ativo", true);
    if (devicesError) throw devicesError;

    let enviados = 0;
    let removidos = 0;
    const mensagem = JSON.stringify({
      id: notification.id,
      title: notification.titulo,
      body: notification.descricao,
      url: notification.rota || "/hub/notificacoes"
    });

    for (const device of devices || []) {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, mensagem, { TTL: 86400 });
        enviados += 1;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("hub_notificacao_dispositivos").delete().eq("id", device.id);
          removidos += 1;
        } else {
          console.warn("Falha ao enviar Push:", error);
        }
      }
    }

    await registrarLogIntegracao(supabase, {
      sistema: "hub",
      tipo: "notificacao_push",
      evento: "envio_push",
      status: "success",
      mensagem: "Notificação processada.",
      correlation_id: correlationId,
      external_id: notificationId,
      duracao_ms: Date.now() - startedAt,
      detalhes: { enviados, removidos }
    });
    return json({ ok: true, enviados, removidos });
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: error instanceof Error ? error.message : "Falha ao enviar Push." }, 500);
  }
});
