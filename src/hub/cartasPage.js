import { supabase } from './supabaseClient.js';
import './cartasPage.css';

const RESOURCE = 'operacoes.cartas';
let ctx = {};
let docs = [];
let certs = [];
let busy = false;
let notice = '';
let modal = '';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

function has(action) { return Boolean(ctx.pode?.(RESOURCE, action)); }

function render() {
  const rows = docs.map(item => `<tr><td><strong>${esc(item.titulo)}</strong><small>${esc(item.assunto)}</small></td><td>${esc(item.destinatario)}</td><td><span class="cartas-status ${item.status === 'assinado' ? 'is-signed' : ''}">${item.status === 'assinado' ? 'Assinada' : 'Rascunho'}</span></td><td>${date(item.assinado_em || item.created_at)}</td><td class="cartas-actions">${item.status === 'rascunho' && has('update') ? `<button class="secondary-btn" onclick="hubCartasEditar('${item.id}')">Editar</button>` : ''}${item.status === 'rascunho' && has('sign') ? `<button class="secondary-btn" onclick="hubCartasAssinar('${item.id}')">Assinar</button>` : ''}${item.status === 'assinado' ? `<button class="secondary-btn" onclick="hubCartasBaixar('${item.id}')">Baixar PDF</button>` : ''}${item.status === 'rascunho' && has('delete') ? `<button class="text-btn" onclick="hubCartasExcluir('${item.id}')">Excluir</button>` : ''}</td></tr>`).join('');
  const certificates = certs.length ? certs.map(c => `<article class="cartas-cert-card"><span class="cartas-cert-icon">✓</span><div><strong>${esc(c.nome)}</strong><small>${c.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} · ${esc(c.titular)} · válido até ${date(c.validade_ate)}</small></div><span class="cartas-status is-signed">Ativo</span>${has('delete') ? `<button class="text-btn" onclick="hubCartasDesativarCertificado('${c.id}')">Desativar</button>` : ''}</article>`).join('') : '<div class="cartas-empty-small">Nenhum certificado cadastrado.</div>';
  const content = `<section class="admin-panel cartas-page"><div class="admin-panel-header"><div><span class="hub-page-kicker">Operações</span><h2>Cartas</h2><p>Crie cartas e gere documentos PDF assinados com certificado digital.</p></div><div class="cartas-toolbar">${has('manage_certificate') ? '<button class="secondary-btn" onclick="hubCartasAbrirModal(\'certificado\')">Gerenciar certificado</button>' : ''}${has('create') ? '<button class="save-btn" onclick="hubCartasAbrirModal(\'carta\')">Nova carta</button>' : ''}</div></div>
    ${notice ? `<div class="cartas-notice" role="status">${esc(notice)}</div>` : ''}
    <section class="cartas-certificates"><div class="cartas-section-head"><div><h3>Certificado digital</h3><p>O arquivo PFX é guardado criptografado em armazenamento privado.</p></div></div>${certificates}</section>
    <section class="cartas-list"><h3>Documentos</h3><div class="cartas-table-wrap"><table class="cartas-table"><thead><tr><th>Documento</th><th>Destinatário</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="cartas-empty">${busy ? 'Carregando cartas…' : 'Nenhuma carta cadastrada.'}</div></td></tr>`}</tbody></table></div></section></section>${renderModal()}`;
  document.getElementById('app').innerHTML = ctx.renderShell({ tituloPagina: 'Cartas', descricaoPagina: 'Criação e assinatura digital de cartas.', classeConteudo: 'cartas-hub-page', conteudo });
  window.createIcons?.();
}

function renderModal() {
  if (!modal) return '';
  if (modal === 'carta' || modal.startsWith('editar:')) { const id = modal.startsWith('editar:') ? modal.slice(7) : ''; const item = docs.find(doc => doc.id === id) || {}; return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog" onsubmit="hubCartasSalvar(event, '${id}')"><header><div><span class="hub-page-kicker">${id ? 'Editar documento' : 'Novo documento'}</span><h2>${id ? 'Editar carta' : 'Criar carta'}</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Título<input name="titulo" required maxlength="160" placeholder="Ex.: Carta de apresentação" value="${esc(item.titulo || '')}"></label><label>Destinatário<input name="destinatario" required maxlength="200" value="${esc(item.destinatario || '')}"></label><label>Assunto<input name="assunto" required maxlength="200" value="${esc(item.assunto || '')}"></label><label>Texto da carta<textarea name="corpo" required rows="10" maxlength="12000">${esc(item.corpo || '')}</textarea></label><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy ? 'disabled' : ''}>Salvar rascunho</button></footer></form></div>`; }
  if (modal === 'certificado') return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog" onsubmit="hubCartasCertificado(event)"><header><div><span class="hub-page-kicker">Certificado digital</span><h2>Importar certificado PFX</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Nome para identificação<input name="nome" required maxlength="120"></label><label>Arquivo PFX/P12<input name="pfx" type="file" accept=".pfx,.p12,application/x-pkcs12" required></label><label>Senha do certificado<input name="senha" type="password" required autocomplete="new-password"></label><p class="cartas-security-note">O tipo (e-CPF ou e-CNPJ), o titular e a validade serão identificados no próprio certificado. O arquivo e a senha serão criptografados no servidor.</p><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy ? 'disabled' : ''}>Importar certificado</button></footer></form></div>`;
  if (modal.startsWith('assinar:')) return `<div class="cartas-overlay" onclick="hubCartasFecharModal(event)"><form class="cartas-dialog cartas-confirm-dialog" onsubmit="hubCartasConfirmarAssinatura(event, '${esc(modal.slice(8))}')"><header><div><span class="hub-page-kicker">Confirmação de segurança</span><h2>Assinar documento</h2></div><button type="button" class="text-btn" onclick="hubCartasFecharModal()">Fechar</button></header><label>Certificado<select name="certificado_id" required>${certs.map(c => `<option value="${c.id}">${esc(c.nome)} · ${c.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} · ${esc(c.titular)}</option>`).join('')}</select></label><p>Digite novamente sua senha de acesso ao Hub para confirmar a assinatura.</p><label>Senha do Hub<input name="senha" type="password" required autocomplete="current-password"></label><p class="cartas-security-note">Sua senha de acesso não será armazenada.</p><footer><button type="button" class="secondary-btn" onclick="hubCartasFecharModal()">Cancelar</button><button class="save-btn" ${busy || !certs.length ? 'disabled' : ''}>Confirmar assinatura</button></footer></form></div>`;
  return '';
}

