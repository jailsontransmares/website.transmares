import { createClient } from "jsr:@supabase/supabase-js@2";
import { novoCorrelationId, registrarLogIntegracao } from "../_shared/integrationLog.ts";

type JsonObject = Record<string, unknown>;
type EditRequest = {
  spreadsheetId?: unknown;
  sheet?: unknown;
  rowNumber?: unknown;
  header?: unknown;
  value?: unknown;
  cpf?: unknown;
  alterationId?: unknown;
  eventId?: unknown;
  dependentName?: unknown;
  dependentBirthDate?: unknown;
  oldDependentName?: unknown;
  oldDependentBirthDate?: unknown;
};

const SPREADSHEET_ID = "1NG_kq5afXgsqhaklu-D0JXPhd4ICyV_U6x7M8dN2V-8";
const CHANGE_TABLES = [
  "rh_movimentacoes_colaboradores",
  "rh_ferias",
  "rh_afastamentos",
  "rh_desligamentos"
] as const;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalize(value: unknown) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function response(status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || null;
}

function sheetDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const raw = text(value);
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  throw new Error("Data inválida. Use dd/mm/aaaa.");
}

function decimal(value: unknown) {
  if (value === null || value === undefined || text(value) === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let raw = text(value).replace(/R\$|\s/g, "");
  if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (raw.includes(",")) raw = raw.replace(",", ".");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error("Valor numérico inválido.");
  return parsed;
}

function workHours(value: unknown) {
  const raw = text(value);
  if (!raw) return { carga_horaria_semanal: null, carga_horaria_mensal: null };
  const amount = raw.match(/[+-]?\d+(?:[.,]\d+)?/)?.[0];
  if (!amount) throw new Error("Carga horária inválida.");
  const hours = decimal(amount);
  if (hours === null || hours < 0) throw new Error("Carga horária inválida.");
  if (/semana|semanal/i.test(normalize(raw))) {
    if (hours > 80) throw new Error("Carga semanal acima do limite.");
    return { carga_horaria_semanal: hours, carga_horaria_mensal: null };
  }
  if (/dia|diaria|diario/i.test(normalize(raw))) throw new Error("Carga diária deve ficar na coluna Jornada de trabalho.");
  return { carga_horaria_semanal: null, carga_horaria_mensal: hours };
}

function booleanValue(value: unknown) {
  const raw = normalize(value);
  if (["true", "1", "sim", "yes", "abono"].includes(raw)) return true;
  if (["false", "0", "nao", "no", "semabono", ""].includes(raw)) return false;
  throw new Error("Use Sim ou Não para este campo.");
}

function normalizedEnum(value: unknown, choices: Record<string, string>) {
  const found = choices[normalize(value)];
  if (!found) throw new Error("Valor não reconhecido para este campo.");
  return found;
}

function normalizedTimeRange(value: unknown) {
  return text(value).replace(/[\u00a0\u202f]/g, " ").replace(/[：∶]/g, ":")
    .replace(/\b(\d{1,2})\s*h(?:oras?)?\b/gi, "$1:00").replace(/\s+/g, " ").trim();
}

function hasTimeRange(value: unknown) {
  return /(?:^|\D)\d{1,2}:\d{2}\s*(?:às|as|até|ate|a|to|e|[/–—-])\s*\d{1,2}:\d{2}(?!\d)/i.test(normalizedTimeRange(value));
}

function parseTimeRange(value: unknown) {
  const raw = normalizedTimeRange(value);
  if (!raw) return { start: null, end: null };
  if (["naodefinido", "naoseaplica", "naoaplicavel", "n/a", "-"].includes(normalize(raw))) return { start: null, end: null };
  const match = raw.match(/(\d{1,2}:\d{2})\s*(?:às|as|até|ate|a|to|e|[/–—-])\s*(\d{1,2}:\d{2})/i);
  if (!match) throw new Error("Informe o intervalo como HH:MM às HH:MM.");
  const valid = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour <= 23 && minute <= 59;
  };
  if (!valid(match[1]) || !valid(match[2])) throw new Error("Horário inválido.");
  return { start: `${match[1].padStart(5, "0")}:00`, end: `${match[2].padStart(5, "0")}:00` };
}

