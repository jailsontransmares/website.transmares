import { supabase } from '../supabaseClient.js';

function normalizarStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function parseNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function formatarValor(valor) {
  const numero = parseNumero(valor);
  return numero === null ? '' : numero.toFixed(2);
}

function montarLinkProduto({ produto, parceiro, grupo }) {
  const urlBase = produto.url_base || 'https://pagamento.certisign.com.br/productRedirect';
  const params = new URLSearchParams();

  if (produto.product_id) params.set('produto', produto.product_id);
  if (grupo) params.set('grupo', grupo);
  if (parceiro.codigo_revendedor) params.set('cod_rev', parceiro.codigo_revendedor);

  return `${urlBase}?${params.toString()}`;
}

export async function carregarProdutosAR() {
  const { data, error } = await supabase
    .from('produtos_ar')
    .select('*')
    .eq('status', 'ativo')
    .order('descricao_comercial', { ascending: true });

  if (error) {
    console.error('Erro ao carregar produtos AR:', error);
    return [];
  }

  return data || [];
}

export async function carregarParceirosAtivos() {
  const { data, error } = await supabase
    .from('parceiros')
    .select('*')
    .eq('status', 'ativo')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar parceiros:', error);
    return [];
  }

  return data || [];
}

export async function carregarHistoricoLinksAR() {
  const { data, error } = await supabase
    .from('historico_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('Histórico de links não carregado:', error);
    return [];
  }

  return data || [];
}

export async function carregarDadosAR() {
  const [produtos, parceiros, historico] = await Promise.all([
    carregarProdutosAR(),
    carregarParceirosAtivos(),
    carregarHistoricoLinksAR()
  ]);

  return { produtos, parceiros, historico };
}

export async function gerarLinksAR({ produto_id, parceiro_id }) {
  const [{ data: produto, error: erroProduto }, { data: parceiro, error: erroParceiro }] = await Promise.all([
    supabase.from('produtos_ar').select('*').eq('id', produto_id).single(),
    supabase.from('parceiros').select('*').eq('id', parceiro_id).single()
  ]);

  if (erroProduto || !produto) {
    throw new Error('Produto AR não encontrado no Supabase.');
  }

  if (erroParceiro || !parceiro) {
    throw new Error('Parceiro não encontrado no Supabase.');
  }

  if (normalizarStatus(parceiro.status) !== 'ativo') {
    throw new Error('Este parceiro não está ativo para geração de links.');
  }

  const grupoComDesconto = produto.grupo_com_desconto || produto.codigo_grupo || produto.grupo;
  const grupoSemDesconto = produto.grupo_sem_desconto || produto.grupo || grupoComDesconto;
  const linkComDesconto = montarLinkProduto({ produto, parceiro, grupo: grupoComDesconto });
  const linkSemDesconto = montarLinkProduto({ produto, parceiro, grupo: grupoSemDesconto });

  const precoCom = parseNumero(produto.preco_com_desconto);
  const precoSem = parseNumero(produto.preco_sem_desconto);
  const economia = precoCom !== null && precoSem !== null ? Math.max(precoSem - precoCom, 0) : null;

  const resultado = {
    produto_id: produto.id,
    parceiro_id: parceiro.id,
    product_id: produto.product_id,
    descricao_produto: produto.descricao_comercial,
    parceiro: parceiro.nome_completo || parceiro.nome,
    codigo_revendedor: parceiro.codigo_revendedor,
    link_com_desconto: linkComDesconto,
    link_sem_desconto: linkSemDesconto,
    preco_com_desconto: formatarValor(produto.preco_com_desconto),
    preco_sem_desconto: formatarValor(produto.preco_sem_desconto),
    economia: economia === null ? '' : economia.toFixed(2),
    alertas: []
  };

  const { error: erroHistorico } = await supabase.from('historico_links').insert({
    parceiro_id: parceiro.id,
    produto: produto.product_id || produto.descricao_comercial,
    midia: produto.midia || null,
    modelo: produto.modelo || null,
    validade: produto.validade || null,
    url_gerada: linkComDesconto,
    dados: resultado
  });

  if (erroHistorico) {
    console.warn('Link gerado, mas histórico não foi salvo:', erroHistorico);
  }

  return resultado;
}
