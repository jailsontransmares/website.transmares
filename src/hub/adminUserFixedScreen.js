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
    }

    .admin-user-fixed-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
    }

    body.dark .admin-user-fixed-header {
      background: rgba(15, 23, 42, 0.70);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-fixed-header h3 {
      margin: 0;
      font-size: 1.2rem;
      letter-spacing: -0.03em;
      color: var(--text-strong, #0f172a);
    }

    .admin-user-fixed-header p {
      margin: 5px 0 0;
      color: var(--text-muted, #64748b);
      font-size: 0.9rem;
    }

    .admin-user-fixed-card {
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.24);
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.09);
      padding: 20px;
      display: grid;
      gap: 15px;
    }

    body.dark .admin-user-fixed-card {
      background: rgba(15, 23, 42, 0.76);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .admin-user-fixed-card > label,
    .admin-user-fixed-card .admin-users-phase5-field {
      display: grid;
      gap: 7px;
      margin: 0;
    }

    .admin-user-fixed-card > label span,
    .admin-user-fixed-card .admin-users-phase5-field span {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-muted, #64748b);
    }

    .admin-user-fixed-card .small-modal-actions {
      margin-top: 8px;
      justify-content: flex-end;
    }

    .admin-user-fixed-card .admin-user-access-panel {
      margin-top: 2px;
    }

    .admin-user-fixed-card.is-permissions-stage {
      padding: 16px;
    }

    .admin-user-fixed-card .permission-modal-layout {
      max-height: none;
    }

    .admin-user-fixed-card .permission-modal-content {
      max-height: min(68vh, 760px);
      overflow: auto;
      padding-right: 4px;
    }

    .admin-user-fixed-card .admin-user-permissions-actions {
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

    @media (max-width: 760px) {
      .admin-user-fixed-header {
        flex-direction: column;
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
