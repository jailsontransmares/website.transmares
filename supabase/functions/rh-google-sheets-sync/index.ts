import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarLogIntegracao, novoCorrelationId } from "../_shared/integrationLog.ts";
import { handleSheetEdit } from "./inbound.ts";

type Data = Record<string, unknown>;
type QueueRow = {
  id: string;
  source_table: string;
  source_id: string;
  colaborador_id: string;
  target: "colaborador" | "alteracao";
  action: "upsert" | "delete";
  version: number;
  attempts: number;
};
type Sheet = { properties: { sheetId: number; title: string; gridProperties?: { columnCount?: number } } };
type SheetRows = { headers: unknown[]; rows: unknown[][] };

const SHEET_ID = "1NG_kq5afXgsqhaklu-D0JXPhd4ICyV_U6x7M8dN2V-8";
const TAB_COLABORADOR = "CAD_COLABORADOR";
const TAB_ALTERACOES = "CAD_ALTERACOES";
const CHANGE_TABLES = new Set([
  "rh_movimentacoes_colaboradores",
  "rh_ferias",
  "rh_afastamentos",
  "rh_desligamentos"
]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-worker-token, x-sheets-edit-token, x-sheets-sync-token, x-manual-sync",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json(body: Data, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function authorizeManualSync(request: Request, supabaseUrl: string) {
  const authorization = text(request.headers.get("Authorization"));
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) return json({ ok: false, message: "Entre no Hub para iniciar a sincronização." }, 401);

  const anonKey = text(Deno.env.get("SUPABASE_ANON_KEY"));
  if (!anonKey) return json({ ok: false, message: "A autenticação da sincronização não está configurada." }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ ok: false, message: "Sua sessão do Hub expirou. Entre novamente." }, 401);

  const [canUpdate, canReadSensitive] = await Promise.all([
    userClient.rpc("app_tem_permissao", { p_recurso: "rh_dp.colaboradores", p_acao: "update" }),
    userClient.rpc("app_tem_permissao", { p_recurso: "rh_dp.colaboradores", p_acao: "view_sensitive" })
  ]);
  if (canUpdate.error || canReadSensitive.error) {
    return json({ ok: false, message: "Não foi possível verificar sua permissão para sincronizar." }, 500);
  }
  if (canUpdate.data !== true || canReadSensitive.data !== true) {
    return json({ ok: false, message: "Seu perfil não tem permissão para sincronizar os dados sensíveis do RH." }, 403);
  }
  return null;
}

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function normalize(value: unknown) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function date(value: unknown) {
  const raw = text(value);
  return raw ? raw.slice(0, 10) : "";
}

function sheetRange(tab: string, range: string) {
  const escaped = `'${tab.replaceAll("'", "''")}'!${range}`;
  return encodeURIComponent(escaped);
}

function columnName(index: number) {
  let number = index + 1;
  let result = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    number = Math.floor((number - 1) / 26);
  }
  return result;
}

function headerIndex(headers: unknown[], label: string) {
  const key = normalize(label);
  return headers.findIndex((header) => normalize(header) === key);
}

function headerAliases(headers: unknown[], aliases: string[]) {
  for (const alias of aliases) {
    const index = headerIndex(headers, alias);
    if (index >= 0) return index;
  }
  return -1;
}

function displayValue(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return text(value);
}

function formatTimeRange(start: unknown, end: unknown) {
  const first = text(start).slice(0, 5);
  const last = text(end).slice(0, 5);
  if (first && last) return `${first} às ${last}`;
  return first || last;
}

function multiPart(...values: unknown[]) {
  return values.map(text).filter(Boolean).join(" | ");
}

function rowsFrom(values: unknown[][] | undefined): SheetRows {
  const all = values || [];
  return { headers: all[0] || [], rows: all.slice(1) };
}

