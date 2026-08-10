// CRM 2.0 / Pessoas Físicas — bundle oficial carregado pelo app principal.

// --- Estado e renderização da Fase 2 ---
import { portalHubFormFooter, removeHubFormFooterPortals } from './formFooterPortal.js';
import { getHubAttachmentPreviewKind, hydrateHubPdfThumbnails, renderHubAttachmentManager } from './hubAttachmentManager.js';

const CRM2_PF_ROUTE_CODES = new Set(['200', '201']);

const CRM2_PF_INITIAL_ITEMS = [
  {
    id: 'pf-001',
    nome: 'Mariana Alves de Souza',
    cpf: '12345678909',
    cei: '123.456.789/0001',
    nascimento: '1987-04-18',
    telefone: '(85) 99876-1204',
    email: 'mariana.souza@example.com',
    origem: 'Indicação',
    parceiro: 'Rede Transmares',
    observacoes: 'Cliente com acompanhamento de renovação.',
    cadastroEm: '2026-07-18T10:30:00',
    atualizadoEm: '2026-08-04T09:20:00',
    anexos: [
      {
        nome: 'Documento de identificação.pdf',
        tipo: 'application/pdf',
        incluidoEm: '2026-07-18T10:34:00',
        validade: '2027-07-18'
      }
    ],
    empresas: [
      { razaoSocial: 'Alves Consultoria Ltda.', nome: 'Alves Consultoria Ltda.', cnpj: '12.345.678/0001-90', vinculo: 'Representante legal', status: 'ativo' }
    ],
    vinculos: [
      { id: 'vinculo-001', razaoSocial: 'Transmares Tecnologia Ltda.', cnpj: '04.252.011/0001-10', tipo: 'Representante legal', status: 'Ativo', inicioEm: '2026-06-12', encerramentoEm: '' },
      { id: 'vinculo-009', razaoSocial: 'Alves Consultoria Ltda.', cnpj: '12.345.678/0001-95', tipo: 'Outros', status: 'Inativo', inicioEm: '2025-01-12', encerramentoEm: '2026-02-10' }
    ],
    pedidos: [
      {
        numero: 'PED-2401',
        produto: 'e-CNPJ A3',
        empresa: 'Alves Consultoria Ltda.',
        status: 'Ativo',
        vencimento: '2027-07-18'
      }
    ],
    timeline: [
      { data: '2026-07-18T10:30:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' },
      { data: '2026-08-03T15:42:00', usuario: 'Equipe AR', descricao: 'Dados atualizados. Observações — De: Cliente em prospecção.; Para: Cliente com acompanhamento de renovação.', tipo: 'Atualização' }
    ]
  },
  {
    id: 'pf-002',
    nome: 'Rafael Nogueira Lima',
    cpf: '98765432100',
    cei: '',
    nascimento: '1979-11-02',
    telefone: '(81) 98812-4300',
    email: 'rafael.lima@example.com',
    origem: 'Site',
    parceiro: '',
    observacoes: 'Sem pedidos ativos no momento.',
    cadastroEm: '2026-05-11T09:15:00',
    atualizadoEm: '2026-07-29T11:08:00',
    anexos: [],
    empresas: [],
    vinculos: [
      { id: 'vinculo-002', razaoSocial: 'Transmares Tecnologia Ltda.', cnpj: '04.252.011/0001-10', tipo: 'Contador', status: 'Ativo', inicioEm: '2026-06-18', encerramentoEm: '' }
    ],
    pedidos: [],
    timeline: [
      { data: '2026-05-11T09:15:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' }
    ]
  },
  {
    id: 'pf-003',
    nome: 'Camila Ferreira Rocha',
    cpf: '45678912364',
    cei: '987.654.321/0001',
    nascimento: '1992-08-25',
    telefone: '(88) 99654-7821',
    email: 'camila.rocha@example.com',
    origem: 'Parceiro',
    parceiro: 'Contabilidade Rocha',
    observacoes: '',
    cadastroEm: '2026-06-20T14:20:00',
    atualizadoEm: '2026-08-01T16:25:00',
    anexos: [
      {
        nome: 'Comprovante de endereço.pdf',
        tipo: 'application/pdf',
        incluidoEm: '2026-06-20T14:27:00',
        validade: '2026-12-20'
      }
    ],
    empresas: [
      { razaoSocial: 'Rocha Serviços Digitais', nome: 'Rocha Serviços Digitais', cnpj: '98.765.432/0001-10', vinculo: 'Titular do pedido', status: 'ativo' }
    ],
    vinculos: [
      { id: 'vinculo-003', razaoSocial: 'Alves Consultoria Ltda.', cnpj: '12.345.678/0001-95', tipo: 'Titular', status: 'Ativo', inicioEm: '2026-04-20', encerramentoEm: '' }
    ],
    pedidos: [
      {
        numero: 'PED-2389',
        produto: 'e-CPF A3',
        empresa: 'Rocha Serviços Digitais',
        status: 'Em validação',
        vencimento: '2026-12-20'
      }
    ],
    timeline: [
      { data: '2026-06-20T14:20:00', usuario: 'Sistema', descricao: 'Cadastro criado.', tipo: 'Cadastro' }
    ]
  },
  {
    id: 'pf-004',
    nome: 'Fernanda Martins de Castro',
    cpf: '74125896300',
    cei: '',
    nascimento: '',
    telefone: '(85) 99912-2200',
    email: 'fernanda.castro@example.com',
    origem: 'Site',
    parceiro: '',
    observacoes: 'Solicitou contato sobre certificado.',
    cadastroEm: '2026-08-01T09:20:00',
    atualizadoEm: '2026-08-04T10:15:00',
    anexos: [],
    empresas: [],
    vinculos: [],
    pedidos: [],
    timeline: [
      { data: '2026-08-01T09:20:00', usuario: 'Sistema', descricao: 'Cadastro criado a partir da migração do registro comercial.', tipo: 'Cadastro' }
    ]
  }
];

const crm2PfState = {
  mounted: false,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_PF_INITIAL_ITEMS),
  search: '',
  statusFilter: '',
  originFilter: '',
  registrationDateFilter: '',
  listState: 'normal',
  page: 1,
  perPage: 15,
  detailId: '',
  detailTab: 'dados',
  companySearch: '',
  vinculoFormOpen: false,
  orderSearch: '',
  formMode: '',
  inlineEditing: false,
  draft: {},
  attachmentDraft: [],
  attachmentSelectionDraft: [],
  attachmentRemoved: [],
  attachmentSelectionMode: false,
  selectedAttachmentKeys: [],
  attachmentView: 'list',
  attachmentInlineEditKey: '',
  attachmentInlineDraft: null,
  errors: {},
  changedFields: [],
  cpfGate: { value: '', status: '', personId: '', message: '' },
  message: ''
};

let crm2PfPendingLeaveAction = null;
let crm2PfPendingConfirmAction = null;
let crm2PfToastTimer = null;
let crm2PfSearchTimer = null;

function crm2PfHasUnsavedChangesCrm2() {
  const route = currentPfRouteCrm2();
  if (crm2PfState.formMode === 'create') return route.view === 'new';
  if (crm2PfState.formMode === 'edit') {
    return crm2PfState.inlineEditing
      && route.view === 'detail'
      && (crm2PfState.changedFields.length > 0
        || crm2PfState.attachmentDraft.length > 0
        || crm2PfState.attachmentSelectionDraft.length > 0
        || crm2PfState.attachmentRemoved.length > 0);
  }
  return false;
}

function crm2PfRequestLeaveCrm2(onConfirm) {
  if (!crm2PfHasUnsavedChangesCrm2()) return true;
  if (document.querySelector('.crm2-pf-unsaved-backdrop')) return false;
  crm2PfPendingLeaveAction = onConfirm;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop crm2-pf-unsaved-backdrop" role="presentation">
      <section class="small-modal crm2-pf-unsaved-modal" role="alertdialog" aria-modal="true" aria-labelledby="crm2-pf-unsaved-title" aria-describedby="crm2-pf-unsaved-description">
        <div class="small-modal-header"><h3 id="crm2-pf-unsaved-title">Sair sem salvar?</h3></div>
        <div class="small-modal-body"><p id="crm2-pf-unsaved-description">Existem dados preenchidos que serão perdidos. Deseja realmente sair?</p></div>
        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCancelLeave()">Continuar editando</button>
          <button class="save-btn" type="button" onclick="crm2PfConfirmLeave()">Sair e perder dados</button>
        </div>
      </section>
    </div>`);
  return false;
}

function crm2PfRequestConfirmationCrm2({ title, description, confirmLabel = 'Confirmar', onConfirm }) {
  if (document.querySelector('.crm2-pf-confirm-backdrop')) return false;
  crm2PfPendingConfirmAction = onConfirm;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop crm2-pf-confirm-backdrop" role="presentation">
      <section class="small-modal crm2-pf-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="crm2-pf-confirm-title" aria-describedby="crm2-pf-confirm-description">
        <div class="small-modal-header"><h3 id="crm2-pf-confirm-title">${escapeHtmlCrm2(title)}</h3></div>
        <div class="small-modal-body"><p id="crm2-pf-confirm-description">${escapeHtmlCrm2(description)}</p></div>
        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCancelConfirmation()">Cancelar</button>
          <button class="save-btn" type="button" onclick="crm2PfConfirmConfirmation()">${escapeHtmlCrm2(confirmLabel)}</button>
        </div>
      </section>
    </div>`);
  document.querySelector('.crm2-pf-confirm-modal button')?.focus();
  return false;
}

function crm2PfOpenVinculoFormCrm2() {
  if (!crm2CanCreate() || document.querySelector('.crm2-pf-vinculo-form-backdrop')) return;
  const person = getPersonCrm2(crm2PfState.detailId);
  const registeredCompanies = [...new Map((person?.vinculos || [])
    .filter((vinculo) => vinculo.razaoSocial)
    .map((vinculo) => [vinculo.razaoSocial, vinculo.cnpj || '']))].map(([razaoSocial, cnpj]) => ({ razaoSocial, cnpj }));
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop crm2-pf-vinculo-form-backdrop" role="presentation">
      <section class="small-modal crm2-pf-vinculo-form-modal" role="dialog" aria-modal="true" aria-labelledby="crm2-pf-vinculo-form-title">
        <div class="small-modal-header"><h3 id="crm2-pf-vinculo-form-title">Incluir vínculo</h3></div>
        <form class="small-modal-body crm2-pf-vinculo-form" onsubmit="crm2PfSaveVinculo(event)">
          <label><span>Razão social *</span><input class="config-input" name="razaoSocial" list="crm2-pf-vinculo-empresas" autocomplete="off" required autofocus><datalist id="crm2-pf-vinculo-empresas">${registeredCompanies.map((company) => `<option value="${escapeAttrCrm2(company.razaoSocial)}" label="${escapeAttrCrm2(company.cnpj)}"></option>`).join('')}</datalist></label>
          <label><span>CNPJ</span><input class="config-input" name="cnpj" inputmode="numeric"></label>
          <label><span>Tipo de vínculo *</span><select class="config-input" name="tipo" required><option value="">Selecione</option><option>Representante legal</option><option>Contador</option><option>Sócio</option><option>Outros</option></select></label>
          <label><span>Data de início *</span><input class="config-input" type="date" name="inicioEm" required></label>
          <div class="small-modal-actions"><button class="secondary-btn" type="button" onclick="crm2PfCancelVinculoForm()">Cancelar</button><button class="save-btn" type="submit">Incluir</button></div>
        </form>
      </section>
    </div>`);
  crm2PfState.vinculoFormOpen = true;
}

function crm2PfCancelVinculoFormCrm2() {
  crm2PfState.vinculoFormOpen = false;
  document.querySelector('.crm2-pf-vinculo-form-backdrop')?.remove();
}

function crm2PfSaveVinculoCrm2(event) {
  event?.preventDefault();
  if (!crm2CanCreate()) return;
  const person = getPersonCrm2(crm2PfState.detailId);
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const razaoSocial = String(values.razaoSocial || '').trim();
  const cnpj = String(values.cnpj || '').trim();
  const tipo = String(values.tipo || '').trim();
  const inicioEm = String(values.inicioEm || '').trim();
  if (!person || !razaoSocial || !tipo || !inicioEm) return;
  person.vinculos = Array.isArray(person.vinculos) ? person.vinculos : [];
  const duplicate = person.vinculos.some((vinculo) => normalizeSearchCrm2(vinculo.razaoSocial) === normalizeSearchCrm2(razaoSocial) && vinculo.status === 'Ativo');
  if (duplicate) {
    setMessageCrm2('Já existe um vínculo ativo com essa empresa.');
    crm2PfCancelVinculoFormCrm2();
    rerenderCrm2Phase2();
    return;
  }
  person.vinculos.push({ id: `vinculo-${Date.now()}`, razaoSocial, cnpj, tipo, status: 'Ativo', inicioEm, encerramentoEm: '' });
  registerTimelineCrm2(person, `Vínculo com a empresa ${razaoSocial} incluído.`, 'Inclusão');
  setMessageCrm2('Vínculo incluído apenas no estado local.');
  crm2PfCancelVinculoFormCrm2();
  rerenderCrm2Phase2();
}

function crm2CanEdit() {
  return crm2PfState.canEdit === true;
}

function crm2CanComment() {
  return crm2PfState.canView === true || crm2PfState.canEdit === true || crm2PfState.canDelete === true;
}

function crm2CanCreate() {
  return crm2PfState.canCreate === true || crm2CanEdit();
}

function escapeHtmlCrm2(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttrCrm2(value = '') {
  return escapeHtmlCrm2(value).replaceAll('`', '&#096;');
}

