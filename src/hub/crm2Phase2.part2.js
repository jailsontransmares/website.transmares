function renderListStateCrm2() {
  const state = crm2PfState.listState;
  if (state === 'normal') return '';
  const settings = {
    loading: ['Carregando pessoas físicas...', 'Estado de carregamento simulado para homologação.', 'Concluir simulação'],
    error: ['Não foi possível carregar a lista.', 'Erro simulado. Nenhuma integração foi acionada.', 'Tentar novamente'],
    empty: ['Nenhuma pessoa física cadastrada.', 'Estado de lista vazia simulado para homologação.', 'Voltar à lista mockada']
  }[state];
  if (!settings) return '';
  return `
    <div class="crm2-pessoas-state ${state === 'error' ? 'is-error' : ''}" role="${state === 'error' ? 'alert' : 'status'}" ${state === 'loading' ? 'aria-busy="true"' : ''}>
      ${state === 'loading' ? '<span class="hub-loading-spinner" aria-hidden="true"></span>' : ''}
      <strong>${escapeHtmlCrm2(settings[0])}</strong>
      <span>${escapeHtmlCrm2(settings[1])}</span>
      <button class="secondary-btn" type="button" onclick="crm2PfSetListState('normal')">${escapeHtmlCrm2(settings[2])}</button>
    </div>
  `;
}

function renderPaginationCrm2(totalPages, totalItems) {
  return `
    <div class="crm2-pessoas-pagination" aria-label="Paginação de pessoas físicas">
      <span>Página <strong>${crm2PfState.page}</strong> de <strong>${totalPages}</strong> · ${totalItems} registro(s)</span>
      <div>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page - 1})" ${crm2PfState.page <= 1 ? 'disabled' : ''}>Anterior</button>
        <button class="secondary-btn" type="button" onclick="crm2PfSetPage(${crm2PfState.page + 1})" ${crm2PfState.page >= totalPages ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>
  `;
}

function renderPeopleListCrm2() {
  const items = filteredPeopleCrm2();
  const { totalPages, pageItems } = paginatedPeopleCrm2(items);
  const origins = [...new Set(crm2PfState.items.map((item) => item.origem).filter(Boolean))];
  const hasFilters = Boolean(
    crm2PfState.search
    || crm2PfState.statusFilter
    || crm2PfState.originFilter
  );
  const specialState = crm2PfState.listState !== 'normal';

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoas-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">ROTA 201 · CRM 2.0</span>
          <h3 id="crm2-pessoas-title">Pessoas físicas</h3>
          <p>Cadastro central do relacionamento do AR Transmares. Todos os dados desta fase existem apenas em memória.</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('200')">Voltar ao CRM 2.0</button>
          ${crm2CanEdit() ? '<button class="save-btn" type="button" onclick="window.crm2PfOpenForm(\'create\')">+Incluir</button>' : ''}
        </div>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <form class="ar-crm-list-filters" role="search" onsubmit="crm2PfApplyFilters(event)">
        <label>
          <span>Buscar</span>
          <input class="config-input" type="search" placeholder="Nome, CPF, telefone ou e-mail" value="${escapeAttrCrm2(crm2PfState.search)}" oninput="crm2PfSetSearch(this.value)">
        </label>
        <label>
          <span>Status</span>
          <select class="config-input" onchange="crm2PfSetFilter('status', this.value)">
            <option value="">Todos os status</option>
            <option value="cliente ativo" ${crm2PfState.statusFilter === 'cliente ativo' ? 'selected' : ''}>Cliente ativo</option>
            <option value="cliente inativo" ${crm2PfState.statusFilter === 'cliente inativo' ? 'selected' : ''}>Cliente inativo</option>
          </select>
        </label>
        <label>
          <span>Origem</span>
          <select class="config-input" onchange="crm2PfSetFilter('origin', this.value)">
            <option value="">Todas as origens</option>
            ${origins.map((origin) => `<option value="${escapeAttrCrm2(origin)}" ${crm2PfState.originFilter === origin ? 'selected' : ''}>${escapeHtmlCrm2(origin)}</option>`).join('')}
          </select>
        </label>
        <button class="save-btn" type="submit">Aplicar filtros</button>
        <button class="secondary-btn" type="button" onclick="crm2PfClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button>
      </form>

      <div class="crm2-pessoas-summary" aria-live="polite">
        <strong>${specialState ? 0 : items.length}</strong>
        <span>${specialState ? 'registros no estado simulado' : 'pessoas físicas encontradas'}</span>
      </div>

      ${specialState ? renderListStateCrm2() : pageItems.length ? `
        <div class="ar-crm-phase1-table-wrap crm2-pessoas-table-wrap">
          <table class="ar-crm-phase1-table crm2-pessoas-table" aria-describedby="crm2-pessoas-table-caption">
            <caption id="crm2-pessoas-table-caption" class="crm2-pessoas-table-caption">Pessoas fisicas cadastradas no CRM 2.0</caption>
            <thead>
              <tr>
                <th>Nome completo/nome social</th>
                <th id="crm2-pf-col-cpf" scope="col">CPF</th>
                <th id="crm2-pf-col-phone" scope="col">Telefone</th>
                <th id="crm2-pf-col-email" scope="col">E-mail</th>
                <th>Última atualização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((item) => `
                <tr>
                  <td><strong>${escapeHtmlCrm2(item.nome)}</strong><small>${escapeHtmlCrm2(personStatusLabelCrm2(item))}</small></td>
                  <td headers="crm2-pf-col-cpf">${escapeHtmlCrm2(maskCpfCrm2(item.cpf))}</td>
                  <td>${escapeHtmlCrm2(maskPhoneCrm2(item.telefone) || '—')}</td>
                  <td>${escapeHtmlCrm2(item.email || '—')}</td>
                  <td>${escapeHtmlCrm2(formatDateTimeCrm2(item.atualizadoEm))}</td>
                  <td>
                    <div class="hub-row-actions">
                      <details class="hub-row-actions-menu" data-hub-action-menu data-hub-action-min-width="120" data-hub-action-max-width="190" data-hub-action-gap="6">
                        <summary class="icon-action-btn hub-quick-actions-trigger" aria-label="Ações rápidas de ${escapeAttrCrm2(item.nome)}" title="Ações rápidas">⋮</summary>
                        <div class="hub-row-actions-popover" data-hub-action-popover role="menu">
                          <button type="button" role="menuitem" onclick="crm2PfOpenDetail('${escapeAttrCrm2(item.id)}')">Visualizar</button>
                          <button type="button" role="menuitem" onclick="crm2PfEdit('${escapeAttrCrm2(item.id)}')" ${!crm2CanEdit() ? 'disabled' : ''}>Editar</button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPaginationCrm2(totalPages, items.length)}
      ` : `
        <div class="crm2-pessoas-state" role="status" aria-live="polite">
          <strong>${crm2PfState.items.length ? 'Nenhum resultado encontrado.' : 'Nenhuma pessoa física cadastrada.'}</strong>
          <span>${crm2PfState.items.length ? 'Ajuste os filtros ou limpe a busca para visualizar os registros mockados.' : 'A lista mockada ainda não possui pessoas físicas cadastradas.'}</span>
          <button class="secondary-btn" type="button" onclick="crm2PfClearFilters()" ${hasFilters ? '' : 'disabled'}>Limpar filtros</button>
        </div>
      `}
    </section>
  `;
}

