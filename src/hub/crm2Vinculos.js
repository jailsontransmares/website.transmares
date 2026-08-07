import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';
import { portalHubFormFooter } from './formFooterPortal.js';

const CRM2_VINCULOS_INITIAL_ITEMS = [
  {
    id: 'vinculo-001',
    pfNome: 'Mariana Alves de Souza',
    pfCpf: '12345678909',
    pjRazaoSocial: 'Transmares Tecnologia Ltda.',
    pjCnpj: '04252011000110',
    tipo: 'Representante legal',
    status: 'Ativo',
    inicioEm: '2026-06-12',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: 'Representação legal cadastrada no contrato social.',
    atualizadoPor: 'Ana Martins',
    atualizadoEm: '2026-08-01T14:10:00'
  },
  {
    id: 'vinculo-002',
    pfNome: 'Rafael Nogueira Lima',
    pfCpf: '98765432100',
    pjRazaoSocial: 'Transmares Tecnologia Ltda.',
    pjCnpj: '04252011000110',
    tipo: 'Contador',
    status: 'Ativo',
    inicioEm: '2026-06-18',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: 'Responsável contábil da empresa.',
    atualizadoPor: 'Ana Martins',
    atualizadoEm: '2026-07-24T09:30:00'
  },
  {
    id: 'vinculo-003',
    pfNome: 'Camila Ferreira Rocha',
    pfCpf: '45678912364',
    pjRazaoSocial: 'Alves Consultoria Ltda.',
    pjCnpj: '12345678000195',
    tipo: 'Titular',
    status: 'Ativo',
    inicioEm: '2026-04-20',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: '',
    atualizadoPor: 'Carlos Oliveira',
    atualizadoEm: '2026-07-28T10:05:00'
  },
  {
    id: 'vinculo-004',
    pfNome: 'João Pedro Ribeiro',
    pfCpf: '74185296300',
    pjRazaoSocial: 'Norte Serviços Empresariais S.A.',
    pjCnpj: '27865757000102',
    tipo: 'Outros',
    status: 'Inativo',
    inicioEm: '2025-02-03',
    encerramentoEm: '2026-05-15',
    motivoInativacao: 'Encerramento da prestação de serviços.',
    observacoes: 'Registro preservado para consulta histórica.',
    atualizadoPor: 'Carlos Oliveira',
    atualizadoEm: '2026-05-15T16:40:00'
  },
  {
    id: 'vinculo-005',
    pfNome: 'Beatriz Costa Menezes',
    pfCpf: '36925814700',
    pjRazaoSocial: 'Norte Serviços Empresariais S.A.',
    pjCnpj: '27865757000102',
    tipo: 'Representante legal',
    status: 'Ativo',
    inicioEm: '2026-05-16',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: '',
    atualizadoPor: 'Ana Martins',
    atualizadoEm: '2026-06-02T11:20:00'
  },
  {
    id: 'vinculo-006',
    pfNome: 'Lucas Henrique Barros',
    pfCpf: '85274196300',
    pjRazaoSocial: 'Maré Alta Comércio Ltda.',
    pjCnpj: '36711234000180',
    tipo: 'Contador',
    status: 'Ativo',
    inicioEm: '2026-03-10',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: 'Vínculo criado durante a revisão cadastral.',
    atualizadoPor: 'Fernanda Lima',
    atualizadoEm: '2026-05-21T08:45:00'
  },
  {
    id: 'vinculo-007',
    pfNome: 'Renata Cristina Alves',
    pfCpf: '15935748600',
    pjRazaoSocial: 'Maré Alta Comércio Ltda.',
    pjCnpj: '36711234000180',
    tipo: 'Titular',
    status: 'Ativo',
    inicioEm: '2026-03-10',
    encerramentoEm: '',
    motivoInativacao: '',
    observacoes: '',
    atualizadoPor: 'Fernanda Lima',
    atualizadoEm: '2026-05-21T08:42:00'
  },
  {
    id: 'vinculo-008',
    pfNome: 'Diego Martins da Silva',
    pfCpf: '25814736900',
    pjRazaoSocial: 'Litoral Logística e Transportes Ltda.',
    pjCnpj: '50123456000173',
    tipo: 'Outros',
    status: 'Inativo',
    inicioEm: '2024-09-12',
    encerramentoEm: '2025-12-01',
    motivoInativacao: 'Solicitação do responsável.',
    observacoes: '',
    atualizadoPor: 'Fernanda Lima',
    atualizadoEm: '2025-12-01T13:15:00'
  },
  {
    id: 'vinculo-009',
    pfNome: 'João Pedro Ribeiro',
    pfCpf: '74185296300',
    pjRazaoSocial: 'Alves Consultoria Ltda.',
    pjCnpj: '12345678000195',
    tipo: 'Outros',
    status: 'Inativo',
    inicioEm: '2025-01-12',
    encerramentoEm: '2026-02-10',
    motivoInativacao: 'Alteração da estrutura societária.',
    observacoes: 'Registro histórico preservado para consulta.',
    atualizadoPor: 'Carlos Oliveira',
    atualizadoEm: '2026-02-10T14:20:00'
  }
];

const crm2VinculosState = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_VINCULOS_INITIAL_ITEMS),
  search: '',
  typeFilter: '',
  statusFilter: '',
  page: 1,
  perPage: 15,
  searchExpanded: false,
  listState: 'normal',
  message: '',
  formMode: '',
  detailId: '',
  draft: {},
  errors: {}
};

let crm2VinculosSearchTimer = null;

