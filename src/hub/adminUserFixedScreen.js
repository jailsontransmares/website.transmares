const STYLE_ID = 'admin-user-fixed-screen-style';

let observerInstalled = false;
let applying = false;
let originalAbrirModalNovoRegistro = null;
let originalEditarUsuarioAdmin = null;
let originalFecharModalNovoRegistro = null;
let originalAbrirPermissoesPeloModalUsuario = null;
let originalVoltarEtapaModalUsuarioAdmin = null;

function obterEstadoTela() {
  return typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : { modo: '', id: '', etapa: 'dados' };
}

function definirEstadoTela(estado) {
  if (typeof window.hubDefinirEstadoUsuarioTelaAdmin === 'function') {
    window.hubDefinirEstadoUsuarioTelaAdmin(estado, { render: false });
  }
}

function injetarEstilos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-fixed-shell {
      margin-top: 18px;
      display: grid;
      gap: 18px;
      max-width: 1040px;
    }

    .admin-user-fixed-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.80);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    body.dark .admin-user-fixed-header {
      background: rgba(15, 23, 42, 0.70);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-fixed-header h3 {
      margin: 0;
      font-size: 1.22rem;
      letter-spacing: -0.035em;
      color: var(--text-strong, #0f172a);
    }

    .admin-user-fixed-header p {
      margin: 5px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .admin-user-fixed-card {
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 22px 70px rgba(15, 23, 42, 0.10);
      padding: 20px;
      display: grid;
      gap: 16px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    body.dark .admin-user-fixed-card {
      background: rgba(15, 23, 42, 0.76);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-fixed-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 16px;
      align-items: start;
    }

    .admin-user-fixed-section {
      display: grid;
      gap: 14px;
      min-width: 0;
      border-radius: 22px;
      background: rgba(248, 250, 252, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.22);
      padding: 18px;
    }

    body.dark .admin-user-fixed-section {
      background: rgba(30, 41, 59, 0.48);
      border-color: rgba(148, 163, 184, 0.16);
    }

    .admin-user-fixed-section-header h4 {
      margin: 0;
      color: var(--text-strong, #0f172a);
      font-size: 0.98rem;
      letter-spacing: -0.02em;
    }

    .admin-user-fixed-section-header p {
      margin: 4px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .admin-user-fixed-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .admin-user-fixed-fields label,
    .admin-user-fixed-fields .admin-users-phase5-field,
    .admin-user-fixed-access label,
    .admin-user-fixed-access .admin-users-phase5-field {
      display: grid;
      gap: 7px;
      margin: 0;
      min-width: 0;
    }

    .admin-user-fixed-fields label span,
    .admin-user-fixed-fields .admin-users-phase5-field span,
    .admin-user-fixed-access label span,
    .admin-user-fixed-access .admin-users-phase5-field span {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-muted, #64748b);
    }

    .admin-user-fixed-fields .config-input,
    .admin-user-fixed-access .config-input {
      width: 100%;
      min-width: 0;
    }

    .admin-user-fixed-access {
      display: grid;
      gap: 13px;
    }

    .admin-user-fixed-access .admin-users-phase5-password-row {
      grid-template-columns: 1fr;
      margin-top: 0;
    }

    .admin-user-fixed-access .admin-users-phase5-note,
    .admin-user-fixed-access .admin-users-phase5-status-note {
      margin: 0;
    }

    .admin-user-fixed-access .admin-user-access-panel {
      margin: 0;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid rgba(148, 163, 184, 0.20);
      padding: 14px;
    }

    body.dark .admin-user-fixed-access .admin-user-access-panel {
      background: rgba(15, 23, 42, 0.38);
      border-color: rgba(148, 163, 184, 0.14);
    }

    .admin-user-fixed-access .admin-user-access-actions,
    .admin-user-fixed-access .admin-user-password-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .admin-user-fixed-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 4px;
    }

    .admin-user-fixed-card .small-modal-actions {
      margin-top: 0;
      justify-content: flex-end;
    }

    .admin-user-fixed-card.is-permissions-stage {
      padding: 16px;
    }

    .admin-user-fixed-card.is-permissions-stage .admin-user-fixed-layout {
      display: block;
    }

    .admin-user-fixed-card.is-permissions-stage .permission-modal-layout {
      max-height: none;
    }

    .admin-user-fixed-card.is-permissions-stage .permission-modal-content {
      max-height: min(68vh, 760px);
      overflow: auto;
      padding-right: 4px;
    }

    .admin-user-fixed-card.is-permissions-stage .admin-user-permissions-actions {
      position: sticky;
      bottom: 0;
      background: inherit;
      padding-top: 12px;
      margin-top: 12px;
    }

    .admin-user-fixed-hidden-list > .admin-panel-header,
    .admin-user-fixed-hidden-list > .admin-message,
    .admin-user-fixed-hidden-list > .quick-link-empty,
    .admin-user-fixed-hidden-list > .crud-list,
    .admin-user-fixed-hidden-list > .admin-users-pagination {
      display: none !important;
    }

    .admin-user-fixed-hidden-list > .modal-backdrop {
      display: none !important;
    }

    .admin-user-fixed-shell .modal-backdrop,
    .admin-user-fixed-shell .small-modal,
    .admin-user-fixed-shell .admin-user-modal {
      position: static !important;
      inset: auto !important;
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
      height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      transform: none !important;
      display: contents !important;
    }

    .admin-user-fixed-shell .small-modal-header {
      display: none !important;
    }

    @media (max-width: 980px) {
      .admin-user-fixed-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 760px) {
      .admin-user-fixed-header {
        flex-direction: column;
      }

      .admin-user-fixed-fields {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function obterPainelUsuarios() {
  return Array.from(document.querySelectorAll('.admin-panel')).find(panel => {
    const titulo = panel.querySelector('.admin-users-header-row h2, .admin-panel-header h2')?.textContent?.trim().toLowerCase();
    return titulo === 'usuários' || titulo === 'usuarios';
  }) || null;
}

function prepararModalLegado(estado) {
  if (applying) return;
  if (!estado.modo) return;

  const temModal = document.querySelector('.admin-user-modal');
  if (temModal) return;

  applying = true;
  try {
    if (estado.etapa === 'permissoes' && estado.id && typeof originalAbrirPermissoesPeloModalUsuario === 'function') {
      originalAbrirPermissoesPeloModalUsuario(estado.id);
      return;
    }

    if (typeof window.abrirModalUsuarioAdmin === 'function') {
      window.abrirModalUsuarioAdmin(estado.modo === 'editar' ? estado.id : '');
    }
  } finally {
    applying = false;
  }
}

function criarCabecalhoFixo(estado) {
  const titulo = estado.etapa === 'permissoes'
    ? 'Permissões do usuário'
    : estado.modo === 'editar'
      ? 'Editar usuário'
      : 'Adicionar usuário';
  const descricao = estado.etapa === 'permissoes'
    ? 'Gerencie as permissões adicionais deste usuário.'
    : 'Preencha os dados cadastrais e de acesso do usuário.';

  const header = document.createElement('div');
  header.className = 'admin-user-fixed-header';
  header.innerHTML = `
    <div>
      <h3>${titulo}</h3>
      <p>${descricao}</p>
    </div>
    <button class="secondary-btn" type="button" onclick="voltarListaUsuariosAdmin()">Voltar para usuários</button>
  `;
  return header;
}

function obterTextoLabel(elemento) {
  return elemento?.querySelector('span')?.textContent?.trim().toLowerCase() || '';
}

function moverPorLabel(origem, destino, rotulos = []) {
  rotulos.forEach(rotulo => {
    const alvo = Array.from(origem.querySelectorAll(':scope > label, :scope > .admin-users-phase5-field'))
      .find(item => obterTextoLabel(item) === rotulo);
    if (alvo) destino.appendChild(alvo);
  });
}

function organizarFormularioDados(card) {
  const modal = card.querySelector('.admin-user-modal');
  if (!modal || modal.dataset.fixedLayoutOrganized === 'true') return;
  if (modal.querySelector('.permission-modal-layout')) return;

  const layout = document.createElement('div');
  layout.className = 'admin-user-fixed-layout';

  const dadosSection = document.createElement('section');
  dadosSection.className = 'admin-user-fixed-section';
  dadosSection.innerHTML = `
    <div class="admin-user-fixed-section-header">
      <h4>Dados cadastrais</h4>
      <p>Informações básicas de identificação do usuário no Hub.</p>
    </div>
    <div class="admin-user-fixed-fields"></div>
  `;

  const acessoSection = document.createElement('section');
  acessoSection.className = 'admin-user-fixed-section admin-user-fixed-access';
  acessoSection.innerHTML = `
    <div class="admin-user-fixed-section-header">
      <h4>Acesso e permissões</h4>
      <p>Controle de perfil, status, senha e permissões adicionais.</p>
    </div>
  `;

  const camposDados = dadosSection.querySelector('.admin-user-fixed-fields');
  moverPorLabel(modal, camposDados, ['nome', 'e-mail', 'cpf', 'telefone']);
  moverPorLabel(modal, acessoSection, ['perfil', 'status']);

  Array.from(modal.children).forEach(child => {
    if (child.classList?.contains('admin-users-phase5-status-note')) {
      acessoSection.appendChild(child);
    }
  });

  Array.from(modal.children).forEach(child => {
    if (child.classList?.contains('admin-users-phase5-password-row')
      || child.classList?.contains('admin-users-phase5-note')
      || child.classList?.contains('admin-user-access-panel')) {
      acessoSection.appendChild(child);
    }
  });

  const actions = Array.from(modal.children).find(child => child.classList?.contains('small-modal-actions'));
  if (actions) {
    actions.classList.add('admin-user-fixed-actions');
  }

  layout.appendChild(dadosSection);
  layout.appendChild(acessoSection);
  modal.insertBefore(layout, modal.firstChild);

  if (actions) {
    modal.appendChild(actions);
  }

  modal.dataset.fixedLayoutOrganized = 'true';
}

function montarTelaFixa(estado) {
  const painel = obterPainelUsuarios();
  const backdrop = document.querySelector('.admin-user-modal')?.closest('.modal-backdrop');
  const modal = document.querySelector('.admin-user-modal');

  if (!painel || !backdrop || !modal) return;

  let shell = painel.querySelector('.admin-user-fixed-shell');
  if (!shell) {
    shell = document.createElement('div');
    shell.className = 'admin-user-fixed-shell';
    painel.appendChild(shell);
  }

  shell.innerHTML = '';
  shell.appendChild(criarCabecalhoFixo(estado));

  const card = document.createElement('section');
  card.className = `admin-user-fixed-card ${estado.etapa === 'permissoes' ? 'is-permissions-stage' : ''}`.trim();
  card.appendChild(backdrop);
  shell.appendChild(card);

  organizarFormularioDados(card);
  painel.classList.add('admin-user-fixed-hidden-list');

  if (typeof window.hubAdminUsersGerarSenhaPhase5 === 'function') {
    window.setTimeout(() => window.dispatchEvent(new Event('hubAdminUsuarioTelaRenderSolicitado')), 0);
  }
}

function limparTelaFixaSeNecessario(estado) {
  if (estado.modo) return;

  document.querySelectorAll('.admin-user-fixed-shell').forEach(item => item.remove());
  document.querySelectorAll('.admin-user-fixed-hidden-list').forEach(item => item.classList.remove('admin-user-fixed-hidden-list'));
}

function aplicarTelaFixaUsuario() {
  const estado = obterEstadoTela();
  injetarEstilos();
  limparTelaFixaSeNecessario(estado);

  if (!estado.modo) return;

  prepararModalLegado(estado);
  window.requestAnimationFrame(() => montarTelaFixa(estado));
}

function instalarOverrides() {
  if (!originalAbrirModalNovoRegistro && typeof window.abrirModalNovoRegistro === 'function') {
    originalAbrirModalNovoRegistro = window.abrirModalNovoRegistro;
    window.abrirModalNovoRegistro = function abrirModalNovoRegistroFixo(entidade) {
      if (entidade === 'usuarios' && typeof window.abrirTelaNovoUsuarioAdmin === 'function') {
        window.abrirTelaNovoUsuarioAdmin();
        return;
      }
      return originalAbrirModalNovoRegistro.apply(this, arguments);
    };
  }

  if (!originalEditarUsuarioAdmin && typeof window.editarUsuarioAdmin === 'function') {
    originalEditarUsuarioAdmin = window.editarUsuarioAdmin;
    window.editarUsuarioAdmin = function editarUsuarioAdminFixo(id) {
      if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
        window.abrirTelaEditarUsuarioAdmin(id);
        return;
      }
      return originalEditarUsuarioAdmin.apply(this, arguments);
    };
  }

  if (!originalFecharModalNovoRegistro && typeof window.fecharModalNovoRegistro === 'function') {
    originalFecharModalNovoRegistro = window.fecharModalNovoRegistro;
    window.fecharModalNovoRegistro = function fecharModalNovoRegistroFixo() {
      const estado = obterEstadoTela();
      if (estado.modo && typeof window.voltarListaUsuariosAdmin === 'function') {
        originalFecharModalNovoRegistro.apply(this, arguments);
        window.voltarListaUsuariosAdmin();
        return;
      }
      return originalFecharModalNovoRegistro.apply(this, arguments);
    };
  }

  if (!originalAbrirPermissoesPeloModalUsuario && typeof window.abrirPermissoesPeloModalUsuario === 'function') {
    originalAbrirPermissoesPeloModalUsuario = window.abrirPermissoesPeloModalUsuario;
    window.abrirPermissoesPeloModalUsuario = function abrirPermissoesUsuarioFixo(id) {
      if (typeof window.abrirTelaPermissoesUsuarioAdmin === 'function') {
        window.abrirTelaPermissoesUsuarioAdmin(id);
        return;
      }
      return originalAbrirPermissoesPeloModalUsuario.apply(this, arguments);
    };
  }

  if (!originalVoltarEtapaModalUsuarioAdmin && typeof window.voltarEtapaModalUsuarioAdmin === 'function') {
    originalVoltarEtapaModalUsuarioAdmin = window.voltarEtapaModalUsuarioAdmin;
    window.voltarEtapaModalUsuarioAdmin = function voltarEtapaUsuarioFixo() {
      const estado = obterEstadoTela();
      if (estado.modo && typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
        window.abrirTelaEditarUsuarioAdmin(estado.id);
        return;
      }
      return originalVoltarEtapaModalUsuarioAdmin.apply(this, arguments);
    };
  }
}

function instalarObserver() {
  if (observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      instalarOverrides();
      aplicarTelaFixaUsuario();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  instalarOverrides();
  injetarEstilos();
  instalarObserver();
  aplicarTelaFixaUsuario();
}

window.addEventListener('hubAdminUsuarioTelaAtualizada', aplicarTelaFixaUsuario);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', aplicarTelaFixaUsuario);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