function renderPersonDataCrm2(person) {
  const attachments = person.anexos || [];
  return `
    <div class="crm2-pf-detail-grid">
      ${[
        ['Nome', person.nome],
        ['CPF', maskCpfCrm2(person.cpf)],
        ['CEI/CAEPF', person.cei || '—'],
        ['Data de nascimento', formatDateCrm2(person.nascimento)],
        ['Telefone', maskPhoneCrm2(person.telefone) || '—'],
        ['E-mail', person.email || '—'],
        ['Origem', person.origem || '—'],
        ['Parceiro de indicação', person.parceiro || '—'],
        ['Status automático', personStatusLabelCrm2(person)],
        ['Data de cadastro', formatDateTimeCrm2(person.cadastroEm)],
        ['Última atualização', formatDateTimeCrm2(person.atualizadoEm)]
      ].map(([label, value]) => `<div><span>${escapeHtmlCrm2(label)}</span><strong>${escapeHtmlCrm2(value)}</strong></div>`).join('')}
      <div class="is-wide"><span>Observações</span><strong>${escapeHtmlCrm2(person.observacoes || '—')}</strong></div>
    </div>

    <section class="crm2-pf-attachments-section" aria-labelledby="crm2-pf-attachments-title">
      <div class="admin-panel-header crm2-pf-subheader">
        <div>
          <h4 id="crm2-pf-attachments-title">Anexos mockados</h4>
          <p>Os arquivos selecionados não são enviados para nenhum serviço.</p>
        </div>
      </div>

      ${crm2CanEdit() ? `
        <form class="crm2-pf-attachment-add" onsubmit="crm2PfAddAttachment(event, '${escapeAttrCrm2(person.id)}')">
          <label><span>Arquivo</span><input class="config-input" type="file" name="arquivo" required></label>
          <label><span>Validade opcional</span><input class="config-input" type="date" name="validade"></label>
          <button class="secondary-btn" type="submit">Incluir anexo</button>
        </form>
      ` : ''}

      <div class="crm2-pf-related-list">
        ${attachments.length ? attachments.map((attachment, index) => {
          const status = attachmentStatusCrm2(attachment.validade);
          return `
            <article class="crm2-pf-attachment">
              <div class="crm2-pf-attachment-copy">
                <strong>${escapeHtmlCrm2(attachment.nome)}</strong>
                <span>${escapeHtmlCrm2(attachment.tipo || 'Arquivo')} · Incluído em ${escapeHtmlCrm2(formatDateTimeCrm2(attachment.incluidoEm))}</span>
                <span>Validade: ${escapeHtmlCrm2(formatDateCrm2(attachment.validade))}</span>
              </div>
              <span class="crm2-pf-attachment-status is-${escapeAttrCrm2(attachmentStatusClassCrm2(status))}">${escapeHtmlCrm2(status)}</span>
              ${crm2CanEdit() ? `
                <div class="crm2-pf-attachment-actions">
                  <label class="secondary-btn crm2-pf-replace-label">
                    Substituir
                    <input class="crm2-visually-hidden-input" type="file" onchange="crm2PfReplaceAttachment(this, '${escapeAttrCrm2(person.id)}', ${index})">
                  </label>
                  <button class="secondary-btn" type="button" onclick="crm2PfRemoveAttachment('${escapeAttrCrm2(person.id)}', ${index})">Remover</button>
                </div>
              ` : ''}
            </article>
          `;
        }).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum anexo.</strong><span>Estado vazio preparado para arquivos futuros.</span></div>'}
      </div>
    </section>
  `;
}

