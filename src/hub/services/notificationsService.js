import { exigirSupabaseConfigurado } from '../supabaseClient.js';

const TABELA = 'hub_notificacoes';
const COLUNAS = [
  'id',
  'tipo',
  'titulo',
  'descricao',
  'modulo',
  'registro_tipo',
  'registro_id',
  'rota',
  'lida_em',
  'arquivada_em',
  'metadados',
  'created_at'
].join(', ');

const FILTROS_TIPO = {
  mencoes: 'mencao',
  prazos: 'prazo',
  erros: 'erro'
};

function aplicarFiltro(query, filtro) {
  const tipo = FILTROS_TIPO[filtro];

  if (filtro === 'arquivadas') query = query.not('arquivada_em', 'is', null);
  if (filtro === 'nao-lidas') query = query.is('lida_em', null);
  if (tipo) query = query.eq('tipo', tipo);

  return query;
}

async function executar(query, mensagem) {
  const { data, error } = await query;

  if (error) throw new Error(error.message || mensagem);

  return data;
}

export async function listarNotificacoes({ filtro = 'todas', limite = 20, pagina = 1 } = {}) {
  const supabase = exigirSupabaseConfigurado();
  const inicio = Math.max(0, (pagina - 1) * limite);
  const fim = inicio + limite - 1;
  let query = supabase
    .from(TABELA)
    .select(COLUNAS)
    .order('created_at', { ascending: false })
    .range(inicio, fim);

  if (filtro !== 'arquivadas') query = query.is('arquivada_em', null);

  query = aplicarFiltro(query, filtro);

  return executar(query, 'Não foi possível carregar as notificações.');
}

export async function contarNotificacoesNaoLidas() {
  const supabase = exigirSupabaseConfigurado();
  const { count, error } = await supabase
    .from(TABELA)
    .select('id', { count: 'exact', head: true })
    .is('lida_em', null)
    .is('arquivada_em', null);

  if (error) throw new Error(error.message || 'Não foi possível contar as notificações.');

  return count || 0;
}

async function atualizarNotificacao(id, payload, mensagem) {
  const supabase = exigirSupabaseConfigurado();
  const data = await executar(
    supabase.from(TABELA).update(payload).eq('id', id).select('id').single(),
    mensagem
  );

  return data;
}

export function marcarNotificacaoComoLida(id) {
  return atualizarNotificacao(id, { lida_em: new Date().toISOString() }, 'Não foi possível marcar a notificação como lida.');
}

export function marcarNotificacaoComoNaoLida(id) {
  return atualizarNotificacao(id, { lida_em: null }, 'Não foi possível marcar a notificação como não lida.');
}

export async function marcarTodasComoLidas() {
  const supabase = exigirSupabaseConfigurado();
  const data = await executar(
    supabase
      .from(TABELA)
      .update({ lida_em: new Date().toISOString() })
      .is('lida_em', null)
      .is('arquivada_em', null)
      .select('id'),
    'Não foi possível marcar todas as notificações como lidas.'
  );

  return data || [];
}

export function arquivarNotificacao(id) {
  return atualizarNotificacao(id, { arquivada_em: new Date().toISOString() }, 'Não foi possível arquivar a notificação.');
}

export function desarquivarNotificacao(id) {
  return atualizarNotificacao(id, { arquivada_em: null }, 'Não foi possível restaurar a notificação.');
}

export async function excluirNotificacao(id) {
  const supabase = exigirSupabaseConfigurado();
  await executar(
    supabase.from(TABELA).delete().eq('id', id),
    'Não foi possível excluir a notificação.'
  );
}