async function load() {
  if (!supabase || !has('view')) { render(); return; }
  busy = true; render();
  const [d, c] = await Promise.all([
    supabase.from('cartas_documentos').select('*').order('created_at', { ascending: false }),
    supabase.from('cartas_certificados').select('id,nome,tipo,titular,validade_ate,ativo').eq('ativo', true).order('created_at', { ascending: false })
  ]);
  busy = false;
  if (d.error || c.error) notice = d.error?.message || c.error?.message || 'Não foi possível carregar os dados.';
  docs = d.data || []; certs = c.data || [];
  render();
}

async function invoke(body, token) {
  const { data, error } = await supabase.functions.invoke('cartas-assinatura', { body, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) });
  if (error) throw new Error(error.message || 'Falha ao processar a solicitação.');
  if (data?.error) throw new Error(data.error);
  return data;
}

window.hubCartasAbrirModal = type => { if ((type === 'carta' && !has('create')) || (type === 'certificado' && !has('manage_certificate'))) return; modal = type; render(); };
window.hubCartasFecharModal = event => { if (event && event.target !== event.currentTarget) return; modal = ''; render(); };
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
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const result = await invoke({ action: 'upload_certificate', certificate: { nome: form.get('nome') }, pfx: btoa(binary), senha: form.get('senha') });
    modal = ''; notice = `Certificado ${result.tipo === 'ecpf' ? 'e-CPF' : 'e-CNPJ'} importado e armazenado com criptografia.`;
  } catch (error) { notice = error.message; }
  busy = false; await load();
};
window.hubCartasEditar = id => { if (!has('update')) return; modal = `editar:${id}`; render(); };
window.hubCartasAssinar = id => { if (!has('sign') || !certs.length) { notice = 'É necessário cadastrar um certificado ativo antes de assinar.'; render(); return; } modal = `assinar:${id}`; render(); };
window.hubCartasConfirmarAssinatura = async (event, id) => {
  event.preventDefault(); if (busy || !has('sign')) return;
  const fields = new FormData(event.currentTarget); const senha = fields.get('senha'); const certificateId = fields.get('certificado_id');
  const { data: current, error: currentError } = await supabase.auth.getUser();
  if (currentError || !current?.user?.email) { notice = 'Não foi possível validar sua conta do Hub.'; modal = ''; render(); return; }
  busy = true; render();
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: current.user.email, password: senha });
    if (authError || authData?.user?.id !== current.user.id) throw new Error('Senha do Hub incorreta.');
    if (!docs.some(item => item.id === id)) throw new Error('Carta não encontrada.');
    await invoke({ action: 'sign_document', documento_id: id, certificado_id: certificateId }, authData.session.access_token);
    modal = ''; notice = 'Documento assinado digitalmente.';
  } catch (error) { notice = error.message; }
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
