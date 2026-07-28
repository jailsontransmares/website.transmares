const STYLE_ID = 'admin-profile-permissions-layout-fix-style';

function injectProfilePermissionsLayoutFix() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-profile-direct-card.is-profile-permissions-direct {
      overflow: visible !important;
      min-height: 0 !important;
    }

    .admin-profile-permissions-direct {
      display: grid !important;
      grid-template-rows: auto auto minmax(0, auto) auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .admin-profile-permissions-direct-body {
      display: grid !important;
      grid-auto-rows: auto !important;
      align-content: start !important;
      gap: 14px !important;
      min-height: 0 !important;
      max-height: none !important;
      height: auto !important;
      overflow: visible !important;
      padding-bottom: 22px !important;
    }

    .admin-profile-permissions-direct-card {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .admin-profile-permissions-direct-module-head {
      min-height: 56px !important;
      align-items: center !important;
    }

    .admin-profile-permissions-direct-card.is-collapsed .admin-profile-permissions-direct-table-wrap {
      display: none !important;
    }

    .admin-profile-permissions-direct-card.is-open .admin-profile-permissions-direct-table-wrap {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      max-height: none !important;
      overflow-x: auto !important;
      overflow-y: visible !important;
      border-top: 1px solid rgba(148, 163, 184, 0.12) !important;
    }

    .admin-profile-permissions-direct-table {
      width: max-content !important;
      min-width: 100% !important;
      table-layout: auto !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
    }

    .admin-profile-permissions-direct-table thead {
      display: table-header-group !important;
    }

    .admin-profile-permissions-direct-table tbody {
      display: table-row-group !important;
    }

    .admin-profile-permissions-direct-table tr {
      display: table-row !important;
      height: auto !important;
    }

    .admin-profile-permissions-direct-table th,
    .admin-profile-permissions-direct-table td {
      display: table-cell !important;
      white-space: nowrap !important;
      min-height: 0 !important;
      height: auto !important;
      line-height: 1.35 !important;
    }

    .admin-profile-permissions-direct-table th:first-child,
    .admin-profile-permissions-direct-table td:first-child {
      position: sticky !important;
      left: 0 !important;
      z-index: 2 !important;
      background: rgba(248, 250, 252, 0.96) !important;
      white-space: normal !important;
      min-width: 260px !important;
      max-width: 360px !important;
    }

    body.dark .admin-profile-permissions-direct-table th:first-child,
    body.dark .admin-profile-permissions-direct-table td:first-child {
      background: rgba(15, 23, 42, 0.96) !important;
    }

    .admin-profile-permissions-direct-check {
      min-width: 28px !important;
      min-height: 28px !important;
    }

    .admin-profile-permissions-direct-check input {
      display: inline-block !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    .admin-profile-permissions-direct-footer {
      position: sticky !important;
      bottom: 0 !important;
      z-index: 20 !important;
      background: rgba(248, 250, 252, 0.94) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
    }

    body.dark .admin-profile-permissions-direct-footer {
      background: rgba(15, 23, 42, 0.94) !important;
    }
  `;

  document.head.appendChild(style);
}

function applyProfilePermissionsLayoutFix() {
  injectProfilePermissionsLayoutFix();

  const scope = document.querySelector('.admin-profile-permissions-direct');
  if (!scope) return;

  scope.querySelectorAll('.admin-profile-permissions-direct-card.is-open').forEach(card => {
    const wrap = card.querySelector('.admin-profile-permissions-direct-table-wrap');
    if (wrap) {
      wrap.style.maxHeight = 'none';
      wrap.style.height = 'auto';
    }
  });
}

const DELAYS = [0, 80, 180, 360, 700, 1200];

function scheduleProfilePermissionsLayoutFix() {
  DELAYS.forEach(delay => window.setTimeout(applyProfilePermissionsLayoutFix, delay));
}

window.addEventListener('hubAdminPerfilTelaAtualizada', scheduleProfilePermissionsLayoutFix);
window.addEventListener('hubAdminPerfilTelaRenderSolicitado', scheduleProfilePermissionsLayoutFix);
window.addEventListener('load', scheduleProfilePermissionsLayoutFix);
window.addEventListener('click', () => window.setTimeout(applyProfilePermissionsLayoutFix, 0));
window.addEventListener('change', () => window.setTimeout(applyProfilePermissionsLayoutFix, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleProfilePermissionsLayoutFix);
} else {
  scheduleProfilePermissionsLayoutFix();
}
