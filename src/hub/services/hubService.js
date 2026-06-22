import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const DEFAULT_CONFIG = {
  nome_sistema: 'PAINEL TRANSMARES',
  subtitulo_sistema: 'Central operacional da Transmares Corretora de Seguros',
  cor_principal: '#294895',
  cor_secundaria: '#1F3676',
  cor_destaque: '#16A34A',
  modo_visual_padrao: 'claro',
  limite_favoritos: 5,
  limite_avisos: 3,
  janela_aniversarios_dias: 30,
  limite_aniversariantes: 25,
  retencao_historico_meses: 6
};

const DEFAULT_CARDS = [
  { id: 'links-corretora', titulo: 'Links Corretora' },
  { id: 'links-ar', titulo: 'Links AR' },
  { id: 'links-gestao', titulo: 'Links Gestão' },
  { id: 'central-senhas', titulo: 'Central de Senhas' },
  { id: 'painel-ar', titulo: 'Painel AR' },
  { id: 'administracao', titulo: 'Administração' }
];

function normalizarStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function ordenarPorCampo(lista, campo) {
  return [...lista].sort((a, b) => {
    const valorA = a?.[campo] ?? '';
    const valorB = b?.[campo] ?? '';
    return String(valorA).localeCompare(String(valorB), 'pt-BR');
  });
}

async function selecionarTabelaOpcional(nomeTabela, consulta) {
  const supabase = exigirSupabaseConfigurado();
  let query = supabase.from(nomeTabela).select('*');

  if (consulta) {
    query = consulta(query);
  }

  const { data, error } = await query;

  if (error) {
    const tabelaNaoExiste = error.code === 'PGRST205' || /Could not find the table/i.test(error.message || '');

    if (tabelaNaoExiste) {
      console.warn(`Tabela opcional não encontrada no Supabase: ${nomeTabela}`);
      return [];
    }

    console.warn(`Dados não carregados da tabela ${nomeTabela}:`, error);
    return [];
  }

  return data || [];
}

function normalizarConfiguracoes(registros) {
  if (!Array.isArray(registros) || !registros.length) {
    return { ...DEFAULT_CONFIG };
  }

  const config = { ...DEFAULT_CONFIG };

  registros.forEach(item => {
    const chave = item.chave || item.key || item.nome;

    if (!chave) return;

    config[chave] = item.valor ?? item.value ?? item.conteudo ?? '';
  });

  return config;
}

function normalizarPerfil(usuarioEncontrado, perfis) {
  const perfil = perfis.find(item => item.id === usuarioEncontrado.perfil_id) || {};
  const nomePerfil = String(perfil.nome || usuarioEncontrado.perfil || usuarioEncontrado.role || 'usuario').toLowerCase();
  const nivelPerfil = Number(perfil.nivel || usuarioEncontrado.perfil_nivel || 0);

  if (nomePerfil === 'admin' || nomePerfil === 'gestor' || nivelPerfil >= 100) {
    return 'gestor';
  }

  return nomePerfil || 'usuario';
}

function normalizarUsuario(registros, authUser, perfis = [], grupos = []) {
  const emailAuth = authUser?.email || '';

  if (!authUser || !emailAuth) {
    throw new Error('Sessão inválida. Entre novamente.');
  }

  const usuarioEncontrado = registros.find(item => {
    const email = item.email || item.e_mail || item.login || '';
    return emailAuth && String(email).toLowerCase() === emailAuth.toLowerCase();
  });

  if (!usuarioEncontrado) {
    throw new Error('Seu usuário não está cadastrado no painel.');
  }

  if (normalizarStatus(usuarioEncontrado.status || 'ativo') !== 'ativo') {
    throw new Error('Seu usuário está inativo.');
  }

  const grupo = grupos.find(item => item.id === usuarioEncontrado.grupo_id) || {};

  return {
    id: usuarioEncontrado.id || authUser.id,
    nome: usuarioEncontrado.nome || usuarioEncontrado.nome_completo || authUser.user_metadata?.name || emailAuth,
    email: usuarioEncontrado.email || emailAuth,
    perfil: normalizarPerfil(usuarioEncontrado, perfis),
    perfil_nome: perfis.find(item => item.id === usuarioEncontrado.perfil_id)?.nome || '',
    grupo: grupo.nome || '',
    status: usuarioEncontrado.status || 'ativo',
    preferencia_modo_visual: usuarioEncontrado.preferencia_modo_visual || usuarioEncontrado.modo_visual || ''
  };
}

