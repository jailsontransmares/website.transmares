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
  errors: {},
  changedFields: [],
  cpfGate: { value: '', status: '', personId: '', message: '' },
  message: ''
};

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

// --- src/hub/crm2Phase2.part2.js ---
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
  const origins = [...new Set(crm2PfState.items.map((item) => item.origem).filter(Boolean))];
  const hasFilters = Boolean(
    crm2PfState.search
    || crm2PfState.statusFilter
    || crm2PfState.originFilter
  );
  const specialState = crm2PfState.listState !== 'normal';

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoas-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 · CRM 2.0</span>
          <h3 id="crm2-pessoas-title">Pessoas físicas</h3>
          <p>Cadastro central do relacionamento do AR Transmares. Todos os dados desta fase existem apenas em memória.</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
          ${crm2CanEdit() ? '<button class="save-btn" type="button" onclick="window.crm2PfOpenForm(\'create\')">+Incluir</button>' : ''}
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
        <span>${specialState ? 'registros no estado simulado' : 'pessoas físicas encontradas'}</span>
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
                <th>Última atualização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((item) => `
                <tr>
                  <td><strong>${escapeHtmlCrm2(item.nome)}</strong><small>${escapeHtmlCrm2(personStatusLabelCrm2(item))}</small></td>
                  <td headers="crm2-pf-col-cpf">${escapeHtmlCrm2(maskCpfCrm2(item.cpf))}</td>
                  <td>${escapeHtmlCrm2(maskPhoneCrm2(item.telefone) || '—')}</td>
                  <td>${escapeHtmlCrm2(item.email || '—')}</td>
                  <td>${escapeHtmlCrm2(formatDateTimeCrm2(item.atualizadoEm))}</td>
                  <td>
                    <div class="hub-row-actions">
                      <details class="hub-row-actions-menu" data-hub-action-menu data-hub-action-min-width="120" data-hub-action-max-width="190" data-hub-action-gap="6">
                        <summary class="icon-action-btn hub-quick-actions-trigger" aria-label="Ações rápidas de ${escapeAttrCrm2(item.nome)}" title="Ações rápidas">⋮</summary>
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
          <strong>${crm2PfState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa física cadastrada.'}</strong>
          <span>${crm2PfState.items.length ? 'Ajuste os filtros ou limpe a busca para visualizar os registros mockados.' : 'A lista mockada ainda não possui pessoas físicas cadastradas.'}</span>
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
        ['CEI/CAEPF', person.cei || '—'],
        ['Data de nascimento', formatDateCrm2(person.nascimento)],
        ['Telefone', maskPhoneCrm2(person.telefone) || '—'],
        ['E-mail', person.email || '—'],
        ['Origem', person.origem || '—'],
        ['Parceiro de indicação', person.parceiro || '—'],
        ['Status automático', personStatusLabelCrm2(person)],
        ['Data de cadastro', formatDateTimeCrm2(person.cadastroEm)],
        ['Última atualização', formatDateTimeCrm2(person.atualizadoEm)]
      ].map(([label, value]) => `<div><span>${escapeHtmlCrm2(label)}</span><strong>${escapeHtmlCrm2(value)}</strong></div>`).join('')}
      <div class="is-wide"><span>Observações</span><strong>${escapeHtmlCrm2(person.observacoes || '—')}</strong></div>
    </div>

    <section class="crm2-pf-attachments-section" aria-labelledby="crm2-pf-attachments-title">
      <div class="admin-panel-header crm2-pf-subheader">
        <div>
          <h4 id="crm2-pf-attachments-title">Anexos mockados</h4>
          <p>Os arquivos selecionados não são enviados para nenhum serviço.</p>
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
                <span>${escapeHtmlCrm2(attachment.tipo || 'Arquivo')} · Incluído em ${escapeHtmlCrm2(formatDateTimeCrm2(attachment.incluidoEm))}</span>
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
          <span>Observação interna</span>
          <textarea class="config-input" name="observacao" rows="3" placeholder="Registre uma interação mockada" required></textarea>
        </label>
        <button class="secondary-btn" type="submit">Adicionar à timeline</button>
      </form>
    ` : ''}
    <div class="crm2-pf-timeline">
      ${events.length ? events.map((event) => `
        <article class="crm2-pf-timeline-item">
          <span>${escapeHtmlCrm2(event.tipo || 'Evento')}</span>
          <strong>${escapeHtmlCrm2(event.descricao || '')}</strong>
          <p><span>${escapeHtmlCrm2(formatDateTimeCrm2(event.data))}</span><span>${escapeHtmlCrm2(event.usuario || 'Sistema')}</span></p>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum evento.</strong><span>A timeline será preenchida pelas interações mockadas.</span></div>'}
    </div>
  `;
}

function renderCompaniesCrm2(person) {
  const companies = person.empresas || [];
  return `
    <div class="crm2-pf-related-list">
      ${companies.length ? companies.map((company, index) => `
        <article>
          <div><strong>${escapeHtmlCrm2(company.nome)}</strong><span>${escapeHtmlCrm2(company.vinculo || 'Vínculo não informado')} · ${escapeHtmlCrm2(company.status || '—')}</span></div>
          <button class="secondary-btn" type="button" onclick="crm2PfViewCompany(${index})">Ver empresa</button>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma empresa vinculada.</strong><span>A criação e o detalhe de PJ serão habilitados na Fase 3.</span></div>'}
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
            <span>${escapeHtmlCrm2(order.produto || 'Produto não informado')} · ${escapeHtmlCrm2(order.empresa || 'Sem empresa vinculada')}</span>
            <span>${escapeHtmlCrm2(order.status || '—')} · Vencimento ${escapeHtmlCrm2(formatDateCrm2(order.vencimento))}</span>
          </div>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>A criação de pedidos será habilitada em fase posterior.</span></div>'}
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
          <span class="ar-crm-phase1-kicker">PESSOA FÍSICA · MOCK</span>
          <h3 id="crm2-pessoa-detail-title">${escapeHtmlCrm2(person.nome)}</h3>
          <p>${escapeHtmlCrm2(maskCpfCrm2(person.cpf))} · ${escapeHtmlCrm2(personStatusLabelCrm2(person))}</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('201')">Voltar à lista</button>
          ${crm2CanEdit() ? `<button class="save-btn" type="button" onclick="navegarParaCrm2Rota('201', '${escapeAttrCrm2(person.id)}/editar')">Editar</button>` : ''}
        </div>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <div class="crm2-pf-summary-grid">
        <article><span>Status atual</span><strong>${escapeHtmlCrm2(personStatusLabelCrm2(person))}</strong></article>
        <article><span>Empresas</span><strong>${(person.empresas || []).length}</strong></article>
        <article><span>Pedidos</span><strong>${(person.pedidos || []).length}</strong></article>
        <article><span>Anexos</span><strong>${(person.anexos || []).length}</strong></article>
        <article><span>Última atividade</span><strong>${escapeHtmlCrm2(formatDateTimeCrm2(lastActivity))}</strong></article>
      </div>

      <div class="module-tabs crm2-pf-tabs" role="tablist" aria-label="Detalhes da pessoa física">
        ${tabs.map(([id, label]) => `<button class="${crm2PfState.detailTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${crm2PfState.detailTab === id}" onclick="crm2PfSelectTab('${id}')">${escapeHtmlCrm2(label)}</button>`).join('')}
      </div>

      <div class="crm2-pf-tab-content">${content}</div>
    </section>
  `;
}

function formFieldCrm2({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '', formId = '' }) {
  const changed = crm2PfState.changedFields.includes(name) ? 'is-changed' : '';
  const error = crm2PfState.errors[name] || '';
  const fieldId = `crm2-pf-${name}`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? `aria-describedby="${errorId}"` : '';
  const invalid = error ? 'true' : 'false';
  const locked = crm2PfState.formMode === 'create' && crm2PfState.cpfGate.status !== 'not-found';
  const input = type === 'textarea'
    ? `<textarea id="${fieldId}" class="config-input" name="${name}" rows="4" autocomplete="off" placeholder="${escapeAttrCrm2(placeholder)}" aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${locked ? 'disabled' : ''} oninput="crm2PfTrackChange(this)">${escapeHtmlCrm2(value)}</textarea>`
    : `<input id="${fieldId}" class="config-input" type="${type}" name="${name}" autocomplete="off" value="${escapeAttrCrm2(value)}" placeholder="${escapeAttrCrm2(placeholder)}" ${required ? 'required' : ''} ${extra} aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${locked ? 'disabled' : ''} oninput="crm2PfTrackChange(this)">`;
  return `
    <label class="${wide ? 'is-wide' : ''} ${changed}">
      <span for="${fieldId}">${escapeHtmlCrm2(label)}${required ? ' *' : ''}</span>
      ${input}
      ${error ? `<small id="${errorId}" class="crm2-field-error">${escapeHtmlCrm2(error)}</small>` : ''}
    </label>
  `;
}

// --- src/hub/crm2Phase2.part3.js ---
function renderCpfVerificationCrm2(values = {}) {
  const gate = crm2PfState.cpfGate;
  const verified = gate.status === 'not-found';
  const showPersonalFields = verified;
  return `
    <section class="hub-form-section crm2-pf-cpf-verification" aria-labelledby="crm2-pf-cpf-title">
      <div class="hub-form-section-title">
        <strong id="crm2-pf-cpf-title">Dados pessoais</strong>
        <span>Identificação da pessoa física.</span>
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
        ${showPersonalFields ? formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true, formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date', formId: 'crm2-pf-form' }) : ''}
        ${showPersonalFields ? formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei, formId: 'crm2-pf-form' }) : ''}
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

function renderPersonFormCrm2() {
  const route = currentPfRouteCrm2();
  const editing = route.view === 'edit' || crm2PfState.formMode === 'edit';
  const person = editing ? getPersonCrm2(route.id || crm2PfState.detailId) : null;
  const values = { ...(person || {}), ...crm2PfState.draft };
  const verified = editing || crm2PfState.cpfGate.status === 'not-found';

  return `
    <section class="hub-form-screen crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-form-title">
      <header class="hub-form-screen-header">
        <div>
          <h2 id="crm2-pessoa-form-title">${editing ? 'Editar cadastro' : 'Incluir cadastro de Pessoa Física'}</h2>
        </div>
        <div class="crm2-pf-form-header-actions">
          ${!editing && crm2PfState.cpfGate.status === 'not-found' ? '<span class="crm2-pf-status-pill is-novo-cadastro" role="status">Novo cadastro</span>' : ''}
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Voltar para a lista</button>
        </div>
      </header>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      ${!editing ? renderCpfVerificationCrm2(values) : ''}

      <form id="crm2-pf-form" class="hub-form-screen-content crm2-pf-form" onsubmit="crm2PfSave(event)" novalidate ${verified ? '' : 'hidden'}>
        ${editing ? `<section class="hub-form-section" aria-labelledby="crm2-pf-personal-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-personal-title">Dados pessoais</strong><span>Identificação da pessoa física.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Nome completo/nome social', name: 'nome', value: values.nome, required: true })}
            ${formFieldCrm2({ label: 'CPF', name: 'cpf', value: maskCpfCrm2(values.cpf || crm2PfState.cpfGate.value), required: true, extra: 'inputmode="numeric" maxlength="14" readonly' })}
            ${formFieldCrm2({ label: 'CEI/CAEPF', name: 'cei', value: values.cei })}
            ${formFieldCrm2({ label: 'Data de nascimento', name: 'nascimento', value: values.nascimento, type: 'date' })}
          </div>
        </section>` : ''}

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-contact-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-contact-title">Contato</strong><span>Telefone e comunicação.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Telefone', name: 'telefone', value: maskPhoneCrm2(values.telefone), extra: 'inputmode="tel" maxlength="15" onkeyup="crm2PfMaskPhone(this)"' })}
            ${formFieldCrm2({ label: 'E-mail', name: 'email', value: values.email, type: 'email' })}
          </div>
        </section>

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-origin-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-origin-title">Origem e indicação</strong><span>Contexto de acompanhamento.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Origem', name: 'origem', value: values.origem })}
            ${formFieldCrm2({ label: 'Parceiro de indicação', name: 'parceiro', value: values.parceiro })}
          </div>
        </section>

        <section class="hub-form-section ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-notes-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-notes-title">Observações</strong><span>Informações complementares.</span></div>
          <div class="hub-form-grid">
            ${formFieldCrm2({ label: 'Observações', name: 'observacoes', value: values.observacoes, type: 'textarea', wide: true })}
          </div>
        </section>

        <section class="hub-form-section crm2-pf-attachments-mock ${verified ? '' : 'is-disabled'}" aria-labelledby="crm2-pf-attachments-title">
          <div class="hub-form-section-title"><strong id="crm2-pf-attachments-title">Anexos</strong><span>Arquivos mockados e validade.</span></div>
          <p>A seleção valida o fluxo visual, mas o arquivo não é enviado.</p>
          <div class="crm2-pf-form-attachment-fields">
            <label><span>Arquivo</span><input class="config-input" type="file" name="anexoArquivo" ${verified ? '' : 'disabled'}></label>
            <label><span>Validade</span><input class="config-input" type="date" name="anexoValidade" ${verified ? '' : 'disabled'}></label>
          </div>
          ${editing && (person?.anexos || []).length ? `<div class="crm2-pf-form-existing-attachments"><strong>Anexos atuais</strong>${person.anexos.map((attachment) => `<span>${escapeHtmlCrm2(attachment.nome)}</span>`).join('')}</div>` : ''}
        </section>

        <div class="hub-form-screen-actions">
          <button class="secondary-btn" type="button" onclick="crm2PfCancelForm()">Cancelar</button>
          <button class="save-btn" type="submit" ${verified ? '' : 'disabled'}>${editing ? 'Salvar alterações' : 'Salvar'}</button>
        </div>
      </form>
    </section>
  `;
}

function renderCrm2Phase2() {
  const route = currentPfRouteCrm2();
  if (route.view === 'new') {
    crm2PfState.formMode = 'create';
    return renderPersonFormCrm2();
  }
  if (route.view === 'edit') {
    crm2PfState.formMode = 'edit';
    crm2PfState.detailId = route.id;
    return renderPersonFormCrm2();
  }
  if (route.view === 'detail') {
    crm2PfState.formMode = '';
    crm2PfState.detailId = route.id;
    return renderPersonDetailCrm2(getPersonCrm2(route.id));
  }
  crm2PfState.formMode = '';
  crm2PfState.detailId = '';
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
    'Última atualização',
    'Ações'
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
    navigateCrm2Route('201', `${person.id}/editar`);
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
  const newAttachment = file ? fileToAttachmentCrm2(file, attachmentExpiration) : null;

  if (crm2PfState.formMode === 'edit') {
    const person = getPersonCrm2(crm2PfState.detailId);
    if (!person) return;
    const changes = describeChangesCrm2(person, values);
    Object.assign(person, values, { atualizadoEm: now });
    if (newAttachment) person.anexos = [...(person.anexos || []), newAttachment];
    if (changes.length) registerTimelineCrm2(person, `Dados atualizados. ${changes.join(' | ')}`, 'Atualização');
    if (newAttachment) registerTimelineCrm2(person, `Anexo incluído: ${newAttachment.nome}.`, 'Anexo');
    setMessageCrm2(changes.length || newAttachment
      ? 'Pessoa física atualizada no estado mockado. Nenhum dado foi persistido.'
      : 'Nenhuma alteração foi identificada.');
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
      timeline: [{ data: now, usuario: 'Usuário atual', descricao: 'Cadastro criado.', tipo: 'Cadastro' }]
    };
    if (newAttachment) person.timeline.push({ data: now, usuario: 'Usuário atual', descricao: `Anexo incluído: ${newAttachment.nome}.`, tipo: 'Anexo' });
    crm2PfState.items.unshift(person);
    crm2PfState.detailId = id;
    setMessageCrm2('Pessoa física criada no estado mockado. Nenhum dado foi persistido.');
  }

  const savedId = crm2PfState.detailId;
  resetFormCrm2();
  crm2PfState.detailTab = 'dados';
  navigateCrm2Route('201', savedId);
}

