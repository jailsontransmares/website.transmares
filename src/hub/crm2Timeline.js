// CRM 2.0 — Timeline unificada da Pessoa Física / Fase 8.
// Agrega eventos mockados de PF, PJ, vínculos e pedidos sem persistência externa.
import { obterContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

const crm2TimelineState = {
  pfId: '',
  search: '',
  typeFilter: '',
  sourceFilter: '',
  userFilter: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  perPage: 8,
  listState: 'normal'
};

function escapeTimeline(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeTimelineAttr(value = '') {
  return escapeTimeline(value).replaceAll('`', '&#096;');
}

function normalizeTimeline(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsTimeline(value = '') {
  return String(value ?? '').replace(/\D/g, '');
}

function formatTimelineDate(value = '') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function canEditTimeline() {
  const permissions = obterContextoAcessoHub()?.permissions || {};
  return hasPermission(permissions, 'painel_ar', 'update') || hasPermission(permissions, 'painel_ar', 'create');
}

function resetTimelineFilters() {
  Object.assign(crm2TimelineState, {
    search: '', typeFilter: '', sourceFilter: '', userFilter: '', dateFrom: '', dateTo: '', page: 1, listState: 'normal'
  });
}

function parseTimelineChanges(text = '') {
  return String(text).split(' · ').flatMap((part) => {
    const match = part.match(/^([^:]+):\s*(.*?)\s+→\s*(.*)$/);
    return match ? [{ campo: match[1].trim(), de: match[2].trim(), para: match[3].trim() }] : [];
  });
}

function makeTimelineEvent({ id, tipo = 'Evento', entidade = 'PF', entidadeId = '', data, usuario = 'Sistema', origem = entidade, descricao = '', alteracoes = '', referencia = {} }) {
  return {
    id,
    tipo,
    entidade,
    entidadeId,
    data: data || new Date().toISOString(),
    usuario,
    origem,
    descricao,
    alteracoes,
    changes: parseTimelineChanges(alteracoes),
    referencia
  };
}

function getPjRecordsTimeline() {
  return typeof window.crm2PjGetMockItems === 'function' ? window.crm2PjGetMockItems() : [];
}

function getVinculoRecordsTimeline() {
  return typeof window.crm2VinculosGetMockItems === 'function' ? window.crm2VinculosGetMockItems() : [];
}

function getPedidoRecordsTimeline() {
  return typeof window.crm2PedidosGetMockItems === 'function' ? window.crm2PedidosGetMockItems() : [];
}

function relatedPjTimeline(item, pjs) {
  const cnpj = digitsTimeline(item?.pjCnpj);
  return pjs.find((pj) => (cnpj && digitsTimeline(pj.cnpj) === cnpj) || normalizeTimeline(pj.razaoSocial) === normalizeTimeline(item?.pjRazaoSocial)) || null;
}

function buildPfEvents(person) {
  return (Array.isArray(person?.timeline) ? person.timeline : []).map((event, index) => makeTimelineEvent({
    id: `pf:${person.id}:${event.id || index}`,
    tipo: event.tipo || 'Atualização',
    entidade: 'PF',
    entidadeId: person.id,
    data: event.data,
    usuario: event.usuario || 'Sistema',
    origem: 'Pessoa Física',
    descricao: String(event.descricao || 'Evento cadastral registrado.').replace(/^Observação interna adicionada:\s*/i, ''),
    alteracoes: event.alteracoes || '',
    referencia: { pfId: person.id }
  }));
}

function buildPjEvents(person, pjs) {
  const personCpf = digitsTimeline(person?.cpf);
  const related = pjs.filter((pj) => (Array.isArray(pj.pessoasVinculadas) ? pj.pessoasVinculadas : []).some((linked) => digitsTimeline(linked.cpf) === personCpf));
  return related.flatMap((pj) => [
    makeTimelineEvent({
      id: `pj:${pj.id}:related`,
      tipo: 'Empresa',
      entidade: 'PJ',
      entidadeId: pj.id,
      data: pj.cadastroEm,
      usuario: 'Sistema',
      origem: 'Pessoa Jurídica',
      descricao: `Pessoa Jurídica relacionada: ${pj.razaoSocial}.`,
      alteracoes: `Vínculo visual: — → ${pj.razaoSocial}`,
      referencia: { pfId: person.id, pjId: pj.id, label: pj.razaoSocial }
    }),
    makeTimelineEvent({
      id: `pj:${pj.id}:updated`,
      tipo: 'Empresa',
      entidade: 'PJ',
      entidadeId: pj.id,
      data: pj.atualizadoEm,
      usuario: 'Sistema',
      origem: 'Pessoa Jurídica',
      descricao: `Dados da empresa ${pj.razaoSocial} disponíveis para consulta.`,
      alteracoes: `Status: — → ${pj.status || 'Não informado'}`,
      referencia: { pfId: person.id, pjId: pj.id, label: pj.razaoSocial }
    })
  ]);
}

function buildVinculoEvents(person, vinculos, pjs) {
  const personCpf = digitsTimeline(person?.cpf);
  return vinculos.filter((vinculo) => digitsTimeline(vinculo.pfCpf) === personCpf).flatMap((vinculo) => {
    const relatedPj = relatedPjTimeline(vinculo, pjs);
    const events = [makeTimelineEvent({
      id: `vinculo:${vinculo.id}:created`,
      tipo: 'Vínculo',
      entidade: 'Vínculo',
      entidadeId: vinculo.id,
      data: vinculo.inicioEm,
      usuario: vinculo.atualizadoPor || 'Sistema',
      origem: 'Vínculos PF/PJ',
      descricao: `Vínculo ${vinculo.tipo} com ${vinculo.pjRazaoSocial}.`,
      alteracoes: `Situação: — → ${vinculo.status}`,
      referencia: { pfId: person.id, vinculoId: vinculo.id, pjId: relatedPj?.id || '', label: vinculo.pjRazaoSocial }
    })];
    if (vinculo.status === 'Inativo' || vinculo.encerramentoEm) events.push(makeTimelineEvent({
      id: `vinculo:${vinculo.id}:closed`,
      tipo: 'Vínculo',
      entidade: 'Vínculo',
      entidadeId: vinculo.id,
      data: vinculo.encerramentoEm || vinculo.atualizadoEm,
      usuario: vinculo.atualizadoPor || 'Sistema',
      origem: 'Vínculos PF/PJ',
      descricao: `Vínculo com ${vinculo.pjRazaoSocial} inativado.`,
      alteracoes: `Situação: Ativo → Inativo${vinculo.motivoInativacao ? ` · Motivo: ${vinculo.motivoInativacao}` : ''}`,
      referencia: { pfId: person.id, vinculoId: vinculo.id, pjId: relatedPj?.id || '', label: vinculo.pjRazaoSocial }
    }));
    return events;
  });
}

function buildPedidoEvents(person, pedidos, pjs) {
  const personCpf = digitsTimeline(person?.cpf);
  const related = pedidos.filter((pedido) => digitsTimeline(pedido.pfCpf) === personCpf || normalizeTimeline(pedido.pfNome) === normalizeTimeline(person.nome));
  return related.flatMap((pedido) => {
    const pj = relatedPjTimeline(pedido, pjs);
    const reference = { pfId: person.id, pedidoId: pedido.id, pjId: pj?.id || '', label: pedido.numero };
    const history = Array.isArray(pedido.historico) && pedido.historico.length ? pedido.historico : [
      { data: pedido.dataSolicitacao, usuario: pedido.responsavel, tipo: 'Pedido', descricao: `Pedido ${pedido.numero} criado.`, alteracoes: `Status: — → ${pedido.status}` },
      { data: pedido.atualizadoEm, usuario: pedido.responsavel, tipo: 'Financeiro', descricao: `Situação financeira do pedido ${pedido.numero}: ${pedido.financeiro}.`, alteracoes: `Financeiro: — → ${pedido.financeiro}` }
    ];
    return history.map((event, index) => makeTimelineEvent({
      id: `pedido:${pedido.id}:${event.id || index}`,
      tipo: event.tipo || 'Pedido',
      entidade: 'Pedido',
      entidadeId: pedido.id,
      data: event.data || pedido.atualizadoEm,
      usuario: event.usuario || pedido.responsavel || 'Sistema',
      origem: 'Pedidos',
      descricao: `${event.descricao || `Movimentação do pedido ${pedido.numero}.`}`,
      alteracoes: event.alteracoes || '',
      referencia: { ...reference, label: `${pedido.numero} · ${pedido.produto}` }
    }));
  });
}

function buildTimelineEvents(person) {
  const pjs = getPjRecordsTimeline();
  return [...buildPfEvents(person), ...buildPjEvents(person, pjs), ...buildVinculoEvents(person, getVinculoRecordsTimeline(), pjs), ...buildPedidoEvents(person, getPedidoRecordsTimeline(), pjs)]
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

function filteredTimelineEvents(events) {
  const search = normalizeTimeline(crm2TimelineState.search);
  return events.filter((event) => {
    const searchable = [event.tipo, event.entidade, event.origem, event.usuario, event.descricao, event.alteracoes, event.referencia?.label].map(normalizeTimeline);
    return (!search || searchable.some((value) => value.includes(search)))
      && (!crm2TimelineState.typeFilter || event.tipo === crm2TimelineState.typeFilter)
      && (!crm2TimelineState.sourceFilter || event.origem === crm2TimelineState.sourceFilter)
      && (!crm2TimelineState.userFilter || event.usuario === crm2TimelineState.userFilter)
      && (!crm2TimelineState.dateFrom || String(event.data || '').slice(0, 10) >= crm2TimelineState.dateFrom)
      && (!crm2TimelineState.dateTo || String(event.data || '').slice(0, 10) <= crm2TimelineState.dateTo);
  });
}

function renderTimelineState(state, totalEvents) {
  const copy = {
    loading: ['Carregando timeline...', 'Estado de carregamento simulado para homologação.'],
    error: ['Não foi possível carregar a timeline.', 'Erro simulado. Nenhuma integração externa foi acionada.'],
    empty: ['Nenhum evento registrado.', 'A Pessoa Física ainda não possui eventos na timeline unificada.']
  }[state];
  if (!copy) return totalEvents ? '' : `<div class="crm2-pessoas-state crm2-timeline-state" role="status"><strong>Nenhum evento encontrado.</strong><span>Ajuste os filtros para consultar outros registros.</span><button class="secondary-btn" type="button" onclick="crm2TimelineClearFilters()">Limpar filtros</button></div>`;
  return `<div class="crm2-pessoas-state crm2-timeline-state ${state === 'error' ? 'is-error' : ''}" role="${state === 'error' ? 'alert' : 'status'}" ${state === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2TimelineSetState('normal')">Voltar à timeline</button></div>`;
}

function renderTimelineChanges(event) {
  if (!event.changes.length) return event.alteracoes ? `<small class="crm2-timeline-changes">${escapeTimeline(event.alteracoes)}</small>` : '';
  return `<div class="crm2-timeline-changes">${event.changes.map((change) => `<span><strong>${escapeTimeline(change.campo)}</strong><small>De: ${escapeTimeline(change.de)} · Para: ${escapeTimeline(change.para)}</small></span>`).join('')}</div>`;
}

function renderTimelineRelatedLink(event) {
  const reference = event.referencia || {};
  if (event.entidade === 'Pedido' && reference.pedidoId) return `<button class="crm2-timeline-related-link" type="button" onclick="crm2TimelineOpenPedido('${escapeTimelineAttr(reference.pedidoId)}')">Abrir pedido ${escapeTimeline(reference.label || '')}</button>`;
  if (event.entidade === 'PJ' && reference.pjId) return `<button class="crm2-timeline-related-link" type="button" onclick="crm2TimelineOpenPj('${escapeTimelineAttr(reference.pjId)}')">Abrir empresa ${escapeTimeline(reference.label || '')}</button>`;
  if (event.entidade === 'Vínculo' && reference.vinculoId) return `<button class="crm2-timeline-related-link" type="button" onclick="crm2TimelineOpenVinculo('${escapeTimelineAttr(reference.vinculoId)}')">Abrir vínculo ${escapeTimeline(reference.label || '')}</button>`;
  return '';
}

function renderTimelineEvent(event) {
  const eventClass = normalizeTimeline(event.tipo).replace(/\s+/g, '-');
  return `<article class="crm2-unified-timeline-item"><span class="crm2-unified-timeline-marker is-${escapeTimelineAttr(eventClass)}" aria-hidden="true"></span><div class="crm2-unified-timeline-content"><header><div><span class="crm2-unified-timeline-type is-${escapeTimelineAttr(eventClass)}">${escapeTimeline(event.tipo)}</span><span class="crm2-unified-timeline-source">${escapeTimeline(event.origem)}</span></div><time datetime="${escapeTimelineAttr(event.data)}">${escapeTimeline(formatTimelineDate(event.data))}</time></header><strong>${escapeTimeline(event.descricao)}</strong><p>Por ${escapeTimeline(event.usuario)}</p>${renderTimelineChanges(event)}${renderTimelineRelatedLink(event)}</div></article>`;
}

function renderTimelineFilters(events) {
  const types = [...new Set(events.map((event) => event.tipo))];
  const sources = [...new Set(events.map((event) => event.origem))];
  const users = [...new Set(events.map((event) => event.usuario))];
  const active = Boolean(crm2TimelineState.search || crm2TimelineState.typeFilter || crm2TimelineState.sourceFilter || crm2TimelineState.userFilter || crm2TimelineState.dateFrom || crm2TimelineState.dateTo);
  return `<form class="crm2-timeline-filters" role="search" onsubmit="crm2TimelineApplyFilters(event)" aria-label="Filtrar timeline unificada"><label><span>Buscar</span><input class="config-input" name="search" type="search" value="${escapeTimelineAttr(crm2TimelineState.search)}" placeholder="Evento, usuário, pedido ou empresa"></label><label><span>Tipo</span><select class="config-input" name="type"><option value="">Todos os tipos</option>${types.map((type) => `<option value="${escapeTimelineAttr(type)}" ${crm2TimelineState.typeFilter === type ? 'selected' : ''}>${escapeTimeline(type)}</option>`).join('')}</select></label><label><span>Origem</span><select class="config-input" name="source"><option value="">Todas as origens</option>${sources.map((source) => `<option value="${escapeTimelineAttr(source)}" ${crm2TimelineState.sourceFilter === source ? 'selected' : ''}>${escapeTimeline(source)}</option>`).join('')}</select></label><label><span>Usuário</span><select class="config-input" name="user"><option value="">Todos os usuários</option>${users.map((user) => `<option value="${escapeTimelineAttr(user)}" ${crm2TimelineState.userFilter === user ? 'selected' : ''}>${escapeTimeline(user)}</option>`).join('')}</select></label><label><span>Desde</span><input class="config-input" name="dateFrom" type="date" value="${escapeTimelineAttr(crm2TimelineState.dateFrom)}"></label><label><span>Até</span><input class="config-input" name="dateTo" type="date" value="${escapeTimelineAttr(crm2TimelineState.dateTo)}"></label><div class="crm2-timeline-filter-actions"><button class="save-btn" type="submit">Aplicar filtros</button><button class="secondary-btn" type="button" onclick="crm2TimelineClearFilters()" ${active ? '' : 'disabled'}>Limpar filtros</button></div></form>`;
}

function renderTimeline(person) {
  if (!person) return '';
  if (crm2TimelineState.pfId !== person.id) {
    crm2TimelineState.pfId = person.id;
    resetTimelineFilters();
  }
  const events = buildTimelineEvents(person);
  const filtered = filteredTimelineEvents(events);
  const totalPages = Math.max(1, Math.ceil(filtered.length / crm2TimelineState.perPage));
  crm2TimelineState.page = Math.min(Math.max(1, crm2TimelineState.page), totalPages);
  const pageItems = filtered.slice((crm2TimelineState.page - 1) * crm2TimelineState.perPage, crm2TimelineState.page * crm2TimelineState.perPage);
  const visibleContent = crm2TimelineState.listState !== 'normal'
    ? renderTimelineState(crm2TimelineState.listState, events.length)
    : pageItems.length
      ? `<div class="crm2-unified-timeline-list" aria-live="polite">${pageItems.map(renderTimelineEvent).join('')}</div><div class="crm2-unified-timeline-pagination" aria-label="Paginação da timeline"><span>Página <strong>${crm2TimelineState.page}</strong> de <strong>${totalPages}</strong> · ${filtered.length} evento(s)</span><div><button class="secondary-btn" type="button" onclick="crm2TimelineSetPage(${crm2TimelineState.page - 1})" ${crm2TimelineState.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="secondary-btn" type="button" onclick="crm2TimelineSetPage(${crm2TimelineState.page + 1})" ${crm2TimelineState.page >= totalPages ? 'disabled' : ''}>Próxima</button></div></div>`
      : events.length ? renderTimelineState('normal', 0) : renderTimelineState('empty', 0);
  return `${renderTimelineFilters(events)}<div class="crm2-unified-timeline-summary" aria-live="polite"><strong>${filtered.length}</strong><span>evento(s) encontrados</span><small>PF, PJ, vínculos e pedidos</small></div>${visibleContent}${canEditTimeline() ? `<form class="crm2-unified-timeline-composer" onsubmit="crm2PfAddNote(event, '${escapeTimelineAttr(person.id)}')"><label><span>Adicionar observação interna</span><textarea class="config-input" name="observacao" rows="3" placeholder="Registre uma interação mockada" required></textarea></label><button class="secondary-btn" type="submit">Adicionar à timeline</button></form>` : ''}`;
}

Object.assign(window, {
  crm2TimelineRender: renderTimeline,
  crm2TimelineApplyFilters(event) {
    event?.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    Object.assign(crm2TimelineState, { search: String(values.search || '').trim(), typeFilter: String(values.type || ''), sourceFilter: String(values.source || ''), userFilter: String(values.user || ''), dateFrom: String(values.dateFrom || ''), dateTo: String(values.dateTo || ''), page: 1 });
    window.crm2PfRerender?.();
  },
  crm2TimelineClearFilters() {
    resetTimelineFilters();
    window.crm2PfRerender?.();
  },
  crm2TimelineSetPage(page) {
    crm2TimelineState.page = Math.max(1, Number(page) || 1);
    window.crm2PfRerender?.();
  },
  crm2TimelineSetState(value) {
    crm2TimelineState.listState = ['normal', 'loading', 'error', 'empty'].includes(value) ? value : 'normal';
    window.crm2PfRerender?.();
  },
  crm2TimelineOpenPj(id) {
    if (id && typeof window.crm2PjOpenDetail === 'function') window.crm2PjOpenDetail(id);
    else window.navegarParaCrm2PjRota?.();
  },
  crm2TimelineOpenVinculo(id) {
    if (id && typeof window.crm2VinculosOpenDetail === 'function') window.crm2VinculosOpenDetail(id);
    else window.navegarParaCrm2VinculosRota?.();
  },
  crm2TimelineOpenPedido(id) {
    if (id && typeof window.crm2PedidosOpenDetail === 'function') window.crm2PedidosOpenDetail(id);
    else window.navegarParaCrm2PedidosRota?.();
  }
});
