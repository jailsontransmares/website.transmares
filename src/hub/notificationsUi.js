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
  { id: 'nao-lidas', label: 'Não lidas' },
  { id: 'todas', label: 'Todas' },
  { id: 'arquivadas', label: 'Arquivadas' }
];

const FILTROS_TIPO = [
  { id: 'todos', label: 'Todos os tipos' },
  { id: 'mencoes', label: 'Menções' },
  { id: 'prazos', label: 'Prazos' },
  { id: 'erros', label: 'Erros do sistema' }
];

const FILTROS_PAINEL = [
  { id: 'nao-lidas', label: 'Não lidas' },
  { id: 'todas', label: 'Todas' }
];

const state = {
  contador: 0,
  painelAberto: false,
  carregando: false,
  erro: '',
  filtroPainel: 'nao-lidas',
  filtroPagina: 'todas',
  tipoPagina: 'todos',
  tipoMenuAberto: false,
  paginaAtual: 1,
  paginaTemMais: true,
  carregandoMais: false,
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

function formatarDataRelativa(data) {
  if (!data) return '';
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return '';
  const segundos = Math.round((Date.now() - valor.getTime()) / 1000);
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  if (segundos < 172800) return 'ontem';
  if (segundos < 604800) return `há ${Math.floor(segundos / 86400)} dias`;
  return formatarData(data);
}

function obterGrupoData(data) {
  const valor = new Date(data);
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioValor = new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  const dias = Math.floor((inicioHoje - inicioValor) / 86400000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 7) return 'Esta semana';
  return 'Anteriores';
}

function obterIcone(tipo) {
  return {
    mencao: 'mention',
    atribuicao: 'check',
    comentario: 'comment',
    prazo: 'clock',
    status: 'arrow',
    erro: 'error'
  }[tipo] || 'status';
}

function renderizarIcone(nome) {
  const mapa = {
    bell: 'bell',
    mention: 'at-sign',
    check: 'check',
    comment: 'message-circle',
    clock: 'clock-3',
    arrow: 'external-link',
    error: 'circle-alert',
    read: 'check',
    unread: 'circle',
    archive: 'archive',
    restore: 'rotate-ccw',
    trash: 'trash-2',
    close: 'x'
  };

  return `<i class="hub-notification-svg" data-lucide="${mapa[nome] || mapa.arrow}" aria-hidden="true"></i>`;
}

function renderizarItem(notificacao, compacto = false) {
  const lida = Boolean(notificacao.lida_em);
  const arquivada = Boolean(notificacao.arquivada_em);
  const acao = notificacao.rota
    ? `abrirNotificacaoHub('${escapeHtml(notificacao.id)}')`
    : `alternarLeituraNotificacaoHub('${escapeHtml(notificacao.id)}')`;

  return `
    <article class="hub-notification-item ${lida ? 'is-read' : 'is-unread'} ${compacto ? 'is-compact' : ''}" data-notification-id="${escapeHtml(notificacao.id)}">
      <button class="hub-notification-main" type="button" onclick="${acao}" aria-label="${notificacao.rota ? 'Abrir' : 'Marcar'} notificação: ${escapeHtml(notificacao.titulo)}">
        <span class="hub-notification-icon hub-notification-icon--${escapeHtml(notificacao.tipo)}">${renderizarIcone(obterIcone(notificacao.tipo))}</span>
        <span class="hub-notification-copy">
          <strong>${escapeHtml(notificacao.titulo)}</strong>
          ${notificacao.descricao ? `<span class="hub-notification-description">${escapeHtml(notificacao.descricao)}</span>` : ''}
          <small>${escapeHtml(notificacao.modulo || 'Hub')} · ${escapeHtml(formatarDataRelativa(notificacao.created_at))}</small>
        </span>
        ${!lida ? '<span class="hub-notification-dot" title="Não lida" aria-label="Não lida"></span>' : ''}
      </button>
      <div class="hub-notification-actions">
        <button class="hub-notification-action" type="button" title="${lida ? 'Marcar como não lida' : 'Marcar como lida'}" aria-label="${lida ? 'Marcar como não lida' : 'Marcar como lida'}" onclick="alternarLeituraNotificacaoHub('${escapeHtml(notificacao.id)}')">${renderizarIcone(lida ? 'unread' : 'read')}</button>
        ${!compacto ? (arquivada ? `<button class="hub-notification-action" type="button" title="Restaurar" aria-label="Restaurar" onclick="restaurarNotificacaoHub('${escapeHtml(notificacao.id)}')">${renderizarIcone('restore')}</button>` : `<button class="hub-notification-action" type="button" title="Arquivar" aria-label="Arquivar" onclick="arquivarNotificacaoHub('${escapeHtml(notificacao.id)}')">${renderizarIcone('archive')}</button>`) : ''}
        ${!compacto ? `<button class="hub-notification-action is-danger" type="button" title="Excluir" aria-label="Excluir" onclick="excluirNotificacaoHub('${escapeHtml(notificacao.id)}')">${renderizarIcone('trash')}</button>` : ''}
      </div>
    </article>
  `;
}

function renderizarLista(notificacoes, compacto = false) {
  if (state.carregando && !notificacoes.length) return window.hubRenderLoading?.('Carregando notificações...') || '<div class="hub-notification-skeleton" role="status" aria-label="Carregando notificações"><span></span><span></span><span></span><span></span></div>';
  if (state.erro) return `<div class="hub-notification-state is-error">${escapeHtml(state.erro)}</div>`;
  if (!notificacoes.length) return '<div class="hub-notification-state">Nenhuma notificação encontrada.</div>';
  return notificacoes.map(item => renderizarItem(item, compacto)).join('');
}

function renderizarListaAgrupada(notificacoes) {
  if (state.carregando && !notificacoes.length) return renderizarLista(notificacoes);
  if (state.erro) return renderizarLista(notificacoes);
  if (!notificacoes.length) {
    const mensagens = {
      'nao-lidas': 'Você não possui notificações não lidas.',
      erros: 'Nenhum erro do sistema encontrado.',
      mencoes: 'Nenhuma menção encontrada.',
      prazos: 'Nenhum prazo encontrado.',
      arquivadas: 'Nenhuma notificação arquivada.'
    };
    return `<div class="hub-notification-state"><strong>${mensagens[state.filtroPagina] || 'Tudo em dia.'}</strong><span>Novas atualizações aparecerão aqui.</span></div>`;
  }
  const grupos = notificacoes.reduce((resultado, item) => {
    const grupo = obterGrupoData(item.created_at);
    (resultado[grupo] ||= []).push(item);
    return resultado;
  }, {});
  return Object.entries(grupos).map(([grupo, itens]) => `
    <section class="hub-notification-group" aria-labelledby="hub-notification-group-${grupo.replace(/\W/g, '-').toLowerCase()}">
      <h3 id="hub-notification-group-${grupo.replace(/\W/g, '-').toLowerCase()}">${grupo}</h3>
      ${itens.map(item => renderizarItem(item)).join('')}
    </section>
  `).join('');
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
    ? `<button type="button" class="hub-browser-notifications-toggle is-enabled" title="Notificações ativadas" aria-label="Notificações ativadas" disabled>${renderizarIcone('bell')}</button>`
    : '<button type="button" class="text-btn" onclick="ativarNotificacoesNavegadorHub()">Ativar notificações</button>';
}

function renderizarBotaoMarcarTodasComoLidas() {
  return state.contador > 0
    ? '<button type="button" class="secondary-btn" onclick="marcarTodasNotificacoesHub()">Marcar todas como lidas</button>'
    : '';
}

function renderizarMenuTipoNotificacoes() {
  if (!state.tipoMenuAberto) return '';
  return `
    <div class="admin-partners-actions-menu hub-notification-type-menu" role="menu" aria-label="Tipo de notificação" onclick="event.stopPropagation()">
      ${FILTROS_TIPO.map(item => `<button type="button" role="menuitemradio" aria-checked="${state.tipoPagina === item.id}" onclick="filtrarTipoPaginaNotificacoesHub('${item.id}')">${state.tipoPagina === item.id ? '✓ ' : ''}${item.label}</button>`).join('')}
    </div>
  `;
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
      <div><strong id="hub-notifications-title">Notificações</strong><small>${state.contador ? `${state.contador} não lida(s)` : 'Tudo em dia'}</small></div>
      <button type="button" class="hub-notification-close" onclick="fecharPainelNotificacoesHub()" aria-label="Fechar notificações">${renderizarIcone('close')}</button>
    </div>
    <div class="hub-notification-tabs" role="tablist" aria-label="Filtro de notificações">
      ${FILTROS_PAINEL.map(item => `<button type="button" role="tab" aria-selected="${state.filtroPainel === item.id}" class="${state.filtroPainel === item.id ? 'is-active' : ''}" onclick="filtrarPainelNotificacoesHub('${item.id}')">${item.label}</button>`).join('')}
    </div>
    <div class="hub-notifications-popover-list">${renderizarLista(state.notificacoesPainel, true)}</div>
    <div class="hub-notifications-popover-footer">
      ${renderizarBotaoMarcarTodasComoLidas()}
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
    const pagina = destino === 'pagina' ? state.paginaAtual : 1;
    const lista = await listarNotificacoes({ filtro, tipo: destino === 'pagina' ? state.tipoPagina : 'todos', limite: destino === 'pagina' ? 30 : 8, pagina });
    if (destino === 'pagina') {
      state.notificacoesPagina = pagina > 1 ? [...state.notificacoesPagina, ...lista] : lista;
      state.paginaTemMais = lista.length === 30;
    }
    else state.notificacoesPainel = lista;
  } catch (erro) {
    state.erro = erro.message || 'Não foi possível carregar as notificações.';
  } finally {
    state.carregando = false;
    if (destino === 'pagina') renderizarPagina();
    else renderizarPainelDom();
  }
}

