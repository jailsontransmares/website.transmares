const STYLE_ID = 'hub-user-menu-compact-style';
let observer = null;

function removerTextosSecundariosMenu() {
  document.querySelectorAll('.hub-user-menu-item small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-copy small').forEach(elemento => elemento.remove());
  document.querySelectorAll('.hub-user-menu-header').forEach(elemento => elemento.remove());
}

function ajustarLarguraMenuAberto() {
  document.querySelectorAll('.hub-user-menu').forEach(menu => {
    const trigger = menu.querySelector('.hub-user-menu-trigger');
    const dropdown = menu.querySelector('.hub-user-menu-dropdown');

    if (!trigger || !dropdown || dropdown.hidden) return;

    const largura = Math.ceil(trigger.getBoundingClientRect().width);
    dropdown.style.setProperty('--hub-user-menu-width', `${largura}px`);
    dropdown.style.removeProperty('--hub-user-menu-top');
    dropdown.style.removeProperty('--hub-user-menu-right');
    dropdown.style.removeProperty('--hub-user-menu-max-height');
  });
}

function aplicarEstilosCompactos() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .topbar {
      overflow: visible !important;
    }

    .user-box.hub-user-menu-host,
    .hub-user-box.hub-user-menu-host {
      position: relative !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      flex: 0 0 auto !important;
      justify-content: flex-end !important;
      overflow: visible !important;
    }

    .hub-user-menu {
      position: relative !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      display: inline-block !important;
      overflow: visible !important;
      isolation: isolate;
      z-index: 9998;
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
      position: relative !important;
      z-index: 2 !important;
    }

    .hub-user-menu[data-menu-fechado="false"] .hub-user-menu-trigger {
      border-radius: 18px 18px 0 0 !important;
      border-bottom-color: transparent !important;
      box-shadow: 0 14px 38px rgba(15, 23, 42, 0.12) !important;
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
    .hub-user-menu-header,
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
      transition: transform 0.16s ease !important;
    }

    .hub-user-menu[data-menu-fechado="false"] .hub-user-menu-caret {
      transform: rotate(180deg) !important;
    }

    .hub-user-menu-dropdown {
      position: absolute !important;
      top: calc(100% - 1px) !important;
      right: 0 !important;
      left: auto !important;
      width: var(--hub-user-menu-width, 100%) !important;
      min-width: 100% !important;
      max-width: 230px !important;
      max-height: none !important;
      overflow: visible !important;
      padding: 5px 7px 7px !important;
      border-radius: 0 0 18px 18px !important;
      border-top-color: transparent !important;
      box-shadow: 0 24px 54px rgba(15, 23, 42, 0.18) !important;
      z-index: 1 !important;
    }

    .hub-user-menu-dropdown[hidden] {
      display: none !important;
    }

    .hub-user-menu-item {
      min-height: 36px !important;
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

      .hub-user-menu-dropdown {
        max-width: 190px !important;
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