function renderTimelineCrm2(person) {
  const events = [...(person.timeline || [])].sort((a, b) => new Date(b.data) - new Date(a.data));
  return `
              ${crm2CanEdit() ? `
      <form class="crm2-pf-timeline-composer" onsubmit="crm2PfAddNote(event, '${escapeAttrCrm2(person.id)}')">
        <label>
          <span>Observação interna</span>
          <textarea class="config-input" name="observacao" rows="3" placeholder="Registre uma interação mockada" required></textarea>
        </label>
        <button class="secondary-btn" type="submit">Adicionar à timeline</button>
      </form>
    ` : ''}
    <div class="crm2-pf-timeline">
      ${events.length ? events.map((event) => `
        <article class="crm2-pf-timeline-item">
          <span>${escapeHtmlCrm2(event.tipo || 'Evento')}</span>
          <strong>${escapeHtmlCrm2(event.descricao || '')}</strong>
          <p><span>${escapeHtmlCrm2(formatDateTimeCrm2(event.data))}</span><span>${escapeHtmlCrm2(event.usuario || 'Sistema')}</span></p>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum evento.</strong><span>A timeline será preenchida pelas interações mockadas.</span></div>'}
    </div>
  `;
}

function renderCompaniesCrm2(person) {
  const companies = person.empresas || [];
  return `
    <div class="crm2-pf-related-list">
      ${companies.length ? companies.map((company, index) => `
        <article>
          <div><strong>${escapeHtmlCrm2(company.nome)}</strong><span>${escapeHtmlCrm2(company.vinculo || 'Vínculo não informado')} · ${escapeHtmlCrm2(company.status || '—')}</span></div>
          <button class="secondary-btn" type="button" onclick="crm2PfViewCompany(${index})">Ver empresa</button>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhuma empresa vinculada.</strong><span>A criação e o detalhe de PJ serão habilitados na Fase 3.</span></div>'}
    </div>
  `;
}

function renderOrdersCrm2(person) {
  const orders = person.pedidos || [];
  return `
    <div class="crm2-pf-related-list">
      ${orders.length ? orders.map((order) => `
        <article>
          <div>
            <strong>${escapeHtmlCrm2(order.numero || 'Pedido')}</strong>
            <span>${escapeHtmlCrm2(order.produto || 'Produto não informado')} · ${escapeHtmlCrm2(order.empresa || 'Sem empresa vinculada')}</span>
            <span>${escapeHtmlCrm2(order.status || '—')} · Vencimento ${escapeHtmlCrm2(formatDateCrm2(order.vencimento))}</span>
          </div>
        </article>
      `).join('') : '<div class="crm2-pessoas-state is-compact"><strong>Nenhum pedido vinculado.</strong><span>A criação de pedidos será habilitada em fase posterior.</span></div>'}
    </div>
  `;
}

function renderPersonDetailCrm2(person) {
  if (!person) {
    crm2PfState.detailId = '';
    return renderPeopleListCrm2();
  }
  const tabs = [
    ['dados', 'Dados cadastrais'],
    ['timeline', 'Timeline'],
    ['empresas', 'Empresas vinculadas'],
    ['pedidos', 'Pedidos']
  ];
  const lastActivity = [...(person.timeline || [])].sort((a, b) => new Date(b.data) - new Date(a.data))[0]?.data || person.atualizadoEm;
  const content = {
    dados: renderPersonDataCrm2(person),
    timeline: renderTimelineCrm2(person),
    empresas: renderCompaniesCrm2(person),
    pedidos: renderOrdersCrm2(person)
  }[crm2PfState.detailTab] || renderPersonDataCrm2(person);

  return `
    <section class="admin-panel crm2-pessoas-page" data-crm2-phase2-enhanced="true" aria-labelledby="crm2-pessoa-detail-title">
      <div class="admin-panel-header">
        <div>
          <span class="ar-crm-phase1-kicker">PESSOA FÍSICA · MOCK</span>
          <h3 id="crm2-pessoa-detail-title">${escapeHtmlCrm2(person.nome)}</h3>
          <p>${escapeHtmlCrm2(maskCpfCrm2(person.cpf))} · ${escapeHtmlCrm2(personStatusLabelCrm2(person))}</p>
        </div>
        <div class="crm2-pessoas-header-actions">
          <button class="secondary-btn" type="button" onclick="navegarParaCrm2Rota('201')">Voltar à lista</button>
          ${crm2CanEdit() ? `<button class="save-btn" type="button" onclick="navegarParaCrm2Rota('201', '${escapeAttrCrm2(person.id)}/editar')">Editar</button>` : ''}
        </div>
      </div>

      ${crm2PfState.message ? `<p class="admin-message" role="status">${escapeHtmlCrm2(crm2PfState.message)}</p>` : ''}

      <div class="crm2-pf-summary-grid">
        <article><span>Status atual</span><strong>${escapeHtmlCrm2(personStatusLabelCrm2(person))}</strong></article>
        <article><span>Empresas</span><strong>${(person.empresas || []).length}</strong></article>
        <article><span>Pedidos</span><strong>${(person.pedidos || []).length}</strong></article>
        <article><span>Anexos</span><strong>${(person.anexos || []).length}</strong></article>
        <article><span>Última atividade</span><strong>${escapeHtmlCrm2(formatDateTimeCrm2(lastActivity))}</strong></article>
      </div>

      <div class="module-tabs crm2-pf-tabs" role="tablist" aria-label="Detalhes da pessoa física">
        ${tabs.map(([id, label]) => `<button class="${crm2PfState.detailTab === id ? 'active' : ''}" type="button" role="tab" aria-selected="${crm2PfState.detailTab === id}" onclick="crm2PfSelectTab('${id}')">${escapeHtmlCrm2(label)}</button>`).join('')}
      </div>

      <div class="crm2-pf-tab-content">${content}</div>
    </section>
  `;
}

function formFieldCrm2({ label, name, value = '', type = 'text', required = false, wide = false, placeholder = '', extra = '', formId = '', options = [] }) {
  const changed = crm2PfState.changedFields.includes(name) ? 'is-changed' : '';
  const error = crm2PfState.errors[name] || '';
  const fieldId = `crm2-pf-${name}`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? `aria-describedby="${errorId}"` : '';
  const invalid = error ? 'true' : 'false';
  const locked = crm2PfState.formMode === 'create' && crm2PfState.cpfGate.status !== 'not-found';
  const input = type === 'textarea'
    ? `<textarea id="${fieldId}" class="config-input" name="${name}" rows="4" autocomplete="off" placeholder="${escapeAttrCrm2(placeholder)}" aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${locked ? 'disabled' : ''} oninput="crm2PfTrackChange(this)">${escapeHtmlCrm2(value)}</textarea>`
    : type === 'select'
      ? `<select id="${fieldId}" class="config-input" name="${name}" autocomplete="off" aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${required ? 'required' : ''} ${extra} ${locked ? 'disabled' : ''} onchange="crm2PfTrackChange(this)"><option value="">Selecione</option>${options.map((option) => `<option value="${escapeAttrCrm2(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtmlCrm2(option.label)}</option>`).join('')}</select>`
    : `<input id="${fieldId}" class="config-input" type="${type}" name="${name}" autocomplete="off" value="${escapeAttrCrm2(value)}" placeholder="${escapeAttrCrm2(placeholder)}" ${required ? 'required' : ''} ${extra} aria-invalid="${invalid}" ${describedBy} ${formId ? `form="${formId}"` : ''} ${locked ? 'disabled' : ''} oninput="crm2PfTrackChange(this)">`;
  return `
    <label class="${wide ? 'is-wide' : ''} ${changed}">
      <span for="${fieldId}">${escapeHtmlCrm2(label)}${required ? ' *' : ''}</span>
      ${input}
      ${error ? `<small id="${errorId}" class="crm2-field-error">${escapeHtmlCrm2(error)}</small>` : ''}
    </label>
  `;
}
