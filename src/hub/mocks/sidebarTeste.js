import './sidebarTeste.css';

const sidebarTesteUi = {
  collapsed: false,
  drawerOpen: false,
  activeId: 'inicio',
  context: null
};

const ferramentasMock = [
  {
    id: 'cotacao-saude',
    titulo: 'Cotação Plano de Saúde',
    descricao: 'Simulação visual da futura ferramenta de cotação.',
    badge: 'teste'
  },
  {
    id: 'nps-ar',
    titulo: 'NPS AR',
    descricao: 'Acompanhamento mockado das pesquisas da Autoridade de Registro.',
    badge: 'novo'
  },
  {
    id: 'nps-corretora',
    titulo: 'NPS Corretora',
    descricao: 'Visão mockada das pesquisas de satisfação da corretora.',
    badge: 'novo'
  },
  {
    id: 'recibos-ar',
    titulo: 'Recibos AR',
    descricao: 'Atalho visual para emissão e consulta de recibos.',
    badge: 'teste'
  }
];

const gruposMenuMock = [
  {
    titulo: 'Principal',
    itens: [
      { id: 'inicio', titulo: 'Início', rota: 'sidebar-teste' }
    ]
  },
  {
    titulo: 'Módulos',
    itens: [
      {
        id: 'painel-ar',
        titulo: 'Painel AR',
        rota: 'painel-ar',
        badge: 'ativo',
        subitens: [
          { id: 'painel-ar-gerar', titulo: 'Gerar links', badge: 'mock' },
          { id: 'painel-ar-produtos', titulo: 'Lista produtos', badge: 'mock' },
          { id: 'painel-ar-validacoes', titulo: 'Validações', badge: 'teste' },
          { id: 'painel-ar-historico', titulo: 'Histórico', badge: 'mock' }
        ]
      },
      { id: 'central-senhas', titulo: 'Central de Senhas', rota: 'central-senhas' },
      { id: 'links-corretora', titulo: 'Links Corretora', rota: 'links-corretora' },
      { id: 'links-ar', titulo: 'Links AR', rota: 'links-ar' },
      { id: 'links-gestao', titulo: 'Links Gestão', rota: 'links-gestao', badge: 'admin' }
    ]
  },
  {
    titulo: 'Ferramentas',
    itens: [
      { id: 'menu-cotacao-saude', titulo: 'Cotação Plano de Saúde', badge: 'teste' },
      { id: 'menu-nps-ar', titulo: 'NPS AR', badge: 'novo' },
      { id: 'menu-nps-corretora', titulo: 'NPS Corretora', badge: 'novo' },
      { id: 'menu-recibos-ar', titulo: 'Recibos AR', badge: 'teste' }
    ]
  },
  {
    titulo: 'Gestão',
    itens: [
      { id: 'administracao', titulo: 'Administração', rota: 'admin', badge: 'admin' }
    ]
  }
];

