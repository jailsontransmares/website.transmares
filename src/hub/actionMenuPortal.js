const PORTAL_ATTRIBUTE = 'data-hub-action-menu-portal';
const SPACER_ATTRIBUTE = 'data-hub-action-menu-spacer';
const registros = new Map();
const MENU_BOUND_ATTRIBUTE = 'data-hub-action-menu-bound';

let listenersAtivos = false;

function garantirListeners() {
  if (listenersAtivos || typeof window === 'undefined') return;

  const reposicionar = () => {
    registros.forEach((registro, menu) => {
      posicionarMenuAcao(menu, registro.opcoes);
    });
  };

  window.addEventListener('scroll', reposicionar, true);
  window.addEventListener('resize', reposicionar);
  listenersAtivos = true;
}

function removerEspaco(menu) {
  const registro = registros.get(menu);
  registro?.spacer?.remove();
  if (registro) registro.spacer = null;
}

function criarEspaco(menu, bottom) {
  const registro = registros.get(menu);
  if (!registro) return;

  removerEspaco(menu);

  const alturaDocumento = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const alturaExtra = Math.max(0, bottom - alturaDocumento);
  if (alturaExtra <= 0) return;

  const spacer = document.createElement('div');
  spacer.setAttribute(SPACER_ATTRIBUTE, 'true');
  spacer.setAttribute('aria-hidden', 'true');
  spacer.style.height = `${alturaExtra}px`;
  spacer.style.width = '1px';
  document.body.appendChild(spacer);
  registro.spacer = spacer;
}

function posicionarMenuAcao(menu, opcoes = registros.get(menu)) {
  const registro = registros.get(menu);
  if (!registro || !menu || menu.hidden) return;

  const trigger = registro.trigger;
  const rect = trigger.getBoundingClientRect();
  const margem = opcoes.margin ?? 8;
  const gap = opcoes.gap ?? 6;
  const larguraMinima = opcoes.minWidth ?? 184;
  const larguraMaxima = Math.min(opcoes.maxWidth ?? 240, window.innerWidth - (margem * 2));
  const larguraPreferida = Math.max(larguraMinima, menu.offsetWidth || larguraMinima);
  const largura = Math.min(larguraMaxima, larguraPreferida);
  const espacoDireita = window.innerWidth - rect.left - margem;
  const left = espacoDireita >= largura
    ? rect.left
    : Math.max(margem, rect.right - largura);
  const altura = menu.offsetHeight;
  const espacoAbaixo = window.innerHeight - rect.bottom - margem;
  const podeAbrirAcima = opcoes.flipVertical === true
    && espacoAbaixo < altura
    && rect.top - margem >= altura;
  const top = podeAbrirAcima ? rect.top - altura - gap : rect.bottom + gap;

  menu.style.position = 'absolute';
  menu.style.left = `${left + window.scrollX}px`;
  menu.style.top = `${top + window.scrollY}px`;
  menu.style.right = 'auto';
  menu.style.minWidth = `${largura}px`;
  menu.style.maxWidth = `${largura}px`;
  menu.style.maxHeight = 'none';
  menu.style.overflowY = 'visible';

  criarEspaco(menu, top + window.scrollY + menu.offsetHeight + margem);
}

export function abrirMenuAcaoGlobal(trigger, menu, opcoes = {}) {
  if (!trigger || !menu || typeof document === 'undefined') return;

  const registroExistente = registros.get(menu);
  if (!registroExistente) {
    registros.set(menu, {
      trigger,
      parent: menu.parentNode,
      nextSibling: menu.nextSibling,
      spacer: null,
      opcoes
    });
  } else {
    registroExistente.trigger = trigger;
    registroExistente.opcoes = opcoes;
  }

  garantirListeners();
  menu.setAttribute(PORTAL_ATTRIBUTE, 'true');
  document.body.appendChild(menu);
  posicionarMenuAcao(menu, opcoes);
}

export function fecharMenuAcaoGlobal(menu) {
  const registro = registros.get(menu);
  if (!registro || !menu) return;

  removerEspaco(menu);
  menu.removeAttribute(PORTAL_ATTRIBUTE);

  if (registro.parent?.isConnected) {
    registro.parent.insertBefore(menu, registro.nextSibling);
  }

  ['position', 'left', 'top', 'right', 'min-width', 'max-width', 'max-height', 'overflow-y'].forEach(propriedade => {
    menu.style.removeProperty(propriedade);
  });
  registros.delete(menu);
}

window.__hubFecharMenuAcaoGlobal = fecharMenuAcaoGlobal;

