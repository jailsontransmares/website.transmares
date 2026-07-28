const MENU_ROOT_CLASS = 'hub-user-menu';
const STYLE_ID = 'hub-user-menu-style';

const ultimoUsuario = {
  nome: '',
  email: '',
  perfil: ''
};

let observador = null;
let eventosGlobaisRegistrados = false;
let menuAbertoAtual = null;

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterBaseHub() {
  const pathname = window.location.pathname || '/';
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function obterTextoLimpo(elemento) {
  return String(elemento?.textContent || '').replace(/\s+/g, ' ').trim();
}

function obterUsuarioDoBox(box) {
  const nomeHub = box.querySelector('.hub-user-box-copy strong')?.textContent || '';
  const emailHub = box.querySelector('.hub-user-box-copy span')?.textContent || '';
  const nomeAntigo = box.querySelector('strong')?.textContent || '';
  const textoCompleto = obterTextoLimpo(box);
  const emailEncontrado = textoCompleto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const perfil = box.dataset?.perfil || box.querySelector('[data-user-profile]')?.textContent || '';

  const nome = String(nomeHub || nomeAntigo || ultimoUsuario.nome || 'Usuário').trim();
  const email = String(emailHub || emailEncontrado || ultimoUsuario.email || '').trim();

  ultimoUsuario.nome = nome;
  ultimoUsuario.email = email;
  ultimoUsuario.perfil = String(perfil || ultimoUsuario.perfil || 'Usuário conectado').trim();

  return { ...ultimoUsuario };
}

function obterIniciais(nome = '', email = '') {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return String(email || 'US').slice(0, 2).toUpperCase();
}

function usuarioPodeVerConfiguracoes() {
  return Boolean(
    document.querySelector('.hub-sidebar [onclick*="admin"]')
    || document.querySelector('.module-card[onclick*="administracao"]')
    || document.querySelector('.module-card[onclick*="admin"]')
    || document.querySelector('.admin-shell')
  );
}

function obterUrlHub(path = '') {
  const base = obterBaseHub() || '/hub';
  const limpo = String(path || '').replace(/^\/+/, '');
  return limpo ? `${base}/${limpo}` : `${base}/`;
}

function navegarMenuUsuario(destino) {
  fecharTodosMenusUsuario();

  if (destino === 'perfil') {
    if (typeof window.navegarParaModulo === 'function') {
      window.navegarParaModulo('perfil');
      return;
    }

    window.location.assign(obterUrlHub('perfil'));
    return;
  }

  if (destino === 'configuracoes') {
    window.location.assign(obterUrlHub('configuracoes'));
  }
}

function renderMenu(usuario) {
  const iniciais = obterIniciais(usuario.nome, usuario.email);
  const mostrarConfiguracoes = usuarioPodeVerConfiguracoes();

  return `
    <div class="${MENU_ROOT_CLASS}" data-menu-fechado="true">
      <button class="hub-user-menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
        <span class="hub-user-menu-avatar" aria-hidden="true">${escapeHtml(iniciais)}</span>
        <span class="hub-user-menu-copy">
          <strong>${escapeHtml(usuario.nome)}</strong>
          ${usuario.email ? `<small>${escapeHtml(usuario.email)}</small>` : ''}
        </span>
        <span class="hub-user-menu-caret" aria-hidden="true">▾</span>
      </button>

      <div class="hub-user-menu-dropdown" role="menu" hidden>
        <div class="hub-user-menu-header">
          <span class="hub-user-menu-avatar large" aria-hidden="true">${escapeHtml(iniciais)}</span>
          <div>
            <strong>${escapeHtml(usuario.nome)}</strong>
            ${usuario.email ? `<small>${escapeHtml(usuario.email)}</small>` : ''}
            <em>${escapeHtml(usuario.perfil || 'Usuário conectado')}</em>
          </div>
        </div>

        <button class="hub-user-menu-item" type="button" role="menuitem" data-user-menu-action="perfil">
          <span>Meu perfil</span>
          <small>Dados pessoais e senha</small>
        </button>

        ${mostrarConfiguracoes ? `
          <button class="hub-user-menu-item" type="button" role="menuitem" data-user-menu-action="configuracoes">
            <span>Configurações</span>
            <small>Dados da corretora e identidade</small>
          </button>
        ` : ''}

        <button class="hub-user-menu-item" type="button" role="menuitem" data-user-menu-action="tema">
          <span>Alternar tema</span>
          <small>Claro ou escuro</small>
        </button>

        <div class="hub-user-menu-separator" aria-hidden="true"></div>

        <button class="hub-user-menu-item danger" type="button" role="menuitem" data-user-menu-action="sair">
          <span>Sair</span>
          <small>Encerrar sessão com segurança</small>
        </button>
      </div>
    </div>
  `;
}

function posicionarDropdown(menu) {
  const trigger = menu?.querySelector('.hub-user-menu-trigger');
  const dropdown = menu?.querySelector('.hub-user-menu-dropdown');

  if (!trigger || !dropdown || dropdown.hidden) return;

  const rect = trigger.getBoundingClientRect();
  const margem = 16;
  const topo = Math.min(rect.bottom + 10, window.innerHeight - margem);
  const direita = Math.max(margem, window.innerWidth - rect.right);
  const larguraMaxima = Math.min(360, window.innerWidth - margem * 2);
  const alturaMaxima = Math.max(180, window.innerHeight - topo - margem);

  dropdown.style.setProperty('--hub-user-menu-top', `${topo}px`);
  dropdown.style.setProperty('--hub-user-menu-right', `${direita}px`);
  dropdown.style.setProperty('--hub-user-menu-width', `${larguraMaxima}px`);
  dropdown.style.setProperty('--hub-user-menu-max-height', `${alturaMaxima}px`);
}

function alternarMenuUsuario(menu, aberto) {
  const dropdown = menu?.querySelector('.hub-user-menu-dropdown');
  const trigger = menu?.querySelector('.hub-user-menu-trigger');
  const deveAbrir = typeof aberto === 'boolean' ? aberto : dropdown?.hidden;

  if (!dropdown || !trigger) return;

  if (deveAbrir) {
    fecharTodosMenusUsuario(menu);
    dropdown.hidden = false;
    menu.dataset.menuFechado = 'false';
    trigger.setAttribute('aria-expanded', 'true');
    menuAbertoAtual = menu;
    window.requestAnimationFrame(() => posicionarDropdown(menu));
    return;
  }

  dropdown.hidden = true;
  dropdown.removeAttribute('style');
  menu.dataset.menuFechado = 'true';
  trigger.setAttribute('aria-expanded', 'false');

  if (menuAbertoAtual === menu) {
    menuAbertoAtual = null;
  }
}

function fecharTodosMenusUsuario(excecao = null) {
  document.querySelectorAll(`.${MENU_ROOT_CLASS}`).forEach(menu => {
    if (menu !== excecao) {
      alternarMenuUsuario(menu, false);
    }
  });
}

function executarAcaoMenuUsuario(acao) {
  if (acao === 'perfil') {
    navegarMenuUsuario('perfil');
    return;
  }

  if (acao === 'configuracoes') {
    navegarMenuUsuario('configuracoes');
    return;
  }

  if (acao === 'tema') {
    fecharTodosMenusUsuario();
    if (typeof window.alternarTema === 'function') {
      window.alternarTema();
    }
    return;
  }

  if (acao === 'sair') {
    fecharTodosMenusUsuario();
    if (typeof window.sair === 'function') {
      window.sair();
    }
  }
}

function registrarEventosGlobais() {
  if (eventosGlobaisRegistrados) return;
  eventosGlobaisRegistrados = true;

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.hub-user-menu-trigger');
    if (trigger) {
      const menu = trigger.closest(`.${MENU_ROOT_CLASS}`);
      alternarMenuUsuario(menu);
      return;
    }

    const item = event.target.closest('[data-user-menu-action]');
    if (item) {
      executarAcaoMenuUsuario(item.dataset.userMenuAction);
      return;
    }

    if (!event.target.closest(`.${MENU_ROOT_CLASS}`)) {
      fecharTodosMenusUsuario();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      fecharTodosMenusUsuario();
    }
  });

  window.addEventListener('resize', () => {
    if (menuAbertoAtual) posicionarDropdown(menuAbertoAtual);
  });

  window.addEventListener('scroll', () => {
    if (menuAbertoAtual) posicionarDropdown(menuAbertoAtual);
  }, true);
}

