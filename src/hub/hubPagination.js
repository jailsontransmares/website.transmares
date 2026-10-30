const PAGE_SIZE_OPTIONS = [15, 30, 50];
const TABLE_PAGINATION_STATES = new Map();
const TABLE_PAGINATION_BINDINGS = new WeakMap();

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderHubPagination({
  page = 1,
  totalItems = 0,
  pageSize = 15,
  itemLabel = 'registros',
  ariaLabel = 'Paginação',
  hidden = false
} = {}) {
  const total = Math.max(0, Number(totalItems) || 0);
  const size = PAGE_SIZE_OPTIONS.includes(Number(pageSize)) ? Number(pageSize) : PAGE_SIZE_OPTIONS[0];
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const firstItem = total ? ((currentPage - 1) * size) + 1 : 0;
  const lastItem = Math.min(total, currentPage * size);

  return `
    <nav class="hub-pagination" aria-label="${escapeHtml(ariaLabel)}" data-hub-pagination ${hidden ? 'hidden' : ''}>
      <span class="hub-pagination-summary">Mostrando ${firstItem}–${lastItem} de ${total} ${escapeHtml(itemLabel)}</span>
      <div class="hub-pagination-controls">
        <label class="hub-pagination-size">
          <span>Por página</span>
          <select class="config-input" aria-label="Registros por página" data-hub-pagination-size>
            ${PAGE_SIZE_OPTIONS.map(option => `<option value="${option}" ${option === size ? 'selected' : ''}>${option}</option>`).join('')}
          </select>
        </label>
        <span class="hub-pagination-page" aria-live="polite">Página ${currentPage} de ${totalPages}</span>
        <button class="secondary-btn" type="button" data-hub-pagination-page="${currentPage - 1}" aria-label="Página anterior" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
        <button class="secondary-btn" type="button" data-hub-pagination-page="${currentPage + 1}" aria-label="Próxima página" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
      </div>
    </nav>
  `;
}

function obterChaveTabela(tabela) {
  if (tabela.dataset.hubPaginationKey) return tabela.dataset.hubPaginationKey;
  const identificador = tabela.id || tabela.getAttribute('aria-label') || [...tabela.classList].sort().join('.');
  return `${window.location.pathname}::${identificador}`;
}

function obterLinhasDeDados(tabela) {
  return [...(tabela.tBodies[0]?.rows || [])].filter(linha => !(linha.cells.length === 1 && linha.cells[0].colSpan > 1));
}

function criarNav(tabela, state) {
  const container = document.createElement('div');
  container.innerHTML = renderHubPagination({
    page: state.page,
    totalItems: state.totalItems,
    pageSize: state.pageSize,
    itemLabel: state.itemLabel,
    ariaLabel: state.ariaLabel
  });
  const nav = container.firstElementChild;
  const wrapper = tabela.closest('.admin-table-wrap, .saude-home-table-wrap, .simsaude-table-wrap, .ar-validacoes-table-wrap, .ar-recibos-table') || tabela;

  wrapper.insertAdjacentElement('afterend', nav);
  return nav;
}

function emitirAlteracaoPaginacao(tabela, state) {
  window.dispatchEvent(new CustomEvent('hub:table-pagination-change', {
    detail: {
      key: state.key,
      page: state.page,
      pageSize: state.pageSize,
      totalItems: state.totalItems,
      table: tabela
    }
  }));
}

