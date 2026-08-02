import './notifications.css';
import {
  arquivarNotificacao,
  contarNotificacoesNaoLidas,
  desarquivarNotificacao,
  excluirNotificacao,
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarNotificacaoComoNaoLida,
  marcarTodasComoLidas
} from './services/notificationsService.js';
import { supabase } from './supabaseClient.js';

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'nao-lidas', label: 'Não lidas' },
  { id: 'mencoes', label: 'Menções' },
  { id: 'prazos', label: 'Prazos' },
  { id: 'erros', label: 'Erros do sistema' },
  { id: 'arquivadas', label: 'Arquivadas' }
];

const state = {
  contador: 0,
  painelAberto: false,
  carregando: false,
  erro: '',
  filtroPainel: 'todas',
  filtroPagina: 'todas',
  notificacoesPainel: [],
  notificacoesPagina: []
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterRotaHub(caminho = '/notificacoes') {
  return window.location.pathname === '/hub' || window.location.pathname.startsWith('/hub/')
    ? `/hub${caminho}`
    : caminho;
}

function formatarData(data) {
  if (!data) return '';
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return '';
  return valor.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function obterIcone(tipo) {
  return {
    mencao: '@',
    atribuicao: '✓',
    comentario: '💬',
    prazo: '⏱',
    status: '↗',
    erro: '!'
  }[tipo] || '•';
}

function renderizarItem(notificacao, compacto = false) {
  const lida = Boolean(notificacao.lida_em);
  const arquivada = Boolean(notificacao.arquivada_em);
  const acao = notificacao.rota
    ? `abrirNotificacaoHub('${escapeHtml(notificacao.id)}')`
    : `alternarLeituraNotificacaoHub('${escapeHtml(notificacao.id)}')`;

  return `
    <article class="hub-notification-item ${lida ? 'is-read' : 'is-unread'} ${compacto ? 'is-compact' : ''}" data-notification-id="${escapeHtml(notificacao.id)}">
      <button class="hub-notification-main" type="button" onclick="${acao}" aria-label="Abrir notificação">
        <span class="hub-notification-icon hub-notification-icon--${escapeHtml(notificacao.tipo)}" aria-hidden="true">${obterIcone(notificacao.tipo)}</span>
        <span class="hub-notification-copy">
          <strong>${escapeHtml(notificacao.titulo)}</strong>
          ${notificacao.descricao ? `<span>${escapeHtml(notificacao.descricao)}</span>` : ''}
          <small>${escapeHtml(notificacao.modulo || 'Hub')} · ${escapeHtml(formatarData(notificacao.created_at))}</small>
        </span>
        ${!lida ? '<span class="hub-notification-dot" title="Não lida" aria-label="Não lida"></span>' : ''}
      </button>
      <div class="hub-notification-actions">
        <button type="button" title="${lida ? 'Marcar como não lida' : 'Marcar como lida'}" aria-label="${lida ? 'Marcar como não lida' : 'Marcar como lida'}" onclick="alternarLeituraNotificacaoHub('${escapeHtml(notificacao.id)}')">${lida ? '○' : '●'}</button>
        ${arquivada ? `<button type="button" title="Restaurar" aria-label="Restaurar" onclick="restaurarNotificacaoHub('${escapeHtml(notificacao.id)}')">↶</button>` : `<button type="button" title="Arquivar" aria-label="Arquivar" onclick="arquivarNotificacaoHub('${escapeHtml(notificacao.id)}')">×</button>`}
        <button type="button" title="Excluir" aria-label="Excluir" onclick="excluirNotificacaoHub('${escapeHtml(notificacao.id)}')">⌫</button>
      </div>
    </article>
  `;
}

function renderizarLista(notificacoes, compacto = false) {
  if (state.carregando) return '<div class="hub-notification-state">Carregando notificações…</div>';
  if (state.erro) return `<div class="hub-notification-state is-error">${escapeHtml(state.erro)}</div>`;
  if (!notificacoes.length) return '<div class="hub-notification-state">Nenhuma notificação encontrada.</div>';
  return notificacoes.map(item => renderizarItem(item, compacto)).join('');
}

function atualizarContadorDom() {
  document.querySelectorAll('[data-hub-notification-count]').forEach(elemento => {
    elemento.textContent = state.contador > 99 ? '99+' : String(state.contador);
    elemento.hidden = state.contador < 1;
  });
}

function renderizarControleNotificacoesNavegador() {
  const ativa = typeof Notification !== 'undefined' && Notification.permission === 'granted';
  return ativa
    ? '<button type="button" class="hub-browser-notifications-toggle is-enabled" title="Notificações ativadas" aria-label="Notificações ativadas" disabled>🔔</button>'
    : '<button type="button" class="text-btn" onclick="ativarNotificacoesNavegadorHub()">Ativar notificações</button>';
}

function base64UrlParaBytes(valor) {
  const padding = '='.repeat((4 - (valor.length % 4)) % 4);
  const base64 = `${valor.replace(/-/g, '+').replace(/_/g, '/')}${padding}`;
  return Uint8Array.from(atob(base64), caractere => caractere.charCodeAt(0));
}

async function registrarAssinaturaPush() {
  const chavePublica = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  if (!chavePublica || !supabase || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registro = await navigator.serviceWorker.ready;
  const existente = await registro.pushManager.getSubscription();
  const assinatura = existente || await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlParaBytes(chavePublica)
  });
  const chave = assinatura.toJSON().keys || {};
  const { data: usuarioAuth } = await supabase.auth.getUser();
  if (!usuarioAuth?.user?.id || !chave.p256dh || !chave.auth) return;

  const { error } = await supabase.from('hub_notificacao_dispositivos').upsert({
    auth_user_id: usuarioAuth.user.id,
    endpoint: assinatura.endpoint,
    p256dh: chave.p256dh,
    auth: chave.auth,
    user_agent: navigator.userAgent,
    ativo: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'endpoint' });

  if (error) throw error;
}

function renderizarPainelDom() {
  const painel = document.getElementById('hub-notifications-popover');
  if (!painel) return;
  painel.innerHTML = `
    <div class="hub-notifications-popover-head">
      <div><strong>Notificações</strong><small>${state.contador} não lida(s)</small></div>
      <button type="button" class="hub-notification-close" onclick="fecharPainelNotificacoesHub()" aria-label="Fechar notificações">×</button>
    </div>
    <div class="hub-notification-tabs" role="tablist" aria-label="Filtro de notificações">
      ${FILTROS.slice(0, 2).map(item => `<button type="button" class="${state.filtroPainel === item.id ? 'is-active' : ''}" onclick="filtrarPainelNotificacoesHub('${item.id}')">${item.label}</button>`).join('')}
    </div>
    <div class="hub-notifications-popover-list">${renderizarLista(state.notificacoesPainel, true)}</div>
    <div class="hub-notifications-popover-footer">
      <button type="button" class="secondary-btn" onclick="marcarTodasNotificacoesHub()">Marcar todas como lidas</button>
      ${renderizarControleNotificacoesNavegador()}
      <button type="button" class="text-btn" onclick="verTodasNotificacoesHub()">Ver todas</button>
    </div>
  `;
}

async function carregarContador() {
  try {
    state.contador = await contarNotificacoesNaoLidas();
    atualizarContadorDom();
  } catch (erro) {
    console.warn('Não foi possível carregar o contador de notificações:', erro);
  }
}

async function registrarServiceWorkerHub() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/hub-notifications-sw.js', { scope: '/' });
  } catch (erro) {
    console.warn('Não foi possível registrar o Service Worker de notificações:', erro);
  }
}

