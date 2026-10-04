import './simuladorSaudeCatalogo.css';
import { chamarApi } from './api.js';
import { exigirSupabaseConfigurado } from './supabaseClient.js';
import { COPARTICIPACAO_TABLE_FORMAT, COPARTICIPACAO_TABLE_VERSION, createCoparticipacaoColumn, createCoparticipacaoRow, normalizeCoparticipacaoTable } from './simuladorSaudeCoparticipacao.js';
import { obterBaseHub } from './routeConfig.js';
import { SIMULADOR_SAUDE_CATALOGO_ROUTE } from './simuladorSaudeRoutes.js';

const AGE_BANDS = ['0-18', '19-23', '24-28', '29-33', '34-38', '39-43', '44-48', '49-53', '54-58', '59+'];
const ACCOMMODATIONS = ['Apartamento', 'Enfermaria', 'Ambulatorial'];
const state = { data: { operators: [], plans: [], tables: [], bands: [], accommodationBands: [], history: [] }, loading: false, error: '', notice: '', search: '', operator: '', modality: '', accommodation: '', copay: '', date: '', status: '', filterModalOpen: false, editorRoute: null, editorDirty: false, page: 1, pageSize: 10, draft: null, operatorDraft: null, selectedOperatorId: '', planDraft: null, view: 'operators', historyId: '', importPreview: null, selectedPlanIds: [], selectedTableIds: [] };
let context = {};

function catalogRootPath() { return `${obterBaseHub(window.location.pathname)}/${SIMULADOR_SAUDE_CATALOGO_ROUTE}`; }
function catalogEditorRoute(pathname = window.location.pathname) {
  const routePath = `/${SIMULADOR_SAUDE_CATALOGO_ROUTE}`;
  const path = String(pathname || '').replace(/\/+$/g, '');
  const routeIndex = path.lastIndexOf(routePath);
  if (routeIndex < 0) return null;
  const suffix = path.slice(routeIndex + routePath.length);
  if (!suffix) return null;
  if (suffix === '/nova') return 'nova';
  const editMatch = suffix.match(/^\/([^/]+)\/editar$/);
  if (!editMatch) return 'inválida';
  try { return decodeURIComponent(editMatch[1]); } catch { return 'inválida'; }
}

window.simsaudeCatalogoConfirmarSaida = nextPath => {
  const destinationEditor = catalogEditorRoute(new URL(nextPath || window.location.href, window.location.origin).pathname);
  if (!state.editorDirty || !state.editorRoute || destinationEditor === state.editorRoute) return true;
  const confirmed = window.confirm('Há alterações não salvas nesta tabela. Deseja sair e descartá-las?');
  if (confirmed) state.editorDirty = false;
  return confirmed;
};
window.simsaudeCatalogoTratarPopstate = () => {
  if (!state.editorDirty || !state.editorRoute || catalogEditorRoute() === state.editorRoute) return true;
  if (window.confirm('Há alterações não salvas nesta tabela. Deseja sair e descartá-las?')) {
    state.editorDirty = false;
    return true;
  }
  window.history.forward();
  return false;
};
document.addEventListener('input', event => {
  if (event.target?.closest?.('.simsaude-editor') && state.editorRoute) state.editorDirty = true;
});
document.addEventListener('change', event => {
  if (event.target?.closest?.('.simsaude-editor') && state.editorRoute) state.editorDirty = true;
});
window.addEventListener('beforeunload', event => {
  if (!state.editorDirty || !state.editorRoute) return;
  event.preventDefault();
  event.returnValue = '';
});

