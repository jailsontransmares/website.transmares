import { exigirSupabaseConfigurado } from './supabaseClient.js';

const INSTALL_DELAYS = [0, 80, 180, 360, 700, 1200];
const WRAPPED_FLAG = '__hubAdminUserDirectSaveMaskFixWrapped';

function obterEstadoUsuarioTela() {
  if (typeof window.hubObterEstadoUsuarioTelaAdmin !== 'function') {
    return { modo: '', id: '', etapa: 'dados' };
  }

  return window.hubObterEstadoUsuarioTelaAdmin() || { modo: '', id: '', etapa: 'dados' };
}

function telaDadosUsuarioAtiva() {
  const estado = obterEstadoUsuarioTela();
  return (estado.modo === 'editar' || estado.modo === 'novo') && estado.etapa !== 'permissoes';
}

function obterPrefixoUsuario(id = '') {
  const estado = obterEstadoUsuarioTela();
  if (id) return `usuario_${id}`;
  if (estado.modo === 'editar' && estado.id) return `usuario_${estado.id}`;
  return 'usuario_novo';
}

function apenasDigitos(valor = '') {
  return String(valor || '').replace(/\D+/g, '');
}

function formatarCpf(valor = '') {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
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

function obterCampo(prefixo, campo) {
  return document.getElementById(`${prefixo}_${campo}`);
}

function aplicarMascaraCampo(input) {
  if (!input) return;

  if (input.id.endsWith('_cpf')) {
    input.maxLength = 14;
    input.inputMode = 'numeric';
    input.value = formatarCpf(input.value);
  }

  if (input.id.endsWith('_telefone')) {
    input.maxLength = 15;
    input.inputMode = 'numeric';
    input.value = formatarTelefone(input.value);
  }
}

function aplicarMascarasTela() {
  if (!telaDadosUsuarioAtiva()) return;

  const estado = obterEstadoUsuarioTela();
  const prefixo = obterPrefixoUsuario(estado.id || '');
  aplicarMascaraCampo(obterCampo(prefixo, 'cpf'));
  aplicarMascaraCampo(obterCampo(prefixo, 'telefone'));
}

function obterValorMascarado(prefixo, campo) {
  const input = obterCampo(prefixo, campo);
  if (!input) return '';

  aplicarMascaraCampo(input);
  return input.value.trim();
}

async function atualizarCpfTelefoneUsuario({ id = '', email = '', cpf = '', telefone = '' }) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    cpf: cpf || null,
    telefone: telefone || null,
    updated_at: new Date().toISOString()
  };

  let usuarioId = id;

  if (!usuarioId && email) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', String(email || '').trim().toLowerCase())
      .maybeSingle();

    if (!error && data?.id) {
      usuarioId = data.id;
    }
  }

  if (!usuarioId) return '';

  const { error } = await supabase
    .from('usuarios')
    .update(payload)
    .eq('id', usuarioId);

  if (error) {
    throw new Error(error.message || 'Não foi possível atualizar CPF/telefone.');
  }

  return usuarioId;
}

function dispatchUsuarioAtualizado(id = '') {
  window.dispatchEvent(new CustomEvent('hubAdminUsuariosAtualizados', {
    detail: { id }
  }));
}

function instalarWrapperSalvar() {
  const original = window.salvarUsuarioAdmin;
  if (typeof original !== 'function' || original[WRAPPED_FLAG]) return;

  async function salvarUsuarioAdminComMascara(id = '') {
    const estado = obterEstadoUsuarioTela();

    if (!estado.modo || estado.etapa === 'permissoes') {
      return original.apply(this, arguments);
    }

    const prefixo = obterPrefixoUsuario(id || estado.id || '');
    const email = obterCampo(prefixo, 'email')?.value || '';
    const cpf = obterValorMascarado(prefixo, 'cpf');
    const telefone = obterValorMascarado(prefixo, 'telefone');

    const resultado = await original.apply(this, arguments);

    try {
      const usuarioId = await atualizarCpfTelefoneUsuario({
        id: id || estado.id || '',
        email,
        cpf,
        telefone
      });

      dispatchUsuarioAtualizado(usuarioId || id || estado.id || '');

      if (estado.modo === 'editar' && (usuarioId || id || estado.id) && typeof window.abrirTelaEditarUsuarioAdmin === 'function') {
        window.abrirTelaEditarUsuarioAdmin(usuarioId || id || estado.id);
      }
    } catch (erro) {
      console.warn('Usuário salvo, mas CPF/telefone não foram atualizados:', erro);
      dispatchUsuarioAtualizado(id || estado.id || '');
    }

    return resultado;
  }

  Object.defineProperty(salvarUsuarioAdminComMascara, WRAPPED_FLAG, { value: true });
  window.salvarUsuarioAdmin = salvarUsuarioAdminComMascara;
}

function agendarAplicacao() {
  window.requestAnimationFrame(() => {
    instalarWrapperSalvar();
    aplicarMascarasTela();
  });
}

INSTALL_DELAYS.forEach(delay => window.setTimeout(agendarAplicacao, delay));
document.addEventListener('input', event => {
  if (!event.target?.id?.match(/_cpf$|_telefone$/)) return;
  aplicarMascaraCampo(event.target);
}, true);
window.addEventListener('hubAdminUsuarioTelaAtualizada', agendarAplicacao);
window.addEventListener('hubAdminUsuarioTelaRenderSolicitado', agendarAplicacao);
window.addEventListener('load', agendarAplicacao);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', agendarAplicacao);
} else {
  agendarAplicacao();
}
