const STYLE_ID = 'admin-user-permissions-flow-style';

function obterEstadoPermissoesUsuario() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') return null;
  const estado = window.hubObterEstadoUsuarioTelaAdmin();
  if (!estado || estado.etapa !== 'permissoes' || !estado.id) return null;
  return estado;
}

function injetarEstilosPermissoesUsuario() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-permissions .permission-modal-layout > .admin-user-permissions-actions,
    .admin-user-direct-permissions .permission-modal-layout .admin-user-permissions-actions {
      display: none !important;
    }

    .admin-user-direct-permissions > .admin-user-direct-actions {
      display: none !important;
    }

    .admin-user-permissions-clean-footer {
      position: sticky;
      bottom: 0;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      margin-top: 14px;
      padding: 14px 0 0;
      border-top: 1px solid rgba(148, 163, 184, 0.22);
      background: inherit;
    }

    .admin-user-permissions-clean-footer .secondary-btn,
    .admin-user-permissions-clean-footer .save-btn {
      min-width: 132px;
      justify-content: center;
    }

    .admin-user-permissions-clean-footer .save-btn:disabled {
      opacity: 0.52;
      cursor: not-allowed;
      filter: grayscale(0.3);
    }

    @media (max-width: 760px) {
      .admin-user-permissions-clean-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .admin-user-permissions-clean-footer .secondary-btn,
      .admin-user-permissions-clean-footer .save-btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function existemAlteracoesPermissoes() {
  const escopo = document.querySelector('.admin-user-direct-permissions');
  if (!escopo) return false;

  return Array.from(escopo.querySelectorAll('input[type="checkbox"]')).some(input => {
    if (typeof input.defaultChecked === 'boolean') {
      return input.checked !== input.defaultChecked;
    }
    return input.dataset.originalChecked && String(input.checked) !== input.dataset.originalChecked;
  });
}

function marcarEstadoInicialPermissoes() {
  const escopo = document.querySelector('.admin-user-direct-permissions');
  if (!escopo) return;

  escopo.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.dataset.originalChecked = String(input.checked);
  });
}

function atualizarBotaoSalvarPermissoes() {
  const botao = document.querySelector('[data-admin-permissions-save-clean]');
  if (!botao) return;
  botao.disabled = !existemAlteracoesPermissoes();
}

function instalarMonitoramentoAlteracoes() {
  const escopo = document.querySelector('.admin-user-direct-permissions');
  if (!escopo || escopo.dataset.cleanFooterTracking === 'true') return;

  escopo.dataset.cleanFooterTracking = 'true';
  marcarEstadoInicialPermissoes();
  escopo.addEventListener('change', atualizarBotaoSalvarPermissoes);
  atualizarBotaoSalvarPermissoes();
}

function aplicarRodapePermissoesUsuario() {
  const estado = obterEstadoPermissoesUsuario();
  const escopo = document.querySelector('.admin-user-direct-permissions');
  if (!estado || !escopo) return;

  if (!escopo.querySelector('.admin-user-permissions-clean-footer')) {
    const footer = document.createElement('div');
    footer.className = 'admin-user-permissions-clean-footer';
    footer.innerHTML = `
      <button class="secondary-btn" type="button" onclick="abrirTelaEditarUsuarioAdmin('${estado.id}')">Voltar para usuário</button>
      <button class="save-btn" type="button" data-admin-permissions-save-clean onclick="hubAdminPermissoesSalvarAlteracoes('${estado.id}')" disabled>Salvar alterações</button>
    `;
    escopo.appendChild(footer);
  }

  instalarMonitoramentoAlteracoes();
}

async function salvarAlteracoesPermissoesUsuario(usuarioId) {
  const botao = document.querySelector('[data-admin-permissions-save-clean]');
  if (botao?.disabled) return;

  if (botao) {
    botao.disabled = true;
    botao.textContent = 'Salvando...';
  }

  try {
    if (typeof window.salvarPermissoesUsuarioAdmin === 'function') {
      await window.salvarPermissoesUsuarioAdmin(usuarioId, false);
    }

    if (typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
      window.abrirTelaEditarUsuarioAdmin(usuarioId);
    }
  } catch (erro) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = 'Salvar alterações';
    }
    throw erro;
  }
}

function agendarAplicacaoRodape() {
  window.setTimeout(aplicarRodapePermissoesUsuario, 0);
  window.setTimeout(aplicarRodapePermissoesUsuario, 120);
}

function iniciarFluxoPermissoesUsuario() {
  injetarEstilosPermissoesUsuario();
  window.hubAdminPermissoesSalvarAlteracoes = salvarAlteracoesPermissoesUsuario;
  agendarAplicacaoRodape();
}

window.addEventListener('hubAdminUsuarioTelaAtualizada', agendarAplicacaoRodape);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', agendarAplicacaoRodape);
window.addEventListener('load', agendarAplicacaoRodape);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarFluxoPermissoesUsuario);
} else {
  iniciarFluxoPermissoesUsuario();
}
