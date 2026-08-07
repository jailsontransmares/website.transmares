// CRM 2.0 — Timeline unificada da Pessoa Física / Fase 8.
// Agrega eventos mockados de PF, PJ, vínculos e pedidos sem persistência externa.
import { obterContextoAcessoHub } from './services/hubAccessContext.js';
import { hasPermission } from './services/permissionService.js';

const crm2TimelineState = {
  pfId: '',
  listState: 'normal',
  systemDetailsExpanded: false
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

function resetTimelineState() {
  crm2TimelineState.listState = 'normal';
  crm2TimelineState.systemDetailsExpanded = false;
}

function parseTimelineChanges(text = '') {
  return String(text).split(' · ').flatMap((part) => {
    const match = part.match(/^([^:]+):\s*(.*?)\s+→\s*(.*)$/)
      || part.match(/^(.+?)(?:\s+—)?\s+De:\s*(.*?)\s*;\s*Para:\s*(.*)$/i);
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

function renderTimelineState(state, totalEvents) {
  const copy = {
    loading: ['Carregando timeline...', 'Estado de carregamento simulado para homologação.'],
    error: ['Não foi possível carregar a timeline.', 'Erro simulado. Nenhuma integração externa foi acionada.'],
    empty: ['Nenhum evento registrado.', 'A Pessoa Física ainda não possui eventos na timeline unificada.']
  }[state];
  if (!copy) return totalEvents ? '' : `<div class="crm2-pessoas-state crm2-timeline-state" role="status"><strong>Nenhum evento registrado.</strong><span>O histórico será preenchido pelas interações realizadas.</span></div>`;
  return `<div class="crm2-pessoas-state crm2-timeline-state ${state === 'error' ? 'is-error' : ''}" role="${state === 'error' ? 'alert' : 'status'}" ${state === 'loading' ? 'aria-busy="true"' : ''}><strong>${copy[0]}</strong><span>${copy[1]}</span><button class="secondary-btn" type="button" onclick="crm2TimelineSetState('normal')">Voltar à timeline</button></div>`;
}

function renderTimelineChanges(event) {
  const changes = event.changes.length
    ? event.changes
    : [{ campo: 'Registro', de: '—', para: event.alteracoes || event.descricao || '—' }];
  return changes.map((change) => `<span class="crm2-unified-timeline-inline-change"><span class="crm2-unified-timeline-change-field">${escapeTimeline(change.campo)}:</span> <s>${escapeTimeline(change.de)}</s> <strong>${escapeTimeline(change.para)}</strong></span>`).join(' · ');
}

function renderTimelineRelatedLink(event) {
  const reference = event.referencia || {};
  if (event.entidade === 'Pedido' && reference.pedidoId) return `<button class="crm2-timeline-related-link" type="button" aria-label="Abrir pedido ${escapeTimelineAttr(reference.label || '')}" onclick="crm2TimelineOpenPedido('${escapeTimelineAttr(reference.pedidoId)}')">Abrir</button>`;
  if (event.entidade === 'PJ' && reference.pjId) return `<button class="crm2-timeline-related-link" type="button" aria-label="Abrir empresa ${escapeTimelineAttr(reference.label || '')}" onclick="crm2TimelineOpenPj('${escapeTimelineAttr(reference.pjId)}')">Abrir</button>`;
  if (event.entidade === 'Vínculo' && reference.vinculoId) return `<button class="crm2-timeline-related-link" type="button" aria-label="Abrir vínculo ${escapeTimelineAttr(reference.label || '')}" onclick="crm2TimelineOpenVinculo('${escapeTimelineAttr(reference.vinculoId)}')">Abrir</button>`;
  return '';
}

function renderTimelineEvent(event) {
  const eventClass = normalizeTimeline(event.tipo).replace(/\s+/g, '-');
  const isComment = event.tipo === 'Observação interna';
  const action = event.changes.length ? 'Alteração' : event.tipo || 'Atualização';
  const content = isComment
    ? `<p class="crm2-unified-timeline-comment-meta"><span>${escapeTimeline(event.usuario)} · ${escapeTimeline(formatTimelineDate(event.data))}</span></p><strong class="crm2-unified-timeline-comment-text">${escapeTimeline(event.descricao)}</strong>`
    : `<p class="crm2-unified-timeline-system-line"><span class="crm2-unified-timeline-meta">${escapeTimeline(event.usuario)} - ${escapeTimeline(formatTimelineDate(event.data))} -</span><strong class="crm2-unified-timeline-action">${escapeTimeline(action)}</strong>${renderTimelineChanges(event)}${renderTimelineRelatedLink(event)}</p>`;
  return `<article class="crm2-unified-timeline-item ${isComment ? 'is-comment' : ''}"><span class="crm2-unified-timeline-marker is-${escapeTimelineAttr(eventClass)}" aria-hidden="true"></span><div class="crm2-unified-timeline-content">${content}</div></article>`;
}

function renderTimelineFormatToolbar() {
  return `<div class="crm2-pf-text-format-toolbar" role="toolbar" aria-label="Formatação da observação interna">
    <button class="icon-btn" type="button" title="Negrito" aria-label="Negrito" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('bold', 'observacao')"><i data-lucide="bold" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Itálico" aria-label="Itálico" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('italic', 'observacao')"><i data-lucide="italic" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Sublinhado" aria-label="Sublinhado" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('underline', 'observacao')"><i data-lucide="underline" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Tachado" aria-label="Tachado" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('strike', 'observacao')"><i data-lucide="strikethrough" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Lista com marcadores" aria-label="Lista com marcadores" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('bullet', 'observacao')"><i data-lucide="list" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Lista numerada" aria-label="Lista numerada" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('ordered', 'observacao')"><i data-lucide="list-ordered" aria-hidden="true"></i></button>
    <button class="icon-btn" type="button" title="Limpar formatação" aria-label="Limpar formatação" onmousedown="event.preventDefault()" onclick="crm2PfFormatNote('clear', 'observacao')"><i data-lucide="remove-formatting" aria-hidden="true"></i></button>
  </div>`;
}

function renderTimelineComposer(person) {
  if (!person || !canEditTimeline()) return '';
  return `<form class="crm2-unified-timeline-composer" onsubmit="crm2PfAddNote(event, '${escapeTimelineAttr(person.id)}')"><label><div id="crm2-timeline-observacao" class="config-input crm2-pf-rich-text-target" contenteditable="true" role="textbox" aria-multiline="true" data-field-name="observacao" data-value-target="crm2-timeline-observacao-value" data-placeholder="Registre uma interação mockada" aria-label="Observação interna" oninput="crm2PfSyncFormattedField(this)" onkeydown="crm2PfFormatKeydown(event, this)"></div><textarea id="crm2-timeline-observacao-value" class="crm2-pf-rich-text-value" name="observacao" hidden></textarea></label><div class="crm2-unified-timeline-composer-actions">${renderTimelineFormatToolbar()}<button class="secondary-btn" type="submit">Comentar</button></div></form>`;
}

function renderTimelineCounter(person) {
  if (!person) return '';
  return `<span class="crm2-pf-timeline-count">${buildTimelineEvents(person).length} eventos</span>`;
}

function renderTimelineDetailsToggle() {
  const expanded = crm2TimelineState.systemDetailsExpanded;
  return `<button class="crm2-pf-timeline-details-toggle" type="button" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="crm2-pf-timeline-scroll" onclick="crm2TimelineToggleDetails()">${expanded ? 'Recolher detalhes' : 'Expandir detalhes'}</button>`;
}

function renderTimeline(person) {
  if (!person) return '';
  if (crm2TimelineState.pfId !== person.id) {
    crm2TimelineState.pfId = person.id;
    resetTimelineState();
  }
  const events = buildTimelineEvents(person);
  const observations = events.filter((event) => event.tipo === 'Observação interna');
  const eventsToRender = crm2TimelineState.systemDetailsExpanded ? events : observations;
  const visibleContent = crm2TimelineState.listState !== 'normal'
    ? renderTimelineState(crm2TimelineState.listState, events.length)
    : events.length
      ? `<div class="crm2-unified-timeline-list" aria-live="polite">${eventsToRender.map(renderTimelineEvent).join('')}</div>`
      : renderTimelineState('normal', 0);
  return visibleContent;
}

Object.assign(window, {
  crm2TimelineRender: renderTimeline,
  crm2TimelineRenderComposer: renderTimelineComposer,
  crm2TimelineRenderCounter: renderTimelineCounter,
  crm2TimelineRenderDetailsToggle: renderTimelineDetailsToggle,
  crm2TimelineToggleDetails() {
    crm2TimelineState.systemDetailsExpanded = !crm2TimelineState.systemDetailsExpanded;
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