export function renderSidebarTeste(context = {}) {
  sidebarTesteUi.context = context;

  const app = document.getElementById('app');
  if (!app) return;

  const state = context.state || {};
  const nomeSistema = state.config?.nome_sistema || 'PAINEL TRANSMARES';
  const subtitulo = state.config?.subtitulo_sistema || 'Central operacional da Transmares Corretora de Seguros';
  const renderHeaderLogo = context.renderHeaderLogo || (() => '');
  const renderAvisos = context.renderAvisos || (() => '<p>Nenhum aviso ativo no momento.</p>');
  const renderAniversariantes = context.renderAniversariantes || (() => '<p>Nenhum aniversariante nos próximos dias.</p>');
  const renderFavoritos = context.renderFavoritos || (() => '<span class="quick-link-empty">Nenhum favorito cadastrado.</span>');

  app.innerHTML = `
    <main class="dashboard sidebar-test-dashboard ${sidebarTesteUi.collapsed ? 'sidebar-test-collapsed' : ''} ${sidebarTesteUi.drawerOpen ? 'sidebar-test-drawer-open' : ''}">
      <header class="topbar">
        ${renderHeaderLogo()}
        <div class="brand">
          <h1>${escapeHtmlTeste(nomeSistema)}</h1>
          <p>${escapeHtmlTeste(subtitulo)}</p>
        </div>

        <div class="user-box">
          <strong>${escapeHtmlTeste(state.usuario?.nome || '')}</strong><br>
          ${escapeHtmlTeste(state.usuario?.email || '')}

          <br>
          <button class="theme-btn icon-only" onclick="alternarTema()" title="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}" aria-label="${state.temaAtual === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'}">
            ${state.temaAtual === 'escuro' ? '☀️' : '🌙'}
          </button>
          <button class="secondary-btn logout-btn" type="button" onclick="sair()">Sair</button>
        </div>
      </header>

      <button class="sidebar-test-mobile-toggle" type="button" onclick="abrirDrawerSidebarTeste()">
        ☰ Menu do Hub
      </button>

      <section class="sidebar-test-shell">
        <div class="sidebar-test-overlay" onclick="fecharDrawerSidebarTeste()"></div>

        ${renderSidebarMock()}

        <section class="sidebar-test-content" aria-label="Painel inicial mockado do Hub">
          <div class="sidebar-test-page-header">
            <div>
              <span class="sidebar-test-kicker">Tela mockada</span>
              <h2>Painel inicial do Hub</h2>
              <p>Validação visual do menu lateral esquerdo sem alterar a Home atual.</p>
            </div>
            <button class="secondary-btn" type="button" onclick="navegarHome()">Voltar para Home atual</button>
          </div>

          <section class="info-grid sidebar-test-info-grid">
            <div class="info-card">
              <div class="info-card-header">
                <span class="info-icon">📢</span>
                <h2>Avisos internos</h2>
              </div>
              ${renderAvisos()}
            </div>

            <div class="info-card">
              <div class="info-card-header">
                <span class="info-icon">🎂</span>
                <h2>Aniversariantes</h2>
              </div>
              ${renderAniversariantes()}
            </div>
          </section>

          <section class="quick-links-strip sidebar-test-strip">
            <div class="quick-links-title">
              <span>⭐</span>
              <strong>Links rápidos</strong>
            </div>

            <div class="quick-links-list">
              ${renderFavoritos()}
            </div>
          </section>

          <section class="sidebar-test-tools-row">
            <div class="sidebar-test-section-title">
              <div>
                <span class="sidebar-test-kicker">Nova linha</span>
                <h3>Ferramentas</h3>
                <p>Espaço reservado para recursos operacionais que também aparecem no menu lateral.</p>
              </div>
            </div>

            <div class="sidebar-test-tools-grid">
              ${ferramentasMock.map(renderFerramentaMock).join('')}
            </div>
          </section>
        </section>
      </section>
    </main>
  `;
}

function renderSidebarMock() {
  return `
    <aside class="sidebar-test-nav" aria-label="Menu lateral de teste do Hub">
      <div class="sidebar-test-nav-header">
        <div class="sidebar-test-nav-title">
          <strong>Hub</strong>
          <span>Navegação lateral</span>
        </div>
        <button class="sidebar-test-collapse-btn" type="button" onclick="alternarSidebarTeste()" title="Recolher/expandir menu" aria-label="Recolher ou expandir menu">
          ${sidebarTesteUi.collapsed ? '›' : '‹'}
        </button>
        <button class="sidebar-test-close-drawer" type="button" onclick="fecharDrawerSidebarTeste()" aria-label="Fechar menu">×</button>
      </div>

      <label class="sidebar-test-search">
        <span>Buscar módulo</span>
        <input type="search" placeholder="Buscar..." oninput="filtrarSidebarTeste(this.value)" autocomplete="off">
      </label>

      <nav class="sidebar-test-groups">
        ${gruposMenuMock.map(renderSidebarGroupMock).join('')}
      </nav>
    </aside>
  `;
}

function renderSidebarGroupMock(grupo) {
  return `
    <section class="sidebar-test-group" data-sidebar-search-group>
      <p class="sidebar-test-group-title">${escapeHtmlTeste(grupo.titulo)}</p>
      <div class="sidebar-test-group-items">
        ${grupo.itens.map(item => renderSidebarItemMock(item)).join('')}
      </div>
    </section>
  `;
}

