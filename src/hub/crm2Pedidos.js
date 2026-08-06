// CRM 2.0 — Rota 204 / Pedidos.
// Fases 7.1 a 7.7: shell, lista, filtros, estados, permissões, inclusão, detalhe e edição mockados.
import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

const CRM2_PEDIDOS_INITIAL_ITEMS = [
  { id: 'pedido-001', numero: 'PED-2401', pfNome: 'Mariana Alves de Souza', pfCpf: '12345678909', pjRazaoSocial: 'Transmares Tecnologia Ltda.', pjCnpj: '04252011000110', produto: 'e-CNPJ A3', responsavel: 'Ana Martins', status: 'Ativo', origem: 'Indicação', dataSolicitacao: '2026-07-18', vencimento: '2027-07-18', financeiro: 'Pago', valor: '890,00', pendencias: 0, atualizadoEm: '2026-08-04T09:20:00' },
  { id: 'pedido-002', numero: 'PED-2390', pfNome: 'Rafael Nogueira Lima', pfCpf: '98765432100', pjRazaoSocial: 'Transmares Tecnologia Ltda.', pjCnpj: '04252011000110', produto: 'e-CNPJ A1', responsavel: 'Carlos Oliveira', status: 'Em validação', origem: 'Site', dataSolicitacao: '2026-07-02', vencimento: '2027-02-10', financeiro: 'Pendente', valor: '540,00', pendencias: 2, atualizadoEm: '2026-08-02T11:08:00' },
  { id: 'pedido-003', numero: 'PED-2389', pfNome: 'Camila Ferreira Rocha', pfCpf: '45678912364', pjRazaoSocial: 'Alves Consultoria Ltda.', pjCnpj: '12345678000195', produto: 'e-CPF A3', responsavel: 'Ana Martins', status: 'Vencido', origem: 'Parceiro', dataSolicitacao: '2025-12-20', vencimento: '2026-01-20', financeiro: 'Pendente', valor: '390,00', pendencias: 1, atualizadoEm: '2026-07-28T10:05:00' },
  { id: 'pedido-004', numero: 'PED-2377', pfNome: 'Beatriz Costa Menezes', pfCpf: '36925814700', pjRazaoSocial: 'Norte Serviços Empresariais S.A.', pjCnpj: '27865757000102', produto: 'Renovação de certificado', responsavel: 'Fernanda Lima', status: 'Aguardando documentação', origem: 'Atendimento interno', dataSolicitacao: '2026-06-22', vencimento: '2026-09-22', financeiro: 'Pendente', valor: '480,00', pendencias: 3, atualizadoEm: '2026-07-31T14:16:00' },
  { id: 'pedido-005', numero: 'PED-2366', pfNome: 'Lucas Henrique Barros', pfCpf: '85274196300', pjRazaoSocial: 'Maré Alta Comércio Ltda.', pjCnpj: '36711234000180', produto: 'e-CNPJ A3', responsavel: 'Fernanda Lima', status: 'Concluído', origem: 'Indicação', dataSolicitacao: '2026-05-21', vencimento: '2027-05-21', financeiro: 'Pago', valor: '890,00', pendencias: 0, atualizadoEm: '2026-06-01T08:45:00' },
  { id: 'pedido-006', numero: 'PED-2354', pfNome: 'Renata Cristina Alves', pfCpf: '15935748600', pjRazaoSocial: 'Maré Alta Comércio Ltda.', pjCnpj: '36711234000180', produto: 'e-CNPJ A1', responsavel: 'Carlos Oliveira', status: 'Cancelado', origem: 'Site', dataSolicitacao: '2026-04-10', vencimento: '2026-05-10', financeiro: 'Estornado', valor: '540,00', pendencias: 0, atualizadoEm: '2026-05-12T16:40:00' },
  { id: 'pedido-007', numero: 'PED-2341', pfNome: 'Diego Martins da Silva', pfCpf: '25814736900', pjRazaoSocial: 'Litoral Logística e Transportes Ltda.', pjCnpj: '50123456000173', produto: 'e-CPF A3', responsavel: 'Ana Martins', status: 'Em cadastro', origem: 'Atendimento interno', dataSolicitacao: '2026-03-08', vencimento: '2026-09-08', financeiro: 'Pendente', valor: '390,00', pendencias: 1, atualizadoEm: '2026-05-02T13:15:00' },
  { id: 'pedido-008', numero: 'PED-2320', pfNome: 'João Pedro Ribeiro', pfCpf: '74185296300', pjRazaoSocial: '', pjCnpj: '', produto: 'Renovação de certificado', responsavel: 'Carlos Oliveira', status: 'Aguardando pagamento', origem: 'Parceiro', dataSolicitacao: '2026-02-14', vencimento: '2026-08-14', financeiro: 'Pendente', valor: '480,00', pendencias: 1, atualizadoEm: '2026-04-20T09:30:00' }
];

