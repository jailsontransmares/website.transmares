import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';

const STYLE_ID = 'hub-avatar-upload-style';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

let ultimoAvatarUrl = '';
let carregandoAvatar = false;
let avatarObserver = null;
let aplicacaoAvatarAgendada = false;

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(texto) {
  return escapeHtml(texto).replace(/`/g, '&#096;');
}

function obterBaseHub(pathname = window.location.pathname || '/') {
  return pathname === '/hub' || pathname.startsWith('/hub/') ? '/hub' : '';
}

function obterRotaHubAtual() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function estaNaRotaPerfil() {
  return obterRotaHubAtual() === 'perfil';
}

function injetarEstilosAvatar() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hub-profile-avatar-actions {
      display: grid;
      gap: 8px;
      margin: 12px 0 14px;
    }

    .hub-profile-avatar-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .hub-profile-avatar-actions input[type="file"] {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .hub-profile-avatar-upload-btn,
    .hub-profile-avatar-remove-btn {
      border-radius: 999px;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: rgba(255, 255, 255, 0.88);
      color: #0f172a;
      cursor: pointer;
      font-weight: 800;
      font-size: 0.82rem;
      padding: 9px 12px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    }

    .hub-profile-avatar-remove-btn {
      color: #dc2626;
    }

    body.dark .hub-profile-avatar-upload-btn,
    body.dark .hub-profile-avatar-remove-btn {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(15, 23, 42, 0.84);
      color: #e5e7eb;
    }

    body.dark .hub-profile-avatar-remove-btn {
      color: #fecaca;
    }

    .hub-profile-avatar-help {
      margin: 0;
      color: #64748b;
      font-size: 0.78rem;
      line-height: 1.35;
    }

    body.dark .hub-profile-avatar-help {
      color: #cbd5e1;
    }

    .hub-profile-avatar-message {
      border-radius: 14px;
      padding: 10px 12px;
      font-size: 0.82rem;
      font-weight: 750;
      line-height: 1.35;
      background: rgba(41, 72, 149, 0.10);
      color: var(--cor-principal, #294895);
    }

    .hub-profile-avatar-message.error {
      background: rgba(220, 38, 38, 0.12);
      color: #b91c1c;
    }

    .hub-profile-avatar-message.success {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .hub-user-menu-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

function definirMensagemAvatar(mensagem = '', tipo = 'info') {
  const box = document.getElementById('hub_profile_avatar_message');
  if (!box) return;

  if (!mensagem) {
    box.hidden = true;
    box.textContent = '';
    box.className = 'hub-profile-avatar-message';
    return;
  }

  box.hidden = false;
  box.textContent = mensagem;
  box.className = `hub-profile-avatar-message ${tipo}`.trim();
}

function obterExtensaoArquivo(file) {
  const porNome = String(file?.name || '').split('.').pop() || '';
  const extensao = porNome.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (extensao) return extensao === 'jpg' ? 'jpg' : extensao;
  if (file?.type === 'image/png') return 'png';
  if (file?.type === 'image/webp') return 'webp';
  return 'jpg';
}

function validarArquivoAvatar(file) {
  if (!file) {
    throw new Error('Selecione uma imagem.');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Use PNG, JPG ou WEBP.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('A imagem deve ter no máximo 5 MB.');
  }
}

async function carregarUsuarioAtual() {
  const client = exigirSupabaseConfigurado();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError || !authData?.user?.id) {
    throw new Error('Sessão inválida. Entre novamente.');
  }

  const { data, error } = await client
    .from('usuarios')
    .select('id, auth_user_id, nome, email, avatar_url')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar a foto do usuário.');
  }

  if (!data) {
    throw new Error('Usuário não encontrado no cadastro do Hub.');
  }

  return { authUser: authData.user, usuario: data };
}

function obterIniciaisAvatar(avatar) {
  if (!avatar) return 'US';
  if (!avatar.dataset.iniciais) {
    avatar.dataset.iniciais = avatar.textContent?.trim()?.slice(0, 2) || 'US';
  }
  return avatar.dataset.iniciais;
}

function atualizarAvatarPerfil(url = '') {
  const avatar = document.querySelector('.hub-profile-avatar');
  if (!avatar) return;

  const proximaUrl = url || '';
  if (avatar.dataset.avatarUrl === proximaUrl) return;

  const nome = document.querySelector('.hub-profile-card h2')?.textContent || 'usuário';
  const iniciais = obterIniciaisAvatar(avatar);

  avatar.dataset.avatarUrl = proximaUrl;
  avatar.innerHTML = proximaUrl
    ? `<img src="${escapeAttr(proximaUrl)}" alt="Foto de ${escapeAttr(nome)}">`
    : escapeHtml(iniciais);
}

function atualizarAvataresMenu(url = '') {
  const proximaUrl = url || '';
  document.querySelectorAll('.hub-user-menu-avatar').forEach(avatar => {
    if (avatar.dataset.avatarUrl === proximaUrl) return;

    const iniciais = obterIniciaisAvatar(avatar);
    avatar.dataset.avatarUrl = proximaUrl;
    avatar.innerHTML = proximaUrl
      ? `<img src="${escapeAttr(proximaUrl)}" alt="Foto do usuário">`
      : escapeHtml(iniciais);
  });
}

function emitirAtualizacaoAvatar(url = '') {
  const proximaUrl = url || '';
  const mudou = proximaUrl !== ultimoAvatarUrl;

  ultimoAvatarUrl = proximaUrl;
  atualizarAvatarPerfil(ultimoAvatarUrl);
  atualizarAvataresMenu(ultimoAvatarUrl);
  trocarTextoEtapaFutura();

  if (mudou) {
    window.dispatchEvent(new CustomEvent('hubAvatarAtualizado', {
      detail: { avatar_url: ultimoAvatarUrl }
    }));
  }
}

async function uploadAvatar(event) {
  const file = event?.target?.files?.[0];

  try {
    validarArquivoAvatar(file);
    definirMensagemAvatar('Enviando foto...', 'info');

    const { authUser } = await carregarUsuarioAtual();
    const client = exigirSupabaseConfigurado();
    const extensao = obterExtensaoArquivo(file);
    const path = `${authUser.id}/avatar-${Date.now()}.${extensao}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, {
        upsert: true,
        contentType: file.type || undefined
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Não foi possível enviar a foto.');
    }

    const { data } = client.storage.from('avatars').getPublicUrl(path);
    const publicUrl = data?.publicUrl || '';

    if (!publicUrl) {
      throw new Error('Não foi possível gerar a URL pública da foto.');
    }

    const { error: rpcError } = await client.rpc('app_atualizar_meu_avatar', {
      p_avatar_url: publicUrl
    });

    if (rpcError) {
      throw new Error(rpcError.message || 'Foto enviada, mas não foi possível atualizar o perfil.');
    }

    emitirAtualizacaoAvatar(publicUrl);
    definirMensagemAvatar('Foto atualizada com sucesso.', 'success');
  } catch (erro) {
    definirMensagemAvatar(erro.message || 'Erro ao atualizar a foto.', 'error');
  } finally {
    if (event?.target) {
      event.target.value = '';
    }
  }
}

