const STATUS_LABELS = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  arquivado: 'Arquivado',
  pendente: 'Pendente',
  pending: 'Pendente',
  bloqueado: 'Bloqueado',
  synced: 'Sincronizado',
  sincronizado: 'Sincronizado',
  error: 'Erro',
  erro: 'Erro',
  conflict: 'Conflito',
  conflito: 'Conflito',
  processing: 'Processando',
  processed: 'Processado',
  running: 'Em execução',
  success: 'Concluído',
  partial: 'Parcial',
  aberto: 'Aberto',
  aberta: 'Aberta',
  fechado: 'Fechado',
  fechada: 'Fechada',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
  cancelada: 'Cancelada',
  concluido: 'Concluído',
  concluida: 'Concluída',
  validado: 'Validado',
  validada: 'Validada',
  divergente: 'Divergente',
  divergencia: 'Divergência',
  enviado: 'Enviado',
  rascunho: 'Rascunho',
  preparado: 'Preparado',
  em_preparacao: 'Em preparação',
  em_analise: 'Em análise',
  operacao_paralela: 'Operação paralela',
  ativacao_gradual: 'Ativação gradual',
  aguardando_retorno: 'Aguardando retorno',
  confirmado: 'Confirmado',
  confirmada: 'Confirmada',
  dispensado: 'Dispensado',
  liquidado: 'Liquidado',
  liquidada: 'Liquidada',
  conciliado: 'Conciliado',
  conciliada: 'Conciliada',
  desconciliada: 'Desconciliada',
  faturada: 'Faturada',
  paga: 'Paga',
  exportado: 'Exportado',
  importado: 'Importado',
  sugerido: 'Sugerido',
  aceita: 'Aceita',
  rejeitada: 'Rejeitada',
  corrigida: 'Corrigida',
  reaberto: 'Reaberto',
  ativa: 'Ativa',
  inativa: 'Inativa'
};

function normalizarStatusHub(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function obterRotuloStatusHub(valor, fallback = '—') {
  const texto = String(valor ?? '').trim();
  if (!texto) return fallback;
  const chave = normalizarStatusHub(texto);
  if (STATUS_LABELS[chave]) return STATUS_LABELS[chave];
  return texto
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\p{L}/u, (letra) => letra.toUpperCase());
}
