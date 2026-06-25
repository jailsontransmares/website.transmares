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

function normalizarSlugModulo(valor = '') {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDadosItem(item) {
  return item?.dados && typeof item.dados === 'object' ? item.dados : {};
}

function isModuloItem(item) {
  return String(getDadosItem(item).tipo || item?.tipo || '').trim().toLowerCase() === 'modulo';
}

function normalizarModuloAdmin(item) {
  const dados = getDadosItem(item);
  const slugFonte = dados.slug || item.slug || item.id_modulo || item.modulo_id || item.titulo || item.nome || item.label || item.id || '';
  const slug = normalizarSlugModulo(slugFonte);
  const ordem = Number(dados.ordem);
  const bloqueavel = dados.bloqueavel === false ? false : slug !== 'administracao';
  const exibirHomeValor = dados.exibir_home;
  const exibirHome = !(exibirHomeValor === false || String(exibirHomeValor).trim().toLowerCase() === 'false');

  return {
    id: item.id,
    slug,
    nome: item.titulo || item.nome || item.label || slug,
    descricao: item.descricao || dados.descricao || '',
    status: normalizarStatus(item.status),
    ordem: Number.isFinite(ordem) ? ordem : 9999,
    bloqueavel,
    exibir_home: exibirHome
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

export async function listarUsuariosAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const [usuarios, perfis, permissoesUsuario, permissoesPerfil] = await Promise.all([
    supabase
      .from('usuarios')
      .select('*')
      .order('nome', { ascending: true }),
    supabase
      .from('perfis')
      .select('*')
      .order('nivel', { ascending: false }),
    supabase
      .from('usuario_permissoes')
      .select('usuario_id, recurso_chave, acao, efeito, updated_at'),
    supabase
      .from('perfil_permissoes')
      .select('perfil_id, recurso_chave, acao, permitido, updated_at')
  ]);

  if (usuarios.error) {
    throw new Error(usuarios.error.message || 'Não foi possível carregar usuários.');
  }

  if (perfis.error) {
    throw new Error(perfis.error.message || 'Não foi possível carregar perfis.');
  }

  if (permissoesUsuario.error) {
    throw new Error(permissoesUsuario.error.message || 'Não foi possível carregar o resumo de permissões dos usuários.');
  }

  if (permissoesPerfil.error) {
    throw new Error(permissoesPerfil.error.message || 'Não foi possível carregar o padrão de permissões dos perfis.');
  }

  const perfisPorId = new Map((perfis.data || []).map(perfil => [perfil.id, perfil]));
  const permissoesPerfilPorChave = (permissoesPerfil.data || []).reduce((acc, permissao) => {
    const perfilId = permissao.perfil_id;
    const recursoChave = permissao.recurso_chave;
    const acao = permissao.acao;

    if (!perfilId || !recursoChave || !acao) {
      return acc;
    }

    const chavePermissao = `${perfilId}:${recursoChave}:${acao}`;
    const registroAtual = acc.get(chavePermissao);
    const dataAtual = String(permissao.updated_at || '');
    const dataExistente = String(registroAtual?.updated_at || '');

    if (!registroAtual || dataAtual >= dataExistente) {
      acc.set(chavePermissao, {
        permitido: permissao.permitido !== false,
        updated_at: permissao.updated_at || ''
      });
    }

    return acc;
  }, new Map());
  const permissoesUnicasPorUsuario = (permissoesUsuario.data || []).reduce((acc, permissao) => {
    const usuarioId = permissao.usuario_id;
    const recursoChave = permissao.recurso_chave;
    const acao = permissao.acao;

    if (!usuarioId || !recursoChave || !acao) {
      return acc;
    }

    const chavePermissao = `${recursoChave}:${acao}`;
    const permissoesDoUsuario = acc.get(usuarioId) || new Map();
    const registroAtual = permissoesDoUsuario.get(chavePermissao);
    const dataAtual = String(permissao.updated_at || '');
    const dataExistente = String(registroAtual?.updated_at || '');

    if (!registroAtual || dataAtual >= dataExistente) {
      permissoesDoUsuario.set(chavePermissao, {
        recurso_chave: recursoChave,
        acao,
        efeito: permissao.efeito,
        updated_at: permissao.updated_at || ''
      });
    }

    acc.set(usuarioId, permissoesDoUsuario);
    return acc;
  }, new Map());
  const resumoPermissoesPorUsuario = new Map(
    Array.from(permissoesUnicasPorUsuario.entries()).map(([usuarioId, permissoes]) => {
      const usuario = (usuarios.data || []).find(item => item.id === usuarioId) || {};
      const perfilId = usuario.perfil_id || '';
      const resumo = Array.from(permissoes.values()).reduce((acc, permissao) => {
        const permitidoNoPerfil = Boolean(
          permissoesPerfilPorChave.get(`${perfilId}:${permissao.recurso_chave}:${permissao.acao}`)?.permitido
        );

        if (permissao.efeito === 'permitir' && !permitidoNoPerfil) {
          acc.permitidas += 1;
        }

        if (permissao.efeito === 'negar' && permitidoNoPerfil) {
          acc.bloqueadas += 1;
        }

        return acc;
      }, { permitidas: 0, bloqueadas: 0 });

      return [usuarioId, resumo];
    })
  );
  const records = (usuarios.data || []).map(usuario => {
    const perfil = perfisPorId.get(usuario.perfil_id) || {};
    const resumoPermissoes = resumoPermissoesPorUsuario.get(usuario.id) || { permitidas: 0, bloqueadas: 0 };

    return {
      id: usuario.id,
      nome: usuario.nome || usuario.email || 'Usuário',
      email: usuario.email || '',
      perfil_id: usuario.perfil_id || '',
      perfil: perfil.nome || usuario.perfil || '',
      perfil_slug: perfil.slug || usuario.perfil || '',
      status: usuario.status || 'pendente',
      is_master: Boolean(usuario.is_master),
      ultimo_login_em: usuario.ultimo_login_em || '',
      bloqueado_em: usuario.bloqueado_em || '',
      permissoes_permitidas: resumoPermissoes.permitidas,
      permissoes_bloqueadas: resumoPermissoes.bloqueadas
    };
  });

  return { records };
}

export async function listarPermissoesUsuarioAdmin({ usuario_id }) {
  const supabase = exigirSupabaseConfigurado();

  if (!usuario_id) {
    throw new Error('Informe o usuário.');
  }

  const [recursos, permissoes] = await Promise.all([
    supabase
      .from('recursos_acesso')
      .select('*')
      .order('ordem', { ascending: true }),
    supabase
      .from('usuario_permissoes')
      .select('*')
      .eq('usuario_id', usuario_id)
  ]);

  if (recursos.error) {
    throw new Error(recursos.error.message || 'Não foi possível carregar recursos.');
  }

  if (permissoes.error) {
    throw new Error(permissoes.error.message || 'Não foi possível carregar permissões do usuário.');
  }

  return {
    recursos: recursos.data || [],
    permissoes: permissoes.data || []
  };
}

export async function salvarUsuarioAdmin({ id, nome, email, perfil_id, status }) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    nome: String(nome || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    perfil_id: perfil_id || null,
    status: ['pendente', 'ativo', 'bloqueado', 'inativo'].includes(status) ? status : 'pendente',
    updated_at: new Date().toISOString()
  };

  if (!payload.nome) {
    throw new Error('Informe o nome do usuário.');
  }

  if (!payload.email) {
    throw new Error('Informe o e-mail do usuário.');
  }

  const query = id
    ? supabase.from('usuarios').update(payload).eq('id', id).select('*').single()
    : supabase.from('usuarios').insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o usuário.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: id ? 'usuario.atualizar' : 'usuario.criar',
    p_recurso: 'admin.usuarios',
    p_alvo_usuario_id: data.id,
    p_detalhes: {
      email: data.email,
      status: data.status,
      perfil_id: data.perfil_id
    }
  });

  return { record: data };
}

