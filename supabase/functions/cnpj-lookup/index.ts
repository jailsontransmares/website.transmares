import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const OPEN_CNPJ_URL = "https://kitana.opencnpj.com/cnpj";
const REQUEST_TIMEOUT_MS = 8_000;

type NormalizedCnpj = {
  cnpj: string;
  razao_social: string;
  situacao: string;
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  municipio: string;
  uf: string;
  porte: string;
  consultado_em: string;
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

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function pick(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (["string", "number", "boolean"].includes(typeof value) && text(value)) return text(value);
  }
  return "";
}

function pickLabel(source: Record<string, unknown>, ...keys: string[]) {
  const scalar = pick(source, ...keys);
  if (scalar) return scalar;
  for (const key of keys) {
    const value = source[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const label = value as Record<string, unknown>;
    const nested = pick(label, "descricao", "description", "nome", "label", "valor", "value");
    if (nested) return nested;
  }
  return "";
}

function normalizeCnpjPayload(payload: unknown, cnpj: string): NormalizedCnpj {
  const envelope = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const source = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;
  const endereco = source.endereco && typeof source.endereco === "object"
    ? source.endereco as Record<string, unknown>
    : source;

  return {
    cnpj,
    razao_social: pick(source, "razao_social", "razaoSocial", "nome", "nome_empresarial"),
    situacao: pick(source, "situacao", "situacao_cadastral", "situacaoCadastral", "status"),
    endereco: pick(source, "logradouro", "endereco", "street") || pick(endereco, "logradouro", "endereco", "street"),
    numero: pick(source, "numero", "number") || pick(endereco, "numero", "number"),
    complemento: pick(source, "complemento", "complement") || pick(endereco, "complemento", "complement"),
    cep: pick(source, "cep", "zip_code", "zipCode") || pick(endereco, "cep", "zip_code", "zipCode"),
    bairro: pick(source, "bairro", "neighborhood") || pick(endereco, "bairro", "neighborhood"),
    municipio: pick(source, "municipio", "municipality", "cidade", "city") || pick(endereco, "municipio", "municipality", "cidade", "city"),
    uf: pick(source, "uf", "estado", "state") || pick(endereco, "uf", "estado", "state"),
    porte: pickLabel(source, "porte", "porteEmpresa", "porte_empresa", "porteEmpresaNome", "tamanhoEmpresa", "tamanho_empresa", "companySize", "company_size"),
    consultado_em: new Date().toISOString()
  };
}

async function consultarCnpj(cnpj: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPEN_CNPJ_URL}/${cnpj}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (response.status === 404) {
      return { found: false, data: null };
    }

    if (!response.ok) {
      throw new Error(`Open CNPJ retornou HTTP ${response.status}.`);
    }

    const payload = await response.json();
    if (payload && typeof payload === "object" && (payload as Record<string, unknown>).success === false) {
      return { found: false, data: null };
    }
    return { found: true, data: normalizeCnpjPayload(payload, cnpj) };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);

  try {
    const payload = await request.json().catch(() => ({}));
    const cnpj = digits(payload?.cnpj);

    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return json({ ok: false, message: "Informe um CNPJ válido." }, 400);
    }

    const result = await consultarCnpj(cnpj);
    return json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "A consulta do CNPJ excedeu o tempo limite."
      : error instanceof Error ? error.message : "Não foi possível consultar o CNPJ.";
    return json({ ok: false, message }, 502);
  }
});
