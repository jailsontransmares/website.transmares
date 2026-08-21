// CRM 2.0 — Rota 204 / Pedidos.
// Fases 7.1 a 7.7: shell, lista, filtros, estados, permissões, inclusão, detalhe e edição mockados.
import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';
import { abrirConsultaCnpj } from './cnpjLookupModal.js';

const CRM2_PEDIDOS_INITIAL_ITEMS = [
  { id: 'pedido-001', numero: 'PED-2401', pfNome: 'Mariana Alves de Souza', pfCpf: '12345678909', pjRazaoSocial: 'Transmares Tecnologia Ltda.', pjCnpj: '04252011000110', produto: 'e-CNPJ A3', responsavel: 'Ana Martins', status: 'Pedido emitido', origem: 'Indicação', dataSolicitacao: '2026-07-18', vencimento: '2027-07-18', financeiro: 'Pago', valor: '890,00', pendencias: 0, atualizadoEm: '2026-08-04T09:20:00' },
  { id: 'pedido-002', numero: 'PED-2390', pfNome: 'Rafael Nogueira Lima', pfCpf: '98765432100', pjRazaoSocial: 'Transmares Tecnologia Ltda.', pjCnpj: '04252011000110', produto: 'e-CNPJ A1', responsavel: 'Carlos Oliveira', status: 'Aguardando validação', origem: 'Site', dataSolicitacao: '2026-07-02', vencimento: '2027-02-10', financeiro: 'Pendente', valor: '540,00', pendencias: 2, atualizadoEm: '2026-08-02T11:08:00' },
  { id: 'pedido-003', numero: 'PED-2389', pfNome: 'Camila Ferreira Rocha', pfCpf: '45678912364', pjRazaoSocial: 'Alves Consultoria Ltda.', pjCnpj: '12345678000195', produto: 'e-CPF A3', responsavel: 'Ana Martins', status: 'Vencido', origem: 'Parceiro', dataSolicitacao: '2025-12-20', vencimento: '2026-01-20', financeiro: 'Pendente', valor: '390,00', pendencias: 1, atualizadoEm: '2026-07-28T10:05:00' },
  { id: 'pedido-004', numero: 'PED-2377', pfNome: 'Beatriz Costa Menezes', pfCpf: '36925814700', pjRazaoSocial: 'Norte Serviços Empresariais S.A.', pjCnpj: '27865757000102', produto: 'Renovação de certificado', responsavel: 'Fernanda Lima', status: 'Em qualificação', origem: 'Atendimento interno', dataSolicitacao: '2026-06-22', vencimento: '2026-09-22', financeiro: 'Pendente', valor: '480,00', pendencias: 3, atualizadoEm: '2026-07-31T14:16:00' },
  { id: 'pedido-005', numero: 'PED-2366', pfNome: 'Lucas Henrique Barros', pfCpf: '85274196300', pjRazaoSocial: 'Maré Alta Comércio Ltda.', pjCnpj: '36711234000180', produto: 'e-CNPJ A3', responsavel: 'Fernanda Lima', status: 'Concluído', origem: 'Indicação', dataSolicitacao: '2026-05-21', vencimento: '2027-05-21', financeiro: 'Pago', valor: '890,00', pendencias: 0, atualizadoEm: '2026-06-01T08:45:00' },
  { id: 'pedido-006', numero: 'PED-2354', pfNome: 'Renata Cristina Alves', pfCpf: '15935748600', pjRazaoSocial: 'Maré Alta Comércio Ltda.', pjCnpj: '36711234000180', produto: 'e-CNPJ A1', responsavel: 'Carlos Oliveira', status: 'Cancelado', origem: 'Site', dataSolicitacao: '2026-04-10', vencimento: '2026-05-10', financeiro: 'Estornado', valor: '540,00', pendencias: 0, atualizadoEm: '2026-05-12T16:40:00' },
  { id: 'pedido-007', numero: 'PED-2341', pfNome: 'Diego Martins da Silva', pfCpf: '25814736900', pjRazaoSocial: 'Litoral Logística e Transportes Ltda.', pjCnpj: '50123456000173', produto: 'e-CPF A3', responsavel: 'Ana Martins', status: 'Novo', origem: 'Atendimento interno', dataSolicitacao: '2026-03-08', vencimento: '2026-09-08', financeiro: 'Pendente', valor: '390,00', pendencias: 1, atualizadoEm: '2026-05-02T13:15:00' },
  { id: 'pedido-008', numero: 'PED-2320', pfNome: 'João Pedro Ribeiro', pfCpf: '74185296300', pjRazaoSocial: '', pjCnpj: '', produto: 'Renovação de certificado', responsavel: 'Carlos Oliveira', status: 'Aguardando pagamento', origem: 'Parceiro', dataSolicitacao: '2026-02-14', vencimento: '2026-08-14', financeiro: 'Pendente', valor: '480,00', pendencias: 1, atualizadoEm: '2026-04-20T09:30:00' }
];

const PEDIDO_STAGE_OPTIONS = ['Novo', 'Em qualificação', 'Em Negociação', 'Aguardando pagamento', 'Aguardando validação', 'Pedido validado', 'Pedido emitido'];
const PEDIDO_STATUS_OPTIONS = [...PEDIDO_STAGE_OPTIONS, 'Concluído', 'Cancelado', 'Vencido'];
const PEDIDO_PRODUCT_OPTIONS = ['e-CPF A3', 'e-CNPJ A1', 'e-CNPJ A3', 'Renovação de certificado'];
const PEDIDO_PRODUCT_PRICES = { 'e-CPF A3': '390,00', 'e-CNPJ A1': '540,00', 'e-CNPJ A3': '890,00', 'Renovação de certificado': '480,00' };
const PEDIDO_RESPONSIBLE_OPTIONS = ['Ana Martins', 'Carlos Oliveira', 'Fernanda Lima'];
const PEDIDO_ORIGIN_OPTIONS = ['Atendimento interno', 'Indicação', 'Parceiro', 'Site'];
const PEDIDO_FINANCIAL_OPTIONS = ['Pago', 'Pendente', 'Estornado'];

function normalizePedidoStatus(value = '') {
  const legacyMap = { 'Em cadastro': 'Novo', 'Aguardando documentação': 'Em qualificação', 'Em validação': 'Aguardando validação', Ativo: 'Pedido emitido' };
  return legacyMap[value] || value || 'Novo';
}

const crm2PedidosState = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_PEDIDOS_INITIAL_ITEMS),
  search: '',
  searchExpanded: false,
  filterModalOpen: false,
  filterDraft: {},
  statusFilter: '',
  productFilter: '',
  responsibleFilter: '',
  originFilter: '',
  financialFilter: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  perPage: 5,
  listState: 'normal',
  message: '',
  formMode: '',
  detailId: '',
  detailTab: 'dados',
  draft: {},
  errors: {}
};

