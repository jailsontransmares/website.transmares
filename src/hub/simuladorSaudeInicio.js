import './simuladorSaudeInicio.css';
import { chamarApi } from './api.js';
import { SIMULADOR_SAUDE_CATALOGO_ROUTE, SIMULADOR_SAUDE_COTACAO_ROUTE, SIMULADOR_SAUDE_ROUTE } from './simuladorSaudeRoutes.js';
import { obterBaseHub } from './routeConfig.js';

const state = { quotes: [], loading: false, error: '', requestId: 0 };
let context = {};

function esc(value = '') {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isHomeRoute() {
  return (window.location.pathname || '').replace(/\/+$/g, '').endsWith(`/${SIMULADOR_SAUDE_ROUTE}`);
}

function dateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(value) {
  if (value === 'proposta') return 'Proposta gerada';
  if (value === 'arquivada') return 'Arquivada';
  return 'Rascunho';
}

function renderTable() {
  if (state.loading && !state.quotes.length) return '<div class="saude-home-state" role="status">Carregando cotações…</div>';
  if (state.error) return `<div class="saude-home-state is-error" role="alert"><p>${esc(state.error)}</p><button class="secondary-btn" type="button" onclick="saudeHomeReload()">Tentar novamente</button></div>`;
  if (!state.quotes.length) return `<div class="saude-home-empty"><div class="saude-home-empty-icon" aria-hidden="true">＋</div><h3>Nenhuma cotação salva</h3><p>As cotações salvas aparecerão aqui para você continuar ou consultar depois.</p><button class="primary-btn" type="button" onclick="saudeHomeNewQuote()">Nova Cotação</button></div>`;

  const rows = state.quotes.map(quote => {
    const livesCount = Array.isArray(quote.snapshot?.vidas) ? quote.snapshot.vidas.length : 0;
    return `<tr>
      <td class="saude-home-code">#${esc(quote.codigo ?? '—')}</td>
      <td><strong>${esc(quote.cliente_nome || 'Cliente não informado')}</strong>${quote.cliente_cidade ? `<small>${esc(quote.cliente_cidade)}</small>` : ''}</td>
      <td>${livesCount}</td>
      <td><span class="saude-home-status is-${esc(quote.status || 'rascunho')}">${statusLabel(quote.status)}</span></td>
      <td><time datetime="${esc(quote.updated_at || '')}">${dateLabel(quote.updated_at)}</time></td>
      <td><button class="saude-home-open" type="button" onclick="saudeHomeOpenQuote('${esc(quote.id)}')">Abrir</button></td>
    </tr>`;
  }).join('');

  return `<div class="saude-home-table-wrap"><table class="saude-home-table"><thead><tr><th>Cotação</th><th>Cliente</th><th>Vidas</th><th>Status</th><th>Última atualização</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderPage() {
  if (!context.pode?.('simulador_saude', 'view')) {
    return context.renderShell({ tituloPagina: 'Simulador - Saúde', descricaoPagina: 'Acesso controlado pelas permissões do Hub.', classeConteudo: 'simulador-saude-page', conteudo: '<section class="admin-panel"><h2>Acesso não autorizado</h2><p>É necessária a permissão Visualizar Simulador - Saúde.</p></section>' });
  }

  const catalogButton = context.pode?.('simulador_saude.catalogo', 'view')
    ? `<button class="secondary-btn" type="button" onclick="saudeHomeGoCatalog()">Configurar catálogo</button>`
    : '';
  const content = `<section class="saude-home-page">
    <header class="saude-home-header">
      <div class="saude-home-title"><span class="saude-home-title-icon" aria-hidden="true"><i data-lucide="heart-pulse"></i></span><div><span class="hub-page-kicker">Operações · Corretora</span><h2>Simulador - Saúde</h2><p>Acesse suas cotações recentes ou inicie uma nova simulação.</p></div></div>
      <div class="saude-home-actions">${catalogButton}<button class="primary-btn" type="button" onclick="saudeHomeNewQuote()">Nova Cotação</button></div>
    </header>
    <section class="saude-home-card" aria-labelledby="saude-home-list-title">
      <header><div><h3 id="saude-home-list-title">Últimas cotações</h3><p>Até 10 cotações atualizadas recentemente na sua conta.</p></div><button class="secondary-btn" type="button" onclick="saudeHomeReload()" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Atualizando…' : 'Atualizar'}</button></header>
      ${renderTable()}
    </section>
  </section>`;
  return context.renderShell({ tituloPagina: 'Simulador - Saúde', descricaoPagina: 'Consulte e crie cotações de planos de saúde.', classeConteudo: 'simulador-saude-page', conteudo: content });
}

function rerender() {
  const root = document.getElementById('app');
  if (root && isHomeRoute()) root.innerHTML = renderPage();
}

async function loadQuotes() {
  const requestId = ++state.requestId;
  state.loading = true;
  state.error = '';
  rerender();
  try {
    const response = await chamarApi('getRecentSimuladorSaudeQuotes', { limit: 10 });
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
window.saudeHomeGoCatalog = () => context.navegarParaRota?.(hubRoute(SIMULADOR_SAUDE_CATALOGO_ROUTE));
window.saudeHomeReload = () => loadQuotes();
