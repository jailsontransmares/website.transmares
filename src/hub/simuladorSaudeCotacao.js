import './simuladorSaudeCotacao.css';
import { chamarApi } from './api.js';
import { SIMULADOR_SAUDE_ROUTE } from './simuladorSaudeRoutes.js';
import { obterBaseHub } from './routeConfig.js';

const BANDS = ['0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+'];
const quote = { id: '', code: '', version: 0, company: '', cnpj: '', city: '', type: 'Empresarial (PJ)', effectiveDate: '', lives: [], plans: [], expandedGroups: new Set(), operatorFilter: '', accommodationFilter: '', copayFilter: '', modal: '', manualPlanMode: false, manualPlanEditingId: '', editingLifeId: '', catalogError: '', catalog: { operators: [], plans: [], tables: [], bands: [] }, notice: '', saving: false, loading: false, savedSignature: '', initialized: false, importText: '', importPreview: null };
let context = {};

function esc(value = '') { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function today() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
function dateLabel(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—'; }
function money(value) { return Number.isFinite(value) ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; }
function proposalDetail(item, key) {
  const value = item.plan?.detalhes?.[key] ?? item.table?.condicoes?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(entry => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return String(entry ?? '');
    if (entry.prazo || entry.cobertura) return `${entry.prazo || ''}: ${entry.cobertura || ''}`.trim();
    return [entry.nome || entry.procedimento, entry.descricao || entry.endereco, entry.valor_por_vida != null ? `${money(Number(entry.valor_por_vida))} por vida` : ''].filter(Boolean).join(' · ');
  }).filter(Boolean).join(' · ');
  if (value && typeof value === 'object') {
    if (value.observacao) return value.observacao;
    return Object.entries(value).filter(([name]) => name !== 'observacao').map(([name, rule]) => {
      if (!rule || typeof rule !== 'object') return `${name}: ${rule}`;
      return `${name}: ${rule.valor != null ? money(Number(rule.valor)) : `${rule.percentual ?? ''}%${rule.limite != null ? `, limite ${money(Number(rule.limite))}` : ''}`}`;
    }).join(' · ');
  }
  return '';
}
function ageOf(birth, reference = quote.effectiveDate || today()) {
  if (!birth) return null;
  const born = new Date(`${birth}T12:00:00`); const at = new Date(`${reference}T12:00:00`);
  if (Number.isNaN(born.getTime()) || born > at) return null;
  let age = at.getFullYear() - born.getFullYear();
  if (at.getMonth() < born.getMonth() || (at.getMonth() === born.getMonth() && at.getDate() < born.getDate())) age -= 1;
  return age;
}
function ageBand(age) {
  if (!Number.isInteger(age) || age < 0) return '';
  if (age <= 18) return BANDS[0]; if (age <= 23) return BANDS[1]; if (age <= 28) return BANDS[2]; if (age <= 33) return BANDS[3]; if (age <= 38) return BANDS[4]; if (age <= 43) return BANDS[5]; if (age <= 48) return BANDS[6]; if (age <= 53) return BANDS[7]; if (age <= 58) return BANDS[8]; return BANDS[9];
}
function nextId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function quotePlanEntry(tableId) { return quote.plans.find(item => item.tableId === tableId) || {}; }
function planFor(tableId) { return quotePlanEntry(tableId).table_snapshot || quote.catalog.tables.find(table => table.id === tableId) || {}; }
function planInfo(table) { return quotePlanEntry(table.id).plan_snapshot || quote.catalog.plans.find(plan => plan.id === table.plano_id) || {}; }
function operatorInfo(plan) { return quotePlanEntry(quote.plans.find(item => item.plan_snapshot?.id === plan.id)?.tableId || '').operator_snapshot || quote.catalog.operators.find(operator => operator.id === plan.operadora_id) || {}; }
function pricesFor(tableId) {
  const saved = quotePlanEntry(tableId).prices_snapshot;
  if (saved) return saved;
  const table = planFor(tableId);
  const rows = quote.catalog.bands.filter(item => item.tabela_preco_id === tableId);
  if (table.tipo_contratacao === 'Individual') {
    return Object.fromEntries(['uma_vida', 'duas_ou_mais'].map(rule => [rule, Object.fromEntries(rows.filter(item => item.regra_vidas === rule).map(item => [item.faixa_etaria, Number(item.valor)]))]));
  }
  return { geral: Object.fromEntries(rows.map(item => [item.faixa_etaria, Number(item.valor)])) };
}
function displayCatalogStatus(table) { return table.status === 'vigente' && (!table.vigencia_fim || table.vigencia_fim >= (quote.effectiveDate || today())) && table.vigencia_inicio <= (quote.effectiveDate || today()); }
function validCatalogTables() { return quote.catalog.tables.filter(table => table.status === 'vigente' && displayCatalogStatus(table) && quote.catalog.plans.some(plan => plan.id === table.plano_id && plan.status === 'ativo') && (table.tipo_contratacao || 'Empresarial (PJ)') === quote.type); }
function lifeAge(life) { return ageOf(life.nascimento); }
function lifeBand(life) { return ageBand(lifeAge(life)); }
function groupNumber(groupId) { const index = quote.lives.filter(life => life.tipo === 'titular').findIndex(life => life.id === groupId); return String(index + 1).padStart(2, '0'); }
function livesInGroup(groupId) { return quote.lives.filter(life => life.grupo_id === groupId).sort((a, b) => a.tipo === b.tipo ? a.nome.localeCompare(b.nome, 'pt-BR') : a.tipo === 'titular' ? -1 : 1); }
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
function totalsFor(tableId, groupId) { const members = livesInGroup(groupId); const values = members.map(life => planPrice(tableId, life)); return { total: values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null, incomplete: members.filter((life, index) => !Number.isFinite(values[index])).map(life => `${life.nome} (${lifeBand(life) || 'idade inválida'})`) }; }
function planTotal(tableId) { if (!quote.lives.length) return null; const totals = groupIds().map(id => totalsFor(tableId, id)); return totals.every(item => Number.isFinite(item.total)) ? totals.reduce((sum, item) => sum + item.total, 0) : null; }
function selectedPlans() {
  return quote.plans.map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))) }))
    .filter(item => item.table.id)
    .filter(item => !quote.operatorFilter || item.operator.id === quote.operatorFilter)
    .filter(item => !quote.accommodationFilter || item.plan.acomodacao === quote.accommodationFilter)
    .filter(item => !quote.copayFilter || String(item.plan.coparticipacao) === quote.copayFilter);
}
function quoteOperators() {
  const operators = [...quote.catalog.operators, ...quote.plans.map(item => item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))))];
  const seen = new Set();
  return operators.filter(operator => operator?.id && !seen.has(operator.id) && seen.add(operator.id));
}
function renderNotice() { return quote.catalogError ? `<div class="saude-quote-notice is-error" role="alert"><strong>Catálogo indisponível.</strong><span>${esc(quote.catalogError)}</span><button type="button" onclick="saudeQuoteReloadCatalog()">Tentar novamente</button></div>` : quote.notice ? `<div class="saude-quote-notice" role="status">${esc(quote.notice)}<button type="button" onclick="saudeQuoteClearNotice()">Fechar</button></div>` : ''; }
function field(label, name, value, type = 'text', required = false) { return `<label class="saude-quote-field"><span>${esc(label)}${required ? ' *' : ''}</span><input name="${name}" type="${type}" value="${esc(value || '')}" ${required ? 'required' : ''}></label>`; }

function renderHeader() {
  const canSave = quote.id
    ? Boolean(context.pode?.('simulador_saude', 'view'))
    : Boolean(context.pode?.('simulador_saude', 'create'));
  return `<div class="saude-quote-header"><div class="saude-quote-title"><span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>Cotação de Plano de Saúde</h2><p>Cadastre as vidas e compare os valores dos planos por faixa etária.${quote.code ? ` · Cotação #${quote.code} · versão ${quote.version}` : ''}</p></div></div><div class="saude-quote-header-actions"><button class="secondary-btn" type="button" onclick="saudeQuoteBackToList()"><i data-lucide="chevron-left" aria-hidden="true"></i> Voltar às cotações</button><button class="secondary-btn" type="button" onclick="saudeQuoteClear()"><i data-lucide="eraser" aria-hidden="true"></i> Limpar</button><button class="secondary-btn" type="button" onclick="saudeQuoteSave()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> ${quote.saving ? 'Salvando…' : 'Salvar'}</button><button class="primary-btn" type="button" onclick="saudeQuoteProposal()" ${quote.saving || !canSave ? 'disabled' : ''}><i data-lucide="file-text" aria-hidden="true"></i> Gerar Proposta</button></div></div>`;
}

