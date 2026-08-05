const PORTAL_ATTRIBUTE = 'data-hub-action-menu-portal';
const SPACER_ATTRIBUTE = 'data-hub-action-menu-spacer';
const registros = new Map();

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

export function limparMenusAcoesGlobais() {
  Array.from(registros.keys()).forEach(menu => fecharMenuAcaoGlobal(menu));
  document.querySelectorAll(`[${PORTAL_ATTRIBUTE}], [${SPACER_ATTRIBUTE}]`).forEach(elemento => elemento.remove());
}

export function limparMenusAcoesGlobaisOrfaos() {
  Array.from(registros.entries()).forEach(([menu, registro]) => {
    if (!registro.parent?.isConnected) fecharMenuAcaoGlobal(menu);
  });
}