function atualizarPaginacao(tabela, state, { emitir = false } = {}) {
  if (!tabela.isConnected) return;

  const todasLinhas = obterLinhasDeDados(tabela);
  const linhasVisiveis = todasLinhas.filter(linha => !linha.hidden);
  const assinatura = linhasVisiveis.map(linha => linha.dataset.hubRowKey || linha.textContent.trim()).join('\u241f');
  const dadosMudaram = state.assinatura !== undefined && state.assinatura !== assinatura;

  if (dadosMudaram) {
    state.page = Math.max(1, Number(tabela.dataset.hubPaginationDataChangePage) || 1);
  }
  state.assinatura = assinatura;
  state.totalItems = linhasVisiveis.length;
  const totalPaginas = Math.max(1, Math.ceil(state.totalItems / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPaginas);

  const inicio = (state.page - 1) * state.pageSize;
  const fim = inicio + state.pageSize;
  const indicesVisiveis = new Map(linhasVisiveis.map((linha, index) => [linha, index]));

  todasLinhas.forEach(linha => {
    const indice = indicesVisiveis.get(linha);
    const ocultar = indice === undefined || indice < inicio || indice >= fim;
    if (ocultar) linha.dataset.hubPaginationHidden = 'true';
    else delete linha.dataset.hubPaginationHidden;
  });

  const componente = tabela.closest('[data-hub-data-table-component]');
  const navAtual = tabela.__hubPaginationNav || componente?.querySelector('[data-hub-pagination]');
  if (navAtual) tabela.__hubPaginationNav = navAtual;
  if (state.totalItems === 0) {
    if (navAtual) navAtual.hidden = true;
  } else {
    const nav = navAtual?.isConnected ? navAtual : criarNav(tabela, state);
    nav.hidden = false;
    const container = document.createElement('div');
    container.innerHTML = renderHubPagination({
      page: state.page,
      totalItems: state.totalItems,
      pageSize: state.pageSize,
      itemLabel: state.itemLabel,
      ariaLabel: state.ariaLabel
    });
    nav.innerHTML = container.firstElementChild.innerHTML;
    nav.setAttribute('aria-label', state.ariaLabel);
    tabela.__hubPaginationNav = nav;
    if (!TABLE_PAGINATION_BINDINGS.has(nav)) {
      nav.addEventListener('click', event => {
        const button = event.target.closest?.('[data-hub-pagination-page]');
        if (!button || button.disabled) return;
        state.page = Number(button.dataset.hubPaginationPage) || 1;
        atualizarPaginacao(tabela, state, { emitir: true });
      });
      nav.addEventListener('change', event => {
        const select = event.target.closest?.('[data-hub-pagination-size]');
        if (!select) return;
        const pageSize = Number(select.value);
        if (!PAGE_SIZE_OPTIONS.includes(pageSize)) return;
        state.pageSize = pageSize;
        state.page = 1;
        atualizarPaginacao(tabela, state, { emitir: true });
      });
      TABLE_PAGINATION_BINDINGS.set(nav, true);
    }
    if (emitir || dadosMudaram) emitirAlteracaoPaginacao(tabela, state);
    return;
  }

  if (emitir || dadosMudaram) emitirAlteracaoPaginacao(tabela, state);
}

function prepararTabela(tabela) {
  if (tabela.dataset.hubPagination === 'false') return;

  const componente = tabela.closest('[data-hub-data-table-component]');
  let state = TABLE_PAGINATION_STATES.get(obterChaveTabela(tabela));
  if (!state) {
    const key = obterChaveTabela(tabela);
    state = {
      key,
      page: 1,
      pageSize: PAGE_SIZE_OPTIONS[0],
      totalItems: 0,
      itemLabel: tabela.dataset.hubPaginationItemLabel || componente?.dataset.hubPaginationItemLabel || 'registros',
      ariaLabel: tabela.dataset.hubPaginationLabel || componente?.dataset.hubPaginationLabel || `Paginação de ${tabela.getAttribute('aria-label') || 'registros'}`,
      assinatura: undefined
    };
    TABLE_PAGINATION_STATES.set(key, state);
  }

  const novaTabela = state.tabela !== tabela;
  state.tabela = tabela;
  tabela.__hubPaginationNav = tabela.__hubPaginationNav || null;
  atualizarPaginacao(tabela, state, { emitir: novaTabela });
}

export function prepararPaginacaoTabelasGlobais(raiz = document) {
  const tabelas = new Set(raiz.matches?.('table.hub-data-table') ? [raiz] : []);
  raiz.querySelectorAll?.('table.hub-data-table').forEach(tabela => tabelas.add(tabela));
  const tabelaAncestral = raiz.closest?.('table.hub-data-table');
  if (tabelaAncestral) tabelas.add(tabelaAncestral);
  tabelas.forEach(prepararTabela);
}

function atualizarTabelasVisiveis() {
  document.querySelectorAll('table.hub-data-table').forEach(tabela => {
    const state = TABLE_PAGINATION_STATES.get(obterChaveTabela(tabela));
    if (state) atualizarPaginacao(tabela, state);
  });
}

document.addEventListener('input', () => window.setTimeout(atualizarTabelasVisiveis, 0));
document.addEventListener('change', () => window.setTimeout(atualizarTabelasVisiveis, 0));