function keyRows(data: SheetRows, label: string) {
  const index = headerIndex(data.headers, label);
  if (index < 0) throw new Error(`A aba não possui o cabeçalho obrigatório “${label}”.`);
  return data.rows.flatMap((row, rowIndex) => text(row[index]) ? [{ rowIndex: rowIndex + 2, key: text(row[index]) }] : []);
}

function collaboratorValues(record: Data, docs: Data, link: Data, dependents: Data[], dismissal: Data | null) {
  const address = [record.endereco_logradouro, record.endereco_numero, record.endereco_complemento, record.endereco_bairro, record.endereco_cidade, record.endereco_uf, record.endereco_cep]
    .map(text).filter(Boolean).join(", ");
  const activeDependents = dependents.slice(0, 3);
  const fullHours = formatTimeRange(link.horario_entrada, link.horario_saida);
  const interval = formatTimeRange(link.intervalo_inicio, link.intervalo_fim);
  const issuer = multiPart(docs.identidade_orgao_emissor, docs.identidade_uf_emissor);
  const identity = multiPart(text(docs.identidade_tipo).toUpperCase(), docs.identidade_numero);
  const jornada = multiPart(link.dias_trabalho, fullHours);
  const data = new Map<string, unknown>([
    ["carimbodedatahora", record.created_at],
    ["nomecompleto", record.nome_completo],
    ["datadenascimento", record.data_nascimento],
    ["estadocivil", record.estado_civil],
    ["nacionalidade", record.nacionalidade],
    ["naturalidade", record.naturalidade],
    ["nomecompletodoseupai", record.nome_pai],
    ["nomecompletodasuamae", record.nome_mae],
    ["sexo", record.sexo],
    ["escolaridade", record.escolaridade],
    ["cor", record.cor_raca],
    ["telefonecelular", record.telefone_celular],
    ["contatodeemergenciaemcasodeacidente", record.contato_emergencia_telefone],
    ["nomedocontatodeemergencia", record.contato_emergencia_nome],
    ["emaildecontato", record.email_contato],
    ["rua", record.endereco_logradouro],
    ["numero", record.endereco_numero],
    ["complemento", record.endereco_complemento],
    ["bairro", record.endereco_bairro],
    ["cidade", record.endereco_cidade],
    ["uf", record.endereco_uf],
    ["cep", record.endereco_cep],
    ["endereco", address],
    ["seucpf", docs.cpf],
    ["rgcnh", identity],
    ["secnhqualcategoria", docs.cnh_categoria],
    ["datadeemissaoexpedicao", docs.identidade_data_emissao],
    ["orgaoufemissor", issuer],
    ["titulodeeleitora", docs.titulo_eleitor],
    ["zona", docs.zona_eleitoral],
    ["secaodevotacao", docs.secao_eleitoral],
    ["numerodasactps", docs.ctps_numero],
    ["serie", docs.ctps_serie],
    ["datadeexpedicaoctps", docs.ctps_data_expedicao],
    ["ufctps", docs.ctps_uf],
    ["reservistadocmilitar", docs.reservista_numero],
    ["categoriadereservista", docs.reservista_categoria],
    ["piscadastro", docs.pis_data_cadastro],
    ["pisnumero", docs.pis_numero],
    ["tipodevinculo", text(link.tipo_vinculo).toUpperCase()],
    ["datadeadmissao", link.data_admissao],
    ["cargo", link.cargo],
    ["funcao", link.funcao],
    ["cbo", link.cbo],
    ["salariobolsa", link.remuneracao_valor],
    ["jornadadetrabalho", jornada],
    ["intervalo", interval],
    ["datadesaida", link.data_desligamento],
    ["tipodedesligamento", dismissal?.tipo],
    ["statushub", record.status]
  ] as [string, unknown][]);

  activeDependents.forEach((dependent, index) => {
    const number = String(index + 1).padStart(2, "0");
    data.set(normalize(`Dependente legal ${number} - NOME COMPLETO`), dependent.nome_completo);
    data.set(normalize(`Dependente legal ${number} - DATA DE NASCIMENTO`), dependent.data_nascimento);
  });
  data.set("dependentes", dependents.map((item) => text(item.nome_completo)).filter(Boolean).join(", "));
  data.set("depnascimento", dependents.map((item) => date(item.data_nascimento)).filter(Boolean).join(", "));
  if (Object.hasOwn(link, "carga_horaria_mensal")) data.set("cargahorariames", link.carga_horaria_mensal);
  return data;
}