function escapeHtmlPedido(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttrPedido(value = '') {
  return escapeHtmlPedido(value).replaceAll('`', '&#096;');
}

function normalizePedido(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsPedido(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

function maskCpfPedido(value = '') {
  return digitsPedido(value).slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskCnpjPedido(value = '') {
  return digitsPedido(value).slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function formatDatePedido(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTimePedido(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function currentPedidosRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const index = segments.findIndex((segment, position) => segment === 'painel-ar' && segments[position + 1] === '204');
  if (index < 0) return { active: false, view: 'list', id: '' };
  const tail = segments.slice(index + 2);
  if (tail[0] === 'novo') return { active: true, view: 'new', id: '' };
  if (tail[1] === 'editar') return { active: true, view: 'edit', id: tail[0] || '' };
  if (tail[0]) return { active: true, view: 'detail', id: tail[0] };
  return { active: true, view: 'list', id: '' };
}

function pedidosRoutePath() {
  const hasHub = window.location.pathname.split('/').filter(Boolean)[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/204`;
}

function navigatePedidos(suffix = '') {
  window.history.pushState({}, '', `${pedidosRoutePath()}${suffix ? `/${suffix}` : ''}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => window.crm2PedidosMount?.(), 0);
}

function getPedido(id = '') {
  return crm2PedidosState.items.find((item) => item.id === id) || null;
}

function pedidoDefaults(item = {}) {
  return {
    numero: item.numero || '',
    pfNome: item.pfNome || '',
    pfCpf: item.pfCpf || '',
    pjRazaoSocial: item.pjRazaoSocial || '',
    pjCnpj: item.pjCnpj || '',
    produto: item.produto || '',
    responsavel: item.responsavel || '',
    status: normalizePedidoStatus(item.status),
    origem: item.origem || 'Atendimento interno',
    dataSolicitacao: item.dataSolicitacao || new Date().toISOString().slice(0, 10),
    vencimento: item.vencimento || '',
    financeiro: item.financeiro || 'Pendente',
    valor: item.valor || '',
    pendencias: String(item.pendencias ?? 0),
    observacoes: item.observacoes || ''
  };
}

function resetPedidoForm() {
  crm2PedidosState.formMode = '';
  crm2PedidosState.detailId = '';
  crm2PedidosState.draft = {};
  crm2PedidosState.errors = {};
}

function permissionsPedidos() {
  const context = obterContextoAcessoHub();
  const permissions = context?.permissions || {};
  const resolve = (action) => hasPermission(permissions, 'painel_ar', action);
  crm2PedidosState.canView = resolve('view');
  crm2PedidosState.canCreate = resolve('create') || resolve('update');
  crm2PedidosState.canEdit = resolve('update');
  crm2PedidosState.canDelete = resolve('delete');
}

function filteredPedidos() {
  const search = normalizePedido(crm2PedidosState.search);
  const compactSearch = digitsPedido(crm2PedidosState.search);
  return crm2PedidosState.items.filter((item) => {
    const textValues = [item.numero, item.pfNome, item.pjRazaoSocial, item.produto, item.responsavel, item.status, item.origem].map(normalizePedido);
    const documentValues = [item.pfCpf, maskCpfPedido(item.pfCpf), item.pjCnpj, maskCnpjPedido(item.pjCnpj)].map(digitsPedido);
    const matchesSearch = !search || textValues.some((value) => value.includes(search)) || documentValues.some((value) => value.includes(compactSearch));
    return matchesSearch
      && (!crm2PedidosState.statusFilter || item.status === crm2PedidosState.statusFilter)
      && (!crm2PedidosState.productFilter || item.produto === crm2PedidosState.productFilter)
      && (!crm2PedidosState.responsibleFilter || item.responsavel === crm2PedidosState.responsibleFilter)
      && (!crm2PedidosState.originFilter || item.origem === crm2PedidosState.originFilter)
      && (!crm2PedidosState.financialFilter || item.financeiro === crm2PedidosState.financialFilter)
      && (!crm2PedidosState.dateFrom || item.dataSolicitacao >= crm2PedidosState.dateFrom)
      && (!crm2PedidosState.dateTo || item.dataSolicitacao <= crm2PedidosState.dateTo);
  });
}

function pedidoStatusClass(value = '') {
  return normalizePedido(value).replace(/\s+/g, '-');
}

function renderStatusPedido(value = '', financial = false) {
  const className = financial ? normalizePedido(value) : pedidoStatusClass(value);
  return `<span class="${financial ? 'crm2-pedidos-financial' : 'crm2-pedidos-status'} is-${escapeAttrPedido(className)}" role="status">${escapeHtmlPedido(value || '—')}</span>`;
}

function renderStatePedidos() {
  const copy = {
    loading: ['Carregando pedidos...', 'Estado de carregamento simulado para homologação.'],
    error: ['Não foi possível carregar os pedidos.', 'Erro simulado. Nenhuma integração externa foi acionada.'],
    empty: ['Nenhum pedido cadastrado.', 'A lista mockada ainda não possui pedidos.']
  }[crm2PedidosState.listState];
  if (!copy) return '';
  return `<div class="crm2-pessoas-state crm2-pedidos-state ${crm2PedidosState.listState === 'error' ? 'is-error' : ''}" role="${crm2PedidosState.listState === 'error' ? 'alert' : 'status'}" ${crm2PedidosState.listState === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2PedidosSetListState('normal')">Voltar à lista</button></div>`;
}

function currentPedidoFilterValues() {
  return {
    status: crm2PedidosState.statusFilter,
    product: crm2PedidosState.productFilter,
    responsible: crm2PedidosState.responsibleFilter,
    origin: crm2PedidosState.originFilter,
    financial: crm2PedidosState.financialFilter,
    dateFrom: crm2PedidosState.dateFrom,
    dateTo: crm2PedidosState.dateTo
  };
}

function pedidoProductPrice(value = '') {
  const normalized = normalizePedido(value);
  const option = PEDIDO_PRODUCT_OPTIONS.find((item) => normalizePedido(item) === normalized);
  return option ? PEDIDO_PRODUCT_PRICES[option] || '' : '';
}

function pedidoMoneyValue(value = '') {
  const normalized = String(value ?? '').trim().replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function hasPedidoFilters() {
  return Boolean(crm2PedidosState.search || Object.values(currentPedidoFilterValues()).some(Boolean));
}

function renderPedidoFilterModal() {
  if (!crm2PedidosState.filterModalOpen) return '';
  const values = crm2PedidosState.filterDraft || currentPedidoFilterValues();
  const options = (items, selected, emptyLabel) => `<option value="">${emptyLabel}</option>${items.map((item) => `<option value="${escapeAttrPedido(item)}" ${selected === item ? 'selected' : ''}>${escapeHtmlPedido(item)}</option>`).join('')}`;
  const field = (label, name, items, emptyLabel) => `<label><span>${label}</span><select class="config-input" name="${name}">${options(items, values[name], emptyLabel)}</select></label>`;
  return `<div class="crm2-opp-filter-modal-backdrop" role="presentation" onclick="crm2PedidosCloseFilterModal(event)"><section id="crm2-pedidos-filter-modal" class="crm2-opp-filter-modal" role="dialog" aria-modal="true" aria-labelledby="crm2-pedidos-filter-modal-title" onclick="event.stopPropagation()"><header class="crm2-opp-filter-modal-header"><div><h3 id="crm2-pedidos-filter-modal-title">Filtrar pedidos</h3></div><button id="crm2-pedidos-filter-modal-close" class="icon-btn" type="button" title="Fechar filtros" aria-label="Fechar filtros" onclick="crm2PedidosCloseFilterModal()">×</button></header><form class="crm2-opp-filter-modal-form crm2-opp-filter-modal-form-grouped" onsubmit="crm2PedidosApplyModalFilters(event)"><fieldset class="crm2-opp-filter-group"><legend>Pedido</legend><div class="crm2-opp-filter-group-grid">${field('Status', 'status', PEDIDO_STATUS_OPTIONS, 'Todos os status')}${field('Produto', 'product', PEDIDO_PRODUCT_OPTIONS, 'Todos os produtos')}${field('Responsável', 'responsible', PEDIDO_RESPONSIBLE_OPTIONS, 'Todos os responsáveis')}</div></fieldset><fieldset class="crm2-opp-filter-group"><legend>Origem e financeiro</legend><div class="crm2-opp-filter-group-grid">${field('Origem', 'origin', PEDIDO_ORIGIN_OPTIONS, 'Todas as origens')}${field('Financeiro', 'financial', PEDIDO_FINANCIAL_OPTIONS, 'Todas as situações')}</div></fieldset><fieldset class="crm2-opp-filter-group"><legend>Período da solicitação</legend><div class="crm2-opp-filter-group-grid"><label><span>Solicitação desde</span><input class="config-input" name="dateFrom" type="date" value="${escapeAttrPedido(values.dateFrom)}"></label><label><span>Solicitação até</span><input class="config-input" name="dateTo" type="date" value="${escapeAttrPedido(values.dateTo)}"></label></div></fieldset><div class="crm2-opp-filter-modal-actions"><button class="secondary-btn" type="button" onclick="crm2PedidosClearFilterDraft()">Limpar</button><div><button class="secondary-btn" type="button" onclick="crm2PedidosCloseFilterModal()">Cancelar</button><button class="save-btn" type="submit">Aplicar filtros</button></div></div></form></section></div>`;
}

function renderPedidosFiltersLegacy() {
  const active = hasPedidoFilters();
  const searchExpanded = Boolean(crm2PedidosState.searchExpanded);
  return `<form class="crm2-opp-filter-bar crm2-pedidos-filter-bar" role="search" onsubmit="event.preventDefault()" aria-label="Buscar e filtrar pedidos"><div class="crm2-opp-filter-actions"><button id="crm2-pedidos-filter-trigger" class="icon-btn ${Object.values(currentPedidoFilterValues()).some(Boolean) ? 'is-active' : ''}" type="button" aria-haspopup="dialog" aria-expanded="${crm2PedidosState.filterModalOpen ? 'true' : 'false'}" aria-controls="crm2-pedidos-filter-modal" title="Filtrar pedidos" aria-label="Filtrar pedidos" onclick="crm2PedidosToggleFilterModal()"><i data-lucide="filter" aria-hidden="true"></i></button><div class="crm2-opp-search-control ${searchExpanded ? 'is-expanded' : ''}"><input class="config-input" type="search" aria-label="Buscar pedidos" placeholder="Número, PF/PJ, CPF, CNPJ ou produto" value="${escapeAttrPedido(crm2PedidosState.search)}" ${searchExpanded ? '' : 'hidden'} oninput="crm2PedidosSetSearch(this.value, this)" onfocusout="crm2PedidosHandleSearchBlur(event)" onkeydown="if (event.key === 'Enter') event.preventDefault()"><button class="icon-btn" type="button" title="Buscar" aria-label="Buscar" aria-expanded="${searchExpanded ? 'true' : 'false'}" onclick="crm2PedidosToggleSearch(this)"><i data-lucide="search" aria-hidden="true"></i></button></div>${active ? '<button class="icon-btn crm2-opp-clear-filter" type="button" onclick="crm2PedidosClearFilters()" title="Limpar filtros" aria-label="Limpar filtros">×</button>' : ''}</div></form>${renderPedidoFilterModal()}`;
}

function renderPedidosFilters() {
  const active = hasPedidoFilters();
  const searchExpanded = Boolean(crm2PedidosState.searchExpanded);
  const search = `<div class="crm2-opp-search-control ${searchExpanded ? 'is-expanded' : ''}"><input class="config-input" type="search" aria-label="Buscar pedidos" placeholder="Número, PF/PJ, CPF, CNPJ ou produto" value="${escapeAttrPedido(crm2PedidosState.search)}" ${searchExpanded ? '' : 'hidden'} oninput="crm2PedidosSetSearch(this.value, this)" onfocusout="crm2PedidosHandleSearchBlur(event)" onkeydown="if (event.key === 'Enter') event.preventDefault()"><button class="icon-btn" type="button" title="Buscar" aria-label="Buscar" aria-expanded="${searchExpanded ? 'true' : 'false'}" onclick="crm2PedidosToggleSearch(this)"><i data-lucide="search" aria-hidden="true"></i></button></div>`;
  const filter = `<button id="crm2-pedidos-filter-trigger" class="icon-btn ${Object.values(currentPedidoFilterValues()).some(Boolean) ? 'is-active' : ''}" type="button" aria-haspopup="dialog" aria-expanded="${crm2PedidosState.filterModalOpen ? 'true' : 'false'}" aria-controls="crm2-pedidos-filter-modal" title="Filtrar pedidos" aria-label="Filtrar pedidos" onclick="crm2PedidosToggleFilterModal()"><i data-lucide="filter" aria-hidden="true"></i></button>`;
  return `<form class="crm2-opp-filter-bar crm2-pedidos-filter-bar" role="search" onsubmit="event.preventDefault()" aria-label="Buscar e filtrar pedidos"><div class="crm2-opp-filter-actions">${search}${filter}${active ? '<button class="icon-btn crm2-opp-clear-filter" type="button" onclick="crm2PedidosClearFilters()" title="Limpar filtros" aria-label="Limpar filtros">×</button>' : ''}</div></form>${renderPedidoFilterModal()}`;
}

function renderPedidoRow(item) {
  return `<tr><td><button class="crm2-pedido-number-link" type="button" onclick="crm2PedidosOpenDetail('${escapeAttrPedido(item.id)}')"><strong>${escapeHtmlPedido(item.numero)}</strong></button><small>${escapeHtmlPedido(item.origem)}</small></td><td><strong>${escapeHtmlPedido(item.pfNome)}</strong><small>${escapeHtmlPedido(item.pjRazaoSocial || 'Sem PJ')} · ${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small></td><td>${escapeHtmlPedido(item.produto)}</td><td>${renderStatusPedido(item.status)}${Number(item.pendencias) > 0 ? `<small class="crm2-pedidos-pending">${item.pendencias} pendência(s)</small>` : ''}</td><td>${escapeHtmlPedido(formatDatePedido(item.vencimento))}</td></tr>`;
}

function renderPedidosListLegacy() {
  const filtered = filteredPedidos();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2PedidosState.perPage));
  crm2PedidosState.page = Math.min(Math.max(1, crm2PedidosState.page), totalPages);
  const pageItems = filtered.slice((crm2PedidosState.page - 1) * crm2PedidosState.perPage, crm2PedidosState.page * crm2PedidosState.perPage);
  const hasFilters = Boolean(crm2PedidosState.search || crm2PedidosState.statusFilter || crm2PedidosState.productFilter || crm2PedidosState.responsibleFilter || crm2PedidosState.originFilter || crm2PedidosState.financialFilter || crm2PedidosState.dateFrom || crm2PedidosState.dateTo);
  const products = [...new Set([...PEDIDO_PRODUCT_OPTIONS, ...crm2PedidosState.items.map((item) => item.produto)])];
  const responsibles = [...new Set([...PEDIDO_RESPONSIBLE_OPTIONS, ...crm2PedidosState.items.map((item) => item.responsavel)])];
  const origins = [...new Set([...PEDIDO_ORIGIN_OPTIONS, ...crm2PedidosState.items.map((item) => item.origem)])];
  const listContent = crm2PedidosState.listState !== 'normal'
    ? renderStatePedidos()
    : pageItems.length
      ? `<div class="ar-crm-phase1-table-wrap crm2-pedidos-table-wrap"><table class="ar-crm-phase1-table crm2-pedidos-table" aria-describedby="crm2-pedidos-caption"><caption id="crm2-pedidos-caption" class="crm2-pessoas-table-caption">Pedidos cadastrados no CRM 2.0</caption><thead><tr><th scope="col">Pedido</th><th scope="col">PF / PJ</th><th scope="col">Produto</th><th scope="col">Responsável</th><th scope="col">Status</th><th scope="col">Solicitação</th><th scope="col">Vencimento</th><th scope="col">Financeiro</th><th scope="col">Ações</th></tr></thead><tbody>${pageItems.map(renderPedidoRow).join('')}</tbody></table></div><div class="crm2-pedidos-pagination" aria-label="Paginação de pedidos"><span>Página <strong>${crm2PedidosState.page}</strong> de <strong>${totalPages}</strong> · ${filtered.length} pedido(s)</span><div><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page - 1})" ${crm2PedidosState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page + 1})" ${crm2PedidosState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`
      : `<div class="crm2-pessoas-state crm2-pedidos-state" role="status"><strong>${crm2PedidosState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhum pedido cadastrado.'}</strong><span>${crm2PedidosState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui pedidos.'}</span><button class="secondary-btn" type="button" onclick="crm2PedidosClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`;

  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedidos-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><h3 id="crm2-pedidos-title">Pedidos</h3><p class="crm2-pedidos-subtitle">Consulta operacional de pedidos, prazos, pendências e financeiro mockado.</p></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>${crm2PedidosState.canCreate ? '<button class="save-btn" type="button" onclick="crm2PedidosOpenCreate()">+ Incluir pedido</button>' : ''}</div></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}${renderPedidoMetrics()}<form class="ar-crm-list-filters crm2-pedidos-filters" role="search" onsubmit="crm2PedidosApplyFilters(event)" aria-label="Buscar e filtrar pedidos"><label><span>Buscar</span><input class="config-input" name="search" type="search" value="${escapeAttrPedido(crm2PedidosState.search)}" placeholder="Número, PF, PJ, CPF, CNPJ ou produto"></label><label><span>Status</span><select class="config-input" name="status"><option value="">Todos os status</option>${PEDIDO_STATUS_OPTIONS.map((option) => `<option value="${escapeAttrPedido(option)}" ${crm2PedidosState.statusFilter === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select></label><label><span>Produto</span><select class="config-input" name="product"><option value="">Todos os produtos</option>${products.map((option) => `<option value="${escapeAttrPedido(option)}" ${crm2PedidosState.productFilter === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select></label><label><span>Responsável</span><select class="config-input" name="responsible"><option value="">Todos os responsáveis</option>${responsibles.map((option) => `<option value="${escapeAttrPedido(option)}" ${crm2PedidosState.responsibleFilter === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select></label><label><span>Origem</span><select class="config-input" name="origin"><option value="">Todas as origens</option>${origins.map((option) => `<option value="${escapeAttrPedido(option)}" ${crm2PedidosState.originFilter === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select></label><label><span>Financeiro</span><select class="config-input" name="financial"><option value="">Todas as situações</option>${PEDIDO_FINANCIAL_OPTIONS.map((option) => `<option value="${escapeAttrPedido(option)}" ${crm2PedidosState.financialFilter === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select></label><label><span>Solicitação desde</span><input class="config-input" name="dateFrom" type="date" value="${escapeAttrPedido(crm2PedidosState.dateFrom)}"></label><label><span>Solicitação até</span><input class="config-input" name="dateTo" type="date" value="${escapeAttrPedido(crm2PedidosState.dateTo)}"></label><div class="crm2-pedidos-filter-actions"><button class="save-btn" type="submit">Aplicar filtros</button><button class="secondary-btn" type="button" onclick="crm2PedidosClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div></form>${listContent}</section>`;
}

function renderPedidoField({ label, name, value = '', type = 'text', required = false, wide = false, options = [], placeholder = '', formId = '' }) {
  const error = crm2PedidosState.errors[name] || '';
  const id = `crm2-pedido-${name}`;
  const automaticStatus = name === 'status' && value === 'Pedido emitido';
  const common = `id="${id}" class="config-input" name="${name}" ${formId ? `form="${formId}"` : ''} ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${error ? `aria-describedby="${id}-error"` : ''}`;
  const input = type === 'textarea'
    ? `<textarea ${common} rows="4" placeholder="${escapeAttrPedido(placeholder)}">${escapeHtmlPedido(value)}</textarea>`
    : type === 'select'
      ? `<select ${common}${automaticStatus ? ' disabled aria-disabled="true"' : ''}><option value="">${escapeHtmlPedido(placeholder || 'Selecione')}</option>${options.map((option) => `<option value="${escapeAttrPedido(option)}" ${String(value) === String(option) ? 'selected' : ''}${name === 'status' && option === 'Pedido emitido' ? ' disabled' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select>`
      : name === 'pjCnpj'
        ? `<span class="crm2-pedido-cnpj-control"><input ${common} type="text" inputmode="numeric" maxlength="18" value="${escapeAttrPedido(maskCnpjPedido(value))}" placeholder="${escapeAttrPedido(placeholder)}" oninput="this.value = window.crm2PedidosMaskCnpj(this.value)"><button class="icon-btn" type="button" title="Consultar CNPJ" aria-label="Consultar CNPJ" onclick="window.crm2PedidosLookupCnpj(this)"><i data-lucide="search" aria-hidden="true"></i></button></span>`
        : `<input ${common} type="${type}" value="${escapeAttrPedido(value)}" placeholder="${escapeAttrPedido(placeholder)}">`;
  const field = `<label class="${wide ? 'is-wide ' : ''}${name === 'observacoes' ? 'crm2-shared-observation-field' : ''}"><span>${escapeHtmlPedido(label)}${required ? ' *' : ''}</span>${input}${error ? `<small id="${id}-error" class="crm2-field-error">${escapeHtmlPedido(error)}</small>` : ''}</label>`;
  return name === 'observacoes' ? `${field}${renderPedidoAttachments(crm2PedidosState.draft)}` : field;
}

function renderPedidoIdentityFields(draft, formId) {
  return `<input type="hidden" name="numero" form="${formId}" value="${escapeAttrPedido(draft.numero || '')}"><div class="crm2-opp-form-grid crm2-pedido-identity-grid"><label class="crm2-opp-derived-field"><span>CPF</span><div class="crm2-opp-cpf-search-control"><input class="config-input" name="pfCpf" form="${formId}" value="${escapeAttrPedido(maskCpfPedido(draft.pfCpf))}" placeholder="000.000.000-00" inputmode="numeric" maxlength="14" required oninput="window.crm2PedidosFormatCpf(this)" onblur="window.crm2PedidosMatchPf(this.value, this)"><button class="icon-btn" type="button" title="Buscar CPF" aria-label="Buscar CPF" onclick="window.crm2PedidosMatchPf(this.closest('.crm2-opp-cpf-search-control').querySelector('[name=pfCpf]').value, this)"><i data-lucide="search" aria-hidden="true"></i></button></div><small class="crm2-pedido-cpf-match-message" aria-live="polite" hidden></small></label><label class="crm2-opp-derived-field"><span>Nome (PF vinculada)</span><input class="config-input" name="pfNome" form="${formId}" value="${escapeAttrPedido(draft.pfNome)}" placeholder="Nome completo" required></label></div>`;
}

function renderPedidoItemForm(draft, formId) {
  const price = draft.valor || '';
  const pjValue = draft.pjCnpj ? maskCnpjPedido(draft.pjCnpj) : draft.pjRazaoSocial || '';
  return `<div class="crm2-opp-items-form crm2-pedido-items-form"><div class="crm2-opp-items-form-header"><div><strong>Itens e pedidos</strong><small data-pedido-total>${price ? `R$ ${escapeHtmlPedido(price)}` : 'R$ 0,00'} estimado</small></div></div><div class="crm2-opp-items-sheet-wrap"><table class="crm2-opp-items-sheet is-editable"><thead><tr><th scope="col">Pedido</th><th scope="col">Produto</th><th scope="col">Valor</th><th scope="col">CNPJ / PJ vinculada</th></tr></thead><tbody><tr><td><div class="crm2-opp-order-cell"><input class="config-input" name="itemOrder-0" form="${formId}" value="${escapeAttrPedido(draft.numero || '')}" placeholder="Pedido"><small class="crm2-opp-order-price-pill" data-pedido-item-price>${price ? `R$ ${escapeHtmlPedido(price)}` : 'R$ 0,00'}</small></div></td><td><div class="crm2-pedido-product-cell crm2-opp-product-cell"><input class="config-input" name="itemProduct-0" form="${formId}" value="${escapeAttrPedido(draft.produto || '')}" placeholder="Buscar produto" autocomplete="off" required oninput="window.crm2PedidosSyncItemPrice(this); window.crm2PedidosRenderProductSuggestions(this)" onfocus="window.crm2PedidosRenderProductSuggestions(this)" onblur="window.setTimeout(() => window.crm2PedidosHideProductSuggestions(this), 150)"><div class="crm2-pedido-product-suggestions crm2-opp-product-suggestions" data-pedido-product-suggestions hidden></div></div></td><td><input class="config-input" name="itemValue-0" form="${formId}" value="${escapeAttrPedido(price)}" placeholder="R$ 0,00" required oninput="window.crm2PedidosSyncItemValue(this)"></td><td><div class="crm2-pedido-item-pj-cell crm2-opp-pj-cell"><input class="config-input" name="itemPj-0" form="${formId}" value="${escapeAttrPedido(pjValue)}" placeholder="CNPJ ou razão social" inputmode="text" maxlength="80" oninput="window.crm2PedidosSyncItemPj(this)" onfocus="window.crm2PedidosRenderPjSuggestions(this)" onblur="window.setTimeout(() => window.crm2PedidosHidePjSuggestions(this), 150)"><button class="icon-btn crm2-pedido-item-cnpj-search" type="button" title="Consultar CNPJ" aria-label="Consultar CNPJ" onclick="window.crm2PedidosLookupItemCnpj(this)" ${digitsPedido(pjValue).length === 14 ? '' : 'disabled'}><i data-lucide="search" aria-hidden="true"></i></button><input type="hidden" name="itemPjName-0" form="${formId}" value="${escapeAttrPedido(draft.pjRazaoSocial || '')}"><div class="crm2-pedido-pj-suggestions crm2-opp-cnpj-suggestions" data-pedido-pj-suggestions hidden></div></div></td></tr></tbody></table></div></div>${renderPedidoAttachments(draft)}`;
}

function renderPedidoForm() {
  const creating = crm2PedidosState.formMode === 'create';
  const title = creating ? 'Novo pedido' : 'Editar pedido';
  const draft = crm2PedidosState.draft || pedidoDefaults({});
  const historyItem = creating ? null : getPedido(crm2PedidosState.detailId) || draft;
  const history = creating
    ? '<section class="crm2-pf-timeline-column crm2-opp-timeline-column crm2-pedido-history-section crm2-opp-form-history-placeholder" aria-labelledby="crm2-pedido-form-history-title"><div class="hub-form-section-title crm2-pedido-history-title"><div><strong id="crm2-pedido-form-history-title">Histórico</strong></div></div><div class="crm2-pessoas-state crm2-timeline-state" role="status"><strong>Histórico disponível após o cadastro.</strong><span>As interações do pedido aparecerão aqui.</span></div></section>'
    : renderPedidoHistorySection(historyItem);
  const formId = 'crm2-pedido-form';
  const originOptions = PEDIDO_ORIGIN_OPTIONS.map((option) => `<option value="${escapeAttrPedido(option)}" ${draft.origem === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('');
  const responsibleOptions = PEDIDO_RESPONSIBLE_OPTIONS.map((option) => `<option value="${escapeAttrPedido(option)}" ${draft.responsavel === option ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('');
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page crm2-pedido-form-page crm2-pedido-opportunity-form" data-crm2-pedidos="true" aria-labelledby="crm2-pedido-form-title"><div class="admin-panel-header"><div class="crm2-opp-form-heading"><span class="ar-crm-phase1-kicker">ROTA 204 · PEDIDO</span><span class="crm2-opp-number-pill">${escapeHtmlPedido(draft.numero || 'Novo pedido')}</span><div class="crm2-opp-form-title-row"><h3 id="crm2-pedido-form-title">${title}</h3></div><div class="crm2-opp-form-stage-row"><label class="crm2-opp-header-stage-field"><span>Origem do pedido</span><select class="config-input crm2-opp-pill crm2-opp-header-origin-select" name="origem" form="${formId}" required>${originOptions}</select></label><label class="crm2-opp-header-stage-field"><span>Etapa</span><span class="crm2-opp-header-stage-value crm2-opp-pill">${escapeHtmlPedido(draft.status || 'Novo')}</span></label><label class="crm2-opp-header-stage-field crm2-opp-header-responsible-field"><span>Responsável *</span><select class="config-input crm2-opp-pill crm2-opp-header-stage-value" name="responsavel" form="${formId}" required>${responsibleOptions}</select></label></div></div><button class="secondary-btn" type="button" onclick="crm2PedidosCancelForm()">Voltar à lista</button></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}<div class="crm2-opp-form-layout"><form id="${formId}" class="crm2-opp-form" onsubmit="crm2PedidosSaveForm(event)">${renderPedidoIdentityFields(draft, formId)}${renderPedidoItemForm(draft, formId)}</form><aside class="crm2-opp-form-sidebar"><label class="crm2-opp-form-observations crm2-pedido-form-observations"><span>Observações</span><textarea class="config-input" name="observacoes" form="${formId}" rows="5" placeholder="Registre uma observação">${escapeHtmlPedido(draft.observacoes)}</textarea></label>${history}</aside></div>${Object.keys(crm2PedidosState.errors).length ? `<p class="crm2-pedido-form-error" role="alert">Revise os campos destacados antes de salvar.</p>` : ''}<div class="crm2-opp-form-footer"><button class="secondary-btn" type="button" onclick="crm2PedidosCancelForm()">Cancelar</button><button class="save-btn" type="submit" form="${formId}">${creating ? 'Salvar pedido' : 'Salvar alterações'}</button></div></section>`;
}

function pedidoHistory(item) {
  if (Array.isArray(item?.historico) && item.historico.length) return item.historico;
  return [
    { data: item?.dataSolicitacao, usuario: item?.responsavel || 'Sistema', tipo: 'Criação', descricao: 'Pedido criado no conjunto mockado.', alteracoes: 'Registro inicial preservado visualmente.' },
    { data: item?.atualizadoEm, usuario: item?.responsavel || 'Sistema', tipo: 'Status', descricao: `Status atual: ${item?.status || 'Não informado'}.`, alteracoes: `Status: — → ${item?.status || 'Não informado'}` },
    { data: item?.atualizadoEm, usuario: item?.responsavel || 'Sistema', tipo: 'Financeiro', descricao: `Situação financeira atual: ${item?.financeiro || 'Não informado'}.`, alteracoes: `Financeiro: — → ${item?.financeiro || 'Não informado'}` }
  ];
}

function isPedidoEncerrado(item = {}) {
  return ['Concluído', 'Cancelado'].includes(item.status);
}

function renderPedidoHistoryEvent(event) {
  const eventClass = pedidoStatusClass(event.tipo || 'evento');
  return `<article><span class="crm2-pedido-timeline-marker is-${escapeAttrPedido(eventClass)}" aria-hidden="true"></span><div><div class="crm2-pedido-timeline-heading"><span class="crm2-pedido-history-type is-${escapeAttrPedido(eventClass)}">${escapeHtmlPedido(event.tipo || 'Evento')}</span><small>${escapeHtmlPedido(formatDateTimePedido(event.data))}</small></div><strong>${escapeHtmlPedido(event.descricao || 'Movimentação do pedido')}</strong><p>${escapeHtmlPedido(event.usuario || 'Sistema')}</p><small>${escapeHtmlPedido(event.alteracoes || 'Sem alteração de campos registrada.')}</small></div></article>`;
}

function findRelatedPfPedido(item) {
  const records = typeof window.crm2PfGetMockItems === 'function' ? window.crm2PfGetMockItems() : [];
  const cpf = digitsPedido(item.pfCpf);
  return records.find((record) => digitsPedido(record.cpf) === cpf || normalizePedido(record.nome) === normalizePedido(item.pfNome)) || null;
}

function findRelatedPjPedido(item) {
  const records = typeof window.crm2PjGetMockItems === 'function' ? window.crm2PjGetMockItems() : [];
  const cnpj = digitsPedido(item.pjCnpj);
  return records.find((record) => (cnpj && digitsPedido(record.cnpj) === cnpj) || normalizePedido(record.razaoSocial) === normalizePedido(item.pjRazaoSocial)) || null;
}

function renderPedidoRelatedLinks(item) {
  const pf = findRelatedPfPedido(item);
  const pj = item.pjRazaoSocial ? findRelatedPjPedido(item) : null;
  return `<section class="crm2-pedido-integrations" aria-labelledby="crm2-pedido-integrations-title"><div class="hub-form-section-title"><strong id="crm2-pedido-integrations-title">Integrações visuais do CRM 2.0</strong><span>Atalhos para os registros relacionados</span></div><div class="crm2-pedido-integrations-grid"><article><span>Pessoa Física</span><strong>${escapeHtmlPedido(item.pfNome)}</strong><small>${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small><button class="secondary-btn" type="button" onclick="crm2PedidosOpenPf('${escapeAttrPedido(pf?.id || '')}')">${pf ? 'Abrir cadastro PF' : 'Abrir lista PF'}</button></article><article><span>Pessoa Jurídica</span><strong>${escapeHtmlPedido(item.pjRazaoSocial || 'Sem PJ vinculada')}</strong><small>${item.pjCnpj ? escapeHtmlPedido(maskCnpjPedido(item.pjCnpj)) : 'Etapa opcional'}</small>${item.pjRazaoSocial ? `<button class="secondary-btn" type="button" onclick="crm2PedidosOpenPj('${escapeAttrPedido(pj?.id || '')}')">${pj ? 'Abrir cadastro PJ' : 'Abrir lista PJ'}</button>` : '<button class="secondary-btn" type="button" onclick="crm2PedidosOpenPj(\'\')">Incluir ou vincular PJ</button>'}</article><article><span>Oportunidade de origem</span><strong>${escapeHtmlPedido(item.oportunidadeNumero || 'Cadastro manual')}</strong><small>${item.oportunidadeId ? 'Pedido integrado à oportunidade' : 'Pedido criado diretamente'}</small></article></div></section>`;
}

function renderPedidoInlineFields(item) {
  const draft = crm2PedidosState.draft || pedidoDefaults(item);
  return `<form id="crm2-pedido-inline-form" class="crm2-opp-form crm2-pedido-inline-form" onsubmit="crm2PedidosSaveForm(event)">${renderPedidoIdentityFields(draft, 'crm2-pedido-inline-form')}${renderPedidoItemForm(draft, 'crm2-pedido-inline-form')}<label class="crm2-opp-form-observations crm2-pedido-form-observations"><span>Observações</span><textarea class="config-input" name="observacoes" rows="5" placeholder="Registre uma observação">${escapeHtmlPedido(draft.observacoes)}</textarea></label></form>`;
}

function renderPedidoViewValue(value, placeholder = 'Não informado') {
  const text = String(value ?? '').trim();
  const empty = !text || text === '—';
  return `<span class="config-input crm2-pedido-view-field${empty ? ' is-placeholder' : ''}">${escapeHtmlPedido(empty ? placeholder : text)}</span>`;
}

function renderPedidoHistorySection(item) {
  const history = [...pedidoHistory(item)].sort((a, b) => new Date(b.data) - new Date(a.data));
  return `<aside class="hub-form-section crm2-pedido-history-section" aria-labelledby="crm2-pedido-history-title"><div class="hub-form-section-title crm2-pedido-history-title"><div><strong id="crm2-pedido-history-title">Histórico</strong><span>${history.length} evento(s)</span></div></div><div class="crm2-pedido-history-scroll"><div class="crm2-pedido-timeline" aria-live="polite">${history.map(renderPedidoHistoryEvent).join('')}</div></div></aside>`;
}

function renderPedidoMetrics() { return ''; }

function renderPedidosListLegacy2() {
  const filtered = filteredPedidos();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2PedidosState.perPage));
  crm2PedidosState.page = Math.min(Math.max(1, crm2PedidosState.page), totalPages);
  const pageItems = filtered.slice((crm2PedidosState.page - 1) * crm2PedidosState.perPage, crm2PedidosState.page * crm2PedidosState.perPage);
  const hasFilters = hasPedidoFilters();
  const listContent = crm2PedidosState.listState !== 'normal'
    ? renderStatePedidos()
    : pageItems.length
      ? `<div class="ar-crm-phase1-table-wrap crm2-pedidos-table-wrap"><table class="ar-crm-phase1-table crm2-pedidos-table" aria-describedby="crm2-pedidos-caption"><caption id="crm2-pedidos-caption" class="crm2-pessoas-table-caption">Pedidos cadastrados no CRM 2.0</caption><thead><tr><th scope="col">Pedido</th><th scope="col">PF / PJ</th><th scope="col">Produto</th><th scope="col">Responsável</th><th scope="col">Status</th><th scope="col">Solicitação</th><th scope="col">Vencimento</th><th scope="col">Financeiro</th><th scope="col">Ações</th></tr></thead><tbody>${pageItems.map(renderPedidoRow).join('')}</tbody></table></div><div class="crm2-pedidos-pagination" aria-label="Paginação de pedidos"><span>Página <strong>${crm2PedidosState.page}</strong> de <strong>${totalPages}</strong> · ${filtered.length} pedido(s)</span><div><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page - 1})" ${crm2PedidosState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page + 1})" ${crm2PedidosState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`
      : `<div class="crm2-pessoas-state crm2-pedidos-state" role="status"><strong>${crm2PedidosState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhum pedido cadastrado.'}</strong><span>${crm2PedidosState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui pedidos.'}</span><button class="secondary-btn" type="button" onclick="crm2PedidosClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`;
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedidos-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><h3 id="crm2-pedidos-title">Pedidos</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>${crm2PedidosState.canCreate ? '<button class="save-btn" type="button" onclick="crm2PedidosOpenCreate()">+ Incluir pedido</button>' : ''}</div></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}${renderPedidosFilters()}${listContent}</section>`;
}

function renderPedidoTable(pageItems, totalPages, filtered) {
  return `<div class="ar-crm-phase1-table-wrap crm2-pedidos-table-wrap"><table class="ar-crm-phase1-table crm2-pedidos-table" aria-describedby="crm2-pedidos-caption"><caption id="crm2-pedidos-caption" class="crm2-pessoas-table-caption">Pedidos cadastrados no CRM 2.0</caption><thead><tr><th scope="col">Pedido</th><th scope="col">PF / PJ</th><th scope="col">Produto</th><th scope="col">Status</th><th scope="col">Vencimento</th></tr></thead><tbody>${pageItems.map(renderPedidoRow).join('')}</tbody></table></div><div class="crm2-pedidos-pagination" aria-label="Paginação de pedidos"><span>Página <strong>${crm2PedidosState.page}</strong> de <strong>${totalPages}</strong> · ${filtered.length} pedido(s)</span><div><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page - 1})" ${crm2PedidosState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2PedidosSetPage(${crm2PedidosState.page + 1})" ${crm2PedidosState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`;
}

function renderPedidosList() {
  const filtered = filteredPedidos();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2PedidosState.perPage));
  crm2PedidosState.page = Math.min(Math.max(1, crm2PedidosState.page), totalPages);
  const pageItems = filtered.slice((crm2PedidosState.page - 1) * crm2PedidosState.perPage, crm2PedidosState.page * crm2PedidosState.perPage);
  const hasFilters = hasPedidoFilters();
  const listContent = crm2PedidosState.listState !== 'normal'
    ? renderStatePedidos()
    : pageItems.length
      ? renderPedidoTable(pageItems, totalPages, filtered)
      : `<div class="crm2-pessoas-state crm2-pedidos-state" role="status"><strong>${crm2PedidosState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhum pedido cadastrado.'}</strong><span>${crm2PedidosState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui pedidos.'}</span><button class="secondary-btn" type="button" onclick="crm2PedidosClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`;
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedidos-title"><div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><h3 id="crm2-pedidos-title">Pedidos</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>${crm2PedidosState.canCreate ? '<button class="save-btn" type="button" onclick="crm2PedidosOpenCreate()">+ Incluir pedido</button>' : ''}</div></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}${renderPedidosFilters()}${listContent}</section>`;
}

function renderPedidoAttachments(item = {}) {
  const pf = findRelatedPfPedido(item);
  const pj = item.pjRazaoSocial ? findRelatedPjPedido(item) : null;
  const attachments = [
    ...(pf?.anexos || []).map((attachment) => ({ ...attachment, origem: `PF · ${pf.nome}` })),
    ...(pj?.anexos || []).map((attachment) => ({ ...attachment, origem: `PJ · ${pj.razaoSocial}` }))
  ];

  return `<section class="hub-attachment-container crm2-unified-attachments crm2-pedido-attachments-container" aria-labelledby="crm2-pedido-attachments-title"><div class="hub-form-section-title"><strong id="crm2-pedido-attachments-title">Anexos espelhados</strong><span>${attachments.length} anexo(s) relacionado(s)</span></div>${attachments.length ? `<div class="crm2-pedido-attachments-list">${attachments.map((attachment) => `<div><strong>${escapeHtmlPedido(attachment.nome || 'Anexo')}</strong><small>${escapeHtmlPedido(attachment.origem)}</small></div>`).join('')}</div>` : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum anexo espelhado.</strong><span>Os anexos dos cadastros relacionados aparecerão aqui.</span></div>'}</section>`;
}

function renderPedidoDetail(item, editing = crm2PedidosState.formMode === 'edit' && crm2PedidosState.detailId === item.id) {
  const dataContent = editing
    ? renderPedidoInlineFields(item)
    : `<div class="crm2-pedido-detail-grid"><div><span>Número do pedido</span>${renderPedidoViewValue(item.numero)}</div><div><span>Pessoa física</span>${renderPedidoViewValue(item.pfNome)}<small>${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small></div><div><span>Pessoa jurídica</span>${renderPedidoViewValue(item.pjRazaoSocial, 'Sem PJ vinculada')}<small>${item.pjCnpj ? escapeHtmlPedido(maskCnpjPedido(item.pjCnpj)) : 'Não informada'}</small></div><div><span>Produto</span>${renderPedidoViewValue(item.produto)}</div><div><span>Valor</span>${renderPedidoViewValue(item.valor, '0,00')}</div><div><span>Responsável</span>${renderPedidoViewValue(item.responsavel)}</div><div><span>Origem</span>${renderPedidoViewValue(item.origem)}</div><div><span>Data de cadastro</span>${renderPedidoViewValue(formatDatePedido(item.dataSolicitacao))}</div><div class="is-wide"><span>Observações</span>${renderPedidoViewValue(item.observacoes, 'Nenhuma observação registrada.')}</div></div>${renderPedidoAttachments(item)}`;
  const dataSection = `<section class="hub-form-section crm2-pedido-detail-section" aria-labelledby="crm2-pedido-data-title"><div class="hub-form-section-title"><strong id="crm2-pedido-data-title">Dados do pedido</strong></div>${dataContent}</section>`;
  const closed = isPedidoEncerrado(item);
  const actions = editing
    ? `<button class="secondary-btn" type="button" onclick="crm2PedidosCancelForm()">Cancelar edição</button><button class="save-btn" type="submit" form="crm2-pedido-inline-form">Salvar alterações</button>`
    : crm2PedidosState.canEdit && !closed ? `<button class="save-btn" type="button" onclick="crm2PedidosOpenEdit('${escapeAttrPedido(item.id)}')">Editar</button><button class="secondary-btn crm2-pedido-cancel-action" type="button" onclick="crm2PedidosCancel('${escapeAttrPedido(item.id)}')">Cancelar pedido</button><button class="secondary-btn crm2-pedido-close-action" type="button" onclick="crm2PedidosClose('${escapeAttrPedido(item.id)}')">Encerrar pedido</button>` : '';
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page crm2-pedido-detail-page${editing ? ' crm2-pedido-inline-edit-page' : ''}" data-crm2-pedidos="true" aria-labelledby="crm2-pedido-detail-title"><div class="admin-panel-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><span class="crm2-pedido-number-pill">${escapeHtmlPedido(item.numero)}</span><h3 id="crm2-pedido-detail-title">Pedido</h3><p class="crm2-pedidos-subtitle">${escapeHtmlPedido(item.pfNome)} · atualizado em ${escapeHtmlPedido(formatDateTimePedido(item.atualizadoEm))}</p></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="crm2PedidosBackToList()">Voltar à lista</button>${actions}</div></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}${closed ? '<p class="crm2-pedido-closed-notice" role="status">Este pedido está encerrado e não pode mais ser editado. O histórico permanece disponível para consulta.</p>' : ''}<div class="crm2-pedido-data-layout"><main class="crm2-pedido-data-main">${dataSection}${renderPedidoRelatedLinks(item)}</main>${renderPedidoHistorySection(item)}</div></section>`;
}

function renderPedidoMissing() {
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page" data-crm2-pedidos="true"><div class="crm2-pessoas-state is-error" role="alert"><strong>Pedido não encontrado.</strong><span>O registro solicitado não existe no conjunto mockado atual.</span><button class="secondary-btn" type="button" onclick="crm2PedidosBackToList()">Voltar à lista</button></div></section>`;
}

function renderPedidos() {
  permissionsPedidos();
  const route = currentPedidosRoute();
  if (!crm2PedidosState.canView) return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedidos-denied-title"><div class="crm2-pessoas-state crm2-pedidos-state is-error" role="alert"><strong id="crm2-pedidos-denied-title">Acesso não autorizado.</strong><span>É necessária a permissão Visualizar para acessar Pedidos.</span><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></section>`;
  if (route.view === 'new') {
    if (!crm2PedidosState.canCreate) return renderPedidoMissing();
    if (crm2PedidosState.formMode !== 'create' || crm2PedidosState.detailId) {
      crm2PedidosState.formMode = 'create';
      crm2PedidosState.detailId = '';
      crm2PedidosState.draft = pedidoDefaults({});
      crm2PedidosState.errors = {};
    }
    return renderPedidoForm();
  }
  if (route.view === 'edit') {
    const item = getPedido(route.id);
    if (!crm2PedidosState.canEdit || !item) return item ? renderPedidoMissing() : renderPedidoMissing();
    if (crm2PedidosState.formMode !== 'edit' || crm2PedidosState.detailId !== item.id) {
      crm2PedidosState.formMode = 'edit';
      crm2PedidosState.detailId = item.id;
      crm2PedidosState.draft = pedidoDefaults(item);
      crm2PedidosState.errors = {};
    }
    crm2PedidosState.detailTab = 'dados';
    return renderPedidoDetail(item, true);
  }
  if (route.view === 'detail') {
    const item = getPedido(route.id);
    return item ? renderPedidoDetail(item) : renderPedidoMissing();
  }
  resetPedidoForm();
  return renderPedidosList();
}

function rerenderPedidos() {
  if (currentPedidosRoute().active && document.querySelector('[data-crm2-pedidos="true"]')) {
    const target = document.querySelector('[data-crm2-pedidos="true"]');
    target.outerHTML = renderPedidos();
  }
}

function validatePedidoDraft(draft) {
  const errors = {};
  ['pfNome', 'pfCpf', 'produto', 'responsavel', 'origem', 'dataSolicitacao', 'valor'].forEach((field) => {
    if (!String(draft[field] || '').trim()) errors[field] = 'Preenchimento obrigatório.';
  });
  if (draft.produto && !PEDIDO_PRODUCT_OPTIONS.some((option) => normalizePedido(option) === normalizePedido(draft.produto))) errors.produto = 'Selecione um produto válido do catálogo.';
  if (draft.pfCpf && digitsPedido(draft.pfCpf).length !== 11) errors.pfCpf = 'Informe um CPF com 11 dígitos.';
  if (draft.pjCnpj && digitsPedido(draft.pjCnpj).length !== 14) errors.pjCnpj = 'Informe um CNPJ com 14 dígitos.';
  if (draft.valor && (Number.isNaN(pedidoMoneyValue(draft.valor)) || pedidoMoneyValue(draft.valor) < 0)) errors.valor = 'Informe um valor válido.';
  if (draft.pendencias !== '' && (!/^\d+$/.test(String(draft.pendencias)) || Number(draft.pendencias) < 0)) errors.pendencias = 'Informe uma quantidade inteira igual ou maior que zero.';
  return errors;
}

function createPedidoHistory(description, user = '') {
  return [{ data: new Date().toISOString(), usuario: user || 'Usuário mockado', tipo: 'Criação', descricao: description, alteracoes: 'Registro criado no CRM 2.0 mockado.' }];
}

function changePedidoStatus(id, status, actionLabel) {
  permissionsPedidos();
  const item = getPedido(id);
  if (!crm2PedidosState.canEdit || !item || isPedidoEncerrado(item)) return;
  if (!window.confirm(`Confirmar ${actionLabel.toLowerCase()} do pedido ${item.numero}?`)) return;
  const previousStatus = item.status;
  const currentHistory = pedidoHistory(item);
  item.status = status;
  item.historico = [...currentHistory, { data: new Date().toISOString(), usuario: item.responsavel || 'Usuário mockado',
    tipo: status === 'Cancelado' ? 'Cancelamento' : 'Encerramento',
    descricao: `Pedido ${actionLabel.toLowerCase()} no CRM 2.0 mockado.`,
    alteracoes: `Status: ${previousStatus} → ${status}`
  }];
  item.atualizadoEm = new Date().toISOString();
  crm2PedidosState.detailId = item.id;
  crm2PedidosState.detailTab = 'historico';
  crm2PedidosState.message = `Pedido ${actionLabel.toLowerCase()} com sucesso no conjunto mockado.`;
  rerenderPedidos();
}

Object.assign(window, {
  crm2PedidosFormatCpf(input) {
    if (!input) return;
    const digits = digitsPedido(input.value).slice(0, 11);
    input.value = maskCpfPedido(digits);
  },
  crm2PedidosMatchPf(value, target) {
    const cpf = digitsPedido(value);
    const form = target?.closest('form') || document.getElementById('crm2-pedido-form') || document.getElementById('crm2-pedido-inline-form');
    const field = form?.querySelector('[name="pfCpf"]');
    const name = form?.querySelector('[name="pfNome"]');
    const message = form?.querySelector('.crm2-pedido-cpf-match-message');
    const searched = cpf.length === 11;
    const pf = searched ? (window.crm2PfGetMockItems?.() || []).find((item) => digitsPedido(item.cpf) === cpf) : null;
    if (field) field.value = maskCpfPedido(cpf);
    if (pf && name) name.value = pf.nome || '';
    if (message) {
      message.hidden = !searched;
      message.textContent = pf ? 'PF encontrada' : 'CPF sem cadastro';
      message.classList.toggle('is-success', Boolean(pf));
    }
    crm2PedidosState.draft = { ...crm2PedidosState.draft, pfId: pf?.id || '', pfCpf: cpf, pfNome: pf?.nome || name?.value || '' };
  },
  crm2PedidosRenderProductSuggestions(input) {
    const target = input?.closest('.crm2-pedido-product-cell')?.querySelector('[data-pedido-product-suggestions]');
    if (!target) return;
    const query = normalizePedido(input.value);
    const matches = PEDIDO_PRODUCT_OPTIONS.filter((item) => !query || normalizePedido(item).includes(query)).slice(0, 8);
    target.innerHTML = matches.map((item) => `<button type="button" class="crm2-opp-product-suggestion" data-product-value="${escapeAttrPedido(item)}" onclick="window.crm2PedidosSelectProductSuggestion(this)"><strong>${escapeHtmlPedido(item)}</strong><small>R$ ${escapeHtmlPedido(pedidoProductPrice(item))}</small></button>`).join('');
    target.hidden = !matches.length;
  },
  crm2PedidosHideProductSuggestions(input) {
    const target = input?.closest('.crm2-pedido-product-cell')?.querySelector('[data-pedido-product-suggestions]');
    if (target) target.hidden = true;
  },
  crm2PedidosSelectProductSuggestion(button) {
    const cell = button?.closest('.crm2-pedido-product-cell');
    const input = cell?.querySelector('[name^="itemProduct-"]');
    if (!input) return;
    input.value = button.dataset.productValue || '';
    window.crm2PedidosSyncItemPrice(input);
    window.crm2PedidosHideProductSuggestions(input);
  },
  crm2PedidosSyncItemPrice(input) {
    const row = input?.closest('tr');
    if (!row) return;
    const price = pedidoProductPrice(input.value);
    const value = row.querySelector('[name^="itemValue-"]');
    const pill = row.querySelector('[data-pedido-item-price]');
    if (price && value) value.value = price;
    if (pill) pill.textContent = price ? `R$ ${price}` : 'R$ 0,00';
    const total = row.closest('.crm2-pedido-items-form')?.querySelector('[data-pedido-total]');
    if (total) total.textContent = price ? `R$ ${price} estimado` : 'R$ 0,00 estimado';
  },
  crm2PedidosSyncItemValue(input) {
    const row = input?.closest('tr');
    const price = String(input?.value || '').trim() || '0,00';
    const pill = row?.querySelector('[data-pedido-item-price]');
    const total = row?.closest('.crm2-pedido-items-form')?.querySelector('[data-pedido-total]');
    if (pill) pill.textContent = `R$ ${price}`;
    if (total) total.textContent = `R$ ${price} estimado`;
  },
  crm2PedidosSyncItemPj(input) {
    if (!input) return;
    const raw = String(input.value || '');
    const hasText = /[A-Za-zÀ-ÿ]/.test(raw);
    const normalized = digitsPedido(raw).slice(0, 14);
    if (!hasText) input.value = maskCnpjPedido(normalized);
    const cell = input.closest('.crm2-pedido-item-pj-cell');
    const lookup = cell?.querySelector('.crm2-pedido-item-cnpj-search');
    if (lookup) lookup.disabled = hasText || normalized.length !== 14;
    window.crm2PedidosRenderPjSuggestions(input);
  },
  crm2PedidosRenderPjSuggestions(input) {
    const target = input?.closest('.crm2-pedido-item-pj-cell')?.querySelector('[data-pedido-pj-suggestions]');
    if (!target) return;
    const query = normalizePedido(input.value);
    const queryDigits = digitsPedido(input.value);
    if (query.length < 2 && queryDigits.length < 2) {
      target.hidden = true;
      target.innerHTML = '';
      return;
    }
    const matches = (window.crm2PjGetMockItems?.() || []).filter((item) => normalizePedido(`${item.razaoSocial || ''} ${item.id || ''}`).includes(query) || (queryDigits.length >= 2 && digitsPedido(item.cnpj).includes(queryDigits))).slice(0, 6);
    target.innerHTML = matches.map((item) => `<button type="button" class="crm2-opp-cnpj-suggestion" data-pj-id="${escapeAttrPedido(item.id)}" onclick="window.crm2PedidosSelectPjSuggestion(this)"><strong>${escapeHtmlPedido(item.razaoSocial || item.id)}</strong><small>${escapeHtmlPedido(maskCnpjPedido(item.cnpj))}</small></button>`).join('');
    target.hidden = !matches.length;
  },
  crm2PedidosHidePjSuggestions(input) {
    const target = input?.closest('.crm2-pedido-item-pj-cell')?.querySelector('[data-pedido-pj-suggestions]');
    if (target) target.hidden = true;
  },
  crm2PedidosSelectPjSuggestion(button) {
    const pj = (window.crm2PjGetMockItems?.() || []).find((item) => item.id === button?.dataset?.pjId);
    const cell = button?.closest('.crm2-pedido-item-pj-cell');
    const input = cell?.querySelector('[name^="itemPj-"]');
    const name = cell?.querySelector('[name^="itemPjName-"]');
    if (!pj || !input) return;
    input.value = maskCnpjPedido(pj.cnpj);
    if (name) name.value = pj.razaoSocial || '';
    cell.querySelector('.crm2-pedido-item-cnpj-search')?.removeAttribute('disabled');
    window.crm2PedidosHidePjSuggestions(input);
  },
  crm2PedidosLookupItemCnpj(button) {
    const cell = button?.closest('.crm2-pedido-item-pj-cell');
    const input = cell?.querySelector('[name^="itemPj-"]');
    const name = cell?.querySelector('[name^="itemPjName-"]');
    if (!input) return;
    const cnpj = digitsPedido(input.value);
    const existingPj = (window.crm2PjGetMockItems?.() || []).find((item) => digitsPedido(item.cnpj) === cnpj);
    abrirConsultaCnpj({ value: input.value, existing: existingPj ? { cnpj: existingPj.cnpj, razaoSocial: existingPj.razaoSocial } : null, onConfirm: (data) => {
      input.value = maskCnpjPedido(data.cnpj);
      if (name) name.value = data.razaoSocial || '';
      crm2PedidosState.draft = { ...crm2PedidosState.draft, pjCnpj: digitsPedido(data.cnpj), pjRazaoSocial: data.razaoSocial || '' };
    } });
  },
  crm2PedidosMaskCnpj(value) { return maskCnpjPedido(value); },
  crm2PedidosLookupCnpj(button) {
    const form = button?.closest('form');
    const input = form?.querySelector('[name="pjCnpj"]');
    if (!input) return;
    const existing = { cnpj: digitsPedido(input.value), razaoSocial: form.querySelector('[name="pjRazaoSocial"]')?.value || '' };
    abrirConsultaCnpj({ value: input.value, existing, onConfirm: (data) => {
      input.value = maskCnpjPedido(data.cnpj);
      const company = form.querySelector('[name="pjRazaoSocial"]');
      if (company) company.value = data.razaoSocial || '';
      crm2PedidosState.draft = { ...crm2PedidosState.draft, pjCnpj: data.cnpj, pjRazaoSocial: data.razaoSocial || '' };
    } });
  },
  crm2PedidosRender: renderPedidos,
  crm2PedidosGetMockItems() {
    return crm2PedidosState.items.map((item) => ({
      ...item,
      historico: Array.isArray(item.historico) ? item.historico.map((event) => ({ ...event })) : []
    }));
  },
  crm2PedidosCreateMockFromOpportunity(payload = {}) {
    permissionsPedidos();
    if (!crm2PedidosState.canCreate || !payload.pfNome || !payload.pfCpf || !payload.produto) return null;
    const now = new Date().toISOString();
    const id = `pedido-conv-${Date.now()}-${crm2PedidosState.items.length}`;
    const item = {
      id,
      numero: payload.numeroPedido || `PED-CONV-${String(crm2PedidosState.items.length + 1).padStart(3, '0')}`,
      pfNome: payload.pfNome, pfCpf: String(payload.pfCpf).replace(/\D/g, ''),
      pjRazaoSocial: payload.pjRazaoSocial || '', pjCnpj: String(payload.pjCnpj || '').replace(/\D/g, ''),
      produto: payload.produto, responsavel: payload.responsavel || 'Usuário mockado', status: payload.dataEmissao ? 'Pedido emitido' : 'Pedido validado',
      origem: 'Pedido gerado pela oportunidade', dataSolicitacao: now.slice(0, 10), dataEmissao: payload.dataEmissao || '', vencimento: payload.vencimento || now.slice(0, 10),
      financeiro: 'Pendente', valor: payload.valor || '0,00', pendencias: 0, atualizadoEm: now,
      oportunidadeId: payload.oportunidadeId || '', oportunidadeNumero: payload.oportunidadeNumero || '', oportunidadeItemId: payload.oportunidadeItemId || '',
      historico: [{ data: now, usuario: payload.responsavel || 'Usuário mockado', tipo: 'Pedido gerado', descricao: 'Pedido gerado a partir da oportunidade.', alteracoes: `Origem: Oportunidade · Item: ${payload.produto}` }]
    };
    crm2PedidosState.items.unshift(item);
    crm2PedidosState.message = 'Pedido gerado a partir da oportunidade no conjunto mockado.';
    rerenderPedidos();
    return { ...item, historico: item.historico.map((event) => ({ ...event })) };
  },
  crm2PedidosCreateMockFromConversion(payload = {}) {
    return window.crm2PedidosCreateMockFromOpportunity?.(payload) || null;
  },
  crm2PedidosCreateMockFromSequential(payload = {}) {
    permissionsPedidos();
    if (!crm2PedidosState.canCreate || !payload.pfNome || !payload.pfCpf || !payload.produto) return null;
    const now = new Date().toISOString();
    const sequence = crm2PedidosState.items.length + 1;
    const item = {
      id: `pedido-${Date.now()}-${sequence}`,
      numero: `PED-${2401 + sequence}`,
      pfId: payload.pfId || '',
      pfNome: payload.pfNome,
      pfCpf: digitsPedido(payload.pfCpf),
      pjId: payload.pjId || '',
      pjRazaoSocial: payload.pjRazaoSocial || '',
      pjCnpj: digitsPedido(payload.pjCnpj || ''),
      vinculoTipo: payload.vinculoTipo || '',
      produto: payload.produto,
      tipoAtendimento: payload.tipoAtendimento || '',
      responsavel: payload.responsavel || 'Usuário mockado',
      status: normalizePedidoStatus(payload.status || 'Novo'),
      origem: payload.origem || 'Atendimento interno',
      dataSolicitacao: payload.dataSolicitacao || now.slice(0, 10),
      vencimento: payload.vencimento || now.slice(0, 10),
      financeiro: payload.financeiro || 'Pendente',
      valor: payload.valor || '0,00',
      pendencias: String(payload.pendencias || '0'),
      observacoes: payload.observacoes || '',
      atualizadoEm: now,
      historico: [{
        data: now,
        usuario: payload.responsavel || 'Usuário mockado',
        tipo: 'Pedido criado',
        descricao: 'Pedido criado pelo cadastro sequencial.',
        alteracoes: `Origem: Cadastro sequencial · Produto: ${payload.produto}`
      }]
    };
    crm2PedidosState.items.unshift(item);
    crm2PedidosState.message = 'Pedido incluído com sucesso no conjunto mockado.';
    rerenderPedidos();
    return { ...item, historico: item.historico.map((event) => ({ ...event })) };
  },
  crm2PedidosMount() {
    const target = document.querySelector('[data-crm2-pedidos="true"]');
    if (target) target.outerHTML = renderPedidos();
  },
  navegarParaCrm2PedidosRota() {
    permissionsPedidos();
    if (!crm2PedidosState.canView) return;
    navigatePedidos();
  },
  crm2PedidosOpenCreate() {
    permissionsPedidos();
    if (!crm2PedidosState.canCreate) return;
    crm2PedidosState.message = '';
    crm2PedidosState.formMode = 'create';
    crm2PedidosState.detailId = '';
    crm2PedidosState.draft = pedidoDefaults({});
    crm2PedidosState.errors = {};
    navigatePedidos('novo');
  },
  crm2PedidosOpenDetail(id) {
    if (!getPedido(id)) return;
    crm2PedidosState.detailId = id;
    crm2PedidosState.detailTab = 'dados';
    navigatePedidos(id);
  },
  crm2PedidosOpenPf(id) {
    if (id && typeof window.crm2PfOpenDetail === 'function') {
      window.crm2PfOpenDetail(id);
      return;
    }
    window.navegarParaCrm2Rota?.('201');
  },
  crm2PedidosOpenPj(id) {
    if (id && typeof window.crm2PjOpenDetail === 'function') {
      window.crm2PjOpenDetail(id);
      return;
    }
    window.navegarParaCrm2PjRota?.();
  },
  crm2PedidosOpenFlow() {
    window.navegarParaCrm2Cadastro?.();
  },
  crm2PedidosOpenEdit(id) {
    permissionsPedidos();
    if (!crm2PedidosState.canEdit || !getPedido(id) || isPedidoEncerrado(getPedido(id))) return;
    crm2PedidosState.message = '';
    crm2PedidosState.formMode = 'edit';
    crm2PedidosState.detailId = id;
    crm2PedidosState.detailTab = 'dados';
    crm2PedidosState.draft = pedidoDefaults(getPedido(id));
    crm2PedidosState.errors = {};
    rerenderPedidos();
  },
  crm2PedidosCancel(id) {
    changePedidoStatus(id, 'Cancelado', 'cancelamento');
  },
  crm2PedidosClose(id) {
    changePedidoStatus(id, 'Concluído', 'encerramento');
  },
  crm2PedidosBackToList() {
    crm2PedidosState.detailTab = 'dados';
    crm2PedidosState.message = '';
    navigatePedidos();
  },
  crm2PedidosCancelForm() {
    const route = currentPedidosRoute();
    crm2PedidosState.message = '';
    resetPedidoForm();
    if (route.view === 'edit') navigatePedidos(route.id);
    else navigatePedidos();
  },
  crm2PedidosSelectTab(tab) {
    if (!['dados', 'pendencias', 'historico'].includes(tab)) return;
    crm2PedidosState.detailTab = tab;
    rerenderPedidos();
  },
  crm2PedidosSaveForm(event) {
    event?.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const itemPj = String(values['itemPj-0'] || values.pjCnpj || values.pjRazaoSocial || '').trim();
    const itemPjDigits = digitsPedido(itemPj);
    const itemPjIsNumeric = Boolean(itemPj) && !/[A-Za-zÀ-ÿ]/.test(itemPj);
    const draft = { ...crm2PedidosState.draft, ...values,
      numero: String(values['itemOrder-0'] || values.numero || '').trim(),
      produto: String(values['itemProduct-0'] || values.produto || '').trim(),
      valor: String(values['itemValue-0'] || values.valor || '').trim(),
      pfCpf: digitsPedido(values.pfCpf),
      pjCnpj: itemPjIsNumeric ? itemPjDigits : '',
      pjRazaoSocial: itemPjDigits.length === 14 ? String(values['itemPjName-0'] || values.pjRazaoSocial || '').trim() : itemPj,
      pendencias: String(values.pendencias || '0')
    };
    const errors = validatePedidoDraft(draft);
    crm2PedidosState.draft = draft;
    crm2PedidosState.errors = errors;
    if (Object.keys(errors).length) {
      rerenderPedidos();
      return;
    }
    if (crm2PedidosState.formMode === 'create') {
      const id = `pedido-${String(crm2PedidosState.items.length + 1).padStart(3, '0')}`;
      const item = { ...draft, id, numero: draft.numero || `PED-${2401 + crm2PedidosState.items.length}`, atualizadoEm: new Date().toISOString(), historico: createPedidoHistory('Pedido criado no CRM 2.0 mockado.', draft.responsavel) };
      crm2PedidosState.items.unshift(item);
      crm2PedidosState.message = 'Pedido incluído com sucesso no conjunto mockado.';
      crm2PedidosState.detailTab = 'dados';
      resetPedidoForm();
      navigatePedidos(id);
      return;
    }
    const item = getPedido(crm2PedidosState.detailId);
    if (!item) return;
    const previousStatus = item.status;
    const previousFinancial = item.financeiro;
    const previousProduct = item.produto;
    const previousResponsible = item.responsavel;
    const currentHistory = pedidoHistory(item);
    Object.assign(item, draft, { atualizadoEm: new Date().toISOString() });
    const changes = [];
    if (previousStatus !== draft.status) changes.push(`Status: ${previousStatus} → ${draft.status}`);
    if (previousFinancial !== draft.financeiro) changes.push(`Financeiro: ${previousFinancial} → ${draft.financeiro}`);
    if (previousProduct !== draft.produto) changes.push(`Produto: ${previousProduct} → ${draft.produto}`);
    if (previousResponsible !== draft.responsavel) changes.push(`Responsável: ${previousResponsible} → ${draft.responsavel}`);
    item.historico = [...currentHistory, { data: new Date().toISOString(), usuario: item.responsavel || 'Usuário mockado',
      tipo: changes.some((change) => change.startsWith('Financeiro')) ? 'Financeiro' : changes.some((change) => change.startsWith('Status')) ? 'Status' : 'Edição',
      descricao: 'Pedido atualizado no CRM 2.0 mockado.',
      alteracoes: changes.length ? changes.join(' · ') : 'Dados cadastrais e operacionais revisados.'
    }];
    crm2PedidosState.message = 'Pedido atualizado com sucesso no conjunto mockado.';
    resetPedidoForm();
    navigatePedidos(item.id);
  },
  crm2PedidosApplyFilters(event) {
    event?.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    crm2PedidosState.search = String(values.search || '').trim();
    crm2PedidosState.statusFilter = String(values.status || '');
    crm2PedidosState.productFilter = String(values.product || '');
    crm2PedidosState.responsibleFilter = String(values.responsible || '');
    crm2PedidosState.originFilter = String(values.origin || '');
    crm2PedidosState.financialFilter = String(values.financial || '');
    crm2PedidosState.dateFrom = String(values.dateFrom || '');
    crm2PedidosState.dateTo = String(values.dateTo || '');
    crm2PedidosState.filterModalOpen = false;
    crm2PedidosState.filterDraft = {};
    crm2PedidosState.page = 1;
    rerenderPedidos();
  },
  crm2PedidosApplyModalFilters(event) {
    window.crm2PedidosApplyFilters?.(event);
  },
  crm2PedidosToggleFilterModal() {
    crm2PedidosState.filterModalOpen = !crm2PedidosState.filterModalOpen;
    crm2PedidosState.filterDraft = crm2PedidosState.filterModalOpen ? currentPedidoFilterValues() : {};
    rerenderPedidos();
    if (crm2PedidosState.filterModalOpen) window.requestAnimationFrame(() => document.getElementById('crm2-pedidos-filter-modal-close')?.focus());
  },
  crm2PedidosCloseFilterModal(event) {
    if (event && event.target !== event.currentTarget) return;
    crm2PedidosState.filterModalOpen = false;
    crm2PedidosState.filterDraft = {};
    rerenderPedidos();
  },
  crm2PedidosClearFilterDraft() {
    crm2PedidosState.filterDraft = { status: '', product: '', responsible: '', origin: '', financial: '', dateFrom: '', dateTo: '' };
    rerenderPedidos();
  },
  crm2PedidosSetSearch(value, input) {
    window.hubAtualizarBuscaAoDigitar(input, (search) => {
      crm2PedidosState.search = search;
      crm2PedidosState.searchExpanded = true;
      crm2PedidosState.page = 1;
    }, rerenderPedidos, () => document.querySelector('.crm2-opp-search-control input[type="search"]'));
  },
  crm2PedidosToggleSearch(button) {
    const control = button?.closest('.crm2-opp-search-control');
    const input = control?.querySelector('input[type="search"]');
    if (!control || !input) return;
    const expanded = !control.classList.contains('is-expanded');
    crm2PedidosState.searchExpanded = expanded;
    control.classList.toggle('is-expanded', expanded);
    input.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    if (expanded) input.focus({ preventScroll: true });
  },
  crm2PedidosHandleSearchBlur(event) {
    const input = event?.currentTarget;
    const control = input?.closest('.crm2-opp-search-control');
    if (!control || control.contains(event.relatedTarget)) return;
    window.setTimeout(() => {
      if (control.contains(document.activeElement)) return;
      crm2PedidosState.searchExpanded = false;
      control.classList.remove('is-expanded');
      input.hidden = true;
      control.querySelector('button')?.setAttribute('aria-expanded', 'false');
    }, 0);
  },
  crm2PedidosClearFilters() {
    crm2PedidosState.search = '';
    crm2PedidosState.searchExpanded = false;
    crm2PedidosState.filterModalOpen = false;
    crm2PedidosState.filterDraft = {};
    crm2PedidosState.statusFilter = '';
    crm2PedidosState.productFilter = '';
    crm2PedidosState.responsibleFilter = '';
    crm2PedidosState.originFilter = '';
    crm2PedidosState.financialFilter = '';
    crm2PedidosState.dateFrom = '';
    crm2PedidosState.dateTo = '';
    crm2PedidosState.page = 1;
    crm2PedidosState.message = '';
    rerenderPedidos();
  },
  crm2PedidosSetPage(page) {
    crm2PedidosState.page = Math.max(1, Number(page) || 1);
    rerenderPedidos();
  },
  crm2PedidosSetListState(value) {
    crm2PedidosState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    rerenderPedidos();
  }
});

observarContextoAcessoHub(() => {
  permissionsPedidos();
  if (currentPedidosRoute().active) window.crm2PedidosMount?.();
});

permissionsPedidos();
