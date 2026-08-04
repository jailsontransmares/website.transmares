const OPERACOES_CORRETORA_ROUTE = 'operacoes/corretora';
const STYLE_ID = 'operations-corretora-placeholder-style';

let observer = null;
let renderAgendado = false;

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function obterRotaAtual() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function estaNaRotaCorretoraOperacional() {
  return obterRotaAtual() === OPERACOES_CORRETORA_ROUTE;
}

function obterCaminhoAssetHub(caminhoAsset) {
  const base = obterBaseHub();
  const caminhoLimpo = String(caminhoAsset || '').replace(/^\/+/, '');

  return base ? `${base}/${caminhoLimpo}` : `/${caminhoLimpo}`;
}

function navegarHomeOperacoesCorretora() {
  const base = obterBaseHub();
  window.history.pushState({}, '', base ? `${base}/` : '/');
  window.dispatchEvent(new Event('popstate'));
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .operations-corretora-placeholder .operations-placeholder-card {
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.90), var(--glass-blue-bg)),
        var(--surface-glass-strong);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border: var(--glass-border-subtle);
      border-radius: var(--radius-card-highlight);
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 16px;
      padding: 26px;
    }

    .operations-corretora-placeholder .operations-placeholder-card h2 {
      color: var(--color-navy);
      font-size: 26px;
      font-weight: 800;
      margin: 0;
    }

    body.dark .operations-corretora-placeholder .operations-placeholder-card h2 {
      color: #E8EEF9;
    }

    .operations-corretora-placeholder .operations-placeholder-card p {
      color: var(--texto-suave);
      margin: 0;
      max-width: 72ch;
    }

    .operations-corretora-placeholder .operations-placeholder-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding-left: 18px;
      color: var(--texto-suave);
    }
  `;
  document.head.appendChild(style);
}

function renderizarPlaceholder() {
  const app = document.getElementById('app');
  if (!app || !estaNaRotaCorretoraOperacional()) return;

  if (app.querySelector('.login-card, .login-loading-screen')) {
    return;
  }

  const mainAtual = app.querySelector(':scope > main.dashboard');
  if (!mainAtual) return;

  if (mainAtual.dataset.operationsCorretoraPlaceholder === 'true') {
    return;
  }

  injetarEstilos();

  app.innerHTML = `
    <main class="dashboard operations-corretora-placeholder" data-operations-corretora-placeholder="true">
      <header class="topbar">
        <div class="brand-logo-slot" aria-label="Transmares Corretora de Seguros">
          <img src="${obterCaminhoAssetHub('assets/logo-transmares.png')}" alt="Transmares Corretora de Seguros">
        </div>
        <div class="brand">
          <h1>Operações da Corretora</h1>
          <p>Área reservada para a futura tela operacional da corretora.</p>
        </div>
        <div class="user-box">
          <button class="secondary-btn" type="button" onclick="navegarHomeOperacoesCorretora()">Voltar</button>
        </div>
      </header>

      <section class="operations-placeholder-card">
        <div>
          <h2>Corretora</h2>
          <p>Esta rota já está reservada no novo menu, mas a tela operacional ainda será definida e implementada.</p>
        </div>

        <ul class="operations-placeholder-list">
          <li>Não interfere nas Configurações da Corretora em Administração &gt; Sistema.</li>
          <li>Não altera dados, permissões ou módulos existentes.</li>
          <li>Serve apenas como ponto seguro para a futura área operacional.</li>
        </ul>
      </section>
    </main>
  `;
}

function agendarRenderizacao() {
  if (renderAgendado) return;

  renderAgendado = true;
  window.requestAnimationFrame(() => {
    renderAgendado = false;
    renderizarPlaceholder();
  });
}

function observarApp() {
  if (observer) return;

  const app = document.getElementById('app');
  if (!app) return;

  observer = new MutationObserver(agendarRenderizacao);
  observer.observe(app, {
    childList: true,
    subtree: false
  });
}

function iniciar() {
  window.navegarHomeOperacoesCorretora = navegarHomeOperacoesCorretora;
  agendarRenderizacao();
  observarApp();
}

window.addEventListener('popstate', agendarRenderizacao);
window.addEventListener('hashchange', agendarRenderizacao);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