function parseIdentity(value: unknown, existingType: unknown) {
  const raw = text(value);
  if (!raw) return { identidade_tipo: null, identidade_numero: null };
  const match = raw.match(/^\s*(RG|CNH)\s*(?:\||\/|:|-)\s*(.*)$/i);
  if (match) return { identidade_tipo: match[1].toLowerCase(), identidade_numero: optionalText(match[2]) };
  return { identidade_tipo: optionalText(existingType), identidade_numero: raw };
}

function parseIssuer(value: unknown, currentUf: unknown) {
  const parts = text(value).split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return { identidade_orgao_emissor: null, identidade_uf_emissor: null };
  if (parts.length > 1 && /^[A-Za-z]{2}$/.test(parts.at(-1)!)) {
    return { identidade_orgao_emissor: parts.slice(0, -1).join(" | "), identidade_uf_emissor: parts.at(-1)!.toUpperCase() };
  }
  return { identidade_orgao_emissor: parts.join(" | "), identidade_uf_emissor: optionalText(currentUf) };
}

async function updateRow(client: ReturnType<typeof createClient>, table: string, id: string, patch: JsonObject) {
  if (!Object.keys(patch).length) throw new Error("A coluna não tem mapeamento de entrada.");
  const { error } = await client.from(table).update(patch).eq("id", id);
  if (error) throw error;
}

async function updateLink(client: ReturnType<typeof createClient>, collaboratorId: string, patch: JsonObject) {
  if (!Object.keys(patch).length) throw new Error("A coluna não tem mapeamento de entrada.");
  const { error } = await client.from("rh_vinculos_profissionais")
    .upsert({ colaborador_id: collaboratorId, ...patch }, { onConflict: "colaborador_id" });
  if (error) throw error;
}

