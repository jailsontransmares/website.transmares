import { exigirSupabaseConfigurado } from '../supabaseClient.js';

async function invocarCrmAr(action, payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.functions.invoke('ar-crm', {
    body: { action, ...payload }
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível acessar o CRM AR.');
  }

  if (data?.ok === false) {
    throw new Error(data.message || 'Não foi possível acessar o CRM AR.');
  }

  return data || {};
}

export async function carregarDadosCrmAr(pagina = 1, limite = 20) {
  return invocarCrmAr('getData', { pagina, limite });
}

export async function sincronizarCrmAr() {
  return invocarCrmAr('sync');
}

export async function atualizarTarefaCrmAr(taskId, itemId, changes) {
  return invocarCrmAr('updateTask', { taskId, itemId, changes });
}

export async function carregarPedidosRelacionadosCrmAr(cpf) {
  return invocarCrmAr('getRelatedByCpf', { cpf });
}

export async function carregarAtividadeCrmAr(taskId) {
  return invocarCrmAr('getTaskActivity', { taskId });
}

export async function criarComentarioCrmAr(taskId, commentText, mentions = []) {
  return invocarCrmAr('createComment', { taskId, commentText, mentions });
}

export async function responderComentarioCrmAr(taskId, commentId, commentText, mentions = []) {
  return invocarCrmAr('replyComment', { taskId, commentId, commentText, mentions });
}

export async function alternarReacaoComentarioCrmAr(taskId, commentId, emoji) {
  return invocarCrmAr('toggleReaction', { taskId, commentId, emoji });
}

export async function atualizarComentarioCrmAr(taskId, commentId, commentText) {
  return invocarCrmAr('updateComment', { taskId, commentId, commentText });
}

export async function excluirComentarioCrmAr(taskId, commentId) {
  return invocarCrmAr('deleteComment', { taskId, commentId });
}

export async function adicionarAnexoCrmAr(taskId, arquivo) {
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',').pop());
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });
  return invocarCrmAr('addAttachment', { taskId, filename: arquivo.name, contentType: arquivo.type, contentBase64 });
}