// --- src/hub/crm2Phase2.part4.js ---
Object.assign(window, {
  crm2PfRender: renderCrm2Phase2,
  navegarParaCrm2Rota: navigateCrm2Route,
  crm2PfOpenForm: openFormCrm2,
  crm2PfCancelForm() {
    const hasDraft = Object.values(crm2PfState.draft || {}).some((value) => String(value || '').trim());
    if (hasDraft && !window.confirm('Descartar os dados preenchidos?')) return;
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
  crm2PfTrackChange(input) {
    if (!input?.name) return;
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
  crm2PfSave: savePersonCrm2,
  crm2PfOpenDetail(id) {
    if (!getPersonCrm2(id)) return;
    resetFormCrm2();
    crm2PfState.detailId = id;
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201', id);
  },
  crm2PfCloseDetail() {
    crm2PfState.detailId = '';
    crm2PfState.detailTab = 'dados';
    setMessageCrm2('');
    navigateCrm2Route('201');
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
    registerTimelineCrm2(person, `Observação interna adicionada: ${note}`, 'Observação interna');
    setMessageCrm2('Observação adicionada à timeline mockada.');
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
    registerTimelineCrm2(person, `Anexo incluído: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo incluído apenas no estado local.');
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
    registerTimelineCrm2(person, `Anexo substituído: ${previous.nome} → ${replacement.nome}.`, 'Anexo');
    setMessageCrm2('Anexo substituído apenas no estado local.');
    rerenderCrm2Phase2();
  },
  crm2PfRemoveAttachment(personId, index) {
    if (!crm2CanEdit()) return;
    const person = getPersonCrm2(personId);
    const attachment = person?.anexos?.[index];
    if (!person || !attachment) return;
    if (!window.confirm(`Remover o anexo “${attachment.nome}” do estado mockado?`)) return;
    person.anexos.splice(index, 1);
    registerTimelineCrm2(person, `Anexo removido: ${attachment.nome}.`, 'Anexo');
    setMessageCrm2('Anexo removido apenas do estado local.');
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
