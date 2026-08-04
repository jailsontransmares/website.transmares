import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';
import {
  aguardarContextoAcessoHub,
  obterContextoAcessoHub
} from './services/hubAccessContext.js';

const PERFIL_PATH = 'perfil';
let perfilCarregando = false;
let perfilRenderizadoPara = '';
let perfilMensagem = '';
let perfilMensagemTipo = 'info';
let modalSenhaAberto = false;
let senhaMensagem = '';
let senhaMensagemTipo = 'info';

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
  return obterRotaHubAtual() === PERFIL_PATH;
}

function navegarHomePerfil() {
  const base = obterBaseHub() || '/hub';
  window.history.pushState({}, '', `${base}/`);
  window.dispatchEvent(new Event('popstate'));
}

function obterIniciais(nome = '', email = '') {
  const base = String(nome || email || 'U').trim();
  const partes = base.split(/\s+/).filter(Boolean);

  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  return base.slice(0, 2).toUpperCase();
}

function formatarCpfVisual(cpf = '') {
  const numeros = String(cpf || '').replace(/\D/g, '');

  if (numeros.length !== 11) {
    return cpf || '';
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
}

function injetarEstilosPerfil() {
  if (document.getElementById('hub-profile-style')) return;

  const style = document.createElement('style');
  style.id = 'hub-profile-style';
  style.textContent = `
    .hub-profile-shell {
      max-width: none;
      margin: 0;
      width: 100%;
    }

    .hub-profile-layout {
      display: grid;
      grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .hub-profile-card,
    .hub-profile-form-card {
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(148, 163, 184, 0.26);
      border-radius: 24px;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
      padding: 22px;
      backdrop-filter: blur(18px);
    }

    body.dark .hub-profile-card,
    body.dark .hub-profile-form-card {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .hub-profile-avatar {
      width: 96px;
      height: 96px;
      border-radius: 30px;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: linear-gradient(135deg, var(--cor-principal, #294895), var(--cor-destaque, #16A34A));
      color: #fff;
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.04em;
      box-shadow: 0 16px 40px rgba(37, 99, 235, 0.22);
      margin-bottom: 18px;
    }

    .hub-profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hub-profile-card h2,
    .hub-profile-form-card h2 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: -0.03em;
    }

    .hub-profile-muted {
      color: #64748b;
      margin: 6px 0 0;
      line-height: 1.5;
    }

    body.dark .hub-profile-muted {
      color: #cbd5e1;
    }

    .hub-profile-meta {
      display: grid;
      gap: 12px;
      margin-top: 22px;
    }

    .hub-profile-meta-item {
      border-radius: 18px;
      background: rgba(241, 245, 249, 0.76);
      padding: 13px 14px;
    }

    body.dark .hub-profile-meta-item {
      background: rgba(30, 41, 59, 0.72);
    }

    .hub-profile-meta-item span {
      display: block;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }

    .hub-profile-meta-item strong {
      display: block;
      color: #0f172a;
      font-size: 0.95rem;
      word-break: break-word;
    }

    body.dark .hub-profile-meta-item strong {
      color: #f8fafc;
    }

    .hub-profile-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .hub-profile-field-full {
      grid-column: 1 / -1;
    }

    .hub-profile-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 22px;
    }

    .hub-profile-readonly-note {
      margin-top: 14px;
      border-radius: 18px;
      background: rgba(59, 130, 246, 0.10);
      color: #1d4ed8;
      padding: 12px 14px;
      line-height: 1.45;
      font-size: 0.92rem;
    }

    body.dark .hub-profile-readonly-note {
      color: #bfdbfe;
      background: rgba(37, 99, 235, 0.18);
    }

    .hub-profile-message {
      border-radius: 16px;
      padding: 12px 14px;
      margin-top: 16px;
      font-weight: 700;
      line-height: 1.35;
    }

    .hub-profile-message.success {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .hub-profile-message.error {
      background: rgba(220, 38, 38, 0.12);
      color: #b91c1c;
    }

    body.dark .hub-profile-message.success {
      color: #86efac;
    }

    body.dark .hub-profile-message.error {
      color: #fecaca;
    }

    .hub-profile-password-modal .small-modal {
      max-width: 520px;
    }

    @media (max-width: 880px) {
      .hub-profile-layout {
        grid-template-columns: 1fr;
      }

      .hub-profile-form-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

async function carregarPerfilAtual() {
  const client = exigirSupabaseConfigurado();
  const contextoAtual = obterContextoAcessoHub();
  const contextoHub = contextoAtual.carregado
    ? contextoAtual
    : await aguardarContextoAcessoHub({ timeoutMs: 2500 });
  const usuarioContexto = contextoHub?.usuario || null;
  let authUser = null;

  if (!usuarioContexto?.id && !usuarioContexto?.email) {
    const { data: authData, error: authError } = await client.auth.getUser();

    if (authError || !authData?.user?.email) {
      throw new Error(authError?.message || 'Sessão inválida. Entre novamente.');
    }

    authUser = authData.user;
  }

  let query = client
    .from('usuarios')
    .select('id, auth_user_id, nome, email, cpf, telefone, avatar_url, perfil_id, status, updated_at');

  if (usuarioContexto?.id) {
    query = query.eq('id', usuarioContexto.id);
  } else if (authUser?.id) {
    query = query.eq('auth_user_id', authUser.id);
  } else {
    query = query.ilike('email', usuarioContexto.email);
  }

  query = query.maybeSingle();

  let { data: usuario, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar seu perfil.');
  }

  if (!usuario) {
    const emailUsuario = usuarioContexto?.email || authUser?.email || '';
    const fallback = await client
      .from('usuarios')
      .select('id, auth_user_id, nome, email, cpf, telefone, avatar_url, perfil_id, status, updated_at')
      .ilike('email', emailUsuario)
      .maybeSingle();

    if (fallback.error) {
      throw new Error(fallback.error.message || 'Não foi possível localizar seu perfil.');
    }

    usuario = fallback.data;
  }

  if (!usuario) {
    throw new Error('Seu usuário não está cadastrado no Hub.');
  }

  let perfilNome = '';
  if (usuario.perfil_id) {
    const perfilResult = await client
      .from('perfis')
      .select('nome, slug')
      .eq('id', usuario.perfil_id)
      .maybeSingle();

    if (!perfilResult.error && perfilResult.data) {
      perfilNome = perfilResult.data.nome || perfilResult.data.slug || '';
    }
  }

  return {
    usuario: {
      ...usuario,
      perfil_nome: perfilNome
    }
  };
}

function renderizarTopoPerfil() {
  return window.hubRenderizarTopbarPadrao?.() || '';
}

function renderizarModalSenha(usuario) {
  if (!modalSenhaAberto) return '';

  return `
    <div class="modal-backdrop hub-profile-password-modal" role="dialog" aria-modal="true" aria-label="Alterar senha">
      <section class="small-modal">
        <div class="small-modal-header">
          <div>
            <h3>Alterar senha</h3>
            <p>Por segurança, informe sua senha atual antes de definir uma nova.</p>
          </div>
          <button class="icon-btn" type="button" onclick="hubPerfilFecharSenha()" aria-label="Fechar">×</button>
        </div>

        <form onsubmit="hubPerfilAlterarSenha(event)">
          <div class="hub-profile-form-grid">
            <label class="hub-profile-field-full">
              <span>Senha atual</span>
              <input id="hub_perfil_senha_atual" class="config-input" type="password" autocomplete="current-password" required>
            </label>
            <label>
              <span>Nova senha</span>
              <input id="hub_perfil_senha_nova" class="config-input" type="password" autocomplete="new-password" minlength="6" required>
            </label>
            <label>
              <span>Confirmar nova senha</span>
              <input id="hub_perfil_senha_confirmar" class="config-input" type="password" autocomplete="new-password" minlength="6" required>
            </label>
          </div>

          ${senhaMensagem ? `<p class="hub-profile-message ${escapeAttr(senhaMensagemTipo)}">${escapeHtml(senhaMensagem)}</p>` : ''}

          <div class="small-modal-actions">
            <button class="secondary-btn" type="button" onclick="hubPerfilFecharSenha()">Cancelar</button>
            <button class="save-btn" type="submit">Salvar senha</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderizarPerfil({ usuario }) {
  injetarEstilosPerfil();
  const app = document.getElementById('app');
  const iniciais = obterIniciais(usuario.nome, usuario.email);
  const cpfVisual = formatarCpfVisual(usuario.cpf);

  app.dataset.hubProfilePage = 'true';
  app.innerHTML = `
    <main class="dashboard hub-layout hub-profile-page ${escapeAttr(window.hubObterClassesLayoutPadrao?.() || 'is-sidebar-collapsed')}">
      ${renderizarTopoPerfil(usuario)}

      <div class="hub-shell">
        ${window.hubRenderizarSidebarPadrao?.() || ''}
        <section class="hub-page-content hub-profile-page-content">
          <section class="hub-profile-shell">
        <section class="hub-page-intro">
          <span class="hub-page-kicker">Conta do usuário</span>
          <h2>Meu perfil</h2>
          <p>Consulte seus dados cadastrais e atualize as informações liberadas para edição.</p>
        </section>

        <div class="hub-profile-layout">
          <aside class="hub-profile-card">
            <div class="hub-profile-avatar" aria-label="Avatar do usuário">
              ${usuario.avatar_url ? `<img src="${escapeAttr(usuario.avatar_url)}" alt="Foto de ${escapeAttr(usuario.nome || 'usuário')}">` : escapeHtml(iniciais)}
            </div>
            <h2>${escapeHtml(usuario.nome || 'Usuário')}</h2>
            <p class="hub-profile-muted">${escapeHtml(usuario.perfil_nome || 'Perfil não informado')}</p>

            <div class="hub-profile-meta">
              <div class="hub-profile-meta-item">
                <span>E-mail</span>
                <strong>${escapeHtml(usuario.email || '-')}</strong>
              </div>
              <div class="hub-profile-meta-item">
                <span>Status</span>
                <strong>${escapeHtml(usuario.status || '-')}</strong>
              </div>
              <div class="hub-profile-meta-item">
                <span>Foto</span>
                <strong>Upload será liberado em etapa futura</strong>
              </div>
            </div>
          </aside>

          <section class="hub-profile-form-card">
            <h2>Dados pessoais</h2>
            <p class="hub-profile-muted">Nome e telefone podem ser atualizados por você. E-mail e CPF ficam bloqueados para preservar o cadastro principal.</p>

            <form onsubmit="hubPerfilSalvar(event)">
              <div class="hub-profile-form-grid">
                <label class="hub-profile-field-full">
                  <span>Nome completo</span>
                  <input id="hub_perfil_nome" class="config-input" type="text" value="${escapeAttr(usuario.nome || '')}" required>
                </label>

                <label>
                  <span>Telefone</span>
                  <input id="hub_perfil_telefone" class="config-input" type="tel" value="${escapeAttr(usuario.telefone || '')}" placeholder="(00) 00000-0000">
                </label>

                <label>
                  <span>CPF</span>
                  <input class="config-input" type="text" value="${escapeAttr(cpfVisual || 'Não informado')}" readonly disabled>
                </label>

                <label class="hub-profile-field-full">
                  <span>E-mail</span>
                  <input class="config-input" type="email" value="${escapeAttr(usuario.email || '')}" readonly disabled>
                </label>
              </div>

              <div class="hub-profile-readonly-note">
                Alteração de e-mail, CPF e foto será tratada por fluxo administrativo ou etapa futura.
              </div>

              ${perfilMensagem ? `<p class="hub-profile-message ${escapeAttr(perfilMensagemTipo)}">${escapeHtml(perfilMensagem)}</p>` : ''}

              <div class="hub-profile-actions">
                <button class="secondary-btn" type="button" onclick="hubPerfilVoltarHome()">Voltar</button>
                <button class="secondary-btn" type="button" onclick="hubPerfilAbrirSenha()">Alterar senha</button>
                <button class="save-btn" type="submit">Salvar alterações</button>
              </div>
            </form>
          </section>
        </div>
          </section>
        </section>
      </section>

      ${renderizarModalSenha(usuario)}
    </main>
  `;
}

function renderizarPerfilErro(mensagem) {
  injetarEstilosPerfil();
  const app = document.getElementById('app');
  app.dataset.hubProfilePage = 'true';
  app.innerHTML = `
    <main class="dashboard hub-layout hub-profile-page ${escapeAttr(window.hubObterClassesLayoutPadrao?.() || 'is-sidebar-collapsed')}" >
      ${renderizarTopoPerfil({})}
      <div class="hub-shell">
        ${window.hubRenderizarSidebarPadrao?.() || ''}
        <section class="hub-page-content hub-profile-page-content">
          <section class="error-card">
            <h1>Perfil indisponível</h1>
            <p>${escapeHtml(mensagem || 'Não foi possível carregar seu perfil.')}</p>
            <button class="save-btn" type="button" onclick="hubPerfilVoltarHome()">Voltar para a Home</button>
          </section>
        </section>
      </div>
    </main>
  `;
}

async function renderizarRotaPerfil({ force = false } = {}) {
  if (!estaNaRotaPerfil()) {
    perfilRenderizadoPara = '';
    return;
  }

  const chave = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const app = document.getElementById('app');
  if (!force && perfilRenderizadoPara === chave && app?.dataset?.hubProfilePage === 'true') {
    return;
  }

  if (perfilCarregando) return;

  try {
    perfilCarregando = true;
    perfilRenderizadoPara = chave;
    injetarEstilosPerfil();
    app.dataset.hubProfilePage = 'loading';
    app.innerHTML = `
      <main class="dashboard hub-layout hub-profile-page ${escapeAttr(window.hubObterClassesLayoutPadrao?.() || 'is-sidebar-collapsed')}" aria-busy="true" aria-live="polite">
        ${renderizarTopoPerfil({})}
        <div class="hub-shell">
          ${window.hubRenderizarSidebarPadrao?.() || ''}
          <section class="hub-page-content hub-profile-page-content">
            <section class="admin-panel hub-profile-loading">
              <div class="hub-page-intro">
                <span class="hub-page-kicker">Conta do usuário</span>
                <h2>Meu perfil</h2>
                <p>Aguarde enquanto seus dados são carregados.</p>
              </div>
              ${window.hubRenderLoading?.('Carregando perfil...') || '<p role="status">Carregando perfil...</p>'}
            </section>
          </section>
        </div>
      </main>
    `;
    const dados = await carregarPerfilAtual();

    const chaveAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!estaNaRotaPerfil() || chaveAtual !== chave) return;

    renderizarPerfil(dados);
  } catch (erro) {
    const chaveAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!estaNaRotaPerfil() || chaveAtual !== chave) return;

    renderizarPerfilErro(erro.message || 'Erro ao carregar perfil.');
  } finally {
    perfilCarregando = false;
  }
}

