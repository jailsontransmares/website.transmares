import { exigirSupabaseConfigurado } from '../supabaseClient.js';

function normalizarStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function getDados(item) {
  return item?.dados && typeof item.dados === 'object' ? item.dados : {};
}

function normalizarConfig(registros) {
  return (registros || []).reduce((acc, item) => {
    if (item.chave) acc[item.chave] = item.valor ?? '';
    return acc;
  }, {});
}

async function carregarUsuarioAtual() {
  const supabase = exigirSupabaseConfigurado();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user?.email) {
    throw new Error('Sessão inválida. Entre novamente.');
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', authData.user.email)
    .single();

  if (error || !data) {
    throw new Error('Seu usuário não está cadastrado no painel.');
  }

  return data;
}

async function carregarApoio() {
  const supabase = exigirSupabaseConfigurado();
  const [categorias, grupos, configuracoes] = await Promise.all([
    supabase.from('categorias').select('*').order('nome', { ascending: true }),
    supabase.from('grupos').select('*').order('nome', { ascending: true }),
    supabase.from('configuracoes').select('*').eq('status', 'ativo')
  ]);

  if (categorias.error) throw new Error(categorias.error.message || 'Não foi possível carregar categorias.');
  if (grupos.error) throw new Error(grupos.error.message || 'Não foi possível carregar grupos.');
  if (configuracoes.error) throw new Error(configuracoes.error.message || 'Não foi possível carregar configurações.');

  return {
    categorias: categorias.data || [],
    grupos: grupos.data || [],
    config: normalizarConfig(configuracoes.data || [])
  };
}

function encontrarIdPorNome(lista, nome) {
  if (!nome) return null;
  const registro = lista.find(item => String(item.nome || '').toLowerCase() === String(nome).toLowerCase());
  return registro?.id || null;
}

function mapearLink(item, apoio, usuario) {
  const dados = getDados(item);
  const categoria = apoio.categorias.find(c => c.id === item.categoria_id);
  const grupo = apoio.grupos.find(g => g.id === item.grupo_id);
  const favoritos = Array.isArray(dados.favoritos) ? dados.favoritos : [];

  return {
    id: item.id,
    titulo: item.titulo || '',
    descricao: item.descricao || '',
    url: item.url || '',
    categoria: categoria?.nome || dados.categoria || '',
    grupo: grupo?.nome || dados.grupo || '',
    status: item.status || 'ativo',
    favorito: favoritos.includes(usuario.id)
  };
}

function filtrarLinks(links, filtros = {}) {
  return links.filter(item => {
    if (filtros.categoria && item.categoria !== filtros.categoria) return false;
    if (filtros.grupo && item.grupo !== filtros.grupo) return false;
    if (filtros.status && item.status !== filtros.status) return false;
    if (!filtros.status && normalizarStatus(item.status) === 'inativo') return false;
    return true;
  });
}

export async function carregarLinksData(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const [usuario, apoio] = await Promise.all([carregarUsuarioAtual(), carregarApoio()]);
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .order('titulo', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar links.');
  }

  const escopo = payload.escopo || 'corretora';
  const links = (data || [])
    .filter(item => {
      const dados = getDados(item);
      return normalizarStatus(dados.tipo) === 'link' && (dados.escopo || 'corretora') === escopo;
    })
    .map(item => mapearLink(item, apoio, usuario));

  return {
    categorias: apoio.categorias.filter(item => normalizarStatus(item.status) !== 'inativo'),
    grupos: apoio.grupos.filter(item => normalizarStatus(item.status) !== 'inativo'),
    links: filtrarLinks(links, payload),
    limite_favoritos: Number(apoio.config.limite_favoritos || 5)
  };
}

export async function salvarLinkItem(payload = {}) {
  const supabase = exigirSupabaseConfigurado();
  const apoio = await carregarApoio();
  const item = {
    titulo: String(payload.titulo || '').trim(),
    descricao: String(payload.descricao || '').trim() || null,
    url: String(payload.url || '').trim(),
    categoria_id: encontrarIdPorNome(apoio.categorias, payload.categoria),
    grupo_id: encontrarIdPorNome(apoio.grupos, payload.grupo),
    status: payload.status === 'inativo' ? 'inativo' : 'ativo',
    dados: {
      tipo: 'link',
      escopo: payload.escopo || 'corretora',
      categoria: payload.categoria || '',
      grupo: payload.grupo || ''
    }
  };

  if (!item.titulo || !item.url) {
    throw new Error('Informe título e URL do link.');
  }

  if (payload.id) {
    const { data: atual } = await supabase.from('itens').select('dados').eq('id', payload.id).single();
    const dadosAtuais = getDados(atual);
    item.dados.favoritos = Array.isArray(dadosAtuais.favoritos) ? dadosAtuais.favoritos : [];
  } else {
    item.dados.favoritos = [];
  }

  const query = payload.id
    ? supabase.from('itens').update(item).eq('id', payload.id).select('*').single()
    : supabase.from('itens').insert(item).select('*').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Não foi possível salvar o link.');
  }

  return { link: data };
}

export async function alternarFavoritoLink({ id, favorito }) {
  const supabase = exigirSupabaseConfigurado();
  const [usuario, apoio] = await Promise.all([carregarUsuarioAtual(), carregarApoio()]);
  const { data: item, error } = await supabase.from('itens').select('*').eq('id', id).single();

  if (error || !item) {
    throw new Error('Link não encontrado.');
  }

  const dados = getDados(item);
  const favoritos = Array.isArray(dados.favoritos) ? dados.favoritos : [];
  const jaFavorito = favoritos.includes(usuario.id);

  if (favorito && !jaFavorito) {
    const limite = Number(apoio.config.limite_favoritos || 5);
    const atuais = await carregarLinksData({ escopo: dados.escopo || 'corretora' });
    const totalFavoritos = atuais.links.filter(link => link.favorito).length;

    if (totalFavoritos >= limite) {
      throw new Error('Limite de favoritos atingido.');
    }
  }

  const novosFavoritos = favorito
    ? Array.from(new Set([...favoritos, usuario.id]))
    : favoritos.filter(itemFavorito => itemFavorito !== usuario.id);

  const { error: updateError } = await supabase
    .from('itens')
    .update({ dados: { ...dados, favoritos: novosFavoritos } })
    .eq('id', id);

  if (updateError) {
    throw new Error(updateError.message || 'Não foi possível alterar o favorito.');
  }

  return { favorito: Boolean(favorito) };
}