function upperCrm2(value = '') { return String(value ?? '').trim().toLocaleUpperCase('pt-BR'); }

function normalizeSearchCrm2(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function currentRouteCodeCrm2() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const routeIndex = segments.findIndex((segment, index) => segment === 'painel-ar' && CRM2_PF_ROUTE_CODES.has(segments[index + 1]));
  return routeIndex >= 0 ? segments[routeIndex + 1] : '';
}

function currentPfRouteCrm2() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const routeIndex = segments.findIndex((segment, index) => segment === 'painel-ar' && segments[index + 1] === '201');
  if (routeIndex < 0) return { code: '', view: 'list', id: '' };

  const tail = segments.slice(routeIndex + 2);
  if (tail[0] === 'novo') return { code: '201', view: 'new', id: '' };
  if (tail[1] === 'editar') return { code: '201', view: 'edit', id: tail[0] || '' };
  if (tail[0]) return { code: '201', view: 'detail', id: tail[0] };
  return { code: '201', view: 'list', id: '' };
}

function routePathCrm2(code, suffix = '') {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const hasHub = segments[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/${code}${suffix ? `/${suffix}` : ''}`;
}

function navigateCrm2Route(code, suffix = '') {
  const normalized = String(code || '').trim();
  if (!CRM2_PF_ROUTE_CODES.has(normalized)) return;
  if (!crm2PfRequestLeaveCrm2(() => navigateCrm2Route(code, suffix))) return;
  const suffixParts = String(suffix || '').split('/').filter(Boolean);
  const isPfEditRoute = normalized === '201' && suffixParts[1] === 'editar';
  if (!isPfEditRoute) resetFormCrm2();
  window.history.pushState({}, '', routePathCrm2(normalized, suffix));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.setTimeout(mountCrm2Phase2, 0);
}

function maskCpfCrm2(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskNationalPhoneCrm2(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskPhoneCrm2(value = '') {
  if (typeof window !== 'undefined' && typeof window.formatarTelefoneHub === 'function') return window.formatarTelefoneHub(value);
  const raw = String(value || '').trim();
  const international = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '').slice(0, international ? 15 : 11);
  if (!international) return maskNationalPhoneCrm2(digits);
  if (digits.startsWith('55')) return `+55 ${maskNationalPhoneCrm2(digits.slice(2))}`.trim();
  if (digits.startsWith('1')) return `+1 ${digits.length > 1 ? `(${digits.slice(1, 4)}${digits.length >= 4 ? ') ' : ''}${digits.slice(4, 7)}${digits.length >= 7 ? '-' : ''}${digits.slice(7)}` : ''}`.trim();
  return `+${digits}`;
}

function validateCpfCrm2(value = '') {
  const cpf = String(value).replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (count) => {
    let sum = 0;
    for (let index = 0; index < count; index += 1) {
      sum += Number(cpf[index]) * (count + 1 - index);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function validateEmailCrm2(value = '') {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function formatDateCrm2(value = '') {
  if (!value) return '—';
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTimeCrm2(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getPersonCrm2(id) {
  return crm2PfState.items.find((item) => item.id === id) || null;
}

const CRM2_PF_CLOSED_ORDER_STATUSES = new Set([
  'vencido',
  'cancelado',
  'cancelado pelo cliente',
  'revogado',
  'expirado'
]);

function isActiveOrderCrm2(order = {}, today = new Date()) {
  const status = normalizeSearchCrm2(order.status || '');
  if (CRM2_PF_CLOSED_ORDER_STATUSES.has(status)) return false;
  if (!order.vencimento) return true;
  const expiration = new Date(`${String(order.vencimento).slice(0, 10)}T23:59:59`);
  return !Number.isNaN(expiration.getTime()) && expiration >= today;
}

function personStatusCrm2(person = {}) {
  // Regra mockada da Fase 3: basta um pedido não encerrado e não vencido
  // para a PF ser considerada cliente ativa. Sem pedido ativo válido, ela
  // permanece inativa. Este status é sempre derivado e não é editável.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const active = (person.pedidos || []).some((order) => isActiveOrderCrm2(order, today));
  return active ? 'cliente ativo' : 'cliente inativo';
}

function personStatusLabelCrm2(person = {}) {
  return personStatusCrm2(person) === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo';
}

function registerTimelineCrm2(person, description, type = 'Atualização') {
  if (!person) return;
  const now = new Date().toISOString();
  person.timeline = [
    ...(Array.isArray(person.timeline) ? person.timeline : []),
    { data: now, usuario: 'Usuário atual', descricao: description, tipo: type }
  ];
  person.atualizadoEm = now;
}

function filteredPeopleCrm2() {
  const search = normalizeSearchCrm2(crm2PfState.search);
  return crm2PfState.items.filter((item) => {
    const matchesSearch = !search || [item.nome, item.cpf, maskCpfCrm2(item.cpf), item.telefone, item.email]
      .some((value) => normalizeSearchCrm2(value).includes(search));
    const matchesStatus = !crm2PfState.statusFilter || personStatusCrm2(item) === crm2PfState.statusFilter;
    const matchesOrigin = !crm2PfState.originFilter || item.origem === crm2PfState.originFilter;
    const matchesDate = !crm2PfState.registrationDateFilter
      || String(item.cadastroEm || '').slice(0, 10) === crm2PfState.registrationDateFilter;
    return matchesSearch && matchesStatus && matchesOrigin && matchesDate;
  });
}

function paginatedPeopleCrm2(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / crm2PfState.perPage));
  crm2PfState.page = Math.min(Math.max(1, crm2PfState.page), totalPages);
  const start = (crm2PfState.page - 1) * crm2PfState.perPage;
  return { totalPages, pageItems: items.slice(start, start + crm2PfState.perPage) };
}

// --- Dados cadastrais ---
function renderListStateCrm2() {
  const state = crm2PfState.listState;
  if (state === 'normal') return '';
  const settings = {
    loading: ['Carregando pessoas físicas...', 'Estado de carregamento simulado para homologação.', 'Concluir simulação'],
    error: ['Não foi possível carregar a lista.', 'Erro simulado. Nenhuma integração foi acionada.', 'Tentar novamente'],
    empty: ['Nenhuma pessoa física cadastrada.', 'Estado de lista vazia simulado para homologação.', 'Voltar à lista mockada']
  }[state];
  if (!settings) return '';
  return `
    <div class="crm2-pessoas-state ${state === 'error' ? 'is-error' : ''}" role="${state === 'error' ? 'alert' : 'status'}" ${state === 'loading' ? 'aria-busy="true"' : ''}>
      ${state === 'loading' ? '<span class="hub-loading-spinner" aria-hidden="true"></span>' : ''}
      <strong>${escapeHtmlCrm2(settings[0])}</strong>
      <span>${escapeHtmlCrm2(settings[1])}</span>
      <button class="secondary-btn" type="button" onclick="crm2PfSetListState('normal')">${escapeHtmlCrm2(settings[2])}</button>
    </div>
  `;
}

function renderPaginationCrm2(totalPages, totalItems) {
  return `
    <div class="crm2-pessoas-pagination" aria-label="Paginação de pessoas físicas">
      <span>Página <strong>${crm2PfState.page}</strong> de <strong>${totalPages}</strong> · ${totalItems} registro(s)</span>
      <div>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page - 1})" ${crm2PfState.page <= 1 ? 'disabled' : ''}>Anterior</button>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page + 1})" ${crm2PfState.page >= totalPages ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>
  `;
}

function renderPeopleListCrm2() {
  const items = filteredPeopleCrm2();
  const { totalPages, pageItems } = paginatedPeopleCrm2(items);
  const hasFilters = Boolean(crm2PfState.search || crm2PfState.statusFilter);
  const searchExpanded = Boolean(crm2PfState.searchExpanded);
  const specialState = crm2PfState.listState !== 'normal';

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoas-title">
      <div class="admin-panel-header crm2-pessoas-list-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 · CRM 2.0</span>
          <h3 id="crm2-pessoas-title">Pessoas físicas</h3>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
        </div>
      </div>

      <form class="crm2-pf-filter-bar" role="search" onsubmit="crm2PfApplyFilters(event)">
        <div class="crm2-pf-filter-actions">
          ${crm2CanCreate() ? '<button class="save-btn crm2-pf-include-btn" type="button" onclick="window.crm2PfOpenForm(\'create\')">+Incluir</button>' : ''}
          <div class="crm2-pf-select">
            <button id="crm2-pf-status-filter" class="icon-btn ${crm2PfState.statusFilter ? 'is-active' : ''}" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="crm2-pf-status-filter-menu" title="Filtrar por status" aria-label="Filtrar por status" onclick="crm2PfToggleDropdown(this, event)"><i data-lucide="filter" aria-hidden="true"></i></button>
            <div id="crm2-pf-status-filter-menu" class="hub-filter-dropdown-menu" role="listbox" aria-label="Filtrar por status" data-dropdown-input-id="crm2-pf-status-filter" data-dropdown-width="180" hidden>
              ${[['', 'Todos'], ['cliente ativo', 'Cliente ativo'], ['cliente inativo', 'Cliente inativo']].map(([value, label]) => `<button class="hub-filter-dropdown-option ${crm2PfState.statusFilter === value ? 'is-selected' : ''}" type="button" role="option" aria-selected="${crm2PfState.statusFilter === value ? 'true' : 'false'}" data-value="${escapeAttrCrm2(value)}" onclick="crm2PfSelectStatusFilter(this)">${escapeHtmlCrm2(label)}</button>`).join('')}
            </div>
          </div>
          <div class="crm2-pf-search-control ${searchExpanded ? 'is-expanded' : ''}">
            <input class="config-input" type="search" aria-label="Buscar pessoa física" placeholder="Busca por nome, CPF, telefone ou e-mail" value="${escapeAttrCrm2(crm2PfState.search)}" ${searchExpanded ? '' : 'hidden'} oninput="crm2PfSetSearch(this.value, this)" onfocusout="crm2PfHandleSearchBlur(event)" onkeydown="if (event.key === 'Enter') { event.preventDefault(); this.form?.requestSubmit(); }">
            <button class="icon-btn" type="button" title="Buscar" aria-label="Buscar" aria-expanded="${searchExpanded ? 'true' : 'false'}" onclick="crm2PfToggleSearch(this)"><i data-lucide="search" aria-hidden="true"></i></button>
          </div>
          ${hasFilters ? '<button class="icon-btn crm2-pf-clear-filter" type="button" onclick="crm2PfClearFilters()" title="Limpar filtros" aria-label="Limpar filtros">×</button>' : ''}
        </div>
      </form>

      ${specialState ? renderListStateCrm2() : pageItems.length ? `
        <div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap">
          <table class="ar-crm-phase1-table crm2-pessoas-table" data-resizable-table data-resizable-editable="false" data-resize-key="crm2-pessoas" aria-describedby="crm2-pessoas-table-caption">
            <caption id="crm2-pessoas-table-caption" class="crm2-pessoas-table-caption">Pessoas fisicas cadastradas no CRM 2.0</caption>
            <thead>
              <tr>
                <th id="crm2-pf-col-name" scope="col">Nome</th>
                <th id="crm2-pf-col-cpf" scope="col">CPF</th>
                <th id="crm2-pf-col-phone" scope="col">Telefone</th>
                <th id="crm2-pf-col-email" scope="col">E-mail</th>
                <th id="crm2-pf-col-updated" scope="col">Última atualização</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((item) => `
                <tr>
                  <td headers="crm2-pf-col-name"><button class="crm2-pf-name-link" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(item.id)}')" aria-label="Visualizar cadastro de ${escapeAttrCrm2(item.nome)}">${escapeHtmlCrm2(item.nome)}</button></td>
                  <td headers="crm2-pf-col-cpf">${escapeHtmlCrm2(maskCpfCrm2(item.cpf))}</td>
                  <td>${escapeHtmlCrm2(maskPhoneCrm2(item.telefone) || '—')}</td>
                  <td>${escapeHtmlCrm2(item.email || '—')}</td>
                  <td headers="crm2-pf-col-updated">${escapeHtmlCrm2(formatDateTimeCrm2(item.atualizadoEm))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationCrm2(totalPages, items.length)}
      ` : `
        <div class="crm2-pessoas-state" role="status" aria-live="polite">
          <strong>${crm2PfState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa física cadastrada.'}</strong>
          <span>${crm2PfState.items.length ? 'Ajuste os filtros ou limpe a busca para visualizar os registros mockados.' : 'A lista mockada ainda não possui pessoas físicas cadastradas.'}</span>
          <button class="secondary-btn" type="button" onclick="crm2PfClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button>
        </div>
      `}
    </section>
  `;
}

function renderReadOnlyCrm2({ label, value = '', type = 'text', className = '' }) {
  const safeValue = label === 'Nome' ? upperCrm2(value) : value ?? '';
  return `<label class="crm2-pf-readonly-field ${escapeAttrCrm2(className)}"><span>${escapeHtmlCrm2(label)}</span>${type === 'textarea'
    ? `<textarea class="config-input" readonly aria-readonly="true">${escapeHtmlCrm2(safeValue)}</textarea>`
    : `<input class="config-input" type="${escapeAttrCrm2(type)}" value="${escapeAttrCrm2(safeValue)}" readonly aria-readonly="true">`}</label>`;
}

function renderPersonDataCrm2(person) {
  if (crm2PfState.inlineEditing && crm2CanEdit()) return renderPersonDataEditCrm2(person);
  return `
    <div class="crm2-pf-view-form">
      <section class="hub-form-section" aria-labelledby="crm2-pf-view-personal-title">
      <div class="hub-form-section-title"><strong id="crm2-pf-view-personal-title">Dados pessoais</strong></div>
        <div class="hub-form-grid">
          ${renderReadOnlyCrm2({ label: 'CPF', value: maskCpfCrm2(person.cpf) })}
          ${renderReadOnlyCrm2({ label: 'Nome', value: person.nome })}
          ${renderReadOnlyCrm2({ label: 'Data de nascimento', value: person.nascimento, type: 'date' })}
          ${renderReadOnlyCrm2({ label: 'CEI/CAEPF', value: person.cei, className: 'crm2-pf-grid-cei' })}
          ${renderReadOnlyCrm2({ label: 'Telefone', value: maskPhoneCrm2(person.telefone), className: 'crm2-pf-grid-phone' })}
          ${renderReadOnlyCrm2({ label: 'E-mail', value: person.email, type: 'email', className: 'crm2-pf-grid-email' })}
          ${renderReadOnlyCrm2({ label: 'Origem', value: person.origem, className: 'crm2-pf-grid-origin' })}
          ${renderReadOnlyCrm2({ label: 'Parceiro de indicação', value: person.parceiro, className: 'crm2-pf-grid-partner' })}
        </div>
      </section>
    </div>
  `;
}

function renderPersonDataEditCrm2(person) {
  const values = { ...person, ...crm2PfState.draft };
  return `
    <form id="crm2-pf-inline-form" class="crm2-pf-view-form crm2-pf-inline-form" onsubmit="crm2PfSave(event)" novalidate>
      <section class="hub-form-section" aria-labelledby="crm2-pf-inline-personal-title">
        <div class="hub-form-section-title"><strong id="crm2-pf-inline-personal-title">Dados pessoais</strong></div>
        <div class="hub-form-grid">
          ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf), required: true, extra: 'inputmode="numeric" maxlength="14" readonly' })}
          ${formFieldCrm2({ label: 'Nome', name: 'nome', value: values.nome, required: true })}
          ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei, className: 'crm2-pf-grid-cei' })}
          ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="24" onkeyup="crm2PfMaskPhone(this)"', className: 'crm2-pf-grid-phone' })}
          ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email', className: 'crm2-pf-grid-email' })}
          ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem, type: 'select', options: [{ value: 'Indicação', label: 'Indicação' }, { value: 'Site', label: 'Site' }, { value: 'Parceiro', label: 'Parceiro' }, { value: 'Evento', label: 'Evento' }, { value: 'Outro', label: 'Outro' }], className: 'crm2-pf-grid-origin' })}
          ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro, type: 'select', options: crm2PfPartnerOptions(), className: 'crm2-pf-grid-partner' })}
        </div>
      </section>
    </form>
  `;
}

function fileToAttachmentCrm2(file) {
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

function renderFormAttachmentsCrm2(item, editing = false) {
  const existing = (item?.anexos || []).map((attachment, index) => ({ ...attachment, source: 'existing', index }))
    .filter((attachment) => !crm2PfState.attachmentRemoved.includes(attachment.index));
  const pending = crm2PfState.attachmentDraft.map((attachment, index) => ({ ...attachment, source: 'draft', index }));
  return renderHubAttachmentManager({
    id: 'crm2-pf-attachments-title',
    className: 'crm2-pj-attachments crm2-pf-attachments-container',
    attachments: [...existing, ...pending],
    drafts: crm2PfState.attachmentSelectionDraft,
    editing,
    canView: crm2PfState.canView,
    canInclude: crm2PfState.canEdit || (crm2PfState.formMode === 'create' && crm2PfState.canCreate),
    canEdit: crm2PfState.canEdit,
    canDelete: editing && crm2PfState.canDelete,
    showBatchActions: crm2PfState.canView && !crm2PfState.attachmentSelectionDraft.length,
    selectionMode: crm2PfState.attachmentSelectionMode,
    selectedKeys: crm2PfState.selectedAttachmentKeys,
    viewMode: crm2PfState.attachmentView,
    inlineEditKey: crm2PfState.attachmentInlineEditKey,
    inlineDraft: crm2PfState.attachmentInlineDraft,
    formatDate: (value) => value ? formatDateCrm2(value) : 'Sem validade',
    handlers: {
      selectFiles: () => 'crm2PfSelectAttachment(this)',
      openEdit: () => `crm2PfEdit('${escapeAttrCrm2(item?.id || crm2PfState.detailId)}')`,
      cancelDraft: () => 'crm2PfCancelAttachmentDraft()',
      confirmDraft: () => 'crm2PfConfirmAttachmentDraft()',
      toggleSelection: () => 'crm2PfToggleAttachmentSelection()',
      downloadAll: () => 'crm2PfDownloadAllAttachments()',
      downloadSelected: () => 'crm2PfDownloadSelectedAttachments()',
      deleteSelected: () => 'crm2PfDeleteSelectedAttachments()',
      setView: (view) => `crm2PfSetAttachmentView('${escapeAttrCrm2(view)}')`,
      updateDraftName: (index) => `crm2PfUpdateAttachmentDraft(${index}, 'nome', this.value)`,
      updateDraftExpiration: (index) => `crm2PfUpdateAttachmentDraft(${index}, 'validade', this.value)`,
      maskDraftDate: (index) => `crm2PfMaskAttachmentDraftDate(${index}, this)`,
      pickDraftDate: (index) => `crm2PfSetAttachmentDraftDateFromPicker(${index}, this.value)`,
      view: (source, index) => `crm2PfViewAttachment('${escapeAttrCrm2(source)}', ${index})`,
      editInline: (source, index) => `crm2PfToggleAttachmentInlineEdit('${escapeAttrCrm2(source)}', ${index})`,
      updateInlineName: () => "crm2PfUpdateAttachmentInlineDraft('nome', this.value)",
      maskDate: () => 'crm2PfMaskAttachmentDate(this)',
      pickDate: () => 'crm2PfSetAttachmentDateFromPicker(this.value)',
      saveInlineEdit: () => 'crm2PfSaveAttachmentInlineEdit()',
      cancelInlineEdit: () => 'crm2PfCancelAttachmentInlineEdit()',
      download: (source, index) => `crm2PfDownloadAttachment('${escapeAttrCrm2(source)}', ${index})`,
      delete: (source, index) => `crm2PfRemoveAttachment('${escapeAttrCrm2(source)}', ${index})`,
      toggleSelected: (source, index) => `crm2PfToggleAttachmentSelected('${escapeAttrCrm2(source)}', ${index}, this.checked)`
    }
  });
}

function renderPersonSidebarCrm2(person) {
  const editing = crm2PfState.inlineEditing && crm2CanEdit();
  const values = { ...person, ...crm2PfState.draft };
  return `
    <aside class="crm2-pf-detail-sidebar crm2-unified-side-stack" aria-label="Informações complementares">
      <section class="hub-form-section crm2-pf-notes-block crm2-unified-observations" aria-label="Observações">
        <div class="crm2-pf-observations-container">
          <div class="hub-form-grid">
            ${editing
              ? formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', formId: 'crm2-pf-inline-form' })
              : renderReadOnlyCrm2({ label: 'Observações', value: person.observacoes, type: 'textarea' })}
          </div>
        </div>
      </section>
      <section class="hub-form-section crm2-pf-history-section" aria-labelledby="crm2-pf-timeline-title">
        <div class="hub-form-section-title crm2-pf-timeline-title"><div class="crm2-pf-timeline-heading"><strong id="crm2-pf-timeline-title">Histórico</strong>${typeof window !== 'undefined' && typeof window.crm2TimelineRenderCounter === 'function' ? window.crm2TimelineRenderCounter(person) : ''}</div>${typeof window !== 'undefined' && typeof window.crm2TimelineRenderDetailsToggle === 'function' ? window.crm2TimelineRenderDetailsToggle() : ''}</div>
        <div class="crm2-pf-timeline-scroll">${renderTimelineCrm2(person)}</div>
        ${typeof window !== 'undefined' && typeof window.crm2TimelineRenderComposer === 'function' ? window.crm2TimelineRenderComposer(person) : ''}
      </section>
      ${renderFormAttachmentsCrm2(person, editing)}
    </aside>
  `;
}

function renderTimelineCrm2(person) {
  return typeof window !== 'undefined' && typeof window.crm2TimelineRender === 'function'
    ? window.crm2TimelineRender(person)
    : '<div class="crm2-pessoas-state is-compact"><strong>Histórico indisponível.</strong><span>Não foi possível carregar a timeline.</span></div>';
}

function renderVinculosCrm2(person) {
  const vinculos = Array.isArray(person.vinculos) ? person.vinculos : [];
  const search = normalizeSearchCrm2(crm2PfState.companySearch);
  const filteredVinculos = vinculos
    .map((vinculo, index) => ({ vinculo, index }))
    .filter(({ vinculo }) => !search || [vinculo.razaoSocial, vinculo.nome, vinculo.cnpj].some((value) => normalizeSearchCrm2(value).includes(search)));

  return `
    <section class="hub-form-section crm2-pf-vinculos-block" aria-labelledby="crm2-pf-vinculos-title">
      <div class="hub-form-section-title">
        <strong id="crm2-pf-vinculos-title">Empresas vinculadas</strong>
        ${crm2CanCreate() ? '<button class="save-btn crm2-pf-company-include" type="button" onclick="crm2PfOpenVinculoForm()">Incluir</button>' : ''}
      </div>
      ${filteredVinculos.length ? `<div class="crm2-pf-companies-table-wrap">
        <table class="crm2-pf-companies-table" data-resizable-table data-resizable-editable="false" data-resize-key="crm2-pf-vinculos" aria-label="Empresas vinculadas">
          <tbody>${filteredVinculos.map(({ vinculo, index }) => {
            const razaoSocial = vinculo.razaoSocial || vinculo.nome || 'Razão social não informada';
            return `<tr><td><strong class="crm2-pf-company-primary-value">${vinculo.id ? `<button class="crm2-pf-company-name-link" type="button" onclick="crm2VinculosOpenDetail('${escapeAttrCrm2(vinculo.id)}')" aria-label="Visualizar vínculo ${escapeAttrCrm2(razaoSocial)}">${escapeHtmlCrm2(razaoSocial)}</button>` : escapeHtmlCrm2(razaoSocial)}</strong><span class="crm2-pf-company-meta-pill">CNPJ: ${escapeHtmlCrm2(vinculo.cnpj || '—')}</span></td>${crm2PfState.canDelete ? `<td><button class="icon-btn crm2-pf-vinculo-delete" type="button" onclick="crm2PfRemoveVinculo(${index})" aria-label="Excluir vínculo de ${escapeAttrCrm2(razaoSocial)}" title="Excluir vínculo"><i data-lucide="trash-2" aria-hidden="true"></i></button></td>` : ''}</tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : (vinculos.length ? '<div class="crm2-pessoas-state is-compact"><strong>Nenhum vínculo encontrado.</strong><span>Ajuste o nome ou o CNPJ informado.</span></div>' : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum vínculo registrado.</strong><span>Os vínculos PF/PJ serão exibidos nesta aba quando cadastrados.</span></div>')}
    </section>
  `;
}

function renderCompaniesCrm2(person) {
  return renderVinculosCrm2(person);
}

function openPfOrderCrm2(numero = '') {
  const order = window.crm2PedidosGetMockItems?.().find((item) => item.numero === numero);
  if (order?.id && typeof window.crm2PedidosOpenDetail === 'function') window.crm2PedidosOpenDetail(order.id);
  else window.navegarParaCrm2PedidosRota?.();
}

function renderOrdersCrm2(person) {
  const orders = person.pedidos || [];
  const search = normalizeSearchCrm2(crm2PfState.orderSearch);
  const filteredOrders = orders.filter((order) => !search || [order.status, order.empresa, order.numero, order.produto].some((value) => normalizeSearchCrm2(value).includes(search)));
  return `
    ${orders.length && filteredOrders.length ? `<div class="crm2-pf-companies-table-wrap crm2-pf-orders-table-wrap">
      <table class="crm2-pf-companies-table crm2-pf-orders-table" data-resizable-table data-resizable-editable="${crm2PfState.inlineEditing ? 'true' : 'false'}" data-resize-key="crm2-pf-pedidos" aria-label="Pedidos vinculados">
        <tbody>${filteredOrders.map((order) => {
          const isPessoaFisica = String(order.tipoPessoa || order.pessoaTipo || '').toUpperCase() === 'PF' || /e-CPF/i.test(String(order.produto || ''));
          const relatedName = isPessoaFisica ? (order.pfNome || person.nome || 'Pessoa física não informada') : (order.pjRazaoSocial || order.empresa || 'Pessoa jurídica não informada');
          return `<tr>
            <td>${order.numero ? `<button class="crm2-pf-order-number-link" type="button" onclick="crm2PfOpenOrder('${escapeAttrCrm2(order.numero)}')"><strong>${escapeHtmlCrm2(order.numero)}</strong></button>` : '<strong>—</strong>'}</td>
            <td><strong>${escapeHtmlCrm2(order.produto || '—')}</strong><span class="crm2-pf-order-meta-pill">${escapeHtmlCrm2(relatedName)}</span></td>
            <td><span class="crm2-pf-order-meta-pill">${escapeHtmlCrm2(formatDateCrm2(order.vencimento))}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : orders.length ? '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido encontrado.</strong><span>Ajuste o texto informado na busca.</span></div>' : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>A criação de pedidos será habilitada em fase posterior.</span></div>'}
  `;
}

function renderPersonDetailCrm2(person) {
  if (!person) {
    crm2PfState.detailId = '';
    return renderPeopleListCrm2();
  }
  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-detail-title">
      <div class="admin-panel-header">
        <div>
          <div class="crm2-pf-detail-title-row">
            <h3 id="crm2-pessoa-detail-title">${escapeHtmlCrm2(person.nome)}</h3>
            <span class="crm2-pf-status-pill is-${escapeAttrCrm2(personStatusCrm2(person).replace(/\s+/g, '-'))}" role="status">${escapeHtmlCrm2(personStatusLabelCrm2(person))}</span>
          </div>
        </div>
      </div>

      <div class="crm2-pf-detail-layout">
        <main class="crm2-pf-detail-main">
          <section class="hub-form-section crm2-pf-detail-section" aria-labelledby="crm2-pf-data-section-title">
            <div class="hub-form-section-title"><strong id="crm2-pf-data-section-title">Dados cadastrais</strong></div>
            ${renderPersonDataCrm2(person)}
          </section>
          <div class="crm2-pf-related-sections">
            ${renderCompaniesCrm2(person)}
            <section class="hub-form-section crm2-pf-detail-section" aria-labelledby="crm2-pf-orders-section-title">
              <div class="hub-form-section-title"><strong id="crm2-pf-orders-section-title">Pedidos</strong>${crm2CanCreate() ? '<button class="save-btn crm2-pf-company-include" type="button" onclick="crm2PfIncludeOrder()">Incluir</button>' : ''}</div>
              ${renderOrdersCrm2(person)}
            </section>
          </div>
        </main>
        ${renderPersonSidebarCrm2(person)}
      </div>

      <div class="hub-form-screen-actions crm2-pf-form-footer crm2-pf-detail-footer" data-hub-form-footer>
        ${crm2PfState.inlineEditing
            ? `<button class="secondary-btn" type="button" onclick="crm2PfCancelInlineEdit()">Cancelar</button>
               <button class="save-btn" type="submit" form="crm2-pf-inline-form">Salvar alterações</button>`
          : `<button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('201')">Voltar</button>
             ${crm2CanEdit() ? `<button class="save-btn" type="button" onclick="crm2PfEdit('${escapeAttrCrm2(person.id)}')">Editar</button>` : ''}`}
      </div>
    </section>
  `;
}

function renderTextFormatToolbarCrm2(fieldName, label) {
  const field = escapeAttrCrm2(fieldName);
  return `<div class="crm2-pf-text-format-toolbar" role="toolbar" aria-label="${escapeAttrCrm2(label)}">
    <button class="icon-btn" type="button" title="Negrito" aria-label="Negrito" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('bold', '${field}')"><i data-lucide="bold" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Itálico" aria-label="Itálico" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('italic', '${field}')"><i data-lucide="italic" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Sublinhado" aria-label="Sublinhado" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('underline', '${field}')"><i data-lucide="underline" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Tachado" aria-label="Tachado" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('strike', '${field}')"><i data-lucide="strikethrough" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Lista com marcadores" aria-label="Lista com marcadores" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('bullet', '${field}')"><i data-lucide="list" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Lista numerada" aria-label="Lista numerada" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('ordered', '${field}')"><i data-lucide="list-ordered" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Limpar formatação" aria-label="Limpar formatação" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('clear', '${field}')"><i data-lucide="remove-formatting" aria-hidden="true"></i></button>
  </div>`;
}

function formFieldCrm2({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '', formId = '', options = [], className = '' }) {
  const changed = crm2PfState.changedFields.includes(name) ? 'is-changed' : '';
  const error = crm2PfState.errors[name] || '';
  const fieldId = `crm2-pf-${name}`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? `aria-describedby="${errorId}"` : '';
  const invalid = error ? 'true' : 'false';
  const locked = crm2PfState.formMode === 'create' && crm2PfState.cpfGate.status !== 'not-found';
  const displayValue = name === 'nome' ? upperCrm2(value) : value;
  const input = type === 'textarea'
    ? `<div id="${fieldId}" class="config-input crm2-pf-rich-text-target" contenteditable="${locked ? 'false' : 'true'}" role="textbox" aria-multiline="true" data-field-name="${escapeAttrCrm2(name)}" data-value-target="${fieldId}-value" data-placeholder="${escapeAttrCrm2(placeholder)}" aria-invalid="${invalid}" ${describedBy} oninput="crm2PfSyncFormattedField(this)" onkeydown="crm2PfFormatKeydown(event, this)">${escapeHtmlCrm2(value)}</div><textarea id="${fieldId}-value" class="crm2-pf-rich-text-value" name="${name}" hidden ${formId ? `form="${formId}"` : ''}>${escapeHtmlCrm2(value)}</textarea>${renderTextFormatToolbarCrm2(name, `Formatação de ${label}`)}`
    : type === 'select'
      ? `<div class="hub-filter-combobox crm2-pf-select"><input id="${fieldId}" class="config-input crm2-pf-select-trigger" type="text" name="${name}" value="${escapeAttrCrm2(value)}" data-dropdown-menu-id="${fieldId}-menu" data-selected-value="${escapeAttrCrm2(value)}" aria-label="${escapeAttrCrm2(label)}" aria-controls="${fieldId}-menu" aria-expanded="false" aria-haspopup="listbox" autocomplete="off" ${formId ? `form="${formId}"` : ''} ${required ? 'required' : ''} ${extra} aria-invalid="${invalid}" ${describedBy} ${locked ? 'disabled' : ''} onfocus="crm2PfToggleDropdown(this, event)" oninput="crm2PfFilterDropdown(this, event)" onkeydown="crm2PfDropdownKeydown(event, this)"><span class="hub-filter-chevron crm2-pf-select-chevron" aria-hidden="true">⌄</span><div id="${fieldId}-menu" class="hub-filter-dropdown-menu" role="listbox" aria-label="${escapeAttrCrm2(label)}" data-dropdown-input-id="${fieldId}" hidden>${options.map((option) => `<button class="hub-filter-dropdown-option ${String(option.value) === String(value) ? 'is-selected' : ''}" type="button" role="option" aria-selected="${String(option.value) === String(value) ? 'true' : 'false'}" data-value="${escapeAttrCrm2(option.value)}" data-label="${escapeAttrCrm2(option.label)}" onclick="crm2PfSelectDropdown(this)" onkeydown="crm2PfDropdownKeydown(event, this)">${escapeHtmlCrm2(option.label)}</button>`).join('')}</div></div>`
    : `<input id="${fieldId}" class="config-input" type="${type}" name="${name}" autocomplete="off" value="${escapeAttrCrm2(displayValue)}" placeholder="${escapeAttrCrm2(placeholder)}" ${required ? 'required' : ''} ${extra} aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${locked ? 'disabled' : ''} oninput="crm2PfTrackChange(this)">`;
  return `
    <label class="${wide ? 'is-wide' : ''} ${changed} ${className}">
      <span for="${fieldId}">${escapeHtmlCrm2(label)}${required ? ' *' : ''}</span>
      ${input}
      ${error ? `<small id="${errorId}" class="crm2-field-error">${escapeHtmlCrm2(error)}</small>` : ''}
    </label>
  `;
}

// --- Renderização do formulário ---
function renderCpfVerificationCrm2(values = {}) {
  const gate = crm2PfState.cpfGate;
  const verified = gate.status === 'not-found';
  const showPersonalFields = verified;
  return `
    <section class="hub-form-section crm2-pf-cpf-verification" aria-labelledby="crm2-pf-cpf-title">
      <div class="hub-form-section-title">
        <strong id="crm2-pf-cpf-title">Dados pessoais</strong>
      </div>
      <form class="hub-form-grid ${gate.status === 'found' ? 'crm2-pf-cpf-has-found-actions' : ''} ${showPersonalFields ? 'crm2-pf-cpf-has-personal-fields' : ''}" onsubmit="crm2PfSearchCpf(event)" novalidate>
        <label class="${gate.status === 'invalid' ? 'is-invalid' : ''}">
          <span>CPF *</span>
          <span class="crm2-pf-cpf-input-wrap">
            <input class="config-input" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="Consulte o CPF antes de iniciar o cadastro." value="${escapeAttrCrm2(maskCpfCrm2(gate.value))}" oninput="crm2PfMaskCpf(this)" onkeydown="crm2PfCpfKeydown(event)" ${verified ? 'readonly' : ''} required autofocus aria-invalid="${gate.status === 'invalid' ? 'true' : 'false'}" aria-describedby="crm2-pf-cpf-message">
            ${verified
              ? '<button class="crm2-pf-cpf-icon" type="button" onclick="crm2PfChangeCpf()" aria-label="Alterar CPF" title="Alterar CPF"><i data-lucide="eraser" aria-hidden="true"></i></button>'
              : '<button class="crm2-pf-cpf-icon" type="submit" aria-label="Consultar CPF" title="Consultar CPF"><i data-lucide="search" aria-hidden="true"></i></button>'}
          </span>
          ${gate.status === 'invalid' ? '<small id="crm2-pf-cpf-message" class="crm2-field-error">Informe um CPF válido para continuar.</small>' : ''}
          ${gate.status === 'found' ? '<small id="crm2-pf-cpf-found-message" class="crm2-pf-cpf-found-message" role="alert">Já existe cadastro para este CPF</small>' : ''}
        </label>
        ${showPersonalFields ? formFieldCrm2({ label: 'Nome', name: 'nome', value: values.nome, required: true, formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date', formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei, formId: 'crm2-pf-form', className: 'crm2-pf-grid-cei' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="24" onkeyup="crm2PfMaskPhone(this)"', formId: 'crm2-pf-form', className: 'crm2-pf-grid-phone crm2-pf-grid-row-2' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email', formId: 'crm2-pf-form', className: 'crm2-pf-grid-email crm2-pf-grid-row-2' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem, type: 'select', options: [{ value: 'Indicação', label: 'Indicação' }, { value: 'Site', label: 'Site' }, { value: 'Parceiro', label: 'Parceiro' }, { value: 'Evento', label: 'Evento' }, { value: 'Outro', label: 'Outro' }], formId: 'crm2-pf-form', className: 'crm2-pf-grid-origin' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro, type: 'select', options: crm2PfPartnerOptions(), formId: 'crm2-pf-form', className: 'crm2-pf-grid-partner' }) : ''}
        ${gate.status === 'found' ? `
          <div class="crm2-pf-cpf-found-actions" role="group" aria-label="Ações do CPF">
            <button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(gate.personId)}')">Abrir cadastro</button>
            <button class="secondary-btn" type="button" onclick="crm2PfChangeCpf()">Consultar outro CPF</button>
          </div>
        ` : ''}
      </form>
    </section>
  `;
}

function crm2PfPartnerOptions() {
  const records = typeof window.hubObterParceirosIndicacao === 'function'
    ? window.hubObterParceirosIndicacao()
    : [];
  const options = records
    .filter((record) => !['inativo', 'arquivado'].includes(record.status))
    .map((record) => String(record.nome_completo || record.nome || '').trim())
    .filter(Boolean)
    .filter((value, index, valuesList) => valuesList.indexOf(value) === index)
    .map((value) => ({ value, label: value }));
  return options;
}


function renderPersonFormCrm2() {
  const route = currentPfRouteCrm2();
  const editing = route.view === 'edit' || crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(route.id || crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const verified = editing || crm2PfState.cpfGate.status === 'not-found';

  if (typeof window.hubCarregarParceirosIndicacao === 'function' && !window.hubObterParceirosIndicacao?.().length) {
    window.hubCarregarParceirosIndicacao().catch(() => {});
  }

  return `
    <section class="hub-form-screen crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <header class="hub-form-screen-header">
        <div>
          <h2 id="crm2-pessoa-form-title">${editing ? 'Editar cadastro' : 'Novo cadastro PF'}</h2>
        </div>
        <div class="crm2-pf-form-header-actions">
          ${!editing && crm2PfState.cpfGate.status === 'not-found' ? '<span class="crm2-pf-status-pill is-novo-cadastro" role="status">Novo cadastro</span>' : ''}
        </div>
      </header>

      ${!editing ? renderCpfVerificationCrm2(values) : ''}

      <form id="crm2-pf-form" class="hub-form-screen-content crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate ${verified ? '' : 'hidden'}>
        ${editing ? `<section class="hub-form-section" aria-labelledby="crm2-pf-personal-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-personal-title">Dados pessoais</strong></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Nome', name: 'nome', value: values.nome, required: true })}
            ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf || crm2PfState.cpfGate.value), required: true, extra: 'inputmode="numeric" maxlength="14" readonly' })}
            ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
            ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          </div>
        </section>` : ''}

        ${editing ? `<section class="hub-form-section" aria-labelledby="crm2-pf-contact-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-contact-title">Contato</strong></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="24" onkeyup="crm2PfMaskPhone(this)"' })}
            ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
            ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem, type: 'select', options: [{ value: 'Indicação', label: 'Indicação' }, { value: 'Site', label: 'Site' }, { value: 'Parceiro', label: 'Parceiro' }, { value: 'Evento', label: 'Evento' }, { value: 'Outro', label: 'Outro' }] })}
            ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro, type: 'select', options: crm2PfPartnerOptions() })}
          </div>
        </section>` : ''}

        <div class="crm2-pf-notes-attachments-grid">
          <section class="hub-form-section crm2-pf-notes-block crm2-unified-observations ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-notes-title">
            <div class="crm2-pf-observations-container">
              <div class="hub-form-grid">
                ${formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea' })}
              </div>
            </div>
          </section>
          ${renderFormAttachmentsCrm2(person, editing || crm2PfState.formMode === 'create')}
        </div>

        <div class="hub-form-screen-actions crm2-pf-form-footer" data-hub-form-footer>
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Voltar</button>
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Cancelar</button>
          <button class="save-btn" type="submit" ${verified ? '' : 'disabled'}>${editing ? 'Salvar alterações' : 'Salvar'}</button>
        </div>
      </form>
    </section>
  `;
}