export async function listarPerfisAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const [perfis, permissoes] = await Promise.all([
    supabase
      .from('perfis')
      .select('*')
      .order('nivel', { ascending: false })
      .order('nome', { ascending: true }),
    supabase
      .from('perfil_permissoes')
      .select('perfil_id, recurso_chave, acao, permitido, updated_at')
  ]);

  if (perfis.error) {
    throw new Error(perfis.error.message || 'Não foi possível carregar perfis.');
  }

  if (permissoes.error) {
    throw new Error(permissoes.error.message || 'Não foi possível carregar o resumo de permissões dos perfis.');
  }

  const permissoesAtivasPorPerfil = (permissoes.data || []).reduce((acc, permissao) => {
    if (!permissao.perfil_id || permissao.permitido === false) {
      return acc;
    }

    const chaves = acc.get(permissao.perfil_id) || new Set();
    chaves.add(`${permissao.recurso_chave}:${permissao.acao}`);
    acc.set(permissao.perfil_id, chaves);
    return acc;
  }, new Map());

  const records = (perfis.data || []).map(perfil => ({
    ...perfil,
    permissoes_ativas: permissoesAtivasPorPerfil.get(perfil.id)?.size || 0
  }));

  return {
    records,
    permissoes: permissoes.data || []
  };
}

