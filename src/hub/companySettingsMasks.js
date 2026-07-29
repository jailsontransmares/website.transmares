const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200];
const MASK_FIELDS = ['cc_cnpj', 'cc_telefone', 'cc_whatsapp', 'cc_endereco_cep'];
const WRAPPED_FLAG = '__hubCompanySettingsMasksWrapped';

function apenasDigitos(valor = '') {
  return String(valor || '').replace(/\D+/g, '');
}

function formatarCnpj(valor = '') {
  const digitos = apenasDigitos(valor).slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
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

function formatarCep(valor = '') {
  return apenasDigitos(valor)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
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

function estaNaRotaCorretora() {
  return obterRotaAtual() === 'configuracoes/corretora';
}

function mascaraPorCampo(id, valor) {
  if (id === 'cc_cnpj') return formatarCnpj(valor);
  if (id === 'cc_telefone' || id === 'cc_whatsapp') return formatarTelefone(valor);
  if (id === 'cc_endereco_cep') return formatarCep(valor);
  return valor;
}

function configurarInput(input) {
  if (!input) return;

  input.inputMode = 'numeric';

  if (input.id === 'cc_cnpj') input.maxLength = 18;
  if (input.id === 'cc_telefone' || input.id === 'cc_whatsapp') input.maxLength = 15;
  if (input.id === 'cc_endereco_cep') input.maxLength = 9;
}

function aplicarMascara(input) {
  if (!input || !MASK_FIELDS.includes(input.id)) return;

  configurarInput(input);
  input.value = mascaraPorCampo(input.id, input.value);
}

function aplicarMascarasCorretora() {
  if (!estaNaRotaCorretora()) return;

  MASK_FIELDS.forEach(id => aplicarMascara(document.getElementById(id)));
}

function instalarWrapperSalvar() {
  const original = window.hubCorretoraSalvar;
  if (typeof original !== 'function' || original[WRAPPED_FLAG]) return;

  function hubCorretoraSalvarComMascaras() {
    aplicarMascarasCorretora();
    return original.apply(this, arguments);
  }

  Object.defineProperty(hubCorretoraSalvarComMascaras, WRAPPED_FLAG, { value: true });
  window.hubCorretoraSalvar = hubCorretoraSalvarComMascaras;
}

function agendarAplicacao() {
  window.requestAnimationFrame(() => {
    aplicarMascarasCorretora();
    instalarWrapperSalvar();
  });
}

INSTALL_DELAYS.forEach(delay => window.setTimeout(agendarAplicacao, delay));

window.addEventListener('input', event => {
  if (!MASK_FIELDS.includes(event.target?.id || '')) return;
  aplicarMascara(event.target);
}, true);

window.addEventListener('load', agendarAplicacao);
window.addEventListener('popstate', agendarAplicacao);
window.addEventListener('hashchange', agendarAplicacao);

document.addEventListener('change', event => {
  if (!MASK_FIELDS.includes(event.target?.id || '')) return;
  aplicarMascara(event.target);
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendarAplicacao);
} else {
  agendarAplicacao();
}
