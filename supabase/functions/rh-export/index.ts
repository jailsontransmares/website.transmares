import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const authorization = text(request.headers.get("Authorization"));
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, message: "A exportação de fichas não está configurada." }, 500);
  }
  if (!token) return json({ ok: false, message: "Entre no Hub para gerar a ficha." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json({ ok: false, message: "Sua sessão do Hub expirou. Entre novamente." }, 401);

  const { data: canView, error: permissionError } = await userClient.rpc("app_tem_permissao", {
    p_recurso: "rh_dp.colaboradores",
    p_acao: "view"
  });
  if (permissionError) return json({ ok: false, message: "Não foi possível verificar seu acesso ao módulo de RH." }, 500);
  if (canView !== true) return json({ ok: false, message: "Seu perfil não tem acesso ao módulo de colaboradores." }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Solicitação inválida." }, 400);
  }

  if (text(payload.action) !== "ficha_pdf") return json({ ok: false, message: "Ação inválida." }, 400);
  const collaboratorId = text(payload.colaborador_id);
  const version = text(payload.versao);
  if (!collaboratorId || !["simplificada", "completa"].includes(version)) {
    return json({ ok: false, message: "Informe o colaborador e o tipo de ficha." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const fail = (message: string) => json({ ok: false, message }, 500);

  if (version === "simplificada") {
    const [collaborator, employment] = await Promise.all([
      admin.from("rh_colaboradores").select("id,codigo,nome_completo,status").eq("id", collaboratorId).maybeSingle(),
      admin.from("rh_vinculos_profissionais")
        .select("data_admissao,data_desligamento,cargo,funcao,departamento,gestor_responsavel,situacao,tipo_vinculo,modelo_jornada")
        .eq("colaborador_id", collaboratorId).maybeSingle()
    ]);
    if (collaborator.error || employment.error) return fail("Não foi possível carregar os dados da ficha simplificada.");
    if (!collaborator.data) return json({ ok: false, message: "Colaborador não encontrado." }, 404);
    return json({ ok: true, ficha: { versao: version, colaborador: collaborator.data, vinculo: employment.data || {} } });
  }

  const [collaborator, documents, employment, dependents, benefits, bank, movements, checklist, vacations, leaves, occurrences, dismissals, files] = await Promise.all([
    admin.from("rh_colaboradores").select("*").eq("id", collaboratorId).maybeSingle(),
    admin.from("rh_documentos_cadastrais").select("*").eq("colaborador_id", collaboratorId).maybeSingle(),
    admin.from("rh_vinculos_profissionais").select("*").eq("colaborador_id", collaboratorId).maybeSingle(),
    admin.from("rh_dependentes").select("*").eq("colaborador_id", collaboratorId).order("nome_completo"),
    admin.from("rh_beneficios_colaboradores").select("*").eq("colaborador_id", collaboratorId).order("nome"),
    admin.from("rh_dados_bancarios_colaboradores").select("*").eq("colaborador_id", collaboratorId).maybeSingle(),
    admin.from("rh_movimentacoes_colaboradores").select("*").eq("colaborador_id", collaboratorId).order("data_efetivacao", { ascending: false }),
    admin.from("rh_checklist_admissional").select("*").eq("colaborador_id", collaboratorId).order("item_chave"),
    admin.from("rh_ferias").select("*").eq("colaborador_id", collaboratorId).order("inicio_gozo", { ascending: false }),
    admin.from("rh_afastamentos").select("*").eq("colaborador_id", collaboratorId).order("inicio_em", { ascending: false }),
    admin.from("rh_ocorrencias").select("*").eq("colaborador_id", collaboratorId).order("data_ocorrencia", { ascending: false }),
    admin.from("rh_desligamentos").select("*, rh_checklist_desligamento(*)").eq("colaborador_id", collaboratorId).order("created_at", { ascending: false }),
    admin.from("rh_arquivos_colaboradores").select("*, rh_arquivos_colaboradores_versoes(*)").eq("colaborador_id", collaboratorId).order("created_at", { ascending: false })
  ]);

  const results = [collaborator, documents, employment, dependents, benefits, bank, movements, checklist, vacations, leaves, occurrences, dismissals, files];
  if (results.some((result) => result.error)) return fail("Não foi possível carregar todos os dados da ficha completa.");
  if (!collaborator.data) return json({ ok: false, message: "Colaborador não encontrado." }, 404);

  return json({
    ok: true,
    ficha: {
      versao: version,
      colaborador: collaborator.data,
      documentos: documents.data || {},
      vinculo: employment.data || {},
      dependentes: dependents.data || [],
      beneficios: benefits.data || [],
      bancarios: bank.data || {},
      movimentacoes: movements.data || [],
      checklist: checklist.data || [],
      ferias: vacations.data || [],
      afastamentos: leaves.data || [],
      ocorrencias: occurrences.data || [],
      desligamentos: dismissals.data || [],
      arquivos: files.data || []
    }
  });
});