export async function salvarPerfilAdmin({ id, slug, nome, descricao, nivel, status }) {
  const supabase = exigirSupabaseConfigurado();
  const payload = {
    slug: String(slug || nome || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
    nome: String(nome || '').trim(),
    descricao: String(descricao || '').trim() || null,
    nivel: Number(nivel) || 0,
    status: status === 'inativo' ? 'inativo' : 'ativo',
    updated_at: new Date().toISOString()
  };

  if (!payload.slug) {
    throw new Error('Informe o identificador do perfil.');
  }

  if (!payload.nome) {
    throw new Error('Informe o nome do perfil.');
  }

  const query = id
    ? supabase.from('perfis').update(payload).eq('id', id).select('*').single()
    : supabase.from('perfis').insert(payload).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o perfil.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: id ? 'perfil.atualizar' : 'perfil.criar',
    p_recurso: 'admin.perfis',
    p_alvo_usuario_id: null,
    p_detalhes: {
      perfil_id: data.id,
      slug: data.slug,
      nivel: data.nivel,
      status: data.status
    }
  });

  return { record: data };
}

export async function excluirPerfilAdmin({ id }) {
  const supabase = exigirSupabaseConfigurado();

  if (!id) {
    throw new Error('Informe o perfil.');
  }

  const { data, error } = await supabase.rpc('app_excluir_perfil_admin', {
    p_perfil_id: id
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível excluir o perfil.');
  }

  return data || { deleted: true };
}

export async function listarPermissoesAdmin() {
  const supabase = exigirSupabaseConfigurado();
  const [recursos, perfis, permissoes] = await Promise.all([
    supabase
      .from('recursos_acesso')
      .select('*')
      .order('ordem', { ascending: true }),
    supabase
      .from('perfis')
      .select('*')
      .order('nivel', { ascending: false }),
    supabase
      .from('perfil_permissoes')
      .select('*')
  ]);

  if (recursos.error) {
    throw new Error(recursos.error.message || 'Não foi possível carregar recursos de acesso.');
  }

  if (perfis.error) {
    throw new Error(perfis.error.message || 'Não foi possível carregar perfis.');
  }

  if (permissoes.error) {
    throw new Error(permissoes.error.message || 'Não foi possível carregar permissões.');
  }

  return {
    recursos: recursos.data || [],
    perfis: perfis.data || [],
    permissoes: permissoes.data || []
  };
}

export async function salvarPermissaoPerfilAdmin({ perfil_id, recurso_chave, acao, permitido }) {
  const supabase = exigirSupabaseConfigurado();

  if (!perfil_id || !recurso_chave || !acao) {
    throw new Error('Informe perfil, recurso e ação.');
  }

  const payload = {
    perfil_id,
    recurso_chave,
    acao,
    permitido: Boolean(permitido),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('perfil_permissoes')
    .upsert(payload, { onConflict: 'perfil_id,recurso_chave,acao' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a permissão.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: 'perfil_permissao.alterar',
    p_recurso: 'admin.permissoes',
    p_alvo_usuario_id: null,
    p_detalhes: {
      perfil_id,
      recurso_chave,
      acao,
      permitido: Boolean(permitido)
    }
  });

  return { permission: data };
}

export async function salvarPermissoesPerfilAdminLote({ perfil_id, alteracoes }) {
  const supabase = exigirSupabaseConfigurado();

  if (!perfil_id) {
    throw new Error('Informe o perfil.');
  }

  if (!Array.isArray(alteracoes)) {
    throw new Error('Informe a lista de alterações.');
  }

  const alteracoesValidas = alteracoes
    .filter(item => item?.recurso_chave && item?.acao)
    .map(item => ({
      perfil_id,
      recurso_chave: String(item.recurso_chave),
      acao: String(item.acao),
      permitido: Boolean(item.permitido),
      updated_at: new Date().toISOString()
    }));

  if (!alteracoesValidas.length) {
    return { ok: true, total_alteracoes: 0 };
  }

  const { data, error } = await supabase
    .from('perfil_permissoes')
    .upsert(alteracoesValidas, { onConflict: 'perfil_id,recurso_chave,acao' })
    .select('*');

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar as permissões do perfil em lote.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: 'perfil_permissao.alterar_lote',
    p_recurso: 'admin.permissoes',
    p_alvo_usuario_id: null,
    p_detalhes: {
      perfil_id,
      total_alteracoes: alteracoesValidas.length,
      alteracoes: alteracoesValidas.map(item => ({
        recurso_chave: item.recurso_chave,
        acao: item.acao,
        permitido: item.permitido
      }))
    }
  });

  return {
    permissions: data || [],
    total_alteracoes: alteracoesValidas.length
  };
}

