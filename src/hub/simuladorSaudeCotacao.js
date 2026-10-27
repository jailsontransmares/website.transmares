import './simuladorSaudeCotacao.css';
import { chamarApi } from './api.js';
import { SIMULADOR_SAUDE_ROUTE } from './simuladorSaudeRoutes.js';
import { obterBaseHub } from './routeConfig.js';
import { renderHubRecordHeader } from './recordWorkflow.js';
import { formatCoparticipacaoTable, isCoparticipacaoTable, normalizeCoparticipacaoTable } from './simuladorSaudeCoparticipacao.js';
import { consultarCnpj } from './services/cnpjService.js';

const BANDS = ['0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+'];
const ACCOMMODATIONS = ['Apartamento', 'Enfermaria', 'Ambulatorial'];
const quote = { id: '', code: '', version: 0, company: '', cnpj: '', city: '', citySource: 'unset', cnpjLookupLoading: false, cnpjLookupError: '', type: 'Empresarial (PJ)', effectiveDate: '', lives: [], plans: [], expandedGroups: new Set(), operatorFilter: '', accommodationFilter: '', copayFilter: '', modal: '', planPicker: { operatorId: '', coparticipacoes: ['true', 'false'], accommodations: [...ACCOMMODATIONS], selectedTableIds: [] }, manualIofPreview: null, manualPlanMode: false, manualPlanEditingId: '', inlineLives: [], batchEditingLives: false, removedInlineLifeIds: [], catalogError: '', catalog: { operators: [], plans: [], tables: [], bands: [] }, notice: '', saving: false, loading: false, savedSignature: '', initialized: false, importText: '', importPreview: null };
let context = {};
let quoteToastKey = '';
let cnpjLookupTimer = null;
let cnpjLookupRequestId = 0;

function esc(value = '') { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function normalizeCnpj(value) {
  const chars = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  return `${chars.slice(0, 12)}${chars.slice(12).replace(/\D/g, '').slice(0, 2)}`;
}
function maskCnpj(value) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
function cnpjCaretPosition(masked, charCount) {
  if (!charCount) return 0;
  let count = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (/[A-Z0-9]/.test(masked[index])) count += 1;
    if (count >= charCount) return index + 1;
  }
  return masked.length;
}
function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
function dateLabel(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'; }
function money(value) { return Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; }
function parseManualPrice(value) {
  let normalized = String(value ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  const price = Number(normalized);
  return Number.isFinite(price) ? price : NaN;
}
function proposalDetail(item, key) {
  const value = item.plan?.detalhes?.[key] ?? item.table?.condicoes?.[key];
  if (key === 'coparticipacao') {
    const tableText = formatCoparticipacaoTable(value);
    if (tableText !== null) return tableText;
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(entry => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return String(entry ?? '');
    if (entry.prazo || entry.cobertura) return `${entry.prazo || ''}: ${entry.cobertura || ''}`.trim();
    return [entry.nome || entry.procedimento, entry.descricao || entry.endereco, entry.valor_por_vida != null ? `${money(Number(entry.valor_por_vida))} por vida` : ''].filter(Boolean).join(' · ');
  }).filter(Boolean).join(['coparticipacao', 'carencias'].includes(key) ? '\n' : ' · ');
  if (value && typeof value === 'object') {
    if (value.observacao) return value.observacao;
    return Object.entries(value).filter(([name]) => name !== 'observacao').map(([name, rule]) => {
      if (!rule || typeof rule !== 'object') return `${name}: ${rule}`;
      return `${name}: ${rule.valor != null ? money(Number(rule.valor)) : `${rule.percentual ?? ''}%${rule.limite != null ? `, limite ${money(Number(rule.limite))}` : ''}`}`;
    }).join(['coparticipacao', 'carencias'].includes(key) ? '\n' : ' · ');
  }
  return '';
}
function coparticipacaoProposalTable(value) {
  if (!isCoparticipacaoTable(value)) return '';
  const table = normalizeCoparticipacaoTable(value);
  const columns = table.colunas.filter(column => column.label || table.linhas.some(row => String(row.celulas[column.id] || '').trim()));
  const rows = table.linhas.filter(row => columns.some(column => String(row.celulas[column.id] || '').trim()));
  if (!columns.length || !rows.length) return '';
  return `<div class="copay-detail-table-wrap"><table class="copay-detail-table"><thead><tr>${columns.map(column => `<th>${esc(column.label || '—')}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${esc(row.celulas[column.id] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function ageOf(birth, reference = quote.effectiveDate || today()) {
  if (!birth) return null;
  const born = new Date(`${birth}T12:00:00`); const at = new Date(`${reference}T12:00:00`);
  if (Number.isNaN(born.getTime()) || born > at) return null;
  let age = at.getFullYear() - born.getFullYear();
  if (at.getMonth() < born.getMonth() || (at.getMonth() === born.getMonth() && at.getDate() < born.getDate())) age -= 1;
  return age;
}
function normalizeManualBirthDate(value) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText); const month = Number(monthText); const year = Number(yearText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return '';
  return `${yearText}-${monthText}-${dayText}`;
}
function formatBirthDateInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
function formatBirthDateTyping(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function parseManualAge(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const age = Number(text);
  return Number.isSafeInteger(age) ? age : null;
}
function lifeDisplayName(life) { return String(life?.nome || '').trim() || (life?.tipo === 'titular' ? 'Titular' : 'Dependente'); }
function inlineLifeDraft(life = {}, groupId = '') {
  const nascimento = life.nascimento || '';
  const idadeNascimento = nascimento ? ageOf(nascimento) : null;
  const idadeSalva = parseManualAge(life.idade);
  return { nome: life.nome || '', nascimento, nascimentoTexto: formatBirthDateInput(nascimento), idade: idadeNascimento ?? idadeSalva ?? '', ageSource: nascimento ? 'nascimento' : idadeSalva !== null ? 'idade' : 'nascimento', grupo_id: life.grupo_id || groupId };
}
function ageBand(age) {
  if (!Number.isInteger(age) || age < 0) return '';
  if (age <= 18) return BANDS[0]; if (age <= 23) return BANDS[1]; if (age <= 28) return BANDS[2]; if (age <= 33) return BANDS[3]; if (age <= 38) return BANDS[4]; if (age <= 43) return BANDS[5]; if (age <= 48) return BANDS[6]; if (age <= 53) return BANDS[7]; if (age <= 58) return BANDS[8]; return BANDS[9];
}
function nextId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function quotePlanEntry(tableId) { return quote.plans.find(item => item.tableId === tableId) || {}; }
function accommodationVariants() {
  return quote.catalog.tables.flatMap(table => {
    const accommodations = [...new Set((Array.isArray(table.acomodacoes) ? table.acomodacoes : []).filter(Boolean))];
    return accommodations.map(acomodacao => ({ ...table, id: `${table.id}::${acomodacao}`, tabela_preco_id: table.id, acomodacao }));
  });
}
function planFor(tableId) { return quotePlanEntry(tableId).table_snapshot || accommodationVariants().find(table => table.id === tableId) || quote.catalog.tables.find(table => table.id === tableId) || {}; }
function planInfo(table) { return quotePlanEntry(table.id).plan_snapshot || quote.catalog.plans.find(plan => plan.id === table.plano_id) || {}; }
function operatorInfo(plan) { return quotePlanEntry(quote.plans.find(item => item.plan_snapshot?.id === plan.id)?.tableId || '').operator_snapshot || quote.catalog.operators.find(operator => operator.id === plan.operadora_id) || {}; }
function normalizeQuotePlanEntry(entry) {
  const table = { ...(entry.table_snapshot || {}) };
  const plan = { ...(entry.plan_snapshot || {}) };
  if (table.acomodacao == null && plan.acomodacao != null) table.acomodacao = plan.acomodacao;
  if (table.coparticipacao == null && plan.coparticipacao != null) table.coparticipacao = plan.coparticipacao;
  if (!table.codigo_interno && plan.codigo_interno != null) table.codigo_interno = plan.codigo_interno;
  delete plan.acomodacao;
  delete plan.coparticipacao;
  delete plan.codigo_interno;
  return { ...entry, table_snapshot: table, plan_snapshot: plan };
}
function pricesFor(tableId) {
  const saved = quotePlanEntry(tableId).prices_snapshot;
  if (saved) return saved;
  const table = planFor(tableId);
  const parentTableId = table.tabela_preco_id || table.id;
  const rows = quote.catalog.bands.filter(item => item.tabela_preco_id === parentTableId && item.acomodacao === table.acomodacao);
  if (table.tipo_contratacao === 'Individual') {
    return Object.fromEntries(['uma_vida', 'duas_ou_mais'].map(rule => [rule, Object.fromEntries(rows.filter(item => item.regra_vidas === rule).map(item => [item.faixa_etaria, Number(item.valor)]))]));
  }
  return { geral: Object.fromEntries(rows.map(item => [item.faixa_etaria, Number(item.valor)])) };
}
function displayCatalogStatus(table) { return table.status === 'vigente' && (!table.vigencia_fim || table.vigencia_fim >= (quote.effectiveDate || today())) && table.vigencia_inicio <= (quote.effectiveDate || today()); }
function validCatalogTables() { return accommodationVariants().filter(table => table.status === 'vigente' && displayCatalogStatus(table) && quote.catalog.plans.some(plan => plan.id === table.plano_id && plan.status === 'ativo') && (table.tipo_contratacao || 'Empresarial (PJ)') === quote.type); }
function planPickerTables() {
  const picker = quote.planPicker;
  return validCatalogTables().filter(table => {
    if (quote.plans.some(item => item.tableId === table.id)) return false;
    if (!picker.accommodations.includes(table.acomodacao)) return false;
    if (!picker.coparticipacoes.includes(String(Boolean(table.coparticipacao)))) return false;
    return true;
  });
}
function lifeAge(life) { return life.nascimento ? ageOf(life.nascimento) : parseManualAge(life.idade); }
function lifeBand(life) { return ageBand(lifeAge(life)); }
function groupNumber(groupId) { const index = quote.lives.filter(life => life.tipo === 'titular').findIndex(life => life.id === groupId); return String(index + 1).padStart(2, '0'); }
function livesInGroup(groupId) { return quote.lives.filter(life => life.grupo_id === groupId).sort((a, b) => a.tipo === b.tipo ? String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR') : a.tipo === 'titular' ? -1 : 1); }
function groupHead(groupId) { return quote.lives.find(life => life.id === groupId && life.tipo === 'titular'); }
function groupIds() { return quote.lives.filter(life => life.tipo === 'titular').map(life => life.id); }
function planPrice(tableId, life) {
  const band = lifeBand(life); const prices = pricesFor(tableId);
  if (!band) return null;
  if (prices[band] !== '' && Number.isFinite(Number(prices[band]))) return Number(prices[band]); // cotações históricas e tabelas avulsas
  const hasMultiLifeRate = Object.values(prices.duas_ou_mais || {}).some(value => value !== '' && value != null && Number.isFinite(Number(value)));
  const rules = quote.type === 'Individual'
    ? (quote.lives.length >= 2 && hasMultiLifeRate ? prices.duas_ou_mais : prices.uma_vida)
    : prices.geral;
  return rules?.[band] !== '' && Number.isFinite(Number(rules?.[band])) ? Number(rules[band]) : null;
}
function totalsFor(tableId, groupId) { const members = livesInGroup(groupId); const values = members.map(life => planPrice(tableId, life)); return { total: values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null, incomplete: members.filter((life, index) => !Number.isFinite(values[index])).map(life => `${lifeDisplayName(life)} (${lifeBand(life) || 'idade inválida'})`) }; }
function planTotal(tableId) { if (!quote.lives.length) return null; const totals = groupIds().map(id => totalsFor(tableId, id)); return totals.every(item => Number.isFinite(item.total)) ? totals.reduce((sum, item) => sum + item.total, 0) : null; }
function selectedPlans() {
  return quote.plans.map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))) }))
    .filter(item => item.table.id)
    .filter(item => !quote.operatorFilter || item.operator.id === quote.operatorFilter)
    .filter(item => !quote.accommodationFilter || item.table.acomodacao === quote.accommodationFilter)
    .filter(item => !quote.copayFilter || String(item.table.coparticipacao) === quote.copayFilter);
}
function quoteOperators() {
  const operators = [...quote.catalog.operators, ...quote.plans.map(item => item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))))];
  const seen = new Set();
  return operators.filter(operator => operator?.id && !seen.has(operator.id) && seen.add(operator.id));
}
function clearQuoteToast() {
  window.hubToast?.dismiss('simulador-saude-quote');
}
function showQuoteToast(message, { isError = false, retry = false } = {}) {
  window.hubToast?.show(message, {
    type: isError ? 'error' : 'success',
    dedupeKey: 'simulador-saude-quote',
    action: retry ? { label: 'Tentar novamente', onClick: () => { quoteToastKey = ''; window.saudeQuoteReloadCatalog(); } } : undefined
  });
  window.setTimeout(() => {
    if (!isError && quote.notice === message) { quote.notice = ''; quoteToastKey = ''; }
  }, 5000);
}
function syncQuoteToast() {
  const isError = Boolean(quote.cnpjLookupError || quote.catalogError);
  const message = quote.cnpjLookupError || (quote.catalogError ? `Catálogo indisponível. ${quote.catalogError}` : quote.notice);
  if (!message) { quoteToastKey = ''; clearQuoteToast(); return; }
  const key = `${isError ? 'error' : 'notice'}:${message}`;
  if (key === quoteToastKey) return;
  quoteToastKey = key;
  showQuoteToast(message, { isError, retry: Boolean(quote.catalogError) && !quote.cnpjLookupError, isCorner: Boolean(quote.cnpjLookupError) });
}
function setCnpjLookupStatus(message = '') {
  const status = document.querySelector('[data-saude-cnpj-lookup-status]');
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  const button = document.querySelector('[data-saude-cnpj-lookup-button]');
  if (button) button.disabled = Boolean(message);
}
function cancelCnpjLookup() {
  cnpjLookupRequestId += 1;
  if (cnpjLookupTimer) window.clearTimeout(cnpjLookupTimer);
  cnpjLookupTimer = null;
  quote.cnpjLookupLoading = false;
  setCnpjLookupStatus();
  return cnpjLookupRequestId;
}
function queueCnpjLookup(cnpj, delay = 450) {
  const requestId = cancelCnpjLookup();
  quote.cnpjLookupError = '';
  syncQuoteToast();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return;
  cnpjLookupTimer = window.setTimeout(() => {
    cnpjLookupTimer = null;
    lookupCnpj(cnpj, requestId);
  }, delay);
}
async function lookupCnpj(cnpj, requestId) {
  if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
  quote.cnpjLookupLoading = true;
  setCnpjLookupStatus('Consultando CNPJ…');
  try {
    const result = await consultarCnpj(cnpj);
    if (!result.found || !result.data) throw new Error('CNPJ não localizado na consulta.');
    if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
    const municipality = String(result.data.municipio || '').trim();
    const state = String(result.data.uf || '').trim().toUpperCase();
    if (!municipality || !state) throw new Error('Cidade não retornada');
    if (!quote.city.trim() || quote.citySource === 'unset' || quote.citySource === 'cnpj') {
      quote.city = `${municipality} / ${state}`;
      quote.citySource = 'cnpj';
      const cityInput = document.querySelector('[data-saude-quote-city]');
      if (cityInput) cityInput.value = quote.city;
    }
  } catch (error) {
    if (requestId !== cnpjLookupRequestId || quote.cnpj !== cnpj) return;
    const detail = error instanceof Error ? error.message.trim() : '';
    quote.cnpjLookupError = `${detail || 'Não foi possível consultar o CNPJ.'} Preencha Cidade / UF manualmente.`;
    syncQuoteToast();
  } finally {
    if (requestId === cnpjLookupRequestId) {
      quote.cnpjLookupLoading = false;
      setCnpjLookupStatus();
    }
  }
}