function alterationValues(event: Data, collaboratorName: string, sourceTable: string) {
  const type: Record<string, string> = {
    rh_movimentacoes_colaboradores: "ALTERAÇÃO",
    rh_ferias: "FÉRIAS",
    rh_afastamentos: "AFASTAMENTO",
    rh_desligamentos: "DESLIGAMENTO"
  };
  const movementText = multiPart(event.titulo, event.descricao, event.dados_novos ? JSON.stringify(event.dados_novos) : "");
  const absenceText = multiPart(event.tipo, event.motivo, date(event.inicio_em), date(event.previsao_retorno_em || event.retorno_em));
  const alteration = sourceTable === "rh_movimentacoes_colaboradores" ? movementText : "";
  const absence = sourceTable === "rh_afastamentos" ? absenceText : "";
  const eventType = type[sourceTable] || "ALTERAÇÃO";
  const data = new Map<string, unknown>([
    ["nomecompleto", collaboratorName],
    ["data", event.data_efetivacao || event.inicio_gozo || event.inicio_em || event.ultimo_dia_trabalho],
    ["tipoderegistro", multiPart(eventType, event.tipo)],
    ["altsalcargoefuncao", alteration],
    ["afastamento", absence],
    ["registrodaalteracao", event.id],
    ["feriassaquisicao", event.periodo_aquisitivo_inicio],
    ["feriaseaquisicao", event.periodo_aquisitivo_fim],
    ["feriassgozo", event.inicio_gozo],
    ["feriasegozo", event.fim_gozo],
    ["feriasabono", event.abono_pecuniario],
    ["observacoes", event.observacoes || event.motivo_resumo || event.retorno_resumo || event.descricao]
  ] as [string, unknown][]);
  return data;
}

function toCellUpdates(headers: unknown[], values: Map<string, unknown>, rowNumber: number, tab: string, allowedLabels: string[]) {
  const cells: Array<{ range: string; values: unknown[][] }> = [];
  for (const label of allowedLabels) {
    const index = headerIndex(headers, label);
    if (index < 0) continue;
    const key = normalize(label);
    if (!values.has(key)) continue;
    const cell = `${columnName(index)}${rowNumber}`;
    cells.push({ range: `'${tab}'!${cell}`, values: [[displayValue(values.get(key))]] });
  }
  return cells;
}

function serviceAccount() {
  const raw = text(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || Deno.env.get("GCP_ACCOUNT_KEY"));
  if (!raw) throw new Error("A credencial Google ainda não está configurada no Supabase.");
  try {
    return JSON.parse(raw) as { client_email: string; private_key: string; token_uri?: string };
  } catch {
    throw new Error("A credencial Google configurada não está em formato JSON válido.");
  }
}

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function googleAccessToken(account: ReturnType<typeof serviceAccount>) {
  const pem = account.private_key.replaceAll("\\n", "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", decodeBase64(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  });
  const result = await response.json().catch(() => ({})) as Data;
  if (!response.ok || !text(result.access_token)) throw new Error("O Google não autorizou a conta de serviço para esta planilha.");
  return text(result.access_token);
}

async function googleRequest(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Data;
    const message = text((body.error as Data | undefined)?.message) || `Google Sheets retornou HTTP ${response.status}.`;
    throw new Error(message.slice(0, 350));
  }
  return response.status === 204 ? {} : response.json();
}

async function spreadsheetMetadata(token: string) {
  return await googleRequest(`spreadsheets/${SHEET_ID}?fields=sheets.properties`, token) as { sheets: Sheet[] };
}