function aplicarEstilosMenuUsuario() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .topbar {
      overflow: visible !important;
      position: relative;
      z-index: 20;
    }

    .user-box.hub-user-menu-host,
    .hub-user-box.hub-user-menu-host {
      position: relative !important;
      display: flex !important;
      justify-content: flex-end !important;
      align-items: center !important;
      width: clamp(248px, 28vw, 340px) !important;
      min-width: 0 !important;
      max-width: 340px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      color: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      text-align: left !important;
      overflow: visible !important;
    }

    .hub-user-menu {
      position: relative;
      z-index: 9998;
      width: 100%;
      max-width: 340px;
      overflow: visible;
      isolation: isolate;
    }

    .hub-user-menu-trigger {
      width: 100%;
      min-height: 50px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      border-radius: 999px;
      padding: 7px 11px 7px 7px;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 9px;
      align-items: center;
      cursor: pointer;
      color: #0f172a;
      font: inherit;
      text-align: left;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .dark .hub-user-menu-trigger {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.86);
      color: #e5e7eb;
    }

    .hub-user-menu-avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
      background: linear-gradient(135deg, var(--cor-principal, #294895), var(--cor-destaque, #16A34A));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24);
      flex: 0 0 auto;
    }

    .hub-user-menu-avatar.large {
      width: 44px;
      height: 44px;
      font-size: 0.9rem;
    }

    .hub-user-menu-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
      line-height: 1.12;
    }

    .hub-user-menu-copy strong,
    .hub-user-menu-header strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.88rem;
      line-height: 1.18;
    }

    .hub-user-menu-copy small,
    .hub-user-menu-header small,
    .hub-user-menu-header em,
    .hub-user-menu-item small {
      color: #64748b;
      font-size: 0.72rem;
      font-style: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.22;
    }

    .dark .hub-user-menu-copy small,
    .dark .hub-user-menu-header small,
    .dark .hub-user-menu-header em,
    .dark .hub-user-menu-item small {
      color: #94a3b8;
    }

    .hub-user-menu-caret {
      color: #64748b;
      font-size: 0.8rem;
    }

    .hub-user-menu-dropdown {
      position: fixed;
      top: var(--hub-user-menu-top, 84px);
      right: var(--hub-user-menu-right, 24px);
      width: min(var(--hub-user-menu-width, 360px), calc(100vw - 32px));
      max-height: var(--hub-user-menu-max-height, calc(100vh - 100px));
      overflow: auto;
      overscroll-behavior: contain;
      border-radius: 22px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      padding: 10px;
      z-index: 9999;
    }

    .hub-user-menu-dropdown[hidden] {
      display: none !important;
    }

    .dark .hub-user-menu-dropdown {
      border-color: rgba(255,255,255,0.12);
      background: rgba(15, 23, 42, 0.98);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
    }

    .hub-user-menu-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 8px 8px 12px;
      min-width: 0;
    }

    .hub-user-menu-header > div {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .hub-user-menu-item {
      width: 100%;
      min-height: 54px;
      border: 0;
      background: transparent;
      border-radius: 14px;
      padding: 10px 11px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      text-align: left;
      color: #0f172a;
      cursor: pointer;
      font: inherit;
    }

    .dark .hub-user-menu-item {
      color: #e5e7eb;
    }

    .hub-user-menu-item:hover,
    .hub-user-menu-item:focus-visible {
      background: rgba(41, 72, 149, 0.08);
      outline: none;
    }

    .dark .hub-user-menu-item:hover,
    .dark .hub-user-menu-item:focus-visible {
      background: rgba(255, 255, 255, 0.08);
    }

    .hub-user-menu-item span {
      font-weight: 750;
      font-size: 0.86rem;
      line-height: 1.22;
    }

    .hub-user-menu-item.danger span,
    .hub-user-menu-item.danger small {
      color: #dc2626;
    }

    .hub-user-menu-separator {
      height: 1px;
      margin: 8px 6px;
      background: rgba(15, 23, 42, 0.10);
    }

    .dark .hub-user-menu-separator {
      background: rgba(255, 255, 255, 0.10);
    }

    @media (max-width: 760px) {
      .user-box.hub-user-menu-host,
      .hub-user-box.hub-user-menu-host {
        width: min(100%, 320px) !important;
        max-width: 320px !important;
      }

      .hub-user-menu-copy small {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function aplicarMenuUsuario() {
  aplicarEstilosMenuUsuario();
  registrarEventosGlobais();

  const topbar = document.querySelector('.topbar');
  if (!topbar) return;

  const box = topbar.querySelector('.hub-user-box, .user-box');
  if (!box || box.querySelector(`.${MENU_ROOT_CLASS}`)) return;

  const usuario = obterUsuarioDoBox(box);
  box.classList.add('hub-user-menu-host');
  box.innerHTML = renderMenu(usuario);
}

function observarRenderizacoes() {
  if (observador) return;

  observador = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarMenuUsuario);
  });

  observador.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciarMenuUsuario() {
  aplicarMenuUsuario();
  observarRenderizacoes();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarMenuUsuario);
} else {
  iniciarMenuUsuario();
}