function renderHeader() {
  const canSave = quote.id
    ? Boolean(context.pode?.('simulador_saude', 'view'))
    : Boolean(context.pode?.('simulador_saude', 'create'));
  const actions = `<button class="secondary-btn" type="button" onclick="saudeQuoteClear()"><i data-lucide="eraser" aria-hidden="true"></i> Limpar</button><button class="secondary-btn" type="button" onclick="saudeQuoteSave()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> ${quote.saving ? 'Salvando…' : 'Salvar'}</button><button class="save-btn" type="button" onclick="saudeQuoteProposal()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> Gerar Proposta</button>`;
  return renderHubRecordHeader({
    onBack: 'saudeQuoteBackToList()',
    backAriaLabel: 'Voltar às cotações',
    className: 'saude-quote-header hub-record-header',
    backClassName: 'icon-btn hub-record-back-button',
    contentClassName: 'hub-record-header-content saude-quote-title',
    actionsClassName: 'hub-record-header-actions saude-quote-header-actions',
    content: `<span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><h2>Cotação de Plano de Saúde</h2>${quote.code ? `<p>Cotação #${quote.code} · versão ${quote.version}</p>` : ''}</div>`,
    actions,
    disabled: quote.loading
  });
}

function renderCompany() {
  return `<section class="saude-quote-card"><header><h3><i data-lucide="landmark" aria-hidden="true"></i> Dados do Cliente / Empresa</h3></header><div class="saude-quote-company-grid"><label class="saude-quote-field"><span>Cliente / Razão Social</span><input value="${esc(quote.company)}" oninput="saudeQuoteField('company', this.value)"></label><label class="saude-quote-field saude-quote-cnpj-field"><span>CNPJ (se empresarial)</span><span class="saude-quote-cnpj-control"><input value="${esc(maskCnpj(quote.cnpj))}" inputmode="text" maxlength="18" autocomplete="off" placeholder="00.000.000/0000-00" aria-describedby="saude-quote-cnpj-status" oninput="saudeQuoteCnpjInput(this)"><button class="icon-btn saude-quote-cnpj-lookup" type="button" data-saude-cnpj-lookup-button aria-label="Consultar CNPJ" title="Consultar CNPJ" onclick="saudeQuoteLookupCnpj()"><i data-lucide="search" aria-hidden="true"></i></button></span><small id="saude-quote-cnpj-status" class="saude-quote-cnpj-status" data-saude-cnpj-lookup-status aria-live="polite" hidden></small></label><label class="saude-quote-field"><span>Cidade</span><input data-saude-quote-city value="${esc(quote.city)}" oninput="saudeQuoteField('city', this.value)"></label><label class="saude-quote-field"><span>Tipo de contratação</span><select onchange="saudeQuoteField('type', this.value)"><option value="Individual" ${quote.type === 'Individual' ? 'selected' : ''}>Individual</option><option value="Empresarial (PJ)" ${quote.type === 'Empresarial (PJ)' ? 'selected' : ''}>Empresarial</option></select></label><label class="saude-quote-field"><span>Vigência desejada</span><input data-saude-effective-date type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA" value="${esc(formatBirthDateInput(quote.effectiveDate))}" oninput="saudeQuoteEffectiveDateInput(this)"></label></div></section>`;
}

function renderImportModal() {
  if (quote.modal !== 'import') return '';
  const preview = quote.importPreview;
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><section class="saude-quote-modal saude-quote-import-modal" role="dialog" aria-modal="true" aria-labelledby="saude-import-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Planilha</span><h3 id="saude-import-title">Importar vidas do Excel</h3><p>Cole as células copiadas da planilha. Cabeçalho opcional: Grupo, Tipo, Nome, Nascimento.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header>${preview ? `<div class="saude-import-results ${preview.errors.length ? 'has-errors' : ''}"><strong>${preview.validRows.length} linha(s) válida(s) · ${preview.errors.length} erro(s)</strong>${preview.errors.map(error => `<p>Linha ${error.line}: ${esc(error.message)}</p>`).join('') || '<p>Todos os grupos têm um titular e as datas estão válidas.</p>'}<div class="saude-import-preview">${preview.validRows.slice(0, 8).map(row => `<span>Grupo ${esc(row.grupo)} · ${esc(row.tipo)} · ${esc(row.nome)} · ${dateLabel(row.nascimento)}</span>`).join('')}</div></div>` : `<form onsubmit="saudeQuoteValidateImport(event)"><label class="saude-quote-field"><span>Dados copiados do Excel</span><textarea name="importText" rows="9" placeholder="Grupo&#9;Tipo&#9;Nome&#9;Nascimento">${esc(quote.importText)}</textarea></label><footer><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Cancelar</button><button class="save-btn" type="submit">Validar dados</button></footer></form>`}${preview ? `<footer><button class="secondary-btn" type="button" onclick="saudeQuoteRevisarImport()">Voltar</button><button class="save-btn" type="button" onclick="saudeQuoteCommitImport()" ${!preview.validRows.length || preview.errors.length ? 'disabled' : ''}>Adicionar vidas</button></footer>` : ''}</section></div>`;
}