async function readTab(tab: string, token: string) {
  const result = await googleRequest(`spreadsheets/${SHEET_ID}/values/${sheetRange(tab, "A:ZZ")}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`, token) as { values?: unknown[][] };
  return rowsFrom(result.values);
}

async function updateCells(cells: Array<{ range: string; values: unknown[][] }>, token: string) {
  if (!cells.length) return;
  await googleRequest(`spreadsheets/${SHEET_ID}/values:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data: cells })
  });
}

async function ensureHeader(tab: string, label: string, token: string) {
  let rows = await readTab(tab, token);
  if (headerIndex(rows.headers, label) >= 0) return rows;
  const metadata = await spreadsheetMetadata(token);
  const sheet = metadata.sheets?.find((item) => item.properties.title === tab);
  if (!sheet) throw new Error(`A aba “${tab}” não foi encontrada na planilha.`);
  const columnCount = Number(sheet.properties.gridProperties?.columnCount || 0);
  if (rows.headers.length >= columnCount) {
    await googleRequest(`spreadsheets/${SHEET_ID}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ requests: [{ appendDimension: { sheetId: sheet.properties.sheetId, dimension: "COLUMNS", length: 1 } }] })
    });
  }
  const nextColumn = columnName(rows.headers.length);
  await updateCells([{ range: `'${tab}'!${nextColumn}1`, values: [[label]] }], token);
  rows = await readTab(tab, token);
  return rows;
}