function posicionarPainelNotificacoes() {
  const botao = document.querySelector('.hub-notification-bell');
  const painel = document.getElementById('hub-notifications-popover');
  if (!botao || !painel) return;
  const margem = 12;
  const rect = botao.getBoundingClientRect();
  const largura = Math.min(440, window.innerWidth - margem * 2);
  const esquerda = Math.min(Math.max(margem, rect.right - largura), window.innerWidth - largura - margem);
  painel.style.setProperty('--hub-notification-panel-left', `${esquerda}px`);
  painel.style.setProperty('--hub-notification-panel-top', `${rect.bottom + 10}px`);
  painel.style.setProperty('--hub-notification-panel-width', `${largura}px`);
}

function tratarTecladoPainelNotificacoes(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    fecharPainelNotificacoesHub();
    return;
  }
  if (event.key !== 'Tab') return;
  const painel = document.getElementById('hub-notifications-popover');
  const focaveis = [...painel.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  if (!focaveis.length) return;
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
  else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
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
  state.botaoAnterior = document.activeElement;
  document.body.insertAdjacentHTML('beforeend', '<div class="hub-notification-backdrop" id="hub-notifications-backdrop" onclick="fecharPainelNotificacoesHub()"></div><aside class="hub-notifications-popover" id="hub-notifications-popover" role="dialog" aria-modal="false" aria-labelledby="hub-notifications-title"></aside>');
  posicionarPainelNotificacoes();
  window.addEventListener('keydown', tratarTecladoPainelNotificacoes);
  window.addEventListener('resize', posicionarPainelNotificacoes);
  renderizarPainelDom();
  document.getElementById('hub-notifications-popover')?.querySelector('button')?.focus();
  await carregarLista('painel');
}

