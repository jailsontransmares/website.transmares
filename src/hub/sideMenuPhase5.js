import { HUB_MENU_TREE, HUB_MENU_TREE_VERSION } from './menuTree.js';
import { canAccessModule, hasPermission, normalizarPermissoes } from './services/permissionService.js';
import {
  aguardarContextoAcessoHub,
  obterContextoAcessoHub,
  observarContextoAcessoHub
} from './services/hubAccessContext.js';

const STYLE_ID = 'hub-side-menu-phase5-style';
const STORAGE_KEY = `hub-side-menu-expanded:${HUB_MENU_TREE_VERSION}`;
const DEFAULT_OPEN_GROUPS = {
  operacoes: false,
  administracao: false,
  'administracao-sistema': false,
  'administracao-parametros': false,
  'administracao-cadastros': false
};

let expandedGroups = carregarEstadoExpansao();
let manuallyCollapsedGroups = new Set();
let observer = null;
let renderAgendado = false;
let cancelarObservacaoContexto = null;
let contextoMenu = {
  loaded: false,
  loading: false,
  failed: false,
  permissions: normalizarPermissoes([]),
  cards: [],
  usuario: null
};

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(texto) {
  return escapeHtml(texto).replace(/`/g, '&#096;');
}

function carregarEstadoExpansao() {
  try {
    const salvo = window.localStorage?.getItem(STORAGE_KEY);
    if (!salvo) return { ...DEFAULT_OPEN_GROUPS };

    const parseado = JSON.parse(salvo);
    if (!parseado || typeof parseado !== 'object' || Array.isArray(parseado)) {
      return { ...DEFAULT_OPEN_GROUPS };
    }

    return {
      ...DEFAULT_OPEN_GROUPS,
      ...Object.fromEntries(
        Object.entries(parseado).map(([id, aberto]) => [id, Boolean(aberto)])
      )
    };
  } catch (_erro) {
    return { ...DEFAULT_OPEN_GROUPS };
  }
}

function salvarEstadoExpansao() {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(expandedGroups));
  } catch (_erro) {
    // Não bloqueia o menu se o navegador impedir persistência local.
  }
}

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function aplicarBaseHub(route = '/') {
  const base = obterBaseHub();
  const rota = String(route || '/');

  if (!base) return rota;
  if (rota === '/') return `${base}/`;
  return `${base}${rota.startsWith('/') ? rota : `/${rota}`}`;
}

function normalizarRotaParaComparacao(route = '') {
  const base = obterBaseHub();
  const [path = '', hash = ''] = String(route || '').split('#');
  const pathSemBase = base && path.startsWith(base) ? path.slice(base.length) : path;
  const pathNormalizado = pathSemBase
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
  const hashNormalizado = String(hash || '').replace(/^#+/, '').toLowerCase();

  return `${pathNormalizado || '/'}${hashNormalizado ? `#${hashNormalizado}` : ''}`;
}

function aplicarAliasMenuHub(route = '/') {
  const montarUrlAlias = window.montarUrlAliasRotaHub;

  if (typeof montarUrlAlias !== 'function') {
    return route;
  }

  return montarUrlAlias(route) || route;
}

function obterRotaAtualNormalizada() {
  return normalizarRotaParaComparacao(`${window.location.pathname || '/'}${window.location.hash || ''}`);
}

function obterRotaEfetiva(item = {}) {
  return item.route || item.legacyRoute || '';
}

function itemEstaPlanejado(item = {}) {
  return item.status === 'planned';
}

function itemExigePermissao(item = {}) {
  return Boolean(item.permission || item.moduleId);
}

function obterPermissoesMenu() {
  return contextoMenu.permissions || normalizarPermissoes([]);
}

function itemTemPermissao(item = {}) {
  if (!itemExigePermissao(item)) return true;
  if (!contextoMenu.loaded) return false;

  const permissoes = obterPermissoesMenu();

  if (item.permission?.resource) {
    const acao = item.permission.action || 'view';
    if (!hasPermission(permissoes, item.permission.resource, acao)) {
      return false;
    }
  }

  if (item.moduleId && !canAccessModule(permissoes, item.moduleId)) {
    return false;
  }

  return true;
}

function itemEstaAtivo(item = {}) {
  if (item.type !== 'route') return false;

  const atual = obterRotaAtualNormalizada();
  const rotas = [item.route, item.legacyRoute].filter(Boolean);

  return rotas.some(route => normalizarRotaParaComparacao(aplicarBaseHub(route)) === atual);
}

function grupoTemItemAtivo(item = {}) {
  return Array.isArray(item.children) && item.children.some(child => (
    child.type === 'group' ? grupoTemItemAtivo(child) : itemEstaAtivo(child)
  ));
}

function grupoEstaAberto(item = {}) {
  if (manuallyCollapsedGroups.has(item.id)) return false;
  if (grupoTemItemAtivo(item)) return true;
  return expandedGroups[item.id] === true;
}

function itemDeveAparecer(item = {}) {
  if (item.type === 'group') {
    if (!itemTemPermissao(item)) return false;
    return Array.isArray(item.children) && item.children.some(itemDeveAparecer);
  }

  if (item.type !== 'route') return false;
  return itemTemPermissao(item);
}

function abrirPaisDaRotaAtiva(items = HUB_MENU_TREE, parents = []) {
  let encontrou = false;

  for (const item of items) {
    if (!itemDeveAparecer(item)) continue;

    if (item.type === 'route' && itemEstaAtivo(item)) {
      parents.forEach(parent => {
        if (!manuallyCollapsedGroups.has(parent.id)) {
          expandedGroups[parent.id] = true;
        }
      });
      encontrou = true;
      continue;
    }

    if (item.type === 'group' && Array.isArray(item.children)) {
      const encontrouNoGrupo = abrirPaisDaRotaAtiva(item.children, [...parents, item]);
      encontrou = encontrou || encontrouNoGrupo;
    }
  }

  return encontrou;
}

function renderRouteItem(item, level) {
  const ativo = itemEstaAtivo(item);
  const planejado = itemEstaPlanejado(item);
  const rota = obterRotaEfetiva(item);
  const disabled = planejado || !rota;
  const classes = [
    'hub-sidebar-link',
    'hub-side-menu-route',
    `hub-side-menu-level-${level}`,
    ativo ? 'active' : '',
    disabled ? 'is-disabled' : ''
  ].filter(Boolean).join(' ');

  return `
    <button
      class="${escapeAttr(classes)}"
      type="button"
      data-hub-menu-route="${escapeAttr(rota)}"
      ${disabled ? 'disabled aria-disabled="true"' : ''}
    >
      <strong>${escapeHtml(item.label)}</strong>
      ${planejado ? '<span class="hub-side-menu-badge">em breve</span>' : ''}
    </button>
  `;
}

function renderGroupItem(item, level) {
  const filhos = (item.children || []).filter(itemDeveAparecer);
  if (!filhos.length) return '';

  const aberto = grupoEstaAberto(item);
  const ativo = grupoTemItemAtivo(item);
  const submenuId = `hub-menu-submenu-${item.id}`;
  const classes = [
    'hub-sidebar-group-toggle',
    'hub-side-menu-group-toggle',
    `hub-side-menu-level-${level}`,
    ativo ? 'active' : ''
  ].filter(Boolean).join(' ');

  return `
    <div class="hub-sidebar-group hub-side-menu-group" data-hub-menu-group="${escapeAttr(item.id)}">
      <button
        class="${escapeAttr(classes)}"
        type="button"
        data-hub-menu-toggle="${escapeAttr(item.id)}"
        aria-expanded="${aberto ? 'true' : 'false'}"
        aria-controls="${escapeAttr(submenuId)}"
      >
        <span class="hub-sidebar-group-label">${escapeHtml(item.label)}</span>
        <span class="hub-sidebar-group-caret" aria-hidden="true">${aberto ? '⌄' : '›'}</span>
      </button>
      <div id="${escapeAttr(submenuId)}" class="hub-sidebar-submenu ${aberto ? '' : 'is-collapsed'}">
        ${filhos.map(child => renderMenuItem(child, level + 1)).join('')}
      </div>
    </div>
  `;
}

function renderMenuItem(item, level = 0) {
  if (!itemDeveAparecer(item)) return '';
  if (item.type === 'group') return renderGroupItem(item, level);
  return renderRouteItem(item, level);
}

function renderSidebarContent() {
  abrirPaisDaRotaAtiva();
  salvarEstadoExpansao();

  const conteudo = HUB_MENU_TREE.map(item => renderMenuItem(item, 0)).join('');

  return `
    <div>
      <span class="hub-sidebar-eyebrow">Menu</span>
    </div>
    <nav class="hub-sidebar-nav" aria-label="Menu principal do Hub">
      ${conteudo || '<p class="hub-side-menu-empty">Nenhuma área disponível para seu usuário.</p>'}
    </nav>
  `;
}

function renderizarSidebars() {
  document.querySelectorAll('[data-hub-side-menu="true"]').forEach(sidebar => {
    sidebar.innerHTML = renderSidebarContent();
  });
}

function agendarRenderizacaoSidebars() {
  if (renderAgendado) return;

  renderAgendado = true;
  window.requestAnimationFrame(() => {
    renderAgendado = false;
    renderizarSidebars();
  });
}

async function carregarContextoMenu() {
  if (contextoMenu.loaded || contextoMenu.loading) return;

  contextoMenu.loading = true;
  const contextoHub = obterContextoAcessoHub().carregado
    ? obterContextoAcessoHub()
    : await aguardarContextoAcessoHub();

  sincronizarContextoMenu(contextoHub);
}

function sincronizarContextoMenu(contextoHub = obterContextoAcessoHub()) {
  contextoMenu = {
    loaded: Boolean(contextoHub?.carregado),
    loading: false,
    failed: false,
    permissions: contextoHub?.permissions || normalizarPermissoes([]),
    cards: contextoHub?.modulos || contextoHub?.cards || [],
    usuario: contextoHub?.usuario || null
  };

  aplicarMenu();
}

function navegarPeloMenu(route = '/') {
  if (!route) return;

  const destino = aplicarAliasMenuHub(aplicarBaseHub(route));
  const atual = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (atual !== destino) {
    window.history.pushState({}, '', destino);
  }

  abrirPaisDaRotaAtiva();
  salvarEstadoExpansao();
  window.dispatchEvent(new Event('popstate'));
  agendarRenderizacaoSidebars();
}

function tratarCliqueSidebar(event) {
  const toggle = event.target.closest('[data-hub-menu-toggle]');
  if (toggle) {
    const id = toggle.dataset.hubMenuToggle;
    const grupo = document.querySelector(`[data-hub-menu-group="${CSS.escape(id)}"]`);
    const estaAberto = grupo?.querySelector('[aria-expanded]')?.getAttribute('aria-expanded') === 'true';

    expandedGroups = {
      ...expandedGroups,
      [id]: !estaAberto
    };
    if (estaAberto) {
      manuallyCollapsedGroups.add(id);
    } else {
      manuallyCollapsedGroups.delete(id);
    }
    salvarEstadoExpansao();
    renderizarSidebars();
    return;
  }

  const routeButton = event.target.closest('[data-hub-menu-route]');
  if (!routeButton || routeButton.disabled) return;

  const route = routeButton.dataset.hubMenuRoute || '';
  navegarPeloMenu(route);
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hub-side-menu-shell {
      margin-top: 0;
    }

    .hub-side-menu-route {
      align-items: center;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
    }

    .hub-side-menu-route.is-disabled,
    .hub-side-menu-route:disabled {
      cursor: not-allowed;
      opacity: 0.52;
      transform: none !important;
      box-shadow: none !important;
    }

    .hub-side-menu-badge {
      border-radius: 999px;
      background: color-mix(in srgb, var(--cor-principal) 10%, transparent);
      color: var(--texto-suave);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.04em;
      padding: 3px 7px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .hub-side-menu-empty {
      color: var(--texto-suave);
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
      padding: 10px 2px;
    }

    .hub-side-menu-level-1.hub-side-menu-route {
      padding-left: 14px;
    }

    .hub-side-menu-level-2.hub-side-menu-route {
      padding-left: 22px;
    }

    .hub-side-menu-level-1.hub-side-menu-group-toggle,
    .hub-side-menu-level-2.hub-side-menu-group-toggle {
      padding: 9px 10px;
    }

    .hub-layout .admin-shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .hub-layout .admin-tabs {
      display: none !important;
    }

    @media (max-width: 980px) {
      .hub-shell {
        grid-template-columns: 1fr;
      }

      .hub-sidebar {
        position: relative;
        top: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function integrarMenuNoMain(main) {
  if (!main || main.dataset.hubSideMenuIntegrated === 'true') return;

  const topbar = main.querySelector(':scope > .topbar');
  if (!topbar) return;

  const shell = document.createElement('div');
  shell.className = 'hub-shell hub-side-menu-shell';

  const sidebar = document.createElement('aside');
  sidebar.className = 'hub-sidebar';
  sidebar.dataset.hubSideMenu = 'true';
  sidebar.addEventListener('click', tratarCliqueSidebar);

  const content = document.createElement('section');
  content.className = 'hub-content';

  let node = topbar.nextSibling;
  while (node) {
    const next = node.nextSibling;
    content.appendChild(node);
    node = next;
  }

  shell.appendChild(sidebar);
  shell.appendChild(content);
  main.appendChild(shell);
  main.classList.add('hub-layout');
  main.dataset.hubSideMenuIntegrated = 'true';

  sidebar.innerHTML = renderSidebarContent();
}

function aplicarMenu() {
  injetarEstilos();
  abrirPaisDaRotaAtiva();
  const app = document.getElementById('app');
  const main = app?.querySelector(':scope > main.dashboard');

  if (!main) return;

  integrarMenuNoMain(main);
  renderizarSidebars();
}

function observarApp() {
  if (observer) return;

  const app = document.getElementById('app');
  if (!app) return;

  observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarMenu);
  });

  observer.observe(app, {
    childList: true,
    subtree: false
  });
}

function iniciar() {
  aplicarMenu();
  observarApp();
  if (!cancelarObservacaoContexto) {
    cancelarObservacaoContexto = observarContextoAcessoHub(sincronizarContextoMenu);
  }
  carregarContextoMenu();
}

window.addEventListener('popstate', agendarRenderizacaoSidebars);
window.addEventListener('hashchange', agendarRenderizacaoSidebars);
window.addEventListener('hubAdminUsuariosAtualizados', () => {
  sincronizarContextoMenu();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