async function atualizarListaAberta() {
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

function notificarNavegador(notificacao) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !notificacao) return;
  new Notification(notificacao.titulo || 'Nova notificação do Hub', {
    body: notificacao.descricao || 'Você recebeu uma nova notificação.',
    tag: `hub-notificacao-${notificacao.id}`
  });
}

function iniciarRealtimeNotificacoes() {
  if (!supabase || window.__hubNotificationsRealtime) return;
  window.__hubNotificationsRealtime = supabase
    .channel('hub-notificacoes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_notificacoes' }, payload => {
      if (payload.eventType === 'INSERT') notificarNavegador(payload.new);
      atualizarListaAberta();
    })
    .subscribe();
}

async function carregarLista(destino = 'painel') {
  const filtro = destino === 'pagina' ? state.filtroPagina : state.filtroPainel;
  state.carregando = true;
  state.erro = '';
  if (destino === 'painel') renderizarPainelDom();
  try {
    const lista = await listarNotificacoes({ filtro, limite: destino === 'pagina' ? 50 : 8 });
    if (destino === 'pagina') state.notificacoesPagina = lista;
    else state.notificacoesPainel = lista;
  } catch (erro) {
    state.erro = erro.message || 'Não foi possível carregar as notificações.';
  } finally {
    state.carregando = false;
    if (destino === 'pagina') renderizarPagina();
    else renderizarPainelDom();
  }
}

export function renderHubNotificationBell() {
  return `
    <button class="hub-notification-bell" type="button" onclick="abrirPainelNotificacoesHub()" aria-label="Notificações" title="Notificações">
      <span aria-hidden="true">🔔</span>
      <span class="hub-notification-count" data-hub-notification-count hidden>0</span>
    </button>
  `;
}

export async function inicializarNotificacoesHub() {
  await carregarContador();
  iniciarRealtimeNotificacoes();
  registrarServiceWorkerHub();
}

