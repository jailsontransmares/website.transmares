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
      gap: 16px !important;
      align-items: stretch !important;
      width: 100% !important;
    }

    .admin-user-direct-section {
      width: 100% !important;
      max-width: none !important;
    }

    .admin-user-direct-section + .admin-user-direct-section {
      margin-top: 0 !important;
    }

    .admin-user-direct-fields {
      width: 100% !important;
    }

    @media (min-width: 981px) {
      .admin-user-direct-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
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