function normalizeImportToken(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normalizeImportDate(value) {
  const text = String(value || '').trim();
  let iso = text;
  if (/^\d+(?:\.\d+)?$/.test(text) && Number(text) > 10000) {
    const serial = Math.floor(Number(text)); const date = new Date(Date.UTC(1899, 11, 30 + serial));
    iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (!match) return '';
    iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  const [year, month, day] = iso.split('-').map(Number); const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? iso : '';
}
function previewLifeImport(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return { validRows: [], errors: [{ line: 1, message: 'Cole as linhas da planilha.' }] };
  const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
  const cells = line => line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  const first = cells(lines[0]).map(normalizeImportToken);
  const headered = first.some(value => ['grupo', 'tipo', 'nome', 'nascimento'].includes(value));
  const headers = headered ? first : ['grupo', 'tipo', 'nome', 'nascimento'];
  const ix = key => headers.indexOf(key);
  const rows = []; const errors = [];
  lines.slice(headered ? 1 : 0).forEach((line, index) => {
    const values = cells(line); const get = key => { const position = ix(key); return position >= 0 ? values[position] || '' : ''; };
    const lineNumber = index + (headered ? 2 : 1); const originalGroup = get('grupo'); const group = originalGroup.replace(/^0+(?=\d)/, '') || '0';
    const rawType = normalizeImportToken(get('tipo')); const tipo = rawType === 'titular' ? 'titular' : rawType === 'dependente' ? 'dependente' : '';
    const nome = get('nome'); const nascimento = normalizeImportDate(get('nascimento')); const issues = [];
    if (!originalGroup) issues.push('grupo ausente'); if (!tipo) issues.push('tipo deve ser Titular ou Dependente'); if (!nome) issues.push('nome ausente'); if (!nascimento) issues.push('data de nascimento inválida'); else if (ageOf(nascimento, quote.effectiveDate || today()) === null) issues.push('data futura ou fora do intervalo válido');
    if (issues.length) errors.push({ line: lineNumber, message: issues.join('; ') }); else rows.push({ line: lineNumber, grupo: group, tipo, nome, nascimento });
  });
  const titularGroups = new Map();
  rows.filter(row => row.tipo === 'titular').forEach(row => titularGroups.set(row.grupo, (titularGroups.get(row.grupo) || 0) + 1));
  rows.forEach(row => { const count = titularGroups.get(row.grupo) || 0; if (count !== 1) errors.push({ line: row.line, message: count ? 'o grupo tem mais de um titular' : 'não há titular para este grupo' }); });
  return { validRows: rows, errors };
}

function renderLives() {
  const removedIds = new Set(quote.removedInlineLifeIds);
  const visibleLives = quote.lives.filter(item => !removedIds.has(item.id));
  const pendingAdds = quote.inlineLives.filter(item => item.mode === 'add');
  const titulares = visibleLives.filter(item => item.tipo === 'titular').length + pendingAdds.filter(item => item.tipo === 'titular').length;
  const dependents = visibleLives.filter(item => item.tipo === 'dependente').length + pendingAdds.filter(item => item.tipo === 'dependente').length;
  const groups = groupIds();
  const edits = new Map(quote.inlineLives.filter(item => item.mode === 'edit').map(item => [item.id, item]));
  const rows = groups.flatMap(groupId => livesInGroup(groupId).filter(life => !removedIds.has(life.id)).map(life => {
    const draft = edits.get(life.id);
    if (draft) return inlineLifeRow(draft, groupId);
    return `<tr><td>${String(groupNumber(groupId)).padStart(2, '0')}</td><td><span class="saude-life-badge ${life.tipo}">${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td><strong>${esc(lifeDisplayName(life))}</strong></td><td>${dateLabel(life.nascimento)}</td><td>${lifeAge(life) ?? '—'}</td><td>${lifeBand(life) || '—'}</td><td class="saude-life-remove-cell"></td></tr>`;
  }));
  rows.push(...pendingAdds.map(item => inlineLifeRow(item)));
  const titularOptions = inlineTitularOptions();
  const hasPendingInlineLives = quote.inlineLives.length || quote.removedInlineLifeIds.length;
  const editLivesButton = quote.id && !quote.batchEditingLives
    ? `<button class="icon-btn saude-edit-all-lives" type="button" title="Editar todas as vidas" aria-label="Editar todas as vidas" onclick="saudeQuoteEditAllLives()" ${!quote.lives.length || hasPendingInlineLives ? 'disabled' : ''}><i data-lucide="pencil" aria-hidden="true"></i></button>`
    : '';
  return `<section class="saude-quote-card"><header class="saude-lives-header"><div class="saude-lives-heading"><h3><i data-lucide="users-round" aria-hidden="true"></i> Distribuição de Vidas</h3><div class="saude-quote-count-chips"><span>${titulares} titulares</span><span>${dependents} dependentes</span><span class="is-total">${visibleLives.length + pendingAdds.length} vidas</span></div></div><div class="saude-quote-actions">${hasPendingInlineLives ? '<button class="secondary-btn danger" type="button" onclick="saudeQuoteCancelAllInlineLives()">Cancelar</button><button class="save-btn" type="button" onclick="saudeQuoteSaveAllInlineLives()">Salvar</button>' : ''}${editLivesButton}<button class="save-btn" type="button" onclick="saudeQuoteAddInline(\'titular\')"><i data-lucide="plus" aria-hidden="true"></i> Titular</button><button class="secondary-btn" type="button" onclick="saudeQuoteAddInline(\'dependente\')" ${!titularOptions.length ? 'disabled' : ''}><i data-lucide="plus" aria-hidden="true"></i> Dependente</button><button class="secondary-btn" type="button" onclick="saudeQuoteOpenImport()" ${hasPendingInlineLives ? 'disabled' : ''}><i data-lucide="upload-cloud" aria-hidden="true"></i> Importar Excel</button></div></header><div class="saude-quote-lives-layout"><div class="saude-quote-table-wrap"><table class="saude-quote-lives-table"><colgroup><col class="saude-life-col-group"><col class="saude-life-col-type"><col class="saude-life-col-name"><col class="saude-life-col-birth"><col class="saude-life-col-age"><col class="saude-life-col-band"><col class="saude-life-col-remove"></colgroup><thead><tr><th>Grupo</th><th>Tipo</th><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Faixa Etária</th><th class="saude-life-remove-heading" aria-label="Remover"></th></tr></thead><tbody>${rows.length ? rows.join('') : '<tr><td colspan="7" class="saude-quote-empty">Adicione um titular para iniciar a cotação.</td></tr>'}</tbody></table></div></div></section>`;
}

function inlineTitularOptions() {
  const removedIds = new Set(quote.removedInlineLifeIds);
  return [
    ...quote.lives.filter(life => life.tipo === 'titular' && !removedIds.has(life.id)).map(life => ({ id: life.id, nome: life.nome || 'Titular' })),
    ...quote.inlineLives.filter(item => item.mode === 'add' && item.tipo === 'titular').map(item => ({ id: item.id, nome: item.draft.nome || 'Novo titular' }))
  ];
}

function inlineTitularNumber(id) {
  const savedIndex = quote.lives.filter(life => life.tipo === 'titular').findIndex(life => life.id === id);
  if (savedIndex >= 0) return String(savedIndex + 1).padStart(2, '0');
  const pendingIndex = quote.inlineLives.filter(item => item.mode === 'add' && item.tipo === 'titular').findIndex(item => item.id === id);
  return String(quote.lives.filter(life => life.tipo === 'titular').length + pendingIndex + 1).padStart(2, '0');
}

function inlineLifeRow(item, groupId = '') {
  const { key, id, mode, tipo, draft } = item;
  const selectedGroup = draft.grupo_id || groupId || inlineTitularOptions()[0]?.id || '';
  const draftAge = draft.idade !== '' && draft.idade != null ? draft.idade : ageOf(draft.nascimento);
  const groupCell = tipo === 'titular'
    ? `<td>${mode === 'edit' ? String(groupNumber(id)).padStart(2, '0') : 'Novo grupo'}</td>`
    : `<td><select class="saude-inline-input" data-inline-field="grupo_id" aria-label="Titular do grupo" onchange="saudeQuoteInlineField('${esc(key)}', 'grupo_id', this.value)">${inlineTitularOptions().map(option => `<option value="${esc(option.id)}" ${selectedGroup === option.id ? 'selected' : ''}>${inlineTitularNumber(option.id)} · ${esc(option.nome)}</option>`).join('')}</select></td>`;
  const rowControl = mode === 'edit' && quote.batchEditingLives
    ? `<button class="icon-btn danger saude-inline-remove-life" type="button" title="Remover vida" aria-label="Remover ${esc(draft.nome || 'vida')}" onclick="saudeQuoteRemoveInlineLife('${esc(key)}')"><i data-lucide="trash-2" aria-hidden="true"></i></button>`
    : `<button class="icon-btn danger saude-inline-remove-life" type="button" title="Cancelar inclusão" aria-label="Cancelar inclusão de ${esc(draft.nome || 'vida')}" onclick="saudeQuoteCancelInlineLife('${esc(key)}')"><i data-lucide="x" aria-hidden="true"></i></button>`;
  return `<tr class="saude-inline-life-row" data-inline-life="${esc(key)}">${groupCell}<td><span class="saude-life-badge ${tipo}">${tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td><div class="saude-inline-name-cell"><input class="saude-inline-input" data-inline-field="nome" aria-label="Nome" placeholder="${tipo === 'titular' ? 'Nome do titular' : 'Nome do dependente (opcional)'}" value="${esc(draft.nome || '')}" oninput="saudeQuoteInlineField('${esc(key)}', 'nome', this.value)" ${tipo === 'titular' ? 'required' : ''}></div></td><td><input class="saude-inline-input" data-inline-field="nascimento" aria-label="Nascimento (DD/MM/AAAA)" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="DD/MM/AAAA" value="${esc(draft.nascimentoTexto ?? formatBirthDateInput(draft.nascimento))}" oninput="saudeQuoteInlineField('${esc(key)}', 'nascimento', this.value)"></td><td><input class="saude-inline-input" data-inline-field="idade" aria-label="Idade" type="number" min="0" step="1" inputmode="numeric" placeholder="Idade" value="${esc(draftAge ?? '')}" oninput="saudeQuoteInlineField('${esc(key)}', 'idade', this.value)"></td><td data-inline-band>${ageBand(draftAge === '' || draftAge == null ? null : Number(draftAge)) || '—'}</td><td class="saude-life-remove-cell">${rowControl}</td></tr>`;
}

function renderPlanPicker() {
  if (!quote.modal || quote.modal !== 'plan') return '';
  const available = planPickerTables();
  if (quote.manualPlanMode) {
    const editing = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
    const currentOperator = normalizeImportToken(editing?.operator_snapshot?.nome || '').includes('bradesco') ? 'manual-bradesco' : 'manual-sulamerica';
    const currentPlan = editing?.plan_snapshot || {};
    const currentTable = editing?.table_snapshot || {};
    const currentPrices = editing?.prices_base_snapshot || editing?.prices_snapshot || {};
    return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><form class="saude-quote-modal saude-manual-plan-modal" role="dialog" aria-modal="true" aria-labelledby="saude-manual-plan-title" onsubmit="saudeQuoteAddManualPlan(event)" onclick="event.stopPropagation()"><header><div><h3 id="saude-manual-plan-title">${editing ? 'Editar valores manuais' : 'Adicionar plano manualmente'}</h3><p>Os valores serão salvos somente nesta cotação.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header><div class="saude-manual-plan-fields"><label class="saude-quote-field"><span>Operadora *</span><select name="operatorId" required><option value="manual-sulamerica" ${currentOperator === 'manual-sulamerica' ? 'selected' : ''}>SulAmérica</option><option value="manual-bradesco" ${currentOperator === 'manual-bradesco' ? 'selected' : ''}>Bradesco</option></select></label><label class="saude-quote-field"><span>Nome do plano *</span><input name="planName" required maxlength="120" placeholder="Ex.: Executivo Nacional" value="${esc(currentPlan.nome || '')}"></label><label class="saude-quote-field"><span>Acomodação</span><select name="accommodation"><option value="" ${!currentTable.acomodacao ? 'selected' : ''}>Não informado</option><option ${currentTable.acomodacao === 'Apartamento' ? 'selected' : ''}>Apartamento</option><option ${currentTable.acomodacao === 'Enfermaria' ? 'selected' : ''}>Enfermaria</option><option ${currentTable.acomodacao === 'Ambulatorial' ? 'selected' : ''}>Ambulatorial</option></select></label><label class="saude-quote-field"><span>Coparticipação</span><select name="coparticipation"><option value="false" ${!currentTable.coparticipacao ? 'selected' : ''}>Não</option><option value="true" ${currentTable.coparticipacao ? 'selected' : ''}>Sim</option></select></label><label class="saude-quote-field"><span>Abrangência (opcional)</span><input name="coverage" maxlength="120" placeholder="Ex.: Nacional" value="${esc(currentPlan.abrangencia || '')}"></label></div><section class="saude-manual-price-section"><header><div><h4>Preço por faixa etária</h4></div></header><div class="saude-manual-price-table-wrap"><table class="saude-manual-price-table"><thead><tr><th>Faixa Etária</th><th>Valor Original</th><th><label class="saude-manual-iof-toggle"><input type="checkbox" data-manual-iof-toggle onchange="saudeQuoteToggleManualIOF(this.checked)" ${quote.manualIofPreview ? 'checked' : ''}><span>Valor com IOF</span></label></th></tr></thead><tbody>${BANDS.map((band, index) => `<tr><th>${band}</th><td><input class="saude-manual-price-input" name="price_${index}" type="text" oninput="saudeQuoteManualPriceChanged()" inputmode="decimal" placeholder="0,00" aria-label="Valor original da faixa ${band}" value="${Number.isFinite(Number(currentPrices[band])) ? esc(currentPrices[band]) : ''}"></td><td class="saude-manual-iof-value" data-manual-iof-value="${esc(band)}">${quote.manualIofPreview && Number.isFinite(quote.manualIofPreview.values[band]) ? money(quote.manualIofPreview.values[band]) : ''}</td></tr>`).join('')}</tbody></table></div></section><footer><button class="secondary-btn" type="button" onclick="saudeQuoteManualPlanBack()">Voltar</button><button class="save-btn" type="button" onclick="window.saudeQuoteAddManualPlan(this)">${editing ? 'Salvar alterações' : 'Adicionar à cotação'}</button></footer></form></div>`;
  }
  const picker = quote.planPicker;
  const operators = [...new Map(available.map(table => {
    const operator = operatorInfo(planInfo(table));
    return [operator.id, operator];
  }).filter(([id]) => id)).values()];
  const selectedOperator = operators.some(operator => operator.id === picker.operatorId) ? picker.operatorId : '';
  const operatorTables = selectedOperator ? available.filter(table => operatorInfo(planInfo(table)).id === selectedOperator) : [];
  const visibleTables = operatorTables.filter(table => picker.selectedTableIds.includes(table.id));
  const tableRows = operatorTables.map(table => {
    const plan = planInfo(table);
    return `<label class="saude-plan-option"><input type="checkbox" name="tableIds" value="${esc(table.id)}" ${picker.selectedTableIds.includes(table.id) ? 'checked' : ''} onchange="saudeQuotePlanPickerTable(this.value, this.checked)"><span><strong>${esc(plan.nome || 'Plano sem nome')}</strong><small>${esc(table.acomodacao || 'Acomodação não informada')} · ${table.coparticipacao ? 'Com coparticipação' : 'Sem coparticipação'} · Vigência ${dateLabel(table.vigencia_inicio)}</small></span></label>`;
  }).join('');
  const emptyMessage = !picker.coparticipacoes.length || !picker.accommodations.length
    ? 'Selecione ao menos uma opção de coparticipação e uma acomodação para ver as tabelas.'
    : !available.length
      ? `Não há tabelas vigentes para ${esc(quote.type)} com esses filtros. Confira a vigência ou o catálogo.`
      : !selectedOperator
        ? 'Selecione uma operadora para consultar os planos disponíveis.'
        : tableRows ? '' : 'Não há planos disponíveis para esta operadora com os filtros escolhidos.';
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><div class="saude-quote-modal saude-plan-catalog-modal" role="dialog" aria-modal="true" aria-labelledby="saude-plan-modal-title" onclick="event.stopPropagation()"><header><div><h3 id="saude-plan-modal-title">Adicionar planos</h3><p>Filtre as tabelas e escolha os planos para adicionar à cotação.</p></div><div class="saude-plan-header-actions"><button class="save-btn" type="button" onclick="saudeQuoteShowManualPlan()">Adicionar plano manual</button><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></div></header><form class="saude-plan-catalog-form" onsubmit="saudeQuoteAddPlan(event)"><div class="saude-plan-picker-filters"><fieldset class="saude-plan-accommodation-filter"><legend>Coparticipação</legend><div>${[['true', 'Sim'], ['false', 'Não']].map(([value, label]) => `<label><input type="checkbox" data-plan-picker-copay="${value}" value="${value}" ${picker.coparticipacoes.includes(value) ? 'checked' : ''} onchange="saudeQuotePlanPickerCopay(this.value, this.checked)"><span>${label}</span></label>`).join('')}</div></fieldset><fieldset class="saude-plan-accommodation-filter"><legend>Acomodação</legend><div>${ACCOMMODATIONS.map(value => `<label><input type="checkbox" data-plan-picker-accommodation="${esc(value)}" value="${esc(value)}" ${picker.accommodations.includes(value) ? 'checked' : ''} onchange="saudeQuotePlanPickerAccommodation(this.value, this.checked)"><span>${esc(value)}</span></label>`).join('')}</div></fieldset></div><label class="saude-quote-field saude-plan-operator-field"><span>Operadora</span><select name="operatorId" data-plan-picker-operator onchange="saudeQuotePlanPickerOperator(this.value)"><option value="">Selecione uma operadora</option>${operators.map(operator => `<option value="${esc(operator.id)}" ${selectedOperator === operator.id ? 'selected' : ''}>${esc(operator.nome)}</option>`).join('')}</select></label><section class="saude-plan-options-section"><h4>Planos disponíveis</h4>${tableRows ? `<div class="saude-plan-options">${tableRows}</div>` : `<p class="saude-quote-empty">${emptyMessage}</p>`}</section><footer><span class="saude-plan-selection-count">${visibleTables.length} tabela(s) selecionada(s)</span><button class="save-btn" type="submit" ${!visibleTables.length ? 'disabled' : ''}>Adicionar selecionados</button></footer></form></div></div>`;
}

function operatorVisualClass(name = '') {
  const token = normalizeImportToken(name);
  if (token.includes('sulamerica')) return 'sulamerica';
  if (token.includes('bradesco')) return 'bradesco';
  if (token.includes('hapvida')) return 'hapvida';
  if (token.includes('unimed')) return 'unimed';
  return 'default';
}

function operatorMonogram(name = '') {
  const brand = operatorVisualClass(name);
  return ({ sulamerica: 'S', bradesco: 'B', hapvida: 'H', unimed: 'U', default: String(name).trim().slice(0, 1).toUpperCase() || 'O' })[brand];
}

function renderResult() {
  const plans = selectedPlans(); const allPlans = quote.plans.map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))) }));
  const options = items => items.map(item => `<option value="${esc(item.value)}" ${item.value === item.current ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
  const header = `<div class="saude-quote-result-tools"><div class="saude-result-title"><h3><i data-lucide="file-text" aria-hidden="true"></i> Resultado da Cotação</h3><p>Valores calculados pela idade na data de vigência informada.</p></div><div class="saude-quote-filters"><label><span>Operadoras</span><select onchange="saudeQuoteFilter('operatorFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.operatorFilter }, ...quoteOperators().map(item => ({ value: item.id, label: item.nome, current: quote.operatorFilter }))])}</select></label><label><span>Acomodação</span><select onchange="saudeQuoteFilter('accommodationFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.accommodationFilter }, ...['Apartamento', 'Enfermaria', 'Ambulatorial'].map(value => ({ value, label: value, current: quote.accommodationFilter }))])}</select></label><label><span>Coparticipação</span><select onchange="saudeQuoteFilter('copayFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.copayFilter }, { value: 'true', label: 'Sim', current: quote.copayFilter }, { value: 'false', label: 'Não', current: quote.copayFilter }])}</select></label><button class="save-btn" type="button" onclick="saudeQuoteOpenModal('plan')"><i data-lucide="plus" aria-hidden="true"></i> Adicionar Plano</button></div></div>`;
  if (!allPlans.length) return `<section class="saude-quote-card">${header}<div class="saude-quote-empty">Adicione planos do catálogo vigente para comparar valores.</div></section>`;
  const columns = plans.map(item => {
    const brand = operatorVisualClass(item.operator.nome);
    const catalogOperator = quote.catalog.operators.find(operator => operator.id === (item.operator.id || item.plan.operadora_id))
      || quote.catalog.operators.find(operator => normalizeImportToken(operator.nome) === normalizeImportToken(item.operator.nome));
    const logoUrl = catalogOperator?.logo_url || item.operator.logo_url || '';
    const operatorLogo = logoUrl
      ? `<img class="saude-plan-operator-logo" src="${esc(logoUrl)}" alt="Logomarca ${esc(item.operator.nome || 'operadora')}">`
      : `<span class="saude-plan-mark" aria-hidden="true">${esc(operatorMonogram(item.operator.nome))}</span>`;
    return `<th class="saude-plan-heading"><div class="saude-plan-column-controls"><button class="icon-btn danger saude-plan-remove" type="button" title="Remover plano" aria-label="Remover plano ${esc(item.plan.nome || item.operator.nome || '')}" onclick="saudeQuoteRemovePlan('${esc(item.tableId)}')"><i data-lucide="x" aria-hidden="true"></i></button><label class="saude-plan-select" title="Incluir ou retirar este plano da cotação"><input type="checkbox" aria-label="Incluir ou retirar este plano da cotação" ${item.selected ? 'checked' : ''} onchange="saudeQuoteTogglePlan('${esc(item.tableId)}', this.checked)"></label></div><div class="saude-plan-brand is-${brand}">${operatorLogo}<span>${esc(item.plan.nome || 'Plano')}</span><small>${esc(item.table.acomodacao || 'Acomodação não informada')} · ${item.table.coparticipacao ? 'Coparticipação' : 'Sem coparticipação'}</small></div><div class="saude-plan-total saude-price-${brand}">${planTotal(item.tableId) === null ? '<b class="is-incomplete">Cotação incompleta</b>' : `<b>${money(planTotal(item.tableId))}</b>`}</div>${item.table.origem === 'manual' ? `<div class="saude-plan-actions"><button class="secondary-btn" type="button" onclick="saudeQuoteEditManualPlan('${esc(item.tableId)}')">Editar valores</button></div>` : ''}</th>`;
  }).join('');
  const groups = groupIds();
  const titulares = quote.lives.filter(item => item.tipo === 'titular').length;
  const dependents = quote.lives.filter(item => item.tipo === 'dependente').length;
  const body = groups.map(groupId => {
    const members = livesInGroup(groupId); const expanded = quote.expandedGroups.has(groupId); const title = groupHead(groupId)?.nome || 'Titular';
    const values = plans.map(() => '<td></td>').join('');
    const detail = expanded ? `<tr class="saude-group-detail"><td colspan="${1 + plans.length}"><div class="saude-group-people"><table><colgroup><col style="width:65px"><col style="width:115px"><col style="width:55px">${plans.map(() => '<col>').join('')}</colgroup><thead><tr><th>Tipo</th><th>Nome</th><th>Idade</th>${plans.map(item => `<th>${esc(item.operator.nome || item.plan.nome)}</th>`).join('')}</tr></thead><tbody>${members.map(life => `<tr><td>${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</td><td>${esc(lifeDisplayName(life))}</td><td>${lifeAge(life) ?? '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="saude-price-${operatorVisualClass(item.operator.nome)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('')}<tr class="saude-group-total"><td colspan="3">Total do Grupo ${String(groupNumber(groupId)).padStart(2, '0')}</td>${plans.map(item => { const total = totalsFor(item.tableId, groupId).total; return `<td class="saude-price-${operatorVisualClass(item.operator.nome)}">${total === null ? 'Cotação incompleta' : money(total)}</td>`; }).join('')}</tr></tbody></table></div></td></tr>` : '';
    return `<tr class="saude-group-row"><td><button type="button" aria-expanded="${expanded}" onclick="saudeQuoteToggleGroup('${esc(groupId)}')">${expanded ? '▾' : '▸'} Grupo ${String(groupNumber(groupId)).padStart(2, '0')} · ${esc(title)}</button></td>${values}</tr>${detail}`;
  }).join('');
  return `<section class="saude-quote-card saude-quote-result-card">${header}<div class="saude-quote-table-wrap"><table class="saude-quote-results"><thead><tr><th class="saude-result-stub"><div class="saude-result-stub-content"><strong>Plano / Operadora</strong><small>${quote.lives.length} vidas · ${titulares} titulares · ${dependents} dependentes</small></div></th>${columns || `<th>Nenhum plano corresponde aos filtros.</th>`}</tr></thead><tbody>${body || `<tr><td colspan="${1 + plans.length}" class="saude-quote-empty">Adicione titulares para calcular a cotação.</td></tr>`}</tbody></table></div></section>`;
}