async function dependentEdit(client: ReturnType<typeof createClient>, collaboratorId: string, body: EditRequest) {
  const { data: dependents, error } = await client.from("rh_dependentes")
    .select("id,nome_completo,data_nascimento")
    .eq("colaborador_id", collaboratorId)
    .eq("ativo", true)
    .order("nome_completo");
  if (error) throw error;

  const oldName = normalize(body.oldDependentName);
  const oldDate = sheetDate(body.oldDependentBirthDate);
  const currentName = optionalText(body.dependentName);
  const currentDate = sheetDate(body.dependentBirthDate);
  const existing = (dependents || []).find((item) =>
    normalize(item.nome_completo) === oldName && String(item.data_nascimento).slice(0, 10) === oldDate
  );

  if (!oldName && !oldDate && !currentName && !currentDate) return;
  if (existing && !currentName && !currentDate) {
    const { error: updateError } = await client.from("rh_dependentes").update({ ativo: false }).eq("id", existing.id);
    if (updateError) throw updateError;
    return;
  }
  if (!currentName || !currentDate) throw new Error("Preencha nome e nascimento do dependente, ou limpe os dois para inativá-lo.");
  if (existing) {
    const { error: updateError } = await client.from("rh_dependentes")
      .update({ nome_completo: currentName, data_nascimento: currentDate })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await client.from("rh_dependentes").insert({
    colaborador_id: collaboratorId,
    nome_completo: currentName,
    data_nascimento: currentDate,
    ativo: true
  });
  if (insertError) throw insertError;
}

async function collaboratorEdit(client: ReturnType<typeof createClient>, body: EditRequest) {
  const cpf = digits(body.cpf);
  if (cpf.length !== 11) throw new Error("Não encontrei um CPF válido nesta linha.");
  const { data: document, error: documentError } = await client.from("rh_documentos_cadastrais")
    .select("id,colaborador_id,identidade_tipo,identidade_orgao_emissor,identidade_uf_emissor")
    .eq("cpf", cpf)
    .maybeSingle();
  if (documentError) throw documentError;
  if (!document) throw new Error("O CPF da linha não corresponde a um colaborador no Hub.");

  const field = normalize(body.header);
  const value = body.value;
  if (/^dependentelegal0?[1-3](nomecompleto|datadenascimento)$/.test(field)) {
    await dependentEdit(client, text(document.colaborador_id), body);
    return;
  }
  const personFields: Record<string, string> = {
    nomecompleto: "nome_completo",
    datadenascimento: "data_nascimento",
    estadocivil: "estado_civil",
    nacionalidade: "nacionalidade",
    naturalidade: "naturalidade",
    nomecompletodoseupai: "nome_pai",
    nomecompletodasuamae: "nome_mae",
    sexo: "sexo",
    escolaridade: "escolaridade",
    cor: "cor_raca",
    telefonecelular: "telefone_celular",
    contatodeemergenciaemcasodeacidente: "contato_emergencia_telefone",
    nomedocontatodeemergencia: "contato_emergencia_nome",
    emaildecontato: "email_contato",
    rua: "endereco_logradouro",
    numero: "endereco_numero",
    complemento: "endereco_complemento",
    bairro: "endereco_bairro",
    cidade: "endereco_cidade"
  };
  const documentFields: Record<string, string> = {
    secnhqualcategoria: "cnh_categoria",
    titulodeeleitora: "titulo_eleitor",
    zona: "zona_eleitoral",
    secaodevotacao: "secao_eleitoral",
    numerodasactps: "ctps_numero",
    serie: "ctps_serie",
    ufctps: "ctps_uf",
    reservistadocmilitar: "reservista_numero",
    categoriadereservista: "reservista_categoria",
    pisnumero: "pis_numero"
  };
  const linkFields: Record<string, string> = {
    datadeadmissao: "data_admissao",
    cargo: "cargo",
    funcao: "funcao",
    cbo: "cbo",
    salariobolsa: "remuneracao_valor",
    cargahorariames: "carga_horaria_mensal",
    datadesaida: "data_desligamento"
  };

  if (personFields[field]) {
    const column = personFields[field];
    const parsed = column === "data_nascimento" ? sheetDate(value) : optionalText(value);
    if (column === "data_nascimento" && !parsed) throw new Error("Data de nascimento não pode ficar vazia.");
    if (column === "nome_completo" && !parsed) throw new Error("Nome completo não pode ficar vazio.");
    const patch: JsonObject = { [column]: parsed };
    await updateRow(client, "rh_colaboradores", text(document.colaborador_id), patch);
    return;
  }
  if (field === "uf") {
    const uf = text(value).toUpperCase();
    if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error("UF deve ter duas letras.");
    await updateRow(client, "rh_colaboradores", text(document.colaborador_id), { endereco_uf: uf || null });
    return;
  }
  if (field === "cep") {
    const cep = digits(value);
    if (cep && cep.length !== 8) throw new Error("CEP deve ter oito dígitos.");
    await updateRow(client, "rh_colaboradores", text(document.colaborador_id), { endereco_cep: cep || null });
    return;
  }
  if (documentFields[field]) {
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), { [documentFields[field]]: optionalText(value) });
    return;
  }
  if (field === "datadeemissaoexpedicao") {
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), { identidade_data_emissao: sheetDate(value) });
    return;
  }
  if (field === "datadeexpedicaoctps") {
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), { ctps_data_expedicao: sheetDate(value) });
    return;
  }
  if (field === "piscadastro") {
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), { pis_data_cadastro: sheetDate(value) });
    return;
  }
  if (field === "rgcnh") {
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), parseIdentity(value, document.identidade_tipo));
    return;
  }
  if (field === "cargahorariames") {
    await updateLink(client, text(document.colaborador_id), workHours(value));
    return;
  }
  if (field === "orgaoufemissor") {
    const issuer = parseIssuer(value, document.identidade_uf_emissor);
    await updateRow(client, "rh_documentos_cadastrais", text(document.id), issuer);
    return;
  }
  if (linkFields[field]) {
    const column = linkFields[field];
    const parsed = column.startsWith("data_") ? sheetDate(value) : column.endsWith("valor") || column.endsWith("mensal") ? decimal(value) : optionalText(value);
    await updateLink(client, text(document.colaborador_id), { [column]: parsed });
    return;
  }
  if (field === "tipodevinculo") {
    const tipo = normalizedEnum(value, { clt: "clt", estagio: "estagio", socio: "socio", prestador: "prestador", temporario: "temporario", outro: "outro" });
    await updateLink(client, text(document.colaborador_id), { tipo_vinculo: tipo });
    return;
  }
  if (field === "tipodedesligamento") {
    const { data: dismissal, error } = await client.from("rh_desligamentos")
      .select("id")
      .eq("colaborador_id", text(document.colaborador_id))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!dismissal) throw new Error("Não há desligamento cadastrado no Hub para esta pessoa.");
    const tipo = normalizedEnum(value, {
      pedidocolaborador: "pedido_colaborador",
      iniciativadaempresa: "iniciativa_empresa",
      terminocontrato: "termino_contrato",
      acordo: "acordo",
      aposentadoria: "aposentadoria",
      outro: "outro"
    });
    await updateRow(client, "rh_desligamentos", text(dismissal.id), { tipo });
    return;
  }
  if (field === "jornadadetrabalho") {
    const raw = text(value);
    const parts = raw.split(/\s*\|\s*/, 2);
    const patch: JsonObject = {};
    const rangeText = parts.length > 1 ? parts[1] : raw;
    const days = parts.length > 1 ? optionalText(parts[0]) : null;
    if (parts.length > 1) patch.dias_trabalho = days;
    if (hasTimeRange(rangeText)) Object.assign(patch, { horario_entrada: parseTimeRange(rangeText).start, horario_saida: parseTimeRange(rangeText).end });
    else if (!raw) Object.assign(patch, { horario_entrada: null, horario_saida: null, dias_trabalho: null });
    else if (parts.length === 1) patch.dias_trabalho = raw;
    await updateLink(client, text(document.colaborador_id), patch);
    return;
  }
  if (field === "intervalo") {
    const range = parseTimeRange(value);
    await updateLink(client, text(document.colaborador_id), { intervalo_inicio: range.start, intervalo_fim: range.end });
    return;
  }
  throw new Error("Esta coluna é de referência, fórmula ou não tem mapeamento de entrada; a edição não foi enviada ao Hub.");
}

