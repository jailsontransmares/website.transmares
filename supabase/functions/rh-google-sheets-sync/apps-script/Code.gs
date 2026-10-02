const RH_SHEET_ID = "1NG_kq5afXgsqhaklu-D0JXPhd4ICyV_U6x7M8dN2V-8";
const RH_SYNC_FUNCTION = "https://lmzdtsqhlrosovbxiadx.supabase.co/functions/v1/rh-google-sheets-sync";
const RH_INBOUND_TOKEN_PROPERTY = "RH_GOOGLE_SHEETS_INBOUND_TOKEN";

const RH_EDITABLE_HEADERS = {
  CAD_COLABORADOR: new Set([
    "nomecompleto", "datadenascimento", "estadocivil", "nacionalidade", "naturalidade",
    "nomecompletodoseupai", "nomecompletodasuamae", "sexo", "escolaridade", "cor",
    "telefonecelular", "contatodeemergenciaemcasodeacidente", "nomedocontatodeemergencia",
    "emaildecontato", "rua", "numero", "complemento", "bairro", "cidade", "uf", "cep",
    "secnhqualcategoria", "datadeemissaoexpedicao", "orgaoufemissor", "titulodeeleitora",
    "zona", "secaodevotacao", "numerodasactps", "serie", "datadeexpedicaoctps", "ufctps",
    "reservistadocmilitar", "categoriadereservista", "piscadastro", "pisnumero", "tipodevinculo",
    "tipodedesligamento", "datadeadmissao", "cargo", "funcao", "cbo", "salariobolsa", "cargahorariames",
    "jornadadetrabalho", "intervalo", "datadesaida", "rgcnh"
  ]),
  CAD_ALTERACOES: new Set([
    "data", "observacoes", "feriassaquisicao", "feriaseaquisicao", "feriassgozo",
    "feriasegozo", "feriasabono"
  ])
};

function rhNormalizeHeader_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function rhSerializeCell_(cell, header, timeZone) {
  const value = cell.getValue();
  const key = rhNormalizeHeader_(header);
  if (value instanceof Date) {
    const format = key.includes("hora") || key === "intervalo" ? "HH:mm" : "yyyy-MM-dd";
    return Utilities.formatDate(value, timeZone, format);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  return cell.getDisplayValue();
}

function rhProcessSheetEdit(event) {
  if (!event || !event.range) return;
  const range = event.range;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;

  const spreadsheet = event.source;
  if (!spreadsheet || spreadsheet.getId() !== RH_SHEET_ID) return;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  if (!(sheetName in RH_EDITABLE_HEADERS)) return;

  const rowNumber = range.getRow();
  if (rowNumber < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const header = headers[range.getColumn() - 1];
  const normalizedHeader = rhNormalizeHeader_(header);
  const dependentField = /^dependentelegal0?[1-3](nomecompleto|datadenascimento)$/.test(normalizedHeader);
  if (!header || (!RH_EDITABLE_HEADERS[sheetName].has(normalizedHeader) && !dependentField)) return;

  const headerKeys = headers.map(rhNormalizeHeader_);
  let identity;
  if (sheetName === "CAD_COLABORADOR") {
    const cpfIndex = headerKeys.indexOf("seucpf");
    if (cpfIndex < 0) throw new Error("A aba CAD_COLABORADOR precisa ter a coluna SEU CPF.");
    identity = { cpf: String(sheet.getRange(rowNumber, cpfIndex + 1).getDisplayValue()).replace(/\D/g, "") };
    if (dependentField) {
      const slot = normalizedHeader.match(/^dependentelegal0?([1-3])/)[1];
      const nameIndex = headerKeys.indexOf("dependentelegal" + String(slot).padStart(2, "0") + "nomecompleto");
      const birthIndex = headerKeys.indexOf("dependentelegal" + String(slot).padStart(2, "0") + "datadenascimento");
      if (nameIndex < 0 || birthIndex < 0) throw new Error("A aba precisa conter nome e nascimento para o dependente editado.");
      const currentName = String(sheet.getRange(rowNumber, nameIndex + 1).getDisplayValue()).trim();
      const birthCell = sheet.getRange(rowNumber, birthIndex + 1);
      const currentBirth = rhSerializeCell_(birthCell, headers[birthIndex], spreadsheet.getSpreadsheetTimeZone());
      const editingName = normalizedHeader.endsWith("nomecompleto");
      identity.dependentName = currentName;
      identity.dependentBirthDate = currentBirth;
      identity.oldDependentName = editingName ? String(event.oldValue || "").trim() : currentName;
      identity.oldDependentBirthDate = editingName ? currentBirth : String(event.oldValue || "").trim();
    }
  } else {
    const idIndex = headerKeys.indexOf("registrodaalteracao");
    if (idIndex < 0) throw new Error("A aba CAD_ALTERACOES precisa ter a coluna REGISTRO DA ALTERAÇÃO.");
    identity = { alterationId: String(sheet.getRange(rowNumber, idIndex + 1).getDisplayValue()).trim() };
  }

  const token = PropertiesService.getScriptProperties().getProperty(RH_INBOUND_TOKEN_PROPERTY);
  if (!token) throw new Error("Configure RH_GOOGLE_SHEETS_INBOUND_TOKEN nas propriedades do script.");
  const payload = {
    spreadsheetId: spreadsheet.getId(),
    sheet: sheetName,
    rowNumber,
    header,
    value: rhSerializeCell_(range, header, spreadsheet.getSpreadsheetTimeZone()),
    eventId: Utilities.getUuid(),
    ...identity
  };
  const result = UrlFetchApp.fetch(RH_SYNC_FUNCTION, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Sheets-Edit-Token": token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = result.getResponseCode();
  if (status < 200 || status >= 300) {
    console.error("Falha ao enviar edição da planilha ao Hub. HTTP " + status + ". " + result.getContentText().slice(0, 500));
  }
}

function rhInstalarGatilhoDeEdicao() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet || spreadsheet.getId() !== RH_SHEET_ID) {
    throw new Error("Abra o Apps Script vinculado à planilha de RH antes de instalar o gatilho.");
  }
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "rhProcessSheetEdit")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("rhProcessSheetEdit").forSpreadsheet(spreadsheet).onEdit().create();
}
