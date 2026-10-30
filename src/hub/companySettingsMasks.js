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
const CEP_TOAST_KEY = 'company-settings-cep';

let ultimoCepConsultado = '';
let cepEmConsulta = '';
let ultimoCepInformado = '';
let aplicandoEnderecoAutomatico = false;
let sequenciaConsultaCep = 0;
let controladorConsultaCep = null;

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

function definirMensagemCep(texto = '', tipo = 'info') {
  if (!texto) {
    window.hubToast?.dismiss(CEP_TOAST_KEY);
    return;
  }

  window.hubToast?.show(texto, {
    type: tipo,
    dedupeKey: CEP_TOAST_KEY
  });
}

function atualizarMensagemCepParcial() {
  const cep = obterCepAtual();

  if (!cep || cep.length < 8) {
    definirMensagemCep('');
  }
}

function moverCepParaInicioEndereco() {
  const cepInput = obterInput('cc_endereco_cep');
  const cepLabel = cepInput?.closest('label');
  const grid = cepLabel?.parentElement;

  if (!cepLabel || !grid) return;

  if (cepInput.dataset.cepValorAnterior === undefined) {
    cepInput.dataset.cepValorAnterior = apenasDigitos(cepInput.value);
  }

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

function limparEnderecoParaNovoCep() {
  ADDRESS_FIELD_IDS.forEach(id => {
    const input = obterInput(id);
    if (!input) return;

    input.value = '';
    delete input.dataset.cepAutoPreenchido;
    delete input.dataset.cepOrigem;
    delete input.dataset.cepEditadoManualmente;
  });
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
  const cepInput = obterInput('cc_endereco_cep');
  if (!cepInput) return;

  const cep = apenasDigitos(cepInput?.value || '');

  if (!cep) {
    sequenciaConsultaCep += 1;
    controladorConsultaCep?.abort();
    controladorConsultaCep = null;
    cepEmConsulta = '';
    ultimoCepInformado = '';
    definirMensagemCep('');
    return;
  }

  if (cep.length !== 8) {
    sequenciaConsultaCep += 1;
    controladorConsultaCep?.abort();
    controladorConsultaCep = null;
    cepEmConsulta = '';
    atualizarMensagemCepParcial();
    return;
  }

  const cepMudou = Boolean(ultimoCepInformado && ultimoCepInformado !== cep);
  ultimoCepInformado = cep;

  if (cep === cepEmConsulta) return;
  if (!forcar && cep === ultimoCepConsultado) return;

  controladorConsultaCep?.abort();
  const controlador = new AbortController();
  controladorConsultaCep = controlador;
  const sequencia = ++sequenciaConsultaCep;
  cepEmConsulta = cep;
  definirMensagemCep('Buscando CEP...', 'info');

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controlador.signal });
    if (!response.ok) throw new Error('Falha ao consultar CEP.');

    const dados = await response.json();
    if (sequencia !== sequenciaConsultaCep || obterCepAtual() !== cep) return;

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
    if (sequencia !== sequenciaConsultaCep || erro.name === 'AbortError') return;

    definirMensagemCep('Não foi possível consultar o CEP agora. Preencha manualmente.', 'error');
    console.warn('Não foi possível consultar o CEP informado:', erro);
  } finally {
    if (sequencia === sequenciaConsultaCep) {
      cepEmConsulta = '';
      controladorConsultaCep = null;
    }
  }
}

function consultarCepPeloCampo(event) {
  const input = event?.target;
  if (input?.id !== 'cc_endereco_cep') return;

  const cep = apenasDigitos(input.value);
  const cepAnterior = input.dataset.cepValorAnterior || ultimoCepInformado;
  const enderecoExistente = ADDRESS_FIELD_IDS.some(id => String(obterInput(id)?.value || '').trim());

  if (cep.length === 8 && (cepAnterior ? cepAnterior !== cep : enderecoExistente)) {
    limparEnderecoParaNovoCep();
  }

  if (cep.length === 8) {
    input.dataset.cepValorAnterior = cep;
  }

  aplicarMascara(input);
  return consultarCepSeCompleto();
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
    return;
  }
}, true);

window.addEventListener('load', agendarAplicacao);
window.addEventListener('popstate', agendarAplicacao);
window.addEventListener('hashchange', agendarAplicacao);

document.addEventListener('change', event => {
  const id = event.target?.id || '';
  if (!MASK_FIELDS.includes(id)) return;

  if (id === 'cc_endereco_cep') {
    consultarCepPeloCampo(event);
    return;
  }

  aplicarMascara(event.target);
}, true);

window.addEventListener('focusin', event => {
  const input = event.target;
  if (input?.id !== 'cc_endereco_cep') return;

  input.dataset.cepValorAnterior = apenasDigitos(input.value);
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendarAplicacao);
} else {
  agendarAplicacao();
}

window.hubCompanySettingsCepInput = consultarCepPeloCampo;