export function inicializarMenusAcoesGlobais(root = document) {
  root.querySelectorAll?.('[data-hub-action-menu]').forEach((menu) => {
    if (menu.getAttribute(MENU_BOUND_ATTRIBUTE) === 'true') return;
    const popover = menu.querySelector('[data-hub-action-popover], .hub-row-actions-popover');
    const trigger = menu.querySelector('summary, [data-hub-action-trigger]');
    if (!popover || !trigger) return;

    const options = {
      minWidth: Number(menu.dataset.hubActionMinWidth) || 120,
      maxWidth: Number(menu.dataset.hubActionMaxWidth) || 190,
      gap: Number(menu.dataset.hubActionGap) || 6,
      flipVertical: menu.dataset.hubActionFlipVertical === 'true'
    };
    const keyboardEnabled = menu.dataset.hubActionKeyboard === 'true';
    const focusMode = menu.dataset.hubActionFocus || '';
    const getItems = () => Array.from(popover.querySelectorAll('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]'))
      .filter(item => !item.disabled && !item.hidden);
    const focusItem = (direction = 'first') => {
      const items = getItems();
      if (!items.length) return;
      const index = direction === 'last'
        ? items.length - 1
        : focusMode === 'selected'
          ? Math.max(0, items.findIndex(item => item.getAttribute('aria-pressed') === 'true' || item.getAttribute('aria-current') === 'true' || item.classList.contains('is-selected')))
          : 0;
      items[index]?.focus({ preventScroll: true });
    };
    const fechar = (restaurarFoco = false) => {
      menu.open = false;
      trigger.setAttribute('aria-expanded', 'false');
      fecharMenuAcaoGlobal(popover);
      if (restaurarFoco) trigger.focus({ preventScroll: true });
    };

    const abrir = () => {
      if (!menu.open) return;
      trigger.setAttribute('aria-expanded', 'true');
      abrirMenuAcaoGlobal(trigger, popover, options);
    };

    menu.addEventListener('toggle', () => {
      if (menu.open) abrir();
      else {
        trigger.setAttribute('aria-expanded', 'false');
        fecharMenuAcaoGlobal(popover);
      }
      if (menu.open && focusMode) {
        window.requestAnimationFrame(() => {
          if (menu.open) focusItem();
        });
      }
    });
    popover.addEventListener('click', (event) => {
      if (!event.target.closest?.('[role="menuitem"]')) return;
      fechar();
    }, true);
    document.addEventListener('pointerdown', (event) => {
      if (!menu.open) return;
      if (menu.contains(event.target) || popover.contains(event.target)) return;
      fechar();
    }, true);
    trigger.addEventListener('click', () => window.requestAnimationFrame(abrir));
    if (keyboardEnabled) {
      const onKeydown = (event) => {
        const key = event.key;
        if (key === 'Escape' && menu.open) {
          event.preventDefault();
          fechar(true);
          return;
        }
        if (key === 'Tab' && menu.open) {
          const tabStops = Array.from(document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'))
            .filter(item => item.offsetParent !== null && !popover.contains(item));
          const triggerIndex = tabStops.indexOf(trigger);
          const nextIndex = triggerIndex + (event.shiftKey ? -1 : 1);
          const next = tabStops[nextIndex];
          fechar();
          if (next) {
            event.preventDefault();
            window.requestAnimationFrame(() => next.focus({ preventScroll: true }));
          }
          return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return;

        const items = getItems();
        if (!items.length) return;
        event.preventDefault();
        const isTrigger = trigger.contains(event.target);
        const activeItem = event.target.closest?.('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]');
        if (isTrigger && !menu.open) menu.open = true;
        window.requestAnimationFrame(() => {
          if (!menu.open) return;
          abrir();
          if (key === 'Home') {
            items[0]?.focus({ preventScroll: true });
            return;
          }
          if (key === 'End') {
            items[items.length - 1]?.focus({ preventScroll: true });
            return;
          }
          if (isTrigger || !activeItem) {
            focusItem(key === 'ArrowUp' ? 'last' : 'first');
            return;
          }
          const index = items.indexOf(activeItem);
          const next = (index + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus({ preventScroll: true });
        });
      };
      trigger.addEventListener('keydown', onKeydown);
      popover.addEventListener('keydown', onKeydown);
    }
    menu.setAttribute(MENU_BOUND_ATTRIBUTE, 'true');
  });
}

function observarMenusAcoesGlobais() {
  const iniciar = () => {
    inicializarMenusAcoesGlobais();
    new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (node.nodeType === 1) inicializarMenusAcoesGlobais(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}

observarMenusAcoesGlobais();

export function limparMenusAcoesGlobais() {
  Array.from(registros.keys()).forEach(menu => fecharMenuAcaoGlobal(menu));
  document.querySelectorAll(`[${PORTAL_ATTRIBUTE}], [${SPACER_ATTRIBUTE}]`).forEach(elemento => elemento.remove());
}

export function limparMenusAcoesGlobaisOrfaos() {
  Array.from(registros.entries()).forEach(([menu, registro]) => {
    if (!registro.parent?.isConnected) fecharMenuAcaoGlobal(menu);
  });
}
