const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200];
const MASK_FIELDS = ['cc_cnpj', 'cc_telefone', 'cc_whatsapp', 'cc_endereco_cep'];
const WRAPPED_FLAG = '__hubCompanySettingsMasksWrapped';

let ultimoCepConsultado = '';
let cepEmConsulta = '';

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
  if (input.id === 'cc_endereco_cep') {
    input.maxLength = 9;
    input.autocomplete = 'postal-code';
  }
}

function aplicarMascara(input) {
  if (!input || !MASK_FIELDS.includes(input.id)) return;

  configurarInput(input);
  input.value = mascaraPorCampo(input.id, input.value);
}

function obterInput(id) {
  return document.getElementById(id);
}

function moverCepParaInicioEndereco() {
  const cepInput = obterInput('cc_endereco_cep');
  const cepLabel = cepInput?.closest('label');
  const grid = cepLabel?.parentElement;

  if (!cepLabel || !grid || cepLabel.dataset.cepReposicionado === 'true') return;

  grid.insertBefore(cepLabel, grid.firstElementChild);
  cepLabel.dataset.cepReposicionado = 'true';
}

function preencherCampo(id, valor = '') {
  const input = obterInput(id);
  if (!input || !valor) return;

  input.value = valor;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function aplicarEnderecoViaCep(dados) {
  if (!dados || dados.erro) return;

  preencherCampo('cc_endereco_logradouro', dados.logradouro || '');
  preencherCampo('cc_endereco_bairro', dados.bairro || '');
  preencherCampo('cc_endereco_cidade', dados.localidade || '');
  preencherCampo('cc_endereco_uf', dados.uf || '');
}

async function consultarCepSeCompleto({ forcar = false } = {}) {
  if (!estaNaRotaCorretora()) return;

  const cepInput = obterInput('cc_endereco_cep');
  const cep = apenasDigitos(cepInput?.value || '');

  if (cep.length !== 8) return;
  if (!forcar && (cep === ultimoCepConsultado || cep === cepEmConsulta)) return;

  cepEmConsulta = cep;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error('Falha ao consultar CEP.');

    const dados = await response.json();
    ultimoCepConsultado = cep;

    if (!dados?.erro) {
      aplicarEnderecoViaCep(dados);
    }
  } catch (erro) {
    console.warn('Não foi possível consultar o CEP informado:', erro);
  } finally {
    cepEmConsulta = '';
  }
}

function aplicarMascarasCorretora() {
  if (!estaNaRotaCorretora()) return;

  moverCepParaInicioEndereco();
  MASK_FIELDS.forEach(id => aplicarMascara(document.getElementById(id)));
  consultarCepSeCompleto();
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
  const id = event.target?.id || '';
  if (!MASK_FIELDS.includes(id)) return;

  aplicarMascara(event.target);

  if (id === 'cc_endereco_cep') {
    consultarCepSeCompleto({ forcar: true });
  }
}, true);

window.addEventListener('load', agendarAplicacao);
window.addEventListener('popstate', agendarAplicacao);
window.addEventListener('hashchange', agendarAplicacao);

document.addEventListener('change', event => {
  const id = event.target?.id || '';
  if (!MASK_FIELDS.includes(id)) return;

  aplicarMascara(event.target);

  if (id === 'cc_endereco_cep') {
    consultarCepSeCompleto({ forcar: true });
  }
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendarAplicacao);
} else {
  agendarAplicacao();
}
