const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200];
const MASK_FIELDS = ['cc_cnpj', 'cc_telefone', 'cc_whatsapp', 'cc_endereco_cep'];
const ADDRESS_FIELDS_VIACEP = {
  cc_endereco_logradouro: 'logradouro',
  cc_endereco_bairro: 'bairro',
  cc_endereco_cidade: 'localidade',
  cc_endereco_uf: 'uf'
};
const ADDRESS_FIELD_IDS = Object.keys(ADDRESS_FIELDS_VIACEP);
const WRAPPED_FLAG = '__hubCompanySettingsMasksWrapped';
const CEP_MESSAGE_ID = 'company-settings-cep-message';
const CEP_STYLE_ID = 'company-settings-cep-status-style';

let ultimoCepConsultado = '';
let cepEmConsulta = '';
let ultimoCepInformado = '';
let aplicandoEnderecoAutomatico = false;

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

function obterCepAtual() {
  return apenasDigitos(obterInput('cc_endereco_cep')?.value || '');
}

function injetarEstilosCep() {
  if (document.getElementById(CEP_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = CEP_STYLE_ID;
  style.textContent = `
    .company-settings-cep-message {
      grid-column: 1 / -1;
      margin: -6px 0 2px !important;
      padding: 8px 10px;
      border-radius: 12px;
      font-size: 0.78rem !important;
      font-weight: 700;
      line-height: 1.35;
      background: rgba(41, 72, 149, 0.08);
      color: var(--cor-principal, #294895) !important;
    }

    .company-settings-cep-message.is-hidden {
      display: none !important;
    }

    .company-settings-cep-message.is-error,
    .company-settings-cep-message.is-warning {
      background: rgba(220, 38, 38, 0.09);
      color: #b91c1c !important;
    }

    .company-settings-cep-message.is-success {
      background: rgba(22, 163, 74, 0.1);
      color: #15803d !important;
    }
  `;
  document.head.appendChild(style);
}

function obterMensagemCep() {
  const cepInput = obterInput('cc_endereco_cep');
  const cepLabel = cepInput?.closest('label');
  const grid = cepLabel?.parentElement;

  if (!cepLabel || !grid) return null;

  let mensagem = document.getElementById(CEP_MESSAGE_ID);

  if (!mensagem) {
    mensagem = document.createElement('p');
    mensagem.id = CEP_MESSAGE_ID;
    mensagem.className = 'company-settings-cep-message is-hidden';
    mensagem.setAttribute('aria-live', 'polite');
    cepLabel.insertAdjacentElement('afterend', mensagem);
  }

  return mensagem;
}

function definirMensagemCep(texto = '', tipo = 'info') {
  injetarEstilosCep();

  const mensagem = obterMensagemCep();
  if (!mensagem) return;

  if (!texto) {
    mensagem.textContent = '';
    mensagem.className = 'company-settings-cep-message is-hidden';
    return;
  }

  mensagem.textContent = texto;
  mensagem.className = `company-settings-cep-message is-${tipo}`;
}

function atualizarMensagemCepParcial() {
  const cep = obterCepAtual();

  if (!cep) {
    definirMensagemCep('');
    return;
  }

  if (cep.length < 8) {
    definirMensagemCep('Informe um CEP com 8 dígitos.', 'warning');
  }
}

function moverCepParaInicioEndereco() {
  const cepInput = obterInput('cc_endereco_cep');
  const cepLabel = cepInput?.closest('label');
  const grid = cepLabel?.parentElement;

  if (!cepLabel || !grid) return;

  if (cepLabel.dataset.cepReposicionado !== 'true') {
    grid.insertBefore(cepLabel, grid.firstElementChild);
    cepLabel.dataset.cepReposicionado = 'true';
  }

  obterMensagemCep();
}

function marcarEdicaoManualEndereco(input) {
  if (!input || !ADDRESS_FIELD_IDS.includes(input.id) || aplicandoEnderecoAutomatico) return;

  input.dataset.cepEditadoManualmente = obterCepAtual() || 'manual';
  input.dataset.cepAutoPreenchido = 'false';
}

function devePreencherEndereco(input, cep, cepMudou) {
  if (!input) return false;

  const valorAtual = String(input.value || '').trim();
  const foiEditadoManualmenteNesteCep = input.dataset.cepEditadoManualmente === cep;
  const foiPreenchidoAutomaticamente = input.dataset.cepAutoPreenchido === 'true';
  const origemCep = input.dataset.cepOrigem || '';

  if (foiEditadoManualmenteNesteCep) {
    return false;
  }

  if (!valorAtual) {
    return true;
  }

  if (foiPreenchidoAutomaticamente) {
    return true;
  }

  if (cepMudou && (!origemCep || origemCep !== cep)) {
    return true;
  }

  return false;
}

function preencherCampoEndereco(id, valor = '', cep = '', options = {}) {
  const input = obterInput(id);
  const valorLimpo = String(valor || '').trim();

  if (!input || !valorLimpo || !devePreencherEndereco(input, cep, Boolean(options.cepMudou))) {
    return false;
  }

  input.value = valorLimpo;
  input.dataset.cepAutoPreenchido = 'true';
  input.dataset.cepOrigem = cep;
  delete input.dataset.cepEditadoManualmente;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function aplicarEnderecoViaCep(dados, cep, options = {}) {
  if (!dados || dados.erro) return 0;

  aplicandoEnderecoAutomatico = true;

  try {
    return ADDRESS_FIELD_IDS.reduce((total, id) => {
      const campoViaCep = ADDRESS_FIELDS_VIACEP[id];
      return total + (preencherCampoEndereco(id, dados[campoViaCep] || '', cep, options) ? 1 : 0);
    }, 0);
  } finally {
    aplicandoEnderecoAutomatico = false;
  }
}

async function consultarCepSeCompleto({ forcar = false } = {}) {
  if (!estaNaRotaCorretora()) return;

  const cepInput = obterInput('cc_endereco_cep');
  const cep = apenasDigitos(cepInput?.value || '');

  if (!cep) {
    ultimoCepInformado = '';
    definirMensagemCep('');
    return;
  }

  if (cep.length !== 8) {
    atualizarMensagemCepParcial();
    return;
  }

  const cepMudou = Boolean(ultimoCepInformado && ultimoCepInformado !== cep);
  ultimoCepInformado = cep;

  if (cep === cepEmConsulta) return;
  if (!forcar && cep === ultimoCepConsultado) return;

  cepEmConsulta = cep;
  definirMensagemCep('Buscando CEP...', 'info');

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error('Falha ao consultar CEP.');

    const dados = await response.json();
    ultimoCepConsultado = cep;

    if (dados?.erro) {
      definirMensagemCep('CEP não encontrado. Preencha o endereço manualmente.', 'warning');
      return;
    }

    const camposPreenchidos = aplicarEnderecoViaCep(dados, cep, { cepMudou });

    if (camposPreenchidos > 0) {
      definirMensagemCep('Endereço preenchido automaticamente. Você pode editar os campos manualmente.', 'success');
    } else {
      definirMensagemCep('CEP encontrado. Mantive os campos já preenchidos ou editados manualmente.', 'success');
    }
  } catch (erro) {
    definirMensagemCep('Não foi possível consultar o CEP agora. Preencha manualmente.', 'error');
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

  if (ADDRESS_FIELD_IDS.includes(id)) {
    marcarEdicaoManualEndereco(event.target);
    return;
  }

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
