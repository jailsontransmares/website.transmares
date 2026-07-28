const STYLE_ID = 'admin-user-vertical-form-style';

function injetarLayoutVerticalUsuario() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .admin-user-direct-card {
      gap: 16px !important;
    }

    .admin-user-direct-layout {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 18px !important;
      align-items: stretch !important;
      width: 100% !important;
    }

    .admin-user-direct-section {
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      gap: 12px !important;
    }

    .admin-user-direct-section + .admin-user-direct-section {
      margin-top: 0 !important;
      padding-top: 18px !important;
      border-top: 1px solid rgba(148, 163, 184, 0.18) !important;
    }

    .admin-user-direct-fields {
      width: 100% !important;
      gap: 14px !important;
    }

    .admin-user-direct-section:nth-of-type(2) {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      column-gap: 14px !important;
      row-gap: 14px !important;
    }

    .admin-user-direct-section:nth-of-type(2) > div,
    .admin-user-direct-section:nth-of-type(2) > .admin-user-direct-inline-actions {
      grid-column: 1 / -1 !important;
    }

    .admin-user-direct-inline-actions {
      align-items: center !important;
      margin-top: 0 !important;
    }

    .admin-user-direct-actions {
      margin-top: 2px !important;
      padding-top: 16px !important;
    }

    .admin-user-direct-header p,
    .admin-user-direct-section > div > p,
    .admin-user-direct-note {
      display: none !important;
    }

    .admin-user-direct-header {
      align-items: center !important;
    }

    .admin-user-direct-section > div {
      margin-bottom: 0 !important;
    }

    @media (min-width: 981px) {
      .admin-user-direct-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }

    @media (max-width: 760px) {
      .admin-user-direct-section:nth-of-type(2) {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  document.head.appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injetarLayoutVerticalUsuario);
} else {
  injetarLayoutVerticalUsuario();
}
