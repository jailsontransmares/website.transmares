import './simuladorSaudeCatalogo.css';
import { chamarApi } from './api.js';

const AGE_BANDS = ['0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+'];
const state = { data: { operators: [], plans: [], tables: [], bands: [], history: [] }, loading: false, error: '', notice: '', search: '', operator: '', modality: '', accommodation: '', copay: '', status: '', page: 1, pageSize: 10, expandedId: '', draft: null, historyId: '', importPreview: null };
let context = {};

function esc(value = '') { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function money(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; }
function date(value) { return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'; }
function planFor(table) { return state.data.plans.find(plan => plan.id === table.plano_id) || {}; }
function operatorFor(plan) { return state.data.operators.find(operator => operator.id === plan.operadora_id) || {}; }
function bandsFor(tableId) { return Object.fromEntries(state.data.bands.filter(band => band.tabela_preco_id === tableId).map(band => [band.faixa_etaria, band.valor])); }
function displayStatus(table) {
  if (table.status === 'inativo') return 'Inativo';
  if (table.status === 'vigente' && table.vigencia_fim && table.vigencia_fim < new Date().toISOString().slice(0, 10)) return 'Vencido';
  return table.status === 'vigente' ? 'Vigente' : 'Em revisão';
}
function statusClass(table) { return `simsaude-status-${displayStatus(table).toLowerCase().replaceAll(' ', '-')}`; }
function renderStatus(table) { return `<span class="simsaude-status ${statusClass(table)}">${esc(displayStatus(table))}</span>`; }
function operatorClass(name = '') {
  const token = normalizeHeader(name);
  if (token.includes('sulamerica')) return 'sulamerica';
  if (token.includes('bradesco')) return 'bradesco';
  if (token.includes('hapvida')) return 'hapvida';
  if (token.includes('unimed')) return 'unimed';
  return 'default';
}
function operatorMonogram(name = '') {
  const brand = operatorClass(name);
  return ({ sulamerica: 'S', bradesco: 'B', hapvida: 'H', unimed: 'U', default: String(name).trim().slice(0, 1).toUpperCase() || 'O' })[brand];
}
function renderLoading() { return `<div class="simsaude-state" aria-busy="true"><span class="hub-loading-spinner" aria-hidden="true"></span><span>Carregando o catálogo…</span></div>`; }
function renderMessage() { return state.error ? `<div class="simsaude-message is-error" role="alert"><strong>Operação não concluída.</strong><span>${esc(state.error)}</span><button type="button" onclick="simsaudeFecharAviso()" aria-label="Fechar">×</button>${!state.data.tables.length ? '<button class="simsaude-link" type="button" onclick="simsaudeRecarregar()">Tentar novamente</button>' : ''}</div>` : state.notice ? `<div class="simsaude-message" role="status"><span>${esc(state.notice)}</span><button type="button" onclick="simsaudeFecharAviso()" aria-label="Fechar">×</button></div>` : ''; }

function selectedOptions(items, value, empty = 'Todas') { return `<option value="">${empty}</option>${items.map(item => `<option value="${esc(item.value)}" ${String(value) === String(item.value) ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}`; }
function filteredTables() {
  const search = state.search.trim().toLocaleLowerCase('pt-BR');
  return state.data.tables.filter(table => {
    const plan = planFor(table); const operator = operatorFor(plan); const bands = bandsFor(table.id);
    const haystack = [table.nome, plan.nome, plan.codigo_interno, operator.nome].join(' ').toLocaleLowerCase('pt-BR');
    const effectiveStatus = displayStatus(table);
    return (!search || haystack.includes(search))
      && (!state.operator || plan.operadora_id === state.operator)
      && (!state.modality || plan.modalidade === state.modality)
      && (!state.accommodation || plan.acomodacao === state.accommodation)
      && (!state.copay || String(plan.coparticipacao) === state.copay)
      && (!state.date || (table.vigencia_inicio <= state.date && (!table.vigencia_fim || table.vigencia_fim >= state.date)))
      && (!state.status || effectiveStatus === state.status);
  });
}

function renderTableRow(table) {
  const plan = planFor(table); const operator = operatorFor(plan); const bands = bandsFor(table.id);
  const open = state.expandedId === table.id;
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  return `<tr class="simsaude-row ${open ? 'is-expanded' : ''}">
    <td><button class="simsaude-expand" type="button" onclick="simsaudeExpandir('${esc(table.id)}')" aria-label="${open ? 'Recolher' : 'Expandir'} tabela">${open ? '−' : '+'}</button></td>
    <td><span class="simsaude-operator-cell"><span class="simsaude-operator-mark is-${operatorClass(operator.nome)}">${esc(operatorMonogram(operator.nome))}</span><strong>${esc(operator.nome || '—')}</strong></span></td><td><strong>${esc(plan.nome || '—')}</strong>${plan.codigo_interno ? `<small>${esc(plan.codigo_interno)}</small>` : ''}</td>
    <td>${esc(plan.modalidade || '—')}</td><td>${esc(plan.acomodacao || '—')}</td><td>${plan.coparticipacao ? 'Sim' : 'Não'}</td><td>${esc(plan.abrangencia || '—')}</td>
    <td>${date(table.vigencia_inicio)}${table.vigencia_fim ? ` – ${date(table.vigencia_fim)}` : ''}</td><td>${Object.keys(bands).length}/10</td><td>${renderStatus(table)}</td><td>${date(table.updated_at)}</td>
    <td>${canUpdate ? `<button class="simsaude-link" type="button" onclick="simsaudeExpandir('${esc(table.id)}')">Editar</button>` : '—'}</td>
  </tr>${open ? `<tr class="simsaude-expanded"><td colspan="12">${renderEditor(state.draft?.id === table.id ? state.draft : { ...plan, ...table, plano_id: plan.id, plano_nome: plan.nome, operadora_nome: operator.nome, precos: bands })}</td></tr>` : ''}`;
}

function field(label, name, value, type = 'text', options = {}) {
  const required = options.required ? 'required' : '';
  const wide = options.wide ? 'is-wide' : '';
  const attrs = type === 'select' ? '' : `type="${type}" ${type === 'number' ? 'step="0.01" min="0" inputmode="decimal"' : ''}`;
  const control = type === 'select'
    ? `<select name="${name}" ${required}>${options.options.map(item => `<option value="${esc(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select>`
    : `<input name="${name}" ${attrs} value="${esc(value ?? '')}" ${required} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ''}>`;
  return `<label class="simsaude-field ${wide}"><span>${esc(label)}${required ? ' *' : ''}</span>${control}</label>`;
}

function renderEditor(draft) {
  const editing = Boolean(draft.id);
  const canCreate = Boolean(context.pode?.('simulador_saude.catalogo', 'create'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  const prices = draft.precos || {};
  const statusOptions = [{ value: 'em_revisao', label: 'Em revisão' }, { value: 'vigente', label: 'Vigente' }, { value: 'inativo', label: 'Inativo' }];
  return `<form class="simsaude-editor" data-plan-id="${esc(draft.plano_id || '')}" onsubmit="simsaudeSalvar(event)">
    <input type="hidden" name="id" value="${esc(draft.id || '')}">
    <header><div><span class="hub-page-kicker">${editing ? 'Editar tabela' : 'Nova tabela'}</span><h3>${esc(draft.nome || 'Tabela de preços')}</h3><p>${editing && draft.status === 'vigente' ? 'Ao salvar, a tabela ficará em revisão para permitir a edição dos valores.' : 'Cadastre os dados e os preços das dez faixas etárias.'}</p></div><div class="simsaude-editor-actions">${canCreate ? `<button class="secondary-btn" type="button" onclick="simsaudeDuplicar('${esc(draft.id || '')}')">Duplicar</button>` : ''}${editing ? `<button class="secondary-btn" type="button" onclick="simsaudeVerHistorico('${esc(draft.id)}')">Histórico</button>${canUpdate ? `<button class="secondary-btn" type="button" onclick="simsaudeInativar('${esc(draft.id)}')">Inativar</button>` : ''}` : ''}<button class="secondary-btn" type="button" onclick="simsaudeFecharEditor()">Fechar</button>${(editing ? canUpdate : canCreate) ? `<button class="primary-btn" type="submit" ${state.loading ? 'disabled' : ''}>Salvar tabela</button>` : ''}</div></header>
    <div class="simsaude-form-grid">
      ${field('Operadora', 'operadora_nome', draft.operadora_nome, 'text', { required: true, placeholder: 'Nome da operadora' })}
      ${field('Plano', 'plano_nome', draft.plano_nome || draft.nome_plano, 'text', { required: true })}
      ${field('Modalidade', 'modalidade', draft.modalidade, 'text', { required: true, placeholder: 'Ambulatorial + Hospitalar' })}
      ${field('Acomodação', 'acomodacao', draft.acomodacao || 'Apartamento', 'select', { required: true, options: [{ value: 'Apartamento', label: 'Apartamento' }, { value: 'Enfermaria', label: 'Enfermaria' }] })}
      ${field('Coparticipação', 'coparticipacao', String(Boolean(draft.coparticipacao)), 'select', { required: true, options: [{ value: 'false', label: 'Não' }, { value: 'true', label: 'Sim' }] })}
      ${field('Abrangência', 'abrangencia', draft.abrangencia, 'text', { required: true, placeholder: 'Nacional, regional…' })}
      ${field('Código interno', 'codigo_interno', draft.codigo_interno || '', 'text')}
      ${field('Nome da tabela', 'nome', draft.nome, 'text', { required: true })}
      ${field('Início da vigência', 'vigencia_inicio', draft.vigencia_inicio, 'date', { required: true })}
      ${field('Fim da vigência', 'vigencia_fim', draft.vigencia_fim || '', 'date')}
      ${field('Status', 'status', editing && draft.status === 'vigente' ? 'em_revisao' : (draft.status || 'em_revisao'), 'select', { options: statusOptions })}
      ${field('Observações', 'observacoes', draft.observacoes || '', 'text', { wide: true })}
    </div>
    <section class="simsaude-band-editor"><div><h4>Preços por faixa etária</h4><p>Informe os valores em reais. É necessário preencher as dez faixas para ativar a tabela.</p></div><div class="simsaude-band-grid">${AGE_BANDS.map(band => field(`${band} anos`, `faixa:${band}`, prices[band] ?? '', 'number')).join('')}</div></section>
  </form>`;
}

function renderHistory() {
  if (!state.historyId) return '';
  const entries = state.data.history.filter(item => item.registro_id === state.historyId);
  const changes = item => { const before = item.dados_anteriores || {}; const after = item.dados_posteriores || {}; const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]) && !['created_at', 'updated_at', 'created_by', 'updated_by'].includes(key)); return keys.map(key => `<p class="simsaude-history-change"><strong>${esc(key.replaceAll('_', ' '))}:</strong> ${esc(before[key] == null ? '—' : typeof before[key] === 'object' ? JSON.stringify(before[key]) : before[key])} → ${esc(after[key] == null ? '—' : typeof after[key] === 'object' ? JSON.stringify(after[key]) : after[key])}</p>`).join(''); };
  return `<div class="simsaude-modal-backdrop" role="presentation" onclick="simsaudeFecharHistorico()"><section class="simsaude-history-modal" role="dialog" aria-modal="true" aria-labelledby="simsaude-history-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Auditoria</span><h3 id="simsaude-history-title">Histórico da tabela</h3></div><button class="secondary-btn" type="button" onclick="simsaudeFecharHistorico()">Fechar</button></header>${entries.length ? entries.map(item => `<article><strong>${esc(item.acao)}</strong><time>${date(item.created_at)}</time><p>Usuário: ${esc(item.usuario_id || '—')}</p>${changes(item) || '<p>Registro incluído.</p>'}</article>`).join('') : '<p>Nenhuma atualização registrada para esta tabela.</p>'}</section></div>`;
}

function renderImportPreview() {
  const preview = state.importPreview;
  if (!preview) return '';
  return `<div class="simsaude-modal-backdrop" role="presentation" onclick="simsaudeFecharImportacao()"><section class="simsaude-history-modal simsaude-import-modal" role="dialog" aria-modal="true" aria-labelledby="simsaude-import-title" onclick="event.stopPropagation()"><header><div><span class="hub-page-kicker">Importação CSV</span><h3 id="simsaude-import-title">Revisar arquivo</h3><p>${esc(preview.fileName)} · ${preview.validRows.length} linha(s) válida(s) · ${preview.errors.length} com erro</p></div><button class="secondary-btn" type="button" onclick="simsaudeFecharImportacao()">Cancelar</button></header>${preview.errors.length ? `<div class="simsaude-import-errors"><strong>Linhas não válidas</strong>${preview.errors.slice(0, 20).map(item => `<p>Linha ${item.line}: ${esc(item.message)}</p>`).join('')}${preview.errors.length > 20 ? `<p>… e mais ${preview.errors.length - 20} linha(s).</p>` : ''}</div>` : ''}<div class="simsaude-table-wrap"><table><thead><tr><th>Linha</th><th>Operadora</th><th>Plano</th><th>Tabela</th><th>Vigência</th><th>Faixas preenchidas</th></tr></thead><tbody>${preview.validRows.slice(0, 12).map(row => `<tr><td>${row.line}</td><td>${esc(row.operadora_nome)}</td><td>${esc(row.plano_nome)}</td><td>${esc(row.nome)}</td><td>${date(row.vigencia_inicio)}</td><td>${Object.values(row.precos).filter(value => value !== '').length}/10</td></tr>`).join('') || '<tr><td colspan="6">Nenhuma linha válida para importar.</td></tr>'}</tbody></table></div><footer><button class="primary-btn" type="button" onclick="simsaudeImportarConfirmado()" ${!preview.validRows.length || state.loading ? 'disabled' : ''}>Importar ${preview.validRows.length} linha(s) válida(s)</button></footer></section></div>`;
}

function normalizeHeader(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9+]+/g, ''); }
function splitCsvLine(line, delimiter) {
  const cells = []; let cell = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell); return cells;
}
function parseDateInput(value) {
  const text = String(value || '').trim();
  let iso = text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!match) return '';
    iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? iso : '';
}
function parseMoneyInput(value) {
  const text = String(value || '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!text) return '';
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function csvRowsToPreview(text, fileName) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa conter cabeçalho e ao menos uma linha de dados.');
  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const indexOf = (...names) => headers.findIndex(header => names.map(normalizeHeader).includes(header));
  const col = {
    operator: indexOf('operadora'), plan: indexOf('plano'), modality: indexOf('modalidade'), accommodation: indexOf('acomodacao'), copay: indexOf('coparticipacao', 'copart'), scope: indexOf('abrangencia'), name: indexOf('tabela', 'nometabela'), start: indexOf('vigenciainicio', 'vigencia'), end: indexOf('vigenciafim'), code: indexOf('codigointerno', 'codigo'), observations: indexOf('observacoes')
  };
  const bandCols = Object.fromEntries(AGE_BANDS.map(band => [band, indexOf(band)]));
  const validRows = []; const errors = [];
  lines.slice(1).forEach((line, rowIndex) => {
    const values = splitCsvLine(line, delimiter).map(value => value.trim()); const lineNumber = rowIndex + 2;
    const get = key => col[key] >= 0 ? values[col[key]] || '' : '';
    const operadora_nome = get('operator'); const plano_nome = get('plan'); const modalidade = get('modality'); const acomodacao = get('accommodation'); const abrangencia = get('scope'); const vigencia_inicio = parseDateInput(get('start'));
    const issues = [];
    if (!operadora_nome) issues.push('operadora ausente');
    if (!plano_nome) issues.push('plano ausente');
    if (!modalidade) issues.push('modalidade ausente');
    if (!['Apartamento', 'Enfermaria'].includes(acomodacao)) issues.push('acomodação deve ser Apartamento ou Enfermaria');
    if (!abrangencia) issues.push('abrangência ausente');
    if (!vigencia_inicio) issues.push('vigência inicial inválida ou ausente');
    const precos = {};
    AGE_BANDS.forEach(band => { const raw = bandCols[band] >= 0 ? values[bandCols[band]] : ''; const parsed = parseMoneyInput(raw); precos[band] = parsed === null ? '' : parsed; if (raw && parsed === null) issues.push(`valor inválido na faixa ${band}`); });
    if (issues.length) { errors.push({ line: lineNumber, message: issues.join('; ') }); return; }
    const rawEndDate = get('end'); const vigencia_fim = parseDateInput(rawEndDate);
    if (rawEndDate && !vigencia_fim) issues.push('vigência final inválida');
    if (vigencia_fim && vigencia_fim < vigencia_inicio) issues.push('fim da vigência anterior ao início');
    if (issues.length) { errors.push({ line: lineNumber, message: issues.join('; ') }); return; }
    const copayValue = normalizeHeader(get('copay'));
    validRows.push({ line: lineNumber, operadora_nome, plano_nome, modalidade, acomodacao, coparticipacao: ['sim', 'true', '1', 'yes'].includes(copayValue), abrangencia, nome: get('name') || `${plano_nome} · ${vigencia_inicio}`, vigencia_inicio, vigencia_fim, codigo_interno: get('code'), observacoes: get('observations'), status: 'em_revisao', precos });
  });
  return { fileName, validRows, errors };
}

function renderPage() {
  if (!context.pode?.('simulador_saude.catalogo', 'view')) return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar catálogo.</p></section>' });
  if (state.loading && !state.data.tables.length && !state.error) return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Gerencie os planos, tabelas e preços utilizados nas cotações.', classeConteudo: 'simulador-saude-page', conteudo: renderLoading() });
  const rows = filteredTables(); const start = (state.page - 1) * state.pageSize; const pageRows = rows.slice(start, start + state.pageSize);
  const operators = state.data.operators;
  const modalities = [...new Set(state.data.plans.map(item => item.modalidade).filter(Boolean))].sort();
  const current = state.data.tables.filter(item => displayStatus(item) === 'Vigente').length;
  const soon = state.data.tables.filter(item => item.status === 'vigente' && item.vigencia_fim && item.vigencia_fim >= new Date().toISOString().slice(0, 10) && item.vigencia_fim <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length;
  const recent = state.data.history.slice(0, 5);
  const canCreate = Boolean(context.pode?.('simulador_saude.catalogo', 'create'));
  const title = `<div class="simsaude-page-head"><div class="simsaude-page-title"><span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>Catálogo de Planos e Preços</h2><p>Gerencie os planos, tabelas de preços e condições utilizadas nas cotações.</p></div></div><div class="simsaude-page-actions">${canCreate ? '<button class="primary-btn" type="button" onclick="simsaudeNovaTabela()"><i data-lucide="plus" aria-hidden="true"></i> Nova Tabela</button><button class="secondary-btn" type="button" onclick="document.getElementById(\'simsaude-csv-file\').click()"><i data-lucide="upload-cloud" aria-hidden="true"></i> Importar</button><input id="simsaude-csv-file" class="simsaude-file-input" type="file" accept=".csv,text/csv" onchange="simsaudeSelecionarArquivo(event)">' : ''}<button class="secondary-btn" type="button" onclick="simsaudeExportar()"><i data-lucide="download" aria-hidden="true"></i> Exportar</button></div></div>`;
  const filters = `<form class="simsaude-filters" onsubmit="simsaudeFiltrar(event)"><label class="simsaude-search-field"><span>Busca</span><span class="simsaude-search-control"><i data-lucide="search" aria-hidden="true"></i><input name="search" value="${esc(state.search)}" placeholder="Nome do plano, operadora..."></span></label><label><span>Operadora</span><select name="operator">${selectedOptions(operators.map(x => ({ value: x.id, label: x.nome })), state.operator)}</select></label><label><span>Modalidade</span><select name="modality">${selectedOptions(modalities.map(x => ({ value: x, label: x })), state.modality)}</select></label><label><span>Acomodação</span><select name="accommodation">${selectedOptions(['Apartamento', 'Enfermaria'].map(x => ({ value: x, label: x })), state.accommodation)}</select></label><label><span>Coparticipação</span><select name="copay">${selectedOptions([{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }], state.copay)}</select></label><label><span>Vigência</span><span class="simsaude-date-control"><input type="date" name="date" value="${esc(state.date || '')}"></span></label><label><span>Status</span><select name="status">${selectedOptions(['Vigente', 'Em revisão', 'Inativo', 'Vencido'].map(x => ({ value: x, label: x })), state.status)}</select></label><button class="secondary-btn" type="submit"><i data-lucide="filter" aria-hidden="true"></i> Aplicar</button><button class="simsaude-link" type="button" onclick="simsaudeLimparFiltros()"><i data-lucide="rotate-ccw" aria-hidden="true"></i> Limpar filtros</button></form>`;
  const table = `<section class="simsaude-card simsaude-table-card"><header><h3><i data-lucide="list" aria-hidden="true"></i> Planos e Tabelas de Preços <span class="simsaude-count-pill">${rows.length} registro${rows.length === 1 ? '' : 's'}</span></h3></header><div class="simsaude-table-wrap"><table><thead><tr><th></th><th>Operadora</th><th>Plano</th><th>Modalidade</th><th>Acomodação</th><th>Copart.</th><th>Abrangência</th><th>Vigência</th><th>Faixas</th><th>Status</th><th>Atualizado em</th><th>Ações</th></tr></thead><tbody>${pageRows.length ? pageRows.map(renderTableRow).join('') : `<tr><td colspan="12" class="simsaude-empty">${state.data.tables.length ? 'Nenhum registro corresponde aos filtros selecionados.' : 'Nenhum plano/tabela cadastrado.'}</td></tr>`}</tbody></table></div><footer class="simsaude-pagination"><span>Exibindo ${rows.length ? start + 1 : 0}–${Math.min(start + state.pageSize, rows.length)} de ${rows.length} registros</span><label><span>Por página</span><select onchange="simsaudeMudarPagina(this.value)">${[10, 25, 50, 100].map(size => `<option value="${size}" ${state.pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label><button type="button" onclick="simsaudePagina(-1)" aria-label="Página anterior" ${state.page <= 1 ? 'disabled' : ''}>‹</button><span class="simsaude-current-page">${state.page}</span><button type="button" onclick="simsaudePagina(1)" aria-label="Próxima página" ${start + state.pageSize >= rows.length ? 'disabled' : ''}>›</button></footer></section>`;
  const sidebar = `<aside class="simsaude-sidebar"><section class="simsaude-card"><h3><i data-lucide="clipboard-list" aria-hidden="true"></i> Resumo do Catálogo</h3><div class="simsaude-summary"><article class="is-blue"><i data-lucide="landmark" aria-hidden="true"></i><div><strong>${operators.filter(x => x.status === 'ativo').length}</strong><span>Operadoras</span></div></article><article class="is-green"><i data-lucide="file" aria-hidden="true"></i><div><strong>${state.data.plans.filter(x => x.status === 'ativo').length}</strong><span>Planos ativos</span></div></article><article class="is-violet"><i data-lucide="list-checks" aria-hidden="true"></i><div><strong>${current}</strong><span>Tabelas vigentes</span></div></article><article class="is-amber"><i data-lucide="clock-3" aria-hidden="true"></i><div><strong>${soon}</strong><span>Próximas a vencer<br>(até 30 dias)</span></div></article></div></section><section class="simsaude-card"><h3><i data-lucide="refresh-cw" aria-hidden="true"></i> Últimas atualizações</h3>${recent.length ? recent.map(item => `<article class="simsaude-activity"><span class="simsaude-activity-mark is-${operatorClass(item.entidade)}"><i data-lucide="file-text" aria-hidden="true"></i></span><div><strong>${esc(item.acao)} · ${esc(item.entidade.replace('simulador_saude_', ''))}</strong><small>${date(item.created_at)}</small></div></article>`).join('') : '<p class="simsaude-muted">As alterações aparecerão aqui.</p>'}</section><section class="simsaude-card"><h3><i data-lucide="list-ordered" aria-hidden="true"></i> Faixas etárias padrão</h3><ol class="simsaude-band-reference">${AGE_BANDS.map((band, index) => `<li><span>${index + 1}</span><strong>${esc(band)}</strong>${band === '59+' ? '59 anos ou mais' : `${band.replace('-', ' a ')} anos`}</li>`).join('')}</ol></section></aside>`;
  const content = `${title}${renderMessage()}${filters}${state.draft ? `<section class="simsaude-card">${renderEditor(state.draft)}</section>` : ''}<div class="simsaude-layout">${table}${sidebar}</div>${renderHistory()}${renderImportPreview()}`;
  return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Gerencie os planos, tabelas de preços e condições utilizadas nas cotações.', classeConteudo: 'simulador-saude-page', conteudo: content });
}

function rerender() { const root = document.getElementById('app'); if (root) root.innerHTML = renderPage(); }
async function loadCatalog() { state.loading = true; state.error = ''; rerender(); try { const response = await chamarApi('getSimuladorSaudeCatalog'); if (!response.ok) throw new Error(response.message); state.data = response.data; } catch (error) { state.error = error.message || 'Não foi possível carregar o catálogo.'; } finally { state.loading = false; rerender(); } }
function draftFromForm(form) { const values = Object.fromEntries(new FormData(form).entries()); const prices = {}; AGE_BANDS.forEach(band => { prices[band] = values[`faixa:${band}`] === '' ? '' : values[`faixa:${band}`]; delete values[`faixa:${band}`]; }); values.coparticipacao = values.coparticipacao === 'true'; values.precos = prices; values.plano_id = form.dataset.planId || ''; return values; }

export async function mountSimuladorSaudeCatalogPage(nextContext = {}) { context = { ...nextContext }; state.error = ''; state.notice = ''; rerender(); await loadCatalog(); }

window.simsaudeNovaTabela = () => { state.expandedId = ''; state.draft = { status: 'em_revisao', acomodacao: 'Apartamento', coparticipacao: false, precos: {} }; rerender(); };
window.simsaudeFecharEditor = () => { state.draft = null; state.expandedId = ''; rerender(); };
window.simsaudeExpandir = id => { state.draft = null; state.expandedId = state.expandedId === id ? '' : id; rerender(); };
window.simsaudeDuplicar = id => { const table = state.data.tables.find(item => item.id === id) || state.draft || {}; const plan = planFor(table); const operator = operatorFor(plan); state.expandedId = ''; state.draft = { ...table, id: '', nome: `${table.nome || 'Tabela de preços'} (cópia)`, status: 'em_revisao', vigencia_inicio: new Date().toISOString().slice(0, 10), vigencia_fim: '', plano_id: '', operadora_nome: operator.nome || table.operadora_nome, plano_nome: plan.nome || table.plano_nome, modalidade: plan.modalidade || table.modalidade, acomodacao: plan.acomodacao || table.acomodacao || 'Apartamento', coparticipacao: plan.coparticipacao ?? table.coparticipacao ?? false, abrangencia: plan.abrangencia || table.abrangencia, codigo_interno: plan.codigo_interno || table.codigo_interno, precos: table.precos || bandsFor(table.id) }; rerender(); };
window.simsaudeSalvar = async event => { event.preventDefault(); const form = event.currentTarget; if (state.loading) return; const draft = draftFromForm(form); const current = state.data.tables.find(item => item.id === draft.id); const previousPrices = draft.id ? bandsFor(draft.id) : {}; let validationMessage = ''; if (draft.status === 'vigente' && AGE_BANDS.some(band => draft.precos[band] === '' || draft.precos[band] == null)) validationMessage = 'Preencha as dez faixas etárias antes de ativar a tabela.'; if (!validationMessage && AGE_BANDS.some(band => draft.precos[band] === '' && previousPrices[band] != null)) validationMessage = 'Uma faixa com preço salvo não pode ser apagada. Informe 0,00 para alterar o valor.'; if (validationMessage) { state.error = validationMessage; state.draft = draft; state.expandedId = draft.id || ''; rerender(); return; } if (draft.status === 'vigente') { const norm = value => String(value || '').trim().toLocaleLowerCase('pt-BR'); const matchingPlan = state.data.plans.find(plan => norm(plan.nome) === norm(draft.plano_nome) && norm(plan.modalidade) === norm(draft.modalidade) && plan.acomodacao === draft.acomodacao && Boolean(plan.coparticipacao) === draft.coparticipacao && norm(plan.abrangencia) === norm(draft.abrangencia) && state.data.operators.some(operator => operator.id === plan.operadora_id && norm(operator.nome) === norm(draft.operadora_nome))); const overlap = matchingPlan && state.data.tables.some(table => table.id !== draft.id && table.plano_id === matchingPlan.id && table.status === 'vigente' && table.vigencia_inicio <= (draft.vigencia_fim || '9999-12-31') && (table.vigencia_fim || '9999-12-31') >= draft.vigencia_inicio); if (overlap && !window.confirm('Já existe uma tabela vigente para este plano em período sobreposto. Deseja continuar mesmo assim?')) return; } if (draft.id && current?.status === 'vigente') draft.status = 'em_revisao'; state.draft = draft; state.expandedId = draft.id || ''; state.loading = true; state.error = ''; state.notice = ''; rerender(); try { const response = await chamarApi('saveSimuladorSaudeTable', draft); if (!response.ok) throw new Error(response.message); state.notice = draft.status === 'vigente' ? 'Tabela salva e validada como vigente.' : 'Tabela salva em revisão.'; state.draft = null; state.expandedId = ''; await loadCatalog(); } catch (error) { state.error = error.message; state.draft = draft; } finally { state.loading = false; rerender(); } };
window.simsaudeInativar = async id => { if (!window.confirm('Inativar esta tabela? Ela deixará de ser usada em novas cotações.')) return; const response = await chamarApi('setSimuladorSaudeTableStatus', { id, status: 'inativo' }); if (!response.ok) { state.error = response.message; rerender(); return; } state.notice = 'Tabela inativada.'; state.expandedId = ''; state.draft = null; await loadCatalog(); };
window.simsaudeVerHistorico = id => { state.historyId = id; rerender(); };
window.simsaudeFecharHistorico = () => { state.historyId = ''; rerender(); };
window.simsaudeFecharImportacao = () => { if (state.loading) return; state.importPreview = null; rerender(); };
window.simsaudeSelecionarArquivo = async event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return; state.error = ''; try { state.importPreview = csvRowsToPreview(await file.text(), file.name); } catch (error) { state.error = error.message || 'Não foi possível ler o CSV.'; } rerender(); };
window.simsaudeImportarConfirmado = async () => { const preview = state.importPreview; if (!preview?.validRows.length || state.loading) return; state.loading = true; state.error = ''; rerender(); const failed = []; let imported = 0; try { for (const row of preview.validRows) { const response = await chamarApi('saveSimuladorSaudeTable', row); if (response.ok) imported += 1; else failed.push(`linha ${row.line}: ${response.message}`); } } finally { state.loading = false; state.importPreview = null; } state.notice = `${imported} tabela(s) importada(s).${failed.length ? ` ${failed.length} falha(s): ${failed.join(' · ')}` : ''}`; await loadCatalog(); };
window.simsaudeFecharAviso = () => { state.error = ''; state.notice = ''; rerender(); };
window.simsaudeRecarregar = () => loadCatalog();
window.simsaudeFiltrar = event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); Object.assign(state, { search: values.search || '', operator: values.operator || '', modality: values.modality || '', accommodation: values.accommodation || '', copay: values.copay || '', date: values.date || '', status: values.status || '', page: 1 }); rerender(); };
window.simsaudeLimparFiltros = () => { Object.assign(state, { search: '', operator: '', modality: '', accommodation: '', copay: '', date: '', status: '', page: 1 }); rerender(); };
window.simsaudeMudarPagina = value => { state.pageSize = Number(value) || 10; state.page = 1; rerender(); };
window.simsaudePagina = delta => { const pages = Math.max(1, Math.ceil(filteredTables().length / state.pageSize)); state.page = Math.min(pages, Math.max(1, state.page + delta)); rerender(); };
window.simsaudeExportar = () => { const records = filteredTables(); const header = ['Operadora', 'Plano', 'Modalidade', 'Acomodacao', 'Coparticipacao', 'Abrangencia', 'Tabela', 'Vigencia inicio', 'Vigencia fim', 'Status', ...AGE_BANDS, 'Atualizado em']; const csv = [header, ...records.map(table => { const plan = planFor(table); const operator = operatorFor(plan); const prices = bandsFor(table.id); return [operator.nome, plan.nome, plan.modalidade, plan.acomodacao, plan.coparticipacao ? 'Sim' : 'Não', plan.abrangencia, table.nome, table.vigencia_inicio, table.vigencia_fim || '', displayStatus(table), ...AGE_BANDS.map(band => prices[band] ?? ''), table.updated_at]; })].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n'); const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'catalogo-planos-saude.csv'; anchor.click(); URL.revokeObjectURL(url); };