const CRM2_VINCULOS_PF_OPTIONS = [
  { id: 'pf-001', nome: 'Mariana Alves de Souza', cpf: '12345678909' },
  { id: 'pf-002', nome: 'Rafael Nogueira Lima', cpf: '98765432100' },
  { id: 'pf-003', nome: 'Camila Ferreira Rocha', cpf: '45678912364' },
  { id: 'pf-004', nome: 'João Pedro Ribeiro', cpf: '74185296300' },
  { id: 'pf-005', nome: 'Beatriz Costa Menezes', cpf: '36925814700' },
  { id: 'pf-006', nome: 'Lucas Henrique Barros', cpf: '85274196300' },
  { id: 'pf-007', nome: 'Renata Cristina Alves', cpf: '15935748600' },
  { id: 'pf-008', nome: 'Diego Martins da Silva', cpf: '25814736900' }
];

const CRM2_VINCULOS_PJ_OPTIONS = [
  { id: 'pj-001', razaoSocial: 'Transmares Tecnologia Ltda.', cnpj: '04252011000110' },
  { id: 'pj-002', razaoSocial: 'Alves Consultoria Ltda.', cnpj: '12345678000195' },
  { id: 'pj-003', razaoSocial: 'Norte Serviços Empresariais S.A.', cnpj: '27865757000102' },
  { id: 'pj-004', razaoSocial: 'Maré Alta Comércio Ltda.', cnpj: '36711234000180' },
  { id: 'pj-005', razaoSocial: 'Litoral Logística e Transportes Ltda.', cnpj: '50123456000173' }
];

const CRM2_VINCULOS_TYPES = ['Titular', 'Representante legal', 'Contador', 'Outros'];

