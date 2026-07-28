import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';

const VALID_STATUSES = ['ativo', 'inativo', 'arquivado'];
let originalSalvarUsuario = null;

function normalizarStatus(status = 'ativo') {
  const valor = String(status || '').trim().toLowerCase();

  if (VALID_STATUSES.includes(valor)) {
    return valor;
  }

  if (valor === 'bloqueado' || valor === 'pendente') {
    return 'inativo';
  }

  return 'ativo';
}

function gerarSenhaSegura() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byte => chars[byte % chars.length]).join('');
}

function obterPrefixoUsuarioAtual() {
  const estado = typeof window.hubObterEstadoUsuarioTelaAdmin === 'function'
    ? window.hubObterEstadoUsuarioTelaAdmin()
    : { modo: '', id: '' };

  if (estado.modo === 'editar' && estado.id) {
    return `usuario_${estado.id}`;
  }

  if (estado.modo === 'novo') {
    return 'usuario_novo';
  }

  const emailInput = Array.from(document.querySelectorAll('input[id$="_email"]'))
    .find(input => /^usuario_(novo|[a-f0-9-]+)_email$/i.test(input.id));

  return emailInput?.id?.replace(/_email$/, '') || '';
}

function obterUsuarioIdPorPrefixo(prefixo = '') {
  if (!prefixo || prefixo === 'usuario_novo') {
    return '';
  }

  return prefixo.replace(/^usuario_/, '');
}

async function invocarAdminUsers(body) {
  const client = exigirSupabaseConfigurado();
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await client.functions.invoke('admin-users', {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível executar a ação administrativa.');
  }

  if (data?.ok === false) {
    throw new Error(data.message || 'Não foi possível executar a ação administrativa.');
  }

  return data || {};
}

async function salvarUsuarioPhase5(usuarioId = '') {
  const prefixo = usuarioId ? `usuario_${usuarioId}` : 'usuario_novo';
  const nome = document.getElementById(`${prefixo}_nome`)?.value || '';
  const email = document.getElementById(`${prefixo}_email`)?.value || '';
  const perfilId = document.getElementById(`${prefixo}_perfil`)?.value || '';
  const status = normalizarStatus(document.getElementById(`${prefixo}_status`)?.value || 'ativo');
  const cpf = document.getElementById(`${prefixo}_cpf`)?.value || '';
  const telefone = document.getElementById(`${prefixo}_telefone`)?.value || '';
  const senhaDigitada = document.getElementById(`${prefixo}_senha_admin`)?.value || '';
  const senhaGeradaLegada = document.querySelector('.admin-user-password-value')?.textContent?.trim() || '';
  const password = senhaDigitada || senhaGeradaLegada;

  if (!nome.trim()) {
    alert('Informe o nome do usuário.');
    return;
  }

  if (!email.trim()) {
    alert('Informe o e-mail do usuário.');
    return;
  }

  if (!perfilId) {
    alert('Informe o perfil do usuário.');
    return;
  }

  try {
    const result = await invocarAdminUsers({
      action: 'saveUser',
      user: {
        id: usuarioId || null,
        nome,
        email,
        perfil_id: perfilId,
        status,
        cpf,
        telefone,
        password
      }
    });

    window.dispatchEvent(new CustomEvent('hubAdminUsuariosAtualizados', {
      detail: { id: usuarioId || '' }
    }));

    window.fecharModalNovoRegistro?.();
    await window.selecionarAbaAdmin?.('usuarios');

    if (result.temporary_password) {
      alert(`Usuário salvo. Senha provisória: ${result.temporary_password}`);
    } else {
      alert('Usuário salvo com sucesso.');
    }
  } catch (erro) {
    alert(erro.message || 'Erro ao salvar usuário.');
  }
}

function gerarSenhaPhase5() {
  const prefixo = obterPrefixoUsuarioAtual();
  const senha = gerarSenhaSegura();
  const input = document.getElementById(`${prefixo}_senha_admin`);

  if (input) {
    input.value = senha;
    input.focus();
    input.select();
  }
}

function instalarOverrides() {
  if (!originalSalvarUsuario && typeof window.salvarUsuarioAdmin === 'function') {
    originalSalvarUsuario = window.salvarUsuarioAdmin;
  }

  window.salvarUsuarioAdmin = salvarUsuarioPhase5;
  window.hubAdminUsersGerarSenhaPhase5 = gerarSenhaPhase5;
  window.gerarSenhaTemporariaUsuarioAdmin = gerarSenhaPhase5;
}

function iniciar() {
  if (!supabase) return;
  instalarOverrides();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

window.addEventListener('load', instalarOverrides);
