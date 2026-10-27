import './simuladorSaudeInicio.css';
import { chamarApi } from './api.js';
import { SIMULADOR_SAUDE_CATALOGO_ROUTE, SIMULADOR_SAUDE_COTACAO_ROUTE, SIMULADOR_SAUDE_ROUTE } from './simuladorSaudeRoutes.js';
import { obterBaseHub } from './routeConfig.js';
import { carregarPropostaSalvaSimuladorSaude } from './simuladorSaudeCotacao.js';

const state = { quotes: [], loading: false, error: '', notice: '', busyId: '', requestId: 0, search: '', statusFilter: 'todas' };
let context = {};

document.addEventListener('click', event => {
  const openFilter = document.querySelector('.saude-home-filter[open]');
  if (openFilter && !openFilter.contains(event.target)) openFilter.open = false;
});

function esc(value = '') {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isHomeRoute() {
  return (window.location.pathname || '').replace(/\/+$/g, '').endsWith(`/${SIMULADOR_SAUDE_ROUTE}`);
}

function statusLabel(value) {
  if (value === 'proposta') return 'Proposta gerada';
  if (value === 'arquivada') return 'Arquivada';
  return 'Rascunho';
}

function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function applyQuoteFilters() {
  const root = document.querySelector('.saude-home-page');
  if (!root) return;
  const query = normalizeSearch(state.search);
  const digits = String(state.search ?? '').replace(/\D/g, '');
  const identifier = String(state.search ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let visibleCount = 0;
  root.querySelectorAll('.saude-home-table tbody tr').forEach(row => {
    const textMatch = !query || normalizeSearch(row.dataset.search).includes(query);
    const numberMatch = digits.length > 0 && row.dataset.searchDigits.includes(digits);
    const identifierMatch = identifier.length > 0 && row.dataset.searchIdentifier.includes(identifier);
    const statusMatch = state.statusFilter === 'todas' || row.dataset.status === 'arquivada';
    row.hidden = !(statusMatch && (textMatch || numberMatch || identifierMatch));
    if (!row.hidden) visibleCount += 1;
  });
  const table = root.querySelector('.saude-home-table-wrap');
  const empty = root.querySelector('.saude-home-filter-empty');
  if (table) table.hidden = visibleCount === 0;
  if (empty) empty.hidden = visibleCount > 0;
}

function renderTable() {
  if (state.loading && !state.quotes.length) return '<div class="saude-home-state" role="status">Carregando cotações…</div>';
  if (state.error) return `<div class="saude-home-state is-error" role="alert"><p>${esc(state.error)}</p><button class="secondary-btn" type="button" onclick="saudeHomeReload()">Tentar novamente</button></div>`;
  if (!state.quotes.length) return `<div class="saude-home-empty"><div class="saude-home-empty-icon" aria-hidden="true">＋</div><h3>Nenhuma cotação salva</h3><p>As cotações salvas pela equipe aparecerão aqui para consulta e continuidade.</p><button class="secondary-btn" type="button" onclick="saudeHomeNewQuote()">Nova Cotação</button></div>`;

  const rows = state.quotes.map(quote => {
    const livesCount = Array.isArray(quote.snapshot?.vidas) ? quote.snapshot.vidas.length : 0;
    const podeDuplicar = Boolean(context.pode?.('simulador_saude', 'create'));
    const podeEditar = Boolean(context.pode?.('simulador_saude', 'update'));
    const podeExcluir = Boolean(context.pode?.('simulador_saude', 'delete'));
    const busy = state.busyId === quote.id;
    const statusAction = quote.status === 'arquivada'
      ? `<button class="icon-btn saude-home-row-action" type="button" onclick="saudeHomeSetQuoteStatus('${esc(quote.id)}','rascunho')" aria-label="Restaurar cotação #${esc(quote.codigo ?? '')}" title="Restaurar cotação" ${busy ? 'disabled' : ''}><i data-lucide="rotate-ccw" aria-hidden="true"></i></button>`
      : `<button class="icon-btn saude-home-row-action" type="button" onclick="saudeHomeSetQuoteStatus('${esc(quote.id)}','arquivada')" aria-label="Arquivar cotação #${esc(quote.codigo ?? '')}" title="Arquivar cotação" ${busy ? 'disabled' : ''}><i data-lucide="archive" aria-hidden="true"></i></button>`;
    const actions = [
      podeDuplicar ? `<button class="icon-btn saude-home-row-action" type="button" onclick="saudeHomeDuplicateQuote('${esc(quote.id)}')" aria-label="Duplicar cotação #${esc(quote.codigo ?? '')}" title="Duplicar cotação"><i data-lucide="copy" aria-hidden="true"></i></button>` : '',
      podeEditar ? statusAction : '',
      podeExcluir ? `<button class="icon-btn danger saude-home-row-action" type="button" onclick="saudeHomeDeleteQuote('${esc(quote.id)}','${esc(quote.codigo ?? '')}')" aria-label="Excluir cotação #${esc(quote.codigo ?? '')}" title="Excluir cotação" ${busy ? 'disabled' : ''}><i data-lucide="trash-2" aria-hidden="true"></i></button>` : ''
    ].filter(Boolean).join('');
    return `<tr data-status="${esc(quote.status || 'rascunho')}" data-search="${esc([quote.codigo, quote.cliente_nome, quote.cliente_cnpj].filter(Boolean).join(' '))}" data-search-digits="${esc([quote.codigo, quote.cliente_cnpj].filter(Boolean).join('').replace(/\D/g, ''))}" data-search-identifier="${esc([quote.codigo, quote.cliente_cnpj].filter(Boolean).join('').toUpperCase().replace(/[^A-Z0-9]/g, ''))}">
      <td class="saude-home-code"><button class="saude-home-open" type="button" onclick="saudeHomeOpenQuote('${esc(quote.id)}')" aria-label="Abrir cotação #${esc(quote.codigo ?? '—')}" title="Abrir cotação #${esc(quote.codigo ?? '—')}"><i data-lucide="search" aria-hidden="true"></i><span>#${esc(quote.codigo ?? '—')}</span></button></td>
      <td><strong>${esc(quote.cliente_nome || 'Cliente não informado')}</strong>${quote.cliente_cidade ? `<small>${esc(quote.cliente_cidade)}</small>` : ''}</td>
      <td>${livesCount}</td>
      <td><div class="saude-home-status-cell">${quote.status === 'proposta' ? `<button class="icon-btn saude-home-row-action" type="button" onclick="saudeHomeViewProposal('${esc(quote.id)}')" aria-label="Visualizar proposta da cotação #${esc(quote.codigo ?? '')}" title="Visualizar proposta"><i data-lucide="eye" aria-hidden="true"></i></button>` : ''}<span class="saude-home-status is-${esc(quote.status || 'rascunho')}">${statusLabel(quote.status)}</span></div></td>
      <td><div class="saude-home-row-actions">${actions}</div></td>
    </tr>`;
  }).join('');

  return `<div class="saude-home-filter-empty saude-home-empty" role="status" hidden><h3>Nenhuma cotação encontrada</h3><p>Ajuste a busca ou o filtro de status.</p></div><div class="saude-home-table-wrap"><table class="hub-data-table saude-home-table"><thead><tr><th>Cotação</th><th>Cliente</th><th>Vidas</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderPage() {
  if (!context.pode?.('simulador_saude', 'view')) {
    return context.renderShell({ tituloPagina: 'Simulador - Saúde', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar Simulador - Saúde.</p></section>' });
  }

  const catalogButton = context.pode?.('simulador_saude.catalogo', 'view')
    ? `<button class="icon-btn" type="button" onclick="saudeHomeGoCatalog()" aria-label="Configurar catálogo" title="Configurar catálogo"><i data-lucide="settings" aria-hidden="true"></i></button>`
    : '';
  const content = `<section class="saude-home-page">
    <header class="saude-home-header">
      <div class="saude-home-title"><span class="saude-home-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><h2>Simulador - Saúde</h2></div></div>
      <div class="saude-home-actions"><button class="secondary-btn" type="button" onclick="saudeHomeNewQuote()">Nova Cotação</button><details class="saude-home-filter"><summary class="icon-btn${state.statusFilter !== 'todas' ? ' is-active' : ''}" aria-label="Filtrar cotações" aria-haspopup="menu" title="Filtrar cotações"><i data-lucide="filter" aria-hidden="true"></i></summary><div class="saude-home-filter-menu"><label for="saude-home-status-filter">Status</label><select id="saude-home-status-filter" onchange="saudeHomeSetStatusFilter(this.value)"><option value="todas"${state.statusFilter === 'todas' ? ' selected' : ''}>Todas</option><option value="arquivada"${state.statusFilter === 'arquivada' ? ' selected' : ''}>Arquivadas</option></select></div></details><button class="icon-btn" type="button" onclick="saudeHomeReload()" aria-label="Atualizar cotações" title="Atualizar cotações" ${state.loading ? 'disabled' : ''}><i data-lucide="refresh-cw" aria-hidden="true"></i></button>${catalogButton}<label class="saude-home-search"><i data-lucide="search" aria-hidden="true"></i><input type="search" value="${esc(state.search)}" placeholder="Buscar cliente, CPF/CNPJ ou nº" aria-label="Buscar por nome do cliente, CPF ou CNPJ, ou número da cotação" oninput="saudeHomeSearch(this.value)"></label></div>
    </header>
    <section class="saude-home-card">
      ${state.notice ? `<p class="saude-home-notice" role="status">${esc(state.notice)}</p>` : ''}${renderTable()}
    </section>
  </section>`;
  return context.renderShell({ tituloPagina: 'Simulador - Saúde', descricaoPagina: 'Consulte e crie cotações de planos de saúde.', classeConteudo: 'simulador-saude-page', conteudo: content });
}

function rerender() {
  const root = document.getElementById('app');
  if (root && isHomeRoute()) {
    root.innerHTML = renderPage();
    applyQuoteFilters();
  }
}

async function loadQuotes() {
  const requestId = ++state.requestId;
  state.loading = true;
  state.error = '';
  rerender();
  try {
    const response = await chamarApi('getRecentSimuladorSaudeQuotes');
    if (!response.ok) throw new Error(response.message || 'Não foi possível carregar as cotações.');
    if (requestId !== state.requestId) return;
    state.quotes = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.error = error.message || 'Não foi possível carregar as cotações recentes.';
  } finally {
    if (requestId === state.requestId) {
      state.loading = false;
      rerender();
    }
  }
}

export async function mountSimuladorSaudeHomePage(nextContext = {}) {
  context = { ...nextContext };
  state.quotes = [];
  state.search = '';
  state.statusFilter = 'todas';
  state.loading = true;
  state.error = '';
  rerender();
  await loadQuotes();
}

function hubRoute(route) { return `${obterBaseHub(window.location.pathname)}/${String(route).replace(/^\/+/, '')}`; }

window.saudeHomeNewQuote = () => context.navegarParaRota?.(hubRoute(SIMULADOR_SAUDE_COTACAO_ROUTE));
window.saudeHomeOpenQuote = id => {
  if (!id) return;
  context.navegarParaRota?.(`${hubRoute(SIMULADOR_SAUDE_COTACAO_ROUTE)}?quoteId=${encodeURIComponent(id)}`);
};
window.saudeHomeViewProposal = async id => {
  if (!id) return;
  const proposalWindow = window.open('about:blank', '_blank');
  if (!proposalWindow) {
    state.notice = 'Permita a abertura de nova aba para visualizar a proposta.';
    rerender();
    return;
  }
  proposalWindow.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Preparando proposta</title></head><body style="color:#435977;font:14px Arial,sans-serif;padding:32px">Carregando proposta salva…</body></html>');
  try {
    const proposalHtml = await carregarPropostaSalvaSimuladorSaude(id);
    if (proposalWindow.closed) return;
    proposalWindow.document.open();
    proposalWindow.document.write(proposalHtml);
    proposalWindow.document.close();
  } catch (error) {
    if (proposalWindow.closed) return;
    proposalWindow.document.open();
    proposalWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Erro ao abrir proposta</title></head><body style="color:#8e2932;font:14px Arial,sans-serif;padding:32px"><h2>Não foi possível abrir a proposta</h2><p>${esc(error.message || 'Falha ao carregar os dados da cotação.')}</p></body></html>`);
    proposalWindow.document.close();
  }
};
window.saudeHomeDuplicateQuote = id => {
  if (!id || !context.pode?.('simulador_saude', 'create')) return;
  context.navegarParaRota?.(`${hubRoute(SIMULADOR_SAUDE_COTACAO_ROUTE)}?duplicateQuoteId=${encodeURIComponent(id)}`);
};
window.saudeHomeGoCatalog = () => context.navegarParaRota?.(hubRoute(SIMULADOR_SAUDE_CATALOGO_ROUTE));
window.saudeHomeReload = () => loadQuotes();
window.saudeHomeSearch = value => {
  state.search = value;
  applyQuoteFilters();
};
window.saudeHomeSetStatusFilter = value => {
  state.statusFilter = value === 'arquivada' ? 'arquivada' : 'todas';
  document.querySelector('.saude-home-filter summary')?.classList.toggle('is-active', state.statusFilter !== 'todas');
  applyQuoteFilters();
};