async function findAlteration(client: ReturnType<typeof createClient>, id: string) {
  const matches: Array<{ table: typeof CHANGE_TABLES[number]; record: JsonObject }> = [];
  for (const table of CHANGE_TABLES) {
    const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (data) matches.push({ table, record: data as JsonObject });
  }
  if (matches.length !== 1) throw new Error(matches.length ? "O identificador da alteração é ambíguo." : "O REGISTRO DA ALTERAÇÃO não corresponde a um item do Hub.");
  return matches[0];
}

async function alterationEdit(client: ReturnType<typeof createClient>, body: EditRequest) {
  const id = text(body.alterationId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("REGISTRO DA ALTERAÇÃO precisa conter um UUID válido.");
  const { table, record } = await findAlteration(client, id);
  const field = normalize(body.header);
  const patch: JsonObject = {};
  if (field === "data") {
    const dateColumn: Record<typeof table, string> = {
      rh_movimentacoes_colaboradores: "data_efetivacao",
      rh_ferias: "inicio_gozo",
      rh_afastamentos: "inicio_em",
      rh_desligamentos: "ultimo_dia_trabalho"
    };
    patch[dateColumn[table]] = sheetDate(body.value);
  } else if (field === "observacoes") {
    patch[table === "rh_movimentacoes_colaboradores" ? "descricao" : "observacoes"] = optionalText(body.value);
  } else if (table === "rh_ferias" && field === "feriassaquisicao") {
    patch.periodo_aquisitivo_inicio = sheetDate(body.value);
  } else if (table === "rh_ferias" && field === "feriaseaquisicao") {
    patch.periodo_aquisitivo_fim = sheetDate(body.value);
  } else if (table === "rh_ferias" && field === "feriassgozo") {
    patch.inicio_gozo = sheetDate(body.value);
  } else if (table === "rh_ferias" && field === "feriasegozo") {
    patch.fim_gozo = sheetDate(body.value);
  } else if (table === "rh_ferias" && field === "feriasabono") {
    patch.abono_pecuniario = booleanValue(body.value);
  } else {
    throw new Error("Esta coluna é calculada, identificadora ou não tem mapeamento de entrada; a edição não foi enviada ao Hub.");
  }
  if (Object.entries(patch).every(([key, value]) => record[key] === value)) return;
  await updateRow(client, table, id, patch);
}

export async function handleSheetEdit(request: Request) {
  if (request.method !== "POST") return response(405, { ok: false, message: "Método não permitido." });
  const expected = text(Deno.env.get("RH_GOOGLE_SHEETS_INBOUND_TOKEN"));
  const provided = text(request.headers.get("X-Sheets-Edit-Token"));
  if (!expected || !sameSecret(provided, expected)) return response(401, { ok: false, message: "Edição da planilha não autorizada." });

  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"));
  if (!supabaseUrl || !serviceKey) return response(500, { ok: false, message: "Integração sem configuração do Supabase." });

  let body: EditRequest;
  try {
    body = await request.json() as EditRequest;
  } catch {
    return response(400, { ok: false, message: "Corpo JSON inválido." });
  }
  if (text(body.spreadsheetId) !== SPREADSHEET_ID) return response(403, { ok: false, message: "Planilha não autorizada." });
  if (!Number.isInteger(Number(body.rowNumber)) || Number(body.rowNumber) < 2) return response(400, { ok: false, message: "Linha inválida." });

  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const correlationId = novoCorrelationId();
  const sheet = text(body.sheet);
  const header = text(body.header);
  try {
    if (sheet === "CAD_COLABORADOR") await collaboratorEdit(client, body);
    else if (sheet === "CAD_ALTERACOES") await alterationEdit(client, body);
    else return response(400, { ok: false, message: "Aba não suportada." });
    await registrarLogIntegracao(client, { sistema: "google_sheets", tipo: "sincronizacao", evento: "sheet_edit", status: "success", correlation_id: correlationId, detalhes: { sheet, header: normalize(header), row_number: Number(body.rowNumber), event_id: text(body.eventId) } });
    return response(200, { ok: true, correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível aplicar a edição ao Hub.";
    await registrarLogIntegracao(client, { sistema: "google_sheets", tipo: "sincronizacao", evento: "sheet_edit", status: "failed", nivel: "error", mensagem: "Edição recebida da planilha recusada ou não aplicada.", correlation_id: correlationId, detalhes: { sheet, header: normalize(header), row_number: Number(body.rowNumber), event_id: text(body.eventId) } }).catch(() => undefined);
    const status = message.includes("CPF") || message.includes("UUID") || message.includes("não tem mapeamento") || message.includes("não foi enviada") || message.includes("não corresponde") ? 422 : 400;
    const safeMessage = error instanceof Error && (error.message.startsWith("Use ") || error.message.startsWith("Data ") || error.message.startsWith("Horário ") || error.message.startsWith("UF ") || error.message.startsWith("CEP ") || error.message.startsWith("A coluna ") || error.message.startsWith("Esta coluna ") || error.message.startsWith("Nome ") || error.message.startsWith("O CPF ") || error.message.startsWith("Não encontrei ") || error.message.startsWith("REGISTRO "))
      ? message
      : "A edição não foi aplicada. Confira os valores e o registro correspondente no Hub.";
    return response(status, { ok: false, message: safeMessage, correlationId });
  }
}
