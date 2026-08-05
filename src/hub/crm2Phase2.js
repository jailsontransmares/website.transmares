// CRM 2.0 / Pessoas Físicas — bundle oficial carregado pelo app principal.

// --- src/hub/crm2Phase2.part1.js ---
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
    origem: 'IndicaÃ§Ã£o',
    parceiro: 'Rede Transmares',
    observacoes: 'Cliente com acompanhamento de renovaÃ§Ã£o.',
    cadastroEm: '2026-07-18T10:30:00',
    atualizadoEm: '2026-08-04T09:20:00',
    anexos: [
      {
        nome: 'Documento de identificaÃ§Ã£o.pdf',
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
      { data: '2026-08-03T15:42:00', usuario: 'Equipe AR', descricao: 'Dados atualizados.', tipo: 'AtualizaÃ§Ã£o' },
      { data: '2026-08-04T09:20:00', usuario: 'Equipe AR', descricao: 'ObservaÃ§Ã£o interna adicionada: cliente confirmou disponibilidade para renovaÃ§Ã£o.', tipo: 'ObservaÃ§Ã£o interna' }
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
        nome: 'Comprovante de endereÃ§o.pdf',
        tipo: 'application/pdf',
        incluidoEm: '2026-06-20T14:27:00',
        validade: '2026-12-20'
      }
    ],
    empresas: [
      { nome: 'Rocha ServiÃ§os Digitais', vinculo: 'Titular do pedido', status: 'ativo' }
    ],
    pedidos: [
      {
        numero: 'PED-2389',
        produto: 'e-CPF A3',
        empresa: 'Rocha ServiÃ§os Digitais',
        status: 'Em validaÃ§Ã£o',
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
  errors: {},
  changedFields: [],
  cpfGate: { value: '', status: '', personId: '', message: '' },
  message: ''
};

function crm2CanEdit() {
  return typeof window.hubPode === 'function'
    ? window.hubPode('painel_ar', 'update')
    : crm2PfState.canEdit;
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
  const last = segments.at(-1) || '';
  return CRM2_PF_ROUTE_CODES.has(last) ? last : '';
}

function routePathCrm2(code) {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const hasHub = segments[0] === 'hub';
  return `${hasHub ? '/hub' : ''}/painel-ar/${code}`;
}

function navigateCrm2Route(code) {
  const normalized = String(code || '').trim();
  if (!CRM2_PF_ROUTE_CODES.has(normalized)) return;
  window.history.pushState({}, '', routePathCrm2(normalized));
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

function maskPhoneCrm2(value = '') {
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
  if (!value) return 'â€”';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTimeCrm2(value = '') {
  if (!value) return 'â€”';
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
  return 'vÃ¡lido';
}

function attachmentStatusClassCrm2(status = '') {
  return normalizeSearchCrm2(status).replace(/\s+/g, '-');
}

function registerTimelineCrm2(person, description, type = 'AtualizaÃ§Ã£o') {
  if (!person) return;
  const now = new Date().toISOString();
  person.timeline = [
    ...(Array.isArray(person.timeline) ? person.timeline : []),
    { data: now, usuario: 'UsuÃ¡rio atual', descricao: description, tipo: type }
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

// --- src/hub/crm2Phase2.part2.js ---
function renderListStateCrm2() {
  const state = crm2PfState.listState;
  if (state === 'normal') return '';
  const settings = {
    loading: ['Carregando pessoas fÃ­sicas...', 'Estado de carregamento simulado para homologaÃ§Ã£o.', 'Concluir simulaÃ§Ã£o'],
    error: ['NÃ£o foi possÃ­vel carregar a lista.', 'Erro simulado. Nenhuma integraÃ§Ã£o foi acionada.', 'Tentar novamente'],
    empty: ['Nenhuma pessoa fÃ­sica cadastrada.', 'Estado de lista vazia simulado para homologaÃ§Ã£o.', 'Voltar Ã  lista mockada']
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
    <div class="crm2-pessoas-pagination" aria-label="PaginaÃ§Ã£o de pessoas fÃ­sicas">
      <span>PÃ¡gina <strong>${crm2PfState.page}</strong> de <strong>${totalPages}</strong> Â· ${totalItems} registro(s)</span>
      <div>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page - 1})" ${crm2PfState.page <= 1 ? 'disabled' : ''}>Anterior</button>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page + 1})" ${crm2PfState.page >= totalPages ? 'disabled' : ''}>PrÃ³xima</button>
      </div>
    </div>
  `;
}

function renderPeopleListCrm2() {
  const items = filteredPeopleCrm2();
  const { totalPages, pageItems } = paginatedPeopleCrm2(items);
  const origins = [...new Set(crm2PfState.items.map((item) => item.origem).filter(Boolean))];
  const hasFilters = Boolean(
    crm2PfState.search
    || crm2PfState.statusFilter
    || crm2PfState.originFilter
  );
  const specialState = crm2PfState.listState !== 'normal';

  return `
    <section class="admin-panel crm2-pessoas-page hub-modal-scope" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoas-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 Â· CRM 2.0</span>
          <h3 id="crm2-pessoas-title">Pessoas fÃ­sicas</h3>
          <p>Cadastro central do relacionamento do AR Transmares. Todos os dados desta fase existem apenas em memÃ³ria.</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
          <button class="save-btn" type="button" onclick="window.crm2PfOpenForm('create')" ${!crm2CanEdit() ? 'disabled' : ''}>Nova pessoa fÃ­sica</button>
        </div>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <form class="ar-crm-list-filters" role="search" onsubmit="crm2PfApplyFilters(event)">
        <label>
          <span>Buscar</span>
          <input class="config-input" type="search" placeholder="Nome, CPF, telefone ou e-mail" value="${escapeAttrCrm2(crm2PfState.search)}" oninput="crm2PfSetSearch(this.value)">
        </label>
        <label>
          <span>Status</span>
          <select class="config-input" onchange="crm2PfSetFilter('status', this.value)">
            <option value="">Todos os status</option>
            <option value="cliente ativo" ${crm2PfState.statusFilter === 'cliente ativo' ? 'selected' : ''}>Cliente ativo</option>
            <option value="cliente inativo" ${crm2PfState.statusFilter === 'cliente inativo' ? 'selected' : ''}>Cliente inativo</option>
          </select>
        </label>
        <label>
          <span>Origem</span>
          <select class="config-input" onchange="crm2PfSetFilter('origin', this.value)">
            <option value="">Todas as origens</option>
            ${origins.map((origin) => `<option value="${escapeAttrCrm2(origin)}" ${crm2PfState.originFilter === origin ? 'selected' : ''}>${escapeHtmlCrm2(origin)}</option>`).join('')}
          </select>
        </label>
        <button class="save-btn" type="submit">Aplicar filtros</button>
        <button class="secondary-btn" type="button" onclick="crm2PfClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button>
      </form>

      <div class="crm2-pessoas-summary" aria-live="polite">
        <strong>${specialState ? 0 : items.length}</strong>
        <span>${specialState ? 'registros no estado simulado' : 'pessoas fÃ­sicas encontradas'}</span>
      </div>

      ${specialState ? renderListStateCrm2() : pageItems.length ? `
        <div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap">
          <table class="ar-crm-phase1-table crm2-pessoas-table" aria-describedby="crm2-pessoas-table-caption">
            <caption id="crm2-pessoas-table-caption" class="crm2-pessoas-table-caption">Pessoas fisicas cadastradas no CRM 2.0</caption>
            <thead>
              <tr>
                <th>Nome completo/nome social</th>
                <th id="crm2-pf-col-cpf" scope="col">CPF</th>
                <th id="crm2-pf-col-phone" scope="col">Telefone</th>
                <th id="crm2-pf-col-email" scope="col">E-mail</th>
                <th>Ãšltima atualizaÃ§Ã£o</th>
                <th>AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((item) => `
                <tr>
                  <td><strong>${escapeHtmlCrm2(item.nome)}</strong><small>${escapeHtmlCrm2(personStatusLabelCrm2(item))}</small></td>
                  <td headers="crm2-pf-col-cpf">${escapeHtmlCrm2(maskCpfCrm2(item.cpf))}</td>
                  <td>${escapeHtmlCrm2(maskPhoneCrm2(item.telefone) || 'â€”')}</td>
                  <td>${escapeHtmlCrm2(item.email || 'â€”')}</td>
                  <td>${escapeHtmlCrm2(formatDateTimeCrm2(item.atualizadoEm))}</td>
                  <td>
                    <div class="hub-row-actions">
                      <details class="hub-row-actions-menu" data-hub-action-menu data-hub-action-min-width="120" data-hub-action-max-width="190" data-hub-action-gap="6">
                        <summary class="icon-action-btn hub-quick-actions-trigger" aria-label="AÃ§Ãµes rÃ¡pidas de ${escapeAttrCrm2(item.nome)}" title="AÃ§Ãµes rÃ¡pidas">â‹®</summary>
                        <div class="hub-row-actions-popover" data-hub-action-popover role="menu">
                          <button type="button" role="menuitem" onclick="crm2PfOpenDetail('${escapeAttrCrm2(item.id)}')">Visualizar</button>
                          <button type="button" role="menuitem" onclick="crm2PfEdit('${escapeAttrCrm2(item.id)}')" ${!crm2CanEdit() ? 'disabled' : ''}>Editar</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationCrm2(totalPages, items.length)}
      ` : `
        <div class="crm2-pessoas-state" role="status" aria-live="polite">
          <strong>${crm2PfState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa fÃ­sica cadastrada.'}</strong>
          <span>${crm2PfState.items.length ? 'Ajuste os filtros ou limpe a busca para visualizar os registros mockados.' : 'A lista mockada ainda nÃ£o possui pessoas fÃ­sicas cadastradas.'}</span>
          <button class="secondary-btn" type="button" onclick="crm2PfClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button>
        </div>
      `}
    </section>
  `;
}

function renderPersonDataCrm2(person) {
  const attachments = person.anexos || [];
  return `
    <div class="crm2-pf-detail-grid">
      ${[
        ['Nome', person.nome],
        ['CPF', maskCpfCrm2(person.cpf)],
        ['CEI/CAEPF', person.cei || 'â€”'],
        ['Data de nascimento', formatDateCrm2(person.nascimento)],
        ['Telefone', maskPhoneCrm2(person.telefone) || 'â€”'],
        ['E-mail', person.email || 'â€”'],
        ['Origem', person.origem || 'â€”'],
        ['Parceiro de indicaÃ§Ã£o', person.parceiro || 'â€”'],
        ['Status automÃ¡tico', personStatusLabelCrm2(person)],
        ['Data de cadastro', formatDateTimeCrm2(person.cadastroEm)],
        ['Ãšltima atualizaÃ§Ã£o', formatDateTimeCrm2(person.atualizadoEm)]
      ].map(([label, value]) => `<div><span>${escapeHtmlCrm2(label)}</span><strong>${escapeHtmlCrm2(value)}</strong></div>`).join('')}
      <div class="is-wide"><span>ObservaÃ§Ãµes</span><strong>${escapeHtmlCrm2(person.observacoes || 'â€”')}</strong></div>
    </div>

    <section class="crm2-pf-attachments-section" aria-labelledby="crm2-pf-attachments-title">
      <div class="admin-panel-header crm2-pf-subheader">
        <div>
          <h4 id="crm2-pf-attachments-title">Anexos mockados</h4>
          <p>Os arquivos selecionados nÃ£o sÃ£o enviados para nenhum serviÃ§o.</p>
        </div>
      </div>

      ${crm2CanEdit() ? `
        <form class="crm2-pf-attachment-add" onsubmit="crm2PfAddAttachment(event, '${escapeAttrCrm2(person.id)}')">
          <label><span>Arquivo</span><input class="config-input" type="file" name="arquivo" required></label>
          <label><span>Validade opcional</span><input class="config-input" type="date" name="validade"></label>
          <button class="secondary-btn" type="submit">Incluir anexo</button>
        </form>
      ` : ''}

      <div class="crm2-pf-related-list">
        ${attachments.length ? attachments.map((attachment, index) => {
          const status = attachmentStatusCrm2(attachment.validade);
          return `
            <article class="crm2-pf-attachment">
              <div class="crm2-pf-attachment-copy">
                <strong>${escapeHtmlCrm2(attachment.nome)}</strong>
                <span>${escapeHtmlCrm2(attachment.tipo || 'Arquivo')} Â· IncluÃ­do em ${escapeHtmlCrm2(formatDateTimeCrm2(attachment.incluidoEm))}</span>
                <span>Validade: ${escapeHtmlCrm2(formatDateCrm2(attachment.validade))}</span>
              </div>
              <span class="crm2-pf-attachment-status is-${escapeAttrCrm2(attachmentStatusClassCrm2(status))}">${escapeHtmlCrm2(status)}</span>
              ${crm2CanEdit() ? `
                <div class="crm2-pf-attachment-actions">
                  <label class="secondary-btn crm2-pf-replace-label">
                    Substituir
                    <input class="crm2-visually-hidden-input" type="file" onchange="crm2PfReplaceAttachment(this, '${escapeAttrCrm2(person.id)}', ${index})">
                  </label>
                  <button class="secondary-btn" type="button" onclick="crm2PfRemoveAttachment('${escapeAttrCrm2(person.id)}', ${index})">Remover</button>
                </div>
              ` : ''}
            </article>
          `;
        }).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum anexo.</strong><span>Estado vazio preparado para arquivos futuros.</span></div>'}
      </div>
    </section>
  `;
}

function renderTimelineCrm2(person) {
  const events = [...(person.timeline || [])].sort((a, b) => new Date(b.data) - new Date(a.data));
  return `
              ${crm2CanEdit() ? `
      <form class="crm2-pf-timeline-composer" onsubmit="crm2PfAddNote(event, '${escapeAttrCrm2(person.id)}')">
        <label>
          <span>ObservaÃ§Ã£o interna</span>
          <textarea class="config-input" name="observacao" rows="3" placeholder="Registre uma interaÃ§Ã£o mockada" required></textarea>
        </label>
        <button class="secondary-btn" type="submit">Adicionar Ã  timeline</button>
      </form>
    ` : ''}
    <div class="crm2-pf-timeline">
      ${events.length ? events.map((event) => `
        <article class="crm2-pf-timeline-item">
          <span>${escapeHtmlCrm2(event.tipo || 'Evento')}</span>
          <strong>${escapeHtmlCrm2(event.descricao || '')}</strong>
          <p><span>${escapeHtmlCrm2(formatDateTimeCrm2(event.data))}</span><span>${escapeHtmlCrm2(event.usuario || 'Sistema')}</span></p>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum evento.</strong><span>A timeline serÃ¡ preenchida pelas interaÃ§Ãµes mockadas.</span></div>'}
    </div>
  `;
}

function renderCompaniesCrm2(person) {
  const companies = person.empresas || [];
  return `
    <div class="crm2-pf-related-list">
      ${companies.length ? companies.map((company, index) => `
        <article>
          <div><strong>${escapeHtmlCrm2(company.nome)}</strong><span>${escapeHtmlCrm2(company.vinculo || 'VÃ­nculo nÃ£o informado')} Â· ${escapeHtmlCrm2(company.status || 'â€”')}</span></div>
          <button class="secondary-btn" type="button" onclick="crm2PfViewCompany(${index})">Ver empresa</button>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma empresa vinculada.</strong><span>A criaÃ§Ã£o e o detalhe de PJ serÃ£o habilitados na Fase 3.</span></div>'}
    </div>
  `;
}

function renderOrdersCrm2(person) {
  const orders = person.pedidos || [];
  return `
    <div class="crm2-pf-related-list">
      ${orders.length ? orders.map((order) => `
        <article>
          <div>
            <strong>${escapeHtmlCrm2(order.numero || 'Pedido')}</strong>
            <span>${escapeHtmlCrm2(order.produto || 'Produto nÃ£o informado')} Â· ${escapeHtmlCrm2(order.empresa || 'Sem empresa vinculada')}</span>
            <span>${escapeHtmlCrm2(order.status || 'â€”')} Â· Vencimento ${escapeHtmlCrm2(formatDateCrm2(order.vencimento))}</span>
          </div>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>A criaÃ§Ã£o de pedidos serÃ¡ habilitada em fase posterior.</span></div>'}
    </div>
  `;
}

function renderPersonDetailCrm2(person) {
  if (!person) {
    crm2PfState.detailId = '';
    return renderPeopleListCrm2();
  }
  const tabs = [
    ['dados', 'Dados cadastrais'],
    ['timeline', 'Timeline'],
    ['empresas', 'Empresas vinculadas'],
    ['pedidos', 'Pedidos']
  ];
  const lastActivity = [...(person.timeline || [])].sort((a, b) => new Date(b.data) - new Date(a.data))[0]?.data || person.atualizadoEm;
  const content = {
    dados: renderPersonDataCrm2(person),
    timeline: renderTimelineCrm2(person),
    empresas: renderCompaniesCrm2(person),
    pedidos: renderOrdersCrm2(person)
  }[crm2PfState.detailTab] || renderPersonDataCrm2(person);

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-detail-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">PESSOA FÃSICA Â· MOCK</span>
          <h3 id="crm2-pessoa-detail-title">${escapeHtmlCrm2(person.nome)}</h3>
          <p>${escapeHtmlCrm2(maskCpfCrm2(person.cpf))} Â· ${escapeHtmlCrm2(personStatusLabelCrm2(person))}</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCloseDetail()">Voltar Ã  lista</button>
          <button class="save-btn" type="button" onclick="crm2PfEdit('${escapeAttrCrm2(person.id)}')" ${!crm2CanEdit() ? 'disabled' : ''}>Editar</button>
        </div>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <div class="crm2-pf-summary-grid">
        <article><span>Status atual</span><strong>${escapeHtmlCrm2(personStatusLabelCrm2(person))}</strong></article>
        <article><span>Empresas</span><strong>${(person.empresas || []).length}</strong></article>
        <article><span>Pedidos</span><strong>${(person.pedidos || []).length}</strong></article>
        <article><span>Anexos</span><strong>${(person.anexos || []).length}</strong></article>
        <article><span>Ãšltima atividade</span><strong>${escapeHtmlCrm2(formatDateTimeCrm2(lastActivity))}</strong></article>
      </div>

      <div class="module-tabs crm2-pf-tabs" role="tablist" aria-label="Detalhes da pessoa fÃ­sica">
        ${tabs.map(([id, label]) => `<button class="${crm2PfState.detailTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${crm2PfState.detailTab === id}" onclick="crm2PfSelectTab('${id}')">${escapeHtmlCrm2(label)}</button>`).join('')}
      </div>

      <div class="crm2-pf-tab-content">${content}</div>
    </section>
  `;
}

function formFieldCrm2({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '' }) {
  const changed = crm2PfState.changedFields.includes(name) ? 'is-changed' : '';
  const error = crm2PfState.errors[name] || '';
  const input = type === 'textarea'
    ? `<textarea class="config-input" name="${name}" rows="4" placeholder="${escapeAttrCrm2(placeholder)}" oninput="crm2PfTrackChange(this)">${escapeHtmlCrm2(value)}</textarea>`
    : `<input class="config-input" type="${type}" name="${name}" value="${escapeAttrCrm2(value)}" placeholder="${escapeAttrCrm2(placeholder)}" ${required ? 'required' : ''} ${extra} oninput="crm2PfTrackChange(this)">`;
  return `
    <label class="${wide ? 'is-wide' : ''} ${changed}">
      <span>${escapeHtmlCrm2(label)}${required ? ' *' : ''}</span>
      ${input}
      ${error ? `<small class="crm2-field-error">${escapeHtmlCrm2(error)}</small>` : ''}
    </label>
  `;
}

// --- src/hub/crm2Phase2.part3.js ---
function renderCpfGateCrm2() {
  const gate = crm2PfState.cpfGate;
  return `
    <div class="modal-backdrop crm2-pf-cpf-modal" role="dialog" aria-modal="true" aria-labelledby="crm2-cpf-check-title" aria-describedby="crm2-cpf-check-description" onclick="if(event.target === this) crm2PfCloseForm()">
      <section class="small-modal">
        <div class="small-modal-header">
        <div>
          <span class="ar-crm-phase1-kicker">NOVO CADASTRO Â· ETAPA PRÃ‰VIA</span>
          <h3 id="crm2-cpf-check-title">Buscar CPF</h3>
          <p id="crm2-cpf-check-description">Consulte os registros mockados antes de iniciar um novo cadastro.</p>
        </div>
        <button class="icon-btn" type="button" onclick="crm2PfCloseForm()" aria-label="Fechar" title="Fechar">Ã—</button>
        </div>
      <form class="crm2-pf-cpf-search" onsubmit="crm2PfSearchCpf(event)" novalidate>
        <label>
          <span>CPF</span>
          <input class="config-input" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" value="${escapeAttrCrm2(maskCpfCrm2(gate.value))}" oninput="crm2PfMaskCpf(this)" required autofocus>
        </label>
        <div class="small-modal-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
          <button class="save-btn" type="submit">Buscar CPF</button>
        </div>
      </form>
      ${gate.status ? `
        <div class="crm2-pf-cpf-result is-${escapeAttrCrm2(gate.status)}" role="status">
          <strong>${escapeHtmlCrm2(gate.message)}</strong>
          ${gate.status === 'found' ? `<button class="secondary-btn" type="button" onclick="crm2PfOpenDetail('${escapeAttrCrm2(gate.personId)}')">Abrir cadastro existente</button>` : ''}
          ${gate.status === 'not-found' ? '<button class="save-btn" type="button" onclick="crm2PfContinueCpf()">Cadastrar nova pessoa</button>' : ''}
        </div>
      ` : ''}
      </section>
    </div>
  `;
}

function renderPersonFormCrm2() {
  const editing = crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const statusLabel = personStatusLabelCrm2(person || { pedidos: [] });

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">${editing ? 'EDIÃ‡ÃƒO' : 'NOVO CADASTRO'} Â· MOCK</span>
          <h3 id="crm2-pessoa-form-title">${editing ? 'Editar pessoa fÃ­sica' : 'Nova pessoa fÃ­sica'}</h3>
          <p>O salvamento acontece somente no estado local da pÃ¡gina.</p>
        </div>
        <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <form class="crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate>
        <div class="crm2-pf-form-grid">
          <label class="crm2-pf-status-automatico">
            <span>Status automÃ¡tico</span>
            <input class="config-input" type="text" value="${escapeAttrCrm2(statusLabel)}" disabled>
            <small>Calculado de acordo com os pedidos ativos e vencidos.</small>
          </label>
          ${formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true })}
          ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf), required: true, extra: 'inputmode="numeric" maxlength="14" onkeyup="crm2PfMaskCpf(this)"' })}
          ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
          ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"' })}
          ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
          ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem })}
          ${formFieldCrm2({ label: 'Parceiro de indicaÃ§Ã£o', name: 'parceiro', value: values.parceiro })}
          ${formFieldCrm2({ label: 'ObservaÃ§Ãµes', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}
        </div>

        <fieldset class="crm2-pf-attachments-mock">
          <legend>Anexo opcional</legend>
          <p>A seleÃ§Ã£o valida o fluxo visual, mas o arquivo nÃ£o Ã© enviado.</p>
          <div class="crm2-pf-form-attachment-fields">
            <label><span>Arquivo</span><input class="config-input" type="file" name="anexoArquivo"></label>
            <label><span>Validade</span><input class="config-input" type="date" name="anexoValidade"></label>
          </div>
          ${editing && (person?.anexos || []).length ? `<div class="crm2-pf-form-existing-attachments"><strong>Anexos atuais</strong>${person.anexos.map((attachment) => `<span>${escapeHtmlCrm2(attachment.nome)}</span>`).join('')}</div>` : ''}
        </fieldset>

        <div class="admin-panel-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCloseForm()">Cancelar</button>
          <button class="primary-btn" type="submit">Salvar apenas em memÃ³ria</button>
        </div>
      </form>
    </section>
  `;
}

function renderCrm2Phase2() {
  if (crm2PfState.formMode === 'cpf-check') {
    const list = renderPeopleListCrm2();
    const modal = renderCpfGateCrm2().replace('modal-backdrop crm2-pf-cpf-modal', 'modal-backdrop hub-modal-backdrop--contained crm2-pf-cpf-modal');
    const closingTag = list.lastIndexOf('</section>');
    return `${list.slice(0, closingTag)}${modal}${list.slice(closingTag)}`;
  }
  if (crm2PfState.formMode) return renderPersonFormCrm2();
  if (crm2PfState.detailId) return renderPersonDetailCrm2(getPersonCrm2(crm2PfState.detailId));
  return renderPeopleListCrm2();
}

function renderIntoCurrentCrm2Target() {
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return false;
  if (!crm2PfState.mounted) {
    crm2PfState.mounted = true;
  }
  target.outerHTML = renderCrm2Phase2();
  enhancePeopleTableCrm2();
  return true;
}

function enhancePeopleTableCrm2() {
  const table = document.querySelector('.crm2-pessoas-table');
  if (!table) return;

  const columnIds = [
    'crm2-pf-col-name',
    'crm2-pf-col-cpf',
    'crm2-pf-col-phone',
    'crm2-pf-col-email',
    'crm2-pf-col-updated',
    'crm2-pf-col-actions'
  ];
  const columnLabels = [
    'Nome completo/nome social',
    'CPF',
    'Telefone',
    'E-mail',
    'Ãšltima atualizaÃ§Ã£o',
    'AÃ§Ãµes'
  ];
  const caption = table.querySelector('caption');
  if (caption) caption.textContent = 'Pessoas fÃ­sicas cadastradas no CRM 2.0';

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
    if (status) status.textContent = 'DisponÃ­vel';
  }

  const primaryAction = panel.querySelector('.crm2-phase1-actions .primary-btn');
  if (primaryAction) {
    primaryAction.disabled = false;
    primaryAction.textContent = 'Abrir Pessoas fÃ­sicas';
    primaryAction.setAttribute('onclick', "navegarParaCrm2Rota('201')");
  }

  const kicker = panel.querySelector('.ar-crm-phase1-kicker');
  if (kicker) kicker.textContent = 'FASES 1 E 2 Â· MOCK FUNCIONAL';
  panel.dataset.crm2Phase2Overview = 'true';
}

function mountCrm2Phase2() {
  const code = currentRouteCodeCrm2();
  if (code === '200') {
    resetFormCrm2();
    setMessageCrm2('');
    enhanceCrm2Overview();
    return;
  }
  if (code !== '201') return;
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target || target.dataset.crm2Phase2Enhanced === 'true') return;
  renderIntoCurrentCrm2Target();
}

function rerenderCrm2Phase2() {
  if (currentRouteCodeCrm2() !== '201') return;
  const target = document.querySelector('.crm2-pessoas-page');
  if (!target) return;
  target.outerHTML = renderCrm2Phase2();
  enhancePeopleTableCrm2();
}

function setMessageCrm2(message = '') {
  crm2PfState.message = message;
}

function resetFormCrm2() {
  crm2PfState.formMode = '';
  crm2PfState.draft = {};
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
}

function openFormCrm2(mode, id = '') {
  if (!crm2CanEdit()) return;
  crm2PfState.errors = {};
  crm2PfState.changedFields = [];
  crm2PfState.message = '';
  if (mode === 'edit') {
    const person = getPersonCrm2(id || crm2PfState.detailId);
    if (!person) return;
    crm2PfState.detailId = person.id;
    crm2PfState.formMode = 'edit';
    crm2PfState.draft = {};
  } else {
    crm2PfState.detailId = '';
    crm2PfState.formMode = 'cpf-check';
    crm2PfState.cpfGate = { value: '', status: '', personId: '', message: '' };
    crm2PfState.draft = {};
  }
  rerenderCrm2Phase2();
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
    parceiro: 'Parceiro de indicaÃ§Ã£o',
    observacoes: 'ObservaÃ§Ãµes'
  };
  return Object.entries(labels).flatMap(([field, label]) => {
    if (normalizeComparableCrm2(field, original[field]) === normalizeComparableCrm2(field, updated[field])) return [];
    return [`${label} â€” De: ${original[field] || 'â€”'}; Para: ${updated[field] || 'â€”'}`];
  });
}

function fileToAttachmentCrm2(file, expiration = '') {
  return {
    nome: file?.name || 'Arquivo selecionado',
    tipo: file?.type || file?.name?.split('.').pop()?.toUpperCase() || 'Arquivo',
    incluidoEm: new Date().toISOString(),
    validade: expiration
  };
}

function savePersonCrm2(event) {
  event.preventDefault();
  if (!crm2CanEdit()) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const file = form.elements.anexoArquivo?.files?.[0] || null;
  const attachmentExpiration = String(data.get('anexoValidade') || '');
  data.delete('anexoArquivo');
  data.delete('anexoValidade');
  const values = Object.fromEntries(data.entries());
  values.nome = String(values.nome || '').trim();
  values.cpf = String(values.cpf || '').replace(/\D/g, '');
  values.telefone = maskPhoneCrm2(values.telefone || '');
  values.email = String(values.email || '').trim();

  const errors = {};
  if (!values.nome) errors.nome = 'Informe o nome completo ou nome social.';
  if (!validateCpfCrm2(values.cpf)) errors.cpf = 'Informe um CPF vÃ¡lido.';
  if (!validateEmailCrm2(values.email)) errors.email = 'Informe um e-mail vÃ¡lido.';
  if (values.nascimento && new Date(`${values.nascimento}T00:00:00`) > new Date()) errors.nascimento = 'A data de nascimento nÃ£o pode estar no futuro.';
  if (crm2PfState.items.some((item) => item.cpf === values.cpf && (crm2PfState.formMode !== 'edit' || item.id !== crm2PfState.detailId))) {
    errors.cpf = 'JÃ¡ existe uma pessoa fÃ­sica mockada com este CPF.';
  }

  if (Object.keys(errors).length) {
    crm2PfState.errors = errors;
    crm2PfState.draft = { ...crm2PfState.draft, ...values };
    setMessageCrm2('Revise os campos destacados.');
    rerenderCrm2Phase2();
    return;
  }

  const now = new Date().toISOString();
  const newAttachment = file ? fileToAttachmentCrm2(file, attachmentExpiration) : null;

  if (crm2PfState.formMode === 'edit') {
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changes = describeChangesCrm2(person, values);
    Object.assign(person, values, { atualizadoEm: now });
    if (newAttachment) person.anexos = [...(person.anexos || []), newAttachment];
    if (changes.length) registerTimelineCrm2(person, `Dados atualizados. ${changes.join(' | ')}`, 'AtualizaÃ§Ã£o');
    if (newAttachment) registerTimelineCrm2(person, `Anexo incluÃ­do: ${newAttachment.nome}.`, 'Anexo');
    setMessageCrm2(changes.length || newAttachment
      ? 'Pessoa fÃ­sica atualizada no estado mockado. Nenhum dado foi persistido.'
      : 'Nenhuma alteraÃ§Ã£o foi identificada.');
  } else {
    const id = `pf-mock-${Date.now()}`;
    const person = {
      ...values,
      id,
      cadastroEm: now,
      atualizadoEm: now,
      anexos: newAttachment ? [newAttachment] : [],
      empresas: [],
      pedidos: [],
      timeline: [{ data: now, usuario: 'UsuÃ¡rio atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
    };
    if (newAttachment) person.timeline.push({ data: now, usuario: 'UsuÃ¡rio atual', descricao: `Anexo incluÃ­do: ${newAttachment.nome}.`, tipo: 'Anexo' });
    crm2PfState.items.unshift(person);
    crm2PfState.detailId = id;
    setMessageCrm2('Pessoa fÃ­sica criada no estado mockado. Nenhum dado foi persistido.');
  }

  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  rerenderCrm2Phase2();
}

// --- src/hub/crm2Phase2.part4.js ---
Object.assign(window, {
  crm2PfRender: renderCrm2Phase2,
  navegarParaCrm2Rota: navigateCrm2Route,
  crm2PfOpenForm: openFormCrm2,
  crm2PfCloseForm() {
    resetFormCrm2();
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfSearchCpf(event) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('cpf') || '').replace(/\D/g, '');
    crm2PfState.cpfGate.value = value;
    if (!validateCpfCrm2(value)) {
      Object.assign(crm2PfState.cpfGate, { status: 'invalid', personId: '', message: 'Informe um CPF vÃ¡lido para continuar.' });
    } else {
      const person = crm2PfState.items.find((item) => item.cpf === value);
      if (person) {
        Object.assign(crm2PfState.cpfGate, { status: 'found', personId: person.id, message: 'CPF jÃ¡ cadastrado. A criaÃ§Ã£o de duplicidade foi bloqueada.' });
      } else {
        Object.assign(crm2PfState.cpfGate, { status: 'not-found', personId: '', message: 'CPF nÃ£o encontrado. O novo cadastro pode ser iniciado.' });
      }
    }
    rerenderCrm2Phase2();
  },
  crm2PfContinueCpf() {
    if (!crm2CanEdit() || crm2PfState.cpfGate.status !== 'not-found') return;
    crm2PfState.formMode = 'create';
    crm2PfState.draft = { cpf: crm2PfState.cpfGate.value };
    crm2PfState.errors = {};
    rerenderCrm2Phase2();
  },
  crm2PfMaskCpf(input) {
    input.value = maskCpfCrm2(input.value);
  },
  crm2PfMaskPhone(input) {
    input.value = maskPhoneCrm2(input.value);
  },
  crm2PfTrackChange(input) {
    if (crm2PfState.formMode !== 'edit' || !input?.name) return;
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changed = normalizeComparableCrm2(input.name, input.value) !== normalizeComparableCrm2(input.name, person[input.name]);
    const fields = new Set(crm2PfState.changedFields);
    if (changed) fields.add(input.name); else fields.delete(input.name);
    crm2PfState.changedFields = [...fields];
    input.closest('label')?.classList.toggle('is-changed', changed);
  },
  crm2PfSave: savePersonCrm2,
  crm2PfOpenDetail(id) {
    if (!getPersonCrm2(id)) return;
    resetFormCrm2();
    crm2PfState.detailId = id;
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfCloseDetail() {
    crm2PfState.detailId = '';
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfEdit(id) {
    openFormCrm2('edit', id);
  },
  crm2PfSelectTab(tab) {
    if (!['dados', 'timeline', 'empresas', 'pedidos'].includes(tab)) return;
    crm2PfState.detailTab = tab;
    setMessageCrm2('');
    rerenderCrm2Phase2();
  },
  crm2PfSetSearch(value) {
    crm2PfState.search = String(value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
    window.requestAnimationFrame(() => {
      const input = document.querySelector('.ar-crm-list-filters input[type="search"]');
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  },
  crm2PfApplyFilters(event) {
    event?.preventDefault();
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfSetFilter(type, value) {
    if (type === 'status') crm2PfState.statusFilter = String(value || '');
    if (type === 'origin') crm2PfState.originFilter = String(value || '');
    if (type === 'date') crm2PfState.registrationDateFilter = String(value || '');
    crm2PfState.page = 1;
    rerenderCrm2Phase2();
  },
  crm2PfClearFilters() {
    Object.assign(crm2PfState, { search: '', statusFilter: '', originFilter: '', registrationDateFilter: '', page: 1 });
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
    event.preventDefault();
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const note = String(new FormData(event.currentTarget).get('observacao') || '').trim();
    if (!person || !note) return;
    registerTimelineCrm2(person, `ObservaÃ§Ã£o interna adicionada: ${note}`, 'ObservaÃ§Ã£o interna');
    setMessageCrm2('ObservaÃ§Ã£o adicionada Ã  timeline mockada.');
    rerenderCrm2Phase2();
  },
  crm2PfAddAttachment(event, personId) {
    event.preventDefault();
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const file = event.currentTarget.elements.arquivo?.files?.[0];
    const expiration = String(event.currentTarget.elements.validade?.value || '');
    if (!person || !file) return;
    const attachment = fileToAttachmentCrm2(file, expiration);
    person.anexos = [...(person.anexos || []), attachment];
    registerTimelineCrm2(person, `Anexo incluÃ­do: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo incluÃ­do apenas no estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfReplaceAttachment(input, personId, index) {
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const file = input?.files?.[0];
    const previous = person?.anexos?.[index];
    if (!person || !file || !previous) return;
    const replacement = fileToAttachmentCrm2(file, previous.validade || '');
    person.anexos.splice(index, 1, replacement);
    registerTimelineCrm2(person, `Anexo substituÃ­do: ${previous.nome} â†’ ${replacement.nome}.`, 'Anexo');
    setMessageCrm2('Anexo substituÃ­do apenas no estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfRemoveAttachment(personId, index) {
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const attachment = person?.anexos?.[index];
    if (!person || !attachment) return;
    if (!window.confirm(`Remover o anexo â€œ${attachment.nome}â€ do estado mockado?`)) return;
    person.anexos.splice(index, 1);
    registerTimelineCrm2(person, `Anexo removido: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo removido apenas do estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfViewCompany(index) {
    const person = getPersonCrm2(crm2PfState.detailId);
    const company = person?.empresas?.[index];
    if (!company) return;
    setMessageCrm2(`A visualizaÃ§Ã£o de ${company.nome} serÃ¡ habilitada na Fase 3 â€” Pessoa JurÃ­dica.`);
    rerenderCrm2Phase2();
  }
});

const crm2Observer = new MutationObserver(() => {
  if (!currentRouteCodeCrm2()) return;
  window.requestAnimationFrame(mountCrm2Phase2);
});

crm2Observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', () => window.setTimeout(mountCrm2Phase2, 0));
window.addEventListener('DOMContentLoaded', mountCrm2Phase2, { once: true });
window.setTimeout(mountCrm2Phase2, 0);

// --- src/hub/crm2Phase2Permissions.js ---
import { obterContextoAcessoHub, observarContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

(() => {

  crm2PfState.canView = false;
  crm2PfState.canEdit = false;
  crm2PfState.canDelete = false;

  const originalRenderPeopleListCrm2 = renderPeopleListCrm2;
  const originalRenderPersonDetailCrm2 = renderPersonDetailCrm2;
  const originalRenderPersonDataCrm2 = renderPersonDataCrm2;

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

  function applyAttachmentPermissionsCrm2(html = '') {
    if (crm2PfState.canDelete) return html;
    return String(html).replace(
      /<button class="secondary-btn" type="button" onclick="crm2PfRemoveAttachment\('[^']+',\s*\d+\)">Remover<\/button>/g,
      ''
    );
  }

  renderPeopleListCrm2 = function renderPeopleListWithPermissionsCrm2() {
    return injectRowPermissionsCrm2(originalRenderPeopleListCrm2());
  };

  renderPersonDetailCrm2 = function renderPersonDetailWithPermissionsCrm2(person) {
    return injectDetailPermissionsCrm2(originalRenderPersonDetailCrm2(person), person || {});
  };

  renderPersonDataCrm2 = function renderPersonDataWithPermissionsCrm2(person) {
    return applyAttachmentPermissionsCrm2(originalRenderPersonDataCrm2(person));
  };

  window.crm2PfDelete = function crm2PfDelete(personId) {
    if (!crm2PfState.canDelete) return;
    const person = getPersonCrm2(personId);
    if (!person) return;

    const confirmed = window.confirm(
      `Excluir â€œ${person.nome}â€ apenas do estado mockado desta pÃ¡gina? Nenhum dado externo serÃ¡ alterado.`
    );
    if (!confirmed) return;

    crm2PfState.items = crm2PfState.items.filter((item) => item.id !== personId);
    if (crm2PfState.detailId === personId) {
      crm2PfState.detailId = '';
      crm2PfState.detailTab = 'dados';
    }
    resetFormCrm2();
    setMessageCrm2('Pessoa fÃ­sica excluÃ­da apenas do estado mockado. Nenhum dado foi persistido.');
    rerenderCrm2Phase2();
  };

  const originalRemoveAttachmentCrm2 = window.crm2PfRemoveAttachment;
  window.crm2PfRemoveAttachment = function crm2PfRemoveAttachmentWithPermission(personId, index) {
    if (!crm2PfState.canDelete) return;
    return originalRemoveAttachmentCrm2?.(personId, index);
  };

  function renderPermissionDeniedCrm2() {
    if (currentRouteCodeCrm2() !== '201') return;
    const target = document.querySelector('.crm2-pessoas-page');
    if (!target) return;
    target.outerHTML = `
      <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-access-denied-title">
        <div class="crm2-pessoas-state is-error" role="alert">
          <strong id="crm2-access-denied-title">Acesso nÃ£o autorizado.</strong>
          <span>Ã‰ necessÃ¡ria a permissÃ£o Visualizar para acessar Pessoas fÃ­sicas.</span>
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
        </div>
      </section>
    `;
  }

  function applyPermissionsCrm2(context, hasPermission) {
    const permissions = context?.permissions || {};
    const resolvePermission = (action) => typeof window.hubPode === 'function'
      ? window.hubPode('painel_ar', action)
      : hasPermission(permissions, 'painel_ar', action);
    crm2PfState.canView = resolvePermission('view');
    crm2PfState.canEdit = resolvePermission('update');
    crm2PfState.canDelete = resolvePermission('delete');

    // Compatibilidade interna com os componentes existentes da Fase 2.
    // A origem desta capacidade passa a ser exclusivamente a permissÃ£o Editar (update).

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
    console.error('NÃ£o foi possÃ­vel carregar as permissÃµes do CRM 2.0.', error);
    crm2PfState.canView = true;
    crm2PfState.canEdit = false;
    crm2PfState.canDelete = false;
  });
  */
})();