export async function ativarNotificacoesNavegadorHub() {
  if (typeof Notification === 'undefined') return;
  const permissao = await Notification.requestPermission();
  if (permissao === 'granted') {
    try {
      await registrarAssinaturaPush();
    } catch (erro) {
      console.warn('Não foi possível registrar a assinatura Push:', erro);
    }
    if (state.painelAberto) renderizarPainelDom();
  }
}

export async function abrirPainelNotificacoesHub() {
  if (state.painelAberto) return;
  state.painelAberto = true;
  document.body.insertAdjacentHTML('beforeend', '<div class="hub-notification-backdrop" id="hub-notifications-backdrop" onclick="fecharPainelNotificacoesHub()"></div><aside class="hub-notifications-popover" id="hub-notifications-popover" aria-label="Notificações recentes"></aside>');
  renderizarPainelDom();
  await carregarLista('painel');
}

export function fecharPainelNotificacoesHub() {
  state.painelAberto = false;
  document.getElementById('hub-notifications-backdrop')?.remove();
  document.getElementById('hub-notifications-popover')?.remove();
}

export async function filtrarPainelNotificacoesHub(filtro) {
  state.filtroPainel = filtro;
  await carregarLista('painel');
}

export async function alternarLeituraNotificacaoHub(id) {
  const lista = [...state.notificacoesPainel, ...state.notificacoesPagina];
  const notificacao = lista.find(item => item.id === id);
  if (!notificacao) return;
  await (notificacao.lida_em ? marcarNotificacaoComoNaoLida(id) : marcarNotificacaoComoLida(id));
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export async function abrirNotificacaoHub(id) {
  const lista = [...state.notificacoesPainel, ...state.notificacoesPagina];
  const notificacao = lista.find(item => item.id === id);
  if (!notificacao) return;
  if (!notificacao.lida_em) await marcarNotificacaoComoLida(id);
  fecharPainelNotificacoesHub();
  await carregarContador();
  if (notificacao.rota && typeof window.navegarParaRota === 'function') window.navegarParaRota(notificacao.rota);
}

export async function arquivarNotificacaoHub(id) {
  await arquivarNotificacao(id);
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export async function restaurarNotificacaoHub(id) {
  await desarquivarNotificacao(id);
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export async function excluirNotificacaoHub(id) {
  await excluirNotificacao(id);
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export async function marcarTodasNotificacoesHub() {
  await marcarTodasComoLidas();
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
}

export function verTodasNotificacoesHub() {
  fecharPainelNotificacoesHub();
  if (typeof window.navegarParaRota === 'function') window.navegarParaRota(obterRotaHub());
}

export async function filtrarPaginaNotificacoesHub(filtro) {
  state.filtroPagina = filtro;
  await carregarLista('pagina');
}

export function renderizarPagina() {
  const app = document.getElementById('app');
  if (!app) return;
  const topbar = window.hubRenderizarTopbarPadrao?.() || '';
  const sidebar = window.hubRenderizarSidebarPadrao?.() || '';
  const classes = window.hubObterClassesLayoutPadrao?.() || '';
  app.innerHTML = `
    <main class="dashboard hub-layout hub-notifications-page-layout ${classes}">
      ${topbar}
      <div class="hub-shell">
        ${sidebar}
        <section class="hub-page-content">
          <nav class="hub-breadcrumb" aria-label="Caminho da página"><a href="${obterRotaHub('/')}" onclick="event.preventDefault(); navegarParaRota('${obterRotaHub('/')}')">Início</a><span class="hub-breadcrumb-separator">&gt;</span><span class="hub-breadcrumb-current">Notificações</span></nav>
          <div class="hub-notifications-page">
            <div class="hub-notifications-page-head">
              <div><h2>Notificações</h2><p>Acompanhe as atualizações importantes do Hub.</p></div>
              <button type="button" class="secondary-btn" onclick="marcarTodasNotificacoesHub()">Marcar todas como lidas</button>
            </div>
            <div class="hub-notification-filters" role="tablist" aria-label="Filtros de notificações">
              ${FILTROS.map(item => `<button type="button" class="${state.filtroPagina === item.id ? 'is-active' : ''}" onclick="filtrarPaginaNotificacoesHub('${item.id}')">${item.label}</button>`).join('')}
            </div>
            <div class="hub-notifications-page-list">${renderizarLista(state.notificacoesPagina)}</div>
          </div>
        </section>
      </div>
    </main>
  `;
}

export async function renderizarPaginaNotificacoesHub() {
  renderizarPagina();
  await carregarLista('pagina');
}

Object.assign(window, {
  abrirPainelNotificacoesHub,
  fecharPainelNotificacoesHub,
  filtrarPainelNotificacoesHub,
  alternarLeituraNotificacaoHub,
  abrirNotificacaoHub,
  arquivarNotificacaoHub,
  restaurarNotificacaoHub,
  excluirNotificacaoHub,
  marcarTodasNotificacoesHub,
  ativarNotificacoesNavegadorHub,
  verTodasNotificacoesHub,
  filtrarPaginaNotificacoesHub
});
