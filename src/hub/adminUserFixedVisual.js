const STYLE_ID = 'admin-user-fixed-visual-style';

function injetarEstilosVisuais() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-fixed-shell {
      width: 100%;
      max-width: 1120px !important;
      margin: 18px auto 0 !important;
      animation: adminUserFixedEnter 180ms ease-out;
    }

    @keyframes adminUserFixedEnter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .admin-user-fixed-header {
      position: relative;
      overflow: hidden;
      border-radius: 26px !important;
      padding: 20px 22px !important;
      isolation: isolate;
    }

    .admin-user-fixed-header::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background:
        radial-gradient(circle at top left, rgba(41, 72, 149, 0.16), transparent 34%),
        radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.12), transparent 32%);
      pointer-events: none;
    }

    .admin-user-fixed-header h3 {
      font-size: clamp(1.12rem, 1.6vw, 1.36rem) !important;
      font-weight: 850 !important;
    }

    .admin-user-fixed-header p {
      max-width: 620px;
    }

    .admin-user-fixed-header .secondary-btn {
      min-height: 38px;
      white-space: nowrap;
      border-radius: 999px;
    }

    .admin-user-fixed-card {
      border-radius: 28px !important;
      padding: 22px !important;
    }

    .admin-user-fixed-layout {
      grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr) !important;
      gap: 18px !important;
    }

    .admin-user-fixed-section {
      border-radius: 24px !important;
      padding: 20px !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
    }

    .admin-user-fixed-section-header {
      padding-bottom: 2px;
    }

    .admin-user-fixed-section-header h4 {
      font-size: 1.02rem !important;
      font-weight: 820 !important;
    }

    .admin-user-fixed-section-header p {
      max-width: 520px;
    }

    .admin-user-fixed-fields {
      gap: 16px !important;
    }

    .admin-user-fixed-fields label,
    .admin-user-fixed-fields .admin-users-phase5-field,
    .admin-user-fixed-access label,
    .admin-user-fixed-access .admin-users-phase5-field {
      align-content: start;
    }

    .admin-user-fixed-fields .config-input,
    .admin-user-fixed-access .config-input {
      min-height: 42px;
      border-radius: 14px;
    }

    .admin-user-fixed-access {
      gap: 15px !important;
    }

    .admin-user-fixed-access .admin-users-phase5-password-row {
      gap: 10px !important;
    }

    .admin-user-fixed-access .admin-users-phase5-password-row .secondary-btn,
    .admin-user-fixed-access .admin-user-access-actions .secondary-btn,
    .admin-user-fixed-access .admin-user-password-actions .secondary-btn {
      min-height: 38px;
      border-radius: 14px;
    }

    .admin-user-fixed-access .admin-user-access-panel {
      display: grid;
      gap: 12px;
      border-radius: 20px !important;
    }

    .admin-user-fixed-access .admin-user-password-box {
      border-radius: 18px;
      padding: 14px;
      background: rgba(248, 250, 252, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.20);
    }

    body.dark .admin-user-fixed-access .admin-user-password-box {
      background: rgba(15, 23, 42, 0.38);
      border-color: rgba(148, 163, 184, 0.14);
    }

    .admin-user-fixed-actions,
    .admin-user-fixed-card .small-modal-actions {
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      padding-top: 16px !important;
      margin-top: 2px !important;
    }

    .admin-user-fixed-actions .save-btn,
    .admin-user-fixed-card .small-modal-actions .save-btn {
      min-width: 132px;
      min-height: 40px;
      border-radius: 14px;
    }

    .admin-user-fixed-actions .secondary-btn,
    .admin-user-fixed-card .small-modal-actions .secondary-btn {
      min-height: 40px;
      border-radius: 14px;
    }

    .admin-user-fixed-card.is-permissions-stage {
      padding: 18px !important;
    }

    .admin-user-fixed-card.is-permissions-stage .permission-global-toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 10px;
      margin: -10px -10px 10px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.86);
      border: 1px solid rgba(148, 163, 184, 0.18);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    body.dark .admin-user-fixed-card.is-permissions-stage .permission-global-toolbar {
      background: rgba(15, 23, 42, 0.82);
      border-color: rgba(148, 163, 184, 0.14);
    }

    .admin-user-fixed-card.is-permissions-stage .permission-module-card {
      border-radius: 20px;
      overflow: hidden;
    }

    .admin-user-fixed-card.is-permissions-stage .admin-user-permissions-actions {
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    @media (max-width: 980px) {
      .admin-user-fixed-shell {
        max-width: 100% !important;
      }

      .admin-user-fixed-layout {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 760px) {
      .admin-user-fixed-shell {
        margin-top: 12px !important;
      }

      .admin-user-fixed-header,
      .admin-user-fixed-card,
      .admin-user-fixed-section {
        border-radius: 20px !important;
      }

      .admin-user-fixed-header .secondary-btn {
        width: 100%;
      }

      .admin-user-fixed-card {
        padding: 14px !important;
      }

      .admin-user-fixed-section {
        padding: 15px !important;
      }

      .admin-user-fixed-actions,
      .admin-user-fixed-card .small-modal-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .admin-user-fixed-actions .save-btn,
      .admin-user-fixed-actions .secondary-btn,
      .admin-user-fixed-card .small-modal-actions .save-btn,
      .admin-user-fixed-card .small-modal-actions .secondary-btn {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function ajustarTextosVisuais() {
  const shell = document.querySelector('.admin-user-fixed-shell');
  if (!shell) return;

  const headerButton = shell.querySelector('.admin-user-fixed-header .secondary-btn');
  if (headerButton && headerButton.textContent.trim() === 'Voltar para usuários') {
    headerButton.textContent = 'Voltar para lista';
  }

  shell.querySelectorAll('.admin-user-fixed-actions .secondary-btn, .small-modal-actions .secondary-btn').forEach(botao => {
    if (botao.textContent.trim().toLowerCase() === 'cancelar') {
      botao.textContent = 'Voltar';
    }
  });
}

function aplicarRefinoVisual() {
  injetarEstilosVisuais();
  ajustarTextosVisuais();
}

function iniciar() {
  aplicarRefinoVisual();
  window.addEventListener('hubAdminUsuarioTelaAtualizada', aplicarRefinoVisual);
  window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', aplicarRefinoVisual);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarRefinoVisual);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