async function appendSheetRow(tab: string, token: string, metadata: { sheets: Sheet[] }) {
  const sheet = metadata.sheets?.find((item) => item.properties.title === tab);
  if (!sheet) throw new Error(`A aba “${tab}” não foi encontrada na planilha.`);
  const rows = await readTab(tab, token);
  const sheetRowIndex = rows.rows.length + 1;
  await googleRequest(`spreadsheets/${SHEET_ID}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        insertDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: sheetRowIndex, endIndex: sheetRowIndex + 1 },
          inheritFromBefore: true
        }
      }]
    })
  });
  return sheetRowIndex + 1;
}

async function deleteSheetRow(tab: string, rowNumber: number, token: string, metadata: { sheets: Sheet[] }) {
  const sheet = metadata.sheets?.find((item) => item.properties.title === tab);
  if (!sheet) throw new Error(`A aba “${tab}” não foi encontrada na planilha.`);
  await googleRequest(`spreadsheets/${SHEET_ID}:batchUpdate`, token, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber }
        }
      }]
    })
  });
}

function exactMatches(items: Array<{ rowIndex: number; key: string }>, key: string, fold = false) {
  const target = fold ? normalize(key) : key;
  return items.filter((item) => (fold ? normalize(item.key) : item.key) === target);
}

async function getCollaborator(client: ReturnType<typeof createClient>, collaboratorId: string) {
  const { data: person, error: personError } = await client.from("rh_colaboradores").select("*").eq("id", collaboratorId).maybeSingle();
  if (personError) throw personError;
  if (!person) throw new Error("Colaborador não encontrado para sincronização.");
  const [{ data: docs, error: docsError }, { data: link, error: linkError }, { data: dependents, error: dependentError }, { data: dismissals, error: dismissalError }] = await Promise.all([
    client.from("rh_documentos_cadastrais").select("*").eq("colaborador_id", collaboratorId).maybeSingle(),
    client.from("rh_vinculos_profissionais").select("*").eq("colaborador_id", collaboratorId).maybeSingle(),
    client.from("rh_dependentes").select("*").eq("colaborador_id", collaboratorId).eq("ativo", true).order("nome_completo"),
    client.from("rh_desligamentos").select("*").eq("colaborador_id", collaboratorId).order("created_at", { ascending: false }).limit(1)
  ]);
  const error = docsError || linkError || dependentError || dismissalError;
  if (error) throw error;
  return { person, docs: docs || {}, link: link || {}, dependents: dependents || [], dismissal: dismissals?.[0] || null };
}

async function upsertCollaborator(client: ReturnType<typeof createClient>, row: QueueRow, token: string, metadata: { sheets: Sheet[] }) {
  const current = await getCollaborator(client, row.colaborador_id);
  const cpf = digits(current.docs.cpf);
  if (cpf.length !== 11) throw new Error("O cadastro não tem CPF válido para localizar a linha na planilha.");
  let sheet = await ensureHeader(TAB_COLABORADOR, "STATUS HUB", token);
  const cpfIndex = headerAliases(sheet.headers, ["SEU CPF"]);
  if (cpfIndex < 0) throw new Error("A aba CAD_COLABORADOR não possui a coluna SEU CPF.");
  const rows = keyRows(sheet, "SEU CPF");
  const matches = rows.filter((item) => digits(item.key) === cpf);
  if (matches.length > 1) throw new Error("Há mais de uma linha com o mesmo CPF em CAD_COLABORADOR; a sincronização parou para evitar atualizar a pessoa errada.");
  const targetRow = matches[0]?.rowIndex ?? await appendSheetRow(TAB_COLABORADOR, token, metadata);
  const values = collaboratorValues(current.person, current.docs, current.link, current.dependents, current.dismissal);
  const allowed = [
    "Carimbo de data/hora", "Nome Completo", "Data de Nascimento", "Estado Civil", "Nacionalidade", "Naturalidade",
    "NOME COMPLETO DO SEU PAI", "NOME COMPLETO DA SUA MÃE", "Sexo", "Escolaridade", "Cor", "Telefone Celular",
    "Contato de Emergência em caso de acidente", "Nome do contato de Emergência", "E-mail de contato",
    ...[1, 2, 3].flatMap((number) => {
      const sequence = String(number).padStart(2, "0");
      return [`Dependente legal ${sequence} - NOME COMPLETO`, `Dependente legal ${sequence} - DATA DE NASCIMENTO`];
    }),
    "DEPENDENTES", "DEP-NASCIMENTO", "SEU CPF", "RG/CNH", "SE CNH, QUAL CATEGORIA?", "DATA DE EMISSAO/EXPEDIÇÃO",
    "ÓRGÃO/UF EMISSOR", "TITULO DE ELEITOR(A)", "ZONA", "NÚMERO DA SUA CTPS", "SERIE", "DATA DE EXPEDIÇÃO CTPS", "UF CTPS",
    "RESERVISTA/DOC MILITAR", "CATEGORIA DE RESERVISTA", "SEÇÃO DE VOTAÇÃO", "RUA", "NUMERO", "COMPLEMENTO", "BAIRRO",
    "CIDADE", "UF", "CEP", "ENDEREÇO", "TIPO DE VINCULO", "DATA DE ADMISSÃO", "CARGO", "FUNÇÃO", "CBO",
    "SALARIO/BOLSA", "CARGA HORARIA / MÊS", "JORNADA DE TRABALHO", "INTERVALO", "DATA DE SAÍDA", "TIPO DE DESLIGAMENTO", "STATUS HUB"
  ];
  const updates = toCellUpdates(sheet.headers, values, targetRow, TAB_COLABORADOR, allowed);
  await updateCells(updates, token);
}

async function upsertAlteration(client: ReturnType<typeof createClient>, row: QueueRow, token: string, metadata: { sheets: Sheet[] }) {
  if (!CHANGE_TABLES.has(row.source_table)) throw new Error("A origem desta alteração não é suportada.");
  const { data: event, error: eventError } = await client.from(row.source_table).select("*").eq("id", row.source_id).maybeSingle();
  if (eventError) throw eventError;
  if (!event) return deleteAlteration(row.source_id, token, metadata);
  const { data: person, error: personError } = await client.from("rh_colaboradores").select("nome_completo").eq("id", event.colaborador_id).maybeSingle();
  if (personError) throw personError;
  if (!person?.nome_completo) throw new Error("O nome do colaborador da alteração não está disponível.");
  const sheet = await readTab(TAB_ALTERACOES, token);
  const ids = keyRows(sheet, "REGISTRO DA ALTERAÇÃO");
  const matches = exactMatches(ids, row.source_id);
  if (matches.length > 1) throw new Error("Há mais de uma linha com o mesmo REGISTRO DA ALTERAÇÃO.");
  const targetRow = matches[0]?.rowIndex ?? await appendSheetRow(TAB_ALTERACOES, token, metadata);
  const values = alterationValues(event, text(person.nome_completo), row.source_table);
  const allowed = ["NOME COMPLETO", "DATA", "TIPO DE REGISTRO", "ALT SAL-CARGO E FUNCAO", "AFASTAMENTO", "REGISTRO DA ALTERACAO", "FÉRIAS - S-AQUISIÇÃO", "FÉRIAS - E-AQUISIÇÃO", "FÉRIAS - S-GOZO", "FÉRIAS - E-GOZO", "FERIAS - ABONO", "OBSERVAÇÕES"];
  await updateCells(toCellUpdates(sheet.headers, values, targetRow, TAB_ALTERACOES, allowed), token);
}

async function deleteAlteration(id: string, token: string, metadata: { sheets: Sheet[] }) {
  const sheet = await readTab(TAB_ALTERACOES, token);
  const matches = exactMatches(keyRows(sheet, "REGISTRO DA ALTERAÇÃO"), id);
  for (const item of matches.sort((left, right) => right.rowIndex - left.rowIndex)) {
    await deleteSheetRow(TAB_ALTERACOES, item.rowIndex, token, metadata);
  }
}

async function processRow(client: ReturnType<typeof createClient>, row: QueueRow, token: string, metadata: { sheets: Sheet[] }) {
  if (row.target === "colaborador") {
    if (row.action === "delete") throw new Error("Exclusão física de colaborador não é suportada; use o status inativo.");
    await upsertCollaborator(client, row, token, metadata);
  } else if (row.target === "alteracao") {
    if (row.action === "delete") await deleteAlteration(row.source_id, token, metadata);
    else await upsertAlteration(client, row, token, metadata);
  }
}

async function claimRows(client: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();
  await client.from("rh_google_sheets_sync_queue")
    .update({ status: "pending", locked_at: null, updated_at: now })
    .eq("status", "processing")
    .lt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const { data: pending, error } = await client.from("rh_google_sheets_sync_queue")
    .select("id,source_table,source_id,colaborador_id,target,action,version,attempts")
    .eq("status", "pending")
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw error;
  const claimed: QueueRow[] = [];
  for (const candidate of pending || []) {
    const item = candidate as QueueRow;
    const { data, error: claimError } = await client.from("rh_google_sheets_sync_queue")
      .update({ status: "processing", locked_at: now, updated_at: now })
      .eq("id", item.id)
      .eq("status", "pending")
      .eq("version", item.version)
      .select("id,source_table,source_id,colaborador_id,target,action,version,attempts")
      .maybeSingle();
    if (claimError) throw claimError;
    if (data) claimed.push(data as QueueRow);
  }
  return claimed;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, message: "Método não permitido." }, 405);
  if (request.headers.has("X-Sheets-Edit-Token")) return await handleSheetEdit(request);
  const manualSync = request.headers.get("X-Manual-Sync") === "true";
  const supabaseUrl = text(Deno.env.get("SUPABASE_URL"));
  const serviceKey = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"));
  if (!supabaseUrl || !serviceKey) return json({ ok: false, message: "Worker sem configuração do Supabase." }, 500);

  if (manualSync) {
    const authorizationError = await authorizeManualSync(request, supabaseUrl);
    if (authorizationError) return authorizationError;
  } else if (request.headers.has("X-Sheets-Sync-Token")) {
    const expected = text(Deno.env.get("RH_GOOGLE_SHEETS_INBOUND_TOKEN"));
    const provided = text(request.headers.get("X-Sheets-Sync-Token"));
    if (!expected || !sameSecret(provided, expected)) return json({ ok: false, message: "Sincronização manual não autorizada." }, 401);
    const body = await request.json().catch(() => ({})) as Data;
    if (body.action !== "sync_now" || text(body.spreadsheetId) !== SHEET_ID) {
      return json({ ok: false, message: "Solicitação de sincronização inválida." }, 403);
    }
  } else {
    const expected = text(Deno.env.get("RH_GOOGLE_SHEETS_WORKER_TOKEN"));
    const provided = text(request.headers.get("X-Worker-Token"));
    if (!expected || !sameSecret(provided, expected)) return json({ ok: false, message: "Worker não autorizado." }, 401);
  }
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const rows = await claimRows(client).catch((error) => {
    return { error: error instanceof Error ? error.message : "Não foi possível carregar a fila.", rows: [] as QueueRow[] };
  });
  if ("error" in rows) return json({ ok: false, message: rows.error }, 500);
  if (!rows.length) return json({ ok: true, processed: 0 });

  try {
    const account = serviceAccount();
    const token = await googleAccessToken(account);
    const metadata = await spreadsheetMetadata(token);
    const sheetTabs = new Set(metadata.sheets?.map((sheet) => sheet.properties.title) || []);
    if (!sheetTabs.has(TAB_COLABORADOR) || !sheetTabs.has(TAB_ALTERACOES)) throw new Error("A planilha precisa conter as abas CAD_COLABORADOR e CAD_ALTERACOES.");

    const results = [];
    for (const row of rows) {
      const correlationId = novoCorrelationId();
      const startedAt = Date.now();
      await registrarLogIntegracao(client, { sistema: "google_sheets", tipo: "sincronizacao", evento: row.target, status: "started", correlation_id: correlationId, external_id: row.source_id, tentativa: row.attempts + 1, detalhes: { queue_id: row.id, source_table: row.source_table } });
      try {
        await processRow(client, row, token, metadata);
        await client.from("rh_google_sheets_sync_queue").update({ status: "success", locked_at: null, last_error: null, updated_at: new Date().toISOString() }).eq("id", row.id).eq("version", row.version);
        await registrarLogIntegracao(client, { sistema: "google_sheets", tipo: "sincronizacao", evento: row.target, status: "success", correlation_id: correlationId, external_id: row.source_id, tentativa: row.attempts + 1, duracao_ms: Date.now() - startedAt, detalhes: { queue_id: row.id, source_table: row.source_table } });
        results.push({ id: row.id, status: "success" });
      } catch (error) {
        const attempts = row.attempts + 1;
        const message = error instanceof Error ? error.message : "Falha ao sincronizar com o Google Sheets.";
        const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
        await client.from("rh_google_sheets_sync_queue").update({ status: "pending", attempts, available_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(), locked_at: null, last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", row.id).eq("version", row.version);
        await registrarLogIntegracao(client, { sistema: "google_sheets", tipo: "sincronizacao", evento: row.target, status: "retrying", nivel: "error", mensagem: message, correlation_id: correlationId, external_id: row.source_id, tentativa: attempts, duracao_ms: Date.now() - startedAt, detalhes: { queue_id: row.id, source_table: row.source_table } });
        results.push({ id: row.id, status: "retrying", message });
      }
    }
    return json({ ok: true, processed: rows.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker sem acesso ao Google Sheets.";
    const availableAt = new Date(Date.now() + 60_000).toISOString();
    for (const row of rows) {
      await client.from("rh_google_sheets_sync_queue").update({ status: "pending", attempts: row.attempts + 1, available_at: availableAt, locked_at: null, last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", row.id).eq("version", row.version);
    }
    return json({ ok: false, message, processed: 0 }, 502);
  }
});