function normalizarCards(registros, usuario) {
  const ativos = registros.filter(item => normalizarStatus(item.status || 'ativo') !== 'inativo');
  const cards = ativos
    .map(item => ({
      id: item.id_modulo || item.modulo_id || item.slug || item.id,
      titulo: item.titulo || item.nome || item.label
    }))
    .filter(item => item.id && item.titulo);

  const lista = cards.length ? cards : DEFAULT_CARDS;

  if (usuario?.perfil === 'gestor') {
    return lista;
  }

  return lista.filter(card => card.id !== 'administracao');
}

function normalizarAvisos(registros, limite) {
  return ordenarPorCampo(registros, 'titulo')
    .filter(item => normalizarStatus(item.status || 'ativo') !== 'inativo')
    .slice(0, Number(limite) || DEFAULT_CONFIG.limite_avisos)
    .map(item => ({
      id: item.id,
      titulo: item.titulo || item.nome || 'Aviso',
      mensagem: item.mensagem || item.descricao || item.texto || ''
    }));
}

function calcularDiasAteAniversario(dataNascimento) {
  if (!dataNascimento) return null;

  const data = new Date(`${dataNascimento}T00:00:00`);

  if (Number.isNaN(data.getTime())) return null;

  const hoje = new Date();
  const aniversario = new Date(hoje.getFullYear(), data.getMonth(), data.getDate());
  aniversario.setHours(0, 0, 0, 0);

  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (aniversario < hojeInicio) {
    aniversario.setFullYear(hoje.getFullYear() + 1);
  }

  return Math.round((aniversario - hojeInicio) / 86400000);
}

function normalizarAniversariantes(registros, limite) {
  const limiteNumerico = Number(limite) || DEFAULT_CONFIG.limite_aniversariantes;

  return registros
    .filter(item => normalizarStatus(item.status || 'ativo') !== 'inativo')
    .map(item => ({
      id: item.id,
      nome: item.nome || '',
      data: item.data_nascimento || '',
      dias_ate: calcularDiasAteAniversario(item.data_nascimento)
    }))
    .filter(item => item.nome && item.dias_ate !== null && item.dias_ate <= limiteNumerico)
    .sort((a, b) => a.dias_ate - b.dias_ate)
    .slice(0, limiteNumerico);
}

function normalizarFavoritos(registros, limite) {
  return registros
    .filter(item => normalizarStatus(item.status || 'ativo') !== 'inativo')
    .slice(0, Number(limite) || DEFAULT_CONFIG.limite_favoritos)
    .map(item => ({
      id: item.id,
      titulo: item.titulo || item.nome || 'Link',
      url: item.url || item.link || ''
    }))
    .filter(item => item.url);
}

function obterTipoItem(item) {
  const dados = item.dados && typeof item.dados === 'object' ? item.dados : {};
  return normalizarStatus(item.tipo || item.categoria_tipo || dados.tipo);
}

export async function carregarDadosIniciaisSupabase() {
  const supabase = exigirSupabaseConfigurado();
  const { data: authData } = await supabase.auth.getUser();

  const [usuarios, perfis, grupos, configuracoes, itens, avisosInternos, aniversarios] = await Promise.all([
    selecionarTabelaOpcional('usuarios'),
    selecionarTabelaOpcional('perfis'),
    selecionarTabelaOpcional('grupos'),
    selecionarTabelaOpcional('configuracoes'),
    selecionarTabelaOpcional('itens'),
    selecionarTabelaOpcional('avisos_internos'),
    selecionarTabelaOpcional('aniversarios')
  ]);

  const config = normalizarConfiguracoes(configuracoes);
  const usuario = normalizarUsuario(usuarios, authData?.user, perfis, grupos);
  const moduloItens = itens.filter(item => ['modulo', 'card'].includes(obterTipoItem(item)));
  const linkItens = itens.filter(item => {
    const dados = item.dados && typeof item.dados === 'object' ? item.dados : {};
    const favoritos = Array.isArray(dados.favoritos) ? dados.favoritos : [];
    return ['link', 'links'].includes(obterTipoItem(item)) && favoritos.includes(usuario.id);
  });

  return {
    usuario,
    config,
    cards: normalizarCards(moduloItens, usuario),
    avisos: normalizarAvisos(avisosInternos, config.limite_avisos),
    aniversariantes: normalizarAniversariantes(aniversarios, config.limite_aniversariantes),
    favoritos: normalizarFavoritos(linkItens, config.limite_favoritos),
    meta: {
      modo_visual_efetivo: usuario.preferencia_modo_visual || config.modo_visual_padrao || 'claro',
      fonte_dados: 'supabase'
    }
  };
}
