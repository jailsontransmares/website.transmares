const STYLE_ID = 'hub-user-menu-compact-style';
let observer = null;

function removerTextosSecundariosMenu() {
  document.querySelectorAll('.hub-user-menu-item small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-copy small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-header small').forEach(elemento => elemento.remove());
}

function aplicarEstilosCompactos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hub-user-menu-dropdown {
      width: min(250px, calc(100vw - 32px)) !important;
      padding: 8px !important;
      border-radius: 18px !important;
    }

    .hub-user-menu-trigger {
      min-height: 46px !important;
      padding: 6px 10px 6px 6px !important;
    }

    .hub-user-menu-copy {
      justify-content: center !important;
    }

    .hub-user-menu-copy small,
    .hub-user-menu-header small,
    .hub-user-menu-item small {
      display: none !important;
    }

    .hub-user-menu-header {
      padding: 6px 7px 9px !important;
      gap: 8px !important;
    }

    .hub-user-menu-header em {
      margin-top: 1px !important;
      font-size: 0.7rem !important;
    }

    .hub-user-menu-avatar.large {
      width: 38px !important;
      height: 38px !important;
      font-size: 0.82rem !important;
    }

    .hub-user-menu-item {
      min-height: 40px !important;
      padding: 9px 10px !important;
      border-radius: 12px !important;
      gap: 0 !important;
    }

    .hub-user-menu-item span {
      font-size: 0.86rem !important;
      line-height: 1.15 !important;
    }

    .hub-user-menu-separator {
      margin: 6px 4px !important;
    }
  `;

  document.head.appendChild(style);
}

function aplicarMenuCompacto() {
  aplicarEstilosCompactos();
  removerTextosSecundariosMenu();
}

function observarMenu() {
  if (observer) return;

  observer = new MutationObserver(() => {
    window.requestAnimationFrame(aplicarMenuCompacto);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  aplicarMenuCompacto();
  observarMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
