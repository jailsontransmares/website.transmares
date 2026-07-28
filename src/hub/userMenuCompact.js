const STYLE_ID = 'hub-user-menu-compact-style';
let observer = null;

function removerTextosSecundariosMenu() {
  document.querySelectorAll('.hub-user-menu-item small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-copy small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-header small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-header em').forEach(elemento => elemento.remove());
}

function ajustarLarguraMenuAberto() {
  document.querySelectorAll('.hub-user-menu').forEach(menu => {
    const dropdown = menu.querySelector('.hub-user-menu-dropdown');
    if (!dropdown || dropdown.hidden) return;

    dropdown.style.setProperty('--hub-user-menu-width', '220px');
  });
}

function aplicarEstilosCompactos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .user-box.hub-user-menu-host,
    .hub-user-box.hub-user-menu-host {
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      flex: 0 0 auto !important;
      justify-content: flex-end !important;
    }

    .hub-user-menu {
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      display: inline-flex !important;
      justify-content: flex-end !important;
    }

    .hub-user-menu-trigger {
      width: auto !important;
      min-width: 0 !important;
      max-width: 230px !important;
      min-height: 42px !important;
      padding: 5px 9px 5px 5px !important;
      display: inline-grid !important;
      grid-template-columns: auto minmax(0, max-content) auto !important;
      gap: 7px !important;
      justify-content: start !important;
      align-items: center !important;
      white-space: nowrap !important;
    }

    .hub-user-menu-copy {
      width: auto !important;
      min-width: 0 !important;
      max-width: 135px !important;
      justify-content: center !important;
      line-height: 1 !important;
    }

    .hub-user-menu-copy strong {
      max-width: 135px !important;
      font-size: 0.84rem !important;
      line-height: 1.1 !important;
    }

    .hub-user-menu-copy small,
    .hub-user-menu-header small,
    .hub-user-menu-header em,
    .hub-user-menu-item small {
      display: none !important;
    }

    .hub-user-menu-avatar {
      width: 32px !important;
      height: 32px !important;
      font-size: 0.74rem !important;
    }

    .hub-user-menu-caret {
      width: auto !important;
      margin-left: 0 !important;
      font-size: 0.72rem !important;
    }

    .hub-user-menu-dropdown {
      width: min(220px, calc(100vw - 32px)) !important;
      min-width: 190px !important;
      max-width: 220px !important;
      padding: 7px !important;
      border-radius: 16px !important;
    }

    .hub-user-menu-header {
      padding: 6px 7px 8px !important;
      gap: 8px !important;
      grid-template-columns: auto minmax(0, 1fr) !important;
    }

    .hub-user-menu-header strong {
      font-size: 0.86rem !important;
      line-height: 1.12 !important;
    }

    .hub-user-menu-avatar.large {
      width: 36px !important;
      height: 36px !important;
      font-size: 0.78rem !important;
    }

    .hub-user-menu-item {
      min-height: 38px !important;
      padding: 8px 9px !important;
      border-radius: 11px !important;
      gap: 0 !important;
    }

    .hub-user-menu-item span {
      font-size: 0.85rem !important;
      line-height: 1.12 !important;
    }

    .hub-user-menu-separator {
      margin: 5px 4px !important;
    }

    @media (max-width: 760px) {
      .hub-user-menu-trigger {
        max-width: 190px !important;
      }

      .hub-user-menu-copy strong {
        max-width: 100px !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function aplicarMenuCompacto() {
  aplicarEstilosCompactos();
  removerTextosSecundariosMenu();
  ajustarLarguraMenuAberto();
}

function observarMenu() {
  if (observer) return;

  observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarMenuCompacto);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'style', 'class', 'data-menu-fechado']
  });
}

function iniciar() {
  aplicarMenuCompacto();
  observarMenu();
  window.addEventListener('resize', aplicarMenuCompacto);
  window.addEventListener('scroll', aplicarMenuCompacto, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