export function fecharPainelNotificacoesHub() {
  state.painelAberto = false;
  document.getElementById('hub-notifications-backdrop')?.remove();
  document.getElementById('hub-notifications-popover')?.remove();
  window.removeEventListener('keydown', tratarTecladoPainelNotificacoes);
  window.removeEventListener('resize', posicionarPainelNotificacoes);
  state.botaoAnterior?.focus?.();
  state.botaoAnterior = null;
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
  if (!window.confirm('Excluir esta notificação permanentemente?')) return;
  await excluirNotificacao(id);
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export async function marcarTodasNotificacoesHub() {
  await marcarTodasComoLidas();
  await carregarContador();
  if (state.painelAberto) await carregarLista('painel');
  if (document.querySelector('.hub-notifications-page')) await carregarLista('pagina');
}

export function verTodasNotificacoesHub() {
  fecharPainelNotificacoesHub();
  if (typeof window.navegarParaRota === 'function') window.navegarParaRota(obterRotaHub());
}

export async function filtrarPaginaNotificacoesHub(filtro) {
  state.filtroPagina = filtro;
  state.paginaAtual = 1;
  state.paginaTemMais = true;
  await carregarLista('pagina');
}

export async function filtrarTipoPaginaNotificacoesHub(tipo) {
  state.tipoPagina = tipo;
  state.tipoMenuAberto = false;
  document.removeEventListener('click', fecharMenuTipoNotificacoesHub);
  window.removeEventListener('keydown', tratarTecladoMenuTipoNotificacoesHub);
  state.paginaAtual = 1;
  state.paginaTemMais = true;
  await carregarLista('pagina');
}

export function alternarMenuTipoNotificacoesHub(event) {
  event?.stopPropagation?.();
  state.tipoMenuAberto = !state.tipoMenuAberto;
  if (state.tipoMenuAberto) {
    document.addEventListener('click', fecharMenuTipoNotificacoesHub);
    window.addEventListener('keydown', tratarTecladoMenuTipoNotificacoesHub);
  } else {
    document.removeEventListener('click', fecharMenuTipoNotificacoesHub);
    window.removeEventListener('keydown', tratarTecladoMenuTipoNotificacoesHub);
  }
  renderizarPagina();
  if (state.tipoMenuAberto) document.querySelector('.hub-notification-type-actions [aria-haspopup="menu"]')?.focus();
}

export function fecharMenuTipoNotificacoesHub(event) {
  if (event?.target?.closest?.('.hub-notification-type-actions')) return;
  state.tipoMenuAberto = false;
  document.removeEventListener('click', fecharMenuTipoNotificacoesHub);
  window.removeEventListener('keydown', tratarTecladoMenuTipoNotificacoesHub);
  if (document.querySelector('.hub-notifications-page')) renderizarPagina();
}

function tratarTecladoMenuTipoNotificacoesHub(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    fecharMenuTipoNotificacoesHub();
  }
}

