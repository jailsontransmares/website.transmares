const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200];
const PHONE_FIELD_ID = 'hub_perfil_telefone';
const WRAPPED_FLAG = '__hubProfileMasksWrapped';

function apenasDigitos(valor = '') {
  return String(valor || '').replace(/\D+/g, '');
}

function formatarTelefone(valor = '') {
  const digitos = apenasDigitos(valor).slice(0, 11);

  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2');
  }

  return digitos
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2');
}

function obterRotaAtual() {
  const pathname = window.location.pathname || '/';
  const rota = pathname === '/hub' || pathname.startsWith('/hub/')
    ? pathname.slice('/hub'.length)
    : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function estaNaRotaPerfil() {
  return obterRotaAtual() === 'perfil';
}

function obterTelefoneInput() {
  return document.getElementById(PHONE_FIELD_ID);
}

function configurarTelefoneInput(input) {
  if (!input) return;

  input.type = 'tel';
  input.inputMode = 'numeric';
  input.maxLength = 15;
  input.placeholder = '(00) 00000-0000';
  input.autocomplete = 'tel';
}

function aplicarMascaraTelefone() {
  if (!estaNaRotaPerfil()) return;

  const input = obterTelefoneInput();
  if (!input) return;

  configurarTelefoneInput(input);
  input.value = formatarTelefone(input.value);
}

function instalarWrapperSalvar() {
  const original = window.hubPerfilSalvar;
  if (typeof original !== 'function' || original[WRAPPED_FLAG]) return;

  function hubPerfilSalvarComMascara(event) {
    aplicarMascaraTelefone();
    return original.apply(this, arguments);
  }

  Object.defineProperty(hubPerfilSalvarComMascara, WRAPPED_FLAG, { value: true });
  window.hubPerfilSalvar = hubPerfilSalvarComMascara;
}

function agendarAplicacao() {
  window.requestAnimationFrame(() => {
    aplicarMascaraTelefone();
    instalarWrapperSalvar();
  });
}

INSTALL_DELAYS.forEach(delay => window.setTimeout(agendarAplicacao, delay));

window.addEventListener('input', event => {
  if (event.target?.id !== PHONE_FIELD_ID) return;
  configurarTelefoneInput(event.target);
  event.target.value = formatarTelefone(event.target.value);
}, true);

window.addEventListener('change', event => {
  if (event.target?.id !== PHONE_FIELD_ID) return;
  configurarTelefoneInput(event.target);
  event.target.value = formatarTelefone(event.target.value);
}, true);

window.addEventListener('load', agendarAplicacao);
window.addEventListener('popstate', agendarAplicacao);
window.addEventListener('hashchange', agendarAplicacao);
window.addEventListener('hubAvatarAtualizado', agendarAplicacao);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendarAplicacao);
} else {
  agendarAplicacao();
}
