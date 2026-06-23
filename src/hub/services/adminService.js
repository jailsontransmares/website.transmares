import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const DEFAULT_COLORS = {
  cor_principal: '#294895',
  cor_secundaria: '#1F3676',
  cor_destaque: '#16A34A'
};

const ENTIDADES_ADMIN = {
  categorias: 'categorias',
  grupos: 'grupos'
};

function normalizarStatus(status) {
  return String(status || 'ativo').trim().toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function getDadosItem(item) {
  return item?.dados && typeof item.dados === 'object' ? item.dados : {};
}

function isModuloItem(item) {
  return String(getDadosItem(item).tipo || item?.tipo || '').trim().toLowerCase() === 'modulo';
}

function normalizarModuloAdmin(item) {
  const dados = getDadosItem(item);
  const slug = String(dados.slug || item.slug || item.id_modulo || item.modulo_id || item.id || '').trim();
  const ordem = Number(dados.ordem);
  const bloqueavel = dados.bloqueavel === false ? false : slug !== 'administracao';

  return {
    id: item.id,
    slug,
    nome: item.titulo || item.nome || item.label || slug,
    descricao: item.descricao || dados.descricao || '',
    status: normalizarStatus(item.status),
    ordem: Number.isFinite(ordem) ? ordem : 9999,
    bloqueavel
  };
}

function normalizarConfigLista(registros) {
  return [...(registros || [])].sort((a, b) => {
    const grupo = String(a.grupo || '').localeCompare(String(b.grupo || ''), 'pt-BR');
    if (grupo !== 0) return grupo;
    return String(a.chave || '').localeCompare(String(b.chave || ''), 'pt-BR');
  });
}

function normalizarConfigObjeto(registros) {
  return (registros || []).reduce((acc, item) => {
    if (item.chave) {
      acc[item.chave] = item.valor ?? '';
    }
    return acc;
  }, {});
}

async function carregarConfiguracoes() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('status', 'ativo')
    .order('grupo', { ascending: true })
    .order('chave', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar configurações.');
  }

  return data || [];
}

function validarEntidade(entidade) {
  const tabela = ENTIDADES_ADMIN[entidade];

  if (!tabela) {
    throw new Error('Cadastro administrativo não suportado.');
  }

  return tabela;
}

export async function carregarAdminData() {
  const config = await carregarConfiguracoes();
  return { config: normalizarConfigLista(config) };
}

export async function listarRegistrosAdmin({ entidade }) {
  const supabase = exigirSupabaseConfigurado();
  const tabela = validarEntidade(entidade);
  const { data, error } = await supabase
    .from(tabela)
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar registros.');
  }

  return { records: data || [] };
}

export async function listarModulosAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .order('titulo', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar módulos.');
  }

  const modules = (data || [])
    .filter(isModuloItem)
    .map(normalizarModuloAdmin)
    .filter(item => item.slug)
    .sort((a, b) => {
      if (a.ordem !== b.ordem) {
        return a.ordem - b.ordem;
      }

      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });

  return { modules };
}

export async function salvarRegistroAdmin({ entidade, id, nome, descricao, status }) {
  const supabase = exigirSupabaseConfigurado();
  const tabela = validarEntidade(entidade);
  const payload = {
    nome: String(nome || '').trim(),
    descricao: String(descricao || '').trim() || null,
    status: status === 'inativo' ? 'inativo' : 'ativo'
  };

  if (!payload.nome) {
    throw new Error('Informe o nome do registro.');
  }

  const query = id
    ? supabase.from(tabela).update(payload).eq('id', id).select('*').single()
    : supabase.from(tabela).insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o registro.');
  }

  return { record: data };
}

export async function salvarStatusModuloAdmin({ id, status }) {
  const supabase = exigirSupabaseConfigurado();
  const statusNormalizado = normalizarStatus(status);

  if (!id) {
    throw new Error('Informe o módulo que será atualizado.');
  }

  const { data: atual, error: erroConsulta } = await supabase
    .from('itens')
    .select('*')
    .eq('id', id)
    .single();

  if (erroConsulta) {
    throw new Error(erroConsulta.message || 'Não foi possível localizar o módulo.');
  }

  if (!isModuloItem(atual)) {
    throw new Error('O registro informado não é um módulo.');
  }

  const modulo = normalizarModuloAdmin(atual);

  if (!modulo.bloqueavel && statusNormalizado === 'inativo') {
    throw new Error('O módulo Administração não pode ser inativado.');
  }

  const { error } = await supabase
    .from('itens')
    .update({ status: statusNormalizado })
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Não foi possível atualizar o status do módulo.');
  }

  const { data: atualizado, error: erroVerificacao } = await supabase
    .from('itens')
    .select('*')
    .eq('id', id)
    .single();

  if (erroVerificacao) {
    throw new Error(erroVerificacao.message || 'Não foi possível confirmar o status do módulo.');
  }

  const moduloAtualizado = normalizarModuloAdmin(atualizado);

  if (moduloAtualizado.status !== statusNormalizado) {
    throw new Error('O Supabase não confirmou a alteração. Verifique as permissões de update da tabela itens.');
  }

  return { module: moduloAtualizado };
}

export async function salvarConfig({ chave, valor }) {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase
    .from('configuracoes')
    .update({ valor: valor ?? '' })
    .eq('chave', chave);

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a configuração.');
  }

  const config = await carregarConfiguracoes();
  return { config: normalizarConfigObjeto(config) };
}

export async function restaurarCoresPadrao() {
  const supabase = exigirSupabaseConfigurado();
  const updates = Object.entries(DEFAULT_COLORS).map(([chave, valor]) =>
    supabase.from('configuracoes').update({ valor }).eq('chave', chave)
  );
  const resultados = await Promise.all(updates);
  const erro = resultados.find(resultado => resultado.error)?.error;

  if (erro) {
    throw new Error(erro.message || 'Não foi possível restaurar as cores.');
  }

  const config = await carregarConfiguracoes();
  return { config: normalizarConfigObjeto(config) };
}

export async function salvarTemaUsuario() {
  return { saved: false, reason: 'A tabela usuarios ainda não possui campo de preferência visual.' };
}