async function salvarPerfil(event) {
  event.preventDefault();

  try {
    const client = exigirSupabaseConfigurado();
    const nome = document.getElementById('hub_perfil_nome')?.value || '';
    const telefone = document.getElementById('hub_perfil_telefone')?.value || '';

    const { data, error } = await client.rpc('app_atualizar_meu_perfil', {
      p_nome: nome,
      p_telefone: telefone
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível salvar seu perfil.');
    }

    perfilMensagem = 'Perfil atualizado com sucesso.';
    perfilMensagemTipo = 'success';
    perfilRenderizadoPara = '';
    await window.hubAtualizarContextoAcesso?.('meu-perfil-atualizado', false);
    await renderizarRotaPerfil({ force: true });
  } catch (erro) {
    perfilMensagem = erro.message || 'Erro ao salvar perfil.';
    perfilMensagemTipo = 'error';
    perfilRenderizadoPara = '';
    await renderizarRotaPerfil({ force: true });
  }
}

async function alterarSenha(event) {
  event.preventDefault();

  const senhaAtual = document.getElementById('hub_perfil_senha_atual')?.value || '';
  const novaSenha = document.getElementById('hub_perfil_senha_nova')?.value || '';
  const confirmarSenha = document.getElementById('hub_perfil_senha_confirmar')?.value || '';

  try {
    if (novaSenha.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    if (novaSenha !== confirmarSenha) {
      throw new Error('A confirmação da senha não confere.');
    }

    const client = exigirSupabaseConfigurado();
    const { data: authData, error: authError } = await client.auth.getUser();

    if (authError || !authData?.user?.email) {
      throw new Error(authError?.message || 'Sessão inválida. Entre novamente.');
    }

    const login = await client.auth.signInWithPassword({
      email: authData.user.email,
      password: senhaAtual
    });

    if (login.error) {
      throw new Error('Senha atual inválida.');
    }

    const { error } = await client.auth.updateUser({ password: novaSenha });

    if (error) {
      throw new Error(error.message || 'Não foi possível alterar a senha.');
    }

    modalSenhaAberto = false;
    senhaMensagem = '';
    perfilMensagem = 'Senha alterada com sucesso.';
    perfilMensagemTipo = 'success';
    perfilRenderizadoPara = '';
    await renderizarRotaPerfil({ force: true });
  } catch (erro) {
    senhaMensagem = erro.message || 'Erro ao alterar senha.';
    senhaMensagemTipo = 'error';
    perfilRenderizadoPara = '';
    await renderizarRotaPerfil({ force: true });
  }
}

function abrirModalSenha() {
  modalSenhaAberto = true;
  senhaMensagem = '';
  perfilRenderizadoPara = '';
  renderizarRotaPerfil({ force: true });
}

function fecharModalSenha() {
  modalSenhaAberto = false;
  senhaMensagem = '';
  perfilRenderizadoPara = '';
  renderizarRotaPerfil({ force: true });
}

Object.assign(window, {
  hubPerfilSalvar: salvarPerfil,
  hubPerfilAbrirSenha: abrirModalSenha,
  hubPerfilFecharSenha: fecharModalSenha,
  hubPerfilAlterarSenha: alterarSenha,
  hubPerfilVoltarHome: navegarHomePerfil
});

if (supabase) {
  window.hubRenderizarPerfil = renderizarRotaPerfil;
  renderizarRotaPerfil();
}