export async function carregarMaisNotificacoesHub() {
  if (!state.paginaTemMais || state.carregandoMais) return;
  state.carregandoMais = true;
  const proximaPagina = state.paginaAtual + 1;
  state.paginaAtual = proximaPagina;
  try {
    await carregarLista('pagina');
    if (state.erro) state.paginaAtual = Math.max(1, proximaPagina - 1);
  } catch (erro) {
    state.paginaAtual = Math.max(1, proximaPagina - 1);
  }
  state.carregandoMais = false;
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
            <section class="hub-page-intro">
              <span class="hub-page-kicker">Central de atualizações</span>
              <h2>Notificações</h2>
              <p>Acompanhe as atualizações importantes do Hub.</p>
            </section>
            <div class="hub-notifications-toolbar">
              <div class="crud-filters hub-notification-filters" role="tablist" aria-label="Filtros de notificações">
              ${FILTROS.map(item => `<button type="button" role="tab" aria-selected="${state.filtroPagina === item.id}" class="filter-btn ${state.filtroPagina === item.id ? 'active' : ''}" onclick="filtrarPaginaNotificacoesHub('${item.id}')">${item.label}</button>`).join('')}
              </div>
              <div class="hub-notification-type-actions">
                <button class="secondary-btn action-toolbar-btn hub-quick-actions-trigger" type="button" onclick="alternarMenuTipoNotificacoesHub(event)" aria-haspopup="menu" aria-expanded="${state.tipoMenuAberto}" aria-label="Filtrar por tipo de notificação" title="Filtrar por tipo de notificação"></button>
                ${renderizarMenuTipoNotificacoes()}
              </div>
              ${renderizarBotaoMarcarTodasComoLidas()}
            </div>
            <div class="info-card hub-notifications-page-list">${renderizarListaAgrupada(state.notificacoesPagina)}</div>
            ${state.paginaTemMais ? `<button type="button" class="hub-notifications-load-more" onclick="carregarMaisNotificacoesHub()" ${state.carregandoMais ? 'disabled aria-busy="true"' : ''}>${state.carregandoMais ? '<span class="hub-loading-spinner hub-loading-spinner--inline" aria-hidden="true"></span>Carregando…' : 'Carregar mais'}</button>` : ''}
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
  filtrarPaginaNotificacoesHub,
  filtrarTipoPaginaNotificacoesHub,
  alternarMenuTipoNotificacoesHub,
  fecharMenuTipoNotificacoesHub,
  carregarMaisNotificacoesHub
});