function renderSidebarItemMock(item, nested = false) {
  const ativo = sidebarTesteUi.activeId === item.id;
  const termoBusca = `${item.titulo || ''} ${item.badge || ''} ${(item.subitens || []).map(subitem => subitem.titulo).join(' ')}`.toLowerCase();

  return `
    <div class="sidebar-test-item-wrap ${nested ? 'is-nested' : ''}" data-sidebar-search-item="${escapeAttrTeste(termoBusca)}">
      <button
        class="sidebar-test-item ${ativo ? 'is-active' : ''} ${nested ? 'is-nested' : ''}"
        type="button"
        onclick="selecionarSidebarTeste('${escapeAttrTeste(item.id)}', '${escapeAttrTeste(item.rota || '')}', ${item.rota ? 'true' : 'false'})"
        title="${escapeAttrTeste(item.titulo)}"
      >
        <span class="sidebar-test-item-label">${escapeHtmlTeste(item.titulo)}</span>
        ${item.badge ? `<span class="sidebar-test-badge is-${escapeAttrTeste(item.badge)}">${escapeHtmlTeste(item.badge)}</span>` : ''}
      </button>

      ${item.subitens?.length ? `
        <div class="sidebar-test-subitems">
          ${item.subitens.map(subitem => renderSidebarItemMock(subitem, true)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderFerramentaMock(ferramenta) {
  return `
    <article class="sidebar-test-tool-card" role="button" tabindex="0" onclick="selecionarSidebarTeste('${escapeAttrTeste(ferramenta.id)}', '', false)">
      <div class="sidebar-test-tool-card-top">
        <h4>${escapeHtmlTeste(ferramenta.titulo)}</h4>
        <span class="sidebar-test-badge is-${escapeAttrTeste(ferramenta.badge)}">${escapeHtmlTeste(ferramenta.badge)}</span>
      </div>
      <p>${escapeHtmlTeste(ferramenta.descricao)}</p>
    </article>
  `;
}

function selecionarSidebarTeste(id, rota, deveNavegar) {
  sidebarTesteUi.activeId = id || 'inicio';
  sidebarTesteUi.drawerOpen = false;

  const navegar = sidebarTesteUi.context?.navegarParaModulo || window.navegarParaModulo;

  if (deveNavegar && rota && typeof navegar === 'function') {
    navegar(rota);
    return;
  }

  renderSidebarTeste(sidebarTesteUi.context || {});
}

function alternarSidebarTeste() {
  sidebarTesteUi.collapsed = !sidebarTesteUi.collapsed;
  renderSidebarTeste(sidebarTesteUi.context || {});
}

function abrirDrawerSidebarTeste() {
  sidebarTesteUi.drawerOpen = true;
  renderSidebarTeste(sidebarTesteUi.context || {});
}

function fecharDrawerSidebarTeste() {
  sidebarTesteUi.drawerOpen = false;
  renderSidebarTeste(sidebarTesteUi.context || {});
}

function filtrarSidebarTeste(valor = '') {
  const termo = String(valor || '').trim().toLowerCase();
  const itens = document.querySelectorAll('[data-sidebar-search-item]');
  const grupos = document.querySelectorAll('[data-sidebar-search-group]');

  itens.forEach(item => {
    const texto = item.getAttribute('data-sidebar-search-item') || '';
    item.classList.toggle('is-hidden', Boolean(termo) && !texto.includes(termo));
  });

  grupos.forEach(grupo => {
    const itensVisiveis = grupo.querySelectorAll('[data-sidebar-search-item]:not(.is-hidden)');
    grupo.classList.toggle('is-hidden', itensVisiveis.length === 0);
  });
}

function escapeHtmlTeste(valor = '') {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttrTeste(valor = '') {
  return escapeHtmlTeste(valor).replace(/`/g, '&#096;');
}

Object.assign(window, {
  abrirDrawerSidebarTeste,
  alternarSidebarTeste,
  fecharDrawerSidebarTeste,
  filtrarSidebarTeste,
  selecionarSidebarTeste
});
