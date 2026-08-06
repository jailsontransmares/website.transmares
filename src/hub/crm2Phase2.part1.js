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
      { nome: 'Alves Consultoria Ltda.', vinculo: 'Representante legal', status: 'ativo' }
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
      { data: '2026-08-03T15:42:00', usuario: 'Equipe AR', descricao: 'Dados atualizados.', tipo: 'Atualização' },
      { data: '2026-08-04T09:20:00', usuario: 'Equipe AR', descricao: 'Observação interna adicionada: cliente confirmou disponibilidade para renovação.', tipo: 'Observação interna' }
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
      { nome: 'Rocha Serviços Digitais', vinculo: 'Titular do pedido', status: 'ativo' }
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
  }
];

const crm2PfState = {
  mounted: false,
  canView: false,
  canEdit: false,
  canDelete: false,
  items: structuredClone(CRM2_PF_INITIAL_ITEMS),
  search: '',
  statusFilter: '',
  originFilter: '',
  registrationDateFilter: '',
  listState: 'normal',
  page: 1,
  perPage: 5,
  detailId: '',
  detailTab: 'dados',
  formMode: '',
  draft: {},
  draftAttachments: [],
  attachmentDraft: [],
  errors: {},
  changedFields: [],
  cpfGate: { value: '', status: '', personId: '', message: '' },
  message: ''
};

let crm2PfPendingLeaveAction = null;

function crm2PfHasUnsavedChangesCrm2() {
  return ['create', 'edit'].includes(crm2PfState.formMode)
    && ['new', 'edit'].includes(currentPfRouteCrm2().view);
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

function crm2CanEdit() {
  return crm2PfState.canEdit === true;
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
  const date = new Date(value);
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

function personStatusCrm2(person = {}) {
  const closed = new Set(['vencido', 'cancelado', 'cancelado pelo cliente', 'revogado', 'expirado']);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const active = (person.pedidos || []).some((order) => {
    const status = String(order.status || '').trim().toLowerCase();
    if (closed.has(status)) return false;
    if (!order.vencimento) return true;
    const expiration = new Date(`${String(order.vencimento).slice(0, 10)}T23:59:59`);
    return !Number.isNaN(expiration.getTime()) && expiration >= today;
  });
  return active ? 'cliente ativo' : 'cliente inativo';
}

function personStatusLabelCrm2(person = {}) {
  return personStatusCrm2(person) === 'cliente ativo' ? 'Cliente ativo' : 'Cliente inativo';
}

function attachmentStatusCrm2(expiration = '') {
  if (!expiration) return 'sem validade';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${String(expiration).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(date.getTime())) return 'sem validade';
  const days = Math.ceil((date - today) / 86400000);
  if (days < 0) return 'vencido';
  if (days <= 30) return 'vencendo';
  return 'válido';
}

function attachmentStatusClassCrm2(status = '') {
  return normalizeSearchCrm2(status).replace(/\s+/g, '-');
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