async function executarAcaoCotacao(id, action, payload, fallback) {
  if (!id || state.busyId) return;
  state.busyId = id;
  state.notice = '';
  state.error = '';
  rerender();
  try {
    const response = await chamarApi(action, { id, ...payload });
    if (!response.ok) throw new Error(response.message || fallback);
    state.notice = action === 'deleteSimuladorSaudeQuote'
      ? 'Cotação excluída.'
      : payload.status === 'arquivada' ? 'Cotação arquivada.' : 'Cotação restaurada.';
    await loadQuotes();
  } catch (error) {
    state.error = error.message || fallback;
  } finally {
    state.busyId = '';
    rerender();
  }
}

window.saudeHomeSetQuoteStatus = (id, status) => {
  if (!context.pode?.('simulador_saude', 'update')) return;
  executarAcaoCotacao(id, 'setSimuladorSaudeQuoteStatus', { status }, 'Não foi possível atualizar a cotação.');
};

window.saudeHomeDeleteQuote = (id, codigo) => {
  if (!context.pode?.('simulador_saude', 'delete')) return;
  if (!window.confirm(`Excluir definitivamente a cotação #${codigo || '—'}? O histórico de versões também será removido.`)) return;
  executarAcaoCotacao(id, 'deleteSimuladorSaudeQuote', {}, 'Não foi possível excluir a cotação.');
};
