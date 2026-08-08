import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';
import { getHubAttachmentPreviewKind } from './hubAttachmentManager.js';
import { portalHubFormFooter } from './formFooterPortal.js';

const CRM2_PJ_INITIAL_ITEMS = [
  {
    id: 'pj-001',
    cnpj: '04252011000110',
    razaoSocial: 'Transmares Tecnologia Ltda.',
    endereco: 'Av. Beira-Mar, 1500, Fortaleza/CE',
    observacoes: 'Empresa com pedidos empresariais ativos.',
    cadastroEm: '2026-06-12T09:30:00',
    atualizadoEm: '2026-08-01T14:10:00',
    anexos: [
      { nome: 'Contrato social.pdf', tipo: 'application/pdf', validade: '2027-06-12', incluidoEm: '2026-06-12T09:45:00' }
    ],
    status: 'empresa ativa',
    statusAutomatico: 'empresa ativa',
    statusManual: '',
    pessoasVinculadas: [
      { nome: 'Mariana Alves de Souza', cpf: '12345678909', tipo: 'Representante legal', status: 'Ativo', vinculoId: 'vinculo-001', inicioEm: '2026-06-12', encerramentoEm: '' },
      { nome: 'Rafael Nogueira Lima', cpf: '98765432100', tipo: 'Contador', status: 'Ativo', vinculoId: 'vinculo-002', inicioEm: '2026-06-18', encerramentoEm: '' }
    ],
    pedidos: [
      { numero: 'PED-2401', produto: 'e-CNPJ A3', pessoa: 'Mariana Alves de Souza', status: 'Ativo', vencimento: '2027-07-18' },
      { numero: 'PED-2390', produto: 'e-CNPJ A1', pessoa: 'Rafael Nogueira Lima', status: 'Em validação', vencimento: '2027-02-10' },
      { numero: 'PED-2204', produto: 'e-CNPJ A3', pessoa: 'Mariana Alves de Souza', status: 'Vencido', vencimento: '2025-12-20' }
    ]
  },
  {
    id: 'pj-002',
    cnpj: '12345678000195',
    razaoSocial: 'Alves Consultoria Ltda.',
    endereco: 'Rua das Flores, 88, Recife/PE',
    observacoes: '',
    cadastroEm: '2026-04-20T11:15:00',
    atualizadoEm: '2026-07-28T10:05:00',
    anexos: [],
    status: 'empresa inativa',
    statusAutomatico: 'empresa inativa',
    statusManual: '',
    pessoasVinculadas: [
      { nome: 'Camila Ferreira Rocha', cpf: '45678912364', tipo: 'Titular', status: 'Ativo', vinculoId: 'vinculo-003', inicioEm: '2026-04-20', encerramentoEm: '' },
      { nome: 'João Pedro Ribeiro', cpf: '74185296300', tipo: 'Outros', status: 'Inativo', vinculoId: 'vinculo-009', inicioEm: '2025-01-12', encerramentoEm: '2026-02-10' }
    ],
    pedidos: [
      { numero: 'PED-2389', produto: 'e-CNPJ A3', pessoa: 'Camila Ferreira Rocha', status: 'Vencido', vencimento: '2026-01-20' }
    ]
  }
];

const crm2PjState = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_PJ_INITIAL_ITEMS),
  search: '',
  statusFilter: '',
  page: 1,
  perPage: 15,
  searchExpanded: false,
  formMode: '',
  detailId: '',
  detailTab: 'dados',
  draft: {},
  attachmentDraft: [],
  attachmentRemoved: [],
  errors: {},
  message: '',
  listState: 'normal'
};

let pendingLeaveActionPj = null;
let crm2PjSearchTimer = null;