function renderCompany() {
  const tariffHint = quote.type === 'Individual' ? `<p class="saude-quote-empty">${quote.lives.length >= 2 ? 'Tarifa para 2 ou mais vidas aplicada automaticamente.' : 'Com uma vida, é aplicada a tarifa individual. Ao adicionar outra vida, o sistema verifica a tarifa de 2 ou mais.'}</p>` : '';
  return `<section class="saude-quote-card"><header><h3><i data-lucide="landmark" aria-hidden="true"></i> Dados do Cliente / Empresa</h3></header><div class="saude-quote-company-grid"><label class="saude-quote-field"><span>Cliente / Razão Social</span><input value="${esc(quote.company)}" oninput="saudeQuoteField('company', this.value)"></label><label class="saude-quote-field"><span>CNPJ (se empresarial)</span><input value="${esc(quote.cnpj)}" inputmode="numeric" oninput="saudeQuoteField('cnpj', this.value)"></label><label class="saude-quote-field"><span>Cidade</span><input value="${esc(quote.city)}" oninput="saudeQuoteField('city', this.value)"></label><label class="saude-quote-field"><span>Tipo de contratação</span><select onchange="saudeQuoteField('type', this.value)"><option value="Individual" ${quote.type === 'Individual' ? 'selected' : ''}>Individual</option><option value="Empresarial (PJ)" ${quote.type === 'Empresarial (PJ)' ? 'selected' : ''}>Empresarial</option></select></label><label class="saude-quote-field"><span>Vigência desejada</span><input type="date" value="${esc(quote.effectiveDate)}" onchange="saudeQuoteField('effectiveDate', this.value)"></label></div>${tariffHint}</section>`;
}

function renderLifeModal() {
  if (!['titular', 'dependente', 'edit-life'].includes(quote.modal)) return '';
  const life = quote.lives.find(item => item.id === quote.editingLifeId) || { tipo: quote.modal, nome: '', nascimento: '', grupo_id: '' };
  const isDependent = life.tipo === 'dependente';
  const groupOptions = groupIds().map(id => `<option value="${esc(id)}" ${life.grupo_id === id ? 'selected' : ''}>Titular: ${esc(groupHead(id)?.nome || '—')} · Grupo ${groupNumber(id)}</option>`).join('');
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><form class="saude-quote-modal" role="dialog" aria-modal="true" aria-labelledby="saude-life-modal-title" onsubmit="saudeQuoteSaveLife(event)" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Cadastro de vidas</span><h3 id="saude-life-modal-title">${quote.editingLifeId ? 'Editar' : 'Adicionar'} ${isDependent ? 'dependente' : 'titular'}</h3></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header>${isDependent ? `<label class="saude-quote-field"><span>Titular / grupo *</span><select name="grupo_id" required>${groupOptions}</select></label>` : ''}${field('Nome', 'nome', life.nome, 'text', true)}${field('Data de nascimento', 'nascimento', life.nascimento, 'date', true)}${field('CPF (opcional)', 'cpf', life.cpf, 'text', false)}<footer><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Cancelar</button><button class="primary-btn" type="submit">${quote.editingLifeId ? 'Salvar' : 'Adicionar'}</button></footer></form></div>`;
}

function renderImportModal() {
  if (quote.modal !== 'import') return '';
  const preview = quote.importPreview;
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><section class="saude-quote-modal saude-quote-import-modal" role="dialog" aria-modal="true" aria-labelledby="saude-import-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Planilha</span><h3 id="saude-import-title">Importar vidas do Excel</h3><p>Cole as células copiadas da planilha. Cabeçalho opcional: Grupo, Tipo, Nome, Nascimento.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header>${preview ? `<div class="saude-import-results ${preview.errors.length ? 'has-errors' : ''}"><strong>${preview.validRows.length} linha(s) válida(s) · ${preview.errors.length} erro(s)</strong>${preview.errors.map(error => `<p>Linha ${error.line}: ${esc(error.message)}</p>`).join('') || '<p>Todos os grupos têm um titular e as datas estão válidas.</p>'}<div class="saude-import-preview">${preview.validRows.slice(0, 8).map(row => `<span>Grupo ${esc(row.grupo)} · ${esc(row.tipo)} · ${esc(row.nome)} · ${dateLabel(row.nascimento)}</span>`).join('')}</div></div>` : `<form onsubmit="saudeQuoteValidateImport(event)"><label class="saude-quote-field"><span>Dados copiados do Excel</span><textarea name="importText" rows="9" placeholder="Grupo&#9;Tipo&#9;Nome&#9;Nascimento">${esc(quote.importText)}</textarea></label><footer><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Cancelar</button><button class="primary-btn" type="submit">Validar dados</button></footer></form>`}${preview ? `<footer><button class="secondary-btn" type="button" onclick="saudeQuoteRevisarImport()">Voltar</button><button class="primary-btn" type="button" onclick="saudeQuoteCommitImport()" ${!preview.validRows.length || preview.errors.length ? 'disabled' : ''}>Adicionar vidas</button></footer>` : ''}</section></div>`;
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
  const titulares = quote.lives.filter(item => item.tipo === 'titular').length; const dependents = quote.lives.filter(item => item.tipo === 'dependente').length;
  const ages = Object.fromEntries(BANDS.map(band => [band, quote.lives.filter(life => lifeBand(life) === band).length]));
  const maxAgeCount = Math.max(1, ...Object.values(ages));
  const groups = groupIds();
  const rows = groups.flatMap(groupId => livesInGroup(groupId).map(life => `<tr><td>${String(groupNumber(groupId)).padStart(2, '0')}</td><td><span class="saude-life-badge ${life.tipo}">${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td><strong>${esc(life.nome)}</strong></td><td>${dateLabel(life.nascimento)}</td><td>${lifeAge(life) ?? '—'}</td><td>${lifeBand(life) || '—'}</td><td class="saude-life-actions"><button class="saude-quote-icon-button" type="button" title="Editar ${esc(life.nome)}" aria-label="Editar ${esc(life.nome)}" onclick="saudeQuoteEditLife('${esc(life.id)}')"><i data-lucide="pencil" aria-hidden="true"></i></button><button class="saude-quote-icon-button is-danger" type="button" title="Excluir ${esc(life.nome)}" aria-label="Excluir ${esc(life.nome)}" onclick="saudeQuoteDeleteLife('${esc(life.id)}')"><i data-lucide="trash-2" aria-hidden="true"></i></button></td></tr>`));
  return `<section class="saude-quote-card"><header class="saude-lives-header"><div class="saude-lives-heading"><h3><i data-lucide="users-round" aria-hidden="true"></i> Vidas da Cotação</h3><div class="saude-quote-count-chips"><span>${titulares} titulares</span><span>${dependents} dependentes</span><span class="is-total">${quote.lives.length} vidas</span></div></div><div class="saude-quote-actions"><button class="primary-btn" type="button" onclick="saudeQuoteOpenModal('titular')"><i data-lucide="plus" aria-hidden="true"></i> Adicionar Titular</button><button class="secondary-btn" type="button" onclick="saudeQuoteOpenModal('dependente')" ${!titulares ? 'disabled' : ''}><i data-lucide="plus" aria-hidden="true"></i> Adicionar Dependente</button><button class="secondary-btn" type="button" onclick="saudeQuoteOpenImport()"><i data-lucide="upload-cloud" aria-hidden="true"></i> Importar Excel</button></div></header><div class="saude-quote-lives-layout"><div class="saude-quote-table-wrap"><table class="saude-quote-lives-table"><thead><tr><th>Grupo</th><th>Tipo</th><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Faixa Etária</th><th>Ações</th></tr></thead><tbody>${rows.length ? rows.join('') : '<tr><td colspan="7" class="saude-quote-empty">Adicione um titular para iniciar a cotação.</td></tr>'}</tbody></table></div><aside class="saude-quote-summary"><h4>Resumo das Vidas</h4><div class="saude-quote-summary-counts"><article class="is-blue"><i data-lucide="users-round" aria-hidden="true"></i><div><strong>${titulares}</strong><small>Titulares</small></div></article><article class="is-green"><i data-lucide="users-round" aria-hidden="true"></i><div><strong>${dependents}</strong><small>Dependentes</small></div></article><article class="is-violet"><i data-lucide="users-round" aria-hidden="true"></i><div><strong>${quote.lives.length}</strong><small>Total de vidas</small></div></article></div><div class="saude-quote-summary-lower"><section class="saude-age-distribution"><h5>Por faixa etária</h5><ul>${BANDS.map(band => `<li><span>${band}</span><span class="saude-age-bar"><i style="width:${Math.round(ages[band] / maxAgeCount * 100)}%"></i></span><strong>${ages[band]}</strong></li>`).join('')}</ul></section><div class="saude-quote-summary-stats"><section><h5>Titulares x Dependentes</h5><p><span>Titulares</span><strong>${titulares}</strong></p><p><span>Dependentes</span><strong>${dependents}</strong></p></section><section><h5><i data-lucide="users-round" aria-hidden="true"></i> Total de grupos</h5><strong class="saude-group-count">${groups.length}</strong></section></div></div></aside></div></section>`;
}