function esc(value = '') { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function money(value) { const number = Number(value); return Number.isFinite(number) ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; }
function date(value) { return value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—'; }
function planFor(table) { return state.data.plans.find(plan => plan.id === table.plano_id) || {}; }
function operatorFor(plan) { return state.data.operators.find(operator => operator.id === plan.operadora_id) || {}; }
function accommodationsFor(table) {
  const accommodations = Array.isArray(table?.acomodacoes) ? table.acomodacoes.filter(item => ACCOMMODATIONS.includes(item)) : [];
  const primary = ACCOMMODATIONS.includes(table?.acomodacao) ? table.acomodacao : 'Apartamento';
  return [...new Set([primary, ...accommodations])];
}
function bandsFor(tableId, accommodation = '') {
  const table = state.data.tables.find(item => item.id === tableId) || {};
  const selectedAccommodation = accommodation || table.acomodacao || 'Apartamento';
  const rows = selectedAccommodation === table.acomodacao
    ? state.data.bands.filter(band => band.tabela_preco_id === tableId)
    : (state.data.accommodationBands || []).filter(band => band.tabela_preco_id === tableId && band.acomodacao === selectedAccommodation);
  if (table.tipo_contratacao === 'Individual') {
    return Object.fromEntries(['uma_vida', 'duas_ou_mais'].map(rule => [rule, Object.fromEntries(rows.filter(row => row.regra_vidas === rule).map(row => [row.faixa_etaria, row.valor]))]));
  }
  return { geral: Object.fromEntries(rows.map(row => [row.faixa_etaria, row.valor])) };
}
function bandsByAccommodationFor(table) {
  return Object.fromEntries(accommodationsFor(table).map(accommodation => [accommodation, bandsFor(table.id, accommodation)]));
}
function displayStatus(table) {
  if (table.status === 'inativo') return 'Inativo';
  if (table.status === 'vigente' && table.vigencia_fim && table.vigencia_fim < new Date().toISOString().slice(0, 10)) return 'Vencido';
  return table.status === 'vigente' ? 'Vigente' : 'Em revisão';
}
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
function operatorMark(operator = {}, compact = false) {
  const style = `--operator-color:${esc(operator.cor_marca || '#174A8B')}`;
  return operator.logo_url
    ? `<img class="simsaude-operator-logo ${compact ? 'is-compact' : ''}" src="${esc(operator.logo_url)}" alt="Logomarca ${esc(operator.nome || 'operadora')}" style="${style}">`
    : `<span class="simsaude-operator-mark ${compact ? 'is-compact' : ''}" style="${style}">${esc(operatorMonogram(operator.nome))}</span>`;
}
function renderLoading() { return `<div class="simsaude-state" aria-busy="true"><span class="hub-loading-spinner" aria-hidden="true"></span><span>Carregando o catálogo…</span></div>`; }
function renderMessage() { return state.error ? `<div class="simsaude-message is-error" role="alert"><strong>Operação não concluída.</strong><span>${esc(state.error)}</span><button type="button" onclick="simsaudeFecharAviso()" aria-label="Fechar">×</button>${!state.data.tables.length ? '<button class="simsaude-link" type="button" onclick="simsaudeRecarregar()">Tentar novamente</button>' : ''}</div>` : state.notice ? `<div class="simsaude-message" role="status"><span>${esc(state.notice)}</span><button type="button" onclick="simsaudeFecharAviso()" aria-label="Fechar">×</button></div>` : ''; }

function selectedOptions(items, value, empty = 'Todas') { return `<option value="">${empty}</option>${items.map(item => `<option value="${esc(item.value)}" ${String(value) === String(item.value) ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}`; }
function filteredTables() {
  const search = state.search.trim().toLocaleLowerCase('pt-BR');
  return state.data.tables.filter(table => {
    const plan = planFor(table); const operator = operatorFor(plan); const bands = bandsFor(table.id);
    const haystack = [table.nome, table.codigo_interno, plan.nome, operator.nome].join(' ').toLocaleLowerCase('pt-BR');
    const effectiveStatus = displayStatus(table);
    return (!search || haystack.includes(search))
      && (!state.operator || plan.operadora_id === state.operator)
      && (!state.modality || plan.modalidade === state.modality)
      && (!state.accommodation || accommodationsFor(table).includes(state.accommodation))
      && (!state.copay || String(table.coparticipacao) === state.copay)
      && (!state.date || (table.vigencia_inicio <= state.date && (!table.vigencia_fim || table.vigencia_fim >= state.date)))
      && (!state.status || effectiveStatus === state.status);
  });
}

function renderTableRow(table) {
  const plan = planFor(table); const operator = operatorFor(plan); const bands = bandsFor(table.id, table.acomodacao); const accommodations = accommodationsFor(table);
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  const canDelete = Boolean(context.pode?.('simulador_saude.catalogo', 'delete'));
  const canOpen = canUpdate || canDelete;
  return `<tr class="simsaude-row">
    <td>${canUpdate || canDelete ? `<input class="simsaude-select-row" type="checkbox" aria-label="Selecionar tabela ${esc(table.nome)}" onchange="simsaudeSelecionarTabela('${esc(table.id)}',this.checked)" ${state.selectedTableIds.includes(table.id) ? 'checked' : ''} ${state.loading ? 'disabled' : ''}>` : ''}</td>
    <td><span class="simsaude-operator-cell">${operatorMark(operator, true)}<strong>${esc(operator.nome || '—')}</strong></span></td><td><strong>${esc(plan.nome || '—')}</strong>${table.codigo_interno ? `<small>Código: ${esc(table.codigo_interno)}</small>` : ''}</td>
    <td>${canOpen ? `<button class="simsaude-table-name-link" type="button" onclick="simsaudeEditarTabela('${esc(table.id)}')" aria-label="Abrir tabela ${esc(table.nome || 'sem nome')}" ${state.loading ? 'disabled' : ''}>${esc(table.nome || 'Tabela sem nome')}</button>` : `<strong>${esc(table.nome || 'Tabela sem nome')}</strong>`}</td>
    <td>${esc(plan.modalidade || '—')}<small>${esc(table.tipo_contratacao || 'Empresarial (PJ)')}</small></td><td>${accommodations.map(esc).join(' · ')}</td><td>${table.coparticipacao ? 'Sim' : 'Não'}</td><td>${esc(plan.abrangencia || '—')}</td>
    <td>${Object.keys(bands.geral || bands.uma_vida || {}).length}/10${table.tipo_contratacao === 'Individual' && Object.keys(bands.duas_ou_mais || {}).length ? ' · 2 tarifas' : ''}</td><td>${date(table.updated_at)}</td>
  </tr>`;
}

function field(label, name, value, type = 'text', options = {}) {
  const required = options.required ? 'required' : '';
  const wide = options.wide ? 'is-wide' : '';
  const ariaLabel = options.ariaLabel ? `aria-label="${esc(options.ariaLabel)}"` : '';
  const attrs = type === 'select' ? '' : `type="${type === 'number' ? 'text' : type}" ${type === 'number' ? 'inputmode="decimal" autocomplete="off" class="simsaude-decimal-input"' : ''}`;
  const control = type === 'select'
    ? `<select name="${name}" ${required}>${options.options.map(item => `<option value="${esc(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}</select>`
    : `<input name="${name}" ${attrs} ${ariaLabel} value="${esc(value ?? '')}" ${required} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ''}>`;
  return `<label class="simsaude-field ${wide}"><span>${esc(label)}${required ? ' *' : ''}</span>${control}</label>`;
}

function textareaField(label, name, value, placeholder = '') {
  return `<label class="simsaude-field is-wide"><span>${esc(label)}</span><textarea name="${esc(name)}" rows="4" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea></label>`;
}

function renderCoparticipacaoEditor(value) {
  const table = normalizeCoparticipacaoTable(value);
  const rows = table.linhas.length ? table.linhas : [createCoparticipacaoRow(table.colunas)];
  const disabled = state.loading ? 'disabled' : '';
  return `<section class="simsaude-copart-editor" aria-label="Coparticipação por procedimento">
    <div class="simsaude-copart-heading"><div><strong>Coparticipação por procedimento</strong><p>Edite os cabeçalhos e valores. Cada linha representa um procedimento.</p></div><button class="secondary-btn" type="button" onclick="simsaudeCopartAdicionarColuna(this)" ${disabled}>+ Adicionar coluna</button></div>
    ${table.legadoConvertido ? '<p class="simsaude-copart-legacy" role="status">O texto antigo foi preservado na primeira coluna. Revise e organize os valores antes de salvar a tabela.</p>' : ''}
    <div class="simsaude-copart-table-wrap"><table class="simsaude-copart-table" style="min-width:${Math.max(700, table.colunas.length * 210 + 90)}px"><thead><tr>${table.colunas.map((column, index) => `<th scope="col"><div class="simsaude-copart-column-head"><input type="text" data-copart-column-label="${esc(column.id)}" aria-label="Cabeçalho da coluna ${index + 1}" value="${esc(column.label)}" maxlength="80" required ${disabled}><button class="simsaude-copart-remove" type="button" data-column-id="${esc(column.id)}" aria-label="Remover coluna ${esc(column.label || index + 1)}" onclick="simsaudeCopartRemoverColuna(this)" ${table.colunas.length <= 1 || state.loading ? 'disabled' : ''}>×</button></div></th>`).join('')}<th class="simsaude-copart-actions-head" scope="col">Ações</th></tr></thead><tbody>${rows.map(row => `<tr data-copart-row="${esc(row.id)}">${table.colunas.map((column, index) => `<td><input type="text" data-copart-cell="${esc(column.id)}" aria-label="${esc(column.label || `Coluna ${index + 1}`)}" value="${esc(row.celulas[column.id] || '')}" maxlength="300" placeholder="${index === 0 ? 'Ex.: Consultas eletivas' : 'Informe a regra ou o valor'}" ${disabled}></td>`).join('')}<td class="simsaude-copart-row-actions"><button class="simsaude-copart-remove" type="button" aria-label="Remover procedimento" onclick="simsaudeCopartRemoverLinha(this)" ${disabled}>Remover</button></td></tr>`).join('')}</tbody></table></div>
    <button class="simsaude-copart-add-row" type="button" onclick="simsaudeCopartAdicionarLinha(this)" ${disabled}>+ Adicionar procedimento</button>
  </section>`;
}

function readCoparticipacaoEditor(editor) {
  const colunas = [...editor.querySelectorAll('[data-copart-column-label]')].map(input => ({ id: input.dataset.copartColumnLabel, label: input.value.trim() }));
  const linhas = [...editor.querySelectorAll('tbody [data-copart-row]')].map(row => ({
    id: row.dataset.copartRow,
    celulas: Object.fromEntries([...row.querySelectorAll('[data-copart-cell]')].map(input => [input.dataset.copartCell, input.value.trim()]))
  })).filter(row => Object.values(row.celulas).some(Boolean));
  return { formato: COPARTICIPACAO_TABLE_FORMAT, versao: COPARTICIPACAO_TABLE_VERSION, colunas, linhas };
}

function rerenderCoparticipacaoEditor(editor, table) {
  editor.outerHTML = renderCoparticipacaoEditor(table);
}

function detailLines(value, key = '') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(item => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    if (item.prazo || item.cobertura) return `${item.prazo || ''}: ${item.cobertura || ''}`.trim();
    const name = item.nome || item.procedimento || '';
    const description = item.descricao || item.endereco || '';
    const amount = item.valor_por_vida != null ? `R$ ${item.valor_por_vida} por vida` : '';
    return [name, description, amount].filter(Boolean).join(' · ') || JSON.stringify(item);
  }).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    if (value.observacao) return value.observacao;
    return Object.entries(value).map(([name, item]) => {
      if (name === 'observacao') return '';
      if (item && typeof item === 'object') return `${name}: ${item.valor != null ? `R$ ${item.valor}` : `${item.percentual ?? ''}%${item.limite != null ? ` (limite R$ ${item.limite})` : ''}`}`;
      return `${name}: ${item}`;
    }).filter(Boolean).join('\n');
  }
  return '';
}

function renderOperatorEditor(draft) {
  const editing = Boolean(draft.id);
  const canSave = Boolean(context.pode?.('simulador_saude.catalogo', editing ? 'update' : 'create'));
  return `<form class="simsaude-editor simsaude-operator-editor" onsubmit="simsaudeSalvarOperadora(event)">
    <header><div><span class="hub-page-kicker">Cadastro de operadora</span><h3>${editing ? `Editar ${esc(draft.nome)}` : 'Nova operadora'}</h3><p>Defina a identificação visual. Os planos desta operadora serão cadastrados dentro da página dela.</p></div><div class="simsaude-editor-actions"><button class="secondary-btn" type="button" onclick="simsaudeFecharOperadora()">Cancelar</button>${canSave ? `<button class="save-btn" type="submit" ${state.loading ? 'disabled' : ''}>Salvar operadora</button>` : ''}</div></header>
    <div class="simsaude-form-grid">
      ${field('Nome da operadora', 'nome', draft.nome, 'text', { required: true, placeholder: 'Ex.: Hapvida' })}
      ${field('Cor da marca', 'cor_marca', draft.cor_marca || '#174A8B', 'color')}
      <label class="simsaude-field is-wide"><span>Logomarca (PNG, JPEG ou WebP; até 2 MB)</span><input type="file" name="logo_file" accept="image/png,image/jpeg,image/webp" onchange="simsaudePreviewLogo(event)"><input type="hidden" name="logo_url" value="${esc(draft.logo_url || '')}"></label>
      <div id="simsaude-operator-preview" class="simsaude-operator-preview is-wide" ${draft.logo_url ? '' : 'hidden'}><img src="${esc(draft.logo_url || '')}" alt="Prévia da logomarca"><span>${draft.logo_url ? 'Logomarca atual' : 'Prévia da logomarca'}</span></div>
    </div>
  </form>`;
}

function renderPlanEditor(draft) {
  const editing = Boolean(draft.plano_id);
  const canSave = Boolean(context.pode?.('simulador_saude.catalogo', editing ? 'update' : 'create'));
  const details = draft.detalhes || {};
  const operator = state.data.operators.find(item => item.id === draft.operadora_id) || {};
  return `<form class="simsaude-editor simsaude-plan-editor" onsubmit="simsaudeSalvarPlano(event)">
    <header><div><span class="hub-page-kicker">Plano de ${esc(operator.nome || 'operadora')}</span><h3>${editing ? `Editar ${esc(draft.plano_nome || '')}` : 'Novo plano'}</h3><p>Cadastre as características e condições padrão. Depois, use este plano em uma ou mais tabelas de preços.</p></div><div class="simsaude-editor-actions"><button class="secondary-btn" type="button" onclick="simsaudeFecharPlano()">Cancelar</button>${canSave ? `<button class="save-btn" type="submit" ${state.loading ? 'disabled' : ''}>Salvar plano</button>` : ''}</div></header>
    <h4>Identificação</h4><div class="simsaude-form-grid">
      ${field('Nome do plano', 'plano_nome', draft.plano_nome, 'text', { required: true })}
      ${field('Modalidade', 'modalidade', draft.modalidade, 'text', { required: true, placeholder: 'Ambulatorial + Hospitalar' })}
      ${field('Abrangência', 'abrangencia', draft.abrangencia, 'text', { required: true, placeholder: 'Nacional, regional…' })}
    </div>
    <h4>Condições padrão do plano</h4><p class="simsaude-muted">Use uma linha por item nos campos de texto. A coparticipação pode ser organizada em uma tabela editável. Ao duplicar o plano, estas informações são copiadas para um cadastro independente.</p>
    <div class="simsaude-form-grid">
      ${textareaField('Coberturas e serviços', 'coberturas_texto', detailLines(details.coberturas), 'Ex.: consultas, exames simples, internação e parto')}
      ${textareaField('Rede credenciada', 'rede_texto', detailLines(details.rede), 'Uma unidade por linha. Ex.: Hospital Central — Maceió')}
      ${renderCoparticipacaoEditor(details.coparticipacao)}
      ${textareaField('Carências', 'carencias_texto', detailLines(details.carencias), 'Uma regra por linha. Ex.: 90 dias: exames especiais')}
      ${textareaField('Adicionais e taxas', 'adicionais_texto', detailLines(details.adicionais), 'Uma cobrança por linha. Ex.: Proteção odontológica: R$ 3,85 por beneficiário')}
      ${textareaField('Observações do plano', 'observacoes_plano', details.observacoes || '', 'Informações complementares')}
    </div>
  </form>`;
}

function renderTablePlanFields(draft) {
  const selectedPlan = state.data.plans.find(plan => plan.id === draft.plano_id);
  const selectedOperatorId = draft.operadora_id || selectedPlan?.operadora_id || '';
  const plans = state.data.plans.filter(plan => plan.operadora_id === selectedOperatorId);
  const operatorOptions = state.data.operators.map(operator => ({
    value: operator.id,
    label: `${operator.nome}${operator.status === 'inativo' ? ' (inativa)' : ''}`
  }));
  const planOptions = plans.map(plan => ({
    value: plan.id,
    label: `${plan.nome} · ${plan.modalidade}${plan.status === 'inativo' ? ' (inativo)' : ''}`
  }));
  const planPlaceholder = !selectedOperatorId
    ? 'Selecione uma operadora primeiro'
    : planOptions.length ? 'Selecione um plano' : 'Nenhum plano cadastrado para esta operadora';
  return `<label class="simsaude-field"><span>Operadora *</span><select name="operadora_id" required onchange="simsaudeTabelaOperadoraAlterar(this)" ${state.loading ? 'disabled' : ''}><option value="">Selecione uma operadora</option>${operatorOptions.map(option => `<option value="${esc(option.value)}" ${option.value === selectedOperatorId ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select></label>
    <label class="simsaude-field"><span>Plano *</span><select name="plano_id" required onchange="simsaudeTabelaPlanoAlterar(this)" ${!selectedOperatorId || !planOptions.length || state.loading ? 'disabled' : ''}><option value="">${esc(planPlaceholder)}</option>${planOptions.map(option => `<option value="${esc(option.value)}" ${option.value === draft.plano_id ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select><small class="simsaude-plan-select-note" data-plan-select-note ${selectedOperatorId && !planOptions.length ? '' : 'hidden'}>Cadastre um plano para esta operadora antes de criar a tabela.</small></label>`;
}

function renderOperatorPage() {
  const canCreate = Boolean(context.pode?.('simulador_saude.catalogo', 'create'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  const canDelete = Boolean(context.pode?.('simulador_saude.catalogo', 'delete'));
  const selected = state.data.operators.find(item => item.id === state.selectedOperatorId);
  const tabs = `<nav class="simsaude-catalog-tabs" aria-label="Áreas do catálogo"><button type="button" class="is-active" aria-current="page">Operadoras</button><button type="button" onclick="simsaudeMudarVisao('tables')">Tabelas de preços</button></nav>`;
  const title = `<div class="simsaude-page-head"><div class="simsaude-page-title"><span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>Operadoras e Planos</h2><p>Cadastre operadoras e organize os planos. Acomodação, coparticipação e código interno são definidos em cada tabela de preços.</p></div></div><div class="simsaude-page-actions">${selected ? `<button class="secondary-btn" type="button" onclick="simsaudeVoltarOperadoras()">Todas as operadoras</button>` : ''}${canCreate && !selected ? `<button class="save-btn" type="button" onclick="simsaudeNovaOperadora()"><i data-lucide="plus" aria-hidden="true"></i> Nova operadora</button>` : ''}${canCreate && selected ? `<button class="save-btn" type="button" onclick="simsaudeNovoPlano()"><i data-lucide="plus" aria-hidden="true"></i> Novo plano</button>` : ''}</div></div>`;
  let body;
  if (state.operatorDraft) body = `<section class="simsaude-card">${renderOperatorEditor(state.operatorDraft)}</section>`;
  else if (state.planDraft) body = `<section class="simsaude-card">${renderPlanEditor(state.planDraft)}</section>`;
  else if (selected) {
    const plans = state.data.plans.filter(plan => plan.operadora_id === selected.id);
    const selectedPlans = plans.filter(plan => state.selectedPlanIds.includes(plan.id));
    const allPlansSelected = plans.length > 0 && selectedPlans.length === plans.length;
    const rows = plans.map(plan => {
      const tableCount = state.data.tables.filter(table => table.plano_id === plan.id).length;
      const actions = [
        canUpdate ? '<option value="editar">Editar</option>' : '',
        canCreate ? '<option value="duplicar">Duplicar</option>' : '',
        canUpdate ? `<option value="status">${plan.status === 'inativo' ? 'Ativar plano' : 'Inativar plano'}</option>` : '',
        canDelete ? '<option value="excluir">Excluir plano</option>' : ''
      ].filter(Boolean).join('');
      return `<tr><td>${canUpdate || canDelete ? `<input class="simsaude-select-row" type="checkbox" aria-label="Selecionar plano ${esc(plan.nome)}" onchange="simsaudeSelecionarPlano('${esc(plan.id)}',this.checked)" ${state.selectedPlanIds.includes(plan.id) ? 'checked' : ''} ${state.loading ? 'disabled' : ''}>` : ''}</td><td><strong>${esc(plan.nome)}</strong>${plan.status === 'inativo' ? '<span class="simsaude-plan-inactive">Inativo</span>' : ''}</td><td>${esc(plan.modalidade)}</td><td>${esc(plan.abrangencia)}</td><td>${tableCount}</td><td>${actions ? `<select class="simsaude-plan-actions" aria-label="Ações do plano ${esc(plan.nome)}" onchange="simsaudeAcaoPlano('${esc(plan.id)}',this.value);this.value=''" ${state.loading ? 'disabled' : ''}><option value="">Ações</option>${actions}</select>` : '—'}</td></tr>`;
    }).join('');
    const bulkPlanActions = state.selectedPlanIds.length ? `<div class="simsaude-bulk-actions" role="group" aria-label="Ações em lote para planos"><span>${state.selectedPlanIds.length} selecionado(s)</span>${canUpdate && selectedPlans.some(plan => plan.status !== 'inativo') ? `<button class="secondary-btn" type="button" onclick="simsaudeAcaoEmLotePlano('inativar')" ${state.loading ? 'disabled' : ''}>Inativar</button>` : ''}${canUpdate && selectedPlans.some(plan => plan.status === 'inativo') ? `<button class="secondary-btn" type="button" onclick="simsaudeAcaoEmLotePlano('ativar')" ${state.loading ? 'disabled' : ''}>Ativar</button>` : ''}${canDelete ? `<button class="secondary-btn simsaude-delete-link" type="button" onclick="simsaudeAcaoEmLotePlano('excluir')" ${state.loading ? 'disabled' : ''}>Excluir</button>` : ''}</div>` : '';
    body = `<section class="simsaude-card simsaude-operator-summary"><div>${operatorMark(selected)}<div><h3>${esc(selected.nome)}</h3><span>Cor da marca <i class="simsaude-color-swatch" style="background:${esc(selected.cor_marca || '#174A8B')}"></i> ${esc(selected.cor_marca || '#174A8B')}</span></div></div>${canUpdate ? `<button class="secondary-btn" type="button" onclick="simsaudeEditarOperadora('${esc(selected.id)}')">Editar operadora</button>` : ''}</section><section class="simsaude-card simsaude-table-card"><header><h3>Planos desta operadora <span class="simsaude-count-pill">${plans.length}</span></h3>${bulkPlanActions}</header><div class="simsaude-table-wrap"><table><thead><tr><th><input class="simsaude-select-row" type="checkbox" aria-label="Selecionar todos os planos desta operadora" onchange="simsaudeSelecionarTodosPlanos(this.checked)" ${allPlansSelected ? 'checked' : ''} ${!plans.length || state.loading || !(canUpdate || canDelete) ? 'disabled' : ''}></th><th>Plano</th><th>Modalidade</th><th>Abrangência</th><th>Tabelas</th><th>Ações</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="simsaude-empty">Nenhum plano cadastrado para esta operadora.</td></tr>'}</tbody></table></div></section>`;
  } else {
    const rows = state.data.operators.map(operator => {
      const count = state.data.plans.filter(plan => plan.operadora_id === operator.id).length;
      return `<tr><td>${operatorMark(operator, true)}</td><td><strong>${esc(operator.nome)}</strong><small>${count} plano${count === 1 ? '' : 's'}</small></td><td><i class="simsaude-color-swatch" style="background:${esc(operator.cor_marca || '#174A8B')}"></i>${esc(operator.cor_marca || '#174A8B')}</td><td><button type="button" class="simsaude-link" onclick="simsaudeAbrirOperadora('${esc(operator.id)}')">Abrir</button>${canUpdate ? `<button type="button" class="simsaude-link" onclick="simsaudeEditarOperadora('${esc(operator.id)}')">Editar</button>` : ''}</td></tr>`;
    }).join('');
    body = `<section class="simsaude-card simsaude-table-card"><header><h3>Operadoras cadastradas <span class="simsaude-count-pill">${state.data.operators.length}</span></h3></header><div class="simsaude-table-wrap"><table><thead><tr><th>Logomarca</th><th>Operadora</th><th>Cor da marca</th><th>Ações</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="simsaude-empty">Nenhuma operadora cadastrada.</td></tr>'}</tbody></table></div></section>`;
  }
  return context.renderShell({ tituloPagina: selected ? selected.nome : 'Operadoras', descricaoPagina: 'Cadastre operadoras e seus planos.', classeConteudo: 'simulador-saude-page', conteudo: `${title}${tabs}${renderMessage()}${body}` });
}

function renderEditor(draft) {
  const editing = Boolean(draft.id);
  const canCreate = Boolean(context.pode?.('simulador_saude.catalogo', 'create'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  const primaryAccommodation = ACCOMMODATIONS.includes(draft.acomodacao) ? draft.acomodacao : 'Apartamento';
  const selectedAccommodations = [...new Set([primaryAccommodation, ...(Array.isArray(draft.acomodacoes) ? draft.acomodacoes : [])].filter(item => ACCOMMODATIONS.includes(item)))];
  const pricesByAccommodation = draft.precos_por_acomodacao || { [primaryAccommodation]: draft.precos || {} };
  const individual = (draft.tipo_contratacao || 'Empresarial (PJ)') === 'Individual';
  const priceRules = individual
    ? [{ key: 'uma_vida', label: '1 vida' }, { key: 'duas_ou_mais', label: '2 ou mais vidas' }]
    : [{ key: 'geral', label: 'Valor por vida' }];
  const tableMinWidth = Math.max(760, 150 + selectedAccommodations.length * priceRules.length * 145);
  const accommodationHeaders = selectedAccommodations.map(accommodation => `<th scope="colgroup" colspan="${priceRules.length}">${esc(accommodation)}</th>`).join('');
  const ruleHeaders = selectedAccommodations.map(() => priceRules.map(rule => `<th scope="col">${esc(rule.label)}</th>`).join('')).join('');
  const priceGrid = `<div class="simsaude-band-table-wrap"><table class="simsaude-band-table" style="min-width:${tableMinWidth}px"><thead><tr><th rowspan="2" scope="col" class="simsaude-band-age-heading">Faixa etária</th>${accommodationHeaders}</tr><tr>${ruleHeaders}</tr></thead><tbody>${AGE_BANDS.map(band => `<tr><th scope="row">${esc(band)} anos</th>${selectedAccommodations.map(accommodation => {
    const prices = pricesByAccommodation[accommodation] || {};
    return priceRules.map(rule => `<td>${field('', `faixa:${accommodation}:${rule.key}:${band}`, prices[rule.key]?.[band] ?? '', 'number', { placeholder: '0,00', ariaLabel: `${accommodation}, ${rule.label}, faixa etária ${band} anos` })}</td>`).join('');
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  const statusOptions = [{ value: 'em_revisao', label: 'Em revisão' }, { value: 'vigente', label: 'Vigente' }, { value: 'inativo', label: 'Inativo' }];
  return `<form class="simsaude-editor" data-plan-id="${esc(draft.plano_id || '')}" onsubmit="simsaudeSalvar(event)">
    <input type="hidden" name="id" value="${esc(draft.id || '')}">
    <input type="hidden" name="acomodacao" value="${esc(primaryAccommodation)}">
    <header><div><span class="hub-page-kicker">${editing ? 'Edição da tabela' : 'Cadastro da tabela'}</span><h3>${esc(draft.nome || (editing ? 'Editar tabela' : 'Nova tabela'))}</h3><p>Vincule um plano cadastrado e informe somente os dados da oferta e os preços por faixa etária.</p></div><div class="simsaude-editor-actions">${editing ? `<button class="secondary-btn" type="button" onclick="simsaudeVerHistorico('${esc(draft.id)}')">Histórico</button>${canUpdate ? `<button class="secondary-btn" type="button" onclick="simsaudeInativar('${esc(draft.id)}')" ${state.loading ? 'disabled' : ''}>Inativar</button>` : ''}${context.pode?.('simulador_saude.catalogo', 'delete') ? `<button class="secondary-btn simsaude-delete-link" type="button" onclick="simsaudeExcluir('${esc(draft.id)}')" ${state.loading ? 'disabled' : ''}>Excluir tabela</button>` : ''}` : ''}${(editing ? canUpdate : canCreate) ? `<button class="save-btn" type="submit" ${state.loading ? 'disabled' : ''}>Salvar tabela</button>` : ''}</div></header>
    <div class="simsaude-form-grid">
      ${renderTablePlanFields(draft)}
      ${field('Nome da tabela', 'nome', draft.nome, 'text', { required: true })}
      <label class="simsaude-field"><span>Tipo de contratação *</span><select ${editing ? 'disabled' : 'name="tipo_contratacao"'} required data-previous-type="${esc(draft.tipo_contratacao || 'Empresarial (PJ)')}" onchange="simsaudeTipoContratacaoAlterar(this)"><option value="Individual" ${(draft.tipo_contratacao || 'Empresarial (PJ)') === 'Individual' ? 'selected' : ''}>Individual</option><option value="Empresarial (PJ)" ${(draft.tipo_contratacao || 'Empresarial (PJ)') === 'Empresarial (PJ)' ? 'selected' : ''}>Empresarial (PJ)</option></select>${editing ? `<input type="hidden" name="tipo_contratacao" value="${esc(draft.tipo_contratacao || 'Empresarial (PJ)')}">` : ''}</label>
      <fieldset class="simsaude-accommodation-options"><legend>Acomodações incluídas *</legend><span class="simsaude-accommodation-primary">${esc(primaryAccommodation)} · acomodação principal</span>${ACCOMMODATIONS.filter(item => item !== primaryAccommodation).map(accommodation => `<label><input type="checkbox" name="acomodacoes" value="${esc(accommodation)}" ${selectedAccommodations.includes(accommodation) ? 'checked' : ''} onchange="simsaudeAcomodacoesAlterar(this)" ${state.loading ? 'disabled' : ''}><span>${esc(accommodation)}</span></label>`).join('')}</fieldset>
      ${field('Coparticipação', 'coparticipacao', String(Boolean(draft.coparticipacao)), 'select', { required: true, options: [{ value: 'false', label: 'Não' }, { value: 'true', label: 'Sim' }] })}
      ${field('Código interno', 'codigo_interno', draft.codigo_interno || '', 'text')}
      ${field('Início da vigência', 'vigencia_inicio', draft.vigencia_inicio, 'date', { required: draft.status === 'vigente' })}
      ${field('Fim da vigência', 'vigencia_fim', draft.vigencia_fim || '', 'date')}
      ${field('Status', 'status', editing && draft.status === 'vigente' ? 'em_revisao' : (draft.status || 'em_revisao'), 'select', { options: statusOptions })}
      ${field('Observações desta tabela', 'observacoes', draft.observacoes || '', 'text', { wide: true })}
    </div>
    <section class="simsaude-band-editor"><div><h4>Preços por faixa etária</h4><p>${individual ? 'Cada acomodação agrupa as tarifas por quantidade de vidas. A tarifa de 2 ou mais vidas é opcional; quando preenchida, deve conter as dez faixas.' : 'Cada acomodação tem uma coluna de valor por vida, para as dez faixas etárias.'} Use vírgula ou ponto nos centavos (ex.: 123,45 ou 123.45).</p></div><div>${priceGrid}</div></section>
  </form>`;
}

function renderTableEditorScreen() {
  const editing = Boolean(state.draft?.id);
  const title = editing ? 'Editar Tabela' : 'Nova Tabela';
  const content = `<div class="simsaude-page-head"><div class="simsaude-page-title"><span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>${title}</h2><p>${editing ? 'Revise os dados do plano, da oferta e dos preços por faixa etária.' : 'Selecione um plano cadastrado e informe a vigência, contratação e preços por faixa etária.'}</p></div></div><button class="secondary-btn" type="button" onclick="simsaudeVoltarCatalogo()"><i data-lucide="arrow-left" aria-hidden="true"></i> Voltar ao catálogo</button></div>${renderMessage()}${state.data.plans.length ? `<section class="simsaude-card">${renderEditor(state.draft)}</section>` : `<section class="simsaude-card"><h3>Cadastre uma operadora e um plano antes de criar a tabela</h3><p class="simsaude-muted">As tabelas de preços precisam estar vinculadas a um plano.</p><button class="save-btn" type="button" onclick="simsaudeMudarVisao('operators')">Ir para operadoras</button></section>`}`;
  return context.renderShell({ tituloPagina: `${title} de Preços`, descricaoPagina: 'Cadastre ou edite uma oferta e seus preços por faixa etária.', classeConteudo: 'simulador-saude-page', conteudo: content });
}

function renderHistory() {
  if (!state.historyId) return '';
  const entries = state.data.history.filter(item => item.registro_id === state.historyId);
  const changes = item => { const before = item.dados_anteriores || {}; const after = item.dados_posteriores || {}; const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]) && !['created_at', 'updated_at', 'created_by', 'updated_by'].includes(key)); return keys.map(key => `<p class="simsaude-history-change"><strong>${esc(key.replaceAll('_', ' '))}:</strong> ${esc(before[key] == null ? '—' : typeof before[key] === 'object' ? JSON.stringify(before[key]) : before[key])} → ${esc(after[key] == null ? '—' : typeof after[key] === 'object' ? JSON.stringify(after[key]) : after[key])}</p>`).join(''); };
  return `<div class="modal-backdrop" role="presentation" onclick="simsaudeFecharHistorico()"><section class="small-modal simsaude-history-modal" role="dialog" aria-modal="true" aria-labelledby="simsaude-history-title" onclick="event.stopPropagation()"><header class="small-modal-header"><div><span class="hub-page-kicker">Auditoria</span><h3 id="simsaude-history-title">Histórico da tabela</h3></div><button class="secondary-btn" type="button" onclick="simsaudeFecharHistorico()">Fechar</button></header>${entries.length ? entries.map(item => `<article><strong>${esc(item.acao)}</strong><time>${date(item.created_at)}</time><p>Usuário: ${esc(item.usuario_id || '—')}</p>${changes(item) || '<p>Registro incluído.</p>'}</article>`).join('') : '<p>Nenhuma atualização registrada para esta tabela.</p>'}</section></div>`;
}

function renderImportPreview() {
  const preview = state.importPreview;
  if (!preview) return '';
  return `<div class="modal-backdrop" role="presentation" onclick="simsaudeFecharImportacao()"><section class="small-modal simsaude-history-modal simsaude-import-modal" role="dialog" aria-modal="true" aria-labelledby="simsaude-import-title" onclick="event.stopPropagation()"><header class="small-modal-header"><div><span class="hub-page-kicker">Importação CSV</span><h3 id="simsaude-import-title">Revisar arquivo</h3><p>${esc(preview.fileName)} · ${preview.validRows.length} linha(s) válida(s) · ${preview.errors.length} com erro</p></div><button class="secondary-btn" type="button" onclick="simsaudeFecharImportacao()">Cancelar</button></header>${preview.errors.length ? `<div class="simsaude-import-errors"><strong>Linhas não válidas</strong>${preview.errors.slice(0, 20).map(item => `<p>Linha ${item.line}: ${esc(item.message)}</p>`).join('')}${preview.errors.length > 20 ? `<p>… e mais ${preview.errors.length - 20} linha(s).</p>` : ''}</div>` : ''}<div class="simsaude-table-wrap"><table><thead><tr><th>Linha</th><th>Operadora</th><th>Plano</th><th>Tabela</th><th>Vigência</th><th>Valores preenchidos</th></tr></thead><tbody>${preview.validRows.slice(0, 12).map(row => { const accommodationPrices = row.precos_por_acomodacao || { [row.acomodacao]: row.precos }; const filled = Object.values(accommodationPrices).reduce((count, prices) => count + Object.values(prices).reduce((priceCount, bands) => priceCount + Object.values(bands).filter(value => value !== '' && value != null).length, 0), 0); const total = Object.keys(accommodationPrices).length * (row.tipo_contratacao === 'Individual' ? 20 : 10); return `<tr><td>${row.line}</td><td>${esc(row.operadora_nome)}</td><td>${esc(row.plano_nome)}</td><td>${esc(row.nome)}</td><td>${date(row.vigencia_inicio)}</td><td>${filled}/${total}</td></tr>`; }).join('') || '<tr><td colspan="6">Nenhuma linha válida para importar.</td></tr>'}</tbody></table></div><footer class="small-modal-actions"><button class="save-btn" type="button" onclick="simsaudeImportarConfirmado()" ${!preview.validRows.length || state.loading ? 'disabled' : ''}>Importar ${preview.validRows.length} linha(s) válida(s)</button></footer></section></div>`;
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
  if (!/^[\d.,]+$/.test(text)) return null;
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  let integerPart = text;
  let fractionPart = '';
  let groupingSeparator = '';
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? ',' : '.';
    groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    const decimalIndex = Math.max(comma, dot);
    integerPart = text.slice(0, decimalIndex);
    fractionPart = text.slice(decimalIndex + 1);
    if (fractionPart.includes(',') || fractionPart.includes('.')) return null;
  } else if (comma >= 0) {
    if (text.indexOf(',') !== comma) return null;
    integerPart = text.slice(0, comma);
    fractionPart = text.slice(comma + 1);
  } else if (dot >= 0) {
    const parts = text.split('.');
    const isGroupedInteger = parts.length > 1 && /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every(part => /^\d{3}$/.test(part));
    if (isGroupedInteger && parts.length > 2) {
      integerPart = parts.join('');
    } else if (isGroupedInteger && parts[1].length === 3) {
      integerPart = parts.join('');
    } else if (parts.length === 2) {
      integerPart = parts[0];
      fractionPart = parts[1];
    } else return null;
  }
  if (groupingSeparator) {
    const groups = integerPart.split(groupingSeparator);
    if (groups.length > 1 && (!/^\d{1,3}$/.test(groups[0]) || !groups.slice(1).every(group => /^\d{3}$/.test(group)))) return null;
    integerPart = groups.join('');
  }
  if (!integerPart) integerPart = '0';
  if (!/^\d+$/.test(integerPart) || (fractionPart && !/^\d{1,2}$/.test(fractionPart))) return null;
  const number = Number(fractionPart ? `${integerPart}.${fractionPart}` : integerPart);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizePriceGrid(prices) {
  let invalid = false;
  const normalized = Object.fromEntries(Object.entries(prices || {}).map(([rule, bands]) => [rule, Object.fromEntries(Object.entries(bands || {}).map(([band, raw]) => {
    const parsed = parseMoneyInput(raw);
    if (parsed === null) invalid = true;
    return [band, parsed === null ? raw : parsed];
  }))]));
  return { prices: normalized, invalid };
}
function csvRowsToPreview(text, fileName) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa conter cabeçalho e ao menos uma linha de dados.');
  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const indexOf = (...names) => headers.findIndex(header => names.map(normalizeHeader).includes(header));
  const col = {
    operator: indexOf('operadora'), plan: indexOf('plano'), modality: indexOf('modalidade'), accommodation: indexOf('acomodacao'), accommodations: indexOf('acomodacoes'), copay: indexOf('coparticipacao', 'copart'), scope: indexOf('abrangencia'), name: indexOf('tabela', 'nometabela'), start: indexOf('vigenciainicio', 'vigencia'), end: indexOf('vigenciafim'), code: indexOf('codigointerno', 'codigo'), observations: indexOf('observacoes'), contract: indexOf('tipocontratacao'), minimumLives: indexOf('minvidas', 'minimovidas'), conditions: indexOf('condicoes')
  };
  const bandCols = Object.fromEntries(AGE_BANDS.map(band => [band, {
    single: indexOf(`${band} 1 vida`, `${band} individual`, band),
    multi: indexOf(`${band} 2 ou mais vidas`, `${band} 2+ vidas`, `${band} familiar`),
    corporate: indexOf(`${band} empresarial`, `${band} pj`, band)
  }]));
  const accommodationBandCols = Object.fromEntries(ACCOMMODATIONS.map(accommodation => [accommodation, Object.fromEntries(AGE_BANDS.map(band => [band, {
    single: indexOf(`${accommodation} ${band} 1 vida`, `${band} ${accommodation} 1 vida`),
    multi: indexOf(`${accommodation} ${band} 2 ou mais vidas`, `${band} ${accommodation} 2 ou mais vidas`),
    corporate: indexOf(`${accommodation} ${band} empresarial`, `${band} ${accommodation} empresarial`)
  }]))]));
  const validRows = []; const errors = [];
  lines.slice(1).forEach((line, rowIndex) => {
    const values = splitCsvLine(line, delimiter).map(value => value.trim()); const lineNumber = rowIndex + 2;
    const get = key => col[key] >= 0 ? values[col[key]] || '' : '';
    const operadora_nome = get('operator'); const plano_nome = get('plan'); const modalidade = get('modality'); const acomodacao = get('accommodation'); const abrangencia = get('scope'); const vigencia_inicio = parseDateInput(get('start'));
    const requestedAccommodations = col.accommodations >= 0 ? values[col.accommodations].split('|').map(value => value.trim()).filter(Boolean) : [];
    const acomodacoes = [...new Set([acomodacao, ...(requestedAccommodations.length ? requestedAccommodations : [])])].filter(value => ACCOMMODATIONS.includes(value));
    const issues = [];
    if (!operadora_nome) issues.push('operadora ausente');
    if (!plano_nome) issues.push('plano ausente');
    if (!modalidade) issues.push('modalidade ausente');
    if (!ACCOMMODATIONS.includes(acomodacao)) issues.push('acomodação principal deve ser Apartamento, Enfermaria ou Ambulatorial');
    if (requestedAccommodations.some(value => !ACCOMMODATIONS.includes(value))) issues.push('acomodações deve conter apenas Apartamento, Enfermaria ou Ambulatorial');
    if (!abrangencia) issues.push('abrangência ausente');
    const contractValue = col.contract >= 0 ? normalizeHeader(values[col.contract]) : '';
    const legacyFamilyRow = contractValue === 'familiar';
    const tipo_contratacao = contractValue === 'individual' || legacyFamilyRow ? 'Individual' : 'Empresarial (PJ)';
    const min_vidas = 1;
    if (!vigencia_inicio && get('status') === 'vigente') issues.push('vigência inicial obrigatória para ativar');
    const precos_por_acomodacao = Object.fromEntries(acomodacoes.map(accommodation => [accommodation, tipo_contratacao === 'Individual' ? { uma_vida: {}, duas_ou_mais: {} } : { geral: {} }]));
    acomodacoes.forEach(accommodation => AGE_BANDS.forEach(band => {
      const columns = bandCols[band];
      const accommodationColumns = accommodationBandCols[accommodation][band];
      const hasAccommodationColumns = Object.values(accommodationBandCols[accommodation]).some(item => Object.values(item).some(index => index >= 0));
      const useAccommodationColumns = hasAccommodationColumns;
      const singleCol = useAccommodationColumns
        ? (legacyFamilyRow ? -1 : tipo_contratacao === 'Individual' ? accommodationColumns.single : accommodationColumns.corporate)
        : accommodation === acomodacao ? (legacyFamilyRow ? -1 : tipo_contratacao === 'Individual' ? columns.single : columns.corporate) : -1;
      const multiCol = useAccommodationColumns
        ? (legacyFamilyRow ? accommodationColumns.single : accommodationColumns.multi)
        : accommodation === acomodacao ? (legacyFamilyRow ? columns.single : columns.multi) : -1;
      const singleRaw = singleCol >= 0 ? values[singleCol] || '' : '';
      const multiRaw = multiCol >= 0 ? values[multiCol] || '' : '';
      const generalRaw = tipo_contratacao === 'Empresarial (PJ)' ? singleRaw : '';
      if (tipo_contratacao === 'Individual') {
        const single = parseMoneyInput(singleRaw); const multi = parseMoneyInput(multiRaw);
        precos_por_acomodacao[accommodation].uma_vida[band] = single === null ? '' : single;
        precos_por_acomodacao[accommodation].duas_ou_mais[band] = multi === null ? '' : multi;
        if ((singleRaw && single === null) || (multiRaw && multi === null)) issues.push(`valor inválido em ${accommodation}, faixa ${band}`);
      } else {
        const parsed = parseMoneyInput(generalRaw); precos_por_acomodacao[accommodation].geral[band] = parsed === null ? '' : parsed;
        if (generalRaw && parsed === null) issues.push(`valor inválido em ${accommodation}, faixa ${band}`);
      }
    }));
    if (issues.length) { errors.push({ line: lineNumber, message: issues.join('; ') }); return; }
    const rawEndDate = get('end'); const vigencia_fim = parseDateInput(rawEndDate);
    if (rawEndDate && !vigencia_fim) issues.push('vigência final inválida');
    if (vigencia_fim && vigencia_inicio && vigencia_fim < vigencia_inicio) issues.push('fim da vigência anterior ao início');
    if (issues.length) { errors.push({ line: lineNumber, message: issues.join('; ') }); return; }
    const copayValue = normalizeHeader(get('copay'));
    let condicoes = {};
    if (col.conditions >= 0 && values[col.conditions]) { try { condicoes = JSON.parse(values[col.conditions]); if (!condicoes || Array.isArray(condicoes) || typeof condicoes !== 'object') throw new Error(); } catch { issues.push('condições deve conter um objeto JSON válido'); } }
    if (issues.length) { errors.push({ line: lineNumber, message: issues.join('; ') }); return; }
    validRows.push({ line: lineNumber, operadora_nome, plano_nome, modalidade, acomodacao, acomodacoes, coparticipacao: ['sim', 'true', '1', 'yes'].includes(copayValue), abrangencia, nome: get('name') || `${plano_nome} · ${tipo_contratacao}`, vigencia_inicio, vigencia_fim, tipo_contratacao, min_vidas, codigo_interno: get('code'), observacoes: get('observations'), condicoes, status: 'em_revisao', precos_por_acomodacao, precos: precos_por_acomodacao[acomodacao] || {} });
  });
  return { fileName, validRows, errors };
}

function renderPage() {
  if (!context.pode?.('simulador_saude.catalogo', 'view')) return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar catálogo.</p></section>' });
  if (state.editorRoute && !state.draft) return context.renderShell({ tituloPagina: 'Tabela de Preços', descricaoPagina: 'Carregando cadastro da tabela.', classeConteudo: 'simulador-saude-page', conteudo: renderLoading() });
  if (state.editorRoute && state.draft) return renderTableEditorScreen();
  if (state.view === 'operators') return renderOperatorPage();
  if (state.loading && !state.data.tables.length && !state.error) return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Gerencie os planos, tabelas e preços utilizados nas cotações.', classeConteudo: 'simulador-saude-page', conteudo: renderLoading() });
  const rows = filteredTables(); const start = (state.page - 1) * state.pageSize; const pageRows = rows.slice(start, start + state.pageSize);
  const operators = state.data.operators;
  const modalities = [...new Set(state.data.plans.map(item => item.modalidade).filter(Boolean))].sort();
  const current = state.data.tables.filter(item => displayStatus(item) === 'Vigente').length;
  const soon = state.data.tables.filter(item => item.status === 'vigente' && item.vigencia_fim && item.vigencia_fim >= new Date().toISOString().slice(0, 10) && item.vigencia_fim <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length;
  const recent = state.data.history.slice(0, 5);
  const canCreate = Boolean(context.pode?.('simulador_saude.catalogo', 'create'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  const canDelete = Boolean(context.pode?.('simulador_saude.catalogo', 'delete'));
  const allPageTablesSelected = pageRows.length > 0 && pageRows.every(item => state.selectedTableIds.includes(item.id));
  const selectedTables = state.selectedTableIds.map(id => state.data.tables.find(item => item.id === id)).filter(Boolean);
  const bulkTableActions = state.selectedTableIds.length ? `<div class="simsaude-bulk-actions" role="group" aria-label="Ações em lote para tabelas"><span>${state.selectedTableIds.length} selecionada(s)</span>${canUpdate && selectedTables.some(table => table.status !== 'inativo') ? `<button class="secondary-btn" type="button" onclick="simsaudeAcaoEmLoteTabela('inativar')" ${state.loading ? 'disabled' : ''}>Inativar</button>` : ''}${canDelete ? `<button class="secondary-btn simsaude-delete-link" type="button" onclick="simsaudeAcaoEmLoteTabela('excluir')" ${state.loading ? 'disabled' : ''}>Excluir</button>` : ''}</div>` : '';
  const activeFilterCount = [state.operator, state.modality, state.accommodation, state.copay, state.date, state.status].filter(Boolean).length;
  const title = `<div class="simsaude-page-head"><div class="simsaude-page-title"><span class="saude-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>Catálogo de Planos e Preços</h2><p>Gerencie os planos, tabelas de preços e condições utilizadas nas cotações.</p></div></div><div class="simsaude-page-actions"><form class="simsaude-toolbar-search" role="search" aria-label="Buscar planos e tabelas" onsubmit="simsaudeBuscar(event)"><span class="simsaude-search-control"><i data-lucide="search" aria-hidden="true"></i><input type="search" name="search" value="${esc(state.search)}" placeholder="Nome da tabela, plano ou operadora..." aria-label="Nome da tabela, plano ou operadora"></span><button class="icon-btn" type="submit" aria-label="Buscar" title="Buscar"><i data-lucide="search" aria-hidden="true"></i></button></form><button class="secondary-btn simsaude-filter-trigger" type="button" onclick="simsaudeAbrirFiltros()" aria-haspopup="dialog" aria-controls="simsaude-filter-modal" aria-expanded="${state.filterModalOpen}"><i data-lucide="sliders-horizontal" aria-hidden="true"></i> Filtros${activeFilterCount ? `<span class="simsaude-filter-count">${activeFilterCount}</span>` : ''}</button>${canCreate ? '<button class="save-btn" type="button" onclick="simsaudeNovaTabela()"><i data-lucide="plus" aria-hidden="true"></i> Nova Tabela</button><button class="secondary-btn" type="button" onclick="document.getElementById(\'simsaude-csv-file\').click()"><i data-lucide="upload-cloud" aria-hidden="true"></i> Importar</button><input id="simsaude-csv-file" class="simsaude-file-input" type="file" accept=".csv,text/csv" onchange="simsaudeSelecionarArquivo(event)">' : ''}<button class="secondary-btn" type="button" onclick="simsaudeExportar()"><i data-lucide="download" aria-hidden="true"></i> Exportar</button></div></div>`;
  const filters = state.filterModalOpen ? `<div class="modal-backdrop simsaude-filter-backdrop" role="presentation" onclick="simsaudeFecharFiltros(event)"><section id="simsaude-filter-modal" class="small-modal simsaude-filter-modal" role="dialog" aria-modal="true" aria-labelledby="simsaude-filter-title" tabindex="-1" onclick="event.stopPropagation()"><header class="small-modal-header"><div><span class="hub-page-kicker">Catálogo</span><h3 id="simsaude-filter-title">Filtrar planos e tabelas</h3><p>Escolha os critérios e aplique para atualizar a lista.</p></div><button class="icon-btn simsaude-filter-close" type="button" onclick="simsaudeFecharFiltros()" aria-label="Fechar filtros" title="Fechar filtros"><i data-lucide="x" aria-hidden="true"></i></button></header><form class="simsaude-filters" onsubmit="simsaudeFiltrar(event)"><label><span>Operadora</span><select name="operator">${selectedOptions(operators.map(x => ({ value: x.id, label: x.nome })), state.operator)}</select></label><label><span>Modalidade</span><select name="modality">${selectedOptions(modalities.map(x => ({ value: x, label: x })), state.modality)}</select></label><label><span>Acomodação</span><select name="accommodation">${selectedOptions(['Apartamento', 'Enfermaria'].map(x => ({ value: x, label: x })), state.accommodation)}</select></label><label><span>Coparticipação</span><select name="copay">${selectedOptions([{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }], state.copay)}</select></label><label><span>Vigência</span><span class="simsaude-date-control"><input type="date" name="date" value="${esc(state.date)}"></span></label><label><span>Status</span><select name="status">${selectedOptions(['Vigente', 'Em revisão', 'Inativo', 'Vencido'].map(x => ({ value: x, label: x })), state.status)}</select></label><footer class="small-modal-actions simsaude-filter-actions"><button class="secondary-btn" type="button" onclick="simsaudeLimparFiltros()"><i data-lucide="rotate-ccw" aria-hidden="true"></i> Limpar filtros</button><div><button class="secondary-btn" type="button" onclick="simsaudeFecharFiltros()">Cancelar</button><button class="save-btn" type="submit"><i data-lucide="filter" aria-hidden="true"></i> Aplicar filtros</button></div></footer></form></section></div>` : '';
  const table = `<section class="simsaude-card simsaude-table-card"><header><h3><i data-lucide="list" aria-hidden="true"></i> Planos e Tabelas de Preços <span class="simsaude-count-pill">${rows.length} registro${rows.length === 1 ? '' : 's'}</span></h3>${bulkTableActions}</header><div class="simsaude-table-wrap"><table class="simsaude-catalog-table"><thead><tr><th><input class="simsaude-select-row" type="checkbox" aria-label="Selecionar tabelas desta página" onchange="simsaudeSelecionarTodasTabelas(this.checked)" ${allPageTablesSelected ? 'checked' : ''} ${!pageRows.length || state.loading || !(canUpdate || canDelete) ? 'disabled' : ''}></th><th>Operadora</th><th>Plano</th><th>Tabela</th><th>Modalidade</th><th>Acomodação</th><th>Copart.</th><th>Abrangência</th><th>Faixas</th><th>Atualizado em</th></tr></thead><tbody>${pageRows.length ? pageRows.map(renderTableRow).join('') : `<tr><td colspan="10" class="simsaude-empty">${state.data.tables.length ? 'Nenhum registro corresponde aos filtros selecionados.' : 'Nenhum plano/tabela cadastrado.'}</td></tr>`}</tbody></table></div><footer class="simsaude-pagination"><span>Exibindo ${rows.length ? start + 1 : 0}–${Math.min(start + state.pageSize, rows.length)} de ${rows.length} registros</span><label><span>Por página</span><select onchange="simsaudeMudarPagina(this.value)">${[10, 25, 50, 100].map(size => `<option value="${size}" ${state.pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label><button type="button" onclick="simsaudePagina(-1)" aria-label="Página anterior" ${state.page <= 1 ? 'disabled' : ''}>‹</button><span class="simsaude-current-page">${state.page}</span><button type="button" onclick="simsaudePagina(1)" aria-label="Próxima página" ${start + state.pageSize >= rows.length ? 'disabled' : ''}>›</button></footer></section>`;
  const sidebar = `<aside class="simsaude-sidebar"><section class="simsaude-card"><h3><i data-lucide="clipboard-list" aria-hidden="true"></i> Resumo do Catálogo</h3><div class="simsaude-summary"><article class="is-blue"><i data-lucide="landmark" aria-hidden="true"></i><div><strong>${operators.filter(x => x.status === 'ativo').length}</strong><span>Operadoras</span></div></article><article class="is-green"><i data-lucide="file" aria-hidden="true"></i><div><strong>${state.data.plans.filter(x => x.status === 'ativo').length}</strong><span>Planos ativos</span></div></article><article class="is-violet"><i data-lucide="list-checks" aria-hidden="true"></i><div><strong>${current}</strong><span>Tabelas vigentes</span></div></article><article class="is-amber"><i data-lucide="clock-3" aria-hidden="true"></i><div><strong>${soon}</strong><span>Próximas a vencer<br>(até 30 dias)</span></div></article></div></section><section class="simsaude-card"><h3><i data-lucide="refresh-cw" aria-hidden="true"></i> Últimas atualizações</h3>${recent.length ? recent.map(item => `<article class="simsaude-activity"><span class="simsaude-activity-mark is-${operatorClass(item.entidade)}"><i data-lucide="file-text" aria-hidden="true"></i></span><div><strong>${esc(item.acao)} · ${esc(item.entidade.replace('simulador_saude_', ''))}</strong><small>${date(item.created_at)}</small></div></article>`).join('') : '<p class="simsaude-muted">As alterações aparecerão aqui.</p>'}</section><section class="simsaude-card"><h3><i data-lucide="list-ordered" aria-hidden="true"></i> Faixas etárias padrão</h3><ol class="simsaude-band-reference">${AGE_BANDS.map((band, index) => `<li><span>${index + 1}</span><strong>${esc(band)}</strong>${band === '59+' ? '59 anos ou mais' : `${band.replace('-', ' a ')} anos`}</li>`).join('')}</ol></section></aside>`;
  const tabs = `<nav class="simsaude-catalog-tabs" aria-label="Áreas do catálogo"><button type="button" onclick="simsaudeMudarVisao('operators')">Operadoras</button><button type="button" class="is-active" aria-current="page">Tabelas de preços</button></nav>`;
  const content = `${title}${tabs}${renderMessage()}<div class="simsaude-layout">${table}${sidebar}</div>${filters}${renderHistory()}${renderImportPreview()}`;
  return context.renderShell({ tituloPagina: 'Catálogo de Planos e Preços', descricaoPagina: 'Gerencie os planos, tabelas de preços e condições utilizadas nas cotações.', classeConteudo: 'simulador-saude-page', conteudo: content });
}

function rerender() { const root = document.getElementById('app'); if (root) root.innerHTML = renderPage(); document.body.classList.toggle('modal-is-open', Boolean(state.filterModalOpen || state.historyId || state.importPreview)); }
async function loadCatalog() { state.loading = true; state.error = ''; rerender(); try { const response = await chamarApi('getSimuladorSaudeCatalog'); if (!response.ok) throw new Error(response.message); state.data = response.data; state.selectedPlanIds = state.selectedPlanIds.filter(id => state.data.plans.some(item => item.id === id)); state.selectedTableIds = state.selectedTableIds.filter(id => state.data.tables.some(item => item.id === id)); } catch (error) { state.error = error.message || 'Não foi possível carregar o catálogo.'; } finally { state.loading = false; rerender(); } }

function newTableDraft() { return { status: 'em_revisao', tipo_contratacao: 'Empresarial (PJ)', min_vidas: 1, acomodacao: 'Apartamento', acomodacoes: ['Apartamento', 'Enfermaria'], precos_por_acomodacao: {} }; }
function draftFromTable(table) {
  const plan = planFor(table); const operator = operatorFor(plan); const accommodations = accommodationsFor(table);
  return { ...plan, ...table, plano_id: plan.id, plano_nome: plan.nome, operadora_nome: operator.nome, acomodacoes: accommodations, precos_por_acomodacao: bandsByAccommodationFor(table) };
}
function navigateToTableEditor(suffix) {
  const root = catalogRootPath();
  const target = `${root}/${suffix}`;
  window.history.pushState({ ...(window.history.state || {}), simsaudeCatalogEditorReturnPath: root }, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function restoreCatalogRouteAfterSave() {
  state.editorDirty = false;
  state.editorRoute = null;
  state.draft = null;
  window.history.replaceState({}, '', catalogRootPath());
}
function draftFromForm(form, priceType = '', previousDraft = state.draft) {
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  const primaryAccommodation = values.acomodacao || 'Apartamento';
  const accommodations = [...new Set([primaryAccommodation, ...formData.getAll('acomodacoes')].filter(item => ACCOMMODATIONS.includes(item)))];
  const ruleNames = (priceType || values.tipo_contratacao) === 'Individual' ? ['uma_vida', 'duas_ou_mais'] : ['geral'];
  const pricesByAccommodation = {};
  for (const accommodation of ACCOMMODATIONS) {
    pricesByAccommodation[accommodation] = {};
    for (const rule of ruleNames) {
      pricesByAccommodation[accommodation][rule] = {};
      for (const band of AGE_BANDS) {
        const key = `faixa:${accommodation}:${rule}:${band}`;
        pricesByAccommodation[accommodation][rule][band] = values[key] ?? previousDraft?.precos_por_acomodacao?.[accommodation]?.[rule]?.[band] ?? '';
        delete values[key];
      }
    }
  }
  values.acomodacao = primaryAccommodation;
  values.acomodacoes = accommodations;
  values.coparticipacao = values.coparticipacao === 'true';
  values.min_vidas = 1;
  values.precos_por_acomodacao = pricesByAccommodation;
  values.precos = pricesByAccommodation[primaryAccommodation] || {};
  values.plano_id = values.plano_id || form.dataset.planId || '';
  return values;
}

window.simsaudeTabelaOperadoraAlterar = select => {
  const form = select.form;
  const planSelect = form?.querySelector('[name="plano_id"]');
  if (!form || !planSelect) return;
  form.dataset.planId = '';
  const plans = state.data.plans.filter(plan => plan.operadora_id === select.value);
  const placeholder = !select.value
    ? 'Selecione uma operadora primeiro'
    : plans.length ? 'Selecione um plano' : 'Nenhum plano cadastrado para esta operadora';
  planSelect.innerHTML = `<option value="">${esc(placeholder)}</option>${plans.map(plan => `<option value="${esc(plan.id)}">${esc(`${plan.nome} · ${plan.modalidade}${plan.status === 'inativo' ? ' (inativo)' : ''}`)}</option>`).join('')}`;
  planSelect.value = '';
  planSelect.disabled = !select.value || plans.length === 0 || state.loading;
  const note = form.querySelector('[data-plan-select-note]');
  if (note) {
    note.hidden = !select.value || plans.length > 0;
    note.textContent = 'Cadastre um plano para esta operadora antes de criar a tabela.';
  }
};

window.simsaudeTabelaPlanoAlterar = select => {
  if (select.form) select.form.dataset.planId = select.value || '';
};

window.simsaudeAcomodacoesAlterar = input => {
  if (!input.form) return;
  const draft = draftFromForm(input.form);
  state.draft = draft;
  rerender();
};

window.simsaudeCopartAdicionarColuna = button => {
  const editor = button.closest('.simsaude-copart-editor');
  if (!editor) return;
  const table = readCoparticipacaoEditor(editor);
  const column = createCoparticipacaoColumn();
  table.colunas.push(column);
  table.linhas.forEach(row => { row.celulas[column.id] = ''; });
  rerenderCoparticipacaoEditor(editor, table);
  [...document.querySelectorAll('.simsaude-plan-editor [data-copart-column-label]')].find(input => input.dataset.copartColumnLabel === column.id)?.focus();
};

window.simsaudeCopartAdicionarLinha = button => {
  const editor = button.closest('.simsaude-copart-editor');
  if (!editor) return;
  const table = readCoparticipacaoEditor(editor);
  const row = createCoparticipacaoRow(table.colunas);
  table.linhas.push(row);
  rerenderCoparticipacaoEditor(editor, table);
  [...document.querySelectorAll('.simsaude-plan-editor [data-copart-row]')].find(item => item.dataset.copartRow === row.id)?.querySelector('input')?.focus();
};

window.simsaudeCopartRemoverColuna = button => {
  const editor = button.closest('.simsaude-copart-editor');
  const columnId = button.dataset.columnId;
  if (!editor || !columnId) return;
  const table = readCoparticipacaoEditor(editor);
  if (table.colunas.length <= 1) return;
  const column = table.colunas.find(item => item.id === columnId);
  if (!column) return;
  const hasValues = table.linhas.some(row => String(row.celulas[columnId] || '').trim());
  if (hasValues && !window.confirm(`A coluna “${column.label}” contém valores. Remover a coluna também apagará esses valores. Continuar?`)) return;
  table.colunas = table.colunas.filter(item => item.id !== columnId);
  table.linhas.forEach(row => { delete row.celulas[columnId]; });
  rerenderCoparticipacaoEditor(editor, table);
};

window.simsaudeCopartRemoverLinha = button => {
  const editor = button.closest('.simsaude-copart-editor');
  const row = button.closest('[data-copart-row]');
  if (!editor || !row) return;
  const hasValues = [...row.querySelectorAll('[data-copart-cell]')].some(input => input.value.trim());
  if (hasValues && !window.confirm('Este procedimento contém valores. Remover a linha?')) return;
  row.remove();
};

window.simsaudeTipoContratacaoAlterar = select => {
  const previousType = select.dataset.previousType || 'Empresarial (PJ)';
  const nextType = select.value;
  const draft = draftFromForm(select.form, previousType);
  if (previousType === 'Individual' && nextType === 'Empresarial (PJ)') {
    draft.precos_por_acomodacao = Object.fromEntries(Object.entries(draft.precos_por_acomodacao).map(([accommodation, prices]) => [accommodation, { geral: prices.uma_vida }]));
  } else if (previousType !== 'Individual' && nextType === 'Individual') {
    draft.precos_por_acomodacao = Object.fromEntries(Object.entries(draft.precos_por_acomodacao).map(([accommodation, prices]) => [accommodation, { uma_vida: prices.geral, duas_ou_mais: {} }]));
  }
  draft.precos = draft.precos_por_acomodacao[draft.acomodacao] || {};
  draft.tipo_contratacao = nextType;
  state.draft = draft;
  rerender();
};

export async function mountSimuladorSaudeCatalogPage(nextContext = {}) {
  context = { ...nextContext };
  state.error = '';
  state.notice = '';
  state.filterModalOpen = false;
  state.editorRoute = catalogEditorRoute();
  state.editorDirty = false;
  state.view = state.editorRoute ? 'tables' : state.view;
  const pendingDuplicate = state.editorRoute === 'nova' && state.draft?.id === '' ? state.draft : null;
  state.draft = pendingDuplicate;
  await loadCatalog();
  if (state.editorRoute === 'nova') {
    if (!context.pode?.('simulador_saude.catalogo', 'create')) {
      state.error = 'Você não tem permissão para cadastrar tabelas.';
      state.editorRoute = null;
      state.draft = null;
      window.history.replaceState({}, '', catalogRootPath());
    } else state.draft = pendingDuplicate || newTableDraft();
  } else if (state.editorRoute && state.editorRoute !== 'inválida') {
    if (!context.pode?.('simulador_saude.catalogo', 'update')) {
      state.error = 'Você não tem permissão para editar tabelas.';
      state.editorRoute = null;
      window.history.replaceState({}, '', catalogRootPath());
    } else {
      const table = state.data.tables.find(item => item.id === state.editorRoute);
      if (table) state.draft = draftFromTable(table);
      else {
        state.error = 'A tabela solicitada não foi encontrada.';
        state.editorRoute = null;
        window.history.replaceState({}, '', catalogRootPath());
      }
    }
  } else if (state.editorRoute === 'inválida') {
    state.error = 'O endereço da tabela é inválido.';
    state.editorRoute = null;
    window.history.replaceState({}, '', catalogRootPath());
  }
  rerender();
}

window.simsaudeNovaTabela = () => { state.view = 'tables'; state.draft = null; navigateToTableEditor('nova'); };
window.simsaudeMudarVisao = view => {
  if (state.editorRoute && state.editorDirty && !window.confirm('Há alterações não salvas nesta tabela. Deseja sair e descartá-las?')) return;
  if (state.editorRoute) { state.editorDirty = false; state.editorRoute = null; window.history.replaceState({}, '', catalogRootPath()); }
  state.view = view === 'tables' ? 'tables' : 'operators'; state.operatorDraft = null; state.selectedOperatorId = ''; state.selectedPlanIds = []; state.selectedTableIds = []; state.draft = null; state.planDraft = null; state.error = ''; state.notice = ''; rerender();
};
window.simsaudeNovaOperadora = () => { state.view = 'operators'; state.selectedOperatorId = ''; state.selectedPlanIds = []; state.operatorDraft = { cor_marca: '#174A8B', status: 'ativo' }; state.planDraft = null; rerender(); };
window.simsaudeFecharOperadora = () => { state.operatorDraft = null; rerender(); };
window.simsaudePreviewLogo = event => { const file = event.currentTarget.files?.[0]; if (!file) return; const preview = document.getElementById('simsaude-operator-preview'); const image = preview?.querySelector('img'); const label = preview?.querySelector('span'); if (!preview || !image) return; if (image.dataset.previewUrl) URL.revokeObjectURL(image.dataset.previewUrl); image.dataset.previewUrl = URL.createObjectURL(file); image.src = image.dataset.previewUrl; if (label) label.textContent = `Prévia · ${file.name}`; preview.hidden = false; };
window.simsaudeAbrirOperadora = id => { state.selectedOperatorId = id; state.selectedPlanIds = []; state.operatorDraft = null; state.planDraft = null; state.view = 'operators'; rerender(); };
window.simsaudeVoltarOperadoras = () => { state.selectedOperatorId = ''; state.selectedPlanIds = []; state.operatorDraft = null; state.planDraft = null; rerender(); };
window.simsaudeEditarOperadora = id => { const operator = state.data.operators.find(item => item.id === id); if (!operator) return; state.selectedOperatorId = ''; state.operatorDraft = { ...operator }; rerender(); };
window.simsaudeNovoPlano = () => { if (!state.selectedOperatorId) return; state.operatorDraft = null; state.planDraft = { operadora_id: state.selectedOperatorId, status: 'ativo', detalhes: {} }; rerender(); };
window.simsaudeFecharPlano = () => { state.planDraft = null; rerender(); };
window.simsaudeSelecionarPlano = (id, checked) => { const selected = new Set(state.selectedPlanIds); checked ? selected.add(id) : selected.delete(id); state.selectedPlanIds = [...selected]; rerender(); };
window.simsaudeSelecionarTodosPlanos = checked => { const selected = new Set(state.selectedPlanIds); for (const plan of state.data.plans.filter(item => item.operadora_id === state.selectedOperatorId)) checked ? selected.add(plan.id) : selected.delete(plan.id); state.selectedPlanIds = [...selected]; rerender(); };
window.simsaudeSelecionarTabela = (id, checked) => { const selected = new Set(state.selectedTableIds); checked ? selected.add(id) : selected.delete(id); state.selectedTableIds = [...selected]; rerender(); };
window.simsaudeSelecionarTodasTabelas = checked => { const start = (state.page - 1) * state.pageSize; const visible = filteredTables().slice(start, start + state.pageSize); const selected = new Set(state.selectedTableIds); for (const table of visible) checked ? selected.add(table.id) : selected.delete(table.id); state.selectedTableIds = [...selected]; rerender(); };
window.simsaudeEditarPlano = id => { const plan = state.data.plans.find(item => item.id === id); if (!plan) return; state.selectedOperatorId = plan.operadora_id; state.planDraft = { ...plan, plano_id: plan.id, plano_nome: plan.nome }; rerender(); };
window.simsaudeDuplicarPlano = id => { const plan = state.data.plans.find(item => item.id === id); if (!plan) return; state.selectedOperatorId = plan.operadora_id; state.planDraft = { ...plan, plano_id: '', plano_nome: `${plan.nome} (cópia)`, status: 'ativo', detalhes: JSON.parse(JSON.stringify(plan.detalhes || {})) }; rerender(); };
window.simsaudeAcaoPlano = (id, action) => {
  if (action === 'editar') return window.simsaudeEditarPlano(id);
  if (action === 'duplicar') return window.simsaudeDuplicarPlano(id);
  if (action === 'excluir') return window.simsaudeExcluirPlano(id);
  if (action === 'status') {
    const plan = state.data.plans.find(item => item.id === id);
    if (plan) return window.simsaudeAlterarStatusPlano(id, plan.status === 'inativo' ? 'ativo' : 'inativo');
  }
};
window.simsaudeSalvarOperadora = async event => {
  event.preventDefault();
  if (state.loading) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const file = form.elements.logo_file.files?.[0];
  if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
    state.error = 'Escolha uma imagem PNG, JPEG ou WebP de até 2 MB.'; rerender(); return;
  }
  let uploadedPath = '';
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    let logoUrl = values.logo_url || '';
    if (file) {
      const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[file.type];
      uploadedPath = `operadoras/${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${extension}`;
      const client = exigirSupabaseConfigurado();
      const { error } = await client.storage.from('branding').upload(uploadedPath, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message || 'Não foi possível enviar a logomarca.');
      logoUrl = client.storage.from('branding').getPublicUrl(uploadedPath).data?.publicUrl || '';
      if (!logoUrl) throw new Error('Não foi possível obter a URL pública da logomarca.');
    }
    const response = await chamarApi('saveSimuladorSaudeOperator', { id: state.operatorDraft?.id || '', nome: values.nome, cor_marca: values.cor_marca, logo_url: logoUrl, status: state.operatorDraft?.status || 'ativo' });
    if (!response.ok) throw new Error(response.message || 'Não foi possível salvar a operadora.');
    uploadedPath = '';
    state.operatorDraft = null; state.selectedOperatorId = response.data; state.notice = 'Operadora salva.';
    await loadCatalog();
  } catch (error) {
    if (uploadedPath) { try { await exigirSupabaseConfigurado().storage.from('branding').remove([uploadedPath]); } catch {} }
    state.error = error.message || 'Não foi possível salvar a operadora.';
  } finally { state.loading = false; rerender(); }
};
window.simsaudeSalvarPlano = async event => {
  event.preventDefault();
  if (state.loading) return;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const coparticipacao = readCoparticipacaoEditor(form.querySelector('.simsaude-copart-editor'));
  const details = {
    coberturas: String(values.coberturas_texto || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    rede: String(values.rede_texto || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    coparticipacao,
    carencias: String(values.carencias_texto || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    adicionais: String(values.adicionais_texto || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    observacoes: String(values.observacoes_plano || '').trim()
  };
  const draft = { plano_id: state.planDraft?.plano_id || '', operadora_id: state.planDraft?.operadora_id || state.selectedOperatorId, plano_nome: values.plano_nome, modalidade: values.modalidade, abrangencia: values.abrangencia, status: state.planDraft?.status || 'ativo', detalhes: details };
  const columnLabels = coparticipacao.colunas.map(column => column.label.toLocaleLowerCase('pt-BR'));
  if (new Set(columnLabels).size !== columnLabels.length) {
    state.error = 'Use nomes diferentes para cada coluna da tabela de coparticipação.';
    state.planDraft = draft;
    rerender();
    return;
  }
  state.planDraft = draft;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    const response = await chamarApi('saveSimuladorSaudePlan', draft);
    if (!response.ok) throw new Error(response.message || 'Não foi possível salvar o plano.');
    state.planDraft = null; state.notice = 'Plano salvo.';
    await loadCatalog();
  } catch (error) { state.error = error.message || 'Não foi possível salvar o plano.'; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeAlterarStatusPlano = async (id, status) => {
  if (state.loading || !context.pode?.('simulador_saude.catalogo', 'update')) return;
  const plan = state.data.plans.find(item => item.id === id);
  if (!plan || !['ativo', 'inativo'].includes(status)) return;
  const verb = status === 'inativo' ? 'Inativar' : 'Ativar';
  if (!window.confirm(`${verb} o plano “${plan.nome}”? ${status === 'inativo' ? 'Ele deixará de aparecer em novas cotações.' : 'Ele poderá ser usado em novas cotações.'}`)) return;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    const response = await chamarApi('setSimuladorSaudePlanStatus', { id, status });
    if (!response.ok) throw new Error(response.message || 'Não foi possível alterar o status do plano.');
    state.notice = status === 'inativo' ? 'Plano inativado.' : 'Plano ativado.';
    await loadCatalog();
  } catch (error) { state.error = error.message || 'Não foi possível alterar o status do plano.'; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeExcluirPlano = async id => {
  if (state.loading || !context.pode?.('simulador_saude.catalogo', 'delete')) return;
  const plan = state.data.plans.find(item => item.id === id);
  if (!plan) return;
  if (state.data.tables.some(table => table.plano_id === id)) {
    state.error = 'Este plano possui tabelas de preços associadas. Inative-o para preservar o histórico.';
    state.notice = '';
    rerender();
    return;
  }
  if (!window.confirm(`Excluir o plano “${plan.nome}”? A exclusão é permanente.`)) return;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    const response = await chamarApi('deleteSimuladorSaudePlan', { id });
    if (!response.ok) throw new Error(response.message || 'Não foi possível excluir o plano.');
    state.notice = 'Plano excluído do catálogo.';
    await loadCatalog();
  } catch (error) { state.error = error.message || 'Não foi possível excluir o plano.'; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeAcaoEmLotePlano = async action => {
  if (state.loading || !['inativar', 'ativar', 'excluir'].includes(action)) return;
  const canDelete = Boolean(context.pode?.('simulador_saude.catalogo', 'delete'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  if ((action === 'excluir' && !canDelete) || (action !== 'excluir' && !canUpdate)) return;
  const plans = state.selectedPlanIds.map(id => state.data.plans.find(plan => plan.id === id)).filter(Boolean);
  const targetStatus = action === 'inativar' ? 'inativo' : 'ativo';
  const targets = action === 'excluir' ? plans : plans.filter(plan => plan.status !== targetStatus);
  if (!targets.length) { state.notice = 'Os planos selecionados já estão nesse status.'; state.error = ''; rerender(); return; }
  const verb = action === 'excluir' ? 'excluir permanentemente' : action;
  if (!window.confirm(`Deseja ${verb} ${targets.length} plano(s) selecionado(s)?`)) return;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  const completedIds = []; const failures = [];
  try {
    for (const plan of targets) {
      if (action === 'excluir' && state.data.tables.some(table => table.plano_id === plan.id)) {
        failures.push(`${plan.nome}: possui tabelas de preços associadas; inative-o.`);
        continue;
      }
      const response = action === 'excluir'
        ? await chamarApi('deleteSimuladorSaudePlan', { id: plan.id })
        : await chamarApi('setSimuladorSaudePlanStatus', { id: plan.id, status: targetStatus });
      if (response.ok) completedIds.push(plan.id);
      else failures.push(`${plan.nome}: ${response.message || 'operação não concluída'}`);
    }
    state.selectedPlanIds = state.selectedPlanIds.filter(id => !completedIds.includes(id));
    await loadCatalog();
    state.notice = `${completedIds.length} plano(s) ${action === 'excluir' ? 'excluído(s)' : action === 'inativar' ? 'inativado(s)' : 'ativado(s)'}.`;
    if (failures.length) { state.error = `${completedIds.length} concluído(s); ${failures.length} falha(s): ${failures.join(' · ')}`; state.notice = ''; }
  } catch (error) { state.error = error.message || 'Não foi possível concluir as ações em lote para planos.'; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeVoltarCatalogo = () => {
  if (state.editorDirty && !window.confirm('Há alterações não salvas nesta tabela. Deseja sair e descartá-las?')) return;
  state.editorDirty = false;
  if (window.history.state?.simsaudeCatalogEditorReturnPath) window.history.back();
  else context.navegarParaRota?.(catalogRootPath());
};
window.simsaudeEditarTabela = id => {
  if (!state.data.tables.some(table => table.id === id)) return;
  state.draft = null;
  navigateToTableEditor(`${encodeURIComponent(id)}/editar`);
};
window.simsaudeDuplicar = id => {
  const table = state.data.tables.find(item => item.id === id);
  if (!table) return;
  const plan = planFor(table); const operator = operatorFor(plan);
  state.draft = { ...draftFromTable(table), id: '', nome: `${table.nome || 'Tabela de preços'} (cópia)`, status: 'em_revisao', vigencia_inicio: new Date().toISOString().slice(0, 10), vigencia_fim: '', plano_id: '', operadora_id: plan.operadora_id || operator.id || '', operadora_nome: operator.nome || table.operadora_nome, plano_nome: plan.nome || table.plano_nome, modalidade: plan.modalidade || table.modalidade, coparticipacao: Boolean(table.coparticipacao), abrangencia: plan.abrangencia || table.abrangencia, codigo_interno: table.codigo_interno || '' };
  navigateToTableEditor('nova');
};
window.simsaudeSalvar = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (state.loading) return;
  const draft = draftFromForm(form);
  if (!draft.operadora_id || !draft.plano_id) {
    state.error = 'Selecione uma operadora e um plano para a tabela.';
    state.draft = draft;
    rerender();
    return;
  }
  const normalizedPriceGrids = Object.fromEntries(draft.acomodacoes.map(accommodation => [accommodation, normalizePriceGrid(draft.precos_por_acomodacao[accommodation] || {})]));
  if (Object.values(normalizedPriceGrids).some(grid => grid.invalid)) {
    state.error = 'Revise os preços: informe valores não negativos com no máximo duas casas decimais. Ex.: 123,45.';
    state.draft = draft;
    rerender();
    return;
  }
  draft.precos_por_acomodacao = { ...draft.precos_por_acomodacao, ...Object.fromEntries(Object.entries(normalizedPriceGrids).map(([accommodation, grid]) => [accommodation, grid.prices])) };
  draft.precos = draft.precos_por_acomodacao[draft.acomodacao] || {};
  const current = state.data.tables.find(item => item.id === draft.id);
  const previousPrices = draft.id ? Object.fromEntries(accommodationsFor(current).map(accommodation => [accommodation, bandsFor(draft.id, accommodation)])) : {};
  const individual = draft.tipo_contratacao === 'Individual';
  const countFilled = prices => AGE_BANDS.filter(band => String(prices?.[band] ?? '').trim() !== '').length;
  let validationMessage = '';
  if (!draft.acomodacoes.length || !draft.acomodacoes.includes(draft.acomodacao)) validationMessage = 'Mantenha a acomodação principal e selecione ao menos uma acomodação.';
  if (draft.status === 'vigente' && !draft.vigencia_inicio) validationMessage = 'Informe o início da vigência antes de ativar a tabela.';
  for (const accommodation of draft.acomodacoes) {
    const prices = draft.precos_por_acomodacao[accommodation] || {};
    const basePrices = individual ? prices.uma_vida : prices.geral;
    const extraPrices = individual ? prices.duas_ou_mais : {};
    if (!validationMessage && draft.status === 'vigente' && countFilled(basePrices) !== 10) validationMessage = `Preencha as dez faixas de ${accommodation} antes de ativar a tabela.`;
    if (!validationMessage && individual && countFilled(extraPrices) > 0 && countFilled(extraPrices) !== 10) validationMessage = `Para 2 ou mais vidas em ${accommodation}, preencha as dez faixas ou deixe a coluna vazia.`;
    const preservedRates = individual ? ['uma_vida', 'duas_ou_mais'] : ['geral'];
    if (!validationMessage && preservedRates.some(rule => AGE_BANDS.some(band => String(prices[rule]?.[band] ?? '').trim() === '' && previousPrices[accommodation]?.[rule]?.[band] != null))) validationMessage = `Um preço salvo de ${accommodation} não pode ser apagado; informe 0,00 para alterar o valor.`;
  }
  if (validationMessage) { state.error = validationMessage; state.draft = draft; rerender(); return; }
  const removedAccommodations = Object.entries(previousPrices).filter(([accommodation, prices]) => !draft.acomodacoes.includes(accommodation) && Object.values(prices).some(rule => Object.values(rule).some(value => value != null && value !== ''))).map(([accommodation]) => accommodation);
  if (removedAccommodations.length && !window.confirm(`Remover ${removedAccommodations.join(', ')} também excluirá os preços cadastrados para ${removedAccommodations.length === 1 ? 'essa acomodação' : 'essas acomodações'}. Continuar?`)) return;
  if (draft.status === 'vigente') {
    const norm = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
    const matchingPlan = state.data.plans.find(plan => plan.id === draft.plano_id) || state.data.plans.find(plan => norm(plan.nome) === norm(draft.plano_nome) && norm(plan.modalidade) === norm(draft.modalidade) && norm(plan.abrangencia) === norm(draft.abrangencia) && state.data.operators.some(operator => operator.id === plan.operadora_id && norm(operator.nome) === norm(draft.operadora_nome)));
    const overlap = matchingPlan && state.data.tables.some(table => table.id !== draft.id && table.plano_id === matchingPlan.id && norm(table.codigo_interno) === norm(draft.codigo_interno) && table.tipo_contratacao === draft.tipo_contratacao && accommodationsFor(table).some(accommodation => draft.acomodacoes.includes(accommodation)) && Boolean(table.coparticipacao) === Boolean(draft.coparticipacao) && table.status === 'vigente' && table.vigencia_inicio <= (draft.vigencia_fim || '9999-12-31') && (table.vigencia_fim || '9999-12-31') >= draft.vigencia_inicio);
    if (overlap && !window.confirm('Já existe uma tabela vigente para este plano e modalidade em período sobreposto. Deseja continuar mesmo assim?')) return;
  }
  if (draft.id && current?.status === 'vigente') draft.status = 'em_revisao';
  state.draft = draft; state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    const response = await chamarApi('saveSimuladorSaudeTable', draft);
    if (!response.ok) throw new Error(response.message);
    state.notice = draft.status === 'vigente' ? 'Tabela salva e validada como vigente.' : 'Tabela salva em revisão.';
    restoreCatalogRouteAfterSave(); await loadCatalog();
  } catch (error) { state.error = error.message; state.draft = draft; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeInativar = async id => { const message = state.editorDirty ? 'Há alterações não salvas. Descartá-las e inativar esta tabela?' : 'Inativar esta tabela? Ela deixará de ser usada em novas cotações.'; if (!window.confirm(message)) return; state.editorDirty = false; const response = await chamarApi('setSimuladorSaudeTableStatus', { id, status: 'inativo' }); if (!response.ok) { state.error = response.message; rerender(); return; } state.notice = 'Tabela inativada.'; restoreCatalogRouteAfterSave(); await loadCatalog(); };
window.simsaudeExcluir = async id => {
  if (state.loading || !context.pode?.('simulador_saude.catalogo', 'delete')) return;
  const table = state.data.tables.find(item => item.id === id);
  if (!table) return;
  const unsavedWarning = state.editorDirty ? ' As alterações ainda não salvas serão descartadas.' : '';
  if (!window.confirm(`Excluir a tabela “${table.nome}”? A exclusão é permanente e também removerá seus preços por faixa etária.${unsavedWarning}`)) return;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  try {
    const response = await chamarApi('deleteSimuladorSaudeTable', { id });
    if (!response.ok) throw new Error(response.message || 'Não foi possível excluir a tabela.');
    state.notice = 'Tabela excluída do catálogo.';
    if (state.editorRoute) restoreCatalogRouteAfterSave();
    else { state.draft = null; state.editorDirty = false; }
    await loadCatalog();
  } catch (error) {
    state.error = error.message || 'Não foi possível excluir a tabela.';
  } finally {
    state.loading = false; rerender();
  }
};
window.simsaudeAcaoEmLoteTabela = async action => {
  if (state.loading || !['inativar', 'excluir'].includes(action)) return;
  const canDelete = Boolean(context.pode?.('simulador_saude.catalogo', 'delete'));
  const canUpdate = Boolean(context.pode?.('simulador_saude.catalogo', 'update'));
  if ((action === 'excluir' && !canDelete) || (action === 'inativar' && !canUpdate)) return;
  const tables = state.selectedTableIds.map(id => state.data.tables.find(table => table.id === id)).filter(Boolean);
  const targets = action === 'inativar' ? tables.filter(table => table.status !== 'inativo') : tables;
  if (!targets.length) { state.notice = 'As tabelas selecionadas já estão inativas.'; state.error = ''; rerender(); return; }
  const verb = action === 'excluir' ? 'excluir permanentemente' : 'inativar';
  const detail = action === 'excluir' ? ' A exclusão também removerá os preços por faixa etária.' : ' Elas deixarão de ser usadas em novas cotações.';
  if (!window.confirm(`Deseja ${verb} ${targets.length} tabela(s) selecionada(s)?${detail}`)) return;
  state.loading = true; state.error = ''; state.notice = ''; rerender();
  const completedIds = []; const failures = [];
  try {
    for (const table of targets) {
      const response = action === 'excluir'
        ? await chamarApi('deleteSimuladorSaudeTable', { id: table.id })
        : await chamarApi('setSimuladorSaudeTableStatus', { id: table.id, status: 'inativo' });
      if (response.ok) completedIds.push(table.id);
      else failures.push(`${table.nome}: ${response.message || 'operação não concluída'}`);
    }
    state.selectedTableIds = state.selectedTableIds.filter(id => !completedIds.includes(id));
    state.draft = null;
    await loadCatalog();
    state.notice = `${completedIds.length} tabela(s) ${action === 'excluir' ? 'excluída(s)' : 'inativada(s)'}.`;
    if (failures.length) { state.error = `${completedIds.length} concluída(s); ${failures.length} falha(s): ${failures.join(' · ')}`; state.notice = ''; }
  } catch (error) { state.error = error.message || 'Não foi possível concluir as ações em lote para tabelas.'; }
  finally { state.loading = false; rerender(); }
};
window.simsaudeVerHistorico = id => { state.historyId = id; rerender(); };
window.simsaudeFecharHistorico = () => { state.historyId = ''; rerender(); };
window.simsaudeFecharImportacao = () => { if (state.loading) return; state.importPreview = null; rerender(); };
window.simsaudeSelecionarArquivo = async event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return; state.error = ''; try { state.importPreview = csvRowsToPreview(await file.text(), file.name); } catch (error) { state.error = error.message || 'Não foi possível ler o CSV.'; } rerender(); };
window.simsaudeImportarConfirmado = async () => { const preview = state.importPreview; if (!preview?.validRows.length || state.loading) return; state.loading = true; state.error = ''; rerender(); const failed = []; let imported = 0; try { for (const row of preview.validRows) { const response = await chamarApi('saveSimuladorSaudeTable', row); if (response.ok) imported += 1; else failed.push(`linha ${row.line}: ${response.message}`); } } finally { state.loading = false; state.importPreview = null; } state.notice = `${imported} tabela(s) importada(s).${failed.length ? ` ${failed.length} falha(s): ${failed.join(' · ')}` : ''}`; await loadCatalog(); };
window.simsaudeFecharAviso = () => { state.error = ''; state.notice = ''; rerender(); };
window.simsaudeRecarregar = () => loadCatalog();
window.simsaudeBuscar = event => { event.preventDefault(); const values = new FormData(event.currentTarget); state.search = values.get('search') || ''; state.page = 1; rerender(); };
window.simsaudeAbrirFiltros = () => { state.filterModalOpen = true; rerender(); document.getElementById('simsaude-filter-modal')?.querySelector('select')?.focus(); };
window.simsaudeFecharFiltros = event => { if (event && event.target !== event.currentTarget) return; state.filterModalOpen = false; rerender(); };
window.simsaudeFiltrar = event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); Object.assign(state, { operator: values.operator || '', modality: values.modality || '', accommodation: values.accommodation || '', copay: values.copay || '', date: values.date || '', status: values.status || '', filterModalOpen: false, page: 1 }); rerender(); };
window.simsaudeLimparFiltros = () => { Object.assign(state, { search: '', operator: '', modality: '', accommodation: '', copay: '', date: '', status: '', filterModalOpen: false, page: 1 }); rerender(); };
window.simsaudeMudarPagina = value => { state.pageSize = Number(value) || 10; state.page = 1; rerender(); };
window.simsaudePagina = delta => { const pages = Math.max(1, Math.ceil(filteredTables().length / state.pageSize)); state.page = Math.min(pages, Math.max(1, state.page + delta)); rerender(); };
window.simsaudeExportar = () => {
  const records = filteredTables();
  const bandHeaders = ACCOMMODATIONS.flatMap(accommodation => AGE_BANDS.flatMap(band => [`${accommodation} ${band} 1 vida`, `${accommodation} ${band} 2 ou mais vidas`, `${accommodation} ${band} empresarial`]));
  const header = ['Operadora', 'Plano', 'Modalidade', 'Acomodacao', 'Acomodacoes', 'Coparticipacao', 'Abrangencia', 'Tabela', 'Vigencia inicio', 'Vigencia fim', 'Tipo contratacao', 'Codigo interno', 'Observacoes', 'Status', ...bandHeaders, 'Atualizado em'];
  const csv = [header, ...records.map(table => {
    const plan = planFor(table); const operator = operatorFor(plan); const accommodations = accommodationsFor(table); const individual = table.tipo_contratacao === 'Individual';
    const values = ACCOMMODATIONS.flatMap(accommodation => {
      const prices = bandsFor(table.id, accommodation);
      return AGE_BANDS.flatMap(band => [individual ? prices.uma_vida?.[band] ?? '' : '', individual ? prices.duas_ou_mais?.[band] ?? '' : '', individual ? '' : prices.geral?.[band] ?? '']);
    });
    return [operator.nome, plan.nome, plan.modalidade, table.acomodacao, accommodations.join('|'), table.coparticipacao ? 'Sim' : 'Não', plan.abrangencia, table.nome, table.vigencia_inicio, table.vigencia_fim || '', table.tipo_contratacao || 'Empresarial (PJ)', table.codigo_interno || '', table.observacoes || '', displayStatus(table), ...values, table.updated_at];
  })].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'catalogo-planos-saude.csv'; anchor.click(); URL.revokeObjectURL(url);
};

document.addEventListener('keydown', event => { if (event.key !== 'Escape') return; if (state.importPreview) window.simsaudeFecharImportacao(); else if (state.historyId) window.simsaudeFecharHistorico(); else if (state.filterModalOpen) window.simsaudeFecharFiltros(); });
