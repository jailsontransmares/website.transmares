import { supabase } from './supabaseClient.js';
import './cartasPage.css';

const RESOURCE = 'operacoes.cartas';
let ctx = {};
let docs = [];
let certs = [];
let busy = false;
let notice = '';
let modal = '';
let modalError = '';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

function has(action) { return Boolean(ctx.pode?.(RESOURCE, action)); }

function render() {
  const rows = docs.map(item => `<tr><td><strong>${esc(item.titulo)}</strong><small>${esc(item.assunto)}</small></td><td>${esc(item.destinatario)}</td><td><span class="cartas-status ${item.status === 'assinado' ? 'is-signed' : ''}">${item.status === 'assinado' ? 'Assinada' : 'Rascunho'}</span></td><td>${date(item.assinado_em || item.created_at)}</td><td class="cartas-actions">${item.status === 'rascunho' && has('update') ? `<button class="secondary-btn" onclick="hubCartasEditar('${item.id}')">Editar</button>` : ''}${item.status === 'rascunho' && has('sign') ? `<button class="secondary-btn" onclick="hubCartasAssinar('${item.id}')">Assinar</button>` : ''}${item.status === 'assinado' ? `<button class="secondary-btn" onclick="hubCartasBaixar('${item.id}')">Baixar PDF</button>` : ''}${item.status === 'rascunho' && has('delete') ? `<button class="text-btn" onclick="hubCartasExcluir('${item.id}')">Excluir</button>` : ''}</td></tr>`).join('');
  const certificates = certs.length ? certs.map(c => `<article class="cartas-cert-card"><span class="cartas-cert-icon">✓</span><div><strong>${esc(c.nome)}</strong><small>${c.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} · ${esc(c.titular)} · válido até ${date(c.validade_ate)}</small></div><span class="cartas-status ${c.ativo ? 'is-signed' : 'is-inactive'}">${c.ativo ? 'Ativo' : 'Inativo'}</span>${has('manage_certificate') ? `<button class="secondary-btn" onclick="hubCartasAbrirAtualizacaoCertificado('${c.id}')">Atualizar PFX e senha</button>` : ''}${c.ativo && has('delete') ? `<button class="text-btn" onclick="hubCartasDesativarCertificado('${c.id}')">Desativar</button>` : ''}</article>`).join('') : '<div class="cartas-empty-small">Nenhum certificado cadastrado.</div>';
  const content = `<section class="admin-panel cartas-page"><div class="admin-panel-header"><div><span class="hub-page-kicker">Operações</span><h2>Cartas</h2><p>Crie cartas e gere documentos PDF assinados com certificado digital.</p></div><div class="cartas-toolbar">${has('manage_certificate') ? '<button class="secondary-btn" onclick="hubCartasAbrirModal(\'certificado\')">Importar certificado</button>' : ''}${has('create') ? '<button class="save-btn" onclick="hubCartasAbrirModal(\'carta\')">Nova carta</button>' : ''}</div></div>
    ${notice ? `<div class="cartas-notice" role="status">${esc(notice)}</div>` : ''}
    <section class="cartas-certificates"><div class="cartas-section-head"><div><h3>Certificado digital</h3><p>O arquivo PFX é guardado criptografado em armazenamento privado.</p></div></div>${certificates}</section>
    <section class="cartas-list"><h3>Documentos</h3><div class="cartas-table-wrap"><table class="cartas-table"><thead><tr><th>Documento</th><th>Destinatário</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="cartas-empty">${busy ? 'Carregando cartas…' : 'Nenhuma carta cadastrada.'}</div></td></tr>`}</tbody></table></div></section></section>${renderModal()}`;
  document.getElementById('app').innerHTML = ctx.renderShell({ tituloPagina: 'Cartas', descricaoPagina: 'Criação e assinatura digital de cartas.', classeConteudo: 'cartas-hub-page', conteudo: content });
  window.createIcons?.();
}

function renderModal() {
  if (!modal) return '';
  if (modal.startsWith('atualizar-certificado:')) { const id = modal.slice('atualizar-certificado:'.length); const cert = certs.find(item => item.id === id) || {}; return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog" onsubmit="hubCartasAtualizarCertificado(event, '${id}')"><header><div><span class="hub-page-kicker">Gerenciar certificado</span><h2>Atualizar PFX e senha</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><p>${esc(cert.nome)} · ${cert.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} · ${esc(cert.titular)}</p><label class="cartas-type-toggle"><input name="tipo" type="checkbox" value="ecnpj" ${cert.tipo === 'ecnpj' ? 'checked' : ''}><span>Este certificado é e-CNPJ</span></label><p class="cartas-security-note">Desmarcado, o certificado será tratado como e-CPF.</p><label>Novo arquivo PFX/P12<input name="pfx" type="file" accept=".pfx,.p12,application/x-pkcs12" required></label><label>Senha do novo arquivo<input name="senha" type="password" required autocomplete="new-password"></label><p class="cartas-security-note">O arquivo e a senha serão validados e armazenados criptografados. A senha não será exibida nem retornada ao navegador.</p><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy ? 'disabled' : ''}>Atualizar certificado</button></footer></form></div>`; }
  if (modal === 'carta' || modal.startsWith('editar:')) { const id = modal.startsWith('editar:') ? modal.slice(7) : ''; const item = docs.find(doc => doc.id === id) || {}; return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog" onsubmit="hubCartasSalvar(event, '${id}')"><header><div><span class="hub-page-kicker">${id ? 'Editar documento' : 'Novo documento'}</span><h2>${id ? 'Editar carta' : 'Criar carta'}</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Título<input name="titulo" required maxlength="160" placeholder="Ex.: Carta de apresentação" value="${esc(item.titulo || '')}"></label><label>Destinatário<input name="destinatario" required maxlength="200" value="${esc(item.destinatario || '')}"></label><label>Assunto<input name="assunto" required maxlength="200" value="${esc(item.assunto || '')}"></label><label>Texto da carta<textarea name="corpo" required rows="10" maxlength="12000">${esc(item.corpo || '')}</textarea></label><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy ? 'disabled' : ''}>Salvar rascunho</button></footer></form></div>`; }
  if (modal === 'certificado') return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog" onsubmit="hubCartasCertificado(event)"><header><div><span class="hub-page-kicker">Certificado digital</span><h2>Importar certificado PFX</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Nome para identificação<input name="nome" required maxlength="120"></label><label class="cartas-type-toggle"><input name="tipo" type="checkbox" value="ecnpj"><span>Este certificado é e-CNPJ</span></label><p class="cartas-security-note">Desmarcado, o certificado será tratado como e-CPF. A escolha orienta a busca do CPF/CNPJ no SERIALNUMBER ou no SAN ICP-Brasil.</p><label>Arquivo PFX/P12<input name="pfx" type="file" accept=".pfx,.p12,application/x-pkcs12" required></label><label>Senha do certificado<input name="senha" type="password" required autocomplete="new-password"></label><p class="cartas-security-note">O arquivo e a senha serão criptografados no servidor.</p><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy ? 'disabled' : ''}>Importar certificado</button></footer></form></div>`;
  if (modal.startsWith('assinar:')) return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog cartas-confirm-dialog" onsubmit="hubCartasConfirmarAssinatura(event, '${esc(modal.slice(8))}')"><header><div><span class="hub-page-kicker">Confirmação de segurança</span><h2>Assinar documento</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Certificado<select name="certificado_id" required>${certs.filter(c => c.ativo).map(c => `<option value="${c.id}">${esc(c.nome)} · ${c.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} · ${esc(c.titular)}</option>`).join('')}</select></label><p>Digite novamente sua senha de acesso ao Hub para confirmar a assinatura.</p><label>Senha do Hub<input name="senha" type="password" required autocomplete="current-password"></label><p class="cartas-security-note">Sua senha de acesso não será armazenada.</p>${modalError ? `<p class="cartas-modal-error" role="alert">${esc(modalError)}</p>` : ''}<footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy || !certs.some(c => c.ativo) ? 'disabled' : ''}>${busy ? 'Validando e assinando…' : 'Confirmar assinatura'}</button></footer></form></div>`;
  return '';
}