function renderCrm2Phase2() {
  crm2PfState.items.forEach((item) => { item.nome = upperCrm2(item.nome); });
  const route = currentPfRouteCrm2();
  if (route.view === 'new') {
    crm2PfState.formMode = 'create';
    return renderPersonFormCrm2();
  }
  if (route.view === 'edit') {
    crm2PfState.formMode = 'edit';
    crm2PfState.inlineEditing = true;
    crm2PfState.detailId = route.id;
    return renderPersonDetailCrm2(getPersonCrm2(route.id));
  }
  if (route.view === 'detail') {
    if (!crm2PfState.inlineEditing) crm2PfState.formMode = '';
    crm2PfState.detailId = route.id;
    return renderPersonDetailCrm2(getPersonCrm2(route.id));
  }
  crm2PfState.formMode = '';
  crm2PfState.inlineEditing = false;
  crm2PfState.detailId = '';
  return renderPeopleListCrm2();
}

function renderIntoCurrentCrm2Target() {
  removeCrm2PfFooterPortal();
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return false;
  if (!crm2PfState.mounted) {
    crm2PfState.mounted = true;
  }
  target.outerHTML = renderCrm2Phase2();
  portalCrm2PfFooter();
  portalCrm2Toast();
  window.hubInicializarTabelasRedimensionaveis?.(target.parentElement || document);
  enhancePeopleTableCrm2();
  window.requestAnimationFrame(() => { void hydrateHubPdfThumbnails(target.parentElement || document); });
  return true;
}