function renderPage() {
  if (!context.pode?.('simulador_saude', 'view')) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar Simulador - Saúde.</p></section>' });
  if (quote.loading) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Abrindo cotação salva.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: '<section class="saude-quote-card"><div class="saude-quote-empty" role="status">Carregando cotação salva…</div></section>' });
  const content = `${renderHeader()}${renderCompany()}${renderLives()}${renderResult()}${renderPlanPicker()}${renderImportModal()}`;
  return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Monte e compare cotações de planos de saúde.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: content });
}
function rerender() { const root = document.getElementById('app'); if (root) root.innerHTML = renderPage(); syncQuoteToast(); }
async function loadCatalog() { try { const response = await chamarApi('getSimuladorSaudeCatalog'); if (!response.ok) throw new Error(response.message); quote.catalog = response.data; quote.catalogError = ''; } catch (error) { quote.catalogError = error.message || 'Não foi possível carregar o catálogo de planos.'; } rerender(); }

function serializeSnapshot() {
  return {
    version: 1,
    cliente: { nome: quote.company, cnpj: quote.cnpj, cidade: quote.city, tipo_contratacao: quote.type, vigencia: quote.effectiveDate },
    vidas: quote.lives.map(life => ({ ...life })),
    planos: quote.plans.map(item => {
      const table = planFor(item.tableId); const plan = planInfo(table); const operator = item.operator_snapshot || operatorInfo(plan);
      return { tableId: item.tableId, selected: Boolean(item.selected), table_snapshot: { ...table }, plan_snapshot: { ...plan }, operator_snapshot: { ...operator }, prices_snapshot: { ...pricesFor(item.tableId) }, ...(item.iof_applied ? { prices_base_snapshot: { ...(item.prices_base_snapshot || {}) }, iof_applied: true, iof_percent: item.iof_percent || 2.38 } : {}) };
    })
  };
}

function draftSignature() { return JSON.stringify(serializeSnapshot()); }

function resetQuoteDraft() {
  cancelCnpjLookup();
  quote.id = ''; quote.code = ''; quote.version = 0; quote.company = ''; quote.cnpj = ''; quote.city = ''; quote.citySource = 'unset'; quote.cnpjLookupError = ''; quote.type = 'Empresarial (PJ)'; quote.effectiveDate = ''; quote.lives = []; quote.plans = []; quote.expandedGroups = new Set(); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; quote.modal = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.inlineLives = []; quote.batchEditingLives = false; quote.removedInlineLifeIds = []; quote.notice = ''; quoteToastKey = ''; clearQuoteToast(); quote.importText = ''; quote.importPreview = null; quote.saving = false; quote.loading = false; quote.initialized = true;
  quote.savedSignature = draftSignature();
}

function applySavedQuote(record) {
  if (!record) return;
  const snapshot = record.snapshot || {}; const client = snapshot.cliente || {};
  quote.id = record.id; quote.code = record.codigo || ''; quote.version = record.snapshot_version || 1; quote.company = client.nome ?? record.cliente_nome ?? ''; quote.cnpj = normalizeCnpj(client.cnpj ?? record.cliente_cnpj ?? ''); quote.city = client.cidade ?? record.cliente_cidade ?? ''; quote.citySource = quote.city ? 'saved' : 'unset'; quote.cnpjLookupError = ''; quote.type = (client.tipo_contratacao ?? record.tipo_contratacao) === 'Familiar' ? 'Individual' : (client.tipo_contratacao ?? record.tipo_contratacao ?? 'Empresarial (PJ)'); quote.effectiveDate = client.vigencia ?? record.vigencia ?? '';
  quote.lives = Array.isArray(snapshot.vidas) ? snapshot.vidas.map(life => ({ ...life })) : [];
  quote.plans = Array.isArray(snapshot.planos) ? snapshot.planos.map(normalizeQuotePlanEntry) : [];
  quote.expandedGroups = new Set(); quote.modal = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.inlineLives = []; quote.batchEditingLives = false; quote.removedInlineLifeIds = []; quote.initialized = true; quote.savedSignature = draftSignature();
}

async function loadQuoteById(id) {
  const response = await chamarApi('getSimuladorSaudeQuoteById', { id });
  if (!response.ok) throw new Error(response.message || 'Não foi possível carregar a cotação.');
  if (!response.data) throw new Error('Cotação não encontrada ou sem acesso.');
  applySavedQuote(response.data);
  return response.data;
}

export async function mountSimuladorSaudeQuotePage(nextContext = {}) {
  context = { ...nextContext };
  resetQuoteDraft();
  const params = new URLSearchParams(window.location.search);
  const quoteId = params.get('quoteId');
  const duplicateQuoteId = params.get('duplicateQuoteId');
  const sourceQuoteId = quoteId || duplicateQuoteId;
  quote.loading = Boolean(sourceQuoteId);
  rerender();
  if (sourceQuoteId) {
    try {
      await loadQuoteById(sourceQuoteId);
      if (duplicateQuoteId && !quoteId) {
        const originalCode = quote.code;
        quote.id = ''; quote.code = ''; quote.version = 0;
        quote.notice = `Cópia da cotação #${originalCode || 'original'} pronta. Salve para criar uma nova cotação.`;
        quote.savedSignature = draftSignature();
      }
    }
    catch (error) { quote.notice = error.message || 'Não foi possível carregar a cotação.'; }
    finally { quote.loading = false; rerender(); }
  }
  await loadCatalog();
}