function escapeHtmlPj(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttrPj(value = '') {
  return escapeHtmlPj(value).replaceAll('`', '&#096;');
}

function normalizeSearchPj(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function maskCnpjPj(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function validateCnpjPj(value = '') {
  const cnpj = String(value).replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calculate = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculate(12) === Number(cnpj[12]) && calculate(13) === Number(cnpj[13]);
}

function formatDatePj(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTimePj(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function currentPjRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const index = segments.findIndex((segment, position) => segment === 'painel-ar' && segments[position + 1] === '202');
  if (index < 0) return { view: 'list', id: '' };
  const tail = segments.slice(index + 2);
  if (tail[0] === 'novo') return { view: 'new', id: '' };
  if (tail[1] === 'editar') return { view: 'edit', id: tail[0] || '' };
  if (tail[0]) return { view: 'detail', id: tail[0] };
  return { view: 'list', id: '' };
}

function pjRoutePath(suffix = '') {
  const hasHub = window.location.pathname.split('/').filter(Boolean)[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/202${suffix ? `/${suffix}` : ''}`;
}

function navigatePj(suffix = '') {
  window.history.pushState({}, '', pjRoutePath(suffix));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => window.crm2PjMount?.(), 0);
}

function getPj(id) {
  return crm2PjState.items.find((item) => item.id === id) || null;
}

const CRM2_PJ_CLOSED_ORDER_STATUSES = new Set([
  'vencido',
  'cancelado',
  'cancelado pelo cliente',
  'revogado',
  'expirado'
]);

function isActiveOrderPj(order = {}) {
  const status = normalizeSearchPj(order.status || '');
  if (CRM2_PJ_CLOSED_ORDER_STATUSES.has(status)) return false;
  if (!order.vencimento) return true;
  const expiration = new Date(`${String(order.vencimento).slice(0, 10)}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(expiration.getTime()) && expiration >= today;
}

function automaticStatusPj(item = {}) {
  const orders = Array.isArray(item.pedidos) ? item.pedidos : [];
  return orders.some(isActiveOrderPj) ? 'empresa ativa' : 'empresa inativa';
}

function displayedStatusPj(item = {}) {
  return item.statusManual || automaticStatusPj(item) || item.status || 'empresa inativa';
}

function peopleCountPj(item = {}) {
  return Array.isArray(item.pessoasVinculadas) ? item.pessoasVinculadas.length : Number(item.pessoasVinculadas || 0);
}

function ordersCountPj(item = {}) {
  return Array.isArray(item.pedidos) ? item.pedidos.length : Number(item.pedidos || 0);
}

function attachmentStatusPj(validade = '') {
  if (!validade) return 'sem validade';
  const date = new Date(`${String(validade).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(date.getTime())) return 'sem validade';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((date - today) / 86400000);
  if (days < 0) return 'vencido';
  if (days <= 30) return 'vencendo';
  return 'válido';
}

function attachmentKindPj(attachment = {}) {
  return getHubAttachmentPreviewKind({ nome: attachment.nome, tipo: attachment.tipo });
}

function renderPjAttachmentPreview(attachment, source, index) {
  const kind = attachmentKindPj(attachment);
  const url = attachment.previewUrl || attachment.url || '';
  const action = url ? `role="button" tabindex="0" onclick="crm2PjViewAttachment('${source}', ${index})" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); crm2PjViewAttachment('${source}', ${index}); }"` : 'aria-disabled="true"';
  if (kind === 'image' && url) return `<div class="crm2-pj-attachment-preview is-image" ${action}><img src="${escapeAttrPj(url)}" alt="Prévia de ${escapeAttrPj(attachment.nome)}" loading="lazy"></div>`;
  if (kind === 'pdf' && url) return `<div class="crm2-pj-attachment-preview is-pdf" ${action}><iframe src="${escapeAttrPj(url)}#toolbar=0&navpanes=0&scrollbar=0" title="Prévia de ${escapeAttrPj(attachment.nome)}" loading="lazy"></iframe></div>`;
  return `<div class="crm2-pj-attachment-preview is-unavailable" ${action}><span>Prévia indisponível</span></div>`;
}

function renderPjAttachments(item, editing = false) {
  const existing = (item?.anexos || []).map((attachment, index) => ({ ...attachment, source: 'existing', index }))
    .filter((attachment) => !crm2PjState.attachmentRemoved.includes(attachment.index));
  const pending = crm2PjState.attachmentDraft.map((attachment, index) => ({ ...attachment, source: 'draft', index }));
  const attachments = [...existing, ...pending];
  return `<section class="hub-form-section crm2-pj-attachments" aria-labelledby="crm2-pj-attachments-title"><div class="hub-form-section-title"><strong id="crm2-pj-attachments-title">Anexos</strong>${editing ? '<label class="icon-btn crm2-pj-attachment-add" title="Incluir anexo" aria-label="Incluir anexo"><span aria-hidden="true">+</span><input type="file" multiple hidden onchange="crm2PjSelectAttachment(this)"></label>' : ''}</div>${editing && crm2PjState.attachmentDraft.length ? `<div class="crm2-pj-attachment-drafts">${crm2PjState.attachmentDraft.map((attachment, index) => `<div class="crm2-pj-attachment-draft"><input class="config-input" type="text" value="${escapeAttrPj(attachment.nome)}" aria-label="Nome do anexo" oninput="crm2PjUpdateAttachmentDraft(${index}, 'nome', this.value)"><input class="config-input" type="date" value="${escapeAttrPj(attachment.validade)}" aria-label="Validade do anexo" onchange="crm2PjUpdateAttachmentDraft(${index}, 'validade', this.value)"><button class="secondary-btn" type="button" onclick="crm2PjRemoveAttachment('draft', ${index})">Remover</button></div>`).join('')}</div>` : ''}${attachments.length ? `<div class="crm2-pj-attachment-grid">${attachments.map((attachment) => `<article class="crm2-pj-attachment-card">${renderPjAttachmentPreview(attachment, attachment.source, attachment.index)}<div class="crm2-pj-attachment-meta"><strong>${escapeHtmlPj(attachment.nome)}</strong><span class="crm2-pj-attachment-validity is-${escapeAttrPj(normalizeSearchPj(attachmentStatusPj(attachment.validade)).replace(/\s+/g, '-'))}">${escapeHtmlPj(attachmentStatusPj(attachment.validade))}</span><small>${attachment.validade ? `Validade: ${escapeHtmlPj(formatDatePj(attachment.validade))}` : 'Sem validade'}</small></div><div class="crm2-pj-attachment-actions"><button class="icon-btn" type="button" title="Baixar anexo" aria-label="Baixar ${escapeAttrPj(attachment.nome)}" onclick="crm2PjDownloadAttachment('${attachment.source}', ${attachment.index})">↓</button>${editing && crm2PjState.canDelete ? `<button class="icon-btn" type="button" title="Remover anexo" aria-label="Remover ${escapeAttrPj(attachment.nome)}" onclick="crm2PjRemoveAttachment('${attachment.source}', ${attachment.index})">×</button>` : ''}</div></article>`).join('')}</div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum anexo.</strong><span>Os anexos podem ser incluídos durante a edição.</span></div>'}</section>`;
}

function fileToAttachmentPj(file) {
  const kind = getHubAttachmentPreviewKind({ nome: file?.name, tipo: file?.type });
  return {
    nome: file?.name || 'Arquivo selecionado',
    tipo: file?.type || 'application/octet-stream',
    validade: '',
    incluidoEm: new Date().toISOString(),
    arquivo: file || null,
    previewUrl: kind !== 'unavailable' && file && typeof URL !== 'undefined' ? URL.createObjectURL(file) : ''
  };
}

function filteredPj() {
  const search = normalizeSearchPj(crm2PjState.search);
  return crm2PjState.items.filter((item) => {
    const matchesSearch = !search || [item.razaoSocial, item.cnpj, maskCnpjPj(item.cnpj)]
      .some((value) => normalizeSearchPj(value).includes(search));
    return matchesSearch && (!crm2PjState.statusFilter || displayedStatusPj(item) === crm2PjState.statusFilter);
  });
}

function permissionsPj() {
  const context = obterContextoAcessoHub();
  const permissions = context?.permissions || {};
  const resolve = (action) => hasPermission(permissions, 'painel_ar', action);
  crm2PjState.canView = resolve('view');
  crm2PjState.canCreate = resolve('create') || resolve('update');
  crm2PjState.canEdit = resolve('update');
  crm2PjState.canDelete = resolve('delete');
}

function hasUnsavedPj() {
  const route = currentPjRoute();
  if (crm2PjState.formMode === 'create' && route.view === 'new') {
    return Object.values(crm2PjState.draft).some((value) => String(value || '').trim())
      || crm2PjState.attachmentDraft.length > 0;
  }
  if (crm2PjState.formMode !== 'edit' || route.view !== 'edit') return false;
  const original = getPj(route.id);
  return Boolean(original && ['razaoSocial', 'endereco', 'observacoes', 'statusManual']
    .some((field) => String(crm2PjState.draft[field] ?? original[field] ?? '').trim() !== String(original[field] ?? '').trim())
    || crm2PjState.attachmentDraft.length > 0
    || crm2PjState.attachmentRemoved.length > 0);
}

function requestLeavePj(onConfirm) {
  if (!hasUnsavedPj()) return true;
  if (document.querySelector('.crm2-pj-unsaved-backdrop')) return false;
  pendingLeaveActionPj = onConfirm;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop crm2-pj-unsaved-backdrop" role="presentation">
      <section class="small-modal" role="alertdialog" aria-modal="true" aria-labelledby="crm2-pj-unsaved-title">
        <div class="small-modal-header"><h3 id="crm2-pj-unsaved-title">Sair sem salvar?</h3></div>
        <div class="small-modal-body"><p>Existem dados preenchidos que serão perdidos. Deseja realmente sair?</p></div>
        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="crm2PjCancelLeave()">Continuar editando</button>
          <button class="save-btn" type="button" onclick="crm2PjConfirmLeave()">Sair e perder dados</button>
        </div>
      </section>
    </div>`);
  return false;
}

function renderStatePj() {
  const copy = {
    loading: ['Carregando pessoas jurídicas...', 'Estado de carregamento simulado para homologação.'],
    error: ['Não foi possível carregar a lista.', 'Erro simulado. Nenhuma integração foi acionada.'],
    empty: ['Nenhuma pessoa jurídica cadastrada.', 'A lista mockada ainda não possui empresas.']
  }[crm2PjState.listState];
  if (!copy) return '';
  return `<div class="crm2-pessoas-state ${crm2PjState.listState === 'error' ? 'is-error' : ''}" role="${crm2PjState.listState === 'error' ? 'alert' : 'status'}"><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2PjSetListState('normal')">Voltar à lista</button></div>`;
}

function renderPaginationPj(totalPages, totalItems) {
  crm2PjState.page = Math.min(Math.max(1, crm2PjState.page), totalPages);
  return `<div class="crm2-pessoas-pagination" aria-label="Paginação de pessoas jurídicas"><span>Página <strong>${crm2PjState.page}</strong> de <strong>${totalPages}</strong> · ${totalItems} registro(s)</span><div><button class="secondary-btn" type="button" onclick="crm2PjSetPage(${crm2PjState.page - 1})" ${crm2PjState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2PjSetPage(${crm2PjState.page + 1})" ${crm2PjState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`;
}

function renderPjFooter(actions) {
  return `<div class="hub-form-screen-actions" data-hub-form-footer>${actions}</div>`;
}

function renderListPj() {
  const items = filteredPj();
  const totalPages = Math.max(1, Math.ceil(items.length / crm2PjState.perPage));
  crm2PjState.page = Math.min(Math.max(1, crm2PjState.page), totalPages);
  const pageItems = items.slice((crm2PjState.page - 1) * crm2PjState.perPage, crm2PjState.page * crm2PjState.perPage);
  const hasFilters = Boolean(crm2PjState.search || crm2PjState.statusFilter);
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-title">
    <div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h3 id="crm2-pj-title">Pessoas jurídicas</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></div>
    <form class="crm2-pf-filter-bar" role="search" onsubmit="crm2PjApplyFilters(event)">
      <div class="crm2-pf-filter-actions">
        ${crm2PjState.canCreate ? '<button class="save-btn crm2-pf-include-btn" type="button" onclick="crm2PjOpenCreate()">+Incluir</button>' : ''}
        <div class="crm2-pf-select"><button id="crm2-pj-status-filter" class="icon-btn ${crm2PjState.statusFilter ? 'is-active' : ''}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="crm2-pj-status-filter-menu" title="Filtrar por status" aria-label="Filtrar por status" onclick="crm2PjToggleDropdown(this, event)"><i data-lucide="filter" aria-hidden="true"></i></button><div id="crm2-pj-status-filter-menu" class="hub-filter-dropdown-menu" role="listbox" aria-label="Filtrar por status" data-dropdown-input-id="crm2-pj-status-filter" data-dropdown-width="180" hidden>${[['', 'Todos'], ['empresa ativa', 'Empresa ativa'], ['empresa inativa', 'Empresa inativa'], ['empresa baixada', 'Empresa baixada']].map(([value, label]) => `<button class="hub-filter-dropdown-option ${crm2PjState.statusFilter === value ? 'is-selected' : ''}" type="button" role="option" aria-selected="${crm2PjState.statusFilter === value ? 'true' : 'false'}" data-value="${escapeAttrPj(value)}" onclick="crm2PjSelectStatusFilter(this)">${escapeHtmlPj(label)}</button>`).join('')}</div></div>
        <div class="crm2-pf-search-control ${crm2PjState.searchExpanded ? 'is-expanded' : ''}"><input class="config-input" type="search" aria-label="Buscar pessoa jurídica" placeholder="Busca por razão social ou CNPJ" value="${escapeAttrPj(crm2PjState.search)}" ${crm2PjState.searchExpanded ? '' : 'hidden'} oninput="crm2PjSetSearch(this.value, this)" onfocusout="crm2PjHandleSearchBlur(event)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.form?.requestSubmit(); }"><button class="icon-btn" type="button" title="Buscar" aria-label="Buscar" aria-expanded="${crm2PjState.searchExpanded ? 'true' : 'false'}" onclick="crm2PjToggleSearch(this)"><i data-lucide="search" aria-hidden="true"></i></button></div>
        ${hasFilters ? '<button class="icon-btn crm2-pf-clear-filter" type="button" onclick="crm2PjClearFilters()" title="Limpar filtros" aria-label="Limpar filtros">×</button>' : ''}
      </div>
    </form>
    ${crm2PjState.listState !== 'normal' ? renderStatePj() : pageItems.length ? `<div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap"><table class="ar-crm-phase1-table crm2-pessoas-table" aria-describedby="crm2-pj-caption"><caption id="crm2-pj-caption" class="crm2-pessoas-table-caption">Pessoas jurídicas cadastradas no CRM 2.0</caption><thead><tr><th scope="col">Razão social</th><th scope="col">CNPJ</th><th scope="col">Pedidos</th><th scope="col">Última atualização</th></tr></thead><tbody>${pageItems.map((item) => `<tr><td><button class="crm2-pf-name-link" type="button" onclick="crm2PjOpenDetail('${escapeAttrPj(item.id)}')">${escapeHtmlPj(item.razaoSocial)}</button></td><td>${escapeHtmlPj(maskCnpjPj(item.cnpj))}</td><td>${ordersCountPj(item)}</td><td>${escapeHtmlPj(formatDateTimePj(item.atualizadoEm))}</td></tr>`).join('')}</tbody></table></div>${renderPaginationPj(totalPages, items.length)}` : `<div class="crm2-pessoas-state" role="status"><strong>${crm2PjState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa jurídica cadastrada.'}</strong><span>${crm2PjState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui empresas.'}</span><button class="secondary-btn" type="button" onclick="crm2PjClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`}
    ${renderPjFooter(`<button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar</button>${crm2PjState.canCreate ? '<button class="save-btn" type="button" onclick="crm2PjOpenCreate()">Incluir</button>' : ''}`)}
  </section>`;
}

function renderFieldPj({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '', changed = false }) {
  const error = crm2PjState.errors[name] || '';
  const id = `crm2-pj-${name}`;
  return `<label class="${wide ? 'is-wide ' : ''}${changed ? 'is-changed' : ''}"><span for="${id}">${label}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" placeholder="${escapeAttrPj(placeholder)}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2PjTrackChange(this)">${escapeHtmlPj(value)}</textarea>` : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrPj(value)}" placeholder="${escapeAttrPj(placeholder)}" ${required ? 'required' : ''} ${extra} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2PjTrackChange(this)">`}${error ? `<small class="crm2-field-error">${escapeHtmlPj(error)}</small>` : ''}</label>`;
}

function renderFormPjBase() {
  const values = crm2PjState.draft;
  return `<section class="hub-form-screen crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-form-title"><header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h2 id="crm2-pj-form-title">Novo cadastro PJ</h2></div><span class="crm2-pf-status-pill is-novo-cadastro" role="status">Novo cadastro</span></header><form id="crm2-pj-form" class="hub-form-screen-content crm2-pf-form crm2-pj-form-layout" onsubmit="crm2PjSave(event)" novalidate><section class="hub-form-section"><div class="hub-form-section-title"><strong>Dados da empresa</strong></div><div class="hub-form-grid">${renderFieldPj({ label: 'CNPJ', name: 'cnpj', value: maskCnpjPj(values.cnpj), required: true, extra: 'inputmode="numeric" maxlength="18" onkeyup="crm2PjMaskCnpj(this)"' })}${renderFieldPj({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true })}${renderFieldPj({ label: 'Endereço', name: 'endereco', value: values.endereco, wide: true, placeholder: 'Rua, número, complemento, cidade/UF' })}${renderFieldPj({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}</div></section><div class="hub-form-screen-actions" data-hub-form-footer><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Voltar</button><button class="save-btn" type="submit">Salvar</button></div></form></section>`;
}

function renderFormPj() {
  const html = renderFormPjBase();
  return html.replace('</div></section><div class="hub-form-screen-actions', `</div></section>${renderPjAttachments(null, true)}<div class="hub-form-screen-actions`);
}

function renderEditFormPjBase(item) {
  const values = { ...item, ...crm2PjState.draft };
  const changed = (field) => String(values[field] ?? '').trim() !== String(item?.[field] ?? '').trim();
  return `<section class="hub-form-screen crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-form-title"><header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h2 id="crm2-pj-form-title">Editar cadastro PJ</h2></div><span class="crm2-pf-status-pill" role="status">Edição</span></header><form id="crm2-pj-form" class="hub-form-screen-content crm2-pf-form crm2-pj-form-layout" onsubmit="crm2PjSave(event)" novalidate><main class="crm2-pf-detail-main"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid">${renderFieldPj({ label: 'CNPJ', name: 'cnpj', value: maskCnpjPj(item.cnpj), required: true, extra: 'inputmode="numeric" maxlength="18" readonly' })}${renderFieldPj({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true, changed: changed('razaoSocial') })}${renderFieldPj({ label: 'Endereço', name: 'endereco', value: values.endereco, wide: true, placeholder: 'Rua, número, complemento, cidade/UF', changed: changed('endereco') })}${renderFieldPj({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true, changed: changed('observacoes') })}</div></section><div class="crm2-pf-related-sections"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pessoas vinculadas</strong></div>${renderPjPeopleTab(item)}</section><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pedidos</strong></div>${renderPjOrdersTab(item)}</section></div></main><aside class="crm2-pf-detail-sidebar crm2-pj-detail-sidebar">${renderManualStatusPj({ ...item, ...crm2PjState.draft })}${renderPjAttachments(item, true)}</aside><div class="hub-form-screen-actions" data-hub-form-footer><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Voltar</button><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Cancelar</button><button class="save-btn" type="submit">Salvar alterações</button></div></form></section>`;
}

function renderManualStatusPj(item) {
  const value = item.statusManual || '';
  return `<section class="hub-form-section crm2-pj-status-section"><div class="hub-form-section-title"><strong>Status da empresa</strong></div><div class="hub-form-grid"><label><span>Status manual</span><select class="config-input" name="statusManual" onchange="crm2PjTrackChange(this)"><option value="" ${!value ? 'selected' : ''}>Usar status automático</option><option value="empresa ativa" ${value === 'empresa ativa' ? 'selected' : ''}>Empresa ativa</option><option value="empresa inativa" ${value === 'empresa inativa' ? 'selected' : ''}>Empresa inativa</option><option value="empresa baixada" ${value === 'empresa baixada' ? 'selected' : ''}>Empresa baixada</option></select><small>Status automático atual: ${escapeHtmlPj(automaticStatusPj(item))}. Uma definição manual prevalece sobre o cálculo.</small></label></div></section>`;
}

function renderEditFormPj(item) {
  return renderEditFormPjBase(item);
}

function renderDetailPjLegacy(item) {
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-detail-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h3 id="crm2-pj-detail-title">${escapeHtmlPj(item.razaoSocial)}</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="crm2PjCloseDetail()">Voltar</button></div></div><div class="crm2-pf-view-form"><section class="hub-form-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid"><label><span>CNPJ</span><input class="config-input" value="${escapeAttrPj(maskCnpjPj(item.cnpj))}" readonly></label><label><span>Razão social</span><input class="config-input" value="${escapeAttrPj(item.razaoSocial)}" readonly></label><label class="is-wide"><span>Endereço</span><textarea class="config-input" readonly>${escapeHtmlPj(item.endereco)}</textarea></label><label class="is-wide"><span>Observações</span><textarea class="config-input" readonly>${escapeHtmlPj(item.observacoes)}</textarea></label></div></section><div class="crm2-pf-summary-grid"><article><span>Data de cadastro</span><strong>${escapeHtmlPj(formatDatePj(item.cadastroEm))}</strong></article><article><span>Status</span><strong>${escapeHtmlPj(item.status)}</strong></article></div></div></section>`;
}

function renderPjDataTabBase(item) {
  return `<section class="hub-form-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid"><label><span>CNPJ</span><input class="config-input" value="${escapeAttrPj(maskCnpjPj(item.cnpj))}" readonly></label><label><span>Razão social</span><input class="config-input" value="${escapeAttrPj(item.razaoSocial)}" readonly></label><label class="is-wide"><span>Endereço</span><textarea class="config-input" readonly>${escapeHtmlPj(item.endereco)}</textarea></label><label class="is-wide"><span>Observações</span><textarea class="config-input" readonly>${escapeHtmlPj(item.observacoes)}</textarea></label></div></section><div class="crm2-pf-summary-grid"><article><span>Data de cadastro</span><strong>${escapeHtmlPj(formatDatePj(item.cadastroEm))}</strong></article><article><span>Última atualização</span><strong>${escapeHtmlPj(formatDateTimePj(item.atualizadoEm))}</strong></article><article><span>Status automático</span><strong>${escapeHtmlPj(automaticStatusPj(item))}</strong></article><article><span>Status exibido</span><strong>${escapeHtmlPj(displayedStatusPj(item))}</strong></article></div>`;
}

function renderPjDataTab(item) {
  return `${renderPjDataTabBase(item)}${renderPjAttachments(item, false)}`;
}

function renderPjPeopleTab(item) {
  const people = Array.isArray(item.pessoasVinculadas) ? item.pessoasVinculadas : [];
  return people.length ? `<div class="crm2-pf-companies-table-wrap"><table class="crm2-pf-companies-table" aria-label="Pessoas vinculadas"><thead><tr><th scope="col">Nome</th><th scope="col">CPF</th></tr></thead><tbody>${people.map((person) => `<tr><td>${person.vinculoId ? `<button class="crm2-pf-company-name-link" type="button" onclick="crm2VinculosOpenDetail('${escapeAttrPj(person.vinculoId)}')" aria-label="Abrir vínculo de ${escapeAttrPj(person.nome)}">${escapeHtmlPj(person.nome)}</button>` : escapeHtmlPj(person.nome)}</td><td>${escapeHtmlPj(person.cpf || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma pessoa vinculada.</strong><span>Os vínculos serão habilitados em fase posterior.</span></div>';
}

function renderPjOrdersTab(item) {
  const orders = Array.isArray(item.pedidos) ? item.pedidos : [];
  return orders.length ? `<div class="crm2-pf-companies-table-wrap"><table class="crm2-pf-companies-table" aria-label="Pedidos da pessoa jurídica"><thead><tr><th scope="col">Pedido</th><th scope="col">Produto</th><th scope="col">PF responsável</th><th scope="col">Status</th><th scope="col">Vencimento</th></tr></thead><tbody>${orders.map((order) => `<tr><td>${escapeHtmlPj(order.numero || '—')}</td><td>${escapeHtmlPj(order.produto || '—')}</td><td>${escapeHtmlPj(order.pessoa || '—')}</td><td>${escapeHtmlPj(order.status || '—')}</td><td>${escapeHtmlPj(formatDatePj(order.vencimento))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>Os pedidos serão habilitados em fase posterior.</span></div>';
}

function renderDetailPjReadOnly(item) {
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-detail-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h3 id="crm2-pj-detail-title">${escapeHtmlPj(item.razaoSocial)}</h3></div></div>${crm2PjState.message ? `<p class="admin-message" role="status">${escapeHtmlPj(crm2PjState.message)}</p>` : ''}<div class="crm2-pf-detail-layout crm2-pj-detail-layout"><main class="crm2-pf-detail-main"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div>${renderPjDataTabBase(item)}</section><div class="crm2-pf-related-sections"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pessoas vinculadas</strong></div>${renderPjPeopleTab(item)}</section><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pedidos</strong></div>${renderPjOrdersTab(item)}</section></div></main><aside class="crm2-pf-detail-sidebar crm2-pj-detail-sidebar"><section class="hub-form-section crm2-pj-status-section"><div class="hub-form-section-title"><strong>Status</strong></div><div class="hub-form-grid"><label><span>Status exibido</span><input class="config-input" value="${escapeAttrPj(displayedStatusPj(item))}" readonly></label></div></section>${renderPjAttachments(item, false)}</aside></div>${renderPjFooter(`<button class="secondary-btn" type="button" onclick="crm2PjCloseDetail()">Voltar</button>${crm2PjState.canEdit ? `<button class="save-btn" type="button" onclick="crm2PjOpenEdit('${escapeAttrPj(item.id)}')">Editar</button>` : ''}`)}</section>`;
}

function renderDetailPj(item) {
  if (!item) return renderListPj();
  return renderDetailPjReadOnly(item);
}

function renderPj() {
  permissionsPj();
  if (!crm2PjState.canView) return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true"><div class="crm2-pessoas-state is-error" role="alert"><strong>Acesso não autorizado.</strong><span>É necessária a permissão Visualizar para acessar Pessoas jurídicas.</span><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></section>`;
  const route = currentPjRoute();
  if (route.view === 'new') return renderFormPj();
  if (route.view === 'edit') return getPj(route.id) ? renderEditFormPj(getPj(route.id)) : renderListPj();
  if (route.view === 'detail') return renderDetailPj(getPj(route.id));
  return renderListPj();
}

function mountPj() {
  window.hubLimparDropdowns?.({ remover: true });
  const target = document.querySelector('[data-crm2-pj="true"]');
  if (target) {
    target.outerHTML = renderPj();
    portalHubFormFooter(document.querySelector('[data-crm2-pj="true"]'));
  }
}

function rerenderPj() {
  if (currentPjRoute().view || document.querySelector('[data-crm2-pj="true"]')) mountPj();
}

Object.assign(window, {
  crm2PjRender: renderPj,
  crm2PjGetMockItems() {
    return crm2PjState.items.map((item) => ({
      id: item.id,
      cnpj: item.cnpj,
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia,
      endereco: item.endereco,
      observacoes: item.observacoes,
      status: item.status,
      pessoasVinculadas: Array.isArray(item.pessoasVinculadas) ? item.pessoasVinculadas.map((pessoa) => ({ ...pessoa })) : [],
      pedidos: Array.isArray(item.pedidos) ? item.pedidos.map((pedido) => ({ ...pedido })) : []
    }));
  },
  crm2PjCreateMockFromConversion(payload = {}) {
    if (!payload.razaoSocial || String(payload.cnpj || '').replace(/\D/g, '').length !== 14) return null;
    const now = new Date().toISOString();
    const item = {
      id: `pj-conv-${Date.now()}`,
      cnpj: String(payload.cnpj).replace(/\D/g, ''),
      razaoSocial: String(payload.razaoSocial).trim(), endereco: payload.endereco || '', observacoes: payload.observacoes || '',
      cadastroEm: now, atualizadoEm: now, anexos: [], status: 'empresa ativa', statusAutomatico: 'empresa ativa', statusManual: '',
      pessoasVinculadas: [], pedidos: []
    };
    crm2PjState.items.unshift(item);
    rerenderPj();
    return { ...item, pessoasVinculadas: [], pedidos: [] };
  },
  crm2PjApplyConversionMock(id, payload = {}) {
    const company = crm2PjState.items.find((item) => item.id === id);
    if (!company) return false;
    const now = new Date().toISOString();
    if (payload.observacoes) company.observacoes = payload.observacoes;
    company.pedidos = [...(company.pedidos || []), ...(payload.pedidos || [])];
    company.pessoasVinculadas = [...(company.pessoasVinculadas || []), ...(payload.vinculos || []).map((link) => ({ nome: link.pfNome, cpf: link.pfCpf, tipo: link.tipo, status: link.status, vinculoId: link.id, inicioEm: link.inicioEm, encerramentoEm: link.encerramentoEm }))];
    company.atualizadoEm = now;
    rerenderPj();
    return true;
  },
  crm2PjMount: mountPj,
  navegarParaCrm2PjRota() { navigatePj(); },
  crm2PjOpenCreate() {
    if (!crm2PjState.canCreate) return;
    crm2PjState.formMode = 'create'; crm2PjState.draft = {}; crm2PjState.errors = {}; crm2PjState.message = '';
    crm2PjState.attachmentDraft = []; crm2PjState.attachmentRemoved = [];
    navigatePj('novo');
  },
  crm2PjOpenEdit(id) {
    if (!crm2PjState.canEdit) return;
    const item = getPj(id);
    if (!item) return;
    crm2PjState.formMode = 'edit';
    crm2PjState.detailId = id;
    crm2PjState.detailTab = 'dados';
    crm2PjState.draft = {};
    crm2PjState.attachmentDraft = [];
    crm2PjState.attachmentRemoved = [];
    crm2PjState.errors = {};
    crm2PjState.message = '';
    navigatePj(`${id}/editar`);
  },
  crm2PjOpenDetail(id) { if (getPj(id)) { crm2PjState.detailId = id; crm2PjState.detailTab = 'dados'; crm2PjState.message = ''; navigatePj(id); } },
  crm2PjSelectTab(tab) { if (['dados', 'pessoas', 'pedidos'].includes(tab)) { crm2PjState.detailTab = tab; rerenderPj(); } },
  crm2PjCloseDetail() { crm2PjState.detailId = ''; crm2PjState.detailTab = 'dados'; crm2PjState.message = ''; navigatePj(); },
  crm2PjCancelForm() { if (!requestLeavePj(() => window.crm2PjCancelForm())) return; crm2PjState.formMode = ''; crm2PjState.detailId = ''; crm2PjState.draft = {}; crm2PjState.errors = {}; crm2PjState.attachmentDraft = []; crm2PjState.attachmentRemoved = []; navigatePj(); },
  crm2PjConfirmLeave() { document.querySelector('.crm2-pj-unsaved-backdrop')?.remove(); const action = pendingLeaveActionPj; pendingLeaveActionPj = null; crm2PjState.draft = {}; crm2PjState.attachmentDraft = []; crm2PjState.attachmentRemoved = []; action?.(); },
  crm2PjCancelLeave() { pendingLeaveActionPj = null; document.querySelector('.crm2-pj-unsaved-backdrop')?.remove(); },
  crm2PjSetSearch(value, input) {
    window.hubAtualizarBuscaAoDigitar(input, (search) => { crm2PjState.search = search; crm2PjState.searchExpanded = true; crm2PjState.page = 1; }, rerenderPj, () => document.querySelector('.crm2-pf-search-control input[type="search"]'));
  },
  crm2PjToggleDropdown(trigger, event) { window.crm2PfToggleDropdown?.(trigger, event); },
  crm2PjSelectStatusFilter(option) { const menu = option?.closest('.hub-filter-dropdown-menu'); if (!menu) return; menu.remove(); crm2PjState.statusFilter = String(option.dataset.value || ''); crm2PjState.page = 1; rerenderPj(); },
  crm2PjToggleSearch(button) { const control = button?.closest('.crm2-pf-search-control'); const input = control?.querySelector('input[type="search"]'); if (!control || !input) return; const expanded = !control.classList.contains('is-expanded'); crm2PjState.searchExpanded = expanded; control.classList.toggle('is-expanded', expanded); input.hidden = !expanded; button.setAttribute('aria-expanded', String(expanded)); if (expanded) input.focus({ preventScroll: true }); },
  crm2PjHandleSearchBlur(event) { const input = event?.currentTarget; const control = input?.closest('.crm2-pf-search-control'); if (!control || control.contains(event.relatedTarget)) return; window.setTimeout(() => { if (control.contains(document.activeElement)) return; crm2PjState.searchExpanded = false; control.classList.remove('is-expanded'); input.hidden = true; control.querySelector('button')?.setAttribute('aria-expanded', 'false'); }, 0); },
  crm2PjSetFilter(value) { crm2PjState.statusFilter = String(value || ''); crm2PjState.page = 1; rerenderPj(); },
  crm2PjClearFilters() { window.clearTimeout(crm2PjSearchTimer); crm2PjState.search = ''; crm2PjState.searchExpanded = false; crm2PjState.statusFilter = ''; crm2PjState.page = 1; rerenderPj(); },
  crm2PjApplyFilters(event) { event?.preventDefault(); crm2PjState.page = 1; rerenderPj(); },
  crm2PjSetPage(page) { crm2PjState.page = Math.max(1, Number(page) || 1); rerenderPj(); },
  crm2PjSetListState(value) { crm2PjState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal'; rerenderPj(); },
  crm2PjMaskCnpj(input) { input.value = maskCnpjPj(input.value); crm2PjState.draft.cnpj = input.value; },
  crm2PjTrackChange(input) {
    if (!input?.name) return;
    crm2PjState.draft[input.name] = input.value;
    if (crm2PjState.formMode !== 'edit') return;
    const original = getPj(crm2PjState.detailId || currentPjRoute().id);
    const changed = original && String(input.value || '').trim() !== String(original[input.name] || '').trim();
    input.closest('label')?.classList.toggle('is-changed', Boolean(changed));
  },
  crm2PjSelectAttachment(input) {
    const allowed = crm2PjState.formMode === 'edit' ? crm2PjState.canEdit : crm2PjState.canCreate;
    if (!allowed) return;
    crm2PjState.attachmentDraft.push(...Array.from(input?.files || []).map(fileToAttachmentPj));
    rerenderPj();
  },
  crm2PjUpdateAttachmentDraft(index, field, value) {
    const attachment = crm2PjState.attachmentDraft[index];
    if (!attachment || !['nome', 'validade'].includes(field)) return;
    attachment[field] = String(value || '');
  },
  crm2PjRemoveAttachment(source, index) {
    if (!crm2PjState.canDelete && crm2PjState.formMode === 'edit') return;
    if (!window.confirm('Remover este anexo do estado mockado?')) return;
    if (source === 'draft') crm2PjState.attachmentDraft.splice(Number(index), 1);
    else if (!crm2PjState.attachmentRemoved.includes(Number(index))) crm2PjState.attachmentRemoved.push(Number(index));
    rerenderPj();
  },
  crm2PjViewAttachment(source, index) {
    const item = getPj(crm2PjState.detailId || currentPjRoute().id);
    const attachment = source === 'draft' ? crm2PjState.attachmentDraft[index] : item?.anexos?.[index];
    if (attachment?.previewUrl || attachment?.url) window.open(attachment.previewUrl || attachment.url, '_blank', 'noopener,noreferrer');
  },
  crm2PjDownloadAttachment(source, index) {
    const item = getPj(crm2PjState.detailId || currentPjRoute().id);
    const attachment = source === 'draft' ? crm2PjState.attachmentDraft[index] : item?.anexos?.[index];
    if (!attachment) return;
    const blob = typeof File !== 'undefined' && attachment.arquivo instanceof File
      ? attachment.arquivo
      : new Blob([`Nome: ${attachment.nome}\nTipo: ${attachment.tipo}\nValidade: ${attachment.validade || 'Sem validade'}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.nome || 'anexo-pj';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  crm2PjSave(event) {
    event?.preventDefault();
    if (crm2PjState.formMode === 'edit' ? !crm2PjState.canEdit : !crm2PjState.canCreate) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.cnpj = String(values.cnpj || '').replace(/\D/g, '');
    values.razaoSocial = String(values.razaoSocial || '').trim();
    const errors = {};
    if (!validateCnpjPj(values.cnpj)) errors.cnpj = 'Informe um CNPJ válido.';
    if (!values.razaoSocial) errors.razaoSocial = 'Informe a razão social.';
    if (crm2PjState.items.some((item) => item.cnpj === values.cnpj && (crm2PjState.formMode !== 'edit' || item.id !== crm2PjState.detailId))) errors.cnpj = 'Já existe uma pessoa jurídica mockada com este CNPJ.';
    if (Object.keys(errors).length) { crm2PjState.errors = errors; crm2PjState.draft = { ...crm2PjState.draft, ...values }; rerenderPj(); return; }
    const now = new Date().toISOString();
    if (crm2PjState.formMode === 'edit') {
      const item = getPj(crm2PjState.detailId || currentPjRoute().id);
      if (!item) return;
      item.anexos = (item.anexos || []).filter((attachment, index) => !crm2PjState.attachmentRemoved.includes(index));
      item.anexos.push(...crm2PjState.attachmentDraft);
      item.statusManual = ['empresa ativa', 'empresa inativa', 'empresa baixada'].includes(values.statusManual) ? values.statusManual : '';
      Object.assign(item, { razaoSocial: values.razaoSocial, endereco: values.endereco || '', observacoes: values.observacoes || '', status: displayedStatusPj(item), atualizadoEm: now });
      crm2PjState.formMode = '';
      crm2PjState.draft = {};
      crm2PjState.errors = {};
      crm2PjState.attachmentDraft = [];
      crm2PjState.attachmentRemoved = [];
      crm2PjState.message = 'Pessoa jurídica atualizada no estado mockado. Nenhum dado foi persistido.';
      navigatePj(item.id);
      return;
    }
    const item = { ...values, id: `pj-mock-${Date.now()}`, cadastroEm: now, atualizadoEm: now, status: 'empresa inativa', statusAutomatico: 'empresa inativa', statusManual: '', anexos: [...crm2PjState.attachmentDraft], pessoasVinculadas: [], pedidos: [] };
    crm2PjState.items.unshift(item); crm2PjState.formMode = ''; crm2PjState.draft = {}; crm2PjState.attachmentDraft = []; crm2PjState.attachmentRemoved = []; crm2PjState.message = 'Pessoa jurídica criada no estado mockado. Nenhum dado foi persistido.'; navigatePj(item.id);
  }
});

observarContextoAcessoHub(() => { permissionsPj(); if (currentPjRoute().view || document.querySelector('[data-crm2-pj="true"]')) mountPj(); });
permissionsPj();