function removeCrm2PfFooterPortal() {
  removeHubFormFooterPortals();
}

function portalCrm2PfFooter() {
  if (window.crm2PfArActive === false) {
    removeCrm2PfFooterPortal();
    return;
  }
  portalHubFormFooter(document.querySelector('.crm2-pessoas-page'));
}

function enhancePeopleTableCrm2() {
  const table = document.querySelector('.crm2-pessoas-table');
  if (!table) return;

  const columnIds = [
    'crm2-pf-col-name',
    'crm2-pf-col-cpf',
    'crm2-pf-col-phone',
    'crm2-pf-col-email',
    'crm2-pf-col-updated'
  ];
  const columnLabels = [
    'Nome',
    'CPF',
    'Telefone',
    'E-mail',
    'Última atualização'
  ];
  const caption = table.querySelector('caption');
  if (caption) caption.textContent = 'Pessoas físicas cadastradas no CRM 2.0';

  table.querySelectorAll('thead th').forEach((header, index) => {
    header.scope = 'col';
    if (columnIds[index]) header.id = columnIds[index];
    if (columnLabels[index]) header.textContent = columnLabels[index];
  });

  table.querySelectorAll('tbody tr').forEach((row) => {
    row.querySelectorAll('td').forEach((cell, index) => {
      if (columnIds[index]) cell.setAttribute('headers', columnIds[index]);
    });
    const status = row.querySelector('td:first-child small');
    if (status) {
      status.classList.add('crm2-pessoas-status');
      status.classList.add(`is-${normalizeSearchCrm2(status.textContent).replace(/\s+/g, '-')}`);
      status.setAttribute('role', 'status');
    }
  });
}

