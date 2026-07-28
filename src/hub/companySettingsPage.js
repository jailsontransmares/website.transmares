import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';
import { hasPermission, normalizarPermissoes } from './services/permissionService.js';

const COMPANY_ROUTE = 'configuracoes/corretora';
let renderizadoPara = '';
let carregando = false;
let mensagem = '';
let mensagemTipo = 'info';
let registroAtual = null;
let brandingUploadUrl = '';

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

function obterRotaAtual() {
  const base = obterBaseHub();
  const pathname = window.location.pathname || '/';
  const rota = base ? pathname.slice(base.length) : pathname;

  return rota
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/i, '')
    .toLowerCase();
}

function estaNaRotaCorretora() {
  return obterRotaAtual() === COMPANY_ROUTE;
}

function navegarParaConfiguracoes() {
  const base = obterBaseHub() || '/hub';
  window.history.pushState({}, '', `${base}/admin#identidade`);
  window.dispatchEvent(new Event('popstate'));
}

function normalizarStatus(status = 'ativo') {
  return String(status || '').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function obterValor(id) {
  return document.getElementById(id)?.value || '';
}

function injetarEstilos() {
  if (document.getElementById('company-settings-style')) return;

  const style = document.createElement('style');
  style.id = 'company-settings-style';
  style.textContent = `
    .company-settings-page .topbar {
      position: sticky;
      top: 0;
      z-index: 3;
    }

    .company-settings-shell {
      width: min(1180px, calc(100vw - 48px));
      margin: 26px auto 56px;
      display: grid;
      gap: 18px;
    }

    .company-settings-card {
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(255, 255, 255, 0.84);
      backdrop-filter: blur(18px);
      border-radius: 24px;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
      padding: 22px;
    }

    body.dark .company-settings-card {
      background: rgba(15, 23, 42, 0.76);
      border-color: rgba(148, 163, 184, 0.18);
    }

    .company-settings-card h2 {
      margin: 0 0 4px;
      font-size: 1.05rem;
    }

    .company-settings-card p {
      margin: 0 0 18px;
      color: var(--text-muted, #64748b);
    }

    .company-settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .company-settings-grid label {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .company-settings-grid label span {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .company-settings-field-full {
      grid-column: 1 / -1;
    }

    .company-settings-logo-row {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 18px;
      align-items: center;
    }

    .company-settings-logo-preview {
      width: 160px;
      height: 112px;
      border-radius: 22px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(248, 250, 252, 0.9);
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--text-muted, #64748b);
      font-weight: 800;
      text-align: center;
      padding: 12px;
    }

    body.dark .company-settings-logo-preview {
      background: rgba(15, 23, 42, 0.5);
    }

    .company-settings-logo-preview img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .company-settings-message {
      margin: 12px 0 0;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(41, 72, 149, 0.1);
      color: var(--cor-principal, #294895);
      font-weight: 700;
    }

    .company-settings-message.error {
      background: rgba(220, 38, 38, 0.1);
      color: #b91c1c;
    }

    .company-settings-message.success {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .company-settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 18px;
      flex-wrap: wrap;
    }

    @media (max-width: 760px) {
      .company-settings-shell {
        width: min(100vw - 28px, 1180px);
      }

      .company-settings-grid,
      .company-settings-logo-row {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

async function carregarPermissoes() {
  const client = exigirSupabaseConfigurado();
  const { data, error } = await client.rpc('app_permissoes_efetivas');

  if (error) {
    return normalizarPermissoes([]);
  }

  return normalizarPermissoes(data || []);
}

async function garantirAcesso() {
  const { data: authData, error: authError } = await exigirSupabaseConfigurado().auth.getUser();

  if (authError || !authData?.user) {
    throw new Error('Sessão inválida. Entre novamente.');
  }

  const permissoes = await carregarPermissoes();

  if (!hasPermission(permissoes, 'configuracoes.corretora', 'view')) {
    throw new Error('Seu usuário não possui acesso aos dados da corretora.');
  }

  return authData.user;
}

async function carregarRegistroCorretora() {
  const client = exigirSupabaseConfigurado();
  const { data, error } = await client
    .from('corretora_configuracoes')
    .select('*')
    .eq('status', 'ativo')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar os dados da corretora.');
  }

  return data || {};
}

function renderTopo() {
  const logo = registroAtual?.logo_url || brandingUploadUrl || `${obterBaseHub() || '/hub'}/assets/logo-transmares.png`;

  return `
    <header class="topbar">
      <div class="brand-logo-slot" aria-label="Transmares Corretora de Seguros">
        <img src="${escapeAttr(logo)}" alt="Transmares Corretora de Seguros">
      </div>
      <div class="brand">
        <h1>Hub Transmares</h1>
        <p>Dados da corretora</p>
      </div>
      <div class="user-box">
        <button class="secondary-btn" type="button" onclick="hubCorretoraVoltarConfiguracoes()">Voltar</button>
      </div>
    </header>
  `;
}

function campo(id, rotulo, valor = '', attrs = '') {
  return `
    <label>
      <span>${escapeHtml(rotulo)}</span>
      <input id="${escapeAttr(id)}" class="config-input" type="text" value="${escapeAttr(valor || '')}" ${attrs}>
    </label>
  `;
}

function renderPreviewLogo() {
  const logo = registroAtual?.logo_url || brandingUploadUrl || '';

  if (!logo) {
    return '<div class="company-settings-logo-preview">Logo não cadastrada</div>';
  }

  return `
    <div class="company-settings-logo-preview">
      <img src="${escapeAttr(logo)}" alt="Logo atual da corretora">
    </div>
  `;
}

function renderFormulario() {
  const r = registroAtual || {};

  return `
    <main class="dashboard company-settings-page">
      ${renderTopo()}
      <section class="company-settings-shell">
        <section class="hub-page-intro">
          <span class="hub-page-kicker">Configurações</span>
          <h2>Dados da corretora</h2>
          <p>Centralize os dados institucionais e a identidade visual usada no Hub.</p>
        </section>

        <section class="company-settings-card">
          <h2>Identificação</h2>
          <p>Dados principais da empresa.</p>
          <div class="company-settings-grid">
            ${campo('cc_razao_social', 'Razão social', r.razao_social)}
            ${campo('cc_nome_fantasia', 'Nome fantasia', r.nome_fantasia)}
            ${campo('cc_cnpj', 'CNPJ', r.cnpj)}
            ${campo('cc_susep', 'SUSEP', r.susep)}
            ${campo('cc_inscricao_estadual', 'Inscrição estadual', r.inscricao_estadual)}
            ${campo('cc_inscricao_municipal', 'Inscrição municipal', r.inscricao_municipal)}
          </div>
        </section>

        <section class="company-settings-card">
          <h2>Contato</h2>
          <p>Informações usadas em comunicações e exibição institucional.</p>
          <div class="company-settings-grid">
            ${campo('cc_email', 'E-mail', r.email, 'type="email"')}
            ${campo('cc_telefone', 'Telefone', r.telefone)}
            ${campo('cc_whatsapp', 'WhatsApp', r.whatsapp)}
            ${campo('cc_site', 'Site', r.site)}
          </div>
        </section>

        <section class="company-settings-card">
          <h2>Endereço</h2>
          <p>Dados de localização da corretora.</p>
          <div class="company-settings-grid">
            <label class="company-settings-field-full">
              <span>Logradouro</span>
              <input id="cc_endereco_logradouro" class="config-input" type="text" value="${escapeAttr(r.endereco_logradouro || '')}">
            </label>
            ${campo('cc_endereco_numero', 'Número', r.endereco_numero)}
            ${campo('cc_endereco_complemento', 'Complemento', r.endereco_complemento)}
            ${campo('cc_endereco_bairro', 'Bairro', r.endereco_bairro)}
            ${campo('cc_endereco_cidade', 'Cidade', r.endereco_cidade)}
            ${campo('cc_endereco_uf', 'UF', r.endereco_uf)}
            ${campo('cc_endereco_cep', 'CEP', r.endereco_cep)}
          </div>
        </section>

        <section class="company-settings-card">
          <h2>Identidade visual</h2>
          <p>A logo enviada aqui será aplicada ao Hub e à tela de login.</p>
          <div class="company-settings-logo-row">
            ${renderPreviewLogo()}
            <div>
              <label>
                <span>Logo da corretora</span>
                <input id="cc_logo_file" class="config-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
              </label>
              <p class="company-settings-message">Formatos aceitos: PNG, JPG, WEBP ou SVG. Limite do bucket: 5 MB.</p>
            </div>
          </div>
        </section>

        ${mensagem ? `<p class="company-settings-message ${escapeAttr(mensagemTipo)}">${escapeHtml(mensagem)}</p>` : ''}

        <div class="company-settings-actions">
          <button class="secondary-btn" type="button" onclick="hubCorretoraVoltarConfiguracoes()">Cancelar</button>
          <button class="save-btn" type="button" onclick="hubCorretoraSalvar()">Salvar dados</button>
        </div>
      </section>
    </main>
  `;
}

function renderErro(mensagemErro) {
  injetarEstilos();
  const app = document.getElementById('app');
  app.dataset.companySettingsPage = 'true';
  app.innerHTML = `
    <main class="dashboard company-settings-page">
      <section class="error-card">
        <h1>Dados da corretora indisponíveis</h1>
        <p>${escapeHtml(mensagemErro || 'Não foi possível carregar esta área.')}</p>
        <button class="save-btn" type="button" onclick="hubCorretoraVoltarConfiguracoes()">Voltar</button>
      </section>
    </main>
  `;
}

async function renderizarPagina({ force = false } = {}) {
  if (!estaNaRotaCorretora()) {
    renderizadoPara = '';
    return;
  }

  const chave = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const app = document.getElementById('app');

  if (!force && renderizadoPara === chave && app?.dataset?.companySettingsPage === 'true') {
    return;
  }

  if (carregando) return;

  try {
    carregando = true;
    renderizadoPara = chave;
    await garantirAcesso();
    registroAtual = await carregarRegistroCorretora();
    injetarEstilos();
    app.dataset.companySettingsPage = 'true';
    app.innerHTML = renderFormulario();
  } catch (erro) {
    renderErro(erro.message || 'Erro ao carregar dados da corretora.');
  } finally {
    carregando = false;
  }
}

async function obterUsuarioPublicoAtual() {
  try {
    const client = exigirSupabaseConfigurado();
    const { data: authData } = await client.auth.getUser();
    const authUserId = authData?.user?.id;

    if (!authUserId) return null;

    const { data } = await client
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    return data?.id || null;
  } catch (_erro) {
    return null;
  }
}

async function uploadLogoSeInformada() {
  const file = document.getElementById('cc_logo_file')?.files?.[0];

  if (!file) {
    return {
      logo_url: registroAtual?.logo_url || null,
      logo_path: registroAtual?.logo_path || null
    };
  }

  const client = exigirSupabaseConfigurado();
  const extensao = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `logos/corretora-${Date.now()}.${extensao}`;
  const { error: uploadError } = await client.storage
    .from('branding')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Não foi possível enviar a logo.');
  }

  const { data } = client.storage.from('branding').getPublicUrl(path);
  const publicUrl = data?.publicUrl || '';

  if (!publicUrl) {
    throw new Error('Não foi possível gerar a URL pública da logo.');
  }

  brandingUploadUrl = publicUrl;

  return {
    logo_url: publicUrl,
    logo_path: path
  };
}

async function sincronizarConfiguracaoLogo(logoUrl) {
  if (!logoUrl) return;

  const client = exigirSupabaseConfigurado();
  await client
    .from('configuracoes')
    .update({ valor: logoUrl })
    .eq('chave', 'logo_url');

  await client
    .from('configuracoes')
    .update({ valor: 'sim' })
    .eq('chave', 'exibir_logo');
}

async function salvarCorretora() {
  try {
    mensagem = '';
    mensagemTipo = 'info';

    await garantirAcesso();
    const logo = await uploadLogoSeInformada();
    const usuarioId = await obterUsuarioPublicoAtual();
    const client = exigirSupabaseConfigurado();
    const payload = {
      razao_social: obterValor('cc_razao_social').trim() || null,
      nome_fantasia: obterValor('cc_nome_fantasia').trim() || null,
      cnpj: obterValor('cc_cnpj').trim() || null,
      inscricao_estadual: obterValor('cc_inscricao_estadual').trim() || null,
      inscricao_municipal: obterValor('cc_inscricao_municipal').trim() || null,
      susep: obterValor('cc_susep').trim() || null,
      email: obterValor('cc_email').trim() || null,
      telefone: obterValor('cc_telefone').trim() || null,
      whatsapp: obterValor('cc_whatsapp').trim() || null,
      site: obterValor('cc_site').trim() || null,
      endereco_logradouro: obterValor('cc_endereco_logradouro').trim() || null,
      endereco_numero: obterValor('cc_endereco_numero').trim() || null,
      endereco_complemento: obterValor('cc_endereco_complemento').trim() || null,
      endereco_bairro: obterValor('cc_endereco_bairro').trim() || null,
      endereco_cidade: obterValor('cc_endereco_cidade').trim() || null,
      endereco_uf: obterValor('cc_endereco_uf').trim() || null,
      endereco_cep: obterValor('cc_endereco_cep').trim() || null,
      logo_url: logo.logo_url,
      logo_path: logo.logo_path,
      status: normalizarStatus(registroAtual?.status || 'ativo'),
      updated_at: new Date().toISOString(),
      updated_by: usuarioId
    };

    const query = registroAtual?.id
      ? client.from('corretora_configuracoes').update(payload).eq('id', registroAtual.id).select('*').single()
      : client.from('corretora_configuracoes').insert(payload).select('*').single();

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || 'Não foi possível salvar os dados da corretora.');
    }

    registroAtual = data;
    await sincronizarConfiguracaoLogo(data.logo_url);
    await window.hubRecarregarBranding?.();

    mensagem = 'Dados da corretora salvos com sucesso.';
    mensagemTipo = 'success';
    renderizadoPara = '';
    await renderizarPagina({ force: true });
  } catch (erro) {
    mensagem = erro.message || 'Erro ao salvar os dados da corretora.';
    mensagemTipo = 'error';
    renderizadoPara = '';
    await renderizarPagina({ force: true });
  }
}

function instalarInterceptadores() {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateCorretora(...args) {
    const retorno = originalPushState.apply(this, args);
    window.setTimeout(() => renderizarPagina(), 0);
    return retorno;
  };

  window.history.replaceState = function replaceStateCorretora(...args) {
    const retorno = originalReplaceState.apply(this, args);
    window.setTimeout(() => renderizarPagina(), 0);
    return retorno;
  };
}

function iniciar() {
  if (!supabase) return;
  instalarInterceptadores();
  renderizarPagina();
}

window.hubCorretoraSalvar = salvarCorretora;
window.hubCorretoraVoltarConfiguracoes = navegarParaConfiguracoes;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}

window.addEventListener('popstate', () => window.setTimeout(() => renderizarPagina(), 0));