const PEDIDO_STATUS_OPTIONS = ['Em cadastro', 'Aguardando documentação', 'Em validação', 'Aguardando pagamento', 'Ativo', 'Concluído', 'Cancelado', 'Vencido'];
const PEDIDO_PRODUCT_OPTIONS = ['e-CPF A3', 'e-CNPJ A1', 'e-CNPJ A3', 'Renovação de certificado'];
const PEDIDO_RESPONSIBLE_OPTIONS = ['Ana Martins', 'Carlos Oliveira', 'Fernanda Lima'];
const PEDIDO_ORIGIN_OPTIONS = ['Atendimento interno', 'Indicação', 'Parceiro', 'Site'];
const PEDIDO_FINANCIAL_OPTIONS = ['Pago', 'Pendente', 'Estornado'];

const crm2PedidosState = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_PEDIDOS_INITIAL_ITEMS),
  search: '',
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
    status: item.status || 'Em cadastro',
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

function renderPedidoMetrics() {
  const active = crm2PedidosState.items.filter((item) => ['Ativo', 'Em validação', 'Em cadastro', 'Aguardando documentação', 'Aguardando pagamento'].includes(item.status)).length;
  const pending = crm2PedidosState.items.filter((item) => Number(item.pendencias) > 0).length;
  const overdue = crm2PedidosState.items.filter((item) => item.status === 'Vencido').length;
  return `<div class="crm2-pedidos-metrics" aria-label="Resumo dos pedidos"><article><small>Total</small><strong>${crm2PedidosState.items.length}</strong><span>Pedidos mockados</span></article><article><small>Em andamento</small><strong>${active}</strong><span>Sem encerramento</span></article><article><small>Com pendências</small><strong>${pending}</strong><span>Requerem atenção</span></article><article><small>Vencidos</small><strong>${overdue}</strong><span>Prazo ultrapassado</span></article></div>`;
}

function renderPedidoRow(item) {
  return `<tr><td><button class="crm2-pedido-number-link" type="button" onclick="crm2PedidosOpenDetail('${escapeAttrPedido(item.id)}')"><strong>${escapeHtmlPedido(item.numero)}</strong></button><small>${escapeHtmlPedido(item.origem)}</small></td><td><strong>${escapeHtmlPedido(item.pfNome)}</strong><small>${escapeHtmlPedido(item.pjRazaoSocial || 'Sem PJ')} · ${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small></td><td>${escapeHtmlPedido(item.produto)}</td><td>${escapeHtmlPedido(item.responsavel)}</td><td>${renderStatusPedido(item.status)}${Number(item.pendencias) > 0 ? `<small class="crm2-pedidos-pending">${item.pendencias} pendência(s)</small>` : ''}</td><td>${escapeHtmlPedido(formatDatePedido(item.dataSolicitacao))}</td><td>${escapeHtmlPedido(formatDatePedido(item.vencimento))}</td><td>${renderStatusPedido(item.financeiro, true)}<small>R$ ${escapeHtmlPedido(item.valor)}</small></td><td><div class="crm2-pedidos-row-actions"><button class="secondary-btn" type="button" onclick="crm2PedidosOpenDetail('${escapeAttrPedido(item.id)}')">Visualizar</button>${crm2PedidosState.canEdit && !isPedidoEncerrado(item) ? `<button class="secondary-btn" type="button" onclick="crm2PedidosOpenEdit('${escapeAttrPedido(item.id)}')">Editar</button>` : ''}</div></td></tr>`;
}