function enhanceCrm2Overview() {
  const title = document.getElementById('crm2-title');
  const panel = title?.closest('.admin-panel');
  if (!panel || panel.dataset.crm2Phase2Overview === 'true') return;

  const item201 = [...panel.querySelectorAll('.crm2-phase1-roadmap-item')]
    .find((item) => item.querySelector('.crm2-phase1-roadmap-code')?.textContent?.trim() === '201');
  if (item201) {
    item201.classList.add('is-actionable', 'is-available');
    item201.setAttribute('role', 'button');
    item201.setAttribute('tabindex', '0');
    item201.setAttribute('onclick', "navegarParaCrm2Rota('201')");
    item201.setAttribute('onkeydown', "if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navegarParaCrm2Rota('201'); }");
    const status = item201.querySelector('.crm2-phase1-roadmap-status');
    if (status) status.textContent = 'Disponível';
  }

  const primaryAction = panel.querySelector('.crm2-phase1-actions .primary-btn');
  if (primaryAction) {
    primaryAction.disabled = false;
    primaryAction.textContent = 'Abrir Pessoas físicas';
    primaryAction.setAttribute('onclick', "navegarParaCrm2Rota('201')");
  }

  const kicker = panel.querySelector('.ar-crm-phase1-kicker');
  if (kicker) kicker.textContent = 'FASES 1 E 2 · MOCK FUNCIONAL';
  panel.dataset.crm2Phase2Overview = 'true';
}

function mountCrm2Phase2() {
  if (window.crm2PfArActive === false) {
    removeCrm2PfFooterPortal();
    removeCrm2Toast();
    return;
  }
  const code = currentRouteCodeCrm2();
  if (code === '200') {
    window.hubLimparDropdowns?.({ remover: true });
    removeCrm2PfFooterPortal();
    removeCrm2Toast();
    resetFormCrm2();
    setMessageCrm2('');
    enhanceCrm2Overview();
    return;
  }
  if (code !== '201') {
    window.hubLimparDropdowns?.({ remover: true });
    removeCrm2PfFooterPortal();
    removeCrm2Toast();
    return;
  }
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return;
  if (target.dataset.crm2Phase2Enhanced === 'true') {
    portalCrm2PfFooter();
    return;
  }
  window.hubLimparDropdowns?.({ remover: true });
  renderIntoCurrentCrm2Target();
}

function rerenderCrm2Phase2() {
  if (window.crm2PfArActive === false || currentRouteCodeCrm2() !== '201') return;
  window.hubLimparDropdowns?.({ remover: true });
  removeCrm2PfFooterPortal();
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return;
  target.outerHTML = renderCrm2Phase2();
  portalCrm2PfFooter();
  portalCrm2Toast();
  window.hubInicializarTabelasRedimensionaveis?.(target.parentElement || document);
  enhancePeopleTableCrm2();
  window.requestAnimationFrame(() => { void hydrateHubPdfThumbnails(target.parentElement || document); });
}

function setMessageCrm2(message = '') {
  crm2PfState.message = message;
}

function removeCrm2Toast() {
  if (crm2PfToastTimer) window.clearTimeout(crm2PfToastTimer);
  crm2PfToastTimer = null;
  document.querySelector('.crm2-pf-toast')?.remove();
}

function portalCrm2Toast() {
  removeCrm2Toast();
  if (!crm2PfState.message) return;
  const toast = document.createElement('div');
  toast.className = 'crm2-pf-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = crm2PfState.message;
  document.body.appendChild(toast);
  crm2PfToastTimer = window.setTimeout(() => {
    if (crm2PfState.message === toast.textContent) crm2PfState.message = '';
    toast.remove();
    crm2PfToastTimer = null;
  }, 4200);
}

function resetFormCrm2() {
  crm2PfState.formMode = '';
  crm2PfState.inlineEditing = false;
  crm2PfState.companySearch = '';
  crm2PfState.orderSearch = '';
  crm2PfState.draft = {};
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.attachmentDraft = [];
  crm2PfState.attachmentSelectionDraft = [];
  crm2PfState.attachmentRemoved = [];
  crm2PfState.attachmentSelectionMode = false;
  crm2PfState.selectedAttachmentKeys = [];
  crm2PfState.attachmentView = 'list';
  crm2PfState.attachmentInlineEditKey = '';
  crm2PfState.attachmentInlineDraft = null;
  crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
}

function openFormCrm2(mode, id = '') {
  if (mode === 'create' ? !crm2CanCreate() : !crm2CanEdit()) return;
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.message = '';
  crm2PfState.attachmentDraft = [];
  crm2PfState.attachmentSelectionDraft = [];
  crm2PfState.attachmentRemoved = [];
  crm2PfState.attachmentSelectionMode = false;
  crm2PfState.selectedAttachmentKeys = [];
  crm2PfState.attachmentInlineEditKey = '';
  crm2PfState.attachmentInlineDraft = null;
  if (mode === 'edit') {
    const person = getPersonCrm2(id || crm2PfState.detailId);
    if (!person) return;
    crm2PfState.detailId = person.id;
    crm2PfState.formMode = 'edit';
    crm2PfState.inlineEditing = true;
    crm2PfState.draft = {};
    crm2PfState.detailTab = 'dados';
    rerenderCrm2Phase2();
  } else {
    crm2PfState.detailId = '';
    crm2PfState.formMode = 'create';
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
    navigateCrm2Route('201', 'novo');
  }
}

function normalizeComparableCrm2(field, value) {
  if (field === 'cpf' || field === 'telefone') return String(value || '').replace(/\D/g, '');
  return String(value || '').trim();
}

function describeChangesCrm2(original, updated) {
  const labels = {
    nome: 'Nome',
    cpf: 'CPF',
    cei: 'CEI/CAEPF',
    nascimento: 'Data de nascimento',
    telefone: 'Telefone',
    email: 'E-mail',
    origem: 'Origem',
    parceiro: 'Parceiro de indicação',
    observacoes: 'Observações'
  };
  return Object.entries(labels).flatMap(([field, label]) => {
    if (normalizeComparableCrm2(field, original[field]) === normalizeComparableCrm2(field, updated[field])) return [];
    return [`${label} — De: ${original[field] || '—'}; Para: ${updated[field] || '—'}`];
  });
}


