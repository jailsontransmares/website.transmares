import { exigirSupabaseConfigurado } from './supabaseClient.js';

const WRAPPED_FLAG = '__hubCompanySettingsSaveRpcFixWrapped';

function obterValor(id) {
  return document.getElementById(id)?.value || '';
}

function normalizarStatus(status = 'ativo') {
  return String(status || '').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
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

function definirMensagem(texto, tipo = 'info') {
  const mensagemExistente = document.querySelector('.company-settings-message.success, .company-settings-message.error');
  const container = document.querySelector('.company-settings-actions')?.parentElement;

  if (mensagemExistente) {
    mensagemExistente.className = `company-settings-message ${tipo}`;
    mensagemExistente.textContent = texto;
    return;
  }

  if (!container) return;

  const mensagem = document.createElement('p');
  mensagem.className = `company-settings-message ${tipo}`;
  mensagem.textContent = texto;
  container.insertBefore(mensagem, container.querySelector('.company-settings-actions'));
}

async function carregarRegistroAtual() {
  const client = exigirSupabaseConfigurado();
  const { data, error } = await client
    .from('corretora_configuracoes')
    .select('*')
    .eq('status', 'ativo')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar o registro atual da corretora.');
  }

  return data || {};
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

async function uploadLogoSeInformada(registroAtual = {}) {
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

function montarPayload(registroAtual, usuarioId, logo) {
  return {
    id: registroAtual?.id || '',
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
    updated_by: usuarioId || null
  };
}

async function salvarCorretoraViaRpc() {
  if (!estaNaRotaCorretora()) {
    return window.__hubCorretoraSalvarOriginal?.();
  }

  const botaoSalvar = document.querySelector('.company-settings-actions .save-btn');
  const textoOriginal = botaoSalvar?.textContent || 'Salvar dados';

  try {
    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = 'Salvando...';
    }

    definirMensagem('Salvando dados da corretora...', 'info');

    const client = exigirSupabaseConfigurado();
    const registroAtual = await carregarRegistroAtual();
    const usuarioId = await obterUsuarioPublicoAtual();
    const logo = await uploadLogoSeInformada(registroAtual);
    const payload = montarPayload(registroAtual, usuarioId, logo);

    const { data, error } = await client.rpc('salvar_corretora_configuracao', {
      p_payload: payload
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível salvar os dados da corretora.');
    }

    await sincronizarConfiguracaoLogo(data?.logo_url || logo.logo_url);
    await window.hubRecarregarBranding?.();

    definirMensagem('Dados da corretora salvos com sucesso.', 'success');
  } catch (erro) {
    definirMensagem(erro.message || 'Erro ao salvar os dados da corretora.', 'error');
  } finally {
    if (botaoSalvar) {
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = textoOriginal;
    }
  }
}

function instalarOverride() {
  if (typeof window.hubCorretoraSalvar !== 'function') return;
  if (window.hubCorretoraSalvar[WRAPPED_FLAG]) return;

  window.__hubCorretoraSalvarOriginal = window.hubCorretoraSalvar;
  Object.defineProperty(salvarCorretoraViaRpc, WRAPPED_FLAG, { value: true });
  window.hubCorretoraSalvar = salvarCorretoraViaRpc;
}

window.addEventListener('load', instalarOverride);
window.addEventListener('popstate', () => window.setTimeout(instalarOverride, 0));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', instalarOverride);
} else {
  instalarOverride();
}