async function removerAvatar() {
  try {
    definirMensagemAvatar('Removendo foto...', 'info');
    const client = exigirSupabaseConfigurado();
    const { error } = await client.rpc('app_atualizar_meu_avatar', {
      p_avatar_url: null
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível remover a foto.');
    }

    emitirAtualizacaoAvatar('');
    definirMensagemAvatar('Foto removida do perfil.', 'success');
  } catch (erro) {
    definirMensagemAvatar(erro.message || 'Erro ao remover a foto.', 'error');
  }
}

function trocarTextoEtapaFutura() {
  const itens = Array.from(document.querySelectorAll('.hub-profile-meta-item'));
  const itemFoto = itens.find(item => item.querySelector('span')?.textContent?.trim().toLowerCase() === 'foto');
  const strong = itemFoto?.querySelector('strong');

  if (strong) {
    strong.textContent = ultimoAvatarUrl ? 'Foto cadastrada' : 'Sem foto cadastrada';
  }

  const nota = document.querySelector('.hub-profile-readonly-note');
  if (nota) {
    nota.textContent = 'Alteração de e-mail e CPF será tratada por fluxo administrativo. A foto pode ser atualizada nesta tela.';
  }
}

function instalarControlesPerfil() {
  if (!estaNaRotaPerfil()) return;
  const card = document.querySelector('.hub-profile-card');
  const avatar = document.querySelector('.hub-profile-avatar');
  if (!card || !avatar || card.querySelector('.hub-profile-avatar-actions')) return;

  injetarEstilosAvatar();
  avatar.insertAdjacentHTML('afterend', `
    <div class="hub-profile-avatar-actions">
      <div class="hub-profile-avatar-actions-row">
        <label class="hub-profile-avatar-upload-btn" for="hub_profile_avatar_file">Alterar foto</label>
        <button class="hub-profile-avatar-remove-btn" type="button" onclick="hubPerfilRemoverAvatar()">Remover</button>
        <input id="hub_profile_avatar_file" type="file" accept="image/png,image/jpeg,image/jpg,image/webp">
      </div>
      <p class="hub-profile-avatar-help">Formatos aceitos: PNG, JPG ou WEBP. Limite: 5 MB.</p>
      <p id="hub_profile_avatar_message" class="hub-profile-avatar-message" hidden></p>
    </div>
  `);

  document.getElementById('hub_profile_avatar_file')?.addEventListener('change', uploadAvatar);
  trocarTextoEtapaFutura();
}

async function sincronizarAvatarAtual({ force = false } = {}) {
  if (!estaNaRotaPerfil() || carregandoAvatar) return;

  const avatar = document.querySelector('.hub-profile-avatar');
  const controlesInstalados = Boolean(document.querySelector('.hub-profile-avatar-actions'));
  if (!force && controlesInstalados && avatar?.dataset?.avatarUrl === ultimoAvatarUrl) {
    return;
  }

  try {
    carregandoAvatar = true;
    const { usuario } = await carregarUsuarioAtual();
    emitirAtualizacaoAvatar(usuario.avatar_url || '');
  } catch (_erro) {
    // Não bloqueia a tela caso o avatar não possa ser carregado.
  } finally {
    carregandoAvatar = false;
  }
}

function aplicarAvatar({ sync = false } = {}) {
  if (!estaNaRotaPerfil()) return;

  injetarEstilosAvatar();
  instalarControlesPerfil();
  atualizarAvatarPerfil(ultimoAvatarUrl);
  atualizarAvataresMenu(ultimoAvatarUrl);
  trocarTextoEtapaFutura();

  if (sync) {
    sincronizarAvatarAtual({ force: true });
  }
}

function agendarAplicacaoAvatar({ sync = false } = {}) {
  if (aplicacaoAvatarAgendada) return;

  aplicacaoAvatarAgendada = true;
  window.requestAnimationFrame(() => {
    aplicacaoAvatarAgendada = false;
    aplicarAvatar({ sync });
  });
}

function observarRenderizacoesAvatar() {
  if (avatarObserver) return;

  avatarObserver = new MutationObserver(() => {
    if (!estaNaRotaPerfil()) return;
    agendarAplicacaoAvatar();
  });

  avatarObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function iniciarAvatarUpload() {
  aplicarAvatar({ sync: true });
  observarRenderizacoesAvatar();
}

Object.assign(window, {
  hubPerfilRemoverAvatar: removerAvatar
});

window.addEventListener('hubAvatarAtualizado', event => {
  const url = event.detail?.avatar_url || '';
  ultimoAvatarUrl = url;
  atualizarAvatarPerfil(url);
  atualizarAvataresMenu(url);
  trocarTextoEtapaFutura();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAvatarUpload);
} else if (supabase) {
  iniciarAvatarUpload();
}