function savePersonCrm2(event) {
  event?.preventDefault();
  if (crm2PfState.formMode === 'create' ? !crm2CanCreate() : !crm2CanEdit()) return;
  const form = event?.currentTarget;
  const person = getPersonCrm2(crm2PfState.detailId);
  const values = form
    ? Object.fromEntries(new FormData(form).entries())
    : { ...(person || {}), ...crm2PfState.draft };
  values.nome = upperCrm2(values.nome);
  values.cpf = String(values.cpf || crm2PfState.cpfGate.value || '').replace(/\D/g, '');
  values.telefone = maskPhoneCrm2(values.telefone || '');
  values.email = String(values.email || '').trim();

  const errors = {};
  if (!values.nome) errors.nome = 'Informe o nome completo ou nome social.';
  if (!validateCpfCrm2(values.cpf)) errors.cpf = 'Informe um CPF válido.';
  if (!validateEmailCrm2(values.email)) errors.email = 'Informe um e-mail válido.';
  if (values.nascimento && new Date(`${values.nascimento}T00:00:00`) > new Date()) errors.nascimento = 'A data de nascimento não pode estar no futuro.';
  if (crm2PfState.items.some((item) => item.cpf === values.cpf && (crm2PfState.formMode !== 'edit' || item.id !== crm2PfState.detailId))) {
    errors.cpf = 'Já existe uma pessoa física mockada com este CPF.';
  }

  if (Object.keys(errors).length) {
    crm2PfState.errors = errors;
    crm2PfState.draft = { ...crm2PfState.draft, ...values };
    setMessageCrm2('Revise os campos destacados.');
    rerenderCrm2Phase2();
    return;
  }

  const now = new Date().toISOString();
  const pendingAttachments = [...crm2PfState.attachmentDraft];
  const removedAttachmentCount = crm2PfState.attachmentRemoved.length;
  if (crm2PfState.formMode === 'edit') {
    if (!person) return;
    const changes = describeChangesCrm2(person, values);
    person.anexos = (person.anexos || []).filter((attachment, index) => !crm2PfState.attachmentRemoved.includes(index));
    person.anexos.push(...pendingAttachments);
    Object.assign(person, values, { atualizadoEm: now });
    if (changes.length) registerTimelineCrm2(person, `Dados atualizados. ${changes.join(' | ')}`, 'Atualização');
    const attachmentChanges = [
      ...pendingAttachments.map((attachment) => `Anexo incluído: ${attachment.nome}`),
      ...(removedAttachmentCount ? [`${removedAttachmentCount} anexo(s) removido(s).`] : [])
    ];
    if (attachmentChanges.length) registerTimelineCrm2(person, attachmentChanges.join(' | '), 'Atualização');
    setMessageCrm2(changes.length || attachmentChanges.length
      ? 'Pessoa física atualizada no estado mockado. Nenhum dado foi persistido.'
      : 'Nenhuma alteração foi identificada.');
  } else {
    const id = `pf-mock-${Date.now()}`;
    const person = {
      ...values,
      id,
      cadastroEm: now,
      atualizadoEm: now,
      anexos: pendingAttachments,
      empresas: [],
      pedidos: [],
      timeline: [{ data: now, usuario: 'Usuário atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
    };
    crm2PfState.items.unshift(person);
    crm2PfState.detailId = id;
    setMessageCrm2('Pessoa física criada no estado mockado. Nenhum dado foi persistido.');
  }

  const savedId = crm2PfState.detailId;
  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  navigateCrm2Route('201', savedId);
}

function saveCurrentCrm2Tab() {
  if (!crm2CanEdit() || !crm2PfState.inlineEditing) return;
  savePersonCrm2();
}

// --- Ações do CRM 2.0 ---
Object.assign(window, {
  crm2PfRender: renderCrm2Phase2,
  crm2PfRerender: rerenderCrm2Phase2,
  crm2PfRemoveFooterPortal: removeCrm2PfFooterPortal,
  crm2PfGetMockItems() {
    return crm2PfState.items.map((item) => ({
      id: item.id,
      nome: item.nome,
      cpf: item.cpf,
      telefone: item.telefone,
      email: item.email,
      nascimento: item.nascimento,
      origem: item.origem,
      parceiro: item.parceiro,
      observacoes: item.observacoes,
      anexos: Array.isArray(item.anexos) ? item.anexos.map((anexo) => ({ ...anexo })) : [],
      pedidos: Array.isArray(item.pedidos) ? item.pedidos.map((pedido) => ({ ...pedido })) : []
    }));
  },
  crm2PfMutateMockAttachments(id, payload = {}) {
    const person = crm2PfState.items.find((item) => item.id === id);
    if (!person) return false;
    const action = payload.action || '';
    const index = Number(payload.index);
    person.anexos = Array.isArray(person.anexos) ? person.anexos : [];
    if (action === 'add' && payload.attachment) person.anexos.push({ ...payload.attachment });
    if (action === 'remove' && Number.isInteger(index) && index >= 0) person.anexos.splice(index, 1);
    if (action === 'update' && Number.isInteger(index) && person.anexos[index]) person.anexos[index] = { ...person.anexos[index], ...payload.changes };
    person.atualizadoEm = new Date().toISOString();
    rerenderCrm2Phase2();
    return true;
  },
  crm2PfCreateMockFromConversion(payload = {}) {
    if (!payload.nome || String(payload.cpf || '').replace(/\D/g, '').length !== 11) return null;
    const now = new Date().toISOString();
    const item = {
      id: `pf-conv-${Date.now()}`,
      nome: String(payload.nome).trim(),
      cpf: String(payload.cpf).replace(/\D/g, ''),
      cei: '', nascimento: '', telefone: payload.telefone || '', email: payload.email || '',
      origem: 'Conversão de oportunidade', parceiro: '', observacoes: payload.observacoes || '',
      cadastroEm: now, atualizadoEm: now, anexos: Array.isArray(payload.anexos) ? payload.anexos.map((anexo) => ({ ...anexo })) : [], empresas: [], vinculos: [], pedidos: [],
      timeline: [{ data: now, usuario: payload.usuario || 'Usuário mockado', descricao: 'Pessoa Física criada pela conversão de oportunidade.', tipo: 'Conversão' }]
    };
    crm2PfState.items.unshift(item);
    rerenderCrm2Phase2();
    return { ...item, pedidos: [], timeline: item.timeline.map((event) => ({ ...event })) };
  },
  crm2PfApplyConversionMock(id, payload = {}) {
    const person = crm2PfState.items.find((item) => item.id === id);
    if (!person) return false;
    const now = new Date().toISOString();
    if (payload.observacoes) person.observacoes = payload.observacoes;
    person.pedidos = [...(person.pedidos || []), ...(payload.pedidos || [])];
    person.vinculos = [...(person.vinculos || []), ...(payload.vinculos || [])];
    person.atualizadoEm = now;
    person.timeline = [...(person.timeline || []), {
      data: now, usuario: payload.usuario || 'Usuário mockado', tipo: 'Conversão',
      descricao: payload.descricao || 'Pessoa Física atualizada pela conversão de oportunidade.'
    }];
    rerenderCrm2Phase2();
    return true;
  },
  navegarParaCrm2Rota: navigateCrm2Route,
  crm2PfOpenForm: openFormCrm2,
  crm2PfHasUnsavedChanges: crm2PfHasUnsavedChangesCrm2,
  crm2PfRequestLeave: crm2PfRequestLeaveCrm2,
  crm2PfCancelLeave() {
    crm2PfPendingLeaveAction = null;
    document.querySelector('.crm2-pf-unsaved-backdrop')?.remove();
  },
  crm2PfConfirmLeave() {
    const action = crm2PfPendingLeaveAction;
    crm2PfPendingLeaveAction = null;
    document.querySelector('.crm2-pf-unsaved-backdrop')?.remove();
    resetFormCrm2();
    action?.();
  },
  crm2PfCancelForm() {
    if (!crm2PfRequestLeaveCrm2(() => window.crm2PfCancelForm())) return;
    resetFormCrm2();
    setMessageCrm2('');
    navigateCrm2Route('201');
  },
  crm2PfSearchCpf(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('cpf') || '').replace(/\D/g, '');
    crm2PfState.cpfGate.value = value;
    if (!validateCpfCrm2(value)) {
      Object.assign(crm2PfState.cpfGate, { status: 'invalid', personId: '', message: 'Informe um CPF válido para continuar.' });
    } else {
      const person = crm2PfState.items.find((item) => item.cpf === value);
      if (person) {
        Object.assign(crm2PfState.cpfGate, { status: 'found', personId: person.id, message: 'CPF já cadastrado. A criação de duplicidade foi bloqueada.' });
      } else {
        Object.assign(crm2PfState.cpfGate, { status: 'not-found', personId: '', message: 'CPF não encontrado. O novo cadastro pode ser iniciado.' });
      }
    }
    crm2PfState.draft = { cpf: value };
    rerenderCrm2Phase2();
  },
  crm2PfChangeCpf() {
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
    crm2PfState.errors = {};
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => document.querySelector('.crm2-pf-cpf-verification input[name="cpf"]')?.focus());
  },
  crm2PfMaskCpf(input) {
    input.value = maskCpfCrm2(input.value);
    if (!input.value && ['found', 'not-found'].includes(crm2PfState.cpfGate.status)) {
      crm2PfChangeCpf();
    }
  },
  crm2PfCpfKeydown(event) {
    if (!event?.currentTarget || !['Backspace', 'Delete'].includes(event.key)) return;
    if (crm2PfState.cpfGate.status !== 'not-found') return;
    event.preventDefault();
    crm2PfChangeCpf();
  },
  crm2PfMaskPhone(input) {
    input.value = maskPhoneCrm2(input.value);
  },
  crm2PfToggleDropdown(trigger, event) {
    event?.stopPropagation();
    const menu = document.getElementById(trigger?.getAttribute('aria-controls') || '');
    if (!menu || trigger.disabled) return;
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden]), body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((openMenu) => {
      if (openMenu !== menu) {
        openMenu.hidden = true;
        const openTrigger = document.getElementById(openMenu.dataset.dropdownInputId || '');
        openTrigger?.setAttribute('aria-expanded', 'false');
        const openCombo = openTrigger?.closest('.crm2-pf-select');
        if (openCombo && openMenu.parentElement === document.body) openCombo.appendChild(openMenu);
      }
    });
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
    if (!opening) return;
    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    crm2PfPositionDropdown(menu, trigger);
  },
  crm2PfPositionDropdown(menu, trigger) {
    if (!menu || !trigger || menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const requestedWidth = Number(menu.dataset.dropdownWidth) || rect.width;
    const menuWidth = Math.min(requestedWidth, window.innerWidth - (viewportPadding * 2));
    const menuMaxHeight = Math.max(160, window.innerHeight - (viewportPadding * 2));
    menu.style.width = `${menuWidth}px`;
    menu.style.maxHeight = `${menuMaxHeight}px`;
    menu.style.overflowY = 'auto';
    const menuHeight = Math.min(menu.scrollHeight, menuMaxHeight);
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;
    const openAbove = menuHeight > spaceBelow && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - viewportPadding);
    const preferredLeft = menu.dataset.dropdownAnchor === 'start' || trigger.dataset.dropdownAnchor === 'start'
      ? rect.left
      : rect.left + ((rect.width - menuWidth) / 2);
    const left = Math.min(Math.max(viewportPadding, preferredLeft), window.innerWidth - menuWidth - viewportPadding);
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(viewportPadding, top)}px`;
  },
  crm2PfRepositionOpenDropdowns() {
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden])').forEach((menu) => {
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      crm2PfPositionDropdown(menu, trigger);
    });
    document.querySelectorAll('body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((menu) => {
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      crm2PfPositionDropdown(menu, trigger);
    });
  },
  crm2PfFilterDropdown(input, event) {
    event?.stopPropagation();
    const menu = document.getElementById(input?.dataset?.dropdownMenuId || '');
    if (!menu) return;
    input.dataset.selectedValue = '';
    const normalized = String(input.value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    menu.querySelectorAll('[role="option"]').forEach((option) => {
      const label = String(option.dataset.label || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      option.hidden = Boolean(normalized) && !label.includes(normalized);
    });
    if (menu.hidden) {
      if (menu.parentElement !== document.body) document.body.appendChild(menu);
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    crm2PfPositionDropdown(menu, input);
  },
  crm2PfSelectDropdown(option) {
    const menu = option?.closest('.hub-filter-dropdown-menu');
    const trigger = document.getElementById(menu?.dataset?.dropdownInputId || '');
    if (!menu || !trigger) return;
    trigger.value = option.dataset.label || '';
    trigger.dataset.selectedValue = option.dataset.value || '';
    menu.querySelectorAll('[role="option"]').forEach((item) => {
      const selected = item === option;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    const combo = trigger.closest('.crm2-pf-select');
    if (combo && menu.parentElement === document.body) combo.appendChild(menu);
    crm2PfTrackChange(trigger);
    trigger.focus();
  },
  crm2PfDropdownKeydown(event, element) {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      const trigger = element?.classList.contains('crm2-pf-select-trigger')
        ? element
        : document.getElementById(element?.closest('.hub-filter-dropdown-menu')?.dataset?.dropdownInputId || '');
      const menu = document.getElementById(trigger?.dataset?.dropdownMenuId || trigger?.getAttribute('aria-controls') || '');
      if (menu) menu.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
      trigger?.focus();
      return;
    }
    if (element?.classList.contains('crm2-pf-select-trigger')) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const menu = document.getElementById(element.getAttribute('aria-controls') || element.dataset.dropdownMenuId || '');
        if (menu?.hidden) crm2PfToggleDropdown(element, event);
        const options = [...(menu?.querySelectorAll('[role="option"]') || [])];
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') options[event.key === 'ArrowUp' ? options.length - 1 : 0]?.focus();
      }
      return;
    }
    const menu = element?.classList.contains('crm2-pf-select-trigger')
      ? document.getElementById(element.getAttribute('aria-controls') || element.dataset.dropdownMenuId || '')
      : element?.closest('.hub-filter-dropdown-menu');
    const options = [...(menu?.querySelectorAll('[role="option"]') || [])];
    const index = options.indexOf(element);
    if (event.key === 'Enter' || event.key === ' ') return crm2PfSelectDropdown(element);
    if (!options.length) return;
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : event.key === 'ArrowUp'
          ? (index - 1 + options.length) % options.length
          : (index + 1) % options.length;
    options[next].focus();
  },
  crm2PfCloseDropdowns(event) {
    if (event?.target?.closest('.crm2-pf-select, .hub-filter-dropdown-menu')) return;
    document.querySelectorAll('.crm2-pf-select .hub-filter-dropdown-menu:not([hidden]), body > .hub-filter-dropdown-menu[data-dropdown-input-id]:not([hidden])').forEach((menu) => {
      menu.hidden = true;
      const trigger = document.getElementById(menu.dataset.dropdownInputId || '');
      trigger?.setAttribute('aria-expanded', 'false');
      const combo = trigger?.closest('.crm2-pf-select');
      if (combo && menu.parentElement === document.body) combo.appendChild(menu);
    });
  },
  crm2PfTrackChange(input) {
    if (!input?.name) return;
    if (input.name === 'nome') input.value = upperCrm2(input.value);
    crm2PfState.draft[input.name] = input.value;
    if (crm2PfState.formMode !== 'edit') return;
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changed = normalizeComparableCrm2(input.name, input.value) !== normalizeComparableCrm2(input.name, person[input.name]);
    const fields = new Set(crm2PfState.changedFields);
    if (changed) fields.add(input.name); else fields.delete(input.name);
    crm2PfState.changedFields = [...fields];
    input.closest('label')?.classList.toggle('is-changed', changed);
  },
  crm2PfToggleAttachmentInlineEdit(source, index) {
    if (!crm2PfState.canEdit) return;
    const item = getPersonCrm2(crm2PfState.detailId || currentPfRouteCrm2().id);
    const attachment = source === 'draft' ? crm2PfState.attachmentDraft[index] : item?.anexos?.[index];
    if (!attachment) return;
    crm2PfState.attachmentInlineEditKey = `${source}:${index}`;
    const filename = String(attachment.nome || '');
    const extensionMatch = filename.match(/(\.[^.]+)$/);
    crm2PfState.attachmentInlineDraft = {
      nome: extensionMatch ? filename.slice(0, -extensionMatch[1].length) : filename,
      extensao: extensionMatch?.[1] || '',
      validade: attachment.validade || '',
      displayValidade: attachment.validade ? formatDateCrm2(attachment.validade) : ''
    };
    rerenderCrm2Phase2();
  },
  crm2PfUpdateAttachmentInlineDraft(field, value) {
    if (!crm2PfState.attachmentInlineDraft || !['nome', 'validade'].includes(field)) return;
    crm2PfState.attachmentInlineDraft[field] = String(value || '');
  },
  crm2PfUpdateAttachmentInlineDateDraft(value) {
    if (!crm2PfState.attachmentInlineDraft) return;
    const text = String(value || '').trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    crm2PfState.attachmentInlineDraft.displayValidade = text;
    crm2PfState.attachmentInlineDraft.validade = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
  },
  crm2PfMaskAttachmentDate(input) {
    if (!input) return;
    const digits = String(input.value || '').replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    input.value = masked;
    window.crm2PfUpdateAttachmentInlineDateDraft(masked);
  },
  crm2PfSetAttachmentDateFromPicker(value) {
    if (!crm2PfState.attachmentInlineDraft) return;
    crm2PfState.attachmentInlineDraft.validade = String(value || '');
    crm2PfState.attachmentInlineDraft.displayValidade = formatDateCrm2(value);
    rerenderCrm2Phase2();
  },
  crm2PfSaveAttachmentInlineEdit() {
    const [source, index] = String(crm2PfState.attachmentInlineEditKey || ':').split(':');
    const draft = crm2PfState.attachmentInlineDraft;
    const item = getPersonCrm2(crm2PfState.detailId || currentPfRouteCrm2().id);
    const attachment = source === 'draft' ? crm2PfState.attachmentDraft[Number(index)] : item?.anexos?.[Number(index)];
    if (!attachment || !draft) return;
    attachment.nome = `${draft.nome}${draft.extensao || ''}`;
    attachment.validade = draft.validade;
    if (item) item.atualizadoEm = new Date().toISOString();
    crm2PfState.attachmentInlineEditKey = '';
    crm2PfState.attachmentInlineDraft = null;
    rerenderCrm2Phase2();
  },
  crm2PfCancelAttachmentInlineEdit() {
    crm2PfState.attachmentInlineEditKey = '';
    crm2PfState.attachmentInlineDraft = null;
    rerenderCrm2Phase2();
  },
  crm2PfSelectAttachment(input) {
    const allowed = crm2PfState.canEdit || (crm2PfState.formMode === 'create' && crm2PfState.canCreate);
    if (!allowed) return;
    const attachments = Array.from(input?.files || []).map(fileToAttachmentCrm2).map((attachment) => {
      const match = String(attachment.nome || '').match(/(\.[^.]+)$/);
      return { ...attachment, nome: match ? attachment.nome.slice(0, -match[1].length) : attachment.nome, extensao: match?.[1] || '' };
    });
    if (!attachments.length) return;
    crm2PfState.attachmentSelectionDraft.push(...attachments);
    rerenderCrm2Phase2();
  },
  crm2PfUpdateAttachmentDraft(index, field, value) {
    const attachment = crm2PfState.attachmentSelectionDraft[index];
    if (!attachment || !['nome', 'validade'].includes(field)) return;
    attachment[field] = String(value || '');
  },
  crm2PfMaskAttachmentDraftDate(index, input) {
    const draft = crm2PfState.attachmentSelectionDraft?.[index];
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
  crm2PfSetAttachmentDraftDateFromPicker(index, value) {
    const draft = crm2PfState.attachmentSelectionDraft?.[index];
    if (!draft) return;
    const iso = String(value || '');
    draft.validade = iso;
    draft.displayValidade = iso ? formatDateCrm2(iso) : '';
    rerenderCrm2Phase2();
  },
  crm2PfRemoveAttachment(source, index) {
    if (!crm2PfState.canDelete && crm2PfState.formMode === 'edit') return;
    if (!window.confirm('Remover este anexo do estado mockado?')) return;
    if (source === 'draft') crm2PfState.attachmentDraft.splice(Number(index), 1);
    else if (!crm2PfState.attachmentRemoved.includes(Number(index))) crm2PfState.attachmentRemoved.push(Number(index));
    rerenderCrm2Phase2();
  },
  crm2PfCancelAttachmentDraft() {
    crm2PfState.attachmentSelectionDraft = [];
    crm2PfState.attachmentInlineEditKey = '';
    crm2PfState.attachmentInlineDraft = null;
    rerenderCrm2Phase2();
  },
  crm2PfConfirmAttachmentDraft() {
    if (!crm2PfState.attachmentSelectionDraft.length) return;
    crm2PfState.attachmentDraft.push(...crm2PfState.attachmentSelectionDraft.map((attachment) => ({
      ...attachment,
      nome: `${String(attachment.nome || '').trim()}${attachment.extensao || ''}`
    })));
    crm2PfState.attachmentSelectionDraft = [];
    crm2PfState.attachmentInlineEditKey = '';
    crm2PfState.attachmentInlineDraft = null;
    rerenderCrm2Phase2();
  },
  crm2PfToggleAttachmentSelection() {
    crm2PfState.attachmentSelectionMode = !crm2PfState.attachmentSelectionMode;
    if (!crm2PfState.attachmentSelectionMode) crm2PfState.selectedAttachmentKeys = [];
    rerenderCrm2Phase2();
  },
  crm2PfSetAttachmentView(view) {
    if (!['list', 'grid'].includes(view)) return;
    crm2PfState.attachmentView = view;
    rerenderCrm2Phase2();
  },
  crm2PfToggleAttachmentSelected(source, index, checked) {
    const key = `${source}:${index}`;
    crm2PfState.selectedAttachmentKeys = checked
      ? [...new Set([...crm2PfState.selectedAttachmentKeys, key])]
      : crm2PfState.selectedAttachmentKeys.filter((item) => item !== key);
    rerenderCrm2Phase2();
  },
  crm2PfDownloadAllAttachments() {
    const item = getPersonCrm2(crm2PfState.detailId || currentPfRouteCrm2().id);
    (item?.anexos || []).forEach((_, index) => window.crm2PfDownloadAttachment('existing', index));
    crm2PfState.attachmentDraft.forEach((_, index) => window.crm2PfDownloadAttachment('draft', index));
  },
  crm2PfDownloadSelectedAttachments() {
    crm2PfState.selectedAttachmentKeys.forEach((key) => { const [source, index] = key.split(':'); window.crm2PfDownloadAttachment(source, Number(index)); });
  },
  crm2PfDeleteSelectedAttachments() {
    if (!crm2PfState.canDelete) return;
    [...crm2PfState.selectedAttachmentKeys].forEach((key) => {
      const [source, index] = key.split(':');
      if (source === 'draft') crm2PfState.attachmentDraft.splice(Number(index), 1);
      else if (!crm2PfState.attachmentRemoved.includes(Number(index))) crm2PfState.attachmentRemoved.push(Number(index));
    });
    crm2PfState.selectedAttachmentKeys = [];
    rerenderCrm2Phase2();
  },
  crm2PfViewAttachment(source, index) {
    const item = getPersonCrm2(crm2PfState.detailId || currentPfRouteCrm2().id);
    const attachment = source === 'draft' ? crm2PfState.attachmentDraft[index] : item?.anexos?.[index];
    if (attachment?.previewUrl || attachment?.url) window.open(attachment.previewUrl || attachment.url, '_blank', 'noopener,noreferrer');
  },
  crm2PfDownloadAttachment(source, index) {
    const item = getPersonCrm2(crm2PfState.detailId || currentPfRouteCrm2().id);
    const attachment = source === 'draft' ? crm2PfState.attachmentDraft[index] : item?.anexos?.[index];
    if (!attachment) return;
    const blob = typeof File !== 'undefined' && attachment.arquivo instanceof File
      ? attachment.arquivo
      : new Blob([`Nome: ${attachment.nome}\nTipo: ${attachment.tipo}\nValidade: ${attachment.validade || 'Sem validade'}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.nome || 'anexo-pf';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  crm2PfSave: savePersonCrm2,
  crm2PfSaveCurrentTab: saveCurrentCrm2Tab,
  crm2PfOpenDetail(id) {
    if (!getPersonCrm2(id)) return;
    resetFormCrm2();
    crm2PfState.detailId = id;
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201', id);
  },
  crm2PfCloseDetail() {
    crm2PfState.attachmentDraft = [];
    crm2PfState.attachmentSelectionDraft = [];
    crm2PfState.attachmentRemoved = [];
    crm2PfState.attachmentSelectionMode = false;
    crm2PfState.selectedAttachmentKeys = [];
    crm2PfState.attachmentInlineEditKey = '';
    crm2PfState.attachmentInlineDraft = null;
    crm2PfState.detailId = '';
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201');
  },
  crm2PfEdit(id) {
    if (window.event?.currentTarget?.classList.contains('crm2-pf-include-attachment')) {
      window.crm2PfOpenAttachmentPicker(id);
      return;
    }
    openFormCrm2('edit', id);
  },
  crm2PfOpenAttachmentPicker(id) {
    if (!crm2PfState.canEdit || !getPersonCrm2(id)) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      window.crm2PfSelectAttachment(input);
      input.remove();
    };
    input.click();
  },
  crm2PfOpenOrder: openPfOrderCrm2,
  crm2PfRemoveCompany(index) {
    if (!crm2PfState.inlineEditing || !crm2PfState.canDelete) return;
    const person = getPersonCrm2(crm2PfState.detailId);
    const company = person?.empresas?.[index];
    if (!person || !company) return;
    const name = company.razaoSocial || company.nome || 'empresa';
    crm2PfRequestConfirmationCrm2({
      title: 'Excluir vínculo?',
      description: `O vínculo com ${name} será removido deste cadastro mockado. Deseja continuar?`,
      confirmLabel: 'Excluir vínculo',
      onConfirm: () => {
        person.empresas.splice(index, 1);
        registerTimelineCrm2(person, `Vínculo com a empresa ${name} excluído.`, 'Exclusão');
        setMessageCrm2('Vínculo excluído apenas do estado local.');
        rerenderCrm2Phase2();
      }
    });
  },
  crm2PfCancelInlineEdit() {
    if (!crm2PfHasUnsavedChangesCrm2()) {
      resetFormCrm2();
      setMessageCrm2('');
      rerenderCrm2Phase2();
      return;
    }
    if (!crm2PfRequestLeaveCrm2(() => window.crm2PfCancelInlineEdit())) return;
    resetFormCrm2();
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfCancelConfirmation() {
    crm2PfPendingConfirmAction = null;
    document.querySelector('.crm2-pf-confirm-backdrop')?.remove();
  },
  crm2PfConfirmConfirmation() {
    const action = crm2PfPendingConfirmAction;
    crm2PfPendingConfirmAction = null;
    document.querySelector('.crm2-pf-confirm-backdrop')?.remove();
    action?.();
  },
  crm2PfSelectTab(tab) {
    if (crm2PfState.inlineEditing && !['dados', 'empresas', 'pedidos'].includes(tab)) return;
    if (!['dados', 'empresas', 'pedidos'].includes(tab)) return;
    crm2PfState.detailTab = tab;
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfSetSearch(value, input) {
    window.hubAtualizarBuscaAoDigitar(input, (search) => {
      crm2PfState.search = search;
      crm2PfState.searchExpanded = true;
      crm2PfState.page = 1;
    }, rerenderCrm2Phase2, () => document.querySelector('.crm2-pf-search-control input[type="search"]'));
  },
  crm2PfSetCompanySearch(input) {
    const cursor = typeof input?.selectionStart === 'number' ? input.selectionStart : String(input?.value || '').length;
    crm2PfState.companySearch = String(input?.value || '');
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => {
      const field = document.querySelector('.crm2-pf-company-search input');
      if (!field) return;
      field.focus({ preventScroll: true });
      field.setSelectionRange(cursor, cursor);
    });
  },
  crm2PfIncludeCompany() {
    if (!crm2CanCreate()) return;
    setMessageCrm2('A inclusão de vínculo PJ será disponibilizada na próxima etapa do CRM 2.0.');
    rerenderCrm2Phase2();
  },
  crm2PfOpenVinculoForm() {
    crm2PfOpenVinculoFormCrm2();
  },
  crm2PfCancelVinculoForm() {
    crm2PfCancelVinculoFormCrm2();
  },
  crm2PfSaveVinculo(event) {
    crm2PfSaveVinculoCrm2(event);
  },
  crm2PfRemoveVinculo(index) {
    if (!crm2PfState.canDelete) return;
    const person = getPersonCrm2(crm2PfState.detailId);
    const vinculo = person?.vinculos?.[index];
    if (!person || !vinculo) return;
    const name = vinculo.razaoSocial || 'empresa';
    crm2PfRequestConfirmationCrm2({
      title: 'Excluir vínculo?',
      description: `O vínculo com ${name} será removido deste cadastro mockado. Deseja continuar?`,
      confirmLabel: 'Excluir vínculo',
      onConfirm: () => {
        person.vinculos.splice(index, 1);
        registerTimelineCrm2(person, `Vínculo com a empresa ${name} excluído.`, 'Exclusão');
        setMessageCrm2('Vínculo excluído apenas do estado local.');
        rerenderCrm2Phase2();
      }
    });
  },
  crm2PfSetOrderSearch(input) {
    const cursor = typeof input?.selectionStart === 'number' ? input.selectionStart : String(input?.value || '').length;
    crm2PfState.orderSearch = String(input?.value || '');
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => {
      const field = document.querySelector('.crm2-pf-order-search input');
      if (!field) return;
      field.focus({ preventScroll: true });
      field.setSelectionRange(cursor, cursor);
    });
  },
  crm2PfIncludeOrder() {
    if (!crm2CanEdit()) return;
    setMessageCrm2('A inclusão de pedido será disponibilizada na próxima etapa do CRM 2.0.');
    rerenderCrm2Phase2();
  },
  crm2PfApplyFilters(event) {
    event?.preventDefault();
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfFormatNote(command, fieldName = 'observacao') {
    const editor = document.querySelector(`.crm2-pf-rich-text-target[data-field-name="${fieldName}"]`);
    if (!editor) return;
    editor.focus();
    const commands = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough', bullet: 'insertUnorderedList', ordered: 'insertOrderedList', clear: 'removeFormat' };
    if (!commands[command]) return;
    document.execCommand(commands[command], false);
    window.crm2PfSyncFormattedField(editor);
  },
  crm2PfSyncFormattedField(editor) {
    if (!editor?.dataset.valueTarget) return;
    const valueTarget = document.getElementById(editor.dataset.valueTarget);
    if (!valueTarget) return;
    valueTarget.value = editor.innerText || '';
    crm2PfTrackChange(valueTarget);
  },
  crm2PfFormatKeydown(event, textarea) {
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
    window.crm2PfFormatNote(command, textarea?.dataset?.fieldName || textarea?.name || 'observacao');
  },
  crm2PfSetFilter(type, value) {
    if (type === 'status') crm2PfState.statusFilter = String(value || '');
    if (type === 'origin') crm2PfState.originFilter = String(value || '');
    if (type === 'date') crm2PfState.registrationDateFilter = String(value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfSelectStatusFilter(option) {
    const menu = option?.closest('.hub-filter-dropdown-menu');
    if (!menu) return;
    menu.remove();
    crm2PfState.statusFilter = String(option.dataset.value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfToggleSearch(button) {
    const control = button?.closest('.crm2-pf-search-control');
    const input = control?.querySelector('input[type="search"]');
    if (!control || !input) return;
    const expanded = !control.classList.contains('is-expanded');
    crm2PfState.searchExpanded = expanded;
    control.classList.toggle('is-expanded', expanded);
    input.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    if (expanded) input.focus({ preventScroll: true });
  },
  crm2PfHandleSearchBlur(event) {
    const input = event?.currentTarget;
    const control = input?.closest('.crm2-pf-search-control');
    if (!control || control.contains(event.relatedTarget)) return;
    window.setTimeout(() => {
      if (control.contains(document.activeElement)) return;
      crm2PfState.searchExpanded = false;
      control.classList.remove('is-expanded');
      input.hidden = true;
      control.querySelector('button')?.setAttribute('aria-expanded', 'false');
    }, 0);
  },
  crm2PfClearFilters() {
    Object.assign(crm2PfState, { search: '', searchExpanded: false, statusFilter: '', originFilter: '', registrationDateFilter: '', page: 1 });
    rerenderCrm2Phase2();
  },
  crm2PfSetListState(value) {
    if (!crm2CanEdit()) return;
    crm2PfState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    rerenderCrm2Phase2();
  },
  crm2PfSetPage(page) {
    crm2PfState.page = Math.max(1, Number(page) || 1);
    rerenderCrm2Phase2();
  },
  crm2PfAddNote(event, personId) {
    event?.preventDefault();
    if (!crm2CanComment()) return;
    const person = getPersonCrm2(personId);
    const trigger = event?.currentTarget;
    const form = trigger?.closest('form') || trigger;
    const editor = form?.querySelector('.crm2-pf-rich-text-target');
    const note = String(editor?.innerText || form?.querySelector('textarea[name="observacao"]')?.value || '').trim();
    if (!person || !note) return;
    const target = form?.querySelector('textarea[name="observacao"]');
    if (target) target.value = note;
    registerTimelineCrm2(person, `Observação interna adicionada: ${note}`, 'Observação interna');
    setMessageCrm2('Observação adicionada à timeline mockada.');
    rerenderCrm2Phase2();
  },
  crm2PfViewCompany(index) {
    const person = getPersonCrm2(crm2PfState.detailId);
    const company = person?.empresas?.[index];
    if (!company) return;
    setMessageCrm2(`A visualização de ${company.nome} será habilitada na Fase 3 — Pessoa Jurídica.`);
    rerenderCrm2Phase2();
  }
});

document.addEventListener('click', (event) => window.crm2PfCloseDropdowns?.(event));
window.addEventListener('focusin', (event) => {
  if (event.target?.closest('.crm2-pf-select, .hub-filter-dropdown-menu')) return;
  window.crm2PfCloseDropdowns?.();
});
document.addEventListener('scroll', () => window.crm2PfRepositionOpenDropdowns?.(), true);
window.addEventListener('resize', () => window.crm2PfRepositionOpenDropdowns?.());
window.addEventListener('hub-parceiros-indicacao-atualizados', () => {
  if (currentRouteCodeCrm2()) rerenderCrm2Phase2();
});

let crm2MountFrame = 0;

function cancelarMontagemCrm2Agendada() {
  if (!crm2MountFrame) return;
  window.cancelAnimationFrame(crm2MountFrame);
  crm2MountFrame = 0;
}


function agendarMontagemCrm2() {
  cancelarMontagemCrm2Agendada();
  crm2MountFrame = window.requestAnimationFrame(() => {
    crm2MountFrame = 0;
    if (currentRouteCodeCrm2()) mountCrm2Phase2();
  });
}

const crm2Observer = new MutationObserver((mutations) => {
  if (!currentRouteCodeCrm2()) {
    cancelarMontagemCrm2Agendada();
    return;
  }

  const alterouAlvoCrm2 = mutations.some(({ addedNodes, removedNodes }) => [
    ...addedNodes,
    ...removedNodes
  ].some((node) => node.nodeType === Node.ELEMENT_NODE && (
    node.matches?.('.crm2-pessoas-page')
      || node.querySelector?.('.crm2-pessoas-page')
  )));

  if (alterouAlvoCrm2) agendarMontagemCrm2();
});

crm2Observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', () => {
  cancelarMontagemCrm2Agendada();
  window.setTimeout(() => {
    if (currentRouteCodeCrm2()) mountCrm2Phase2();
  }, 0);
});
window.addEventListener('beforeunload', (event) => {
  if (!crm2PfHasUnsavedChangesCrm2()) return;
  event.preventDefault();
  event.returnValue = '';
});
window.addEventListener('DOMContentLoaded', mountCrm2Phase2, { once: true });
window.setTimeout(mountCrm2Phase2, 0);

// --- Permissões ---
import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

(() => {

  crm2PfState.canView = false;
  crm2PfState.canEdit = false;
  crm2PfState.canDelete = false;

  const originalRenderPeopleListCrm2 = renderPeopleListCrm2;
  const originalRenderPersonDetailCrm2 = renderPersonDetailCrm2;

  function injectRowPermissionsCrm2(html = '') {
    return String(html).replace(
      /<button type="button" role="menuitem" onclick="crm2PfEdit\('([^']+)'\)"[^>]*>Editar<\/button>/g,
      (button, personId) => {
        const editButton = crm2PfState.canEdit ? button : '';
        const deleteButton = crm2PfState.canDelete
          ? `<button class="danger-text" type="button" role="menuitem" onclick="crm2PfDelete('${escapeAttrCrm2(personId)}')">Excluir</button>`
          : '';
        return `${editButton}${deleteButton}`;
      }
    );
  }

  function injectDetailPermissionsCrm2(html = '', person = {}) {
    const editPattern = /<button class="save-btn" type="button" onclick="crm2PfEdit\('[^']+'\)"[^>]*>Editar<\/button>/;
    return String(html).replace(editPattern, (button) => {
      const editButton = crm2PfState.canEdit ? button : '';
      const deleteButton = crm2PfState.canDelete
        ? `<button class="secondary-btn" type="button" onclick="crm2PfDelete('${escapeAttrCrm2(person.id)}')">Excluir</button>`
        : '';
      return `${deleteButton}${editButton}`;
    });
  }

  renderPeopleListCrm2 = function renderPeopleListWithPermissionsCrm2() {
    return injectRowPermissionsCrm2(originalRenderPeopleListCrm2());
  };

  renderPersonDetailCrm2 = function renderPersonDetailWithPermissionsCrm2(person) {
    return injectDetailPermissionsCrm2(originalRenderPersonDetailCrm2(person), person || {});
  };

  window.crm2PfDelete = function crm2PfDelete(personId) {
    if (!crm2PfState.canDelete) return;
    const person = getPersonCrm2(personId);
    if (!person) return;

    const confirmed = window.confirm(
      `Excluir “${person.nome}” apenas do estado mockado desta página? Nenhum dado externo será alterado.`
    );
    if (!confirmed) return;

    crm2PfState.items = crm2PfState.items.filter((item) => item.id !== personId);
    if (crm2PfState.detailId === personId) {
      crm2PfState.detailId = '';
      crm2PfState.detailTab = 'dados';
    }
    resetFormCrm2();
    setMessageCrm2('Pessoa física excluída apenas do estado mockado. Nenhum dado foi persistido.');
    rerenderCrm2Phase2();
  };

  function renderPermissionDeniedCrm2() {
    if (currentRouteCodeCrm2() !== '201') return;
    const target = document.querySelector('.crm2-pessoas-page');
    if (!target) return;
    target.outerHTML = `
      <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-access-denied-title">
        <div class="crm2-pessoas-state is-error" role="alert">
          <strong id="crm2-access-denied-title">Acesso não autorizado.</strong>
          <span>É necessária a permissão Visualizar para acessar Pessoas físicas.</span>
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
        </div>
      </section>
    `;
  }

  function applyPermissionsCrm2(context, hasPermission) {
    const permissions = context?.permissions || {};
    const resolvePermission = (action) => hasPermission(permissions, 'painel_ar', action);
    crm2PfState.canView = resolvePermission('view');
    crm2PfState.canCreate = resolvePermission('create');
    crm2PfState.canEdit = resolvePermission('update');
    crm2PfState.canDelete = resolvePermission('delete');

    // Compatibilidade interna com os componentes existentes da Fase 2.
    // A origem desta capacidade passa a ser exclusivamente a permissão Editar (update).

    if (currentRouteCodeCrm2() !== '201') return;
    if (!crm2PfState.canView) {
      renderPermissionDeniedCrm2();
      return;
    }

    const target = document.querySelector('.crm2-pessoas-page');
    if (!target) return;
    if (target.dataset.crm2Phase2Enhanced === 'true') {
      rerenderCrm2Phase2();
    } else {
      mountCrm2Phase2();
    }
  }

  const syncPermissions = (context = obterContextoAcessoHub()) => {
    applyPermissionsCrm2(context, hasPermission);
  };

  observarContextoAcessoHub(syncPermissions);
  syncPermissions();
  /* legacy async error fallback removed */
  /*
    console.error('Não foi possível carregar as permissões do CRM 2.0.', error);
    crm2PfState.canView = true;
    crm2PfState.canEdit = false;
    crm2PfState.canDelete = false;
  });
  */
})();
