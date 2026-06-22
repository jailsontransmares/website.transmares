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
