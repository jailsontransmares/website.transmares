import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';

const VALID_STATUSES = ['ativo', 'inativo', 'arquivado'];
let observerInstalled = false;
let originalGerarSenha = null;
let originalSalvarUsuario = null;
const dadosCarregados = new Set();

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function obterPrefixoUsuarioModal() {
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

function obterLabelPorInput(input) {
  return input?.closest('label') || null;
}

function criarLabel({ id, label, type = 'text', value = '', placeholder = '', autocomplete = 'off' }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'admin-users-phase5-field';
  wrapper.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <input id="${escapeHtml(id)}" class="config-input" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" autocomplete="${escapeHtml(autocomplete)}">
  `;
  return wrapper;
}

function injetarEstilos() {
  if (document.getElementById('admin-users-phase5-style')) return;

  const style = document.createElement('style');
  style.id = 'admin-users-phase5-style';
  style.textContent = `
    .admin-users-phase5-field input {
      min-width: 0;
    }

    .admin-users-phase5-password-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: end;
      margin-top: 10px;
    }

    .admin-users-phase5-password-row label {
      margin: 0;
    }

    .admin-users-phase5-note {
      margin: 8px 0 0;
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
    }

    .admin-users-phase5-status-note {
      margin: 8px 0 0;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(41, 72, 149, 0.08);
      color: var(--text-muted, #64748b);
      font-size: 0.8rem;
    }
  `;
  document.head.appendChild(style);
}

function ajustarStatusSelect(prefixo) {
  const select = document.getElementById(`${prefixo}_status`);
  if (!select || select.dataset.phase5Status === 'true') return;

  const valorAtual = normalizarStatus(select.value);
  select.innerHTML = `
    <option value="ativo" ${valorAtual === 'ativo' ? 'selected' : ''}>Ativo</option>
    <option value="inativo" ${valorAtual === 'inativo' ? 'selected' : ''}>Inativo</option>
    <option value="arquivado" ${valorAtual === 'arquivado' ? 'selected' : ''}>Arquivado</option>
  `;
  select.dataset.phase5Status = 'true';

  const nota = document.createElement('p');
  nota.className = 'admin-users-phase5-status-note';
  nota.textContent = 'Status padronizado com o Supabase: ativo, inativo ou arquivado. Para bloquear acesso, use inativo.';
  select.closest('label')?.insertAdjacentElement('afterend', nota);
}

function injetarCamposComplementares(prefixo) {
  if (!prefixo || document.getElementById(`${prefixo}_cpf`)) return;

  const emailInput = document.getElementById(`${prefixo}_email`);
  const emailLabel = obterLabelPorInput(emailInput);
  if (!emailLabel) return;

  const cpfField = criarLabel({
    id: `${prefixo}_cpf`,
    label: 'CPF',
    placeholder: '000.000.000-00'
  });
  const telefoneField = criarLabel({
    id: `${prefixo}_telefone`,
    label: 'Telefone',
    type: 'tel',
    placeholder: '(00) 00000-0000'
  });

  emailLabel.insertAdjacentElement('afterend', telefoneField);
  emailLabel.insertAdjacentElement('afterend', cpfField);
}

function injetarCampoSenha(prefixo) {
  if (!prefixo || document.getElementById(`${prefixo}_senha_admin`)) return;

  const statusSelect = document.getElementById(`${prefixo}_status`);
  const statusLabel = obterLabelPorInput(statusSelect);
  if (!statusLabel) return;

  const editando = prefixo !== 'usuario_novo';
  const row = document.createElement('div');
  row.className = 'admin-users-phase5-password-row';
  row.innerHTML = `
    <label>
      <span>${editando ? 'Nova senha administrativa' : 'Senha inicial'}</span>
      <input id="${escapeHtml(prefixo)}_senha_admin" class="config-input" type="text" autocomplete="new-password" placeholder="${editando ? 'Opcional' : 'Gerar ou informar senha'}">
    </label>
    <button class="secondary-btn" type="button" onclick="hubAdminUsersGerarSenhaPhase5()">Gerar senha</button>
  `;

  const note = document.createElement('p');
  note.className = 'admin-users-phase5-note';
  note.textContent = editando
    ? 'Preencha apenas se desejar trocar a senha desse usuário no Supabase Auth.'
    : 'Ao criar o usuário, o acesso também será criado no Supabase Auth.';

  statusLabel.insertAdjacentElement('afterend', note);
  statusLabel.insertAdjacentElement('afterend', row);
}

async function preencherCamposEditando(prefixo) {
  const usuarioId = obterUsuarioIdPorPrefixo(prefixo);
  if (!usuarioId || dadosCarregados.has(usuarioId)) return;

  dadosCarregados.add(usuarioId);

  try {
    const client = exigirSupabaseConfigurado();
    const { data, error } = await client
      .from('usuarios')
      .select('cpf, telefone, status')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error || !data) return;

    const cpfInput = document.getElementById(`${prefixo}_cpf`);
    const telefoneInput = document.getElementById(`${prefixo}_telefone`);
    const statusSelect = document.getElementById(`${prefixo}_status`);

    if (cpfInput) cpfInput.value = data.cpf || '';
    if (telefoneInput) telefoneInput.value = data.telefone || '';
    if (statusSelect) statusSelect.value = normalizarStatus(data.status);
  } catch (_erro) {
    // Campos complementares são melhoria progressiva. Falha não bloqueia a tela existente.
  }
}

function aprimorarModalUsuarios() {
  const prefixo = obterPrefixoUsuarioModal();
  if (!prefixo) return;

  injetarEstilos();
  injetarCamposComplementares(prefixo);
  ajustarStatusSelect(prefixo);
  injetarCampoSenha(prefixo);
  preencherCamposEditando(prefixo);
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
  const prefixo = obterPrefixoUsuarioModal();
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

  if (!originalGerarSenha && typeof window.gerarSenhaTemporariaUsuarioAdmin === 'function') {
    originalGerarSenha = window.gerarSenhaTemporariaUsuarioAdmin;
  }

  window.salvarUsuarioAdmin = salvarUsuarioPhase5;
  window.hubAdminUsersGerarSenhaPhase5 = gerarSenhaPhase5;
  window.gerarSenhaTemporariaUsuarioAdmin = gerarSenhaPhase5;
}

function instalarObserver() {
  if (observerInstalled) return;
  observerInstalled = true;

  const observer = new MutationObserver(() => {
    instalarOverrides();
    aprimorarModalUsuarios();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciar() {
  if (!supabase) return;
  instalarOverrides();
  instalarObserver();
  aprimorarModalUsuarios();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

window.addEventListener('popstate', () => window.setTimeout(aprimorarModalUsuarios, 0));