window.saudeQuoteBackToList = () => {
  if (draftSignature() !== quote.savedSignature && !window.confirm('Há alterações não salvas nesta cotação. Sair e descartá-las?')) return;
  context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/${SIMULADOR_SAUDE_ROUTE}`);
};

window.saudeQuoteCnpjInput = input => {
  const raw = input.value;
  const cursor = input.selectionStart ?? raw.length;
  const charCount = normalizeCnpj(raw.slice(0, cursor)).length;
  const cnpj = normalizeCnpj(raw);
  input.value = maskCnpj(cnpj);
  const nextCursor = cnpjCaretPosition(input.value, Math.min(charCount, cnpj.length));
  input.setSelectionRange(nextCursor, nextCursor);
  if (cnpj === quote.cnpj) return;
  quote.cnpj = cnpj;
  if (quote.citySource === 'cnpj' || quote.citySource === 'saved') {
    quote.city = '';
    quote.citySource = 'unset';
    const cityInput = document.querySelector('[data-saude-quote-city]');
    if (cityInput) cityInput.value = '';
  }
  queueCnpjLookup(cnpj);
};

window.saudeQuoteLookupCnpj = () => {
  const cnpj = normalizeCnpj(quote.cnpj);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) {
    quote.cnpjLookupError = 'Digite os 14 caracteres do CNPJ antes de consultar.';
    syncQuoteToast();
    return;
  }
  quote.cnpj = cnpj;
  queueCnpjLookup(cnpj, 0);
};

window.saudeQuoteEffectiveDateInput = input => {
  const dateText = formatBirthDateTyping(input.value);
  input.value = dateText;
  const effectiveDate = normalizeManualBirthDate(dateText);
  quote.effectiveDate = effectiveDate;
  if (!effectiveDate) {
    quote.inlineLives.forEach(item => {
      if (item.draft.ageSource === 'nascimento') item.draft.idade = ageOf(item.draft.nascimento) ?? '';
    });
    return;
  }
  const cursor = input.selectionStart ?? dateText.length;
  window.saudeQuoteField('effectiveDate', effectiveDate);
  const updatedInput = document.querySelector('[data-saude-effective-date]');
  if (updatedInput) {
    updatedInput.focus();
    updatedInput.setSelectionRange(Math.min(cursor, dateText.length), Math.min(cursor, dateText.length));
  }
};

window.saudeQuoteField = (key, value) => {
  if (key === 'type' && value !== quote.type) { quote.plans = quote.plans.filter(item => item.table_snapshot?.origem === 'manual' || (planFor(item.tableId).tipo_contratacao || 'Empresarial (PJ)') === value); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; }
  if (key === 'city') quote.citySource = 'manual';
  quote[key] = value;
  if (key === 'effectiveDate') quote.inlineLives.forEach(item => {
    if (item.draft.ageSource === 'nascimento') item.draft.idade = ageOf(item.draft.nascimento) ?? '';
  });
  if (key === 'effectiveDate' || key === 'type') rerender();
};
window.saudeQuoteOpenModal = mode => { quote.modal = mode; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.manualIofPreview = null; if (mode === 'plan') quote.planPicker = { operatorId: '', coparticipacoes: ['true', 'false'], accommodations: [...ACCOMMODATIONS], selectedTableIds: [] }; rerender(); };
window.saudeQuoteCloseModal = () => { quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.manualIofPreview = null; rerender(); };
window.saudeQuoteOpenImport = () => { if (quote.inlineLives.length || quote.removedInlineLifeIds.length) { showQuoteToast('Salve ou cancele as linhas em edição antes de importar vidas.', { isError: true }); return; } quote.modal = 'import'; quote.importPreview = null; quote.importText = ''; rerender(); };
window.saudeQuoteValidateImport = event => { event.preventDefault(); quote.importText = new FormData(event.currentTarget).get('importText') || ''; quote.importPreview = previewLifeImport(quote.importText); rerender(); };
window.saudeQuoteRevisarImport = () => { quote.importPreview = null; rerender(); };
window.saudeQuoteCommitImport = () => { const preview = quote.importPreview; if (!preview?.validRows.length || preview.errors.length) return; const groupMap = new Map(); preview.validRows.filter(row => row.tipo === 'titular').forEach(row => groupMap.set(row.grupo, nextId())); const imported = preview.validRows.map(row => { const groupId = groupMap.get(row.grupo); return { id: nextId(), grupo_id: groupId, tipo: row.tipo, nome: row.nome.trim(), nascimento: row.nascimento, cpf: '' }; }); quote.lives.push(...imported); quote.modal = ''; quote.importPreview = null; quote.importText = ''; quote.notice = `${imported.length} vida(s) importada(s).`; rerender(); };
window.saudeQuoteAddInline = tipo => {
  const titulares = inlineTitularOptions();
  if (tipo === 'dependente' && !titulares.length) { showQuoteToast('Adicione um titular antes de incluir dependentes.', { isError: true }); return; }
  const id = nextId();
  quote.inlineLives.push({ key: nextId(), id, mode: 'add', tipo, draft: inlineLifeDraft({ grupo_id: tipo === 'titular' ? id : titulares[0].id }) });
  quote.notice = ''; rerender();
};
window.saudeQuoteEditLife = id => {
  if (!quote.id) return;
  if (quote.inlineLives.some(item => item.mode === 'edit' && item.id === id)) return;
  const life = quote.lives.find(item => item.id === id);
  if (!life) return;
  quote.inlineLives.push({ key: nextId(), id, mode: 'edit', tipo: life.tipo, draft: inlineLifeDraft(life) });
  quote.notice = ''; rerender();
};
window.saudeQuoteEditAllLives = () => {
  if (!quote.id || quote.inlineLives.length || quote.removedInlineLifeIds.length || !quote.lives.length) return;
  quote.inlineLives = quote.lives.map(life => ({ key: nextId(), id: life.id, mode: 'edit', tipo: life.tipo, draft: inlineLifeDraft(life) }));
  quote.batchEditingLives = true;
  quote.notice = '';
  rerender();
};
window.saudeQuoteInlineField = (key, field, value) => {
  const pending = quote.inlineLives.find(item => item.key === key);
  if (!pending) return;
  const row = [...document.querySelectorAll('.saude-inline-life-row')].find(item => item.dataset.inlineLife === key);
  if (field === 'nascimento') {
    const nascimentoTexto = formatBirthDateTyping(value);
    if (row) row.querySelector('[data-inline-field="nascimento"]').value = nascimentoTexto;
    const nascimento = normalizeManualBirthDate(nascimentoTexto);
    const idade = nascimento ? ageOf(nascimento) : '';
    pending.draft = { ...pending.draft, nascimento, nascimentoTexto, idade: idade ?? '', ageSource: 'nascimento' };
    if (row) {
      row.querySelector('[data-inline-field="idade"]').value = idade ?? '';
      row.querySelector('[data-inline-band]').textContent = ageBand(idade) || '—';
    }
    return;
  }
  if (field === 'idade') {
    const idade = String(value ?? '').trim();
    const idadeValida = parseManualAge(idade);
    pending.draft = { ...pending.draft, idade, nascimento: '', nascimentoTexto: '', ageSource: 'idade' };
    if (row) {
      row.querySelector('[data-inline-field="nascimento"]').value = '';
      row.querySelector('[data-inline-band]').textContent = ageBand(idadeValida) || '—';
    }
    return;
  }
  pending.draft = { ...pending.draft, [field]: value };
};
window.saudeQuoteCancelInlineLife = key => {
  const pending = quote.inlineLives.find(item => item.key === key);
  if (!pending) return;
  if (pending.mode === 'add' && pending.tipo === 'titular' && quote.inlineLives.some(item => item.tipo === 'dependente' && item.draft.grupo_id === pending.id)) {
    showQuoteToast('Reatribua ou cancele os dependentes deste novo titular antes de cancelar a linha.', { isError: true }); return;
  }
  quote.inlineLives = quote.inlineLives.filter(item => item.key !== key);
  quote.notice = ''; rerender();
};
window.saudeQuoteRemoveInlineLife = key => {
  const pending = quote.inlineLives.find(item => item.key === key && item.mode === 'edit');
  const life = pending && quote.lives.find(item => item.id === pending.id);
  if (!pending || !life) return;
  const removedIds = new Set([...quote.removedInlineLifeIds, life.id]);
  if (life.tipo === 'titular') {
    const remainingDependents = quote.inlineLives.some(item => item.mode === 'add' && item.tipo === 'dependente' && item.draft.grupo_id === life.id)
      || quote.lives.filter(item => item.tipo === 'dependente' && !removedIds.has(item.id)).some(dependent => {
      const dependentDraft = quote.inlineLives.find(item => item.mode === 'edit' && item.id === dependent.id);
      return (dependentDraft?.draft.grupo_id || dependent.grupo_id) === life.id;
    });
    if (remainingDependents) {
      showQuoteToast('Reatribua ou remova os dependentes deste titular antes de removê-lo.', { isError: true });
      return;
    }
  }
  if (!window.confirm(`Remover ${life.tipo === 'titular' ? 'titular' : 'dependente'} ${pending.draft.nome || life.nome || lifeDisplayName(life)}?`)) return;
  quote.inlineLives = quote.inlineLives.filter(item => item.key !== key);
  quote.removedInlineLifeIds = [...removedIds];
  quote.notice = '';
  rerender();
};
window.saudeQuoteSaveAllInlineLives = () => {
  if (!quote.inlineLives.length && !quote.removedInlineLifeIds.length) return;
  const removedIds = new Set(quote.removedInlineLifeIds);
  const pendingValues = [];
  for (const pending of quote.inlineLives) {
    const row = [...document.querySelectorAll('.saude-inline-life-row')].find(item => item.dataset.inlineLife === pending.key);
    const nome = String(row?.querySelector('[data-inline-field="nome"]')?.value ?? pending.draft.nome).trim();
    const nascimentoTexto = String(row?.querySelector('[data-inline-field="nascimento"]')?.value ?? pending.draft.nascimentoTexto ?? formatBirthDateInput(pending.draft.nascimento));
    const idadeTexto = String(row?.querySelector('[data-inline-field="idade"]')?.value ?? pending.draft.idade ?? '').trim();
    const grupo_id = pending.tipo === 'titular' ? pending.id : String(row?.querySelector('[data-inline-field="grupo_id"]')?.value ?? pending.draft.grupo_id);
    if (pending.tipo === 'titular' && !nome) { showQuoteToast('Informe o nome de todos os titulares antes de salvar.', { isError: true }); row?.querySelector('[data-inline-field="nome"]')?.focus(); return; }
    let nascimento = '';
    let idade = null;
    const idadeInformada = parseManualAge(idadeTexto);
    if (pending.draft.ageSource === 'idade') {
      idade = idadeInformada;
    } else {
      nascimento = normalizeManualBirthDate(nascimentoTexto);
      idade = nascimento ? ageOf(nascimento) : null;
    }
    if (idade === null) {
      showQuoteToast('Informe uma data de nascimento válida (DD/MM/AAAA) ou uma idade inteira maior ou igual a zero.', { isError: true });
      row?.querySelector(pending.draft.ageSource === 'idade' ? '[data-inline-field="idade"]' : '[data-inline-field="nascimento"]')?.focus();
      return;
    }
    pendingValues.push({ pending, nome, nascimento, idade, grupo_id });
  }
  const validTitularIds = new Set([
    ...quote.lives.filter(life => life.tipo === 'titular' && !removedIds.has(life.id)).map(life => life.id),
    ...pendingValues.filter(item => item.pending.mode === 'add' && item.pending.tipo === 'titular').map(item => item.pending.id)
  ]);
  const missingGroup = pendingValues.find(item => item.pending.tipo === 'dependente' && !validTitularIds.has(item.grupo_id));
  if (missingGroup) { showQuoteToast('Selecione um titular válido para cada dependente.', { isError: true }); return; }
  pendingValues.forEach(({ pending, nome, nascimento, idade, grupo_id }) => {
    if (pending.mode === 'edit') {
      const existing = quote.lives.find(life => life.id === pending.id);
      if (existing) Object.assign(existing, { nome, nascimento, idade, ...(pending.tipo === 'dependente' ? { grupo_id } : {}) });
    } else quote.lives.push({ id: pending.id, grupo_id: pending.tipo === 'titular' ? pending.id : grupo_id, tipo: pending.tipo, nome, nascimento, idade, cpf: '' });
  });
  quote.lives = quote.lives.filter(life => !removedIds.has(life.id));
  removedIds.forEach(id => quote.expandedGroups.delete(id));
  const savedCount = pendingValues.length;
  const removedCount = removedIds.size;
  quote.inlineLives = [];
  quote.batchEditingLives = false;
  quote.removedInlineLifeIds = [];
  quote.notice = removedCount ? `${removedCount} vida(s) removida(s); ${savedCount} vida(s) salva(s).` : `${savedCount} vida(s) salva(s) com sucesso.`;
  rerender();
};
window.saudeQuoteCancelAllInlineLives = () => {
  if (!quote.inlineLives.length && !quote.removedInlineLifeIds.length) return;
  quote.inlineLives = [];
  quote.batchEditingLives = false;
  quote.removedInlineLifeIds = [];
  quote.notice = '';
  rerender();
};
window.saudeQuoteDeleteLife = id => { if (quote.inlineLives.length || quote.removedInlineLifeIds.length) { showQuoteToast('Salve ou cancele as linhas em edição antes de excluir uma vida.', { isError: true }); return; } const life = quote.lives.find(item => item.id === id); if (!life) return; if (life.tipo === 'titular' && quote.lives.some(item => item.tipo === 'dependente' && item.grupo_id === id)) { quote.notice = 'Transfira ou exclua os dependentes antes de remover este titular.'; rerender(); return; } if (!window.confirm(`Excluir ${life.tipo === 'titular' ? 'titular' : 'dependente'} ${lifeDisplayName(life)}?`)) return; quote.lives = quote.lives.filter(item => item.id !== id); if (life.tipo === 'titular') quote.expandedGroups.delete(id); rerender(); };
window.saudeQuotePlanPickerCopay = (value, checked) => { const values = new Set(quote.planPicker.coparticipacoes); checked ? values.add(value) : values.delete(value); quote.planPicker.coparticipacoes = ['true', 'false'].filter(item => values.has(item)); quote.planPicker.operatorId = ''; quote.planPicker.selectedTableIds = []; rerender(); [...document.querySelectorAll('[data-plan-picker-copay]')].find(input => input.value === value)?.focus(); };
window.saudeQuotePlanPickerAccommodation = (value, checked) => { const values = new Set(quote.planPicker.accommodations); checked ? values.add(value) : values.delete(value); quote.planPicker.accommodations = ACCOMMODATIONS.filter(item => values.has(item)); quote.planPicker.operatorId = ''; quote.planPicker.selectedTableIds = []; rerender(); [...document.querySelectorAll('[data-plan-picker-accommodation]')].find(input => input.value === value)?.focus(); };
window.saudeQuotePlanPickerOperator = value => { quote.planPicker.operatorId = value; quote.planPicker.selectedTableIds = []; rerender(); document.querySelector('[data-plan-picker-operator]')?.focus(); };
window.saudeQuotePlanPickerTable = (tableId, checked) => { const selected = new Set(quote.planPicker.selectedTableIds); checked ? selected.add(tableId) : selected.delete(tableId); quote.planPicker.selectedTableIds = [...selected]; rerender(); [...document.querySelectorAll('.saude-plan-option input')].find(input => input.value === tableId)?.focus(); };
window.saudeQuoteAddPlan = event => {
  event.preventDefault();
  const availableIds = new Set(planPickerTables().filter(table => operatorInfo(planInfo(table)).id === quote.planPicker.operatorId).map(table => table.id));
  const tableIds = [...new Set(quote.planPicker.selectedTableIds)].filter(tableId => availableIds.has(tableId));
  if (!tableIds.length) return;
  quote.plans.push(...tableIds.map(tableId => ({ tableId, selected: true })));
  quote.modal = ''; quote.manualPlanMode = false; rerender();
};
window.saudeQuoteManualPriceChanged = () => {
  if (document.querySelector('[data-manual-iof-toggle]')?.checked) {
    window.saudeQuoteCalculateManualIOF({ silent: true });
    return;
  }
  quote.manualIofPreview = null;
  document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
};
window.saudeQuoteCalculateManualIOF = ({ silent = false } = {}) => {
  const form = document.querySelector('.saude-manual-plan-modal');
  if (!form) return false;
  const formValues = new FormData(form);
  const base = {};
  let invalid = false;
  BANDS.forEach((band, index) => {
    const raw = String(formValues.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = parseManualPrice(raw);
    if (!Number.isFinite(price) || price < 0) invalid = true;
    else base[band] = price;
  });
  if (invalid || !Object.keys(base).length) {
    quote.manualIofPreview = null;
    document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
    if (!silent) showQuoteToast(invalid ? 'Confira os valores. Os preços precisam ser números iguais ou maiores que zero.' : 'Informe ao menos um valor por faixa etária antes de calcular o IOF.', { isError: true });
    return false;
  }
  const values = Object.fromEntries(Object.entries(base).map(([band, price]) => [band, Math.round((price * 1.0238 + Number.EPSILON) * 100) / 100]));
  quote.manualIofPreview = { base, values };
  document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = Number.isFinite(values[cell.dataset.manualIofValue]) ? money(values[cell.dataset.manualIofValue]) : ''; });
  return true;
};
window.saudeQuoteToggleManualIOF = checked => {
  if (!checked) {
    quote.manualIofPreview = null;
    document.querySelectorAll('[data-manual-iof-value]').forEach(cell => { cell.textContent = ''; });
    return;
  }
  if (!window.saudeQuoteCalculateManualIOF()) {
    const toggle = document.querySelector('[data-manual-iof-toggle]');
    if (toggle) toggle.checked = false;
  }
};
window.saudeQuoteShowManualPlan = () => { quote.manualPlanEditingId = ''; quote.manualIofPreview = null; quote.manualPlanMode = true; quote.notice = ''; rerender(); };
window.saudeQuoteManualPlanBack = () => { quote.manualPlanEditingId = ''; quote.manualIofPreview = null; quote.manualPlanMode = false; rerender(); };
window.saudeQuoteAddManualPlan = source => {
  if (source instanceof Event) source.preventDefault();
  const form = source?.matches?.('.saude-manual-plan-modal')
    ? source
    : source?.currentTarget?.matches?.('.saude-manual-plan-modal')
      ? source.currentTarget
      : source?.form?.matches?.('.saude-manual-plan-modal')
        ? source.form
        : source?.closest?.('.saude-manual-plan-modal');
  if (!form) { showQuoteToast('Não foi possível localizar o formulário do plano manual.', { isError: true }); return; }
  try {
  const values = new FormData(form);
  const operatorId = String(values.get('operatorId') || '');
  if (!operatorId) { showQuoteToast('Selecione uma operadora para adicionar o plano.', { isError: true }); form.elements.operatorId?.focus(); return; }
  const operatorNeedle = operatorId === 'manual-bradesco' ? 'bradesco' : 'sulamerica';
  const operatorName = operatorId === 'manual-bradesco' ? 'Bradesco' : 'SulAmérica';
  const catalogOperator = quote.catalog.operators.find(operator => normalizeImportToken(operator.nome).includes(operatorNeedle));
  const resolvedOperatorId = catalogOperator?.id || operatorId;
  const planName = String(values.get('planName') || '').trim();
  if (!planName) { showQuoteToast('Informe o nome do plano para adicioná-lo à cotação.', { isError: true }); form.elements.planName?.focus(); return; }

  const basePrices = {};
  let invalidPrice = false;
  BANDS.forEach((band, index) => {
    const raw = String(values.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = parseManualPrice(raw);
    if (!Number.isFinite(price) || price < 0) invalidPrice = true;
    else basePrices[band] = price;
  });
  if (invalidPrice) { showQuoteToast('Confira os valores. Os preços precisam ser números iguais ou maiores que zero.', { isError: true }); return; }
  if (!Object.keys(basePrices).length) { showQuoteToast('Informe ao menos um valor por faixa etária para adicionar o plano.', { isError: true }); return; }

  const hasCurrentIof = quote.manualIofPreview && JSON.stringify(quote.manualIofPreview.base) === JSON.stringify(basePrices);
  const prices = hasCurrentIof ? { ...quote.manualIofPreview.values } : { ...basePrices };
  const pricingSnapshot = { prices_snapshot: prices, prices_base_snapshot: { ...basePrices }, iof_applied: Boolean(hasCurrentIof), iof_percent: hasCurrentIof ? 2.38 : 0 };

  const editingPlan = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
  const manualId = editingPlan?.tableId || `manual-${nextId()}`;
  const accommodation = String(values.get('accommodation') || '');
  const coparticipation = values.get('coparticipation') === 'true';
  const table = { id: manualId, nome: 'Valores informados manualmente', acomodacao: accommodation, coparticipacao: coparticipation, status: 'vigente', vigencia_inicio: quote.effectiveDate || today(), vigencia_fim: null, origem: 'manual' };
  const plan = { id: `${manualId}-plan`, operadora_id: resolvedOperatorId, nome: planName, modalidade: quote.type, abrangencia: String(values.get('coverage') || '').trim(), origem: 'manual' };
  if (editingPlan) {
    Object.assign(editingPlan, { table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: resolvedOperatorId, nome: catalogOperator?.nome || operatorName }, ...pricingSnapshot });
  } else {
    quote.plans.push({ tableId: manualId, selected: true, table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: resolvedOperatorId, nome: catalogOperator?.nome || operatorName }, ...pricingSnapshot });
  }
  quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = '';
  quote.modal = '';
  quote.manualPlanMode = false;
  quote.manualPlanEditingId = '';
  quote.manualIofPreview = null;
  quote.notice = editingPlan ? `Valores manuais do plano da ${operatorName} atualizados.` : `Plano manual da ${operatorName} adicionado a esta cotação.`;
  rerender();
  } catch (error) {
    showQuoteToast(error?.message || 'Não foi possível adicionar o plano manual à cotação.', { isError: true });
  }
};
window.saudeQuoteEditManualPlan = tableId => {
  const entry = quotePlanEntry(tableId);
  if (!entry?.table_snapshot || entry.table_snapshot.origem !== 'manual') return;
  quote.manualPlanEditingId = tableId;
  quote.manualIofPreview = entry.iof_applied ? { base: { ...(entry.prices_base_snapshot || entry.prices_snapshot || {}) }, values: { ...(entry.prices_snapshot || {}) } } : null;
  quote.manualPlanMode = true;
  quote.modal = 'plan';
  rerender();
};
window.saudeQuoteGoCatalog = () => context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/operacoes/corretora/simulador-saude/catalogo`);
window.saudeQuoteRemovePlan = id => { quote.plans = quote.plans.filter(item => item.tableId !== id); rerender(); };
window.saudeQuoteTogglePlan = (id, checked) => { const plan = quote.plans.find(item => item.tableId === id); if (plan) plan.selected = Boolean(checked); };
window.saudeQuoteToggleGroup = id => { quote.expandedGroups.has(id) ? quote.expandedGroups.delete(id) : quote.expandedGroups.add(id); rerender(); };
window.saudeQuoteFilter = (key, value) => { quote[key] = value; rerender(); };
window.saudeQuoteReloadCatalog = () => { quoteToastKey = ''; loadCatalog(); };
async function persistCurrentQuote(status = 'rascunho') {
  if (quote.inlineLives.length || quote.removedInlineLifeIds.length) throw new Error('Salve ou cancele as linhas de vidas antes de salvar a cotação.');
  if (!quote.lives.length) throw new Error('Adicione ao menos uma vida antes de salvar a cotação.');
  const response = await chamarApi('saveSimuladorSaudeQuote', {
    id: quote.id || null,
    cliente_nome: quote.company,
    cliente_cnpj: quote.cnpj,
    cliente_cidade: quote.city,
    tipo_contratacao: quote.type,
    vigencia: quote.effectiveDate,
    status,
    snapshot: serializeSnapshot()
  });
  if (!response.ok) throw new Error(response.message || 'Não foi possível salvar a cotação.');
  const wasNewQuote = !quote.id;
  quote.id = response.data.id; quote.code = response.data.codigo; quote.version = response.data.snapshot_version || quote.version + 1;
  if (wasNewQuote) {
    const url = new URL(window.location.href);
    url.searchParams.delete('duplicateQuoteId');
    url.searchParams.set('quoteId', quote.id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  quote.savedSignature = draftSignature();
  return response.data;
}

window.saudeQuoteSave = async () => {
  if (quote.saving) return;
  quote.saving = true; quote.notice = ''; rerender();
  try {
    const saved = await persistCurrentQuote();
    quote.notice = `Cotação #${saved.codigo} salva com sucesso.`;
  }
  catch (error) { quote.notice = error.message || 'Não foi possível salvar a cotação.'; }
  finally { quote.saving = false; rerender(); }
};

window.saudeQuoteClear = () => {
  if (quote.lives.length || quote.plans.length || quote.company || quote.id) {
    if (!window.confirm('Limpar os dados desta cotação? A versão já salva permanecerá no histórico.')) return;
  }
  const hadQuoteId = Boolean(new URLSearchParams(window.location.search).get('quoteId'));
  resetQuoteDraft();
  quote.notice = 'Cotação limpa. A versão já salva foi preservada.';
  if (hadQuoteId) window.history.replaceState({}, '', window.location.pathname);
  rerender();
};

function proposalHtml(branding, saved, { autoPrint = true } = {}) {
  const plans = quote.plans.filter(item => item.selected).map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))) }));
  const planSectionTitle = plans.length === 1 ? 'Cotação' : 'Cotações';
  const brokerName = branding.nome_fantasia || branding.razao_social || 'Transmares Corretora de Seguros';
  const logo = branding.logo_url || document.querySelector('.brand-logo-slot img')?.src || '';
  const address = [branding.endereco_logradouro, branding.endereco_numero, branding.endereco_complemento, branding.endereco_bairro, [branding.endereco_cidade, branding.endereco_uf].filter(Boolean).join(' - '), branding.endereco_cep].filter(Boolean).join(', ');
  const footerCompanyName = String(branding.razao_social || branding.nome_fantasia || brokerName).toLocaleUpperCase('pt-BR');
  const footerLineOne = [footerCompanyName, branding.cnpj && `CNPJ ${branding.cnpj}`, branding.telefone && `Telefone ${branding.telefone}`, branding.whatsapp && `WhatsApp ${branding.whatsapp}`].filter(Boolean).join(' · ');
  const footerLineTwo = [branding.email, branding.site].filter(Boolean).join(' · ');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const selectedLives = quote.lives.filter(life => life.tipo === 'titular').length;
  const dependents = quote.lives.filter(life => life.tipo === 'dependente').length;
  const planCards = plans.map(item => {
    const brand = operatorVisualClass(item.operator.nome);
    const total = planTotal(item.tableId);
    const accommodation = item.table.acomodacao || 'Não informada';
    const mark = item.operator.logo_url ? `<img class="operator-logo" src="${esc(item.operator.logo_url)}" alt="Logomarca ${esc(item.operator.nome || 'operadora')}" style="max-height:24px;max-width:76px;object-fit:contain">` : `<span class="operator-mark" style="background:${esc(item.operator.cor_marca || '#174A8B')}">${esc(operatorMonogram(item.operator.nome))}</span>`;
    return `<article class="plan-card is-${brand}" style="--operator-color:${esc(item.operator.cor_marca || '#174A8B')};border-color:${esc(item.operator.cor_marca || '#174A8B')}"><header>${mark}<small title="${esc(item.plan.nome || 'Plano')}">${esc(item.plan.nome || 'Plano')}</small></header><div class="plan-price ${total === null ? 'is-incomplete' : ''}" style="color:${esc(item.operator.cor_marca || '#174A8B')}">${total === null ? 'Cotação incompleta' : money(total)}${total === null ? '' : '<small>/mês</small>'}</div><div class="plan-features"><div><span class="feature-symbol">▰</span><span>Acomodação<strong>${esc(accommodation)}</strong></span></div><div><span class="feature-symbol">◉</span><span>Coparticipação<strong>${item.table.coparticipacao ? 'Sim' : 'Não'}</strong></span></div></div></article>`;
  }).join('');
  const comparisonRows = groupIds().map(groupId => {
    const members = livesInGroup(groupId);
    const lifeRows = members.map(life => `<tr><td class="group-cell">Grupo ${groupNumber(groupId)}</td><td>${esc(lifeDisplayName(life))}</td><td><span class="life-type ${life.tipo}">${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td>${lifeBand(life) || '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="price-${operatorVisualClass(item.operator.nome)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('');
    const groupTotals = plans.map(item => { const result = totalsFor(item.tableId, groupId); return `<td class="price-${operatorVisualClass(item.operator.nome)} ${result.total === null ? 'is-incomplete' : ''}">${result.total === null ? 'Cotação incompleta' : money(result.total)}</td>`; }).join('');
    return `${lifeRows}<tr class="group-total"><td colspan="4">Total do Grupo ${groupNumber(groupId)} · ${members.length} vidas</td>${groupTotals}</tr>`;
  }).join('');
  const totalCells = plans.map(item => {
    const total = planTotal(item.tableId);
    const missing = quote.lives.filter(life => planPrice(item.tableId, life) === null).map(life => `${lifeDisplayName(life)} (${lifeBand(life) || 'idade inválida'})`);
    return `<td class="price-${operatorVisualClass(item.operator.nome)} ${total === null ? 'is-incomplete' : ''}">${total === null ? `<strong>Cotação incompleta</strong><small>${esc(missing.join(', '))}</small>` : `<strong>${money(total)}</strong>`}</td>`;
  }).join('');
  const compositionDetailsWidth = (5 / (5 + plans.length)) * 60;
  const compositionPlanColumns = plans.map(() => `<col style="width:${(100 - compositionDetailsWidth) / Math.max(plans.length, 1)}%">`).join('');
  const comparisonHeaders = plans.map(item => `<th class="brand-${operatorVisualClass(item.operator.nome)}">${esc(item.operator.nome || 'Operadora')}<small>${esc(item.plan.nome || 'Plano')}</small></th>`).join('');
  const conditions = [
    ['Modalidade', item => item.plan.modalidade || 'Não informada'],
    ['Acomodação', item => item.table.acomodacao || 'Não informada'],
    ['Coparticipação', item => item.table.coparticipacao ? 'Sim' : 'Não'],
    ['Abrangência', item => item.plan.abrangencia || 'Não informada'],
    ['Coparticipação por procedimento', item => {
      return proposalDetail(item, 'coparticipacao') || 'Valores não informados para este plano.';
    }],
    ['Coberturas e serviços', item => proposalDetail(item, 'coberturas') || 'Não informadas.'],
    ['Carências', item => proposalDetail(item, 'carencias') || 'Não informadas neste plano.'],
    ['Adicionais', item => proposalDetail(item, 'adicionais') || 'Não informados neste plano.'],
    ['Origem dos valores', item => item.table.origem === 'manual' ? 'Informados manualmente nesta cotação' : `${item.table.nome || 'Tabela cadastrada'}${item.table.vigencia_inicio ? ` · ${dateLabel(item.table.vigencia_inicio)}` : ' · início de vigência pendente'}`]
  ];
  const conditionRows = conditions.map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => {
    if (label === 'Coparticipação por procedimento') {
      const coparticipacao = item.plan?.detalhes?.coparticipacao ?? item.table?.condicoes?.coparticipacao;
      const tableMarkup = coparticipacaoProposalTable(coparticipacao);
      if (tableMarkup) return `<td class="copay-procedure-cell">${tableMarkup}</td>`;
    }
    return `<td>${esc(getValue(item))}</td>`;
  }).join('')}</tr>`).join('');
  const conditionSection = `<section><div class="section-heading"><h2>Principais condições dos planos</h2><p>Resumo das características cadastradas para facilitar a análise.</p></div><table class="proposal-table conditions-table"><thead><tr><th>Característica</th>${plans.map(item => `<th class="brand-${operatorVisualClass(item.operator.nome)}">${esc(item.operator.nome || 'Operadora')} – ${esc(item.plan.nome || 'Plano')}</th>`).join('')}</tr></thead><tbody>${conditionRows}</tbody></table></section>`;
  const secondPageConditions = conditionSection;
  const networkRows = [
    ['Abrangência cadastrada', item => item.plan.abrangencia || 'Não informada'],
    ['Prestadores e unidades', item => proposalDetail(item, 'rede') || 'A relação nominal não está cadastrada neste plano.'],
    ['Conferência recomendada', () => `Confirme a rede disponível para ${quote.city || 'a região do contrato'} diretamente com a operadora.`]
  ].map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => `<td>${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const copayRows = [
    ['Coparticipação prevista', item => item.table.coparticipacao ? 'Sim' : 'Não'],
    ['Valores por procedimento', item => proposalDetail(item, 'coparticipacao') || 'Não informados neste plano.'],
    ['Carências', item => proposalDetail(item, 'carencias') || 'Não informadas neste plano.'],
    ['Adicionais por vida', item => proposalDetail(item, 'adicionais') || 'Não informados neste plano.']
  ];
  const copayColumns = [];
  plans.forEach(item => {
    const operatorClass = operatorVisualClass(item.operator.nome);
    const existing = operatorClass === 'hapvida' ? copayColumns.find(column => column.operatorClass === 'hapvida') : null;
    if (existing) existing.items.push(item);
    else copayColumns.push({ operatorClass, items: [item] });
  });
  const copayHeaders = copayColumns.map(column => {
    const item = column.items[0];
    const subtitle = column.operatorClass === 'hapvida' && column.items.length > 1
      ? `${column.items.length} planos selecionados`
      : item.plan.nome || 'Plano';
    const colspan = column.operatorClass === 'hapvida' && column.items.length > 1 ? ` colspan="${column.items.length}"` : '';
    return `<th class="brand-${column.operatorClass}"${colspan}>${esc(item.operator.nome || 'Operadora')}<small>${esc(subtitle)}</small></th>`;
  }).join('');
  const copayRowsHtml = copayRows.map(([label, getValue]) => `<tr><th>${esc(label)}</th>${copayColumns.map(column => {
    const item = column.items[0];
    const colspan = column.operatorClass === 'hapvida' && column.items.length > 1 ? ` colspan="${column.items.length}"` : '';
    if (label === 'Valores por procedimento') {
      const coparticipacao = item.plan?.detalhes?.coparticipacao ?? item.table?.condicoes?.coparticipacao;
      const tableMarkup = coparticipacaoProposalTable(coparticipacao);
      if (tableMarkup) return `<td class="copay-procedure-cell"${colspan}>${tableMarkup}</td>`;
    }
    return `<td${colspan}>${esc(getValue(item))}</td>`;
  }).join('')}</tr>`).join('');
  const logoMarkup = logo ? `<img src="${esc(logo)}" alt="Logo ${esc(brokerName)}" onerror="this.style.display='none'">` : `<strong class="brand-fallback">${esc(brokerName)}</strong>`;
  const header = (title, subtitle) => `<header class="proposal-header"><div class="proposal-brand">${logoMarkup}</div><div class="proposal-heading"><h1>${title}</h1><p>${subtitle}</p></div></header>`;
  const footer = page => `<footer class="proposal-footer"><div class="footer-lines"><strong>${esc(footerLineOne)}</strong>${footerLineTwo ? `<span>${esc(footerLineTwo)}</span>` : ''}${address ? `<span>${esc(address)}</span>` : ''}</div><span class="page-number">${page}/3</span></footer>`;
  const currentQuoteMeta = `${saved.codigo ? `Cotação #${esc(saved.codigo)}` : 'Cotação'} · Emitida em ${currentDate}`;
  const printOnLoad = autoPrint ? `<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>setTimeout(()=>window.print(),300))})</script>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta de Plano de Saúde${quote.code ? ` - ${esc(quote.code)}` : ''}</title><style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{background:#f1f4f8;color:#0b1b3c;font-family:Arial,Helvetica,sans-serif;margin:0}.proposal-page{background:#fff;margin:18px auto;width:297mm;max-width:calc(100% - 32px);display:flex;flex-direction:column;min-height:210mm;padding:10mm 10mm 22mm;position:relative}.proposal-header{align-items:center;border-bottom:1px solid #dce5ef;display:flex;gap:20px;justify-content:space-between;margin-bottom:10px;padding:0 0 9px}.proposal-brand{align-items:center;display:flex;flex:0 0 220px;min-height:32px}.proposal-brand img{max-height:36px;max-width:190px;object-fit:contain;object-position:left center}.brand-fallback{color:#294895;font-size:14px}.proposal-heading{text-align:right}.proposal-heading h1{font-size:20px;letter-spacing:-.3px;margin:0}.proposal-heading p{color:#536987;font-size:10px;margin:4px 0 0}.client-strip{background:linear-gradient(110deg,#f4f7fb,#f8fafc);border:1px solid #dce5ef;border-radius:7px;display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr;margin-bottom:10px;padding:7px 12px}.client-item{align-items:center;border-right:1px solid #e0e8f1;display:flex;gap:10px;min-width:0;padding:1px 12px}.client-item:first-child{padding-left:2px}.client-item:last-child{border:0}.client-icon{color:#244875;flex:0 0 21px;font-size:19px;font-weight:bold;text-align:center}.client-item span,.client-item strong{display:block}.client-item span{color:#536987;font-size:9px;margin-bottom:3px}.client-item strong{font-size:11px}.client-item small{color:#536987;display:block;font-size:8px;margin-top:2px}.section-heading{margin:11px 0 7px}.section-heading h2{font-size:16px;letter-spacing:-.2px;margin:0}.section-heading p{color:#536987;font-size:9px;margin:3px 0 0}.plan-grid{display:grid;gap:8px;grid-template-columns:repeat(var(--plan-columns,3),minmax(0,1fr));margin-bottom:11px}.plan-card{border:1px solid #dce5ef;border-radius:7px;min-width:0;overflow:hidden}.plan-card.is-sulamerica{border-color:#f27612}.plan-card>header{align-items:center;background:#f4f7fb;display:flex;gap:7px;min-height:36px;padding:6px 9px}.plan-card.is-sulamerica>header{background:#fff7ef}.plan-card.is-unimed>header{background:#f0faf4}.plan-card.is-hapvida>header{background:#f1f8ff}.plan-card.is-bradesco>header{background:#fff3f4}.operator-mark{align-items:center;background:#294895;border-radius:50%;color:#fff;display:inline-flex;flex:0 0 22px;font-size:10px;font-weight:bold;height:22px;justify-content:center}.is-sulamerica .operator-mark{background:#f27612}.is-unimed .operator-mark{background:#079447}.is-hapvida .operator-mark{background:#268ee8}.is-bradesco .operator-mark{background:#c41426}.plan-card>header strong{font-size:11px}.plan-card>header small{color:#536987;flex:1;font-size:9px;font-weight:700;min-width:0;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap}.plan-price{color:#294895;font-size:20px;font-weight:800;line-height:1.1;padding:4px 9px 0;text-align:center}.plan-price small{color:#536987;font-size:9px;font-weight:400;margin-left:3px}.plan-card.is-sulamerica .plan-price{color:#f27612}.plan-card.is-unimed .plan-price{color:#078a3c}.plan-card.is-hapvida .plan-price{color:#075ed2}.plan-card.is-bradesco .plan-price{color:#d20d1b}.plan-price.is-incomplete{color:#9a6200!important;font-size:12px}.plan-features{border-top:1px solid #e5ebf2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:6px 3px}.plan-features>div{align-items:center;border-right:1px solid #e5ebf2;display:flex;gap:5px;min-width:0;padding:2px 5px}.plan-features>div:last-child{border:0}.feature-symbol{color:#244875;flex:0 0 14px;font-size:14px;text-align:center}.plan-features span:last-child{color:#536987;font-size:8px;line-height:1.2}.plan-features strong{color:#0b1b3c;display:block;font-size:8px;margin-top:2px}.proposal-table{border-collapse:collapse;table-layout:fixed;width:100%}.composition-table th,.composition-table td{line-height:1.1;padding:2px 4px}.composition-table th:nth-child(-n+4),.composition-table td:nth-child(-n+4){font-size:7px;padding:1px 2px}.composition-table .life-type{padding:2px 3px;white-space:normal}.proposal-table th,.proposal-table td{border:1px solid #dce5ef;font-size:8px;overflow-wrap:anywhere;padding:5px 6px;text-align:center;vertical-align:middle}.proposal-table thead th{background:#f0f4f9;color:#0b1b3c;font-size:8px}.proposal-table th:first-child,.proposal-table td:first-child{text-align:left}.proposal-table .brand-sulamerica{background:#f27612;color:#fff}.proposal-table .brand-unimed{background:#079447;color:#fff}.proposal-table .brand-hapvida{background:#268ee8;color:#fff}.proposal-table .brand-bradesco{background:#c41426;color:#fff}.proposal-table .brand-default{background:#294895;color:#fff}.proposal-table thead small{display:block;font-size:7px;font-weight:500;margin-top:2px}.proposal-table .group-cell{font-weight:700;white-space:nowrap}.life-type{background:#dcecff;border-radius:4px;color:#0759c7;display:inline-block;padding:3px 6px}.life-type.dependente{background:#d9f7e5;color:#087b39}.price-sulamerica{color:#d85800}.price-unimed{color:#078a3c}.price-hapvida{color:#075ed2}.price-bradesco{color:#c41426}.proposal-table td.is-incomplete{color:#9a6200!important}.proposal-table .group-total td{background:#fff7e3;font-weight:700}.proposal-table .grand-total td{background:#f0f5fc;font-size:9px;font-weight:700}.proposal-table .grand-total td.price-sulamerica{background:#fff3e5;color:#d85800}.proposal-table .grand-total td.price-unimed{background:#eaf7ef;color:#078a3c}.proposal-table .grand-total td.price-hapvida{background:#edf6ff;color:#075ed2}.proposal-table .grand-total td.price-bradesco{background:#fff0f2;color:#c41426}.proposal-table .grand-total small{display:block;font-size:7px;font-weight:400;margin-top:2px}.conditions-table th:first-child{width:21%}.conditions-table td{text-align:left;white-space:pre-line}.network-table th:first-child,.copay-table th:first-child{width:24%}.network-table td{text-align:left}.copay-table td{text-align:left;white-space:pre-line}.copay-table td.copay-procedure-cell,.conditions-table td.copay-procedure-cell{padding:3px;white-space:normal}.copay-detail-table{border-collapse:collapse;table-layout:fixed;width:100%}.copay-detail-table th,.copay-detail-table td{border:1px solid #dce5ef;font-size:7px;line-height:1.15;overflow-wrap:anywhere;padding:2px 3px;text-align:left;vertical-align:top}.copay-detail-table th{background:#f0f4f9;font-weight:700}.supplemental-grid{display:grid;grid-template-columns:1fr;margin-top:auto}.important-list{display:grid;grid-auto-flow:column;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,auto);column-gap:16px}.supplemental-card{border:1px solid #dce5ef;border-radius:6px;overflow:hidden}.supplemental-card h2{font-size:12px;margin:0;padding:5px 8px}.interpretation-list{list-style:none;margin:0;padding:0}.interpretation-list li{align-items:flex-start;border-top:1px solid #e5ebf2;display:flex;font-size:8px;gap:6px;line-height:1.2;padding:3px 8px}.interpretation-list b{align-items:center;background:#e8f2ff;border-radius:50%;color:#0759c7;display:flex;flex:0 0 14px;height:14px;justify-content:center}.important-list{list-style:none;margin:0;padding:0}.important-list li{border-top:1px solid #e5ebf2;font-size:8px;line-height:1.2;padding:3px 8px}.important-list li:before{color:#294895;content:'ⓘ';font-weight:bold;margin-right:6px}.info-note{background:#f2f7fc;border-left:3px solid #294895;color:#435977;font-size:8px;line-height:1.4;margin:8px 0;padding:7px 9px}.proposal-footer{align-items:end;border-top:1px solid #bfcfe0;bottom:10mm;color:#435977;display:flex;font-size:7px;justify-content:space-between;left:10mm;margin-top:0;padding-top:6px;position:absolute;right:10mm}.proposal-footer strong,.proposal-footer span{display:block}.proposal-footer .footer-lines{flex:1;min-width:0}.proposal-footer span{margin-top:2px;max-width:900px}.proposal-footer .footer-lines span{max-width:none}.page-number{font-size:9px!important;margin:0!important;white-space:nowrap}.actions{background:#fff;margin:12px auto;width:210mm;max-width:calc(100% - 32px);padding:8px 14mm;text-align:right}.actions button{background:#0864c9;border:0;border-radius:5px;color:white;cursor:pointer;font-size:11px;font-weight:bold;padding:9px 14px}@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.proposal-page{break-after:page;margin:0;width:auto;max-width:none;min-height:190mm;padding:0 0 14mm}.proposal-page:last-of-type{break-after:auto}.actions{display:none}.proposal-footer{bottom:0;left:0;right:0}.plan-card,.supplemental-card,.info-note{break-inside:avoid}.section-heading{break-after:avoid}.proposal-table thead{display:table-header-group}.proposal-table tr{break-inside:avoid}}@media screen{.proposal-page{box-shadow:0 3px 16px #1b345014}.actions{position:sticky;bottom:0}.client-strip{grid-template-columns:1.4fr 1.2fr 1fr 1fr}}@media screen and (max-width:760px){.proposal-page{padding:18px}.proposal-header{align-items:flex-start;flex-direction:column;gap:8px}.proposal-heading{text-align:left}.proposal-brand{flex-basis:auto}.client-strip{grid-template-columns:1fr 1fr}.client-item:nth-child(2){border-right:0}.plan-grid{grid-template-columns:1fr}.supplemental-grid{grid-template-columns:1fr}.important-list{grid-auto-flow:row;grid-template-columns:1fr;grid-template-rows:none}}
  </style></head><body>
    <section class="proposal-page">
      ${header('Proposta de Plano de Saúde', currentQuoteMeta)}
      <section class="client-strip"><div class="client-item"><span class="client-icon">▦</span><div><span>Cliente / Empresa</span><strong>${esc(quote.company || '—')}</strong><small>${quote.cnpj ? `CNPJ ${esc(quote.cnpj)}` : ''}${quote.city ? `${quote.cnpj ? ' · ' : ''}${esc(quote.city)}` : ''}</small></div></div><div class="client-item"><span class="client-icon">♟</span><div><span>Total de vidas</span><strong>${quote.lives.length}</strong><small>${selectedLives} titular${selectedLives === 1 ? '' : 'es'} · ${dependents} dependente${dependents === 1 ? '' : 's'}</small></div></div><div class="client-item"><span class="client-icon">▤</span><div><span>Tipo de contratação</span><strong>${esc(quote.type)}</strong></div></div><div class="client-item"><span class="client-icon">▣</span><div><span>Vigência desejada</span><strong>${dateLabel(quote.effectiveDate)}</strong></div></div></section>
      <section><div class="section-heading"><h2>${planSectionTitle}</h2></div><div class="plan-grid" style="--plan-columns:${Math.min(plans.length, 6)}">${planCards}</div></section>
      <section><div class="section-heading"><h2>Composição da cotação</h2></div><table class="proposal-table composition-table"><colgroup><col style="width:${compositionDetailsWidth * 0.15}%"><col style="width:${compositionDetailsWidth * 0.35}%"><col style="width:${compositionDetailsWidth * 0.15}%"><col style="width:${compositionDetailsWidth * 0.35}%">${compositionPlanColumns}</colgroup><thead><tr><th>Grupo</th><th>Nome</th><th>Tipo</th><th>Faixa Etária</th>${comparisonHeaders}</tr></thead><tbody>${comparisonRows}<tr class="grand-total"><td colspan="2">Total da cotação</td><td colspan="2">${quote.lives.length} vidas</td>${totalCells}</tr></tbody></table></section>
      <div class="info-note">Valores estimados conforme as faixas etárias e a tabela cadastrada. Os valores podem ser alterados sem aviso prévio, conforme condições de cada operadora. Consulte a página das condições de contratação.</div>
      <div class="supplemental-grid"><section class="supplemental-card supplemental-observations"><h2>Observações importantes</h2><ul class="important-list"><li>Esta proposta é indicativa e não constitui oferta vinculante de contratação.</li><li>A aceitação está sujeita à análise de elegibilidade e às regras comerciais da operadora.</li><li>Rede credenciada, carências e condições podem variar conforme região e contrato.</li><li>Confirme valores e disponibilidade na data efetiva da contratação.</li></ul></section></div>
      ${footer(1)}
    </section>
    <section class="proposal-page">
      ${header('Informações complementares', 'Página 2 · Resumo de rede e coparticipação')}
      <section><div class="section-heading"><h2>Resumo de rede credenciada</h2><p>A abrangência cadastrada está resumida abaixo. A disponibilidade completa deve ser confirmada para a região e o contrato.</p></div><table class="proposal-table network-table"><thead><tr><th>Item</th>${comparisonHeaders}</tr></thead><tbody>${networkRows}</tbody></table></section>
      <section><div class="section-heading"><h2>Regras de coparticipação</h2><p>Este catálogo registra se o plano prevê coparticipação; valores por serviço dependem das condições da operadora.</p></div><table class="proposal-table copay-table"><thead><tr><th>Informação</th>${copayHeaders}</tr></thead><tbody>${copayRowsHtml}</tbody></table></section>
      ${footer(2)}
    </section>
    <section class="proposal-page">
      ${header('Informações complementares', 'Página 3 · Principais condições dos planos')}
      ${secondPageConditions}
      ${footer(3)}
    </section>
    <div class="actions"><button onclick="window.print()">▣ &nbsp; Imprimir / Salvar em PDF</button></div>
    ${printOnLoad}
  </body></html>`;
}

export async function carregarPropostaSalvaSimuladorSaude(id) {
  if (!id) throw new Error('Informe a cotação que deseja visualizar.');
  const quoteResponse = await chamarApi('getSimuladorSaudeQuoteById', { id });
  if (!quoteResponse.ok) throw new Error(quoteResponse.message || 'Não foi possível carregar a cotação.');
  if (!quoteResponse.data) throw new Error('Cotação não encontrada ou sem acesso.');
  const [catalogResponse, brandingResponse] = await Promise.all([
    chamarApi('getSimuladorSaudeCatalog'),
    chamarApi('getSimuladorSaudeBrokerBranding')
  ]);
  if (!catalogResponse.ok) throw new Error(catalogResponse.message || 'Não foi possível carregar o catálogo de planos.');

  const previousQuote = { ...quote };
  try {
    applySavedQuote(quoteResponse.data);
    quote.catalog = catalogResponse.data || { operators: [], plans: [], tables: [], bands: [] };
    const branding = brandingResponse.ok ? brandingResponse.data || {} : {};
    return proposalHtml(branding, quoteResponse.data, { autoPrint: false });
  } finally {
    Object.assign(quote, previousQuote);
  }
}

window.saudeQuoteProposal = async () => {
  const selected = quote.plans.filter(item => item.selected);
  if (!selected.length) { quote.notice = 'Selecione ao menos um plano para gerar a proposta.'; rerender(); return; }
  if (!quote.lives.length) { quote.notice = 'Adicione vidas antes de gerar a proposta.'; rerender(); return; }
  const incomplete = selected.some(item => planTotal(item.tableId) === null);
  if (incomplete && !window.confirm('Há planos com preços indisponíveis. A proposta os identificará como cotação incompleta. Deseja continuar?')) return;
  const proposalWindow = window.open('about:blank', '_blank');
  if (!proposalWindow) { quote.notice = 'Permita a abertura de nova janela para preparar o PDF.'; rerender(); return; }
  quote.saving = true; quote.notice = ''; rerender();
  try {
    const saved = await persistCurrentQuote('proposta');
    const brandingResponse = await chamarApi('getSimuladorSaudeBrokerBranding');
    const branding = brandingResponse.ok ? brandingResponse.data || {} : {};
    const proposalBlob = new Blob([proposalHtml(branding, saved)], { type: 'text/html;charset=utf-8' });
    const proposalUrl = URL.createObjectURL(proposalBlob);
    proposalWindow.location = proposalUrl;
    window.setTimeout(() => URL.revokeObjectURL(proposalUrl), 5 * 60 * 1000);
    quote.notice = 'Proposta pronta. Na janela aberta, escolha “Salvar como PDF” no diálogo de impressão.';
  } catch (error) {
    proposalWindow.close(); quote.notice = error.message || 'Não foi possível preparar a proposta.';
  } finally { quote.saving = false; rerender(); }
};