function renderPedidosList() {
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

function renderPedidoField({ label, name, value = '', type = 'text', required = false, wide = false, options = [], placeholder = '' }) {
  const error = crm2PedidosState.errors[name] || '';
  const id = `crm2-pedido-${name}`;
  const common = `id="${id}" class="config-input" name="${name}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" ${error ? `aria-describedby="${id}-error"` : ''}`;
  const input = type === 'textarea'
    ? `<textarea ${common} rows="4" placeholder="${escapeAttrPedido(placeholder)}">${escapeHtmlPedido(value)}</textarea>`
    : type === 'select'
      ? `<select ${common}><option value="">Selecione</option>${options.map((option) => `<option value="${escapeAttrPedido(option)}" ${String(value) === String(option) ? 'selected' : ''}>${escapeHtmlPedido(option)}</option>`).join('')}</select>`
      : `<input ${common} type="${type}" value="${escapeAttrPedido(value)}" placeholder="${escapeAttrPedido(placeholder)}">`;
  return `<label class="${wide ? 'is-wide' : ''}"><span>${escapeHtmlPedido(label)}${required ? ' *' : ''}</span>${input}${error ? `<small id="${id}-error" class="crm2-field-error">${escapeHtmlPedido(error)}</small>` : ''}</label>`;
}

function renderPedidoForm() {
  const creating = crm2PedidosState.formMode === 'create';
  const title = creating ? 'Incluir pedido' : 'Editar pedido';
  const draft = crm2PedidosState.draft;
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page crm2-pedido-form-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedido-form-title"><div class="admin-panel-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><h3 id="crm2-pedido-form-title">${title}</h3><p class="crm2-pedidos-subtitle">Dados mockados para validação do fluxo de pedidos.</p></div><button class="secondary-btn" type="button" onclick="crm2PedidosCancelForm()">Voltar à lista</button></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}<form class="crm2-pedido-form" onsubmit="crm2PedidosSaveForm(event)"><div class="hub-form-section"><div class="hub-form-section-title"><strong>Identificação</strong><span>Campos principais do pedido</span></div><div class="crm2-pedido-form-grid">${renderPedidoField({ label: 'Número do pedido', name: 'numero', value: draft.numero, required: !creating, placeholder: creating ? 'Gerado ao salvar' : '' })}${renderPedidoField({ label: 'Pessoa física', name: 'pfNome', value: draft.pfNome, required: true, placeholder: 'Nome completo' })}${renderPedidoField({ label: 'CPF', name: 'pfCpf', value: maskCpfPedido(draft.pfCpf), required: true, placeholder: '000.000.000-00' })}${renderPedidoField({ label: 'Pessoa jurídica', name: 'pjRazaoSocial', value: draft.pjRazaoSocial, placeholder: 'Opcional' })}${renderPedidoField({ label: 'CNPJ', name: 'pjCnpj', value: maskCnpjPedido(draft.pjCnpj), placeholder: 'Opcional' })}${renderPedidoField({ label: 'Produto', name: 'produto', value: draft.produto, type: 'select', options: PEDIDO_PRODUCT_OPTIONS, required: true })}</div></div><div class="hub-form-section"><div class="hub-form-section-title"><strong>Operação e financeiro</strong><span>Status e prazos da solicitação</span></div><div class="crm2-pedido-form-grid">${renderPedidoField({ label: 'Responsável', name: 'responsavel', value: draft.responsavel, type: 'select', options: PEDIDO_RESPONSIBLE_OPTIONS, required: true })}${renderPedidoField({ label: 'Status', name: 'status', value: draft.status, type: 'select', options: PEDIDO_STATUS_OPTIONS, required: true })}${renderPedidoField({ label: 'Origem', name: 'origem', value: draft.origem, type: 'select', options: PEDIDO_ORIGIN_OPTIONS, required: true })}${renderPedidoField({ label: 'Data da solicitação', name: 'dataSolicitacao', value: draft.dataSolicitacao, type: 'date', required: true })}${renderPedidoField({ label: 'Vencimento', name: 'vencimento', value: draft.vencimento, type: 'date', required: true })}${renderPedidoField({ label: 'Situação financeira', name: 'financeiro', value: draft.financeiro, type: 'select', options: PEDIDO_FINANCIAL_OPTIONS, required: true })}${renderPedidoField({ label: 'Valor', name: 'valor', value: draft.valor, placeholder: '0,00', required: true })}${renderPedidoField({ label: 'Pendências', name: 'pendencias', value: draft.pendencias, type: 'number', required: true })}${renderPedidoField({ label: 'Observações', name: 'observacoes', value: draft.observacoes, type: 'textarea', wide: true, placeholder: 'Contexto operacional mockado' })}</div></div><div class="crm2-pedido-form-actions"><button class="secondary-btn" type="button" onclick="crm2PedidosCancelForm()">Cancelar</button><button class="save-btn" type="submit">${creating ? 'Salvar pedido' : 'Salvar alterações'}</button></div></form></section>`;
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
  return `<section class="crm2-pedido-integrations" aria-labelledby="crm2-pedido-integrations-title"><div class="hub-form-section-title"><strong id="crm2-pedido-integrations-title">Integrações visuais do CRM 2.0</strong><span>Atalhos para os registros relacionados</span></div><div class="crm2-pedido-integrations-grid"><article><span>Pessoa Física</span><strong>${escapeHtmlPedido(item.pfNome)}</strong><small>${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small><button class="secondary-btn" type="button" onclick="crm2PedidosOpenPf('${escapeAttrPedido(pf?.id || '')}')">${pf ? 'Abrir cadastro PF' : 'Abrir lista PF'}</button></article><article><span>Pessoa Jurídica</span><strong>${escapeHtmlPedido(item.pjRazaoSocial || 'Sem PJ vinculada')}</strong><small>${item.pjCnpj ? escapeHtmlPedido(maskCnpjPedido(item.pjCnpj)) : 'Etapa opcional'}</small>${item.pjRazaoSocial ? `<button class="secondary-btn" type="button" onclick="crm2PedidosOpenPj('${escapeAttrPedido(pj?.id || '')}')">${pj ? 'Abrir cadastro PJ' : 'Abrir lista PJ'}</button>` : '<button class="secondary-btn" type="button" onclick="crm2PedidosOpenPj(\'\')">Incluir ou vincular PJ</button>'}</article><article><span>Fluxo sequencial</span><strong>PF → PJ → Pedido</strong><small>Retome o cadastro mockado por etapas.</small><button class="secondary-btn" type="button" onclick="crm2PedidosOpenFlow()">Abrir fluxo sequencial</button></article></div></section>`;
}

function renderPedidoDetail(item) {
  const tabs = [['dados', 'Dados do pedido'], ['pendencias', 'Pendências'], ['historico', 'Histórico']];
  const history = [...pedidoHistory(item)].sort((a, b) => new Date(b.data) - new Date(a.data));
  const pendingCount = Number(item.pendencias) || 0;
  const content = crm2PedidosState.detailTab === 'pendencias'
    ? `<div class="crm2-pedido-related-list">${pendingCount ? Array.from({ length: pendingCount }, (_, index) => `<article><strong>Pendência ${index + 1}</strong><span>Validação operacional mockada aguardando tratamento.</span><small>Responsável: ${escapeHtmlPedido(item.responsavel)}</small></article>`).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma pendência.</strong><span>Este pedido não possui pendências mockadas abertas.</span></div>'}</div>`
    : crm2PedidosState.detailTab === 'historico'
      ? `<div class="crm2-pedido-timeline">${history.map(renderPedidoHistoryEvent).join('')}</div>`
      : `<div class="crm2-pedido-detail-grid"><div><span>Número</span><strong>${escapeHtmlPedido(item.numero)}</strong></div><div><span>Status</span><strong>${renderStatusPedido(item.status)}</strong></div><div><span>Pessoa física</span><strong>${escapeHtmlPedido(item.pfNome)}</strong><small>${escapeHtmlPedido(maskCpfPedido(item.pfCpf))}</small></div><div><span>Pessoa jurídica</span><strong>${escapeHtmlPedido(item.pjRazaoSocial || 'Sem PJ')}</strong><small>${item.pjCnpj ? escapeHtmlPedido(maskCnpjPedido(item.pjCnpj)) : 'Não informada'}</small></div><div><span>Produto</span><strong>${escapeHtmlPedido(item.produto)}</strong></div><div><span>Responsável</span><strong>${escapeHtmlPedido(item.responsavel)}</strong></div><div><span>Solicitação</span><strong>${escapeHtmlPedido(formatDatePedido(item.dataSolicitacao))}</strong></div><div><span>Vencimento</span><strong>${escapeHtmlPedido(formatDatePedido(item.vencimento))}</strong></div><div><span>Financeiro</span><strong>${renderStatusPedido(item.financeiro, true)}</strong><small>R$ ${escapeHtmlPedido(item.valor)}</small></div><div><span>Pendências</span><strong>${pendingCount}</strong></div><div class="is-wide"><span>Observações</span><strong>${escapeHtmlPedido(item.observacoes || 'Nenhuma observação registrada.')}</strong></div></div>`;
  const closed = isPedidoEncerrado(item);
  const actions = crm2PedidosState.canEdit && !closed ? `<button class="save-btn" type="button" onclick="crm2PedidosOpenEdit('${escapeAttrPedido(item.id)}')">Editar</button><button class="secondary-btn crm2-pedido-cancel-action" type="button" onclick="crm2PedidosCancel('${escapeAttrPedido(item.id)}')">Cancelar pedido</button><button class="secondary-btn crm2-pedido-close-action" type="button" onclick="crm2PedidosClose('${escapeAttrPedido(item.id)}')">Encerrar pedido</button>` : '';
  return `<section class="admin-panel crm2-pessoas-page crm2-pedidos-page crm2-pedido-detail-page" data-crm2-pedidos="true" aria-labelledby="crm2-pedido-detail-title"><div class="admin-panel-header"><div><span class="ar-crm-phase1-kicker">ROTA 204 · CRM 2.0</span><h3 id="crm2-pedido-detail-title">${escapeHtmlPedido(item.numero)}</h3><p class="crm2-pedidos-subtitle">${escapeHtmlPedido(item.pfNome)} · atualizado em ${escapeHtmlPedido(formatDateTimePedido(item.atualizadoEm))}</p></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="crm2PedidosBackToList()">Voltar à lista</button>${actions}</div></div>${crm2PedidosState.message ? `<p class="admin-message" role="status">${escapeHtmlPedido(crm2PedidosState.message)}</p>` : ''}${closed ? '<p class="crm2-pedido-closed-notice" role="status">Este pedido está encerrado e não pode mais ser editado. O histórico permanece disponível para consulta.</p>' : ''}<div class="crm2-pedidos-detail-summary"><article><span>Status</span><strong>${renderStatusPedido(item.status)}</strong></article><article><span>Financeiro</span><strong>${renderStatusPedido(item.financeiro, true)}</strong></article><article><span>Pendências</span><strong>${pendingCount}</strong></article><article><span>Origem</span><strong>${escapeHtmlPedido(item.origem)}</strong></article></div><div class="module-tabs crm2-pedido-tabs" role="tablist" aria-label="Detalhes do pedido">${tabs.map(([id, label]) => `<button class="${crm2PedidosState.detailTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${crm2PedidosState.detailTab === id}" onclick="crm2PedidosSelectTab('${id}')">${label}</button>`).join('')}</div><div class="crm2-pedido-tab-content">${content}${crm2PedidosState.detailTab === 'dados' ? renderPedidoRelatedLinks(item) : ''}</div></section>`;
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
    if (crm2PedidosState.formMode !== 'create') {
      crm2PedidosState.formMode = 'create';
      crm2PedidosState.draft = pedidoDefaults();
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
    return renderPedidoForm();
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
  ['pfNome', 'pfCpf', 'produto', 'responsavel', 'status', 'origem', 'dataSolicitacao', 'vencimento', 'financeiro', 'valor'].forEach((field) => {
    if (!String(draft[field] || '').trim()) errors[field] = 'Preenchimento obrigatório.';
  });
  if (draft.pfCpf && digitsPedido(draft.pfCpf).length !== 11) errors.pfCpf = 'Informe um CPF com 11 dígitos.';
  if (draft.pjCnpj && digitsPedido(draft.pjCnpj).length !== 14) errors.pjCnpj = 'Informe um CNPJ com 14 dígitos.';
  if (draft.dataSolicitacao && draft.vencimento && draft.vencimento < draft.dataSolicitacao) errors.vencimento = 'O vencimento não pode ser anterior à solicitação.';
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
  crm2PedidosRender: renderPedidos,
  crm2PedidosGetMockItems() {
    return crm2PedidosState.items.map((item) => ({
      ...item,
      historico: Array.isArray(item.historico) ? item.historico.map((event) => ({ ...event })) : []
    }));
  },
  crm2PedidosCreateMockFromConversion(payload = {}) {
    permissionsPedidos();
    if (!crm2PedidosState.canCreate || !payload.pfNome || !payload.pfCpf || !payload.produto) return null;
    const now = new Date().toISOString();
    const id = `pedido-conv-${Date.now()}-${crm2PedidosState.items.length}`;
    const item = {
      id,
      numero: `PED-CONV-${String(crm2PedidosState.items.length + 1).padStart(3, '0')}`,
      pfNome: payload.pfNome, pfCpf: String(payload.pfCpf).replace(/\D/g, ''),
      pjRazaoSocial: payload.pjRazaoSocial || '', pjCnpj: String(payload.pjCnpj || '').replace(/\D/g, ''),
      produto: payload.produto, responsavel: payload.responsavel || 'Usuário mockado', status: 'Em cadastro',
      origem: 'Conversão de oportunidade', dataSolicitacao: now.slice(0, 10), vencimento: payload.vencimento || now.slice(0, 10),
      financeiro: 'Pendente', valor: payload.valor || '0,00', pendencias: 0, atualizadoEm: now,
      oportunidadeId: payload.oportunidadeId || '', oportunidadeNumero: payload.oportunidadeNumero || '',
      historico: [{ data: now, usuario: payload.responsavel || 'Usuário mockado', tipo: 'Conversão', descricao: 'Pedido gerado pela conversão da oportunidade.', alteracoes: `Origem: Conversão de oportunidade · Item: ${payload.produto}` }]
    };
    crm2PedidosState.items.unshift(item);
    crm2PedidosState.message = 'Pedido gerado pela conversão no conjunto mockado.';
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
    navigatePedidos(`${id}/editar`);
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
    crm2PedidosState.message = '';
    resetPedidoForm();
    navigatePedidos();
  },
  crm2PedidosSelectTab(tab) {
    if (!['dados', 'pendencias', 'historico'].includes(tab)) return;
    crm2PedidosState.detailTab = tab;
    rerenderPedidos();
  },
  crm2PedidosSaveForm(event) {
    event?.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const draft = { ...crm2PedidosState.draft, ...values, pfCpf: digitsPedido(values.pfCpf), pjCnpj: digitsPedido(values.pjCnpj), pendencias: String(values.pendencias || '0') };
    const errors = validatePedidoDraft(draft);
    crm2PedidosState.draft = draft;
    crm2PedidosState.errors = errors;
    if (Object.keys(errors).length) {
      rerenderPedidos();
      return;
    }
    if (crm2PedidosState.formMode === 'create') {
      const id = `pedido-${String(crm2PedidosState.items.length + 1).padStart(3, '0')}`;
      const item = { ...draft, id, numero: `PED-${2401 + crm2PedidosState.items.length}`, atualizadoEm: new Date().toISOString(), historico: createPedidoHistory('Pedido criado no CRM 2.0 mockado.', draft.responsavel) };
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
    crm2PedidosState.page = 1;
    rerenderPedidos();
  },
  crm2PedidosClearFilters() {
    crm2PedidosState.search = '';
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