export async function salvarPermissaoUsuarioAdmin({ usuario_id, recurso_chave, acao, efeito }) {
  const supabase = exigirSupabaseConfigurado();
  const efeitoNormalizado = ['permitir', 'negar'].includes(efeito) ? efeito : '';

  if (!usuario_id || !recurso_chave || !acao) {
    throw new Error('Informe usuário, recurso e ação.');
  }

  if (!efeitoNormalizado) {
    const { error } = await supabase
      .from('usuario_permissoes')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('recurso_chave', recurso_chave)
      .eq('acao', acao);

    if (error) {
      throw new Error(error.message || 'Não foi possível remover a permissão individual.');
    }

    await supabase.rpc('app_registrar_auditoria', {
      p_acao: 'usuario_permissao.remover',
      p_recurso: 'admin.usuarios',
      p_alvo_usuario_id: usuario_id,
      p_detalhes: {
        recurso_chave,
        acao
      }
    });

    return { permission: null };
  }

  const payload = {
    usuario_id,
    recurso_chave,
    acao,
    efeito: efeitoNormalizado,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('usuario_permissoes')
    .upsert(payload, { onConflict: 'usuario_id,recurso_chave,acao' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar a permissão individual.');
  }

  await supabase.rpc('app_registrar_auditoria', {
    p_acao: 'usuario_permissao.alterar',
    p_recurso: 'admin.usuarios',
    p_alvo_usuario_id: usuario_id,
    p_detalhes: {
      recurso_chave,
      acao,
      efeito: efeitoNormalizado
    }
  });

  return { permission: data };
}

export async function salvarPermissoesUsuarioAdminLote({ usuario_id, alteracoes }) {
  const supabase = exigirSupabaseConfigurado();

  if (!usuario_id) {
    throw new Error('Informe o usuário.');
  }

  if (!Array.isArray(alteracoes)) {
    throw new Error('Informe a lista de alterações.');
  }

  const { data, error } = await supabase.rpc('app_salvar_permissoes_usuario_lote', {
    p_usuario_id: usuario_id,
    p_alteracoes: alteracoes
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar as permissões adicionais em lote.');
  }

  return data || { ok: true, total_alteracoes: alteracoes.length };
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


export async function salvarVisibilidadeModulosHomeAdmin({ modulos = [] }) {
  const supabase = exigirSupabaseConfigurado();
  const alteracoes = Array.isArray(modulos)
    ? modulos
      .filter(item => item?.id)
      .map(item => ({
        id: item.id,
        exibir_home: item.exibir_home !== false
      }))
    : [];

  if (!alteracoes.length) {
    throw new Error('Nenhum módulo informado para atualização.');
  }

  const ids = [...new Set(alteracoes.map(item => item.id))];
  const { data: registrosAtuais, error: erroConsulta } = await supabase
    .from('itens')
    .select('*')
    .in('id', ids);

  if (erroConsulta) {
    throw new Error(erroConsulta.message || 'Não foi possível localizar os módulos.');
  }

  const registrosPorId = new Map((registrosAtuais || []).map(item => [item.id, item]));

  for (const alteracao of alteracoes) {
    const atual = registrosPorId.get(alteracao.id);

    if (!atual) {
      throw new Error('Um dos módulos informados não foi encontrado.');
    }

    if (!isModuloItem(atual)) {
      throw new Error('Um dos registros informados não é um módulo.');
    }

    const dadosAtuais = getDadosItem(atual);
    const dadosAtualizados = {
      ...dadosAtuais,
      exibir_home: Boolean(alteracao.exibir_home)
    };

    const { error } = await supabase
      .from('itens')
      .update({ dados: dadosAtualizados })
      .eq('id', alteracao.id);

    if (error) {
      throw new Error(error.message || 'Não foi possível atualizar a visibilidade dos módulos.');
    }

    const { data: confirmado, error: erroConfirmacao } = await supabase
      .from('itens')
      .select('*')
      .eq('id', alteracao.id)
      .single();

    if (erroConfirmacao) {
      throw new Error(erroConfirmacao.message || 'Não foi possível confirmar a visibilidade do módulo.');
    }

    const moduloAtualizado = normalizarModuloAdmin(confirmado);

    if (moduloAtualizado.exibir_home !== Boolean(alteracao.exibir_home)) {
      throw new Error('O Supabase não confirmou a alteração da visibilidade do módulo.');
    }
  }

  return listarModulosAdmin();
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