function renderPlanPicker() {
  if (!quote.modal || quote.modal !== 'plan') return '';
  const available = validCatalogTables().filter(table => !quote.plans.some(item => item.tableId === table.id));
  if (quote.manualPlanMode) {
    const editing = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
    const currentOperator = normalizeImportToken(editing?.operator_snapshot?.nome || '').includes('bradesco') ? 'manual-bradesco' : 'manual-sulamerica';
    const currentPlan = editing?.plan_snapshot || {};
    const currentPrices = editing?.prices_snapshot || {};
    return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><form class="saude-quote-modal saude-manual-plan-modal" role="dialog" aria-modal="true" aria-labelledby="saude-manual-plan-title" onsubmit="saudeQuoteAddManualPlan(event)" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Valores desta cotação</span><h3 id="saude-manual-plan-title">${editing ? 'Editar valores manuais' : 'Adicionar plano manualmente'}</h3><p>Os valores serão salvos somente nesta cotação.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header><div class="saude-manual-plan-fields"><label class="saude-quote-field"><span>Operadora *</span><select name="operatorId" required><option value="manual-sulamerica" ${currentOperator === 'manual-sulamerica' ? 'selected' : ''}>SulAmérica</option><option value="manual-bradesco" ${currentOperator === 'manual-bradesco' ? 'selected' : ''}>Bradesco</option></select></label><label class="saude-quote-field"><span>Nome do plano *</span><input name="planName" required maxlength="120" placeholder="Ex.: Executivo Nacional" value="${esc(currentPlan.nome || '')}"></label><label class="saude-quote-field"><span>Acomodação</span><select name="accommodation"><option value="" ${!currentPlan.acomodacao ? 'selected' : ''}>Não informado</option><option ${currentPlan.acomodacao === 'Apartamento' ? 'selected' : ''}>Apartamento</option><option ${currentPlan.acomodacao === 'Enfermaria' ? 'selected' : ''}>Enfermaria</option></select></label><label class="saude-quote-field"><span>Coparticipação</span><select name="coparticipation"><option value="false" ${!currentPlan.coparticipacao ? 'selected' : ''}>Não</option><option value="true" ${currentPlan.coparticipacao ? 'selected' : ''}>Sim</option></select></label><label class="saude-quote-field"><span>Abrangência (opcional)</span><input name="coverage" maxlength="120" placeholder="Ex.: Nacional" value="${esc(currentPlan.abrangencia || '')}"></label></div><section class="saude-manual-price-section"><header><div><h4>Preço por faixa etária</h4><p>Informe as faixas disponíveis na proposta da operadora. Faixas vazias serão indicadas como incompletas se houver vidas nelas.</p></div></header><div class="saude-manual-price-grid">${BANDS.map((band, index) => `<label class="saude-quote-field"><span>${band} anos · R$</span><input name="price_${index}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${Number.isFinite(Number(currentPrices[band])) ? esc(currentPrices[band]) : ''}"></label>`).join('')}</div></section><footer><button class="secondary-btn" type="button" onclick="saudeQuoteManualPlanBack()">Voltar</button><button class="primary-btn" type="submit">${editing ? 'Salvar alterações' : 'Adicionar à cotação'}</button></footer></form></div>`;
  }
  return `<div class="saude-quote-overlay" role="presentation" onclick="saudeQuoteCloseModal()"><div class="saude-quote-modal" role="dialog" aria-modal="true" aria-labelledby="saude-plan-modal-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Base de preços · ${esc(quote.type)}</span><h3 id="saude-plan-modal-title">Adicionar plano</h3></div><button class="secondary-btn" type="button" onclick="saudeQuoteCloseModal()">Fechar</button></header>${available.length ? `<form class="saude-plan-catalog-form" onsubmit="saudeQuoteAddPlan(event)"><label class="saude-quote-field"><span>Plano / tabela vigente *</span><select name="tableId" required><option value="">Selecione um plano</option>${available.map(table => { const plan = planInfo(table); const operator = operatorInfo(plan); return `<option value="${esc(table.id)}">${esc(operator.nome)} · ${esc(plan.nome)} · ${esc(plan.acomodacao)} · ${dateLabel(table.vigencia_inicio)}</option>`; }).join('')}</select></label><footer><button class="primary-btn" type="submit">Adicionar plano do catálogo</button></footer></form>` : `<p class="saude-quote-empty">Não há tabelas vigentes disponíveis para ${esc(quote.type)} na data informada. Confira o catálogo ou ajuste a vigência.</p><button class="secondary-btn" type="button" onclick="saudeQuoteGoCatalog()">Configurar catálogo</button>`}<section class="saude-manual-entry"><div><h4>Informar valores manualmente</h4><p>Use para cotações de SulAmérica ou Bradesco que não estejam no catálogo.</p></div><button class="secondary-btn" type="button" onclick="saudeQuoteShowManualPlan()">Adicionar plano manual</button></section></div></div>`;
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
  const header = `<div class="saude-quote-result-tools"><div class="saude-result-title"><h3><i data-lucide="file-text" aria-hidden="true"></i> Resultado da Cotação</h3><p>Valores calculados pela idade na data de vigência informada.</p></div><div class="saude-quote-filters"><label><span>Operadoras</span><select onchange="saudeQuoteFilter('operatorFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.operatorFilter }, ...quoteOperators().map(item => ({ value: item.id, label: item.nome, current: quote.operatorFilter }))])}</select></label><label><span>Acomodação</span><select onchange="saudeQuoteFilter('accommodationFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.accommodationFilter }, ...['Apartamento', 'Enfermaria', 'Ambulatorial'].map(value => ({ value, label: value, current: quote.accommodationFilter }))])}</select></label><label><span>Coparticipação</span><select onchange="saudeQuoteFilter('copayFilter', this.value)">${options([{ value: '', label: 'Todas', current: quote.copayFilter }, { value: 'true', label: 'Sim', current: quote.copayFilter }, { value: 'false', label: 'Não', current: quote.copayFilter }])}</select></label><button class="primary-btn" type="button" onclick="saudeQuoteOpenModal('plan')"><i data-lucide="plus" aria-hidden="true"></i> Adicionar Plano</button></div></div>`;
  if (!allPlans.length) return `<section class="saude-quote-card">${header}<div class="saude-quote-empty">Adicione planos do catálogo vigente para comparar valores.</div></section>`;
  const columns = plans.map(item => {
    const brand = operatorVisualClass(item.operator.nome);
    return `<th class="saude-plan-heading"><div class="saude-plan-brand is-${brand}"><span class="saude-plan-mark">${esc(operatorMonogram(item.operator.nome))}</span><strong>${esc(item.operator.nome || 'Operadora')}</strong><span>${esc(item.plan.nome || 'Plano')}</span><small>${esc(item.plan.acomodacao || 'Acomodação não informada')} · ${item.plan.coparticipacao ? 'Coparticipação' : 'Sem coparticipação'}</small></div><div class="saude-plan-total saude-price-${brand}">${planTotal(item.tableId) === null ? '<b class="is-incomplete">Cotação incompleta</b>' : `<b>${money(planTotal(item.tableId))}</b>`}<small>${quote.lives.length} vidas${quote.lives.length && planTotal(item.tableId) !== null ? ` · ${money(planTotal(item.tableId) / quote.lives.length)}/vida` : ''}</small></div><label class="saude-plan-select"><input type="checkbox" ${item.selected ? 'checked' : ''} onchange="saudeQuoteTogglePlan('${esc(item.tableId)}', this.checked)"> Selecionar</label>${item.table.origem === 'manual' ? `<button class="saude-quote-link" type="button" onclick="saudeQuoteEditManualPlan('${esc(item.tableId)}')">Editar valores</button>` : ''}<button class="saude-quote-link is-danger" type="button" onclick="saudeQuoteRemovePlan('${esc(item.tableId)}')">Remover</button></th>`;
  }).join('');
  const groups = groupIds();
  const titulares = quote.lives.filter(item => item.tipo === 'titular').length;
  const dependents = quote.lives.filter(item => item.tipo === 'dependente').length;
  const body = groups.map(groupId => {
    const members = livesInGroup(groupId); const expanded = quote.expandedGroups.has(groupId); const title = groupHead(groupId)?.nome || 'Titular';
    const values = plans.map(item => { const result = totalsFor(item.tableId, groupId); return `<td class="saude-price-${operatorVisualClass(item.operator.nome)} ${result.total === null ? 'is-incomplete' : ''}">${result.total === null ? 'Cotação incompleta' : money(result.total)}</td>`; }).join('');
    const detail = expanded ? `<tr class="saude-group-detail"><td colspan="${1 + plans.length}"><div class="saude-group-people"><table><thead><tr><th>Tipo</th><th>Nome</th><th>Nascimento</th><th>Idade</th><th>Faixa Etária</th>${plans.map(item => `<th>${esc(item.operator.nome || item.plan.nome)}</th>`).join('')}</tr></thead><tbody>${members.map(life => `<tr><td>${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</td><td>${esc(life.nome)}</td><td>${dateLabel(life.nascimento)}</td><td>${lifeAge(life) ?? '—'}</td><td>${lifeBand(life) || '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="saude-price-${operatorVisualClass(item.operator.nome)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('')}<tr class="saude-group-total"><td colspan="5">Total do Grupo ${String(groupNumber(groupId)).padStart(2, '0')}</td>${plans.map(item => { const total = totalsFor(item.tableId, groupId).total; return `<td class="saude-price-${operatorVisualClass(item.operator.nome)}">${total === null ? 'Cotação incompleta' : money(total)}</td>`; }).join('')}</tr></tbody></table></div></td></tr>` : '';
    return `<tr class="saude-group-row"><td><button type="button" aria-expanded="${expanded}" onclick="saudeQuoteToggleGroup('${esc(groupId)}')">${expanded ? '▾' : '▸'} Grupo ${String(groupNumber(groupId)).padStart(2, '0')} · ${esc(title)}<small>${members.length} vidas (${members.filter(x => x.tipo === 'titular').length} titular + ${members.filter(x => x.tipo === 'dependente').length} dependentes)</small></button></td>${values}</tr>${detail}`;
  }).join('');
  return `<section class="saude-quote-card saude-quote-result-card">${header}${quote.catalogError ? `<p class="saude-quote-empty">${esc(quote.catalogError)}</p>` : ''}<div class="saude-quote-table-wrap"><table class="saude-quote-results"><thead><tr><th class="saude-result-stub">Plano / Operadora</th>${columns || `<th>Nenhum plano corresponde aos filtros.</th>`}</tr><tr class="saude-total-row"><th>Total da Cotação<small>${quote.lives.length} vidas · ${titulares} titulares · ${dependents} dependentes</small></th>${plans.map(item => { const total = planTotal(item.tableId); const missing = quote.lives.flatMap(life => planPrice(item.tableId, life) === null ? [`${life.nome} (${lifeBand(life) || 'idade inválida'})`] : []); return `<td class="saude-price-${operatorVisualClass(item.operator.nome)} ${total === null ? 'is-incomplete' : ''}">${total === null ? `<strong>Cotação incompleta</strong><small>${esc(missing.join(', '))}</small>` : `<strong>${money(total)}</strong>`}</td>`; }).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${1 + plans.length}" class="saude-quote-empty">Adicione titulares para calcular a cotação.</td></tr>`}</tbody></table></div></section>`;
}

function renderPage() {
  if (!context.pode?.('simulador_saude', 'view')) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar Simulador - Saúde.</p></section>' });
  if (quote.loading) return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Abrindo cotação salva.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: '<section class="saude-quote-card"><div class="saude-quote-empty" role="status">Carregando cotação salva…</div></section>' });
  const content = `${renderHeader()}${renderNotice()}${renderCompany()}${renderLives()}${renderResult()}${renderLifeModal()}${renderPlanPicker()}${renderImportModal()}`;
  return context.renderShell({ tituloPagina: 'Cotação de Plano de Saúde', descricaoPagina: 'Monte e compare cotações de planos de saúde.', classeConteudo: 'simulador-saude-page saude-quote-page', conteudo: content });
}
function rerender() { const root = document.getElementById('app'); if (root) root.innerHTML = renderPage(); }
async function loadCatalog() { try { const response = await chamarApi('getSimuladorSaudeCatalog'); if (!response.ok) throw new Error(response.message); quote.catalog = response.data; quote.catalogError = ''; } catch (error) { quote.catalogError = error.message || 'Não foi possível carregar o catálogo de planos.'; } rerender(); }

function serializeSnapshot() {
  return {
    version: 1,
    cliente: { nome: quote.company, cnpj: quote.cnpj, cidade: quote.city, tipo_contratacao: quote.type, vigencia: quote.effectiveDate },
    vidas: quote.lives.map(life => ({ ...life })),
    planos: quote.plans.map(item => {
      const table = planFor(item.tableId); const plan = planInfo(table); const operator = item.operator_snapshot || operatorInfo(plan);
      return { tableId: item.tableId, selected: Boolean(item.selected), table_snapshot: { ...table }, plan_snapshot: { ...plan }, operator_snapshot: { ...operator }, prices_snapshot: { ...pricesFor(item.tableId) } };
    })
  };
}

function draftSignature() { return JSON.stringify(serializeSnapshot()); }

function resetQuoteDraft() {
  quote.id = ''; quote.code = ''; quote.version = 0; quote.company = ''; quote.cnpj = ''; quote.city = ''; quote.type = 'Empresarial (PJ)'; quote.effectiveDate = ''; quote.lives = []; quote.plans = []; quote.expandedGroups = new Set(); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.editingLifeId = ''; quote.notice = ''; quote.importText = ''; quote.importPreview = null; quote.saving = false; quote.loading = false; quote.initialized = true;
  quote.savedSignature = draftSignature();
}

function applySavedQuote(record) {
  if (!record) return;
  const snapshot = record.snapshot || {}; const client = snapshot.cliente || {};
  quote.id = record.id; quote.code = record.codigo || ''; quote.version = record.snapshot_version || 1; quote.company = client.nome ?? record.cliente_nome ?? ''; quote.cnpj = client.cnpj ?? record.cliente_cnpj ?? ''; quote.city = client.cidade ?? record.cliente_cidade ?? ''; quote.type = (client.tipo_contratacao ?? record.tipo_contratacao) === 'Familiar' ? 'Individual' : (client.tipo_contratacao ?? record.tipo_contratacao ?? 'Empresarial (PJ)'); quote.effectiveDate = client.vigencia ?? record.vigencia ?? '';
  quote.lives = Array.isArray(snapshot.vidas) ? snapshot.vidas.map(life => ({ ...life })) : [];
  quote.plans = Array.isArray(snapshot.planos) ? snapshot.planos.map(plan => ({ ...plan })) : [];
  quote.expandedGroups = new Set(); quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.editingLifeId = ''; quote.initialized = true; quote.savedSignature = draftSignature();
}

async function loadQuoteById(id) {
  const response = await chamarApi('getSimuladorSaudeQuoteById', { id });
  if (!response.ok) throw new Error(response.message || 'Não foi possível carregar a cotação.');
  if (!response.data) throw new Error('Cotação não encontrada ou sem acesso.');
  applySavedQuote(response.data);
  quote.notice = `Cotação #${response.data.codigo} carregada.`;
}

export async function mountSimuladorSaudeQuotePage(nextContext = {}) {
  context = { ...nextContext };
  resetQuoteDraft();
  const quoteId = new URLSearchParams(window.location.search).get('quoteId');
  quote.loading = Boolean(quoteId);
  rerender();
  if (quoteId) {
    try { await loadQuoteById(quoteId); }
    catch (error) { quote.notice = error.message || 'Não foi possível carregar a cotação.'; }
    finally { quote.loading = false; rerender(); }
  }
  await loadCatalog();
}

window.saudeQuoteBackToList = () => {
  if (draftSignature() !== quote.savedSignature && !window.confirm('Há alterações não salvas nesta cotação. Sair e descartá-las?')) return;
  context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/${SIMULADOR_SAUDE_ROUTE}`);
};

window.saudeQuoteField = (key, value) => { if (key === 'type' && value !== quote.type) { quote.plans = quote.plans.filter(item => item.table_snapshot?.origem === 'manual' || (quote.catalog.tables.find(table => table.id === item.tableId)?.tipo_contratacao || 'Empresarial (PJ)') === value); quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = ''; } quote[key] = value; if (key === 'effectiveDate' || key === 'type') rerender(); };
window.saudeQuoteOpenModal = mode => { quote.modal = mode; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.editingLifeId = ''; rerender(); };
window.saudeQuoteCloseModal = () => { quote.modal = ''; quote.manualPlanMode = false; quote.manualPlanEditingId = ''; quote.editingLifeId = ''; rerender(); };
window.saudeQuoteOpenImport = () => { quote.modal = 'import'; quote.importPreview = null; quote.importText = ''; rerender(); };
window.saudeQuoteValidateImport = event => { event.preventDefault(); quote.importText = new FormData(event.currentTarget).get('importText') || ''; quote.importPreview = previewLifeImport(quote.importText); rerender(); };
window.saudeQuoteRevisarImport = () => { quote.importPreview = null; rerender(); };
window.saudeQuoteCommitImport = () => { const preview = quote.importPreview; if (!preview?.validRows.length || preview.errors.length) return; const groupMap = new Map(); preview.validRows.filter(row => row.tipo === 'titular').forEach(row => groupMap.set(row.grupo, nextId())); const imported = preview.validRows.map(row => { const groupId = groupMap.get(row.grupo); return { id: nextId(), grupo_id: groupId, tipo: row.tipo, nome: row.nome.trim(), nascimento: row.nascimento, cpf: '' }; }); quote.lives.push(...imported); quote.modal = ''; quote.importPreview = null; quote.importText = ''; quote.notice = `${imported.length} vida(s) importada(s).`; rerender(); };
window.saudeQuoteSaveLife = event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); const age = ageOf(values.nascimento); if (age === null) { quote.notice = 'Confira a data de nascimento; ela deve ser válida e não futura.'; rerender(); return; } if (quote.editingLifeId) { const current = quote.lives.find(item => item.id === quote.editingLifeId); if (current.tipo === 'titular' && quote.lives.some(item => item.tipo === 'dependente' && item.grupo_id === current.id)) { values.grupo_id = current.id; } Object.assign(current, { nome: values.nome.trim(), nascimento: values.nascimento, cpf: values.cpf.trim(), grupo_id: values.grupo_id || current.grupo_id }); } else if (quote.modal === 'titular') { const id = nextId(); quote.lives.push({ id, grupo_id: id, tipo: 'titular', nome: values.nome.trim(), nascimento: values.nascimento, cpf: values.cpf.trim() }); } else { if (!values.grupo_id || !groupHead(values.grupo_id)) { quote.notice = 'Selecione um titular para vincular o dependente.'; rerender(); return; } quote.lives.push({ id: nextId(), grupo_id: values.grupo_id, tipo: 'dependente', nome: values.nome.trim(), nascimento: values.nascimento, cpf: values.cpf.trim() }); } quote.modal = ''; quote.editingLifeId = ''; quote.notice = ''; rerender(); };
window.saudeQuoteEditLife = id => { quote.editingLifeId = id; quote.modal = 'edit-life'; rerender(); };
window.saudeQuoteDeleteLife = id => { const life = quote.lives.find(item => item.id === id); if (!life) return; if (life.tipo === 'titular' && quote.lives.some(item => item.tipo === 'dependente' && item.grupo_id === id)) { quote.notice = 'Transfira ou exclua os dependentes antes de remover este titular.'; rerender(); return; } if (!window.confirm(`Excluir ${life.tipo === 'titular' ? 'titular' : 'dependente'} ${life.nome}?`)) return; quote.lives = quote.lives.filter(item => item.id !== id); if (life.tipo === 'titular') quote.expandedGroups.delete(id); rerender(); };
window.saudeQuoteAddPlan = event => { event.preventDefault(); const tableId = new FormData(event.currentTarget).get('tableId'); if (!tableId || quote.plans.some(item => item.tableId === tableId)) return; quote.plans.push({ tableId, selected: true }); quote.modal = ''; quote.manualPlanMode = false; rerender(); };
window.saudeQuoteShowManualPlan = () => { quote.manualPlanEditingId = ''; quote.manualPlanMode = true; quote.notice = ''; rerender(); };
window.saudeQuoteManualPlanBack = () => { quote.manualPlanEditingId = ''; quote.manualPlanMode = false; rerender(); };
window.saudeQuoteAddManualPlan = event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const operatorId = String(values.get('operatorId') || '');
  const operatorNeedle = operatorId === 'manual-bradesco' ? 'bradesco' : 'sulamerica';
  const operatorName = operatorId === 'manual-bradesco' ? 'Bradesco' : 'SulAmérica';
  const catalogOperator = quote.catalog.operators.find(operator => normalizeImportToken(operator.nome).includes(operatorNeedle));
  const resolvedOperatorId = catalogOperator?.id || operatorId;
  const planName = String(values.get('planName') || '').trim();
  if (!planName) return;

  const prices = {};
  let invalidPrice = false;
  BANDS.forEach((band, index) => {
    const raw = String(values.get(`price_${index}`) ?? '').trim();
    if (!raw) return;
    const price = Number(raw.replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) invalidPrice = true;
    else prices[band] = price;
  });
  if (invalidPrice) { window.alert('Confira os valores. Os preços precisam ser números iguais ou maiores que zero.'); return; }
  if (!Object.keys(prices).length) { window.alert('Informe ao menos um valor por faixa etária para adicionar o plano.'); return; }

  const editingPlan = quote.manualPlanEditingId ? quotePlanEntry(quote.manualPlanEditingId) : null;
  const manualId = editingPlan?.tableId || `manual-${nextId()}`;
  const accommodation = String(values.get('accommodation') || '');
  const coparticipation = values.get('coparticipation') === 'true';
  const table = { id: manualId, nome: 'Valores informados manualmente', status: 'vigente', vigencia_inicio: quote.effectiveDate || today(), vigencia_fim: null, origem: 'manual' };
  const plan = { id: `${manualId}-plan`, operadora_id: resolvedOperatorId, nome: planName, modalidade: quote.type, acomodacao: accommodation, coparticipacao: coparticipation, abrangencia: String(values.get('coverage') || '').trim(), origem: 'manual' };
  if (editingPlan) {
    Object.assign(editingPlan, { table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: resolvedOperatorId, nome: catalogOperator?.nome || operatorName }, prices_snapshot: prices });
  } else {
    quote.plans.push({ tableId: manualId, selected: true, table_snapshot: table, plan_snapshot: plan, operator_snapshot: { id: resolvedOperatorId, nome: catalogOperator?.nome || operatorName }, prices_snapshot: prices });
  }
  quote.operatorFilter = ''; quote.accommodationFilter = ''; quote.copayFilter = '';
  quote.modal = '';
  quote.manualPlanMode = false;
  quote.manualPlanEditingId = '';
  quote.notice = editingPlan ? `Valores manuais do plano da ${operatorName} atualizados.` : `Plano manual da ${operatorName} adicionado a esta cotação.`;
  rerender();
};
window.saudeQuoteEditManualPlan = tableId => {
  if (!quotePlanEntry(tableId)?.table_snapshot || quotePlanEntry(tableId).table_snapshot.origem !== 'manual') return;
  quote.manualPlanEditingId = tableId;
  quote.manualPlanMode = true;
  quote.modal = 'plan';
  rerender();
};
window.saudeQuoteGoCatalog = () => context.navegarParaRota?.(`${obterBaseHub(window.location.pathname)}/operacoes/corretora/simulador-saude/catalogo`);
window.saudeQuoteRemovePlan = id => { quote.plans = quote.plans.filter(item => item.tableId !== id); rerender(); };
window.saudeQuoteTogglePlan = (id, checked) => { const plan = quote.plans.find(item => item.tableId === id); if (plan) plan.selected = Boolean(checked); };
window.saudeQuoteToggleGroup = id => { quote.expandedGroups.has(id) ? quote.expandedGroups.delete(id) : quote.expandedGroups.add(id); rerender(); };
window.saudeQuoteFilter = (key, value) => { quote[key] = value; rerender(); };
window.saudeQuoteReloadCatalog = () => loadCatalog();
window.saudeQuoteClearNotice = () => { quote.notice = ''; rerender(); };

async function persistCurrentQuote(status = 'rascunho') {
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
  quote.id = response.data.id; quote.code = response.data.codigo; quote.version = response.data.snapshot_version || quote.version + 1;
  quote.savedSignature = draftSignature();
  return response.data;
}

window.saudeQuoteSave = async () => {
  if (quote.saving) return;
  quote.saving = true; quote.notice = ''; rerender();
  try { const saved = await persistCurrentQuote(); quote.notice = `Cotação #${saved.codigo} salva com sucesso.`; }
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

function proposalHtml(branding, saved) {
  const plans = quote.plans.filter(item => item.selected).map(item => ({ ...item, table: planFor(item.tableId), plan: planInfo(planFor(item.tableId)), operator: item.operator_snapshot || operatorInfo(planInfo(planFor(item.tableId))) }));
  const brokerName = branding.nome_fantasia || branding.razao_social || 'Transmares Corretora de Seguros';
  const logo = branding.logo_url || document.querySelector('.brand-logo-slot img')?.src || '';
  const address = [branding.endereco_logradouro, branding.endereco_numero, branding.endereco_complemento, branding.endereco_bairro, [branding.endereco_cidade, branding.endereco_uf].filter(Boolean).join(' - '), branding.endereco_cep].filter(Boolean).join(', ');
  const contact = [branding.telefone && `Telefone ${branding.telefone}`, branding.whatsapp && `WhatsApp ${branding.whatsapp}`, branding.email, branding.site].filter(Boolean).join(' · ');
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const selectedLives = quote.lives.filter(life => life.tipo === 'titular').length;
  const dependents = quote.lives.filter(life => life.tipo === 'dependente').length;
  const planCards = plans.map(item => {
    const brand = operatorVisualClass(item.operator.nome);
    const total = planTotal(item.tableId);
    const accommodation = item.plan.acomodacao || 'Não informada';
    const coverage = item.plan.abrangencia || 'Não informada';
    const mark = item.operator.logo_url ? `<img class="operator-logo" src="${esc(item.operator.logo_url)}" alt="Logomarca ${esc(item.operator.nome || 'operadora')}" style="max-height:24px;max-width:76px;object-fit:contain">` : `<span class="operator-mark" style="background:${esc(item.operator.cor_marca || '#174A8B')}">${esc(operatorMonogram(item.operator.nome))}</span>`;
    return `<article class="plan-card is-${brand}" style="--operator-color:${esc(item.operator.cor_marca || '#174A8B')};border-color:${esc(item.operator.cor_marca || '#174A8B')}"><header>${mark}<strong>${esc(item.operator.nome || 'Operadora')}</strong><small>${esc(coverage)}</small></header><div class="plan-card-name">${esc(item.plan.nome || 'Plano')}</div><div class="plan-price ${total === null ? 'is-incomplete' : ''}" style="color:${esc(item.operator.cor_marca || '#174A8B')}">${total === null ? 'Cotação incompleta' : money(total)}${total === null ? '' : '<small>/mês</small>'}</div><div class="plan-per-life">${total === null ? 'Valores pendentes para uma ou mais vidas' : `${money(total / quote.lives.length)} por vida`}</div><div class="plan-features"><div><span class="feature-symbol">▰</span><span>Acomodação<strong>${esc(accommodation)}</strong></span></div><div><span class="feature-symbol">◉</span><span>Coparticipação<strong>${item.plan.coparticipacao ? 'Sim' : 'Não'}</strong></span></div><div><span class="feature-symbol">◧</span><span>Abrangência<strong>${esc(coverage)}</strong></span></div></div><div class="plan-included">✓ <strong>Incluído nesta comparação</strong></div></article>`;
  }).join('');
  const comparisonRows = groupIds().map(groupId => {
    const members = livesInGroup(groupId);
    const lifeRows = members.map(life => `<tr><td class="group-cell">Grupo ${groupNumber(groupId)}</td><td>${esc(life.nome)}</td><td><span class="life-type ${life.tipo}">${life.tipo === 'titular' ? 'Titular' : 'Dependente'}</span></td><td>${lifeAge(life) ?? '—'}</td><td>${lifeBand(life) || '—'}</td>${plans.map(item => { const price = planPrice(item.tableId, life); return `<td class="price-${operatorVisualClass(item.operator.nome)} ${price === null ? 'is-incomplete' : ''}">${price === null ? 'Preço indisponível' : money(price)}</td>`; }).join('')}</tr>`).join('');
    const groupTotals = plans.map(item => { const result = totalsFor(item.tableId, groupId); return `<td class="price-${operatorVisualClass(item.operator.nome)} ${result.total === null ? 'is-incomplete' : ''}">${result.total === null ? 'Cotação incompleta' : money(result.total)}</td>`; }).join('');
    return `${lifeRows}<tr class="group-total"><td colspan="5">Total do Grupo ${groupNumber(groupId)} · ${members.length} vidas</td>${groupTotals}</tr>`;
  }).join('');
  const totalCells = plans.map(item => {
    const total = planTotal(item.tableId);
    const missing = quote.lives.filter(life => planPrice(item.tableId, life) === null).map(life => `${life.nome} (${lifeBand(life) || 'idade inválida'})`);
    return `<td class="price-${operatorVisualClass(item.operator.nome)} ${total === null ? 'is-incomplete' : ''}">${total === null ? `<strong>Cotação incompleta</strong><small>${esc(missing.join(', '))}</small>` : `<strong>${money(total)}</strong>`}</td>`;
  }).join('');
  const comparisonHeaders = plans.map(item => `<th class="brand-${operatorVisualClass(item.operator.nome)}">${esc(item.operator.nome || 'Operadora')}<small>${esc(item.plan.nome || 'Plano')}</small></th>`).join('');
  const conditions = [
    ['Modalidade', item => item.plan.modalidade || 'Não informada'],
    ['Acomodação', item => item.plan.acomodacao || 'Não informada'],
    ['Coparticipação', item => item.plan.coparticipacao ? 'Sim' : 'Não'],
    ['Abrangência', item => item.plan.abrangencia || 'Não informada'],
    ['Coparticipação por procedimento', item => {
      return proposalDetail(item, 'coparticipacao') || 'Valores não informados para este plano.';
    }],
    ['Coberturas e serviços', item => proposalDetail(item, 'coberturas') || 'Não informadas.'],
    ['Carências', item => proposalDetail(item, 'carencias') || 'Não informadas neste plano.'],
    ['Adicionais', item => proposalDetail(item, 'adicionais') || 'Não informados neste plano.'],
    ['Origem dos valores', item => item.table.origem === 'manual' ? 'Informados manualmente nesta cotação' : `${item.table.nome || 'Tabela cadastrada'}${item.table.vigencia_inicio ? ` · ${dateLabel(item.table.vigencia_inicio)}` : ' · início de vigência pendente'}`]
  ];
  const conditionRows = conditions.map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => `<td>${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const conditionSection = `<section><div class="section-heading"><h2>Principais condições dos planos</h2><p>Resumo das características cadastradas para facilitar a análise.</p></div><table class="proposal-table conditions-table"><thead><tr><th>Característica</th>${plans.map(item => `<th class="brand-${operatorVisualClass(item.operator.nome)}">${esc(item.operator.nome || 'Operadora')} – ${esc(item.plan.nome || 'Plano')}</th>`).join('')}</tr></thead><tbody>${conditionRows}</tbody></table></section>`;
  const firstPageConditions = quote.lives.length <= 5 ? conditionSection : '';
  const secondPageConditions = quote.lives.length > 5 ? conditionSection : '';
  const networkRows = [
    ['Abrangência cadastrada', item => item.plan.abrangencia || 'Não informada'],
    ['Prestadores e unidades', item => proposalDetail(item, 'rede') || 'A relação nominal não está cadastrada neste plano.'],
    ['Conferência recomendada', () => `Confirme a rede disponível para ${quote.city || 'a região do contrato'} diretamente com a operadora.`]
  ].map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => `<td>${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const copayRows = [
    ['Coparticipação prevista', item => item.plan.coparticipacao ? 'Sim' : 'Não'],
    ['Valores por procedimento', item => proposalDetail(item, 'coparticipacao') || 'Não informados neste plano.'],
    ['Carências', item => proposalDetail(item, 'carencias') || 'Não informadas neste plano.'],
    ['Adicionais por vida', item => proposalDetail(item, 'adicionais') || 'Não informados neste plano.']
  ].map(([label, getValue]) => `<tr><th>${esc(label)}</th>${plans.map(item => `<td>${esc(getValue(item))}</td>`).join('')}</tr>`).join('');
  const logoMarkup = logo ? `<img src="${esc(logo)}" alt="Logo ${esc(brokerName)}" onerror="this.style.display='none'">` : `<strong class="brand-fallback">${esc(brokerName)}</strong>`;
  const brokerLegal = [branding.razao_social && branding.nome_fantasia ? branding.razao_social : '', branding.cnpj && `CNPJ ${branding.cnpj}`, branding.susep && `SUSEP ${branding.susep}`].filter(Boolean).join(' · ');
  const header = (title, subtitle) => `<header class="proposal-header"><div class="proposal-brand">${logoMarkup}</div><div class="proposal-heading"><h1>${title}</h1><p>${subtitle}</p></div></header>`;
  const footer = page => `<footer class="proposal-footer"><div><strong>${esc(brokerName)}</strong><span>${esc([brokerLegal, contact, address].filter(Boolean).join(' · '))}</span></div><span class="page-number">${page}/2</span></footer>`;
  const currentQuoteMeta = `${saved.codigo ? `Cotação #${esc(saved.codigo)}` : 'Cotação'} · Emitida em ${currentDate}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposta de Plano de Saúde${quote.code ? ` - ${esc(quote.code)}` : ''}</title><style>
    @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{background:#f1f4f8;color:#0b1b3c;font-family:Arial,Helvetica,sans-serif;margin:0}.proposal-page{background:#fff;margin:18px auto;width:210mm;max-width:calc(100% - 32px);min-height:297mm;padding:14mm;position:relative}.proposal-header{align-items:center;border-bottom:1px solid #dce5ef;display:flex;gap:24px;justify-content:space-between;margin-bottom:14px;padding:0 0 12px}.proposal-brand{align-items:center;display:flex;flex:0 0 220px;min-height:42px}.proposal-brand img{max-height:48px;max-width:220px;object-fit:contain;object-position:left center}.brand-fallback{color:#294895;font-size:17px}.proposal-heading{text-align:right}.proposal-heading h1{font-size:20px;letter-spacing:-.3px;margin:0}.proposal-heading p{color:#536987;font-size:10px;margin:5px 0 0}.client-strip{background:linear-gradient(110deg,#f4f7fb,#f8fafc);border:1px solid #dce5ef;border-radius:7px;display:grid;grid-template-columns:1.4fr 1.2fr 1fr 1fr;margin-bottom:14px;padding:9px 12px}.client-item{align-items:center;border-right:1px solid #e0e8f1;display:flex;gap:10px;min-width:0;padding:1px 12px}.client-item:first-child{padding-left:2px}.client-item:last-child{border:0}.client-icon{color:#244875;flex:0 0 21px;font-size:19px;font-weight:bold;text-align:center}.client-item span,.client-item strong{display:block}.client-item span{color:#536987;font-size:9px;margin-bottom:3px}.client-item strong{font-size:11px}.client-item small{color:#536987;display:block;font-size:8px;margin-top:2px}.section-heading{margin:11px 0 7px}.section-heading h2{font-size:16px;letter-spacing:-.2px;margin:0}.section-heading p{color:#536987;font-size:9px;margin:3px 0 0}.plan-grid{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:11px}.plan-card{border:1px solid #dce5ef;border-radius:7px;min-width:0;overflow:hidden}.plan-card.is-sulamerica{border-color:#f27612}.plan-card>header{align-items:center;background:#f4f7fb;display:flex;gap:7px;min-height:36px;padding:6px 9px}.plan-card.is-sulamerica>header{background:#fff7ef}.plan-card.is-unimed>header{background:#f0faf4}.plan-card.is-hapvida>header{background:#f1f8ff}.plan-card.is-bradesco>header{background:#fff3f4}.operator-mark{align-items:center;background:#294895;border-radius:50%;color:#fff;display:inline-flex;flex:0 0 22px;font-size:10px;font-weight:bold;height:22px;justify-content:center}.is-sulamerica .operator-mark{background:#f27612}.is-unimed .operator-mark{background:#079447}.is-hapvida .operator-mark{background:#268ee8}.is-bradesco .operator-mark{background:#c41426}.plan-card>header strong{font-size:11px}.plan-card>header small{color:#536987;font-size:8px;margin-left:auto;text-align:right}.plan-card-name{font-size:10px;font-weight:700;padding:7px 9px 0}.plan-price{color:#294895;font-size:20px;font-weight:800;line-height:1.1;padding:4px 9px 0;text-align:center}.plan-price small{color:#536987;font-size:9px;font-weight:400;margin-left:3px}.plan-card.is-sulamerica .plan-price{color:#f27612}.plan-card.is-unimed .plan-price{color:#078a3c}.plan-card.is-hapvida .plan-price{color:#075ed2}.plan-card.is-bradesco .plan-price{color:#d20d1b}.plan-price.is-incomplete{color:#9a6200!important;font-size:12px}.plan-per-life{color:#304666;font-size:9px;margin:3px 0 7px;text-align:center}.plan-features{border-top:1px solid #e5ebf2;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:6px 3px}.plan-features>div{align-items:center;border-right:1px solid #e5ebf2;display:flex;gap:5px;min-width:0;padding:2px 5px}.plan-features>div:last-child{border:0}.feature-symbol{color:#244875;flex:0 0 14px;font-size:14px;text-align:center}.plan-features span:last-child{color:#536987;font-size:8px;line-height:1.2}.plan-features strong{color:#0b1b3c;display:block;font-size:8px;margin-top:2px}.plan-included{background:#f3f7fb;color:#294895;font-size:9px;margin:0 7px 7px;padding:6px;text-align:center}.is-sulamerica .plan-included{background:#fff3e8;color:#d85800}.is-unimed .plan-included{background:#edf8f1;color:#087b39}.is-hapvida .plan-included{background:#edf6ff;color:#075ed2}.is-bradesco .plan-included{background:#fff0f2;color:#c41426}.proposal-table{border-collapse:collapse;table-layout:fixed;width:100%}.composition-table th,.composition-table td{line-height:1.1;padding:2px 4px}.proposal-table th,.proposal-table td{border:1px solid #dce5ef;font-size:8px;overflow-wrap:anywhere;padding:5px 6px;text-align:center;vertical-align:middle}.proposal-table thead th{background:#f0f4f9;color:#0b1b3c;font-size:8px}.proposal-table th:first-child,.proposal-table td:first-child{text-align:left}.proposal-table .brand-sulamerica{background:#f27612;color:#fff}.proposal-table .brand-unimed{background:#079447;color:#fff}.proposal-table .brand-hapvida{background:#268ee8;color:#fff}.proposal-table .brand-bradesco{background:#c41426;color:#fff}.proposal-table .brand-default{background:#294895;color:#fff}.proposal-table thead small{display:block;font-size:7px;font-weight:500;margin-top:2px}.proposal-table .group-cell{font-weight:700;white-space:nowrap}.life-type{background:#dcecff;border-radius:4px;color:#0759c7;display:inline-block;padding:3px 6px}.life-type.dependente{background:#d9f7e5;color:#087b39}.price-sulamerica{color:#d85800}.price-unimed{color:#078a3c}.price-hapvida{color:#075ed2}.price-bradesco{color:#c41426}.proposal-table td.is-incomplete{color:#9a6200!important}.proposal-table .group-total td{background:#fff7e3;font-weight:700}.proposal-table .grand-total td{background:#f0f5fc;font-size:9px;font-weight:700}.proposal-table .grand-total td.price-sulamerica{background:#fff3e5;color:#d85800}.proposal-table .grand-total td.price-unimed{background:#eaf7ef;color:#078a3c}.proposal-table .grand-total td.price-hapvida{background:#edf6ff;color:#075ed2}.proposal-table .grand-total td.price-bradesco{background:#fff0f2;color:#c41426}.proposal-table .grand-total small{display:block;font-size:7px;font-weight:400;margin-top:2px}.conditions-table th:first-child{width:21%}.conditions-table td{text-align:left}.network-table th:first-child,.copay-table th:first-child{width:24%}.network-table td,.copay-table td{text-align:left}.supplemental-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr;margin-top:10px}.supplemental-card{border:1px solid #dce5ef;border-radius:6px;overflow:hidden}.supplemental-card h2{font-size:13px;margin:0;padding:8px 9px}.interpretation-list{list-style:none;margin:0;padding:0}.interpretation-list li{align-items:flex-start;border-top:1px solid #e5ebf2;display:flex;font-size:8px;gap:8px;line-height:1.4;padding:7px 9px}.interpretation-list b{align-items:center;background:#e8f2ff;border-radius:50%;color:#0759c7;display:flex;flex:0 0 18px;height:18px;justify-content:center}.important-list{list-style:none;margin:0;padding:0}.important-list li{border-top:1px solid #e5ebf2;font-size:8px;line-height:1.4;padding:7px 9px}.important-list li:before{color:#294895;content:'ⓘ';font-weight:bold;margin-right:6px}.info-note{background:#f2f7fc;border-left:3px solid #294895;color:#435977;font-size:8px;line-height:1.4;margin:8px 0;padding:7px 9px}.proposal-footer{align-items:end;border-top:1px solid #bfcfe0;color:#435977;display:flex;font-size:7px;justify-content:space-between;margin-top:10px;padding-top:6px}.proposal-footer strong,.proposal-footer span{display:block}.proposal-footer span{margin-top:2px;max-width:900px}.page-number{font-size:9px!important;margin:0!important;white-space:nowrap}.actions{background:#fff;margin:12px auto;width:210mm;max-width:calc(100% - 32px);padding:8px 14mm;text-align:right}.actions button{background:#0864c9;border:0;border-radius:5px;color:white;cursor:pointer;font-size:11px;font-weight:bold;padding:9px 14px}@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.proposal-page{break-after:page;margin:0;width:auto;max-width:none;min-height:0;padding:0}.proposal-page:last-of-type{break-after:auto}.actions{display:none}.plan-card,.supplemental-card,.info-note{break-inside:avoid}.section-heading{break-after:avoid}.proposal-table thead{display:table-header-group}.proposal-table tr{break-inside:avoid}}@media screen{.proposal-page{box-shadow:0 3px 16px #1b345014}.actions{position:sticky;bottom:0}.client-strip{grid-template-columns:1.4fr 1.2fr 1fr 1fr}}@media screen and (max-width:760px){.proposal-page{padding:18px}.proposal-header{align-items:flex-start;flex-direction:column;gap:8px}.proposal-heading{text-align:left}.proposal-brand{flex-basis:auto}.client-strip{grid-template-columns:1fr 1fr}.client-item:nth-child(2){border-right:0}.plan-grid{grid-template-columns:1fr}.supplemental-grid{grid-template-columns:1fr}}
  </style></head><body>
    <section class="proposal-page">
      ${header('Proposta de Plano de Saúde', currentQuoteMeta)}
      <section class="client-strip"><div class="client-item"><span class="client-icon">▦</span><div><span>Cliente / Empresa</span><strong>${esc(quote.company || '—')}</strong><small>${quote.cnpj ? `CNPJ ${esc(quote.cnpj)}` : ''}${quote.city ? `${quote.cnpj ? ' · ' : ''}${esc(quote.city)}` : ''}</small></div></div><div class="client-item"><span class="client-icon">♟</span><div><span>Total de vidas</span><strong>${quote.lives.length}</strong><small>${selectedLives} titular${selectedLives === 1 ? '' : 'es'} · ${dependents} dependente${dependents === 1 ? '' : 's'}</small></div></div><div class="client-item"><span class="client-icon">▤</span><div><span>Tipo de contratação</span><strong>${esc(quote.type)}</strong></div></div><div class="client-item"><span class="client-icon">▣</span><div><span>Vigência desejada</span><strong>${dateLabel(quote.effectiveDate)}</strong></div></div></section>
      <section><div class="section-heading"><h2>Planos selecionados</h2><p>Confira as opções e os valores mensais estimados para esta composição.</p></div><div class="plan-grid">${planCards}</div></section>
      <section><div class="section-heading"><h2>Composição da cotação</h2><p>Valores por grupo e por vida, para cada plano selecionado.</p></div><table class="proposal-table composition-table"><thead><tr><th>Grupo</th><th>Nome</th><th>Tipo</th><th>Idade</th><th>Faixa Etária</th>${comparisonHeaders}</tr></thead><tbody>${comparisonRows}<tr class="grand-total"><td colspan="2">Total da cotação</td><td colspan="3">${quote.lives.length} vidas</td>${totalCells}</tr></tbody></table></section>
      ${firstPageConditions}
      <div class="info-note">Valores estimados conforme as faixas etárias e a tabela cadastrada para a vigência desejada.${quote.type === 'Individual' && quote.lives.length >= 2 ? ' A tarifa para 2 ou mais vidas foi aplicada automaticamente.' : ''} Consulte a operadora sobre rede credenciada, regras comerciais, carências e disponibilidade antes da contratação.</div>
      ${footer(1)}
    </section>
    <section class="proposal-page">
      ${header('Informações complementares', 'Página 2 · Resumo de rede e coparticipação')}
      <section><div class="section-heading"><h2>Resumo de rede credenciada</h2><p>A abrangência cadastrada está resumida abaixo. A disponibilidade completa deve ser confirmada para a região e o contrato.</p></div><table class="proposal-table network-table"><thead><tr><th>Item</th>${comparisonHeaders}</tr></thead><tbody>${networkRows}</tbody></table></section>
      <section><div class="section-heading"><h2>Regras de coparticipação</h2><p>Este catálogo registra se o plano prevê coparticipação; valores por serviço dependem das condições da operadora.</p></div><table class="proposal-table copay-table"><thead><tr><th>Informação</th>${comparisonHeaders}</tr></thead><tbody>${copayRows}</tbody></table></section>
      ${secondPageConditions}
      <div class="supplemental-grid"><section class="supplemental-card"><h2>Como interpretar</h2><ol class="interpretation-list"><li><b>1</b><span>Os valores mensais são calculados a partir das idades, faixas etárias e preços cadastrados para cada plano.</span></li><li><b>2</b><span>O valor por vida corresponde ao total mensal dividido pelo número de pessoas da cotação.</span></li><li><b>3</b><span>Quando faltar preço para alguma faixa, o plano aparece como cotação incompleta.</span></li><li><b>4</b><span>Valores informados manualmente foram registrados somente nesta cotação.</span></li></ol></section><section class="supplemental-card"><h2>Observações importantes</h2><ul class="important-list"><li>Esta proposta é indicativa e não constitui oferta vinculante de contratação.</li><li>A aceitação está sujeita à análise de elegibilidade e às regras comerciais da operadora.</li><li>Rede credenciada, carências e condições podem variar conforme região e contrato.</li><li>Confirme valores e disponibilidade na data efetiva da contratação.</li></ul></section></div>
      ${footer(2)}
    </section>
    <div class="actions"><button onclick="window.print()">▣ &nbsp; Imprimir / Salvar em PDF</button></div>
    <script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>setTimeout(()=>window.print(),300))})</script>
  </body></html>`;
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
