// CRM 2.0 — Fluxo sequencial de cadastro.
// Fases 6.1 a 6.8: fluxo, PF, PJ, Pedido, validações e permissões, totalmente mockados.
import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

const CRM2_CADASTRO_DRAFT_STORAGE_KEY = 'crm2-cadastro-sequencial-draft-v1';

const crm2CadastroState = {
  canView: false,
  canCreate: false,
  canEdit: false,
  currentStep: 'pf',
  pfMode: 'lookup',
  pfSearch: '',
  pfPage: 1,
  pfPerPage: 5,
  pfSelectedId: '',
  pfDraft: {},
  pfErrors: {},
  pfListState: 'normal',
  pjMode: 'lookup',
  pjSearch: '',
  pjPage: 1,
  pjPerPage: 5,
  pjListState: 'normal',
  pjSelectedId: '',
  pjSkipped: false,
  vinculoTipo: '',
  vinculoError: '',
  pjDraft: {},
  pjErrors: {},
  pedidoDraft: {},
  pedidoErrors: {},
  pedidoCreated: null,
  dirty: false,
  draftSavedAt: '',
  draftAvailable: false,
  message: ''
};

const crm2CadastroCreatedPfs = [];
const crm2CadastroCreatedPjs = [];

function crm2CadastroReadStoredDraft() {
  try {
    const raw = window.localStorage.getItem(CRM2_CADASTRO_DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function crm2CadastroHasStoredDraft() {
  const draft = crm2CadastroReadStoredDraft();
  return Boolean(draft && draft.savedAt);
}

function crm2CadastroMarkDirty() {
  crm2CadastroState.dirty = true;
  crm2CadastroState.draftSavedAt = '';
}

function crm2CadastroSerializeDraft() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    currentStep: crm2CadastroState.currentStep,
    pfMode: crm2CadastroState.pfMode,
    pfSearch: crm2CadastroState.pfSearch,
    pfSelectedId: crm2CadastroState.pfSelectedId,
    pfDraft: crm2CadastroState.pfDraft,
    pjMode: crm2CadastroState.pjMode,
    pjSearch: crm2CadastroState.pjSearch,
    pjSelectedId: crm2CadastroState.pjSelectedId,
    pjSkipped: crm2CadastroState.pjSkipped,
    vinculoTipo: crm2CadastroState.vinculoTipo,
    pjDraft: crm2CadastroState.pjDraft,
    pedidoDraft: crm2CadastroState.pedidoDraft,
    pedidoCreated: crm2CadastroState.pedidoCreated,
    createdPfs: crm2CadastroCreatedPfs,
    createdPjs: crm2CadastroCreatedPjs
  };
}

function crm2CadastroRestoreStoredDraft() {
  const draft = crm2CadastroReadStoredDraft();
  if (!draft) return false;
  crm2CadastroState.currentStep = ['pf', 'pj', 'pedido'].includes(draft.currentStep) ? draft.currentStep : 'pf';
  crm2CadastroState.pfMode = draft.pfMode === 'create' ? 'create' : 'lookup';
  crm2CadastroState.pfSearch = String(draft.pfSearch || '');
  crm2CadastroState.pfSelectedId = String(draft.pfSelectedId || '');
  crm2CadastroState.pfDraft = { ...(draft.pfDraft || {}) };
  crm2CadastroState.pjMode = draft.pjMode === 'create' ? 'create' : 'lookup';
  crm2CadastroState.pjSearch = String(draft.pjSearch || '');
  crm2CadastroState.pjSelectedId = String(draft.pjSelectedId || '');
  crm2CadastroState.pjSkipped = Boolean(draft.pjSkipped);
  crm2CadastroState.vinculoTipo = String(draft.vinculoTipo || '');
  crm2CadastroState.vinculoError = '';
  crm2CadastroState.pjDraft = { ...(draft.pjDraft || {}) };
  crm2CadastroState.pedidoDraft = { ...(draft.pedidoDraft || {}) };
  crm2CadastroState.pedidoCreated = draft.pedidoCreated || null;
  crm2CadastroCreatedPfs.splice(0, crm2CadastroCreatedPfs.length, ...(Array.isArray(draft.createdPfs) ? draft.createdPfs : []));
  crm2CadastroCreatedPjs.splice(0, crm2CadastroCreatedPjs.length, ...(Array.isArray(draft.createdPjs) ? draft.createdPjs : []));
  crm2CadastroState.draftSavedAt = String(draft.savedAt || '');
  crm2CadastroState.draftAvailable = false;
  crm2CadastroState.dirty = false;
  crm2CadastroState.message = 'Rascunho recuperado do armazenamento local do navegador.';
  return true;
}

function crm2CadastroFormatSavedAt(value = '') {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function escapeHtmlCadastro(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttrCadastro(value = '') {
  return escapeHtmlCadastro(value).replaceAll('`', '&#096;');
}

function normalizeCadastro(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsCadastro(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

function maskCpfCadastro(value = '') {
  return digitsCadastro(value).slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskCnpjCadastro(value = '') {
  return digitsCadastro(value).slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function validateCnpjCadastro(value = '') {
  const cnpj = digitsCadastro(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calculate = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(cnpj[12]) && calculate(13) === Number(cnpj[13]);
}

function maskPhoneCadastro(value = '') {
  const digits = digitsCadastro(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function validateCpfCadastro(value = '') {
  const cpf = digitsCadastro(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calculate = (length) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10]);
}

function formatDateCadastro(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function currentCadastroRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const index = segments.findIndex((segment, position) => segment === 'painel-ar' && segments[position + 1] === '200');
  return { active: index >= 0 && segments[index + 2] === 'cadastro' };
}

function cadastroRoutePath() {
  const hasHub = window.location.pathname.split('/').filter(Boolean)[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/200/cadastro`;
}

function navigateCadastro() {
  window.history.pushState({}, '', cadastroRoutePath());
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => window.crm2CadastroMount?.(), 0);
}

function navigateCrm2Overview() {
  if (typeof window.navegarParaCrm2Rota === 'function') {
    window.navegarParaCrm2Rota('200');
    return;
  }
  window.history.pushState({}, '', cadastroRoutePath().replace('/200/cadastro', '/200'));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function permissionsCadastro() {
  const context = obterContextoAcessoHub();
  const permissions = context?.permissions || {};
  const resolve = (action) => hasPermission(permissions, 'painel_ar', action);
  crm2CadastroState.canView = resolve('view');
  crm2CadastroState.canCreate = resolve('create') || resolve('update');
  crm2CadastroState.canEdit = resolve('update');
}

function getMockPfsCadastro() {
  const existing = typeof window.crm2PfGetMockItems === 'function'
    ? window.crm2PfGetMockItems()
    : [];
  return [...existing, ...crm2CadastroCreatedPfs];
}

function getSelectedPfCadastro() {
  return getMockPfsCadastro().find((item) => item.id === crm2CadastroState.pfSelectedId) || null;
}

function getMockPjsCadastro() {
  const existing = typeof window.crm2PjGetMockItems === 'function'
    ? window.crm2PjGetMockItems()
    : [];
  return [...existing, ...crm2CadastroCreatedPjs];
}

function getSelectedPjCadastro() {
  return getMockPjsCadastro().find((item) => item.id === crm2CadastroState.pjSelectedId) || null;
}

const CRM2_CADASTRO_VINCULO_TYPES = ['Titular', 'Representante legal', 'Contador', 'Outros'];

function validatePjFlowCadastro() {
  crm2CadastroState.vinculoError = '';
  if (crm2CadastroState.pjSkipped) return true;
  const company = getSelectedPjCadastro();
  if (!company) {
    crm2CadastroState.message = 'Selecione uma Pessoa Jurídica ou continue sem PJ.';
    return false;
  }
  if (!CRM2_CADASTRO_VINCULO_TYPES.includes(crm2CadastroState.vinculoTipo)) {
    crm2CadastroState.vinculoError = 'Informe o tipo de vínculo com a Pessoa Jurídica.';
    crm2CadastroState.message = 'Complete o vínculo antes de avançar.';
    return false;
  }
  if (crm2CadastroState.vinculoTipo === 'Titular') {
    const hasActiveTitular = (company.pessoasVinculadas || []).some((pessoa) => normalizeCadastro(pessoa.status || '') === 'ativo' && normalizeCadastro(pessoa.tipo || '') === 'titular');
    if (hasActiveTitular) {
      crm2CadastroState.vinculoError = 'Esta Pessoa Jurídica já possui um titular ativo.';
      crm2CadastroState.message = 'O vínculo escolhido é incompatível com a situação atual da empresa.';
      return false;
    }
  }
  return true;
}

function canContinuePjCadastro() {
  return crm2CadastroState.pjSkipped || Boolean(crm2CadastroState.pjSelectedId && crm2CadastroState.vinculoTipo);
}

function filteredPfsCadastro() {
  const search = normalizeCadastro(crm2CadastroState.pfSearch);
  const compactSearch = digitsCadastro(crm2CadastroState.pfSearch);
  if (!search && !compactSearch) return getMockPfsCadastro();
  return getMockPfsCadastro().filter((item) => {
    const textValues = [item.nome, item.email, item.origem, item.parceiro].map(normalizeCadastro);
    const documentValues = [item.cpf, maskCpfCadastro(item.cpf)].map(digitsCadastro);
    return textValues.some((value) => value.includes(search))
      || documentValues.some((value) => value.includes(compactSearch));
  });
}

function filteredPjsCadastro() {
  const search = normalizeCadastro(crm2CadastroState.pjSearch);
  const compactSearch = digitsCadastro(crm2CadastroState.pjSearch);
  if (!search && !compactSearch) return getMockPjsCadastro();
  return getMockPjsCadastro().filter((item) => {
    const textValues = [item.razaoSocial, item.nomeFantasia, item.endereco].map(normalizeCadastro);
    const documentValues = [item.cnpj, maskCnpjCadastro(item.cnpj)].map(digitsCadastro);
    return textValues.some((value) => value.includes(search))
      || documentValues.some((value) => value.includes(compactSearch));
  });
}

function renderStateCadastro() {
  const copy = {
    loading: ['Carregando pessoas físicas...', 'Estado de carregamento simulado para validação do fluxo.'],
    error: ['Não foi possível carregar as pessoas físicas.', 'Erro simulado. Nenhuma integração externa foi acionada.'],
    empty: ['Nenhuma pessoa física cadastrada.', 'A base mockada está vazia para esta etapa.']
  }[crm2CadastroState.pfListState];
  if (!copy) return '';
  return `<div class="crm2-pessoas-state crm2-cadastro-state" role="${crm2CadastroState.pfListState === 'error' ? 'alert' : 'status'}" ${crm2CadastroState.pfListState === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2CadastroSetPfState('normal')">Voltar à busca</button></div>`;
}

function renderStepIndicatorCadastro() {
  const pjReady = crm2CadastroState.pjSkipped || Boolean(crm2CadastroState.pjSelectedId && crm2CadastroState.vinculoTipo);
  const steps = [
    ['pf', '1', 'Pessoa Física', 'Concluída', true],
    ['pj', '2', 'Pessoa Jurídica', crm2CadastroState.pjSkipped ? 'Sem PJ' : 'Opcional', Boolean(crm2CadastroState.pfSelectedId)],
    ['pedido', '3', 'Pedido', crm2CadastroState.pedidoCreated ? 'Criado' : 'Obrigatório', Boolean(crm2CadastroState.pfSelectedId && pjReady)]
  ];
  return `<nav class="crm2-cadastro-steps" aria-label="Etapas do cadastro sequencial">${steps.map(([id, number, label, status, enabled]) => `<button class="crm2-cadastro-step ${id === crm2CadastroState.currentStep ? 'is-active' : ''} ${enabled ? '' : 'is-disabled'}" type="button" ${id === crm2CadastroState.currentStep ? 'aria-current="step"' : ''} ${enabled ? `onclick="crm2CadastroGoToStep('${id}')"` : 'disabled'}><span class="crm2-cadastro-step-number">${number}</span><span><strong>${label}</strong><small>${status}</small></span></button>`).join('')}</nav>`;
}

function renderPfSummaryCadastro(person) {
  if (!person) return '';
  return `<aside class="crm2-cadastro-selected" aria-labelledby="crm2-cadastro-selected-title"><div><span class="ar-crm-phase1-kicker">REGISTRO SELECIONADO</span><h3 id="crm2-cadastro-selected-title">${escapeHtmlCadastro(person.nome)}</h3><p>CPF ${escapeHtmlCadastro(maskCpfCadastro(person.cpf))} · ${escapeHtmlCadastro(person.email || 'E-mail não informado')}</p></div><button class="secondary-btn" type="button" onclick="crm2CadastroClearPfSelection()">Trocar pessoa</button></aside>`;
}

function renderPfListCadastro() {
  const filtered = filteredPfsCadastro();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2CadastroState.pfPerPage));
  crm2CadastroState.pfPage = Math.min(Math.max(1, crm2CadastroState.pfPage), totalPages);
  const start = (crm2CadastroState.pfPage - 1) * crm2CadastroState.pfPerPage;
  const pageItems = filtered.slice(start, start + crm2CadastroState.pfPerPage);
  const selected = getSelectedPfCadastro();
  const hasSearch = Boolean(crm2CadastroState.pfSearch);

  return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pf-title">
    ${selected ? renderPfSummaryCadastro(selected) : ''}
    <div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">ETAPA 1 DE 3</span><h2 id="crm2-cadastro-pf-title">Pessoa Física</h2><p>Selecione uma pessoa já cadastrada ou inclua uma nova para iniciar o atendimento.</p></div>${crm2CadastroState.canCreate ? '<button class="save-btn" type="button" onclick="crm2CadastroOpenPfCreate()">+ Incluir nova PF</button>' : ''}</div>
    <form class="crm2-cadastro-search" role="search" onsubmit="crm2CadastroApplyPfSearch(event)" aria-label="Buscar pessoa física"><label for="crm2-cadastro-pf-search"><span>Buscar por nome completo, nome social ou CPF</span><input id="crm2-cadastro-pf-search" class="config-input" type="search" value="${escapeAttrCadastro(crm2CadastroState.pfSearch)}" placeholder="Ex.: Mariana Alves ou 123.456.789-09" autocomplete="off"></label><button class="save-btn" type="submit">Buscar</button><button class="secondary-btn" type="button" onclick="crm2CadastroClearPfSearch()" ${hasSearch ? '' : 'disabled'}>Limpar</button></form>
    ${crm2CadastroState.pfListState !== 'normal' ? renderStateCadastro() : pageItems.length ? `<div class="crm2-cadastro-results"><div class="crm2-cadastro-results-heading"><strong>${filtered.length} resultado(s)</strong><span>Busca sem diferenciação de acentos, maiúsculas ou máscara de CPF.</span></div><div class="crm2-cadastro-table-wrap"><table class="crm2-cadastro-table"><caption class="crm2-pessoas-table-caption">Pessoas físicas disponíveis para o cadastro sequencial</caption><thead><tr><th scope="col">Nome</th><th scope="col">CPF</th><th scope="col">Contato</th><th scope="col">Situação</th><th scope="col">Ação</th></tr></thead><tbody>${pageItems.map((item) => `<tr class="${item.id === crm2CadastroState.pfSelectedId ? 'is-selected' : ''}"><td><strong>${escapeHtmlCadastro(item.nome)}</strong>${item.id.startsWith('fluxo-pf-') ? '<small class="crm2-cadastro-new-badge">Novo no fluxo</small>' : ''}</td><td>${escapeHtmlCadastro(maskCpfCadastro(item.cpf))}</td><td><span>${escapeHtmlCadastro(item.email || 'E-mail não informado')}</span><small>${escapeHtmlCadastro(item.telefone || 'Telefone não informado')}</small></td><td><span class="crm2-pessoas-status ${Array.isArray(item.pedidos) && item.pedidos.length ? 'is-cliente-ativo' : ''}">${Array.isArray(item.pedidos) && item.pedidos.length ? 'Cliente ativo' : 'Cliente inativo'}</span></td><td><button class="secondary-btn" type="button" onclick="crm2CadastroSelectPf('${escapeAttrCadastro(item.id)}')">${item.id === crm2CadastroState.pfSelectedId ? 'Selecionada' : 'Selecionar'}</button></td></tr>`).join('')}</tbody></table></div><div class="crm2-cadastro-pagination" aria-label="Paginação de pessoas físicas"><span>Página <strong>${crm2CadastroState.pfPage}</strong> de <strong>${totalPages}</strong></span><div><button class="secondary-btn" type="button" onclick="crm2CadastroSetPfPage(${crm2CadastroState.pfPage - 1})" ${crm2CadastroState.pfPage <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2CadastroSetPfPage(${crm2CadastroState.pfPage + 1})" ${crm2CadastroState.pfPage >= totalPages ? 'disabled' : ''}>Próxima</button></div></div></div>` : `<div class="crm2-pessoas-state crm2-cadastro-state" role="status"><strong>${getMockPfsCadastro().length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa física cadastrada.'}</strong><span>${getMockPfsCadastro().length ? 'Ajuste a busca ou limpe o filtro para consultar outros registros.' : 'A lista mockada ainda não possui pessoas físicas.'}</span><button class="secondary-btn" type="button" onclick="crm2CadastroClearPfSearch()" ${hasSearch ? '' : 'disabled'}>Limpar busca</button></div>`}
  </section>`;
}

function renderPfFieldCadastro({ label, name, value = '', type = 'text', required = false, wide = false }) {
  const error = crm2CadastroState.pfErrors[name] || '';
  const id = `crm2-cadastro-pf-${name}`;
  const safeValue = name === 'cpf' ? maskCpfCadastro(value) : name === 'telefone' ? maskPhoneCadastro(value) : value;
  const inputEvent = name === 'cpf'
    ? `oninput="crm2CadastroMaskCpf(this); crm2CadastroTrackField('pf', this)"`
    : name === 'telefone'
      ? `oninput="crm2CadastroMaskPhone(this); crm2CadastroTrackField('pf', this)"`
      : `oninput="crm2CadastroTrackField('pf', this)"`;
  const changeEvent = `onchange="crm2CadastroTrackField('pf', this)"`;
  return `<label class="${wide ? 'is-wide ' : ''}${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${inputEvent}>${escapeHtmlCadastro(safeValue)}</textarea>` : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrCadastro(safeValue)}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${inputEvent} ${changeEvent}>`}${error ? `<small class="crm2-field-error">${escapeHtmlCadastro(error)}</small>` : ''}</label>`;
}

function renderPfCreateCadastro() {
  const values = crm2CadastroState.pfDraft;
  return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pf-create-title"><div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">ETAPA 1 DE 3 · NOVO REGISTRO</span><h2 id="crm2-cadastro-pf-create-title">Cadastrar Pessoa Física</h2><p>O registro será criado somente no estado mockado do fluxo.</p></div></div>${crm2CadastroState.message ? `<p class="admin-message" role="status">${escapeHtmlCadastro(crm2CadastroState.message)}</p>` : ''}<form class="crm2-cadastro-form" onsubmit="crm2CadastroSavePf(event)" novalidate><div class="hub-form-section"><div class="hub-form-section-title"><strong>Dados básicos</strong><span>Campos obrigatórios marcados com *</span></div><div class="hub-form-grid">${renderPfFieldCadastro({ label: 'Nome completo ou nome social', name: 'nome', value: values.nome, required: true })}${renderPfFieldCadastro({ label: 'CPF', name: 'cpf', value: values.cpf, required: true })}${renderPfFieldCadastro({ label: 'E-mail', name: 'email', value: values.email, type: 'email', required: true })}${renderPfFieldCadastro({ label: 'Telefone', name: 'telefone', value: values.telefone })}${renderPfFieldCadastro({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}${renderPfFieldCadastro({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}</div></div><div class="hub-form-screen-actions"><button class="secondary-btn" type="button" onclick="crm2CadastroCancelPfCreate()">Voltar para busca</button><button class="save-btn" type="submit" ${crm2CadastroState.canCreate ? '' : 'disabled'}>Salvar e selecionar</button></div></form></section>`;
}

function renderPjListStateCadastro() {
  const copy = {
    loading: ['Carregando pessoas jurídicas...', 'Estado de carregamento simulado para validação do fluxo.'],
    error: ['Não foi possível carregar as pessoas jurídicas.', 'Erro simulado. Nenhuma integração externa foi acionada.'],
    empty: ['Nenhuma pessoa jurídica cadastrada.', 'A base mockada está vazia para esta etapa.']
  }[crm2CadastroState.pjListState];
  if (!copy) return '';
  return `<div class="crm2-pessoas-state crm2-cadastro-state" role="${crm2CadastroState.pjListState === 'error' ? 'alert' : 'status'}" ${crm2CadastroState.pjListState === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2CadastroSetPjState('normal')">Voltar à busca</button></div>`;
}

function renderPjSummaryCadastro(company) {
  if (!company) return '';
  return `<aside class="crm2-cadastro-selected" aria-labelledby="crm2-cadastro-selected-pj-title"><div><span class="ar-crm-phase1-kicker">EMPRESA SELECIONADA</span><h3 id="crm2-cadastro-selected-pj-title">${escapeHtmlCadastro(company.razaoSocial)}</h3><p>CNPJ ${escapeHtmlCadastro(maskCnpjCadastro(company.cnpj))} · ${escapeHtmlCadastro(company.endereco || 'Endereço não informado')}</p>${crm2CadastroState.vinculoTipo ? `<small>Vínculo: ${escapeHtmlCadastro(crm2CadastroState.vinculoTipo)}</small>` : ''}</div><button class="secondary-btn" type="button" onclick="crm2CadastroClearPjSelection()">Trocar empresa</button></aside>`;
}

function renderVinculoCadastro() {
  if (!getSelectedPjCadastro()) return '';
  return `<div class="crm2-cadastro-vinculo-field ${crm2CadastroState.vinculoError ? 'has-error' : ''}"><label for="crm2-cadastro-vinculo-tipo"><span>Tipo de vínculo com a PJ *</span><select id="crm2-cadastro-vinculo-tipo" class="config-input" onchange="crm2CadastroSetVinculoTipo(this.value)" aria-invalid="${crm2CadastroState.vinculoError ? 'true' : 'false'}"><option value="">Selecione o vínculo</option>${CRM2_CADASTRO_VINCULO_TYPES.map((tipo) => `<option value="${escapeAttrCadastro(tipo)}" ${crm2CadastroState.vinculoTipo === tipo ? 'selected' : ''}>${escapeHtmlCadastro(tipo)}</option>`).join('')}</select>${crm2CadastroState.vinculoError ? `<small class="crm2-field-error">${escapeHtmlCadastro(crm2CadastroState.vinculoError)}</small>` : ''}</label></div>`;
}

function renderPjListCadastro() {
  const filtered = filteredPjsCadastro();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2CadastroState.pjPerPage));
  crm2CadastroState.pjPage = Math.min(Math.max(1, crm2CadastroState.pjPage), totalPages);
  const start = (crm2CadastroState.pjPage - 1) * crm2CadastroState.pjPerPage;
  const pageItems = filtered.slice(start, start + crm2CadastroState.pjPerPage);
  const selected = getSelectedPjCadastro();
  const hasSearch = Boolean(crm2CadastroState.pjSearch);

  return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pj-title">
    ${selected ? renderPjSummaryCadastro(selected) : ''}
    <div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">ETAPA 2 DE 3 · OPCIONAL</span><h2 id="crm2-cadastro-pj-title">Pessoa Jurídica</h2><p>Vincule uma empresa existente, cadastre uma nova ou continue sem Pessoa Jurídica.</p></div>${crm2CadastroState.canCreate ? '<button class="save-btn" type="button" onclick="crm2CadastroOpenPjCreate()">+ Incluir nova PJ</button>' : ''}</div>
    <form class="crm2-cadastro-search" role="search" onsubmit="crm2CadastroApplyPjSearch(event)" aria-label="Buscar pessoa jurídica"><label for="crm2-cadastro-pj-search"><span>Buscar por razão social ou CNPJ</span><input id="crm2-cadastro-pj-search" class="config-input" type="search" value="${escapeAttrCadastro(crm2CadastroState.pjSearch)}" placeholder="Ex.: Transmares ou 04.252.011/0001-10" autocomplete="off"></label><button class="save-btn" type="submit">Buscar</button><button class="secondary-btn" type="button" onclick="crm2CadastroClearPjSearch()" ${hasSearch ? '' : 'disabled'}>Limpar</button></form>
    ${crm2CadastroState.pjListState !== 'normal' ? renderPjListStateCadastro() : pageItems.length ? `<div class="crm2-cadastro-results"><div class="crm2-cadastro-results-heading"><strong>${filtered.length} resultado(s)</strong><span>Busca sem diferenciação de acentos, maiúsculas ou máscara de CNPJ.</span></div><div class="crm2-cadastro-table-wrap"><table class="crm2-cadastro-table"><caption class="crm2-pessoas-table-caption">Pessoas jurídicas disponíveis para o cadastro sequencial</caption><thead><tr><th scope="col">Razão social</th><th scope="col">CNPJ</th><th scope="col">Endereço</th><th scope="col">Situação</th><th scope="col">Ação</th></tr></thead><tbody>${pageItems.map((item) => `<tr class="${item.id === crm2CadastroState.pjSelectedId ? 'is-selected' : ''}"><td><strong>${escapeHtmlCadastro(item.razaoSocial)}</strong>${item.id.startsWith('fluxo-pj-') ? '<small class="crm2-cadastro-new-badge">Nova no fluxo</small>' : ''}</td><td>${escapeHtmlCadastro(maskCnpjCadastro(item.cnpj))}</td><td>${escapeHtmlCadastro(item.endereco || 'Endereço não informado')}</td><td><span class="crm2-pessoas-status ${Array.isArray(item.pedidos) && item.pedidos.length ? 'is-cliente-ativo' : ''}">${Array.isArray(item.pedidos) && item.pedidos.length ? 'Empresa ativa' : 'Empresa inativa'}</span></td><td><button class="secondary-btn" type="button" onclick="crm2CadastroSelectPj('${escapeAttrCadastro(item.id)}')">${item.id === crm2CadastroState.pjSelectedId ? 'Selecionada' : 'Selecionar'}</button></td></tr>`).join('')}</tbody></table></div><div class="crm2-cadastro-pagination" aria-label="Paginação de pessoas jurídicas"><span>Página <strong>${crm2CadastroState.pjPage}</strong> de <strong>${totalPages}</strong></span><div><button class="secondary-btn" type="button" onclick="crm2CadastroSetPjPage(${crm2CadastroState.pjPage - 1})" ${crm2CadastroState.pjPage <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2CadastroSetPjPage(${crm2CadastroState.pjPage + 1})" ${crm2CadastroState.pjPage >= totalPages ? 'disabled' : ''}>Próxima</button></div></div></div>` : `<div class="crm2-pessoas-state crm2-cadastro-state" role="status"><strong>${getMockPjsCadastro().length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa jurídica cadastrada.'}</strong><span>${getMockPjsCadastro().length ? 'Ajuste a busca ou limpe o filtro para consultar outros registros.' : 'A lista mockada ainda não possui pessoas jurídicas.'}</span><button class="secondary-btn" type="button" onclick="crm2CadastroClearPjSearch()" ${hasSearch ? '' : 'disabled'}>Limpar busca</button></div>`}
    ${renderVinculoCadastro()}<div class="crm2-cadastro-optional-choice"><span>Não há uma empresa para vincular neste momento?</span><button class="secondary-btn" type="button" onclick="crm2CadastroSkipPj()">Continuar sem Pessoa Jurídica</button></div>
  </section>`;
}

function renderPjFieldCadastro({ label, name, value = '', type = 'text', required = false, wide = false }) {
  const error = crm2CadastroState.pjErrors[name] || '';
  const id = `crm2-cadastro-pj-${name}`;
  const safeValue = name === 'cnpj' ? maskCnpjCadastro(value) : value;
  const inputEvent = name === 'cnpj'
    ? `oninput="crm2CadastroMaskCnpj(this); crm2CadastroTrackField('pj', this)"`
    : `oninput="crm2CadastroTrackField('pj', this)"`;
  const changeEvent = `onchange="crm2CadastroTrackField('pj', this)"`;
  return `<label class="${wide ? 'is-wide ' : ''}${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${inputEvent}>${escapeHtmlCadastro(safeValue)}</textarea>` : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrCadastro(safeValue)}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${inputEvent} ${changeEvent}>`}${error ? `<small class="crm2-field-error">${escapeHtmlCadastro(error)}</small>` : ''}</label>`;
}

function renderPjCreateCadastro() {
  const values = crm2CadastroState.pjDraft;
  return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pj-create-title"><div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">ETAPA 2 DE 3 · NOVO REGISTRO</span><h2 id="crm2-cadastro-pj-create-title">Cadastrar Pessoa Jurídica</h2><p>A empresa será criada somente no estado mockado do fluxo.</p></div></div>${crm2CadastroState.message ? `<p class="admin-message" role="status">${escapeHtmlCadastro(crm2CadastroState.message)}</p>` : ''}<form class="crm2-cadastro-form" onsubmit="crm2CadastroSavePj(event)" novalidate><div class="hub-form-section"><div class="hub-form-section-title"><strong>Dados básicos da empresa</strong><span>Campos obrigatórios marcados com *</span></div><div class="hub-form-grid">${renderPjFieldCadastro({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true })}${renderPjFieldCadastro({ label: 'CNPJ', name: 'cnpj', value: values.cnpj, required: true })}${renderPjFieldCadastro({ label: 'Endereço', name: 'endereco', value: values.endereco, wide: true })}${renderPjFieldCadastro({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}</div></div><div class="hub-form-screen-actions"><button class="secondary-btn" type="button" onclick="crm2CadastroCancelPjCreate()">Voltar para busca</button><button class="save-btn" type="submit" ${crm2CadastroState.canCreate ? '' : 'disabled'}>Salvar e selecionar</button></div></form></section>`;
}

function renderPedidoFieldCadastro({ label, name, value = '', type = 'text', required = false, wide = false, options = [] }) {
  const error = crm2CadastroState.pedidoErrors[name] || '';
  const id = `crm2-cadastro-pedido-${name}`;
  const control = options.length
    ? `<select id="${id}" class="config-input" name="${name}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}"><option value="">Selecione</option>${options.map((option) => `<option value="${escapeAttrCadastro(option)}" ${option === value ? 'selected' : ''}>${escapeHtmlCadastro(option)}</option>`).join('')}</select>`
    : type === 'textarea'
      ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}">${escapeHtmlCadastro(value)}</textarea>`
      : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrCadastro(value)}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}">`;
  const trackEvent = `oninput="crm2CadastroTrackField('pedido', this)" onchange="crm2CadastroTrackField('pedido', this)"`;
  return `<label class="${wide ? 'is-wide ' : ''}${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span>${control.replace('>', ` ${trackEvent}>`)}${error ? `<small class="crm2-field-error">${escapeHtmlCadastro(error)}</small>` : ''}</label>`;
}

function renderPedidoResumoCadastro() {
  const pf = getSelectedPfCadastro();
  const pj = getSelectedPjCadastro();
  return `<div class="crm2-cadastro-review" aria-label="Resumo do cadastro"><div><small>Pessoa Física</small><strong>${escapeHtmlCadastro(pf?.nome || 'Não selecionada')}</strong><span>${escapeHtmlCadastro(pf ? maskCpfCadastro(pf.cpf) : '—')}</span></div><div><small>Pessoa Jurídica</small><strong>${escapeHtmlCadastro(pj?.razaoSocial || 'Não informada')}</strong><span>${escapeHtmlCadastro(pj ? maskCnpjCadastro(pj.cnpj) : 'Etapa opcional')}</span></div>${pj ? `<div><small>Vínculo</small><strong>${escapeHtmlCadastro(crm2CadastroState.vinculoTipo || 'Não informado')}</strong><span>Relacionamento mockado</span></div>` : ''}</div>`;
}

function renderPedidoReviewCadastro() {
  const pedido = crm2CadastroState.pedidoDraft;
  return `<section class="crm2-cadastro-review-section" aria-labelledby="crm2-cadastro-review-title"><div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">CONFERÊNCIA FINAL</span><h3 id="crm2-cadastro-review-title">Revise os dados antes de criar</h3><p>Confira as informações do pedido e retorne às etapas anteriores se precisar ajustar algo.</p></div></div><div class="crm2-cadastro-review crm2-cadastro-review-details"><div><small>Produto ou serviço</small><strong>${escapeHtmlCadastro(pedido.produto || 'Não informado')}</strong></div><div><small>Tipo de atendimento</small><strong>${escapeHtmlCadastro(pedido.tipoAtendimento || 'Não informado')}</strong></div><div><small>Responsável</small><strong>${escapeHtmlCadastro(pedido.responsavel || 'Não informado')}</strong></div><div><small>Origem</small><strong>${escapeHtmlCadastro(pedido.origem || 'Não informado')}</strong></div><div><small>Solicitação</small><strong>${escapeHtmlCadastro(formatDateCadastro(pedido.dataSolicitacao))}</strong></div><div><small>Prazo previsto</small><strong>${escapeHtmlCadastro(formatDateCadastro(pedido.prazoPrevisto))}</strong></div><div><small>Valor estimado</small><strong>${escapeHtmlCadastro(pedido.valor ? `R$ ${pedido.valor}` : 'Não informado')}</strong></div><div><small>Pendências iniciais</small><strong>${escapeHtmlCadastro(pedido.pendencias || 'Nenhuma informada')}</strong></div><div class="is-wide"><small>Observações</small><strong>${escapeHtmlCadastro(pedido.observacoes || 'Nenhuma informada')}</strong></div></div></section>`;
}

function renderPedidoCadastro() {
  const values = crm2CadastroState.pedidoDraft;
  if (crm2CadastroState.pedidoCreated) {
    const pedido = crm2CadastroState.pedidoCreated;
    return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pedido-success-title"><div class="crm2-cadastro-success" role="status"><span class="crm2-cadastro-success-icon" aria-hidden="true">✓</span><div><span class="ar-crm-phase1-kicker">FLUXO CONCLUÍDO · MOCKADO</span><h2 id="crm2-cadastro-pedido-success-title">Pedido criado com sucesso</h2><p>${escapeHtmlCadastro(pedido.numero)} foi criado no estado mockado. Nenhuma informação foi persistida ou enviada externamente.</p></div></div>${renderPedidoResumoCadastro()}<div class="crm2-cadastro-review crm2-cadastro-review-details"><div><small>Produto</small><strong>${escapeHtmlCadastro(pedido.produto)}</strong></div><div><small>Responsável</small><strong>${escapeHtmlCadastro(pedido.responsavel)}</strong></div><div><small>Data de solicitação</small><strong>${escapeHtmlCadastro(formatDateCadastro(pedido.dataSolicitacao))}</strong></div><div><small>Prazo previsto</small><strong>${escapeHtmlCadastro(formatDateCadastro(pedido.prazoPrevisto))}</strong></div></div></section>`;
  }
  return `<section class="crm2-cadastro-pf-step" aria-labelledby="crm2-cadastro-pedido-title">${renderPedidoResumoCadastro()}<div class="crm2-cadastro-section-header"><div><span class="ar-crm-phase1-kicker">ETAPA 3 DE 3</span><h2 id="crm2-cadastro-pedido-title">Pedido</h2><p>Informe os dados iniciais do pedido para concluir o cadastro sequencial.</p></div></div><form class="crm2-cadastro-form" onsubmit="crm2CadastroSavePedido(event)" novalidate><div class="hub-form-section"><div class="hub-form-section-title"><strong>Dados do pedido</strong><span>Campos obrigatórios marcados com *</span></div><div class="hub-form-grid">${renderPedidoFieldCadastro({ label: 'Produto ou serviço', name: 'produto', value: values.produto, required: true, options: ['e-CPF A3', 'e-CNPJ A3', 'e-CNPJ A1', 'Renovação de certificado'] })}${renderPedidoFieldCadastro({ label: 'Tipo de atendimento', name: 'tipoAtendimento', value: values.tipoAtendimento, required: true, options: ['Emissão', 'Renovação', 'Revogação', 'Suporte'] })}${renderPedidoFieldCadastro({ label: 'Responsável', name: 'responsavel', value: values.responsavel, required: true })}${renderPedidoFieldCadastro({ label: 'Origem do pedido', name: 'origem', value: values.origem, required: true, options: ['Atendimento interno', 'Indicação', 'Site', 'Parceiro'] })}${renderPedidoFieldCadastro({ label: 'Data de solicitação', name: 'dataSolicitacao', value: values.dataSolicitacao, type: 'date', required: true })}${renderPedidoFieldCadastro({ label: 'Prazo previsto', name: 'prazoPrevisto', value: values.prazoPrevisto, type: 'date', required: true })}${renderPedidoFieldCadastro({ label: 'Valor estimado', name: 'valor', value: values.valor, type: 'number' })}${renderPedidoFieldCadastro({ label: 'Pendências iniciais', name: 'pendencias', value: values.pendencias, type: 'textarea' , wide: true})}${renderPedidoFieldCadastro({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}</div></div>${renderPedidoReviewCadastro()}<div class="hub-form-screen-actions"><button class="secondary-btn" type="button" onclick="crm2CadastroGoToStep('pj')">Voltar</button><button class="save-btn" type="submit" ${crm2CadastroState.canCreate ? '' : 'disabled'}>Criar pedido mockado</button></div></form></section>`;
}

function renderCadastroFooter() {
  if (crm2CadastroState.currentStep === 'pf') {
    return `<button class="secondary-btn" type="button" onclick="crm2CadastroBackToOverview()">Cancelar fluxo</button><span class="crm2-cadastro-footer-hint">Selecione ou inclua uma PF para liberar a próxima etapa.</span><button class="save-btn" type="button" onclick="crm2CadastroNextStep()" ${crm2CadastroState.pfSelectedId ? '' : 'disabled'}>Avançar para Pessoa Jurídica</button>`;
  }
  if (crm2CadastroState.currentStep === 'pj') {
    return `<button class="secondary-btn" type="button" onclick="crm2CadastroGoToStep('pf')">Voltar para PF</button><button class="secondary-btn" type="button" onclick="crm2CadastroSkipPj()" ${crm2CadastroState.pjSelectedId ? 'disabled' : ''}>Continuar sem Pessoa Jurídica</button><span class="crm2-cadastro-footer-hint">A Pessoa Jurídica é opcional neste fluxo.</span><button class="save-btn" type="button" onclick="crm2CadastroNextStep()" ${canContinuePjCadastro() ? '' : 'disabled'}>Avançar para Pedido</button>`;
  }
  return `<button class="secondary-btn" type="button" onclick="crm2CadastroGoToStep('pj')">Voltar para Pessoa Jurídica</button><span class="crm2-cadastro-footer-hint">Revise PF, PJ e pedido antes de concluir.</span>`;
}

function renderDraftBannerCadastro() {
  if (!crm2CadastroState.draftAvailable) return '';
  const draft = crm2CadastroReadStoredDraft();
  const savedAt = crm2CadastroFormatSavedAt(draft?.savedAt);
  return `<aside class="crm2-cadastro-draft-banner" role="status" aria-labelledby="crm2-cadastro-draft-title"><div><strong id="crm2-cadastro-draft-title">Rascunho disponível</strong><span>${savedAt ? `Salvo em ${escapeHtmlCadastro(savedAt)} no navegador.` : 'Existe um rascunho salvo neste navegador.'}</span></div><div><button class="secondary-btn" type="button" onclick="crm2CadastroRecoverDraft()" ${crm2CadastroState.canCreate ? '' : 'disabled'}>Recuperar rascunho</button><button class="secondary-btn" type="button" onclick="crm2CadastroDiscardDraft()">Descartar</button></div></aside>`;
}

function crm2CadastroRequestLeave() {
  if (!crm2CadastroState.dirty) return true;
  const canSave = crm2CadastroState.canCreate || crm2CadastroState.canEdit;
  return window.confirm(canSave
    ? 'Existem dados não salvos neste fluxo. Deseja sair sem salvar o rascunho?'
    : 'Você está em modo somente leitura. Deseja sair deste fluxo?');
}

function renderCadastroShell() {
  permissionsCadastro();
  if (!crm2CadastroState.canView) return `<section class="admin-panel crm2-cadastro-page" data-crm2-cadastro="true" aria-labelledby="crm2-cadastro-denied-title"><div class="crm2-pessoas-state is-error" role="alert"><strong id="crm2-cadastro-denied-title">Acesso não autorizado.</strong><span>É necessária a permissão Visualizar para acessar o cadastro sequencial.</span><button class="secondary-btn" type="button" onclick="crm2CadastroBackToOverview()">Voltar ao CRM 2.0</button></div></section>`;
  const content = crm2CadastroState.currentStep === 'pj'
    ? (crm2CadastroState.pjMode === 'create' ? renderPjCreateCadastro() : renderPjListCadastro())
    : crm2CadastroState.currentStep === 'pedido'
      ? renderPedidoCadastro()
      : crm2CadastroState.pfMode === 'create' ? renderPfCreateCadastro() : renderPfListCadastro();
  const canSaveDraft = crm2CadastroState.canCreate || crm2CadastroState.canEdit;
  return `<section class="hub-form-screen crm2-cadastro-page" data-crm2-cadastro="true" aria-labelledby="crm2-cadastro-title"><header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">CRM 2.0 · FLUXO SEQUENCIAL</span><h2 id="crm2-cadastro-title">Novo cadastro</h2><p>Organize a entrada da Pessoa Física, da empresa e do pedido em uma única jornada.</p></div><div class="crm2-cadastro-header-actions"><span class="crm2-cadastro-mock-pill" role="status">Mockado</span>${canSaveDraft ? `<button class="secondary-btn" type="button" onclick="crm2CadastroSaveDraft()" ${crm2CadastroState.dirty ? '' : 'disabled'}>Salvar rascunho</button>` : ''}<button class="secondary-btn" type="button" onclick="crm2CadastroBackToOverview()">Voltar ao CRM 2.0</button></div></header>${renderDraftBannerCadastro()}${!canSaveDraft ? '<p class="admin-message hub-form-screen-notice" role="status">Modo somente leitura: o fluxo pode ser consultado, mas nenhum rascunho ou pedido pode ser salvo.</p>' : ''}${renderStepIndicatorCadastro()}${crm2CadastroState.message && crm2CadastroState.pfMode !== 'create' ? `<p class="admin-message hub-form-screen-notice" role="status">${escapeHtmlCadastro(crm2CadastroState.message)}</p>` : ''}<div class="hub-form-screen-content">${content}</div><footer class="hub-form-screen-actions crm2-cadastro-footer">${renderCadastroFooter()}</footer></section>`;
}

function rerenderCadastro() {
  if (currentCadastroRoute().active && document.querySelector('[data-crm2-cadastro="true"]')) {
    const target = document.querySelector('[data-crm2-cadastro="true"]');
    target.outerHTML = renderCadastroShell();
  }
}

function collectPfFormValues(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  values.nome = String(values.nome || '').trim();
  values.cpf = digitsCadastro(values.cpf);
  values.email = String(values.email || '').trim();
  values.telefone = maskPhoneCadastro(values.telefone);
  values.nascimento = String(values.nascimento || '').trim();
  values.observacoes = String(values.observacoes || '').trim();
  return values;
}

Object.assign(window, {
  crm2CadastroRender: renderCadastroShell,
  crm2CadastroMount() {
    const target = document.querySelector('[data-crm2-cadastro="true"]');
    if (target) target.outerHTML = renderCadastroShell();
  },
  navegarParaCrm2Cadastro() {
    permissionsCadastro();
    if (!crm2CadastroState.canView) return;
    crm2CadastroState.currentStep = 'pf';
    crm2CadastroState.pfMode = 'lookup';
    crm2CadastroState.pjMode = 'lookup';
    crm2CadastroState.pfSearch = '';
    crm2CadastroState.pjSearch = '';
    crm2CadastroState.pfSelectedId = '';
    crm2CadastroState.pjSelectedId = '';
    crm2CadastroState.pjSkipped = false;
    crm2CadastroState.vinculoTipo = '';
    crm2CadastroState.vinculoError = '';
    crm2CadastroState.pfDraft = {};
    crm2CadastroState.pjDraft = {};
    crm2CadastroState.pedidoDraft = {};
    crm2CadastroState.pfErrors = {};
    crm2CadastroState.pjErrors = {};
    crm2CadastroState.pedidoErrors = {};
    crm2CadastroState.pedidoCreated = null;
    crm2CadastroState.dirty = false;
    crm2CadastroState.draftSavedAt = '';
    crm2CadastroState.draftAvailable = crm2CadastroHasStoredDraft();
    crm2CadastroState.message = '';
    crm2CadastroCreatedPfs.length = 0;
    crm2CadastroCreatedPjs.length = 0;
    navigateCadastro();
  },
  crm2CadastroBackToOverview() {
    if (!crm2CadastroRequestLeave()) return;
    crm2CadastroState.currentStep = 'pf';
    crm2CadastroState.pfMode = 'lookup';
    crm2CadastroState.pjMode = 'lookup';
    crm2CadastroState.pfSelectedId = '';
    crm2CadastroState.pjSelectedId = '';
    crm2CadastroState.pjSkipped = false;
    crm2CadastroState.vinculoTipo = '';
    crm2CadastroState.vinculoError = '';
    crm2CadastroState.pfDraft = {};
    crm2CadastroState.pjDraft = {};
    crm2CadastroState.pedidoDraft = {};
    crm2CadastroState.pfErrors = {};
    crm2CadastroState.pjErrors = {};
    crm2CadastroState.pedidoErrors = {};
    crm2CadastroState.pedidoCreated = null;
    crm2CadastroState.dirty = false;
    crm2CadastroState.draftAvailable = false;
    crm2CadastroState.message = '';
    navigateCrm2Overview();
  },
  crm2CadastroTrackField(section, input) {
    const name = String(input?.name || '');
    if (!name) return;
    const target = section === 'pj'
      ? crm2CadastroState.pjDraft
      : section === 'pedido'
        ? crm2CadastroState.pedidoDraft
        : crm2CadastroState.pfDraft;
    target[name] = input.value;
    crm2CadastroMarkDirty();
  },
  crm2CadastroSaveDraft() {
    permissionsCadastro();
    if (!crm2CadastroState.canCreate && !crm2CadastroState.canEdit) return;
    try {
      const draft = crm2CadastroSerializeDraft();
      window.localStorage.setItem(CRM2_CADASTRO_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      crm2CadastroState.draftSavedAt = draft.savedAt;
      crm2CadastroState.draftAvailable = false;
      crm2CadastroState.dirty = false;
      crm2CadastroState.message = `Rascunho salvo em ${crm2CadastroFormatSavedAt(draft.savedAt)}. Nenhum dado foi persistido no backend.`;
      rerenderCadastro();
    } catch {
      crm2CadastroState.message = 'Não foi possível salvar o rascunho neste navegador.';
      rerenderCadastro();
    }
  },
  crm2CadastroRecoverDraft() {
    permissionsCadastro();
    if (!crm2CadastroState.canCreate && !crm2CadastroState.canEdit) return;
    if (crm2CadastroState.dirty && !crm2CadastroRequestLeave()) return;
    if (crm2CadastroRestoreStoredDraft()) rerenderCadastro();
  },
  crm2CadastroDiscardDraft() {
    if (!window.confirm('Descartar o rascunho salvo neste navegador?')) return;
    try {
      window.localStorage.removeItem(CRM2_CADASTRO_DRAFT_STORAGE_KEY);
    } catch {
      // O estado visual continua sendo limpo mesmo quando o armazenamento não está disponível.
    }
    crm2CadastroState.draftAvailable = false;
    crm2CadastroState.message = 'Rascunho descartado. O fluxo atual não foi alterado.';
    rerenderCadastro();
  },
  crm2CadastroGoToStep(step) {
    const next = String(step || '');
    if (next === 'pf') {
      crm2CadastroState.currentStep = 'pf';
      crm2CadastroState.pfMode = 'lookup';
      crm2CadastroState.message = '';
      rerenderCadastro();
      return;
    }
    if (next === 'pj' && crm2CadastroState.pfSelectedId) {
      crm2CadastroState.currentStep = 'pj';
      crm2CadastroState.pjMode = 'lookup';
      crm2CadastroState.message = '';
      rerenderCadastro();
      return;
    }
    if (next === 'pedido' && crm2CadastroState.pfSelectedId && (crm2CadastroState.pjSelectedId || crm2CadastroState.pjSkipped)) {
      if (!validatePjFlowCadastro()) {
        rerenderCadastro();
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      crm2CadastroState.currentStep = 'pedido';
      crm2CadastroState.pedidoDraft = {
        dataSolicitacao: crm2CadastroState.pedidoDraft.dataSolicitacao || today,
        prazoPrevisto: crm2CadastroState.pedidoDraft.prazoPrevisto || nextWeek,
        ...crm2CadastroState.pedidoDraft
      };
      crm2CadastroState.message = '';
      rerenderCadastro();
    }
  },
  crm2CadastroNextStep() {
    if (crm2CadastroState.currentStep === 'pf' && crm2CadastroState.pfSelectedId) {
      window.crm2CadastroGoToStep('pj');
    } else if (crm2CadastroState.currentStep === 'pj' && (crm2CadastroState.pjSelectedId || crm2CadastroState.pjSkipped)) {
      window.crm2CadastroGoToStep('pedido');
    }
  },
  crm2CadastroSkipPj() {
    if (!crm2CadastroState.pfSelectedId) return;
    crm2CadastroState.pjSelectedId = '';
    crm2CadastroState.pjSkipped = true;
    crm2CadastroState.pjMode = 'lookup';
    crm2CadastroState.vinculoTipo = '';
    crm2CadastroState.vinculoError = '';
    crm2CadastroMarkDirty();
    crm2CadastroState.message = 'O fluxo seguirá sem Pessoa Jurídica.';
    rerenderCadastro();
  },
  crm2CadastroOpenPfCreate() {
    permissionsCadastro();
    if (!crm2CadastroState.canCreate) return;
    crm2CadastroState.pfMode = 'create';
    crm2CadastroState.pfDraft = { ...crm2CadastroState.pfDraft };
    crm2CadastroState.pfErrors = {};
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroCancelPfCreate() {
    crm2CadastroState.pfMode = 'lookup';
    crm2CadastroState.pfErrors = {};
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroApplyPfSearch(event) {
    event?.preventDefault();
    const input = event?.currentTarget?.querySelector('input[name="search"], input[type="search"]');
    crm2CadastroState.pfSearch = String(input?.value || '').trim();
    crm2CadastroState.pfPage = 1;
    rerenderCadastro();
  },
  crm2CadastroClearPfSearch() {
    crm2CadastroState.pfSearch = '';
    crm2CadastroState.pfPage = 1;
    rerenderCadastro();
  },
  crm2CadastroSelectPf(id) {
    const person = getMockPfsCadastro().find((item) => item.id === id);
    if (!person) return;
    crm2CadastroState.pfSelectedId = id;
    crm2CadastroMarkDirty();
    crm2CadastroState.message = `Pessoa física selecionada: ${person.nome}.`;
    rerenderCadastro();
  },
  crm2CadastroClearPfSelection() {
    crm2CadastroState.pfSelectedId = '';
    crm2CadastroMarkDirty();
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroSetPfPage(page) {
    crm2CadastroState.pfPage = Math.max(1, Number(page) || 1);
    rerenderCadastro();
  },
  crm2CadastroSetPfState(value) {
    crm2CadastroState.pfListState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    rerenderCadastro();
  },
  crm2CadastroMaskCpf(input) {
    if (input) input.value = maskCpfCadastro(input.value);
  },
  crm2CadastroMaskPhone(input) {
    if (input) input.value = maskPhoneCadastro(input.value);
  },
  crm2CadastroSavePf(event) {
    event?.preventDefault();
    permissionsCadastro();
    if (!crm2CadastroState.canCreate) return;
    const values = collectPfFormValues(event?.currentTarget);
    const errors = {};
    if (!values.nome) errors.nome = 'Informe o nome completo ou nome social.';
    if (!validateCpfCadastro(values.cpf)) errors.cpf = 'Informe um CPF válido.';
    if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Informe um e-mail válido.';
    if (values.nascimento && new Date(`${values.nascimento}T00:00:00`) > new Date()) errors.nascimento = 'A data de nascimento não pode estar no futuro.';
    if (getMockPfsCadastro().some((item) => digitsCadastro(item.cpf) === values.cpf)) errors.cpf = 'Já existe uma pessoa física mockada com este CPF.';
    if (Object.keys(errors).length) {
      crm2CadastroState.pfErrors = errors;
      crm2CadastroState.pfDraft = values;
      crm2CadastroState.message = 'Revise os campos destacados.';
      rerenderCadastro();
      return;
    }
    const now = new Date().toISOString();
    const person = {
      id: `fluxo-pf-${Date.now()}`,
      ...values,
      origem: 'Cadastro sequencial',
      parceiro: '',
      pedidos: [],
      criadoNoFluxo: true,
      cadastroEm: now,
      atualizadoEm: now
    };
    crm2CadastroCreatedPfs.unshift(person);
    crm2CadastroState.pfSelectedId = person.id;
    crm2CadastroMarkDirty();
    crm2CadastroState.pfMode = 'lookup';
    crm2CadastroState.pfDraft = {};
    crm2CadastroState.pfErrors = {};
    crm2CadastroState.pfSearch = '';
    crm2CadastroState.pfPage = 1;
    crm2CadastroState.message = 'Pessoa física criada no estado mockado e selecionada para o fluxo.';
    rerenderCadastro();
  },
  crm2CadastroOpenPjCreate() {
    permissionsCadastro();
    if (!crm2CadastroState.canCreate || !crm2CadastroState.pfSelectedId) return;
    crm2CadastroState.pjMode = 'create';
    crm2CadastroState.pjDraft = { ...crm2CadastroState.pjDraft };
    crm2CadastroState.pjErrors = {};
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroCancelPjCreate() {
    crm2CadastroState.pjMode = 'lookup';
    crm2CadastroState.pjErrors = {};
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroApplyPjSearch(event) {
    event?.preventDefault();
    const input = event?.currentTarget?.querySelector('input[type="search"]');
    crm2CadastroState.pjSearch = String(input?.value || '').trim();
    crm2CadastroState.pjPage = 1;
    rerenderCadastro();
  },
  crm2CadastroClearPjSearch() {
    crm2CadastroState.pjSearch = '';
    crm2CadastroState.pjPage = 1;
    rerenderCadastro();
  },
  crm2CadastroSelectPj(id) {
    const company = getMockPjsCadastro().find((item) => item.id === id);
    if (!company) return;
    crm2CadastroState.pjSelectedId = id;
    crm2CadastroState.pjSkipped = false;
    crm2CadastroState.vinculoTipo = '';
    crm2CadastroState.vinculoError = '';
    crm2CadastroMarkDirty();
    crm2CadastroState.message = `Pessoa jurídica selecionada: ${company.razaoSocial}.`;
    rerenderCadastro();
  },
  crm2CadastroClearPjSelection() {
    crm2CadastroState.pjSelectedId = '';
    crm2CadastroState.pjSkipped = false;
    crm2CadastroState.vinculoTipo = '';
    crm2CadastroState.vinculoError = '';
    crm2CadastroMarkDirty();
    crm2CadastroState.message = '';
    rerenderCadastro();
  },
  crm2CadastroSetVinculoTipo(value) {
    crm2CadastroState.vinculoTipo = String(value || '');
    crm2CadastroState.vinculoError = '';
    crm2CadastroMarkDirty();
    rerenderCadastro();
  },
  crm2CadastroSetPjPage(page) {
    crm2CadastroState.pjPage = Math.max(1, Number(page) || 1);
    rerenderCadastro();
  },
  crm2CadastroSetPjState(value) {
    crm2CadastroState.pjListState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    rerenderCadastro();
  },
  crm2CadastroMaskCnpj(input) {
    if (input) input.value = maskCnpjCadastro(input.value);
  },
  crm2CadastroSavePj(event) {
    event?.preventDefault();
    permissionsCadastro();
    if (!crm2CadastroState.canCreate || !crm2CadastroState.pfSelectedId) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.razaoSocial = String(values.razaoSocial || '').trim();
    values.cnpj = digitsCadastro(values.cnpj);
    values.endereco = String(values.endereco || '').trim();
    values.observacoes = String(values.observacoes || '').trim();
    const errors = {};
    if (!values.razaoSocial) errors.razaoSocial = 'Informe a razão social.';
    if (!validateCnpjCadastro(values.cnpj)) errors.cnpj = 'Informe um CNPJ válido.';
    if (getMockPjsCadastro().some((item) => digitsCadastro(item.cnpj) === values.cnpj)) errors.cnpj = 'Já existe uma pessoa jurídica mockada com este CNPJ.';
    if (Object.keys(errors).length) {
      crm2CadastroState.pjErrors = errors;
      crm2CadastroState.pjDraft = values;
      crm2CadastroState.message = 'Revise os campos destacados.';
      rerenderCadastro();
      return;
    }
    const now = new Date().toISOString();
    const company = {
      id: `fluxo-pj-${Date.now()}`,
      ...values,
      origem: 'Cadastro sequencial',
      pedidos: [],
      pessoasVinculadas: [],
      criadoNoFluxo: true,
      cadastroEm: now,
      atualizadoEm: now
    };
    crm2CadastroCreatedPjs.unshift(company);
    crm2CadastroState.pjSelectedId = company.id;
    crm2CadastroState.pjSkipped = false;
    crm2CadastroMarkDirty();
    crm2CadastroState.pjMode = 'lookup';
    crm2CadastroState.pjDraft = {};
    crm2CadastroState.pjErrors = {};
    crm2CadastroState.pjSearch = '';
    crm2CadastroState.pjPage = 1;
    crm2CadastroState.message = 'Pessoa jurídica criada no estado mockado e selecionada para o fluxo.';
    rerenderCadastro();
  },
  crm2CadastroSavePedido(event) {
    event?.preventDefault();
    permissionsCadastro();
    if (!crm2CadastroState.canCreate) return;
    if (!getSelectedPfCadastro()) {
      crm2CadastroState.message = 'Selecione uma Pessoa Física antes de criar o pedido.';
      rerenderCadastro();
      return;
    }
    if (!crm2CadastroState.pjSkipped && !validatePjFlowCadastro()) {
      rerenderCadastro();
      return;
    }
    if (!crm2CadastroState.pjSkipped && !getSelectedPjCadastro()) {
      crm2CadastroState.message = 'Selecione uma Pessoa Jurídica ou continue sem PJ.';
      rerenderCadastro();
      return;
    }
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    Object.keys(values).forEach((key) => { values[key] = String(values[key] || '').trim(); });
    const errors = {};
    ['produto', 'tipoAtendimento', 'responsavel', 'origem', 'dataSolicitacao', 'prazoPrevisto'].forEach((field) => {
      if (!values[field]) errors[field] = 'Preencha este campo.';
    });
    if (values.dataSolicitacao && values.prazoPrevisto && values.prazoPrevisto < values.dataSolicitacao) errors.prazoPrevisto = 'O prazo não pode ser anterior à solicitação.';
    if (values.valor && Number(values.valor) < 0) errors.valor = 'Informe um valor igual ou maior que zero.';
    if (Object.keys(errors).length) {
      crm2CadastroState.pedidoErrors = errors;
      crm2CadastroState.pedidoDraft = values;
      crm2CadastroState.message = 'Revise os campos destacados antes de concluir.';
      rerenderCadastro();
      return;
    }
    const now = new Date().toISOString();
    crm2CadastroState.pedidoCreated = {
      id: `pedido-fluxo-${Date.now()}`,
      numero: `PED-MOCK-${String(Date.now()).slice(-6)}`,
      ...values,
      pfId: crm2CadastroState.pfSelectedId,
      pjId: crm2CadastroState.pjSelectedId || '',
      status: 'Em cadastro',
      criadoEm: now
    };
    crm2CadastroState.dirty = false;
    crm2CadastroState.draftSavedAt = '';
    crm2CadastroState.draftAvailable = false;
    try {
      window.localStorage.removeItem(CRM2_CADASTRO_DRAFT_STORAGE_KEY);
    } catch {
      // A conclusão mockada não depende da disponibilidade do armazenamento local.
    }
    crm2CadastroState.pedidoDraft = values;
    crm2CadastroState.pedidoErrors = {};
    crm2CadastroState.message = '';
    rerenderCadastro();
  }
});

observarContextoAcessoHub(() => {
  permissionsCadastro();
  if (currentCadastroRoute().active) window.crm2CadastroMount?.();
});

window.addEventListener('beforeunload', (event) => {
  if (!currentCadastroRoute().active || !crm2CadastroState.dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

permissionsCadastro();
crm2CadastroState.draftAvailable = crm2CadastroHasStoredDraft();
