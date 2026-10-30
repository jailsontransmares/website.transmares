import { supabase, exigirSupabaseConfigurado } from './supabaseClient.js';
import { salvarCorretoraViaRpc } from './companySettingsSaveRpcFix.js';
import { hasPermission, normalizarPermissoes } from './services/permissionService.js';
import {
  aguardarContextoAcessoHub,
  obterContextoAcessoHub
} from './services/hubAccessContext.js';

const COMPANY_ROUTE = 'configuracoes/corretora';
let renderizadoPara = '';
let carregando = false;
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
    .company-settings-shell {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      display: grid;
      gap: 14px;
      box-sizing: border-box;
      margin: 0;
    }

    .company-settings-card {
      box-sizing: border-box;
      min-width: 0;
      padding: 16px;
    }

    .company-settings-card-header {
      border-bottom: 1px solid color-mix(in srgb, var(--cor-principal) 10%, transparent);
      display: grid;
      gap: 3px;
      margin-bottom: 12px;
      min-width: 0;
      padding-bottom: 10px;
    }

    .company-settings-card-header h2 {
      color: var(--texto);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.25;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .company-settings-heading {
      max-width: calc(100% - 208px);
      min-width: 0;
    }

    .company-settings-branding {
      position: absolute;
      right: 26px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
    }

    .company-settings-branding {
      align-items: center;
      display: flex;
      gap: 10px;
      min-width: 0;
    }

    .company-settings-branding .company-settings-logo-preview {
      width: 148px;
    }

    .company-settings-upload {
      flex: 0 0 38px;
      overflow: hidden;
      position: relative;
    }

    .company-settings-upload:focus-within {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor-principal) 18%, transparent);
      outline: 2px solid color-mix(in srgb, var(--cor-principal) 42%, transparent);
      outline-offset: 2px;
    }

    .company-settings-upload input[type="file"] {
      cursor: pointer;
      height: 100%;
      inset: 0;
      opacity: 0;
      position: absolute;
      width: 100%;
    }

    .company-settings-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 12px;
      align-items: start;
    }

    .company-settings-grid-identification {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .company-settings-grid-address {
      grid-template-columns: repeat(12, minmax(0, 1fr));
    }

    .company-settings-address-row-one {
      grid-column: span 4;
    }

    .company-settings-address-row-two {
      grid-column: span 4;
    }

    .company-settings-address-city-uf {
      display: grid;
      gap: 10px 12px;
      grid-column: span 4;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: 0;
    }

    .company-settings-grid label {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .company-settings-grid label > span {
      color: var(--texto-suave);
      font-size: 12px;
      font-weight: 400;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .company-settings-grid .config-input {
      box-sizing: border-box;
      font-size: 13px;
      min-height: 34px;
      padding: 6px 9px;
      width: 100%;
    }

    .company-settings-logo-preview {
      width: 100%;
      max-width: 148px;
      height: 96px;
      border-radius: var(--radius-card-compact, 14px);
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(248, 250, 252, 0.9);
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--text-muted, #64748b);
      font-weight: 800;
      text-align: center;
      padding: 10px;
      box-sizing: border-box;
    }

    body.dark .company-settings-logo-preview {
      background: rgba(15, 23, 42, 0.5);
    }

    .company-settings-logo-preview img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .company-settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    @media (max-width: 900px) {
      .company-settings-grid {
        grid-template-columns: 1fr;
      }

      .company-settings-grid-identification {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .company-settings-grid-address {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .company-settings-address-row-two {
        grid-column: span 1;
      }

      .company-settings-address-row-one {
        grid-column: span 1;
      }

      .company-settings-address-city-uf {
        grid-column: 1 / -1;
      }

      .company-settings-logo-preview {
        width: min(100%, 148px);
      }
    }

    @media (max-width: 680px) {
      .company-settings-heading {
        max-width: none;
      }

      .company-settings-branding {
        margin-top: 12px;
        position: relative;
        right: auto;
        justify-self: start;
        top: auto;
        transform: none;
      }
    }

    @media (max-width: 560px) {
      .company-settings-grid-identification {
        grid-template-columns: 1fr;
      }

      .company-settings-grid-address {
        grid-template-columns: 1fr;
      }

      .company-settings-address-row-one,
      .company-settings-address-row-two {
        grid-column: span 1;
      }

      .company-settings-address-city-uf {
        grid-column: span 1;
        grid-template-columns: 1fr;
      }

      .company-settings-card {
        padding: 12px;
      }

      .company-settings-actions {
        justify-content: stretch;
      }

      .company-settings-actions > button {
        flex: 1 1 120px;
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
  const contextoAtual = obterContextoAcessoHub();
  const contextoHub = contextoAtual.carregado
    ? contextoAtual
    : await aguardarContextoAcessoHub({ timeoutMs: 2500 });

  if (contextoHub?.carregado && contextoHub.usuario && contextoHub.permissions) {
    if (!hasPermission(contextoHub.permissions, 'configuracoes.corretora', 'view')) {
      throw new Error('Seu usuário não possui acesso aos dados da corretora.');
    }

    return contextoHub.usuario;
  }

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
  return window.hubRenderizarTopbarPadrao?.() || '';
}

function campo(id, rotulo, valor = '', attrs = '', classeLabel = '') {
  return `
    <label${classeLabel ? ` class="${escapeAttr(classeLabel)}"` : ''}>
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
    <main class="dashboard hub-layout company-settings-page ${escapeAttr(window.hubObterClassesLayoutPadrao?.() || 'is-sidebar-collapsed')}" >
      ${renderTopo()}
      <div class="hub-shell">
        ${window.hubRenderizarSidebarPadrao?.() || ''}
        <section class="hub-page-content company-settings-shell">
          ${window.hubRenderizarBreadcrumbPadrao?.() || ''}
          <section class="hub-page-intro">
            <div class="company-settings-heading">
              <span class="hub-page-kicker">Configurações</span>
              <h2>Dados da corretora</h2>
            </div>
            <div class="company-settings-branding">
              ${renderPreviewLogo()}
              <label class="icon-btn company-settings-upload" title="Selecionar logo da corretora" aria-label="Selecionar logo da corretora">
                <i data-lucide="upload-cloud" aria-hidden="true"></i>
                <input id="cc_logo_file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="Selecionar arquivo da logo da corretora">
              </label>
            </div>
          </section>

        <section class="admin-panel company-settings-card">
          <header class="company-settings-card-header">
            <h2>Identificação</h2>
          </header>
          <div class="company-settings-grid company-settings-grid-identification">
            ${campo('cc_razao_social', 'Razão social', r.razao_social)}
            ${campo('cc_nome_fantasia', 'Nome fantasia', r.nome_fantasia)}
            ${campo('cc_cnpj', 'CNPJ', r.cnpj)}
            ${campo('cc_susep', 'SUSEP', r.susep)}
            ${campo('cc_inscricao_estadual', 'Inscrição estadual', r.inscricao_estadual)}
            ${campo('cc_inscricao_municipal', 'Inscrição municipal', r.inscricao_municipal)}
          </div>
        </section>

        <section class="admin-panel company-settings-card">
          <header class="company-settings-card-header">
            <h2>Contato</h2>
          </header>
          <div class="company-settings-grid">
            ${campo('cc_email', 'E-mail', r.email, 'type="email"')}
            ${campo('cc_telefone', 'Telefone', r.telefone)}
            ${campo('cc_whatsapp', 'WhatsApp', r.whatsapp)}
            ${campo('cc_site', 'Site', r.site)}
          </div>
        </section>

        <section class="admin-panel company-settings-card">
          <header class="company-settings-card-header">
            <h2>Endereço</h2>
          </header>
          <div class="company-settings-grid company-settings-grid-address">
            ${campo('cc_endereco_cep', 'CEP', r.endereco_cep, 'oninput="hubCompanySettingsCepInput(event)"', 'company-settings-address-row-one')}
            ${campo('cc_endereco_logradouro', 'Logradouro', r.endereco_logradouro, '', 'company-settings-address-row-one')}
            ${campo('cc_endereco_numero', 'Número', r.endereco_numero, '', 'company-settings-address-row-one')}
            ${campo('cc_endereco_complemento', 'Complemento', r.endereco_complemento, '', 'company-settings-address-row-two')}
            ${campo('cc_endereco_bairro', 'Bairro', r.endereco_bairro, '', 'company-settings-address-row-two')}
            <div class="company-settings-address-city-uf">
              ${campo('cc_endereco_cidade', 'Cidade', r.endereco_cidade)}
              ${campo('cc_endereco_uf', 'UF', r.endereco_uf)}
            </div>
          </div>
        </section>

          <div class="company-settings-actions">
            <button class="secondary-btn" type="button" onclick="hubCorretoraVoltarConfiguracoes()">Cancelar</button>
            <button class="save-btn" type="button" data-company-settings-save>Salvar</button>
          </div>
        </section>
      </div>
    </main>
  `;
}

function renderErro(mensagemErro) {
  injetarEstilos();
  const app = document.getElementById('app');
  app.dataset.companySettingsPage = 'true';
  app.innerHTML = `
    <main class="dashboard hub-layout company-settings-page ${escapeAttr(window.hubObterClassesLayoutPadrao?.() || 'is-sidebar-collapsed')}" >
      ${renderTopo()}
      <div class="hub-shell">
        ${window.hubRenderizarSidebarPadrao?.() || ''}
        <section class="hub-page-content company-settings-shell">
          ${window.hubRenderizarBreadcrumbPadrao?.() || ''}
          <section class="error-card">
            <h1>Dados da corretora indisponíveis</h1>
            <p>${escapeHtml(mensagemErro || 'Não foi possível carregar esta área.')}</p>
            <button class="save-btn" type="button" onclick="hubCorretoraVoltarConfiguracoes()">Voltar</button>
          </section>
        </section>
      </div>
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
  const paginaAtualRenderizada = app?.dataset?.companySettingsPage === 'true'
    && Boolean(app.querySelector(':scope > main.company-settings-page'));

  if (!force && renderizadoPara === chave && paginaAtualRenderizada) {
    return;
  }

  if (carregando) return;

  try {
    carregando = true;
    renderizadoPara = chave;
    await garantirAcesso();
    registroAtual = await carregarRegistroCorretora();

    const chaveAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!estaNaRotaCorretora() || chaveAtual !== chave) return;

    injetarEstilos();
    app.dataset.companySettingsPage = 'true';
    app.innerHTML = renderFormulario();
  } catch (erro) {
    const chaveAtual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!estaNaRotaCorretora() || chaveAtual !== chave) return;

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

    window.hubToast?.success('Dados da corretora salvos com sucesso.', { dedupeKey: 'company-settings-save' });
    renderizadoPara = '';
    await renderizarPagina({ force: true });
  } catch (erro) {
    window.hubToast?.error(erro.message || 'Erro ao salvar os dados da corretora.', { dedupeKey: 'company-settings-save' });
    renderizadoPara = '';
    await renderizarPagina({ force: true });
  }
}

function iniciar() {
  if (!supabase) return;
  renderizarPagina();
}

window.hubCorretoraSalvar = salvarCorretora;
window.hubCorretoraVoltarConfiguracoes = navegarParaConfiguracoes;
window.hubRenderizarPaginaCorretora = renderizarPagina;
window.dispatchEvent(new Event('hub:company-settings-ready'));

document.addEventListener('click', event => {
  const botao = event.target instanceof Element
    ? event.target.closest('[data-company-settings-save]')
    : null;

  if (!botao) return;

  event.preventDefault();
  salvarCorretoraViaRpc();
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