async function load() {
  if (!supabase || !has('view')) { render(); return; }
  busy = true; render();
  try {
    const [d, c] = await Promise.all([
      supabase.from('cartas_documentos').select('*').order('created_at', { ascending: false }),
      supabase.from('cartas_certificados').select('id,nome,tipo,titular,validade_ate,ativo').order('created_at', { ascending: false })
    ]);
    if (d.error || c.error) notice = d.error?.message || c.error?.message || 'Não foi possível carregar os dados.';
    docs = d.data || [];
    certs = c.data || [];
  } catch (error) {
    docs = [];
    certs = [];
    notice = error?.message || 'Não foi possível carregar os dados de Cartas.';
  } finally {
    busy = false;
    render();
  }
}

async function invoke(body, token, client = supabase) {
  const { data, error } = await client.functions.invoke('cartas-assinatura', { body, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) });
  if (error) {
    let message = '';
    if (error.context instanceof Response) {
      try { const responseBody = await error.context.clone().json(); message = responseBody?.error || responseBody?.message || ''; } catch { /* resposta sem JSON */ }
    }
    throw new Error(message || error.message || 'Falha ao processar a solicitação.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

window.hubCartasAbrirModal = type => { if ((type === 'carta' && !has('create')) || (type === 'certificado' && !has('manage_certificate'))) return; modal = type; render(); };
window.hubCartasAbrirAtualizacaoCertificado = id => { if (!has('manage_certificate') || !certs.some(item => item.id === id)) return; modal = `atualizar-certificado:${id}`; render(); };
window.hubCartasFecharModal = event => { if (event && event.target !== event.currentTarget) return; modal = ''; modalError = ''; render(); };
window.hubCartasSalvar = async (event, id = '') => {
  event.preventDefault(); if (busy || (id ? !has('update') : !has('create'))) return;
  const data = Object.fromEntries(new FormData(event.currentTarget)); busy = true; render();
  const query = id ? supabase.from('cartas_documentos').update({ titulo: data.titulo, destinatario: data.destinatario, assunto: data.assunto, corpo: data.corpo, updated_at: new Date().toISOString() }).eq('id', id) : supabase.from('cartas_documentos').insert({ titulo: data.titulo, destinatario: data.destinatario, assunto: data.assunto, corpo: data.corpo });
  const { error } = await query;
  busy = false; modal = ''; notice = error ? `Erro ao salvar carta: ${error.message}` : 'Rascunho salvo.'; await load();
};
window.hubCartasCertificado = async event => {
  event.preventDefault(); if (busy || !has('manage_certificate')) return;
  const form = new FormData(event.currentTarget); const file = form.get('pfx');
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) { notice = 'O arquivo PFX deve ter no máximo 5 MB.'; render(); return; }
  busy = true; render();
  try {
    const body = new FormData();
    body.append('action', 'upload_certificate');
    body.append('certificate', JSON.stringify({ nome: form.get('nome') }));
    body.append('tipo', form.get('tipo') === 'ecnpj' ? 'ecnpj' : 'ecpf');
    body.append('pfx', file, file.name);
    body.append('senha', String(form.get('senha') || ''));
    const result = await invoke(body);
    modal = ''; notice = `Certificado ${result.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} importado e armazenado com criptografia.`;
  } catch (error) { notice = error.message; }
  busy = false; await load();
};
window.hubCartasAtualizarCertificado = async (event, id) => {
  event.preventDefault(); if (busy || !has('manage_certificate')) return;
  const form = new FormData(event.currentTarget); const file = form.get('pfx');
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) { notice = 'O arquivo PFX deve ter no máximo 5 MB.'; render(); return; }
  busy = true; render();
  try {
    const body = new FormData();
    body.append('action', 'update_certificate');
    body.append('certificado_id', id);
    body.append('tipo', form.get('tipo') === 'ecnpj' ? 'ecnpj' : 'ecpf');
    body.append('pfx', file, file.name);
    body.append('senha', String(form.get('senha') || ''));
    const result = await invoke(body);
    modal = '';
    notice = `Certificado atualizado como ${result.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} e armazenado com criptografia.`;
  } catch (error) { notice = error.message; }
  busy = false; await load();
};
window.hubCartasEditar = id => { if (!has('update')) return; modal = `editar:${id}`; render(); };
window.hubCartasAssinar = id => { if (!has('sign') || !certs.some(c => c.ativo)) { notice = 'É necessário cadastrar um certificado ativo antes de assinar.'; render(); return; } modalError = ''; modal = `assinar:${id}`; render(); };
window.hubCartasConfirmarAssinatura = async (event, id) => {
  event.preventDefault(); if (busy || !has('sign')) return;
  const fields = new FormData(event.currentTarget); const senha = fields.get('senha'); const certificateId = fields.get('certificado_id');
  busy = true; render();
  try {
    const { data: current, error: currentError } = await supabase.auth.getUser();
    if (currentError || !current?.user?.email) throw new Error('Não foi possível validar sua conta do Hub. Atualize a página e entre novamente.');
    if (!docs.some(item => item.id === id)) throw new Error('Carta não encontrada.');
    await invoke({ action: 'sign_document', documento_id: id, certificado_id: certificateId, confirmacao_senha: String(senha || '') });
    modal = ''; modalError = ''; notice = 'Documento assinado digitalmente.';
  } catch (error) { modalError = error.message || 'Não foi possível concluir a assinatura.'; }
  busy = false; await load();
};
window.hubCartasExcluir = async id => {
  if (!has('delete') || !window.confirm('Excluir este rascunho?')) return;
  const { error } = await supabase.from('cartas_documentos').delete().eq('id', id);
  notice = error ? error.message : 'Rascunho excluído.'; await load();
};
window.hubCartasDesativarCertificado = async id => {
  if (!has('delete') || !window.confirm('Desativar este certificado? Ele deixará de aparecer para novas assinaturas.')) return;
  try { await invoke({ action: 'deactivate_certificate', certificado_id: id }); notice = 'Certificado desativado.'; }
  catch (error) { notice = error.message; }
  await load();
};
window.hubCartasBaixar = async id => {
  if (!has('view')) return;
  try { const result = await invoke({ action: 'download_document', documento_id: id }); const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); const a = document.createElement('a'); a.href = url; a.download = `${(docs.find(d => d.id === id)?.titulo || 'carta').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`; a.click(); URL.revokeObjectURL(url); }
  catch (error) { notice = error.message; render(); }
};

export async function mountCartasPage(context = {}) {
  ctx = context; notice = ''; modal = '';
  if (!context.pode?.(RESOURCE, 'view')) { document.getElementById('app').innerHTML = context.renderShell({ tituloPagina: 'Cartas', descricaoPagina: 'Acesso controlado por permissões do Hub.', conteudo: '<section class="admin-panel cartas-page"><div class="cartas-empty">Você não tem permissão para visualizar esta área.</div></section>' }); return; }
  await load();
}
