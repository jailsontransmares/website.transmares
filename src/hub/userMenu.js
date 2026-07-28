const MENU_ROOT_CLASS = 'hub-user-menu';
const STYLE_ID = 'hub-user-menu-style';

const ultimoUsuario = {
  nome: '',
  email: '',
  perfil: ''
};

let observador = null;
let eventosGlobaisRegistrados = false;

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

function alternarMenuUsuario(menu, aberto) {
  const dropdown = menu.querySelector('.hub-user-menu-dropdown');
  const trigger = menu.querySelector('.hub-user-menu-trigger');
  const deveAbrir = typeof aberto === 'boolean' ? aberto : dropdown?.hidden;

  if (!dropdown || !trigger) return;

  dropdown.hidden = !deveAbrir;
  menu.dataset.menuFechado = deveAbrir ? 'false' : 'true';
  trigger.setAttribute('aria-expanded', deveAbrir ? 'true' : 'false');
}

function fecharTodosMenusUsuario() {
  document.querySelectorAll(`.${MENU_ROOT_CLASS}`).forEach(menu => alternarMenuUsuario(menu, false));
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
}

function aplicarEstilosMenuUsuario() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hub-user-menu-host {
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      min-width: 240px;
      text-align: left;
      overflow: visible;
    }

    .hub-user-menu {
      position: relative;
      z-index: 80;
      width: 100%;
      max-width: 320px;
    }

    .hub-user-menu-trigger {
      width: 100%;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.78);
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
      border-radius: 999px;
      padding: 7px 10px 7px 7px;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 9px;
      align-items: center;
      cursor: pointer;
      color: #0f172a;
      font: inherit;
      text-align: left;
      backdrop-filter: blur(18px);
    }

    .dark .hub-user-menu-trigger {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.74);
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
      width: 42px;
      height: 42px;
      font-size: 0.88rem;
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
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.88rem;
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
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: min(320px, 86vw);
      border-radius: 22px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
      backdrop-filter: blur(22px);
      padding: 10px;
      z-index: 120;
    }

    .dark .hub-user-menu-dropdown {
      border-color: rgba(255,255,255,0.12);
      background: rgba(15, 23, 42, 0.96);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
    }

    .hub-user-menu-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 8px 8px 12px;
    }

    .hub-user-menu-header > div {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .hub-user-menu-item {
      width: 100%;
      border: 0;
      background: transparent;
      border-radius: 14px;
      padding: 10px 11px;
      display: flex;
      flex-direction: column;
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
