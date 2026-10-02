type RecordData = Record<string, unknown>;

const SENSITIVE_KEY = /(authorization|cookie|password|secret|token|private|credential|apikey|api_key)/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitize);
  if (!value || typeof value !== "object") return value;

  return Object.entries(value as RecordData).reduce<RecordData>((result, [key, item]) => {
    result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(item);
    return result;
  }, {});
}

export function novoCorrelationId() {
  return crypto.randomUUID();
}

export async function registrarLogIntegracao(
  client: any,
  values: {
    sistema: string;
    tipo: string;
    evento?: string | null;
    nivel?: "info" | "warning" | "error";
    status: "started" | "success" | "failed" | "retrying";
    mensagem?: string | null;
    correlation_id?: string | null;
    external_id?: string | null;
    duracao_ms?: number | null;
    tentativa?: number;
    detalhes?: RecordData;
  }
) {
  try {
    await client.from("integracao_logs").insert({
      sistema: values.sistema,
      tipo: values.tipo,
      evento: values.evento || null,
      nivel: values.nivel || (values.status === "failed" ? "error" : "info"),
      status: values.status,
      mensagem: values.mensagem ? String(values.mensagem).slice(0, 1000) : null,
      correlation_id: values.correlation_id || null,
      external_id: values.external_id || null,
      duracao_ms: Number.isFinite(values.duracao_ms) ? values.duracao_ms : null,
      tentativa: Math.max(Number(values.tentativa) || 1, 1),
      detalhes: sanitize(values.detalhes || {})
    });
  } catch (error) {
    console.warn("Não foi possível registrar log de integração:", error);
  }
}
