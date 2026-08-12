import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';
import { getHubAttachmentPreviewKind, hydrateHubPdfThumbnails, renderHubAttachmentManager } from './hubAttachmentManager.js';
import { portalHubFormFooter } from './formFooterPortal.js';
import { consultarCnpj } from './services/cnpjService.js';

const CRM2_PJ_INITIAL_ITEMS = [
  {
    id: 'pj-001',
    cnpj: '04252011000110',
    razaoSocial: 'Transmares Tecnologia Ltda.',
    porte: 'Médio',
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
    porte: 'Pequeno',
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
  },
  {
    id: 'pj-003',
    cnpj: '11222333000144',
    razaoSocial: 'Horizonte Contábil Ltda.',
    porte: 'Microempresa',
    endereco: '',
    observacoes: 'Empresa em avaliação de certificados.',
    cadastroEm: '2026-07-28T14:10:00',
    atualizadoEm: '2026-08-02T11:30:00',
    anexos: [],
    status: 'empresa ativa',
    statusAutomatico: 'empresa ativa',
    statusManual: '',
    pessoasVinculadas: [],
    pedidos: []
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
  inlineEditing: false,
  draft: {},
  cnpjGate: { value: '', status: '', companyId: '', message: '' },
  attachmentDraft: [],
  attachmentSelectionDraft: [],
  attachmentRemoved: [],
  attachmentSelectionMode: false,
  selectedAttachmentKeys: [],
  attachmentView: 'list',
  attachmentInlineEditKey: '',
  attachmentInlineDraft: null,
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
function upperPj(value = '') { return String(value ?? '').trim().toLocaleUpperCase('pt-BR'); }

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

function maskCpfPj(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskCepPj(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
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
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
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

function renderAutomaticStatusPillPj(item = {}) {
  const status = automaticStatusPj(item);
  const slug = normalizeSearchPj(status).replace(/\s+/g, '-');
  const label = {
    'empresa ativa': 'Empresa ativa',
    'empresa inativa': 'Empresa inativa'
  }[status] || status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="crm2-pf-status-pill is-${escapeAttrPj(slug)}" role="status">${escapeHtmlPj(label)}</span>`;
}


function mapApiStatusPj(value = '') {
  const normalized = normalizeSearchPj(value);
  if (normalized.includes('baixad')) return 'empresa baixada';
  if (normalized.includes('ativ')) return 'empresa ativa';
  return normalized ? 'empresa inativa' : '';
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
      || crm2PjState.attachmentDraft.length > 0
      || crm2PjState.attachmentSelectionDraft.length > 0;
  }
  if (crm2PjState.formMode !== 'edit' || !crm2PjState.inlineEditing || route.view !== 'detail') return false;
  const original = getPj(crm2PjState.detailId || route.id);
  return Boolean(original && ['razaoSocial', 'endereco', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidadeEstado', 'uf', 'observacoes', 'statusManual']
    .some((field) => String(crm2PjState.draft[field] ?? original[field] ?? '').trim() !== String(original[field] ?? '').trim())
    || crm2PjState.attachmentDraft.length > 0
    || crm2PjState.attachmentSelectionDraft.length > 0
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

function renderPjAttachments(item, editing = false) {
  const existing = (item?.anexos || []).map((attachment, index) => ({ ...attachment, source: 'existing', index }))
    .filter((attachment) => !crm2PjState.attachmentRemoved.includes(attachment.index));
  const pending = crm2PjState.attachmentDraft.map((attachment, index) => ({ ...attachment, source: 'draft', index }));
  return renderHubAttachmentManager({
    id: 'crm2-pj-attachments-title',
    className: 'crm2-pj-attachments crm2-pf-attachments-container',
    attachments: [...existing, ...pending],
    drafts: crm2PjState.attachmentSelectionDraft,
    editing,
    canView: crm2PjState.canView,
    canInclude: crm2PjState.canEdit || (crm2PjState.formMode === 'create' && crm2PjState.canCreate),
    canEdit: crm2PjState.canEdit,
    canDelete: editing && crm2PjState.canDelete,
    showBatchActions: crm2PjState.canView && !crm2PjState.attachmentSelectionDraft.length,
    selectionMode: crm2PjState.attachmentSelectionMode,
    selectedKeys: crm2PjState.selectedAttachmentKeys,
    viewMode: crm2PjState.attachmentView,
    inlineEditKey: crm2PjState.attachmentInlineEditKey,
    inlineDraft: crm2PjState.attachmentInlineDraft,
    formatDate: (value) => value ? formatDatePj(value) : 'Sem validade',
    handlers: {
      selectFiles: () => 'crm2PjSelectAttachment(this)',
      openEdit: () => `crm2PjOpenEdit('${escapeAttrPj(item?.id || crm2PjState.detailId)}')`,
      cancelDraft: () => 'crm2PjCancelAttachmentDraft()',
      confirmDraft: () => 'crm2PjConfirmAttachmentDraft()',
      toggleSelection: () => 'crm2PjToggleAttachmentSelection()',
      downloadAll: () => 'crm2PjDownloadAllAttachments()',
      downloadSelected: () => 'crm2PjDownloadSelectedAttachments()',
      deleteSelected: () => 'crm2PjDeleteSelectedAttachments()',
      setView: (view) => `crm2PjSetAttachmentView('${escapeAttrPj(view)}')`,
      updateDraftName: (index) => `crm2PjUpdateAttachmentDraft(${index}, 'nome', this.value)`,
      updateDraftExpiration: (index) => `crm2PjUpdateAttachmentDraft(${index}, 'validade', this.value)`,
      maskDraftDate: (index) => `crm2PjMaskAttachmentDraftDate(${index}, this)`,
      pickDraftDate: (index) => `crm2PjSetAttachmentDraftDateFromPicker(${index}, this.value)`,
      view: (source, index) => `crm2PjViewAttachment('${escapeAttrPj(source)}', ${index})`,
      editInline: (source, index) => `crm2PjToggleAttachmentInlineEdit('${escapeAttrPj(source)}', ${index})`,
      updateInlineName: () => "crm2PjUpdateAttachmentInlineDraft('nome', this.value)",
      maskDate: () => 'crm2PjMaskAttachmentDate(this)',
      pickDate: () => 'crm2PjSetAttachmentDateFromPicker(this.value)',
      saveInlineEdit: () => 'crm2PjSaveAttachmentInlineEdit()',
      cancelInlineEdit: () => 'crm2PjCancelAttachmentInlineEdit()',
      download: (source, index) => `crm2PjDownloadAttachment('${escapeAttrPj(source)}', ${index})`,
      delete: (source, index) => `crm2PjRemoveAttachment('${escapeAttrPj(source)}', ${index})`,
      toggleSelected: (source, index) => `crm2PjToggleAttachmentSelected('${escapeAttrPj(source)}', ${index}, this.checked)`
    }
  });
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
    ${crm2PjState.listState !== 'normal' ? renderStatePj() : pageItems.length ? `<div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap"><table class="ar-crm-phase1-table crm2-pessoas-table" aria-describedby="crm2-pj-caption"><caption id="crm2-pj-caption" class="crm2-pessoas-table-caption">Pessoas jurídicas cadastradas no CRM 2.0</caption><thead><tr><th scope="col">Razão social</th><th scope="col">CNPJ</th><th scope="col">Pedidos</th><th scope="col">Última atualização</th></tr></thead><tbody>${pageItems.map((item) => `<tr><td><button class="crm2-pf-name-link" type="button" onclick="crm2PjOpenDetail('${escapeAttrPj(item.id)}')">${escapeHtmlPj(upperPj(item.razaoSocial))}</button></td><td>${escapeHtmlPj(maskCnpjPj(item.cnpj))}</td><td>${ordersCountPj(item)}</td><td>${escapeHtmlPj(formatDateTimePj(item.atualizadoEm))}</td></tr>`).join('')}</tbody></table></div>${renderPaginationPj(totalPages, items.length)}` : `<div class="crm2-pessoas-state" role="status"><strong>${crm2PjState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa jurídica cadastrada.'}</strong><span>${crm2PjState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui empresas.'}</span><button class="secondary-btn" type="button" onclick="crm2PjClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`}
    ${renderPjFooter(`<button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar</button>${crm2PjState.canCreate ? '<button class="save-btn" type="button" onclick="crm2PjOpenCreate()">Incluir</button>' : ''}`)}
  </section>`;
}

function renderFieldPj({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '', changed = false, formId = '' }) {
  if (name === 'observacoes' && type === 'textarea') return renderPjObservationField(value, true, changed);
  const error = crm2PjState.errors[name] || '';
  const id = `crm2-pj-${name}`;
  const displayValue = name === 'razaoSocial' ? upperPj(value) : value;
  const formAttribute = formId ? ` form="${escapeAttrPj(formId)}"` : '';
  return `<label class="${wide ? 'is-wide ' : ''}${changed ? 'is-changed' : ''}"><span for="${id}">${label}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" placeholder="${escapeAttrPj(placeholder)}" ${required ? 'required' : ''}${formAttribute} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2PjTrackChange(this)">${escapeHtmlPj(displayValue)}</textarea>` : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrPj(displayValue)}" placeholder="${escapeAttrPj(placeholder)}" ${required ? 'required' : ''} ${extra}${formAttribute} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2PjTrackChange(this)">`}${error ? `<small class="crm2-field-error">${escapeHtmlPj(error)}</small>` : ''}</label>`;
}

function renderPjObservationField(value = '', editing = false, changed = false) {
  if (!editing) return `<label class="crm2-pf-readonly-field"><span>Observações</span><textarea class="config-input" readonly aria-readonly="true">${escapeHtmlPj(value || 'Nenhuma observação registrada.')}</textarea></label>`;
  return `<label class="crm2-pj-observation-field ${changed ? 'is-changed' : ''}"><span>Observações</span><div id="crm2-pj-observacoes-editor" class="config-input crm2-pf-rich-text-target crm2-pj-rich-text-target" contenteditable="true" role="textbox" aria-multiline="true" data-field-name="observacoes" oninput="crm2PjSyncObservation(this)" onkeydown="crm2PjFormatObservationKeydown(event, this)">${escapeHtmlPj(value)}</div><textarea class="crm2-pf-rich-text-value crm2-pj-rich-text-value" name="observacoes" hidden>${escapeHtmlPj(value)}</textarea><div class="crm2-pf-text-format-toolbar" role="toolbar" aria-label="Formatação das observações"><button class="icon-btn" type="button" title="Negrito" aria-label="Negrito" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('bold')"><i data-lucide="bold" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Itálico" aria-label="Itálico" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('italic')"><i data-lucide="italic" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Sublinhado" aria-label="Sublinhado" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('underline')"><i data-lucide="underline" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Tachado" aria-label="Tachado" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('strike')"><i data-lucide="strikethrough" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Lista com marcadores" aria-label="Lista com marcadores" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('bullet')"><i data-lucide="list" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Lista numerada" aria-label="Lista numerada" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('ordered')"><i data-lucide="list-ordered" aria-hidden="true"></i></button><button class="icon-btn" type="button" title="Limpar formatação" aria-label="Limpar formatação" onmousedown="event.preventDefault()" onclick="crm2PjFormatObservation('clear')"><i data-lucide="remove-formatting" aria-hidden="true"></i></button></div></label>`;
}

function pjAddressValues(item = {}) {
  return {
    cep: item.cep || '',
    logradouro: item.logradouro || item.endereco || '',
    numero: item.numero || '',
    complemento: item.complemento || '',
    bairro: item.bairro || '',
    cidadeEstado: item.cidadeEstado || '',
    uf: item.uf || ''
  };
}

function renderPjStatusField(item = {}, editing = false, formId = '') {
  if (!editing) return `<label><span>Situação na RFB</span><input class="config-input" value="${escapeAttrPj(displayedStatusPj(item))}" readonly></label>`;
  const value = item.statusManual || '';
  const formAttribute = formId ? ` form="${escapeAttrPj(formId)}"` : '';
  return `<label><span>Situação na RFB</span><select class="config-input" name="statusManual"${formAttribute} onchange="crm2PjTrackChange(this)"><option value="" ${!value ? 'selected' : ''}>Usar status automático</option><option value="empresa ativa" ${value === 'empresa ativa' ? 'selected' : ''}>Empresa ativa</option><option value="empresa inativa" ${value === 'empresa inativa' ? 'selected' : ''}>Empresa inativa</option><option value="empresa baixada" ${value === 'empresa baixada' ? 'selected' : ''}>Empresa baixada</option></select></label>`;
}

function renderPjAddressFields(item = {}, editing = false, formId = '') {
  const values = pjAddressValues(item);
  const field = (label, name) => editing
    ? renderFieldPj({ label, name, value: name === 'cep' ? maskCepPj(values[name]) : values[name], formId, extra: name === 'cep' ? 'inputmode="numeric" maxlength="9" onkeyup="crm2PjMaskCep(this)"' : '', changed: item[name] !== undefined && String(values[name]) !== String(item[name] || '') })
    : `<label><span>${label}</span><input class="config-input" value="${escapeAttrPj(name === 'cep' ? maskCepPj(values[name]) : values[name])}" readonly></label>`;
  return `<div class="crm2-pj-data-row crm2-pj-data-row-address">${field('CEP', 'cep')}${field('Logradouro', 'logradouro')}${field('Número', 'numero')}</div><div class="crm2-pj-data-row crm2-pj-data-row-complement">${field('Complemento', 'complemento')}${field('Bairro', 'bairro')}${field('Cidade', 'cidadeEstado')}${field('UF', 'uf')}</div>`;
}

function renderCnpjVerificationPj(values = {}) {
  const gate = crm2PjState.cnpjGate;
  const verified = gate.status === 'not-found';
  return `
    <section class="hub-form-section crm2-pf-cpf-verification crm2-pj-cnpj-verification" aria-labelledby="crm2-pj-cnpj-title">
      <div class="hub-form-section-title"><strong id="crm2-pj-cnpj-title">Dados da empresa</strong></div>
      <form class="hub-form-grid ${gate.status === 'found' ? 'crm2-pf-cpf-has-found-actions' : ''} ${verified ? 'crm2-pf-cpf-has-personal-fields' : ''}" onsubmit="crm2PjSearchCnpj(event)" novalidate>
        <label class="${gate.status === 'invalid' ? 'is-invalid' : ''}">
          <span>CNPJ *</span>
          <span class="crm2-pf-cpf-input-wrap">
            <input class="config-input" name="cnpj" inputmode="numeric" autocomplete="off" maxlength="18" placeholder="Consulte o CNPJ antes de iniciar o cadastro." value="${escapeAttrPj(maskCnpjPj(gate.value))}" oninput="crm2PjMaskCnpjGate(this)" ${verified ? 'readonly' : ''} required autofocus aria-invalid="${gate.status === 'invalid' ? 'true' : 'false'}">
            <button class="crm2-pf-cpf-icon" type="${verified ? 'button' : 'submit'}" ${verified ? 'onclick="crm2PjChangeCnpj()"' : ''} aria-label="${verified ? 'Alterar CNPJ' : 'Consultar CNPJ'}" title="${verified ? 'Alterar CNPJ' : 'Consultar CNPJ'}"><i data-lucide="${verified ? 'eraser' : 'search'}" aria-hidden="true"></i></button>
          </span>
          ${gate.status === 'invalid' ? '<small class="crm2-field-error">Informe um CNPJ válido para continuar.</small>' : ''}
          ${gate.status === 'found' ? '<small class="crm2-pf-cpf-found-message" role="alert">Já existe cadastro para este CNPJ.</small>' : ''}
        </label>
        ${verified ? renderFieldPj({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true, formId: 'crm2-pj-form' }) : ''}
        ${verified ? renderPjStatusField(values, true, 'crm2-pj-form') : ''}
        ${verified ? renderPjAddressFields(values, true, 'crm2-pj-form') : ''}
        ${gate.status === 'found' ? `<div class="crm2-pf-cpf-found-actions" role="group" aria-label="Ações do CNPJ"><button class="secondary-btn" type="button" onclick="crm2PjOpenDetail('${escapeAttrPj(gate.companyId)}')">Abrir cadastro</button><button class="secondary-btn" type="button" onclick="crm2PjChangeCnpj()">Consultar outro CNPJ</button></div>` : ''}
      </form>
    </section>
  `;
}

function renderFormPjBase() {
  const values = crm2PjState.draft;
  const verified = crm2PjState.cnpjGate.status === 'not-found';
  const form = verified ? `<form id="crm2-pj-form" class="hub-form-screen-content crm2-pf-form crm2-pj-form-layout" onsubmit="crm2PjSave(event)" novalidate><input type="hidden" name="cnpj" value="${escapeAttrPj(gateValuePj())}"><div class="crm2-pf-notes-attachments-grid"><section class="hub-form-section crm2-pf-notes-block" aria-labelledby="crm2-pj-notes-title"><div class="hub-form-grid">${renderPjObservationField(values.observacoes, true)}</div></section>${renderPjAttachments(null, true)}</div><div class="hub-form-screen-actions" data-hub-form-footer><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Voltar</button><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Cancelar</button><button class="save-btn" type="submit">Salvar</button></div></form>` : '';
  return `<section class="hub-form-screen crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-form-title"><header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><div class="crm2-pj-title-row"><h2 id="crm2-pj-form-title">Novo cadastro PJ</h2></div></div><div class="crm2-pf-form-header-actions">${verified ? '<span class="crm2-pf-status-pill is-novo-cadastro" role="status">Novo cadastro</span>' : ''}</div></header>${renderCnpjVerificationPj(values)}${form}</section>`;
}

function gateValuePj() {
  return String(crm2PjState.cnpjGate.value || crm2PjState.draft.cnpj || '').replace(/\D/g, '');
}

function renderFormPj() {
  return renderFormPjBase();
}

function renderEditFormPjBase(item) {
  const values = { ...item, ...crm2PjState.draft };
  const changed = (field) => String(values[field] ?? '').trim() !== String(item?.[field] ?? '').trim();
  return `<section class="hub-form-screen crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-form-title"><header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><div class="crm2-pj-title-row"><h2 id="crm2-pj-form-title">Editar cadastro PJ</h2></div></div><div class="crm2-pf-form-header-actions">${renderAutomaticStatusPillPj(item)}<span class="crm2-pf-status-pill" role="status">Edição</span></div></header><form id="crm2-pj-form" class="hub-form-screen-content crm2-pf-form crm2-pj-form-layout" onsubmit="crm2PjSave(event)" novalidate><main class="crm2-pf-detail-main"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid crm2-pj-data-grid"><div class="crm2-pj-data-row crm2-pj-data-row-main">${renderFieldPj({ label: 'CNPJ', name: 'cnpj', value: maskCnpjPj(item.cnpj), required: true, extra: 'inputmode="numeric" maxlength="18" readonly' })}${renderFieldPj({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true, changed: changed('razaoSocial') })}${renderPjStatusField({ ...item, ...values }, true)}</div>${renderPjAddressFields({ ...item, ...values }, true)}</div></section><div class="crm2-pf-related-sections"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pessoas vinculadas</strong></div>${renderPjPeopleTab(item)}</section><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pedidos</strong></div>${renderPjOrdersTab(item)}</section></div></main><aside class="crm2-pf-detail-sidebar crm2-pj-detail-sidebar"><section class="hub-form-section crm2-pj-observations-section"><div class="hub-form-section-title"><strong>Observações</strong></div>${renderFieldPj({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true, changed: changed('observacoes') })}</section>${renderPjAttachments(item, true)}</aside><div class="hub-form-screen-actions" data-hub-form-footer><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Voltar</button><button class="secondary-btn" type="button" onclick="crm2PjCancelForm()">Cancelar</button><button class="save-btn" type="submit">Salvar alterações</button></div></form></section>`;
}

function renderManualStatusPj(item) {
  const value = item.statusManual || '';
  return `<section class="hub-form-section crm2-pj-status-section"><div class="hub-form-section-title"><strong>Status da empresa</strong></div><div class="hub-form-grid"><label><span>Status manual</span><select class="config-input" name="statusManual" onchange="crm2PjTrackChange(this)"><option value="" ${!value ? 'selected' : ''}>Usar status automático</option><option value="empresa ativa" ${value === 'empresa ativa' ? 'selected' : ''}>Empresa ativa</option><option value="empresa inativa" ${value === 'empresa inativa' ? 'selected' : ''}>Empresa inativa</option><option value="empresa baixada" ${value === 'empresa baixada' ? 'selected' : ''}>Empresa baixada</option></select><small>Status automático atual: ${escapeHtmlPj(automaticStatusPj(item))}. Uma definição manual prevalece sobre o cálculo.</small></label></div></section>`;
}

function renderEditFormPj(item) {
  return renderEditFormPjBase(item);
}

function renderDetailPjLegacy(item) {
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-detail-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><h3 id="crm2-pj-detail-title">${escapeHtmlPj(upperPj(item.razaoSocial))}</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="crm2PjCloseDetail()">Voltar</button></div></div><div class="crm2-pf-view-form"><section class="hub-form-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid"><label><span>CNPJ</span><input class="config-input" value="${escapeAttrPj(maskCnpjPj(item.cnpj))}" readonly></label><label><span>Razão social</span><input class="config-input" value="${escapeAttrPj(item.razaoSocial)}" readonly></label><label class="is-wide"><span>Endereço</span><textarea class="config-input" readonly>${escapeHtmlPj(item.endereco)}</textarea></label><label class="is-wide"><span>Observações</span><textarea class="config-input" readonly>${escapeHtmlPj(item.observacoes)}</textarea></label></div></section><div class="crm2-pf-summary-grid"><article><span>Status</span><strong>${escapeHtmlPj(item.status)}</strong></article></div></div></section>`;
}

function renderPjDataTabBase(item, editing = false) {
  const values = editing ? { ...item, ...crm2PjState.draft } : item;
  const main = editing
    ? `${renderFieldPj({ label: 'CNPJ', name: 'cnpj', value: maskCnpjPj(item.cnpj), required: true, extra: 'inputmode="numeric" maxlength="18" readonly' })}${renderFieldPj({ label: 'Razão social', name: 'razaoSocial', value: values.razaoSocial, required: true, changed: String(values.razaoSocial || '') !== String(item.razaoSocial || '') })}${renderPjStatusField(values, true)}`
    : `<label><span>CNPJ</span><input class="config-input" value="${escapeAttrPj(maskCnpjPj(item.cnpj))}" readonly></label><label><span>Razão social</span><input class="config-input" value="${escapeAttrPj(item.razaoSocial)}" readonly></label>${renderPjStatusField(item)}`;
  return `<section class="hub-form-section"><div class="hub-form-section-title"><strong>Dados cadastrais</strong></div><div class="hub-form-grid crm2-pj-data-grid"><div class="crm2-pj-data-row crm2-pj-data-row-main">${main}</div>${editing ? renderPjAddressFields(values, true) : renderPjAddressFields(item)}</div></section>`;
}

function renderPjDataTab(item) {
  return `${renderPjDataTabBase(item)}${renderPjAttachments(item, false)}`;
}

function renderPjPeopleTab(item) {
  const people = Array.isArray(item.pessoasVinculadas) ? item.pessoasVinculadas : [];
  const actions = crm2PjState.canDelete;
  const content = people.length ? `<div class="crm2-pf-companies-table-wrap"><table class="crm2-pf-companies-table crm2-pj-people-table" aria-label="Pessoas vinculadas"><thead><tr><th scope="col">Nome</th><th scope="col">CPF</th>${actions ? '<th scope="col">Ações</th>' : ''}</tr></thead><tbody>${people.map((person, index) => `<tr><td>${person.vinculoId ? `<button class="crm2-pf-company-name-link" type="button" onclick="crm2VinculosOpenDetail('${escapeAttrPj(person.vinculoId)}')" aria-label="Abrir vínculo de ${escapeAttrPj(person.nome)}">${escapeHtmlPj(person.nome)}</button>` : escapeHtmlPj(person.nome)}</td><td>${person.cpf ? escapeHtmlPj(maskCpfPj(person.cpf)) : '—'}</td>${actions ? `<td class="crm2-pj-people-actions"><button class="icon-btn crm2-pf-vinculo-delete" type="button" onclick="crm2PjRemoveVinculo('${escapeAttrPj(item.id)}', ${index})" aria-label="Excluir vínculo de ${escapeAttrPj(person.nome)}" title="Excluir vínculo"><i data-lucide="trash-2" aria-hidden="true"></i></button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma pessoa vinculada.</strong><span>Os vínculos serão habilitados em fase posterior.</span></div>';
  return `<div class="crm2-pj-people-content">${content}</div>`;
}

function enhancePjPeopleSection(root = document) {
  if (!crm2PjState.canCreate) return;
  root.querySelectorAll?.('.crm2-pf-related-sections .crm2-pf-detail-section').forEach((section) => {
    const title = section.querySelector('.hub-form-section-title');
    if (title?.querySelector('[data-crm2-pj-people-include]')) return;
    if (title?.querySelector('strong')?.textContent?.trim() !== 'Pessoas vinculadas') return;
    const button = document.createElement('button');
    button.className = 'save-btn crm2-pf-company-include';
    button.type = 'button';
    button.dataset.crm2PjPeopleInclude = 'true';
    button.textContent = 'Incluir';
    button.addEventListener('click', () => window.crm2VinculosOpenCreate?.());
    title.appendChild(button);
  });
}

function iniciarObserverPjPeopleSection() {
  const iniciar = () => {
    const observer = new MutationObserver(() => {
      const root = document.querySelector('[data-crm2-pj="true"]');
      if (root) {
        enhancePjPeopleSection(root);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}

iniciarObserverPjPeopleSection();

function renderPjOrdersTab(item) {
  const orders = Array.isArray(item.pedidos) ? item.pedidos : [];
  return orders.length ? `<div class="crm2-pf-companies-table-wrap"><table class="crm2-pf-companies-table crm2-pj-orders-table" aria-label="Pedidos da pessoa jurídica"><thead><tr><th scope="col">Pedido</th><th scope="col">Produto</th><th scope="col">Vencimento</th></tr></thead><tbody>${orders.map((order) => `<tr><td>${order.numero ? `<button class="crm2-pj-order-number-link" type="button" onclick="crm2PjOpenOrder('${escapeAttrPj(order.numero)}')">${escapeHtmlPj(order.numero)}</button>` : '—'}</td><td><strong>${escapeHtmlPj(order.produto || '—')}</strong>${order.pessoa ? `<span class="crm2-pf-order-meta-pill">${escapeHtmlPj(order.pessoa)}</span>` : ''}</td><td>${escapeHtmlPj(formatDatePj(order.vencimento))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>Os pedidos serão habilitados em fase posterior.</span></div>';
}

function openPjOrder(numero = '') {
  const order = window.crm2PedidosGetMockItems?.().find((item) => item.numero === numero);
  if (order?.id && typeof window.crm2PedidosOpenDetail === 'function') window.crm2PedidosOpenDetail(order.id);
  else window.navegarParaCrm2PedidosRota?.();
}

function renderDetailPjReadOnly(item) {
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-detail-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><div class="crm2-pj-title-row"><h3 id="crm2-pj-detail-title">${escapeHtmlPj(upperPj(item.razaoSocial))}</h3></div></div><div class="crm2-pessoas-header-actions">${renderAutomaticStatusPillPj(item)}</div></div>${crm2PjState.message ? `<p class="admin-message" role="status">${escapeHtmlPj(crm2PjState.message)}</p>` : ''}<div class="crm2-pf-detail-layout crm2-pj-detail-layout"><main class="crm2-pf-detail-main">${renderPjDataTabBase(item)}<div class="crm2-pf-related-sections"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pessoas vinculadas</strong></div>${renderPjPeopleTab(item)}</section><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pedidos</strong></div>${renderPjOrdersTab(item)}</section></div></main><aside class="crm2-pf-detail-sidebar crm2-pj-detail-sidebar"><section class="hub-form-section crm2-pj-observations-section"><div class="hub-form-section-title"><strong>Observações</strong></div><p>${escapeHtmlPj(item.observacoes || 'Nenhuma observação registrada.')}</p></section>${renderPjAttachments(item, false)}</aside></div>${renderPjFooter(`<button class="secondary-btn" type="button" onclick="crm2PjCloseDetail()">Voltar</button>${crm2PjState.canEdit ? `<button class="save-btn" type="button" onclick="crm2PjOpenEdit('${escapeAttrPj(item.id)}')">Editar</button>` : ''}`)}</section>`;
}

function renderDetailPjInlineEdit(item) {
  const values = { ...item, ...crm2PjState.draft };
  return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true" aria-labelledby="crm2-pj-detail-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 202 · CRM 2.0</span><div class="crm2-pj-title-row"><h3 id="crm2-pj-detail-title">${escapeHtmlPj(upperPj(item.razaoSocial))}</h3></div></div><div class="crm2-pessoas-header-actions">${renderAutomaticStatusPillPj(item)}</div></div><form id="crm2-pj-inline-form" onsubmit="crm2PjSave(event)" novalidate><div class="crm2-pf-detail-layout crm2-pj-detail-layout"><main class="crm2-pf-detail-main">${renderPjDataTabBase(item, true)}<div class="crm2-pf-related-sections"><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pessoas vinculadas</strong></div>${renderPjPeopleTab(item)}</section><section class="hub-form-section crm2-pf-detail-section"><div class="hub-form-section-title"><strong>Pedidos</strong></div>${renderPjOrdersTab(item)}</section></div></main><aside class="crm2-pf-detail-sidebar crm2-pj-detail-sidebar"><section class="hub-form-section crm2-pj-observations-section"><div class="hub-form-section-title"><strong>Observações</strong></div>${renderFieldPj({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true, changed: String(values.observacoes || '') !== String(item.observacoes || '') })}</section>${renderPjAttachments(item, true)}</aside></div></form>${renderPjFooter(`<button class="secondary-btn" type="button" onclick="crm2PjCancelInlineEdit()">Cancelar</button><button class="save-btn" type="submit" form="crm2-pj-inline-form">Salvar alterações</button>`)}</section>`;
}

function renderDetailPj(item) {
  if (!item) return renderListPj();
  if (crm2PjState.inlineEditing && crm2PjState.canEdit) return renderDetailPjInlineEdit(item);
  return renderDetailPjReadOnly(item);
}

function renderPj() {
  permissionsPj();
  crm2PjState.items.forEach((item) => { item.razaoSocial = upperPj(item.razaoSocial); });
  if (!crm2PjState.canView) return `<section class="admin-panel crm2-pessoas-page" data-crm2-pj="true"><div class="crm2-pessoas-state is-error" role="alert"><strong>Acesso não autorizado.</strong><span>É necessária a permissão Visualizar para acessar Pessoas jurídicas.</span><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></section>`;
  const route = currentPjRoute();
  if (route.view === 'new') {
    if (crm2PjState.formMode !== 'create') {
      crm2PjState.formMode = 'create';
      crm2PjState.draft = {};
      crm2PjState.errors = {};
      crm2PjState.cnpjGate = { value: '', status: '', companyId: '', message: '' };
      crm2PjState.attachmentDraft = [];
      crm2PjState.attachmentSelectionDraft = [];
      crm2PjState.attachmentRemoved = [];
    }
    return renderFormPj();
  }
  if (route.view === 'edit') return getPj(route.id) ? renderEditFormPj(getPj(route.id)) : renderListPj();
  if (route.view === 'detail') return renderDetailPj(getPj(route.id));
  return renderListPj();
}

function mountPj() {
  window.hubLimparDropdowns?.({ remover: true });
  const target = document.querySelector('[data-crm2-pj="true"]');
  if (target) {
    target.outerHTML = renderPj();
    const root = document.querySelector('[data-crm2-pj="true"]');
    enhancePjPeopleSection(root);
    window.requestAnimationFrame(() => { void hydrateHubPdfThumbnails(root); });
    portalHubFormFooter(root);
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
      porte: item.porte,
      nomeFantasia: item.nomeFantasia,
      endereco: item.endereco,
      cep: item.cep,
      logradouro: item.logradouro,
      numero: item.numero,
      complemento: item.complemento,
      bairro: item.bairro,
      cidadeEstado: item.cidadeEstado,
      uf: item.uf,
      observacoes: item.observacoes,
      status: item.status,
      anexos: Array.isArray(item.anexos) ? item.anexos.map((anexo) => ({ ...anexo })) : [],
      pessoasVinculadas: Array.isArray(item.pessoasVinculadas) ? item.pessoasVinculadas.map((pessoa) => ({ ...pessoa })) : [],
      pedidos: Array.isArray(item.pedidos) ? item.pedidos.map((pedido) => ({ ...pedido })) : []
    }));
  },
  crm2PjMutateMockAttachments(id, payload = {}) {
    const company = crm2PjState.items.find((item) => item.id === id);
    if (!company) return false;
    const action = payload.action || '';
    const index = Number(payload.index);
    company.anexos = Array.isArray(company.anexos) ? company.anexos : [];
    if (action === 'add' && payload.attachment) company.anexos.push({ ...payload.attachment });
    if (action === 'remove' && Number.isInteger(index) && index >= 0) company.anexos.splice(index, 1);
    if (action === 'update' && Number.isInteger(index) && company.anexos[index]) company.anexos[index] = { ...company.anexos[index], ...payload.changes };
    company.atualizadoEm = new Date().toISOString();
    rerenderPj();
    return true;
  },
  crm2PjCreateMockFromOpportunity(payload = {}) {
    if (!payload.razaoSocial || String(payload.cnpj || '').replace(/\D/g, '').length !== 14) return null;
    const now = new Date().toISOString();
    const logradouro = payload.logradouro || payload.endereco || '';
    const item = {
      id: `pj-conv-${Date.now()}`,
      cnpj: String(payload.cnpj).replace(/\D/g, ''),
      razaoSocial: String(payload.razaoSocial).trim(), endereco: logradouro, logradouro, numero: payload.numero || '', complemento: payload.complemento || '', cep: payload.cep || '', bairro: payload.bairro || '', cidadeEstado: payload.cidadeEstado || [payload.municipio, payload.uf].filter(Boolean).join('/'), uf: payload.uf || '', observacoes: payload.observacoes || '',
      cadastroEm: now, atualizadoEm: now, anexos: Array.isArray(payload.anexos) ? payload.anexos.map((anexo) => ({ ...anexo })) : [], status: 'empresa ativa', statusAutomatico: 'empresa ativa', statusManual: '',
      pessoasVinculadas: [], pedidos: []
    };
    crm2PjState.items.unshift(item);
    rerenderPj();
    return { ...item, pessoasVinculadas: [], pedidos: [] };
  },
  crm2PjApplyOpportunityGenerationMock(id, payload = {}) {
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
  crm2PjCreateMockFromConversion(payload = {}) {
    return window.crm2PjCreateMockFromOpportunity?.(payload) || null;
  },
  crm2PjApplyConversionMock(id, payload = {}) {
    return window.crm2PjApplyOpportunityGenerationMock?.(id, payload) || false;
  },
  crm2PjMount: mountPj,
  navegarParaCrm2PjRota() { navigatePj(); },
  crm2PjOpenCreate() {
    if (!crm2PjState.canCreate) return;
    crm2PjState.formMode = 'create'; crm2PjState.draft = {}; crm2PjState.errors = {}; crm2PjState.message = '';
    crm2PjState.cnpjGate = { value: '', status: '', companyId: '', message: '' };
    crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = [];
    navigatePj('novo');
  },
  crm2PjOpenEdit(id) {
    if (window.event?.currentTarget?.classList.contains('crm2-pf-include-attachment')) {
      window.crm2PjOpenAttachmentPicker(id);
      return;
    }
    if (!crm2PjState.canEdit) return;
    const item = getPj(id);
    if (!item) return;
    crm2PjState.formMode = 'edit';
    crm2PjState.inlineEditing = true;
    crm2PjState.detailId = id;
    crm2PjState.detailTab = 'dados';
    crm2PjState.draft = {};
    crm2PjState.attachmentDraft = [];
    crm2PjState.attachmentSelectionDraft = [];
    crm2PjState.attachmentRemoved = [];
    crm2PjState.errors = {};
    crm2PjState.message = '';
    rerenderPj();
  },
  crm2PjOpenAttachmentPicker(id) {
    if (!crm2PjState.canEdit || !getPj(id)) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      window.crm2PjSelectAttachment(input);
      input.remove();
    };
    input.click();
  },
  crm2PjCancelInlineEdit() {
    if (!requestLeavePj(() => window.crm2PjCancelInlineEdit())) return;
    crm2PjState.formMode = '';
    crm2PjState.inlineEditing = false;
    crm2PjState.draft = {};
    crm2PjState.errors = {};
    crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = [];
    crm2PjState.attachmentRemoved = [];
    rerenderPj();
  },
  crm2PjRemoveVinculo(companyId, index) {
    if (!crm2PjState.canDelete) return;
    const company = getPj(companyId);
    const vinculo = company?.pessoasVinculadas?.[Number(index)];
    if (!company || !vinculo) return;
    const name = vinculo.nome || 'a pessoa vinculada';
    if (!window.confirm(`Excluir o vínculo com ${name}?`)) return;
    company.pessoasVinculadas.splice(Number(index), 1);
    company.atualizadoEm = new Date().toISOString();
    crm2PjState.message = 'Vínculo excluído apenas do estado local.';
    rerenderPj();
  },
  crm2PjOpenDetail(id) { if (getPj(id)) { crm2PjState.formMode = ''; crm2PjState.inlineEditing = false; crm2PjState.detailId = id; crm2PjState.detailTab = 'dados'; crm2PjState.message = ''; crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = []; crm2PjState.attachmentSelectionMode = false; crm2PjState.selectedAttachmentKeys = []; crm2PjState.attachmentInlineEditKey = ''; crm2PjState.attachmentInlineDraft = null; navigatePj(id); } },
  crm2PjOpenOrder: openPjOrder,
  crm2PjSelectTab(tab) { if (['dados', 'pessoas', 'pedidos'].includes(tab)) { crm2PjState.detailTab = tab; rerenderPj(); } },
  crm2PjCloseDetail() { crm2PjState.formMode = ''; crm2PjState.inlineEditing = false; crm2PjState.detailId = ''; crm2PjState.detailTab = 'dados'; crm2PjState.message = ''; crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = []; crm2PjState.attachmentSelectionMode = false; crm2PjState.selectedAttachmentKeys = []; crm2PjState.attachmentInlineEditKey = ''; crm2PjState.attachmentInlineDraft = null; navigatePj(); },
  crm2PjCancelForm() { if (!requestLeavePj(() => window.crm2PjCancelForm())) return; crm2PjState.formMode = ''; crm2PjState.inlineEditing = false; crm2PjState.detailId = ''; crm2PjState.draft = {}; crm2PjState.errors = {}; crm2PjState.cnpjGate = { value: '', status: '', companyId: '', message: '' }; crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = []; navigatePj(); },
  crm2PjConfirmLeave() { document.querySelector('.crm2-pj-unsaved-backdrop')?.remove(); const action = pendingLeaveActionPj; pendingLeaveActionPj = null; crm2PjState.draft = {}; crm2PjState.cnpjGate = { value: '', status: '', companyId: '', message: '' }; crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = []; action?.(); },
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
  crm2PjMaskCnpjGate(input) {
    input.value = maskCnpjPj(input.value);
    crm2PjState.cnpjGate.value = String(input.value || '').replace(/\D/g, '');
    crm2PjState.draft.cnpj = crm2PjState.cnpjGate.value;
    if (crm2PjState.cnpjGate.status !== 'not-found') crm2PjState.cnpjGate.status = '';
  },
  async crm2PjSearchCnpj(event) {
    event?.preventDefault();
    const value = String(new FormData(event.currentTarget).get('cnpj') || '').replace(/\D/g, '');
    crm2PjState.cnpjGate.value = value;
    crm2PjState.draft.cnpj = value;
    if (!validateCnpjPj(value)) {
      crm2PjState.cnpjGate = { value, status: 'invalid', companyId: '', message: 'Informe um CNPJ válido para continuar.' };
    } else {
      const company = crm2PjState.items.find((item) => String(item.cnpj || '').replace(/\D/g, '') === value);
      if (company) {
        crm2PjState.cnpjGate = { value, status: 'found', companyId: company.id, message: 'CNPJ já cadastrado. A criação de duplicidade foi bloqueada.' };
      } else {
        crm2PjState.cnpjGate = { value, status: 'loading', companyId: '', message: 'Consultando dados cadastrais...' };
        rerenderPj();
        try {
          const result = await consultarCnpj(value);
          const data = result.found && result.data ? result.data : null;
          crm2PjState.draft = { ...crm2PjState.draft, cnpj: value, razaoSocial: data?.razaoSocial || '', porte: data?.porte || '', statusManual: mapApiStatusPj(data?.situacao), cep: data?.cep || '', logradouro: data?.endereco || '', endereco: data?.endereco || '', numero: data?.numero || '', complemento: data?.complemento || '', bairro: data?.bairro || '', cidadeEstado: [data?.municipio, data?.uf].filter(Boolean).join('/'), uf: data?.uf || '' };
          crm2PjState.cnpjGate = { value, status: 'not-found', companyId: '', message: data ? 'Dados carregados pela API. Confirme e complete o cadastro.' : 'CNPJ não localizado. O preenchimento manual está disponível.' };
        } catch (error) {
          crm2PjState.cnpjGate = { value, status: 'not-found', companyId: '', message: 'API indisponível. O preenchimento manual está disponível.' };
        }
      }
    }
    rerenderPj();
  },
  crm2PjChangeCnpj() {
    crm2PjState.cnpjGate = { value: '', status: '', companyId: '', message: '' };
    crm2PjState.draft = {};
    crm2PjState.errors = {};
    rerenderPj();
    window.requestAnimationFrame(() => document.querySelector('.crm2-pj-cnpj-verification input[name="cnpj"]')?.focus());
  },
  crm2PjMaskCep(input) { input.value = maskCepPj(input.value); crm2PjState.draft.cep = input.value; },
  crm2PjSyncObservation(editor) {
    const value = editor?.innerHTML || '';
    const hidden = editor?.closest('label')?.querySelector('textarea[name="observacoes"]');
    if (hidden) hidden.value = value;
    crm2PjState.draft.observacoes = value;
  },
  crm2PjFormatObservation(command) {
    const editor = document.querySelector('.crm2-pj-rich-text-target');
    if (!editor) return;
    editor.focus();
    const commands = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough', bullet: 'insertUnorderedList', ordered: 'insertOrderedList', clear: 'removeFormat' };
    if (!commands[command]) return;
    document.execCommand(commands[command], false);
    window.crm2PjSyncObservation?.(editor);
  },
  crm2PjFormatObservationKeydown(event, editor) {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = String(event.key || '').toLowerCase();
    const command = key === 'b'
      ? 'bold'
      : key === 'i'
        ? 'italic'
        : key === 'u'
          ? 'underline'
          : event.shiftKey && key === '5'
            ? 'strike'
            : event.shiftKey && key === '7'
              ? 'ordered'
              : event.shiftKey && key === '8'
                ? 'bullet'
                : '';
    if (!command) return;
    event.preventDefault();
    window.crm2PjFormatObservation(command);
  },
  crm2PjTrackChange(input) {
    if (!input?.name) return;
    if (input.name === 'razaoSocial') input.value = upperPj(input.value);
    crm2PjState.draft[input.name] = input.value;
    if (crm2PjState.formMode !== 'edit') return;
    const original = getPj(crm2PjState.detailId || currentPjRoute().id);
    const changed = original && String(input.value || '').trim() !== String(original[input.name] || '').trim();
    input.closest('label')?.classList.toggle('is-changed', Boolean(changed));
  },
  crm2PjToggleAttachmentInlineEdit(source, index) {
    if (!crm2PjState.canEdit) return;
    const item = getPj(crm2PjState.detailId || currentPjRoute().id);
    const attachment = source === 'draft' ? crm2PjState.attachmentDraft[index] : item?.anexos?.[index];
    if (!attachment) return;
    crm2PjState.attachmentInlineEditKey = `${source}:${index}`;
    const filename = String(attachment.nome || '');
    const extensionMatch = filename.match(/(\.[^.]+)$/);
    crm2PjState.attachmentInlineDraft = { nome: extensionMatch ? filename.slice(0, -extensionMatch[1].length) : filename, extensao: extensionMatch?.[1] || '', validade: attachment.validade || '', displayValidade: attachment.validade ? formatDatePj(attachment.validade) : '' };
    rerenderPj();
  },
  crm2PjUpdateAttachmentInlineDraft(field, value) {
    if (!crm2PjState.attachmentInlineDraft || !['nome', 'validade'].includes(field)) return;
    crm2PjState.attachmentInlineDraft[field] = String(value || '');
  },
  crm2PjUpdateAttachmentInlineDateDraft(value) {
    if (!crm2PjState.attachmentInlineDraft) return;
    const text = String(value || '').trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    crm2PjState.attachmentInlineDraft.displayValidade = text;
    crm2PjState.attachmentInlineDraft.validade = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  },
  crm2PjMaskAttachmentDate(input) {
    if (!input) return;
    const digits = String(input.value || '').replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    input.value = masked;
    window.crm2PjUpdateAttachmentInlineDateDraft(masked);
  },
  crm2PjSetAttachmentDateFromPicker(value) {
    if (!crm2PjState.attachmentInlineDraft) return;
    crm2PjState.attachmentInlineDraft.validade = String(value || '');
    crm2PjState.attachmentInlineDraft.displayValidade = formatDatePj(value);
    rerenderPj();
  },
  crm2PjSaveAttachmentInlineEdit() {
    const [source, index] = String(crm2PjState.attachmentInlineEditKey || ':').split(':');
    const draft = crm2PjState.attachmentInlineDraft;
    const item = getPj(crm2PjState.detailId || currentPjRoute().id);
    const attachment = source === 'draft' ? crm2PjState.attachmentDraft[Number(index)] : item?.anexos?.[Number(index)];
    if (!attachment || !draft) return;
    attachment.nome = `${draft.nome}${draft.extensao || ''}`;
    attachment.validade = draft.validade;
    if (item) item.atualizadoEm = new Date().toISOString();
    crm2PjState.attachmentInlineEditKey = '';
    crm2PjState.attachmentInlineDraft = null;
    rerenderPj();
  },
  crm2PjCancelAttachmentInlineEdit() {
    crm2PjState.attachmentInlineEditKey = '';
    crm2PjState.attachmentInlineDraft = null;
    rerenderPj();
  },
  crm2PjSelectAttachment(input) {
    const allowed = crm2PjState.canEdit || (crm2PjState.formMode === 'new' && crm2PjState.canCreate);
    if (!allowed) return;
    const attachments = Array.from(input?.files || []).map(fileToAttachmentPj).map((attachment) => {
      const match = String(attachment.nome || '').match(/(\.[^.]+)$/);
      return { ...attachment, nome: match ? attachment.nome.slice(0, -match[1].length) : attachment.nome, extensao: match?.[1] || '' };
    });
    if (!attachments.length) return;
    crm2PjState.attachmentSelectionDraft.push(...attachments);
    rerenderPj();
  },
  crm2PjUpdateAttachmentDraft(index, field, value) {
    const attachment = crm2PjState.attachmentSelectionDraft[index];
    if (!attachment || !['nome', 'validade'].includes(field)) return;
    attachment[field] = String(value || '');
  },
  crm2PjMaskAttachmentDraftDate(index, input) {
    const draft = crm2PjState.attachmentSelectionDraft?.[index];
    if (!draft || !input) return;
    const digits = String(input.value || '').replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    input.value = masked;
    draft.displayValidade = masked;
    const match = masked.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    draft.validade = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  },
  crm2PjSetAttachmentDraftDateFromPicker(index, value) {
    const draft = crm2PjState.attachmentSelectionDraft?.[index];
    if (!draft) return;
    const iso = String(value || '');
    draft.validade = iso;
    draft.displayValidade = iso ? formatDatePj(iso) : '';
    rerenderPj();
  },
  crm2PjRemoveAttachment(source, index) {
    if (!crm2PjState.canDelete && crm2PjState.formMode === 'edit') return;
    if (!window.confirm('Remover este anexo do estado mockado?')) return;
    if (source === 'draft') crm2PjState.attachmentDraft.splice(Number(index), 1);
    else if (!crm2PjState.attachmentRemoved.includes(Number(index))) crm2PjState.attachmentRemoved.push(Number(index));
    rerenderPj();
  },
  crm2PjCancelAttachmentDraft() {
    crm2PjState.attachmentSelectionDraft = [];
    crm2PjState.attachmentInlineEditKey = '';
    crm2PjState.attachmentInlineDraft = null;
    rerenderPj();
  },
  crm2PjConfirmAttachmentDraft() {
    if (!crm2PjState.attachmentSelectionDraft.length) return;
    crm2PjState.attachmentDraft.push(...crm2PjState.attachmentSelectionDraft.map((attachment) => ({
      ...attachment,
      nome: `${String(attachment.nome || '').trim()}${attachment.extensao || ''}`
    })));
    crm2PjState.attachmentSelectionDraft = [];
    crm2PjState.attachmentInlineEditKey = '';
    crm2PjState.attachmentInlineDraft = null;
    rerenderPj();
  },
  crm2PjToggleAttachmentSelection() {
    crm2PjState.attachmentSelectionMode = !crm2PjState.attachmentSelectionMode;
    if (!crm2PjState.attachmentSelectionMode) crm2PjState.selectedAttachmentKeys = [];
    rerenderPj();
  },
  crm2PjSetAttachmentView(view) {
    if (!['list', 'grid'].includes(view)) return;
    crm2PjState.attachmentView = view;
    rerenderPj();
  },
  crm2PjToggleAttachmentSelected(source, index, checked) {
    const key = `${source}:${index}`;
    crm2PjState.selectedAttachmentKeys = checked
      ? [...new Set([...crm2PjState.selectedAttachmentKeys, key])]
      : crm2PjState.selectedAttachmentKeys.filter((item) => item !== key);
    rerenderPj();
  },
  crm2PjDownloadAllAttachments() {
    const item = getPj(crm2PjState.detailId || currentPjRoute().id);
    (item?.anexos || []).forEach((_, index) => window.crm2PjDownloadAttachment('existing', index));
    crm2PjState.attachmentDraft.forEach((_, index) => window.crm2PjDownloadAttachment('draft', index));
  },
  crm2PjDownloadSelectedAttachments() {
    crm2PjState.selectedAttachmentKeys.forEach((key) => { const [source, index] = key.split(':'); window.crm2PjDownloadAttachment(source, Number(index)); });
  },
  crm2PjDeleteSelectedAttachments() {
    if (!crm2PjState.canDelete) return;
    [...crm2PjState.selectedAttachmentKeys].forEach((key) => { const [source, index] = key.split(':'); if (source === 'draft') crm2PjState.attachmentDraft.splice(Number(index), 1); else if (!crm2PjState.attachmentRemoved.includes(Number(index))) crm2PjState.attachmentRemoved.push(Number(index)); });
    crm2PjState.selectedAttachmentKeys = [];
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
    values.cnpj = String(values.cnpj || crm2PjState.cnpjGate.value || '').replace(/\D/g, '');
    values.cep = String(values.cep || '').replace(/\D/g, '');
    values.razaoSocial = upperPj(values.razaoSocial);
    const errors = {};
    if (!validateCnpjPj(values.cnpj)) errors.cnpj = 'Informe um CNPJ válido.';
    if (crm2PjState.formMode === 'create' && crm2PjState.cnpjGate.status !== 'not-found') errors.cnpj = 'Consulte o CNPJ antes de salvar o cadastro.';
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
      Object.assign(item, { razaoSocial: values.razaoSocial, porte: values.porte || '', endereco: values.logradouro || values.endereco || '', cep: values.cep || '', logradouro: values.logradouro || '', numero: values.numero || '', complemento: values.complemento || '', bairro: values.bairro || '', cidadeEstado: values.cidadeEstado || '', uf: values.uf || '', observacoes: values.observacoes || '', status: displayedStatusPj(item), atualizadoEm: now });
      crm2PjState.formMode = '';
      crm2PjState.inlineEditing = false;
      crm2PjState.draft = {};
      crm2PjState.errors = {};
    crm2PjState.attachmentDraft = [];
    crm2PjState.attachmentSelectionDraft = [];
      crm2PjState.attachmentRemoved = [];
      crm2PjState.message = 'Pessoa jurídica atualizada no estado mockado. Nenhum dado foi persistido.';
      navigatePj(item.id);
      return;
    }
    const manualStatus = ['empresa ativa', 'empresa inativa', 'empresa baixada'].includes(values.statusManual) ? values.statusManual : '';
    const item = { ...values, id: `pj-mock-${Date.now()}`, cadastroEm: now, atualizadoEm: now, status: manualStatus || 'empresa inativa', statusAutomatico: manualStatus || 'empresa inativa', statusManual: manualStatus, anexos: [...crm2PjState.attachmentDraft], pessoasVinculadas: [], pedidos: [] };
    crm2PjState.items.unshift(item); crm2PjState.formMode = ''; crm2PjState.draft = {}; crm2PjState.attachmentDraft = []; crm2PjState.attachmentSelectionDraft = []; crm2PjState.attachmentRemoved = []; crm2PjState.message = 'Pessoa jurídica criada no estado mockado. Nenhum dado foi persistido.'; navigatePj(item.id);
  }
});

observarContextoAcessoHub(() => { permissionsPj(); if (currentPjRoute().view || document.querySelector('[data-crm2-pj="true"]')) mountPj(); });
permissionsPj();