function escapeHtmlVinculo(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttrVinculo(value = '') {
  return escapeHtmlVinculo(value).replaceAll('`', '&#096;');
}

function normalizeSearchVinculo(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsOnlyVinculo(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

function maskCpfVinculo(value = '') {
  const digits = digitsOnlyVinculo(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskCnpjVinculo(value = '') {
  const digits = digitsOnlyVinculo(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function formatDateVinculo(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTimeVinculo(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function currentVinculosRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const index = segments.findIndex((segment, position) => segment === 'painel-ar' && segments[position + 1] === '203');
  if (index < 0) return { view: 'list', id: '' };
  const tail = segments.slice(index + 2);
  if (tail[0] === 'novo') return { view: 'new', id: '' };
  if (tail[1] === 'editar') return { view: 'edit', id: tail[0] || '' };
  if (tail[0]) return { view: 'detail', id: tail[0] };
  return { view: 'list', id: '' };
}

function vinculosRoutePath(suffix = '') {
  const hasHub = window.location.pathname.split('/').filter(Boolean)[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/203${suffix ? `/${suffix}` : ''}`;
}

function navigateVinculos(suffix = '') {
  window.history.pushState({}, '', vinculosRoutePath(suffix));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(() => window.crm2VinculosMount?.(), 0);
}

function permissionsVinculos() {
  const context = obterContextoAcessoHub();
  const permissions = context?.permissions || {};
  const resolve = (action) => hasPermission(permissions, 'painel_ar', action);
  crm2VinculosState.canView = resolve('view');
  crm2VinculosState.canCreate = resolve('create') || resolve('update');
  crm2VinculosState.canEdit = resolve('update');
  crm2VinculosState.canDelete = resolve('delete');
}

function filteredVinculos() {
  const normalizedSearch = normalizeSearchVinculo(crm2VinculosState.search);
  const compactSearch = digitsOnlyVinculo(crm2VinculosState.search);

  return crm2VinculosState.items.filter((item) => {
    const textValues = [item.pfNome, item.pjRazaoSocial, item.tipo, item.status]
      .map(normalizeSearchVinculo);
    const documentValues = [item.pfCpf, maskCpfVinculo(item.pfCpf), item.pjCnpj, maskCnpjVinculo(item.pjCnpj)]
      .map(digitsOnlyVinculo);
    const matchesText = !normalizedSearch || textValues.some((value) => value.includes(normalizedSearch));
    const matchesDocument = !compactSearch || documentValues.some((value) => value.includes(compactSearch));
    const matchesType = !crm2VinculosState.typeFilter || item.tipo === crm2VinculosState.typeFilter;
    const matchesStatus = !crm2VinculosState.statusFilter || item.status === crm2VinculosState.statusFilter;
    return (matchesText || matchesDocument) && matchesType && matchesStatus;
  });
}

function renderStateVinculos() {
  const copy = {
    loading: ['Carregando vínculos...', 'Estado de carregamento simulado para homologação.'],
    error: ['Não foi possível carregar os vínculos.', 'Erro simulado. Nenhuma integração foi acionada.'],
    empty: ['Nenhum vínculo cadastrado.', 'A lista mockada ainda não possui vínculos.']
  }[crm2VinculosState.listState];
  if (!copy) return '';
  return `<div class="crm2-pessoas-state crm2-vinculos-state ${crm2VinculosState.listState === 'error' ? 'is-error' : ''}" role="${crm2VinculosState.listState === 'error' ? 'alert' : 'status'}" ${crm2VinculosState.listState === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2VinculosSetListState('normal')">Voltar à lista</button></div>`;
}

function renderPaginationVinculos(totalPages, totalItems) {
  crm2VinculosState.page = Math.min(Math.max(1, crm2VinculosState.page), totalPages);
  return `<div class="crm2-pessoas-pagination crm2-vinculos-pagination" aria-label="Paginação de vínculos"><span>Página <strong>${crm2VinculosState.page}</strong> de <strong>${totalPages}</strong> · ${totalItems} registro(s)</span><div><button class="secondary-btn" type="button" onclick="crm2VinculosSetPage(${crm2VinculosState.page - 1})" ${crm2VinculosState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2VinculosSetPage(${crm2VinculosState.page + 1})" ${crm2VinculosState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`;
}

function renderVinculosFooter(actions) {
  return `<div class="hub-form-screen-actions" data-hub-form-footer>${actions}</div>`;
}

function renderVinculosList() {
  const filtered = filteredVinculos();
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2VinculosState.perPage));
  crm2VinculosState.page = Math.min(Math.max(1, crm2VinculosState.page), totalPages);
  const start = (crm2VinculosState.page - 1) * crm2VinculosState.perPage;
  const pageItems = filtered.slice(start, start + crm2VinculosState.perPage);
  const hasFilters = Boolean(crm2VinculosState.search || crm2VinculosState.typeFilter || crm2VinculosState.statusFilter);
  const hasActions = crm2VinculosState.canEdit || crm2VinculosState.canDelete;

  return `<section class="admin-panel crm2-pessoas-page crm2-vinculos-page" data-crm2-vinculos="true" aria-labelledby="crm2-vinculos-title">
    <div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 203 · CRM 2.0</span><h3 id="crm2-vinculos-title">Vínculos PF/PJ</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></div>
    ${crm2VinculosState.message ? `<p class="admin-message" role="status">${escapeHtmlVinculo(crm2VinculosState.message)}</p>` : ''}
    <form class="crm2-pf-filter-bar" role="search" onsubmit="crm2VinculosApplyFilters(event)">
      <div class="crm2-pf-filter-actions">
        ${crm2VinculosState.canCreate ? '<button class="save-btn crm2-pf-include-btn" type="button" onclick="crm2VinculosOpenCreate()">+Incluir</button>' : ''}
        <div class="crm2-pf-select"><button id="crm2-vinculos-filter" class="icon-btn ${crm2VinculosState.statusFilter ? 'is-active' : ''}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="crm2-vinculos-filter-menu" title="Filtrar por status" aria-label="Filtrar por status" onclick="crm2VinculosToggleDropdown(this, event)"><i data-lucide="filter" aria-hidden="true"></i></button><div id="crm2-vinculos-filter-menu" class="hub-filter-dropdown-menu" role="listbox" aria-label="Filtrar por status" data-dropdown-input-id="crm2-vinculos-filter" data-dropdown-width="180" hidden>${[['', 'Todos'], ['Ativo', 'Ativo'], ['Inativo', 'Inativo']].map(([value, label]) => `<button class="hub-filter-dropdown-option ${crm2VinculosState.statusFilter === value ? 'is-selected' : ''}" type="button" role="option" aria-selected="${crm2VinculosState.statusFilter === value ? 'true' : 'false'}" data-field="status" data-value="${escapeAttrVinculo(value)}" onclick="crm2VinculosSelectFilter(this)">${escapeHtmlVinculo(label)}</button>`).join('')}</div></div>
        <div class="crm2-pf-search-control ${crm2VinculosState.searchExpanded ? 'is-expanded' : ''}"><input class="config-input" type="search" aria-label="Buscar vínculo" placeholder="Busca por PF, PJ, CPF ou CNPJ" value="${escapeAttrVinculo(crm2VinculosState.search)}" ${crm2VinculosState.searchExpanded ? '' : 'hidden'} oninput="crm2VinculosSetSearch(this.value, this)" onfocusout="crm2VinculosHandleSearchBlur(event)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.form?.requestSubmit(); }"><button class="icon-btn" type="button" title="Buscar" aria-label="Buscar" aria-expanded="${crm2VinculosState.searchExpanded ? 'true' : 'false'}" onclick="crm2VinculosToggleSearch(this)"><i data-lucide="search" aria-hidden="true"></i></button></div>
        ${hasFilters ? '<button class="icon-btn crm2-pf-clear-filter" type="button" onclick="crm2VinculosClearFilters()" title="Limpar filtros" aria-label="Limpar filtros">×</button>' : ''}
      </div>
    </form>
    ${crm2VinculosState.listState !== 'normal' ? renderStateVinculos() : pageItems.length ? `<div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap crm2-vinculos-table-wrap"><table class="ar-crm-phase1-table crm2-pessoas-table crm2-vinculos-table" aria-describedby="crm2-vinculos-caption"><caption id="crm2-vinculos-caption" class="crm2-pessoas-table-caption">Vínculos entre pessoas físicas e jurídicas no CRM 2.0</caption><thead><tr><th scope="col">Pessoa física</th><th scope="col">Pessoa jurídica</th><th scope="col">Tipo</th><th scope="col">Situação</th><th scope="col">Início</th><th scope="col">Última atualização</th>${hasActions ? '<th scope="col">Ações</th>' : ''}</tr></thead><tbody>${pageItems.map((item) => `<tr><td><button class="crm2-vinculo-link" type="button" onclick="crm2VinculosOpenDetail('${escapeAttrVinculo(item.id)}')">${escapeHtmlVinculo(item.pfNome)}</button><small>${escapeHtmlVinculo(maskCpfVinculo(item.pfCpf))}</small></td><td><button class="crm2-vinculo-link" type="button" onclick="crm2VinculosOpenDetail('${escapeAttrVinculo(item.id)}')">${escapeHtmlVinculo(item.pjRazaoSocial)}</button><small>${escapeHtmlVinculo(maskCnpjVinculo(item.pjCnpj))}</small></td><td><span class="crm2-vinculo-type">${escapeHtmlVinculo(item.tipo)}</span></td><td><span class="crm2-pessoas-status is-${escapeAttrVinculo(normalizeSearchVinculo(item.status))}" role="status">${escapeHtmlVinculo(item.status)}</span></td><td>${escapeHtmlVinculo(formatDateVinculo(item.inicioEm))}</td><td>${escapeHtmlVinculo(formatDateTimeVinculo(item.atualizadoEm))}</td>${hasActions ? `<td class="crm2-vinculos-actions">${crm2VinculosState.canEdit ? `<button class="icon-btn" type="button" onclick="crm2VinculosOpenEdit('${escapeAttrVinculo(item.id)}')" aria-label="Editar vínculo de ${escapeAttrVinculo(item.pfNome)}" title="Editar vínculo">✎</button>` : ''}${crm2VinculosState.canDelete && item.status === 'Ativo' ? `<button class="icon-btn" type="button" onclick="crm2VinculosInactivate('${escapeAttrVinculo(item.id)}')" aria-label="Inativar vínculo de ${escapeAttrVinculo(item.pfNome)}" title="Inativar vínculo">×</button>` : ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>${renderPaginationVinculos(totalPages, filtered.length)}` : `<div class="crm2-pessoas-state crm2-vinculos-state" role="status"><strong>${crm2VinculosState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhum vínculo cadastrado.'}</strong><span>${crm2VinculosState.items.length ? 'Ajuste os filtros ou limpe a busca.' : 'A lista mockada ainda não possui vínculos.'}</span><button class="secondary-btn" type="button" onclick="crm2VinculosClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button></div>`}
    ${renderVinculosFooter(`<button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar</button>${crm2VinculosState.canCreate ? '<button class="save-btn" type="button" onclick="crm2VinculosOpenCreate()">Incluir</button>' : ''}`)}
  </section>`;
}

function renderVinculoFormField({ label, name, value = '', type = 'text', required = false, wide = false }) {
  const error = crm2VinculosState.errors[name] || '';
  const id = `crm2-vinculo-${name}`;
  return `<label class="${wide ? 'is-wide ' : ''}${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span>${type === 'textarea' ? `<textarea id="${id}" class="config-input" name="${name}" rows="4" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2VinculosTrackChange(this)">${escapeHtmlVinculo(value)}</textarea>` : `<input id="${id}" class="config-input" type="${type}" name="${name}" value="${escapeAttrVinculo(value)}" ${required ? 'required' : ''} aria-invalid="${error ? 'true' : 'false'}" oninput="crm2VinculosTrackChange(this)">`}${error ? `<small class="crm2-field-error">${escapeHtmlVinculo(error)}</small>` : ''}</label>`;
}

function renderVinculoSelect({ label, name, value = '', options, disabled = false, required = false }) {
  const error = crm2VinculosState.errors[name] || '';
  const id = `crm2-vinculo-${name}`;
  return `<label class="${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span><select id="${id}" class="config-input" name="${name}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} aria-invalid="${error ? 'true' : 'false'}" onchange="crm2VinculosTrackChange(this)">${options.map((option) => `<option value="${escapeAttrVinculo(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtmlVinculo(option.label)}</option>`).join('')}</select>${error ? `<small class="crm2-field-error">${escapeHtmlVinculo(error)}</small>` : ''}</label>`;
}

function renderVinculoLookup({ label, name, value = '', options, readonly = false, required = false }) {
  const error = crm2VinculosState.errors[name] || '';
  const id = `crm2-vinculo-${name}`;
  const listId = `${id}-options`;
  return `<label class="${error ? 'has-error' : ''}" for="${id}"><span>${label}${required ? ' *' : ''}</span><input id="${id}" class="config-input" type="search" name="${name}" list="${listId}" value="${escapeAttrVinculo(value)}" ${required ? 'required' : ''} ${readonly ? 'readonly' : ''} autocomplete="off" aria-invalid="${error ? 'true' : 'false'}" oninput="crm2VinculosTrackChange(this)"><datalist id="${listId}">${options.map((option) => `<option value="${escapeAttrVinculo(option.value)}" label="${escapeAttrVinculo(option.label)}"></option>`).join('')}</datalist>${error ? `<small class="crm2-field-error">${escapeHtmlVinculo(error)}</small>` : ''}</label>`;
}

function renderVinculoForm(item = null) {
  const editing = Boolean(item);
  const values = { ...(item || {}), ...crm2VinculosState.draft };
  const pfOptions = CRM2_VINCULOS_PF_OPTIONS.map((person) => ({ value: person.nome, label: `${person.nome} · ${maskCpfVinculo(person.cpf)}` }));
  const pjOptions = CRM2_VINCULOS_PJ_OPTIONS.map((company) => ({ value: company.razaoSocial, label: `${company.razaoSocial} · ${maskCnpjVinculo(company.cnpj)}` }));
  const typeOptions = CRM2_VINCULOS_TYPES.map((type) => ({ value: type, label: type }));
  const title = editing ? 'Editar vínculo PF/PJ' : 'Novo vínculo PF/PJ';
  const actionLabel = editing ? 'Salvar alterações' : 'Salvar vínculo';
  const status = values.status || 'Ativo';

  return `<section class="hub-form-screen crm2-pessoas-page crm2-vinculos-page" data-crm2-vinculos="true" aria-labelledby="crm2-vinculo-form-title">
    <header class="hub-form-screen-header"><div><span class="ar-crm-phase1-kicker">ROTA 203 · CRM 2.0</span><h2 id="crm2-vinculo-form-title">${title}</h2></div><span class="crm2-pf-status-pill ${status === 'Inativo' ? 'is-inativo' : 'is-ativo'}" role="status">${status}</span></header>
    ${crm2VinculosState.message ? `<p class="admin-message" role="status">${escapeHtmlVinculo(crm2VinculosState.message)}</p>` : ''}
    <form id="crm2-vinculo-form" class="hub-form-screen-content crm2-pf-form" onsubmit="crm2VinculosSave(event)" novalidate>
      <section class="hub-form-section"><div class="hub-form-section-title"><strong>Relacionamento</strong></div><div class="hub-form-grid">
        ${renderVinculoLookup({ label: 'Pessoa física', name: 'pfNome', value: values.pfNome, options: pfOptions, readonly: editing, required: true })}
        ${renderVinculoLookup({ label: 'Pessoa jurídica', name: 'pjRazaoSocial', value: values.pjRazaoSocial, options: pjOptions, readonly: editing, required: true })}
        ${renderVinculoSelect({ label: 'Tipo de vínculo', name: 'tipo', value: values.tipo, options: typeOptions, required: true })}
        ${renderVinculoFormField({ label: 'Data de início', name: 'inicioEm', value: values.inicioEm, type: 'date', required: true })}
        ${renderVinculoFormField({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}
      </div></section>
      <section class="hub-form-section crm2-vinculo-history-section"><div class="hub-form-section-title"><strong>Histórico do vínculo</strong></div><div class="crm2-vinculo-history-grid"><span><small>Situação atual</small><strong>${escapeHtmlVinculo(status)}</strong></span><span><small>Início</small><strong>${escapeHtmlVinculo(formatDateVinculo(values.inicioEm))}</strong></span><span><small>Encerramento</small><strong>${escapeHtmlVinculo(formatDateVinculo(values.encerramentoEm))}</strong></span>${values.motivoInativacao ? `<span class="is-wide"><small>Motivo da inativação</small><strong>${escapeHtmlVinculo(values.motivoInativacao)}</strong></span>` : ''}</div></section>
      <div class="hub-form-screen-actions crm2-pf-form-footer" data-hub-form-footer><button class="secondary-btn" type="button" onclick="crm2VinculosCancelForm()">Voltar</button>${editing && crm2VinculosState.canDelete && status === 'Ativo' ? `<button class="secondary-btn crm2-vinculo-inactivate-button" type="button" onclick="crm2VinculosInactivate('${escapeAttrVinculo(item.id)}')">Inativar vínculo</button>` : ''}<button class="save-btn" type="submit">${actionLabel}</button></div>
    </form>
  </section>`;
}

function renderVinculoHistory(item) {
  const history = Array.isArray(item.historico) && item.historico.length
    ? item.historico
    : [
      { data: item.inicioEm, usuario: 'Sistema', tipo: 'Criação', descricao: 'Vínculo criado no CRM 2.0.' },
      ...(item.status === 'Inativo' ? [{ data: item.encerramentoEm, usuario: item.atualizadoPor || 'Sistema', tipo: 'Inativação', descricao: item.motivoInativacao || 'Vínculo inativado.' }] : [])
    ];
  return `<div class="crm2-vinculo-timeline">${history.slice().reverse().map((entry) => `<article class="crm2-vinculo-timeline-item"><div class="crm2-vinculo-timeline-marker" aria-hidden="true"></div><div><header><strong>${escapeHtmlVinculo(entry.tipo || 'Atualização')}</strong><span>${escapeHtmlVinculo(formatDateTimeVinculo(entry.data))}</span></header><p>${escapeHtmlVinculo(entry.descricao || 'Alteração registrada.')}</p><small>Por ${escapeHtmlVinculo(entry.usuario || 'Sistema')}</small></div></article>`).join('')}</div>`;
}

function renderVinculoDetail(item) {
  const pf = CRM2_VINCULOS_PF_OPTIONS.find((person) => person.nome === item.pfNome);
  const pj = CRM2_VINCULOS_PJ_OPTIONS.find((company) => company.razaoSocial === item.pjRazaoSocial);
  const editButton = crm2VinculosState.canEdit ? `<button class="save-btn" type="button" onclick="crm2VinculosOpenEdit('${escapeAttrVinculo(item.id)}')">Editar</button>` : '';
  const inactivateButton = crm2VinculosState.canDelete && item.status === 'Ativo' ? `<button class="secondary-btn crm2-vinculo-inactivate-button" type="button" onclick="crm2VinculosInactivate('${escapeAttrVinculo(item.id)}')">Inativar vínculo</button>` : '';
  return `<section class="admin-panel crm2-pessoas-page crm2-vinculos-page" data-crm2-vinculos="true" aria-labelledby="crm2-vinculo-detail-title">
    <div class="admin-panel-header crm2-pessoas-list-header"><div><span class="ar-crm-phase1-kicker">ROTA 203 · CRM 2.0</span><h3 id="crm2-vinculo-detail-title">Detalhe do vínculo</h3></div><div class="crm2-pessoas-header-actions"><button class="secondary-btn" type="button" onclick="crm2VinculosCloseDetail()">Voltar</button>${editButton}</div></div>
    ${crm2VinculosState.message ? `<p class="admin-message" role="status">${escapeHtmlVinculo(crm2VinculosState.message)}</p>` : ''}
    <div class="crm2-vinculo-detail-header"><div><h2>${escapeHtmlVinculo(item.pfNome)} ↔ ${escapeHtmlVinculo(item.pjRazaoSocial)}</h2><span class="crm2-pessoas-status is-${escapeAttrVinculo(normalizeSearchVinculo(item.status))}" role="status">${escapeHtmlVinculo(item.status)}</span></div><div class="crm2-vinculo-detail-actions">${inactivateButton}</div></div>
    <div class="crm2-vinculo-detail-grid">
      <section class="hub-form-section"><div class="hub-form-section-title"><strong>Pessoa física</strong></div><div class="crm2-vinculo-detail-card"><strong>${escapeHtmlVinculo(item.pfNome)}</strong><span>CPF: ${escapeHtmlVinculo(maskCpfVinculo(item.pfCpf))}</span>${pf ? `<button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrVinculo(pf.id)}')">Abrir cadastro PF</button>` : ''}</div></section>
      <section class="hub-form-section"><div class="hub-form-section-title"><strong>Pessoa jurídica</strong></div><div class="crm2-vinculo-detail-card"><strong>${escapeHtmlVinculo(item.pjRazaoSocial)}</strong><span>CNPJ: ${escapeHtmlVinculo(maskCnpjVinculo(item.pjCnpj))}</span>${pj ? `<button class="secondary-btn" type="button" onclick="crm2PjOpenDetail('${escapeAttrVinculo(pj.id)}')">Abrir cadastro PJ</button>` : ''}</div></section>
      <section class="hub-form-section is-wide"><div class="hub-form-section-title"><strong>Dados do vínculo</strong></div><div class="crm2-vinculo-detail-fields"><span><small>Tipo</small><strong>${escapeHtmlVinculo(item.tipo)}</strong></span><span><small>Situação</small><strong>${escapeHtmlVinculo(item.status)}</strong></span><span><small>Data de início</small><strong>${escapeHtmlVinculo(formatDateVinculo(item.inicioEm))}</strong></span><span><small>Data de encerramento</small><strong>${escapeHtmlVinculo(formatDateVinculo(item.encerramentoEm))}</strong></span><span><small>Última atualização</small><strong>${escapeHtmlVinculo(formatDateTimeVinculo(item.atualizadoEm))}</strong></span><span><small>Atualizado por</small><strong>${escapeHtmlVinculo(item.atualizadoPor)}</strong></span>${item.motivoInativacao ? `<span class="is-wide"><small>Motivo da inativação</small><strong>${escapeHtmlVinculo(item.motivoInativacao)}</strong></span>` : ''}</div></section>
      <section class="hub-form-section is-wide"><div class="hub-form-section-title"><strong>Observações</strong></div><p class="crm2-vinculo-detail-notes">${escapeHtmlVinculo(item.observacoes || 'Nenhuma observação registrada.')}</p></section>
      <section class="hub-form-section is-wide"><div class="hub-form-section-title"><strong>Histórico do vínculo</strong></div>${renderVinculoHistory(item)}</section>
    </div>
    ${renderVinculosFooter(`<button class="secondary-btn" type="button" onclick="crm2VinculosCloseDetail()">Voltar</button>${editButton}${inactivateButton}`)}
  </section>`;
}

function renderVinculos() {
  permissionsVinculos();
  if (!crm2VinculosState.canView) return `<section class="admin-panel crm2-pessoas-page crm2-vinculos-page" data-crm2-vinculos="true"><div class="crm2-pessoas-state crm2-vinculos-state is-error" role="alert"><strong>Acesso não autorizado.</strong><span>É necessária a permissão Visualizar para acessar Vínculos PF/PJ.</span><button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button></div></section>`;
  const route = currentVinculosRoute();
  if (route.view === 'new') {
    if (!crm2VinculosState.canCreate) return renderVinculosList();
    crm2VinculosState.formMode = 'create';
    return renderVinculoForm();
  }
  if (route.view === 'edit') {
    const item = crm2VinculosState.items.find((entry) => entry.id === route.id);
    if (item && crm2VinculosState.canEdit) {
      crm2VinculosState.formMode = 'edit';
      crm2VinculosState.detailId = item.id;
      return renderVinculoForm(item);
    }
  }
  if (route.view === 'detail') {
    const item = crm2VinculosState.items.find((entry) => entry.id === route.id);
    return item ? renderVinculoDetail(item) : renderVinculosList();
  }
  return renderVinculosList();
}

function mountVinculos() {
  window.hubLimparDropdowns?.({ remover: true });
  const target = document.querySelector('[data-crm2-vinculos="true"]');
  if (target) {
    target.outerHTML = renderVinculos();
    portalHubFormFooter(document.querySelector('[data-crm2-vinculos="true"]'));
  }
}

function rerenderVinculos() {
  if (document.querySelector('[data-crm2-vinculos="true"]')) mountVinculos();
}

Object.assign(window, {
  crm2VinculosRender: renderVinculos,
  crm2VinculosMount: mountVinculos,
  crm2VinculosGetMockItems() {
    return crm2VinculosState.items.map((item) => ({ ...item }));
  },
  crm2VinculosCreateMockFromConversion(payload = {}) {
    permissionsVinculos();
    if (!crm2VinculosState.canCreate || !payload.pfNome || !payload.pjRazaoSocial || !CRM2_VINCULOS_TYPES.includes(payload.tipo)) return null;
    const duplicate = crm2VinculosState.items.find((item) => item.status === 'Ativo' && item.pfNome === payload.pfNome && item.pjRazaoSocial === payload.pjRazaoSocial && item.tipo === payload.tipo);
    if (duplicate) return { ...duplicate, reused: true };
    const now = new Date().toISOString();
    const item = {
      id: `vinculo-conv-${Date.now()}`, pfNome: payload.pfNome, pfCpf: String(payload.pfCpf || '').replace(/\D/g, ''),
      pjRazaoSocial: payload.pjRazaoSocial, pjCnpj: String(payload.pjCnpj || '').replace(/\D/g, ''), tipo: payload.tipo,
      status: 'Ativo', inicioEm: now.slice(0, 10), encerramentoEm: '', motivoInativacao: '', observacoes: payload.observacoes || 'Vínculo criado pela conversão de oportunidade.',
      atualizadoPor: payload.usuario || 'Usuário mockado', atualizadoEm: now,
      historico: [{ data: now, usuario: payload.usuario || 'Usuário mockado', tipo: 'Conversão', descricao: 'Vínculo criado pela conversão de oportunidade.' }]
    };
    crm2VinculosState.items.unshift(item);
    crm2VinculosState.message = 'Vínculo gerado pela conversão no conjunto mockado.';
    rerenderVinculos();
    return { ...item, historico: item.historico.map((event) => ({ ...event })) };
  },
  navegarParaCrm2VinculosRota() { navigateVinculos(); },
  crm2VinculosOpenCreate() {
    if (!crm2VinculosState.canCreate) return;
    crm2VinculosState.formMode = 'create';
    crm2VinculosState.detailId = '';
    crm2VinculosState.draft = { inicioEm: new Date().toISOString().slice(0, 10) };
    crm2VinculosState.errors = {};
    crm2VinculosState.message = '';
    navigateVinculos('novo');
  },
  crm2VinculosOpenEdit(id) {
    if (!crm2VinculosState.canEdit) return;
    const item = crm2VinculosState.items.find((entry) => entry.id === id);
    if (!item) return;
    crm2VinculosState.formMode = 'edit';
    crm2VinculosState.detailId = id;
    crm2VinculosState.draft = {};
    crm2VinculosState.errors = {};
    crm2VinculosState.message = '';
    navigateVinculos(`${id}/editar`);
  },
  crm2VinculosOpenDetail(id) {
    const item = crm2VinculosState.items.find((entry) => entry.id === id);
    if (!item) return;
    crm2VinculosState.detailId = id;
    crm2VinculosState.message = '';
    navigateVinculos(id);
  },
  crm2VinculosCloseDetail() {
    crm2VinculosState.detailId = '';
    crm2VinculosState.message = '';
    navigateVinculos();
  },
  crm2VinculosCancelForm() {
    crm2VinculosState.formMode = '';
    crm2VinculosState.detailId = '';
    crm2VinculosState.draft = {};
    crm2VinculosState.errors = {};
    crm2VinculosState.message = '';
    navigateVinculos();
  },
  crm2VinculosTrackChange(input) {
    if (!input?.name) return;
    crm2VinculosState.draft[input.name] = input.value;
    input.closest('label')?.classList.toggle('is-changed', Boolean(input.value));
  },
  crm2VinculosSave(event) {
    event?.preventDefault();
    const editing = crm2VinculosState.formMode === 'edit';
    if (editing ? !crm2VinculosState.canEdit : !crm2VinculosState.canCreate) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.pfNome = String(values.pfNome || '').trim();
    values.pjRazaoSocial = String(values.pjRazaoSocial || '').trim();
    values.tipo = String(values.tipo || '').trim();
    values.inicioEm = String(values.inicioEm || '').trim();
    values.observacoes = String(values.observacoes || '').trim();
    const pf = CRM2_VINCULOS_PF_OPTIONS.find((person) => person.nome === values.pfNome);
    const pj = CRM2_VINCULOS_PJ_OPTIONS.find((company) => company.razaoSocial === values.pjRazaoSocial);
    const errors = {};
    if (!pf) errors.pfNome = 'Selecione uma Pessoa Física existente.';
    if (!pj) errors.pjRazaoSocial = 'Selecione uma Pessoa Jurídica existente.';
    if (!CRM2_VINCULOS_TYPES.includes(values.tipo)) errors.tipo = 'Selecione o tipo do vínculo.';
    if (!values.inicioEm) errors.inicioEm = 'Informe a data de início.';
    const currentId = editing ? crm2VinculosState.detailId : '';
    const duplicate = crm2VinculosState.items.some((item) => item.id !== currentId
      && item.status === 'Ativo'
      && item.pfNome === values.pfNome
      && item.pjRazaoSocial === values.pjRazaoSocial
      && item.tipo === values.tipo);
    if (duplicate) errors.tipo = 'Já existe um vínculo ativo igual para esta PF e PJ.';
    const titularDuplicate = values.tipo === 'Titular' && crm2VinculosState.items.some((item) => item.id !== currentId
      && item.status === 'Ativo'
      && item.pjRazaoSocial === values.pjRazaoSocial
      && item.tipo === 'Titular');
    if (titularDuplicate) errors.tipo = 'A PJ já possui um titular ativo.';
    if (Object.keys(errors).length) {
      crm2VinculosState.errors = errors;
      crm2VinculosState.draft = { ...crm2VinculosState.draft, ...values };
      rerenderVinculos();
      return;
    }
    const now = new Date().toISOString();
    if (editing) {
      const item = crm2VinculosState.items.find((entry) => entry.id === currentId);
      if (!item) return;
      Object.assign(item, { tipo: values.tipo, inicioEm: values.inicioEm, observacoes: values.observacoes, atualizadoPor: 'Usuário mockado', atualizadoEm: now });
      item.historico = [...(item.historico || []), { data: now, usuario: 'Usuário mockado', tipo: 'Atualização', descricao: 'Dados do vínculo atualizados.' }];
      crm2VinculosState.message = 'Vínculo atualizado no estado mockado. Nenhum dado foi persistido.';
    } else {
      crm2VinculosState.items.unshift({
        id: `vinculo-mock-${Date.now()}`,
        pfNome: values.pfNome,
        pfCpf: pf.cpf,
        pjRazaoSocial: values.pjRazaoSocial,
        pjCnpj: pj.cnpj,
        tipo: values.tipo,
        status: 'Ativo',
        inicioEm: values.inicioEm,
        encerramentoEm: '',
        motivoInativacao: '',
        observacoes: values.observacoes,
        atualizadoPor: 'Usuário mockado',
        atualizadoEm: now,
        historico: [{ data: now, usuario: 'Usuário mockado', tipo: 'Criação', descricao: 'Vínculo criado no CRM 2.0.' }]
      });
      crm2VinculosState.message = 'Vínculo criado no estado mockado. Nenhum dado foi persistido.';
    }
    crm2VinculosState.formMode = '';
    crm2VinculosState.detailId = '';
    crm2VinculosState.draft = {};
    crm2VinculosState.errors = {};
    crm2VinculosState.page = 1;
    navigateVinculos();
  },
  crm2VinculosInactivate(id) {
    if (!crm2VinculosState.canDelete) return;
    const item = crm2VinculosState.items.find((entry) => entry.id === id);
    if (!item || item.status !== 'Ativo') return;
    const reason = window.prompt('Informe o motivo da inativação do vínculo:')?.trim();
    if (!reason) return;
    if (!window.confirm('Inativar este vínculo? O registro histórico será preservado.')) return;
    const now = new Date().toISOString();
    Object.assign(item, { status: 'Inativo', encerramentoEm: now.slice(0, 10), motivoInativacao: reason, atualizadoPor: 'Usuário mockado', atualizadoEm: now, historico: [...(item.historico || []), { data: now, usuario: 'Usuário mockado', tipo: 'Inativação', descricao: reason }] });
    crm2VinculosState.message = 'Vínculo inativado no estado mockado. O histórico foi preservado.';
    crm2VinculosState.formMode = '';
    crm2VinculosState.detailId = '';
    crm2VinculosState.draft = {};
    crm2VinculosState.errors = {};
    navigateVinculos();
  },
  crm2VinculosSetSearch(value, input) { window.hubAtualizarBuscaAoDigitar(input, (search) => { crm2VinculosState.search = search; crm2VinculosState.searchExpanded = true; crm2VinculosState.page = 1; }, rerenderVinculos, () => document.querySelector('.crm2-pf-search-control input[type="search"]')); },
  crm2VinculosToggleDropdown(trigger, event) { window.crm2PfToggleDropdown?.(trigger, event); },
  crm2VinculosSelectFilter(option) { const menu = option?.closest('.hub-filter-dropdown-menu'); if (!menu) return; menu.remove(); const field = option.dataset.field; if (field === 'type') crm2VinculosState.typeFilter = String(option.dataset.value || ''); if (field === 'status') crm2VinculosState.statusFilter = String(option.dataset.value || ''); crm2VinculosState.page = 1; rerenderVinculos(); },
  crm2VinculosToggleSearch(button) { const control = button?.closest('.crm2-pf-search-control'); const input = control?.querySelector('input[type="search"]'); if (!control || !input) return; const expanded = !control.classList.contains('is-expanded'); crm2VinculosState.searchExpanded = expanded; control.classList.toggle('is-expanded', expanded); input.hidden = !expanded; button.setAttribute('aria-expanded', String(expanded)); if (expanded) input.focus({ preventScroll: true }); },
  crm2VinculosHandleSearchBlur(event) { const input = event?.currentTarget; const control = input?.closest('.crm2-pf-search-control'); if (!control || control.contains(event.relatedTarget)) return; window.setTimeout(() => { if (control.contains(document.activeElement)) return; crm2VinculosState.searchExpanded = false; control.classList.remove('is-expanded'); input.hidden = true; control.querySelector('button')?.setAttribute('aria-expanded', 'false'); }, 0); },
  crm2VinculosSetTypeFilter(value) { crm2VinculosState.typeFilter = String(value || ''); crm2VinculosState.page = 1; rerenderVinculos(); },
  crm2VinculosSetStatusFilter(value) { crm2VinculosState.statusFilter = String(value || ''); crm2VinculosState.page = 1; rerenderVinculos(); },
  crm2VinculosClearFilters() { window.clearTimeout(crm2VinculosSearchTimer); crm2VinculosState.search = ''; crm2VinculosState.searchExpanded = false; crm2VinculosState.typeFilter = ''; crm2VinculosState.statusFilter = ''; crm2VinculosState.page = 1; crm2VinculosState.message = ''; rerenderVinculos(); },
  crm2VinculosApplyFilters(event) { event?.preventDefault(); crm2VinculosState.page = 1; rerenderVinculos(); },
  crm2VinculosSetPage(page) { crm2VinculosState.page = Math.max(1, Number(page) || 1); rerenderVinculos(); },
  crm2VinculosSetListState(value) { crm2VinculosState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal'; rerenderVinculos(); }
});

observarContextoAcessoHub(() => {
  permissionsVinculos();
  if (document.querySelector('[data-crm2-vinculos="true"]')) mountVinculos();
});

permissionsVinculos();
