import { carregarContextoFinanceiro } from './services/financeiroService.js';
import { atualizarCobrancaOperacional, atualizarTituloFinanceiro, carregarDadosCobranca, carregarUsuariosAtivosCobranca, criarCobrancaOperacional, definirEstadoCobranca, excluirCobrancaOperacional, registrarInteracaoCobranca } from './services/cobrancaService.js';

const PRODUTOS_COBRANCA = ['AUTO', 'RESIDENCIA', 'CONDOMINIO', 'EMPRESARIAL', 'VIDA', 'PREVIDENCIA', 'CONSÓRCIO'];

const TIPOS_ACAO = {
  contato: 'Registrar contato',
  comentario: 'Adicionar comentário',
  agendamento: 'Programar retorno'
};

function hojeIso() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatarData(entrada) {
  if (!entrada) return '—';
  const data = new Date(`${String(entrada).slice(0, 10)}T12:00:00`);
  return Number.isNaN(data.getTime()) ? String(entrada) : data.toLocaleDateString('pt-BR');
}

function formatarDataHora(entrada) {
  if (!entrada) return '—';
  const data = new Date(entrada);
  return Number.isNaN(data.getTime()) ? formatarData(entrada) : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function diasEmAtraso(titulo) {
  if (['liquidada', 'cancelada', 'estornada'].includes(titulo.status)) return 0;
  const vencimento = new Date(`${titulo.data_vencimento}T00:00:00`);
  const hoje = new Date(`${hojeIso()}T00:00:00`);
  return Number.isNaN(vencimento.getTime()) ? 0 : Math.max(0, Math.floor((hoje - vencimento) / 86400000));
}

function nomeCliente(titulo) {
  return titulo.lancamento?.cliente_nome || titulo.pessoa?.nome_fantasia || titulo.pessoa?.nome_razao_social || 'Cliente sem cadastro';
}

function produtoDoLancamento(lancamento = {}) {
  const encontrado = String(lancamento.observacoes || '').match(/(?:^|\n)Produto:\s*([^\n]+)/i);
  return encontrado?.[1]?.trim() || '';
}

function statusFinanceiro(titulo) {
  if (titulo.status === 'liquidada') return 'Pago';
  if (titulo.status === 'cancelada') return 'Cancelado';
  const dias = diasEmAtraso(titulo);
  if (dias > 0) return 'Em atraso';
  if (titulo.status === 'parcial') return 'Parcial';
  return titulo.data_vencimento === hojeIso() ? 'Vence hoje' : 'A vencer';
}

function ultimaInteracao(titulo, interacoes) {
  return interacoes
    .filter(item => item.parcela_id === titulo.id || item.cobranca_id === titulo.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

function statusCobranca(titulo, interacoes) {
  if (titulo.estado_cobranca === 'arquivada') return 'Arquivada';
  if (['liquidada', 'cancelada', 'estornada'].includes(titulo.status)) return 'Encerrada';
  const ultima = interacoes
    .filter(item => (item.parcela_id === titulo.id || item.cobranca_id === titulo.id) && item.tipo !== 'comentario')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
  if (!ultima) return 'Não iniciada';
  if (ultima.tipo === 'cobranca_enviada') return 'Cobrança enviada';
  if (ultima.resultado === 'em_negociacao') return 'Em negociação';
  if (ultima.resultado === 'promessa_pagamento') return 'Promessa de pagamento';
  if (ultima.tipo === 'agendamento' || ultima.resultado === 'aguardando_retorno') return 'Aguardando retorno';
  return 'Em acompanhamento';
}

function pessoaResponsavel(titulo, interacoes) {
  return interacoes.find(item => (item.parcela_id === titulo.id || item.cobranca_id === titulo.id) && item.responsavel_nome)?.responsavel_nome || titulo.responsavel_nome || ultimaInteracao(titulo, interacoes)?.usuario_nome || '—';
}

export function criarCobrancaController({ renderShell, pode, renderUnavailable, escapeHtml, escapeAttr, navegarParaRota, usuario }) {
  const state = {
    carregando: false,
    erro: '',
    mensagem: '',
    empresas: [],
    usuariosAtivos: [],
    empresaId: '',
    titulos: [],
    interacoes: [],
    selecionadoId: '',
    modalTipo: '',
    emailPreparado: false,
    emailDraft: null,
    busca: '',
    dataInicio: '',
    dataFim: '',
    responsavel: '',
    statuses: [],
    statusDropdownOpen: false
  };

  const titulosAbertos = () => state.titulos.filter(item => !['liquidada', 'cancelada', 'estornada'].includes(item.status));
  const responsaveis = () => state.usuariosAtivos.map(item => item.nome).filter(Boolean);

  function titulosFiltrados() {
    const termo = state.busca.trim().toLocaleLowerCase('pt-BR');
    return state.titulos.filter(titulo => {
      const status = statusFinanceiro(titulo);
      const statusDaCobranca = statusCobranca(titulo, state.interacoes);
      const data = String(titulo.data_vencimento || '').slice(0, 10);
      const pessoa = nomeCliente(titulo).toLocaleLowerCase('pt-BR');
      const buscaTexto = `${pessoa} ${titulo.descricao || ''} ${titulo.numero || ''}`.toLocaleLowerCase('pt-BR');
      return (!termo || buscaTexto.includes(termo))
        && (!state.dataInicio || data >= state.dataInicio)
        && (!state.dataFim || data <= state.dataFim)
        && (!state.responsavel || pessoaResponsavel(titulo, state.interacoes) === state.responsavel)
        && (state.statuses.length
          ? state.statuses.some(selecionado => selecionado === 'Arquivada'
            ? titulo.estado_cobranca === 'arquivada'
            : selecionado === status || selecionado === statusDaCobranca)
          : titulo.estado_cobranca !== 'arquivada');
    });
  }

  function renderFiltros() {
    const opcoesStatus = ['A vencer', 'Vence hoje', 'Em atraso', 'Parcial', 'Pago', 'Cancelado', 'Em negociação', 'Cobrança enviada', 'Aguardando retorno', 'Encerrada', 'Arquivada'];
    const resumoStatus = state.statuses.length ? `${state.statuses.length} status selecionado${state.statuses.length === 1 ? '' : 's'}` : 'Todos os status';
    return `
      <div class="module-grid admin-logs-toolbar" role="search" aria-label="Busca e filtros de cobrança">
        <label class="admin-logs-filter-field"><span>Busca</span><input class="config-input" name="busca" type="search" placeholder="Cliente ou descrição" value="${escapeAttr(state.busca)}" aria-label="Buscar cliente, descrição ou número"></label>
        <label class="admin-logs-filter-field"><span>Vencimento de</span><input class="config-input" name="dataInicio" type="date" value="${escapeAttr(state.dataInicio)}"></label>
        <label class="admin-logs-filter-field"><span>Vencimento até</span><input class="config-input" name="dataFim" type="date" value="${escapeAttr(state.dataFim)}"></label>
        <label class="admin-logs-filter-field"><span>Responsável</span><select class="config-input" name="responsavel" aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          ${responsaveis().map(nome => `<option value="${escapeAttr(nome)}" ${state.responsavel === nome ? 'selected' : ''}>${escapeHtml(nome)}</option>`).join('')}
        </select></label>
        <label class="admin-logs-filter-field"><span>Status</span><div class="hub-filter-combobox" data-status-filter>
          <div class="config-input hub-filter-trigger" role="button" tabindex="0" data-status-toggle aria-haspopup="listbox" aria-expanded="${state.statusDropdownOpen}" aria-label="Selecionar um ou mais status"><span>${escapeHtml(resumoStatus)}</span><button class="icon-btn" type="button" data-status-clear title="Limpar seleção" aria-label="Limpar seleção de status" style="width:24px;height:24px;flex:0 0 24px;padding:4px" ${state.statuses.length ? '' : 'disabled'}><i data-lucide="eraser" style="width:14px;height:14px" aria-hidden="true"></i></button></div>
          <div class="hub-filter-dropdown-menu" style="position:absolute;top:calc(100% + 4px);right:0;min-width:100%;max-height:320px" role="listbox" aria-label="Status da cobrança" aria-multiselectable="true" ${state.statusDropdownOpen ? '' : 'hidden'}>
            ${opcoesStatus.map(status => `<button class="hub-filter-dropdown-option ${state.statuses.includes(status) ? 'is-selected' : ''}" style="min-height:28px;padding:4px 8px;font-size:12px" type="button" role="option" aria-selected="${state.statuses.includes(status)}" data-status-option="${escapeAttr(status)}">${escapeHtml(status)}</button>`).join('')}
          </div>
        </div></label>
      </div>
    `;
  }

  function renderTabela() {
    const titulos = titulosFiltrados();
    return `
      <div class="admin-table-wrap">
        <table class="admin-table hub-data-table">
          <thead><tr><th>Produto</th><th>Cliente</th><th>Descrição</th><th style="text-align:center">Vencimento</th><th style="text-align:center">Dias em atraso</th><th>Status</th><th>Cobrança</th></tr></thead>
          <tbody>
            ${titulos.length ? titulos.map(titulo => {
              const financeiro = statusFinanceiro(titulo);
              const dias = diasEmAtraso(titulo);
              const destaqueAtraso = dias > 15
                ? 'background:#dc2626;color:#fff'
                : dias > 7
                  ? 'background:color-mix(in srgb, #ef4444 14%, var(--card));color:#b91c1c'
                  : dias > 0
                    ? 'background:color-mix(in srgb, #f59e0b 16%, var(--card));color:#b45309'
                    : '';
              const selecionado = state.selecionadoId === titulo.id;
              return `<tr ${selecionado ? 'aria-selected="true"' : ''}>
                <td>${escapeHtml(titulo.produto || '—')}</td>
                <td><button class="secondary-btn" type="button" data-cobranca-action="selecionar" data-id="${escapeAttr(titulo.id)}" aria-label="Ver detalhes de ${escapeAttr(nomeCliente(titulo))}">${escapeHtml(nomeCliente(titulo))}</button></td>
                <td>${escapeHtml(titulo.descricao || '—')}${titulo.total > 1 ? `<br><small>Parcela ${titulo.numero}/${titulo.total}</small>` : ''}</td>
                <td style="text-align:center">${escapeHtml(formatarData(titulo.data_vencimento))}</td>
                <td style="text-align:center">${dias ? `<span class="status-badge" style="${destaqueAtraso};font-weight:400" aria-label="${dias} dias em atraso" title="${dias} dias em atraso">${dias > 15 ? '⚠ ' : ''}${dias} dia${dias === 1 ? '' : 's'}</span>` : '—'}</td>
                <td><span class="status-badge">${escapeHtml(financeiro)}</span></td>
                <td><div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="status-badge">${escapeHtml(statusCobranca(titulo, state.interacoes))}</span><span style="display:inline-flex;align-items:center;gap:2px;flex:0 0 auto"><button class="icon-btn" style="width:28px;height:28px;flex:0 0 28px;padding:5px" type="button" data-cobranca-action="arquivar" data-id="${escapeAttr(titulo.id)}" title="Arquivar" aria-label="Arquivar cobrança de ${escapeAttr(nomeCliente(titulo))}" ${pode('financeiro.lancamentos', 'update') ? '' : 'disabled'}><i data-lucide="archive" style="width:15px;height:15px" aria-hidden="true"></i></button><button class="icon-btn danger" style="width:28px;height:28px;flex:0 0 28px;padding:5px" type="button" data-cobranca-action="excluir" data-id="${escapeAttr(titulo.id)}" title="Excluir" aria-label="Excluir cobrança de ${escapeAttr(nomeCliente(titulo))}" ${pode('financeiro.lancamentos', 'delete') ? '' : 'disabled'}><i data-lucide="trash-2" style="width:15px;height:15px" aria-hidden="true"></i></button></span></div></td>
              </tr>`;
            }).join('') : '<tr><td colspan="7">Nenhum título corresponde aos filtros informados.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p>${titulos.length} título${titulos.length === 1 ? '' : 's'} encontrado${titulos.length === 1 ? '' : 's'}.</p>
    `;
  }

  function renderDetalhe() {
    const titulo = state.titulos.find(item => item.id === state.selecionadoId);
    if (!titulo) return '';
    const eventos = state.interacoes.filter(item => item.parcela_id === titulo.id || item.cobranca_id === titulo.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const ultimoContato = eventos.find(item => ['contato', 'cobranca_enviada'].includes(item.tipo));
    const proximaAcao = eventos.find(item => item.proxima_acao_em && item.proxima_acao_em >= hojeIso());
    const statusOptions = titulo.cobranca_id
      ? [['aberta', 'Aberta'], ['em_negociacao', 'Em negociação'], ['concluida', 'Concluída'], ['cancelada', 'Cancelada']]
      : [['aberta', 'Aberta'], ['parcial', 'Parcial'], ['liquidada', 'Liquidada'], ['cancelada', 'Cancelada'], ['estornada', 'Estornada']];
    const historico = eventos.map(item => `${formatarDataHora(item.created_at)} · ${TIPOS_ACAO[item.tipo] || item.tipo}\n${item.anotacao}\nRegistrado por ${item.usuario_nome || 'Usuário'}${item.proxima_acao_em ? ` · Próxima ação: ${formatarData(item.proxima_acao_em)}` : ''}`).join('\n\n');
    return `
      <aside class="info-card" style="grid-column: 2; grid-row: 1; align-self: start; position: relative; z-index: 1; padding:14px" aria-label="Detalhes da cobrança de ${escapeAttr(nomeCliente(titulo))}">
        <div class="admin-panel-header">
          <div style="flex:1;min-width:0"><h3 style="font-weight:400;margin-bottom:4px">Detalhes da cobrança</h3></div>
          <div class="action-toolbar">
            <button class="save-btn" type="submit" form="cobranca-edicao">Salvar</button>
            <button class="icon-btn" type="button" data-cobranca-action="fechar-detalhe" aria-label="Fechar detalhes" title="Fechar">×</button>
          </div>
        </div>
        <form id="cobranca-edicao" data-cobranca-edicao style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 8px">
          <input form="cobranca-edicao" class="config-input" name="cliente_nome" aria-label="Nome do cliente" value="${escapeAttr(nomeCliente(titulo))}" style="grid-column:1 / -1;font-size:20px;font-weight:700">
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Vencimento<input class="config-input" type="date" name="data_vencimento" value="${escapeAttr(String(titulo.data_vencimento || '').slice(0,10))}"></label>
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Produto<select class="config-input" name="produto">${PRODUTOS_COBRANCA.map(p=>`<option ${p===titulo.produto?'selected':''}>${p}</option>`).join('')}</select></label>
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Responsável<select class="config-input" name="responsavel_id">${state.usuariosAtivos.map(u=>`<option value="${escapeAttr(u.id)}" ${u.id===titulo.responsavel_id?'selected':''}>${escapeHtml(u.nome)}</option>`).join('')}</select></label>
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Último contato<input class="config-input" value="${escapeAttr(ultimoContato ? `${formatarDataHora(ultimoContato.created_at)} · ${ultimoContato.anotacao}` : 'Nenhum contato registrado')}" disabled></label>
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Próxima ação<input class="config-input" type="date" name="proxima_acao_em" value="${escapeAttr(proximaAcao?.proxima_acao_em || '')}"></label>
          <label style="display:grid;gap:3px;font-size:11px;line-height:1.2">Status<select class="config-input" name="status">${statusOptions.map(([value, label]) => `<option value="${value}" ${titulo.status===value?'selected':''}>${label}</option>`).join('')}</select></label>
        </form>
        <details style="margin-top:16px">
          <summary>Histórico de interações (${eventos.length})</summary>
          <textarea class="config-input" rows="8" readonly aria-label="Histórico de cobranças" style="margin-top:10px;line-height:1.7">${escapeHtml(historico || 'Nenhuma interação registrada.')}</textarea>
        </details>
        ${state.modalTipo && state.modalTipo !== 'nova' ? `<form data-cobranca-form><h4>${escapeHtml(TIPOS_ACAO[state.modalTipo])}</h4>${state.modalTipo==='contato'?'<label>Resultado<select class="config-input" name="resultado"><option value="aguardando_retorno">Aguardando retorno</option><option value="em_negociacao">Em negociação</option><option value="promessa_pagamento">Promessa de pagamento</option></select></label>':''}${state.modalTipo==='agendamento'?'<label>Data de retorno<input class="config-input" name="proxima_acao_em" type="date" required></label>':''}<label>Anotação<textarea class="config-input" name="anotacao" required></textarea></label><button class="save-btn" type="submit">Salvar</button><button class="secondary-btn" type="button" data-cobranca-action="cancelar-modal">Cancelar</button></form>`:''}
        <div class="action-toolbar" style="margin-top:16px">
          ${Object.entries(TIPOS_ACAO).map(([tipo, nome]) => `<button class="secondary-btn" type="button" data-cobranca-action="acao" data-tipo="${tipo}" ${titulo.status === 'liquidada' || titulo.status === 'cancelada' ? 'disabled' : ''}>${escapeHtml(nome)}</button>`).join('')}
        </div>
      </aside>
    `;
  }

  function renderModal() {
    if (state.modalTipo !== 'nova') return '';
    return `
      <div class="modal-backdrop">
        <section class="small-modal" role="dialog" aria-modal="true" aria-labelledby="cobranca-modal-title">
          <header class="small-modal-header"><h3 id="cobranca-modal-title">Nova cobrança</h3></header>
          <form data-cobranca-nova-form>
            <label><span>Nome do cliente</span><input class="config-input" name="cliente_nome" required maxlength="180" autocomplete="organization"></label>
            <label><span>Produto</span><select class="config-input" name="produto" required><option value="">Selecione</option>${PRODUTOS_COBRANCA.map(produto => `<option value="${escapeAttr(produto)}">${escapeHtml(produto)}</option>`).join('')}</select></label>
            <label><span>Descrição</span><input class="config-input" name="descricao" required maxlength="250"></label>
            <label><span>Vencimento</span><input class="config-input" name="data_vencimento" type="date" required></label>
            <label><span>Responsável</span><select class="config-input" name="responsavel_id" required><option value="">Selecione</option>${state.usuariosAtivos.map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.nome)}</option>`).join('')}</select></label>
            <footer class="small-modal-actions"><button class="secondary-btn" type="button" data-cobranca-action="cancelar-modal">Cancelar</button><button class="save-btn" type="submit">Salvar cobrança</button></footer>
          </form>
        </section>
      </div>`;
  }

  function render() {
    const conteudo = `
      <section class="admin-panel" data-cobranca-page>
        <div class="admin-panel-header">
          <div><h2>Cobrança</h2><p>Gerencie cobranças, contatos e próximos retornos.</p></div>
          <div class="action-toolbar">
            ${state.empresas.length > 1 ? `<label><span>Empresa</span><select class="config-input" name="empresaId">${state.empresas.map(empresa => `<option value="${escapeAttr(empresa.id)}" ${state.empresaId === empresa.id ? 'selected' : ''}>${escapeHtml(empresa.nome_fantasia || empresa.razao_social)}</option>`).join('')}</select></label>` : ''}
            <button class="save-btn" type="button" data-cobranca-action="nova" ${pode('financeiro.lancamentos', 'create') ? '' : 'disabled'}>+ Cobrança</button>
            <button class="secondary-btn" type="button" data-cobranca-action="exportar" ${state.titulos.length ? '' : 'disabled'}>Exportar</button>
          </div>
        </div>
        ${state.mensagem ? `<p class="admin-message" role="status">${escapeHtml(state.mensagem)}</p>` : ''}
        ${state.erro ? `<p class="admin-message" role="alert">${escapeHtml(state.erro)}</p>` : ''}
        ${state.carregando ? '<p class="hub-loading" aria-live="polite">Carregando títulos e histórico de cobrança…</p>' : ''}
        ${renderFiltros()}
        <section class="${state.selecionadoId ? 'info-grid' : ''}" aria-label="Carteira de cobrança">
          <div data-cobranca-table style="grid-column: 1 / -1; grid-row: 1; min-width: 0;">${renderTabela()}</div>
          ${renderDetalhe()}
        </section>
        ${renderModal()}
      </section>
    `;
    document.getElementById('app').innerHTML = renderShell({
      tituloPagina: 'Cobrança',
      descricaoPagina: 'Gerencie cobranças e o relacionamento com clientes.',
      conteudo
    });
    conectarEventos();
  }

  async function carregarTitulos() {
    if (!state.empresaId) {
      state.titulos = [];
      state.interacoes = [];
      render();
      return;
    }
    state.carregando = true;
    state.erro = '';
    render();
    try {
      const dados = await carregarDadosCobranca(state.empresaId);
      state.titulos = dados.titulos;
      state.interacoes = dados.interacoes;
      if (!state.titulos.some(item => item.id === state.selecionadoId)) state.selecionadoId = '';
    } catch (erro) {
      state.erro = erro?.message || 'Não foi possível carregar a carteira de cobrança.';
    } finally {
      state.carregando = false;
      render();
    }
  }

  async function abrir() {
    if (!pode('financeiro.lancamentos', 'view')) {
      renderUnavailable('operacoes-cobranca');
      return;
    }
    state.carregando = true;
    render();
    try {
      const contexto = await carregarContextoFinanceiro();
      state.empresas = contexto.empresas || [];
      state.usuariosAtivos = await carregarUsuariosAtivosCobranca();
      if (!state.empresas.some(item => item.id === state.empresaId)) state.empresaId = state.empresas[0]?.id || '';
      await carregarTitulos();
    } catch (erro) {
      state.carregando = false;
      state.erro = erro?.message || 'Não foi possível abrir Cobrança.';
      render();
    }
  }

  function exportar() {
    const linhas = [
      ['Produto', 'Cliente', 'Descrição', 'Vencimento', 'Dias em atraso', 'Status', 'Cobrança'],
      ...titulosFiltrados().map(titulo => [titulo.produto, nomeCliente(titulo), titulo.descricao, titulo.data_vencimento, diasEmAtraso(titulo), statusFinanceiro(titulo), statusCobranca(titulo, state.interacoes)])
    ];
    const csv = linhas.map(linha => linha.map(celula => `"${String(celula ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `cobranca-${hojeIso()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function salvarInteracao(formulario, tipo = state.modalTipo) {
    const usuarioAtual = usuario?.() || {};
    const form = new FormData(formulario);
    const titulo = state.titulos.find(item => item.id === state.selecionadoId);
    let anotacao = String(form.get('anotacao') || '').trim();
    try {
      const registro = await registrarInteracaoCobranca({
        empresa_id: state.empresaId,
        parcela_id: titulo.cobranca_id ? null : titulo.id,
        cobranca_id: titulo.cobranca_id || null,
        tipo,
        anotacao,
        resultado: String(form.get('resultado') || '') || null,
        proxima_acao_em: String(form.get('proxima_acao_em') || '') || null,
        usuario_id: usuarioAtual.id,
        usuario_nome: usuarioAtual.nome || usuarioAtual.email || 'Usuário'
      });
      state.interacoes.unshift(registro);
      state.modalTipo = '';
      state.mensagem = 'Interação registrada no histórico.';
      state.erro = '';
    } catch (erro) {
      state.erro = erro?.message || 'Não foi possível salvar a interação.';
    }
    render();
  }

  async function salvarNovaCobranca(formulario) {
    const campos = new FormData(formulario);
    const responsavel = state.usuariosAtivos.find(item => item.id === campos.get('responsavel_id'));
    if (!responsavel) { state.erro = 'Selecione um usuário ativo como responsável.'; render(); return; }
    try {
      const produto = String(campos.get('produto') || '').trim();
      const novo = await criarCobrancaOperacional({
        empresa_id: state.empresaId,
        cliente_nome: String(campos.get('cliente_nome') || '').trim(),
        produto,
        descricao: campos.get('descricao'),
        data_vencimento: campos.get('data_vencimento'),
        responsavel_id: responsavel.id,
        responsavel_nome: responsavel.nome,
        created_by: (usuario?.() || {}).id
      });
      state.modalTipo = '';
      await carregarTitulos();
      const titulo = state.titulos.find(item => item.cobranca_id === novo.id);
      if (!titulo) throw new Error('Cobrança criada, mas a parcela não foi encontrada na lista. Atualize a página.');
      const usuarioAtual = usuario?.() || {};
      const registro = await registrarInteracaoCobranca({
        empresa_id: state.empresaId,
        parcela_id: null,
        cobranca_id: titulo.id,
        tipo: 'comentario',
        anotacao: `Cobrança criada. Responsável: ${responsavel.nome}.`,
        usuario_id: usuarioAtual.id,
        usuario_nome: usuarioAtual.nome || usuarioAtual.email || 'Usuário',
        responsavel_id: responsavel.id,
        responsavel_nome: responsavel.nome
      });
      state.interacoes.unshift(registro);
      state.selecionadoId = titulo.id;
      state.erro = '';
      state.mensagem = 'Cobrança criada e responsável registrado.';
    } catch (erro) {
      state.erro = erro?.message || 'Não foi possível criar a cobrança.';
    }
    render();
  }

  async function salvarEdicaoCobranca(formulario) {
    const titulo = state.titulos.find(item => item.id === state.selecionadoId);
    if (!pode('financeiro.lancamentos', 'update')) {
      state.erro = 'Seu perfil não tem permissão para editar cobranças.';
      render();
      return;
    }
    const campos = new FormData(formulario);
    const responsavel = state.usuariosAtivos.find(item => item.id === campos.get('responsavel_id'));
    if (!responsavel) {
      state.erro = 'Selecione um responsável ativo.';
      render();
      return;
    }
    const proximaAcaoEm = String(campos.get('proxima_acao_em') || '');
    const idAlvo = titulo.cobranca_id || titulo.id;
    const proximaAcaoAtual = state.interacoes.find(item => (item.cobranca_id === idAlvo || item.parcela_id === idAlvo) && item.proxima_acao_em >= hojeIso())?.proxima_acao_em || '';
    try {
      const dadosAtualizacao = {
        cliente_nome: campos.get('cliente_nome'),
        data_vencimento: campos.get('data_vencimento'),
        produto: campos.get('produto'),
        responsavel_id: responsavel.id,
        responsavel_nome: responsavel.nome,
        status: campos.get('status')
      };
      const atualizado = titulo.cobranca_id
        ? await atualizarCobrancaOperacional(titulo.cobranca_id, dadosAtualizacao)
        : await atualizarTituloFinanceiro(titulo, dadosAtualizacao);
      if (responsavel.nome !== pessoaResponsavel(titulo, state.interacoes)) {
        const usuarioAtual = usuario?.() || {};
        const registro = await registrarInteracaoCobranca({
          empresa_id: state.empresaId,
          parcela_id: titulo.cobranca_id ? null : titulo.id,
          cobranca_id: titulo.cobranca_id || null,
          tipo: 'comentario',
          anotacao: `Responsável atualizado para ${responsavel.nome}.`,
          usuario_id: usuarioAtual.id,
          usuario_nome: usuarioAtual.nome || usuarioAtual.email || 'Usuário',
          responsavel_id: responsavel.id,
          responsavel_nome: responsavel.nome
        });
        state.interacoes.unshift(registro);
      }
      if (proximaAcaoEm && proximaAcaoEm !== proximaAcaoAtual) {
        const usuarioAtual = usuario?.() || {};
        const registro = await registrarInteracaoCobranca({
          empresa_id: state.empresaId,
          parcela_id: titulo.cobranca_id ? null : titulo.id,
          cobranca_id: titulo.cobranca_id || null,
          tipo: 'agendamento',
          anotacao: 'Próxima ação atualizada nos detalhes da cobrança.',
          proxima_acao_em: proximaAcaoEm,
          usuario_id: usuarioAtual.id,
          usuario_nome: usuarioAtual.nome || usuarioAtual.email || 'Usuário',
          responsavel_id: responsavel.id,
          responsavel_nome: responsavel.nome
        });
        state.interacoes.unshift(registro);
      }
      state.titulos = state.titulos.map(item => item.id === titulo.id ? atualizado : item);
      state.mensagem = 'Cobrança atualizada.';
      state.erro = '';
      state.selecionadoId = '';
      state.modalTipo = '';
    } catch (erro) {
      state.erro = erro?.message || 'Não foi possível salvar as alterações.';
    }
    render();
  }

  function conectarEventos() {
    const pagina = document.querySelector('[data-cobranca-page]');
    if (!pagina) return;
    const atualizarTabelaFiltrada = () => {
      state.busca = pagina.querySelector('[name="busca"]')?.value || '';
      state.dataInicio = pagina.querySelector('[name="dataInicio"]')?.value || '';
      state.dataFim = pagina.querySelector('[name="dataFim"]')?.value || '';
      state.responsavel = pagina.querySelector('[name="responsavel"]')?.value || '';
      const tabela = pagina.querySelector('[data-cobranca-table]');
      if (tabela) {
        tabela.innerHTML = renderTabela();
        conectarSelecaoCliente(pagina);
      }
    };
    pagina.querySelector('[name="busca"]')?.addEventListener('input', atualizarTabelaFiltrada);
    ['dataInicio', 'dataFim', 'responsavel'].forEach(nome => {
      pagina.querySelector(`[name="${nome}"]`)?.addEventListener('change', atualizarTabelaFiltrada);
    });
    pagina.querySelector('[data-status-toggle]')?.addEventListener('click', () => {
      state.statusDropdownOpen = !state.statusDropdownOpen;
      render();
    });
    pagina.querySelector('[data-status-toggle]')?.addEventListener('keydown', evento => {
      if (evento.target.closest('[data-status-clear]')) return;
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        state.statusDropdownOpen = !state.statusDropdownOpen;
        render();
      }
    });
    pagina.querySelector('[data-status-clear]')?.addEventListener('click', evento => {
      evento.stopPropagation();
      state.statuses = [];
      render();
    });
    pagina.querySelectorAll('[data-status-option]').forEach(opcao => opcao.addEventListener('click', () => {
      const selecionado = opcao.dataset.statusOption;
      state.statuses = state.statuses.includes(selecionado)
        ? state.statuses.filter(status => status !== selecionado)
        : [...state.statuses, selecionado];
      state.statusDropdownOpen = true;
      render();
    }));
    pagina.querySelector('[name="empresaId"]')?.addEventListener('change', evento => {
      state.empresaId = evento.target.value;
      state.selecionadoId = '';
      carregarTitulos();
    });
    pagina.querySelector('[data-cobranca-action="exportar"]')?.addEventListener('click', exportar);
    pagina.querySelectorAll('[data-cobranca-action="arquivar"], [data-cobranca-action="excluir"]').forEach(botao => botao.addEventListener('click', async () => {
      const excluir = botao.dataset.cobrancaAction === 'excluir';
      const permissao = excluir ? 'delete' : 'update';
      if (!pode('financeiro.lancamentos', permissao)) {
        state.erro = 'Seu perfil não tem permissão para executar esta ação.';
        render();
        return;
      }
      const titulo = state.titulos.find(item => item.id === botao.dataset.id);
      if (!titulo) return;
      if (excluir && !window.confirm(titulo.cobranca_id
        ? `Excluir permanentemente a cobrança de ${nomeCliente(titulo)}?`
        : `Remover ${nomeCliente(titulo)} da carteira? O título original do Financeiro será preservado.`)) return;
      try {
        if (excluir && titulo.cobranca_id) {
          await excluirCobrancaOperacional(titulo.cobranca_id, state.empresaId);
        } else {
          await definirEstadoCobranca({
            empresa_id: state.empresaId,
            parcela_id: titulo.cobranca_id ? null : titulo.id,
            cobranca_id: titulo.cobranca_id || null,
            estado: excluir ? 'excluida' : 'arquivada',
            usuario_id: (usuario?.() || {}).id
          });
        }
        state.titulos = excluir
          ? state.titulos.filter(item => item.id !== titulo.id)
          : state.titulos.map(item => item.id === titulo.id ? { ...item, estado_cobranca: 'arquivada' } : item);
        if (state.selecionadoId === titulo.id) state.selecionadoId = '';
        state.erro = '';
        state.mensagem = excluir ? 'Cobrança removida da carteira.' : 'Cobrança arquivada.';
      } catch (erro) {
        state.erro = erro?.message || 'Não foi possível executar a ação na cobrança.';
      }
      render();
    }));
    pagina.querySelector('[data-cobranca-action="nova"]')?.addEventListener('click', async () => {
      try {
        state.modalTipo = 'nova';
        state.erro = '';
      } catch (erro) { state.erro = erro?.message || 'Não foi possível abrir o cadastro.'; }
      render();
    });
    pagina.querySelector('[data-cobranca-nova-form]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      evento.currentTarget.querySelector('[type="submit"]').disabled = true;
      salvarNovaCobranca(evento.currentTarget);
    });
    pagina.querySelector('[data-cobranca-edicao]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      const botaoSalvar = pagina.querySelector('[data-cobranca-action="salvar-edicao"]');
      if (botaoSalvar) botaoSalvar.disabled = true;
      salvarEdicaoCobranca(evento.currentTarget);
    });
    conectarSelecaoCliente(pagina);
    pagina.querySelector('[data-cobranca-action="fechar-detalhe"]')?.addEventListener('click', () => { state.selecionadoId = ''; render(); });
    pagina.querySelectorAll('[data-cobranca-action="acao"]').forEach(botao => botao.addEventListener('click', () => {
      if (!pode('financeiro.lancamentos', 'update')) {
        state.erro = 'Seu perfil não tem permissão para registrar ações de cobrança.';
        render();
        return;
      }
      state.modalTipo = botao.dataset.tipo || '';
      state.emailPreparado = false;
      state.emailDraft = null;
      state.erro = '';
      render();
    }));
    pagina.querySelector('[data-cobranca-action="cancelar-modal"]')?.addEventListener('click', () => { state.modalTipo = ''; state.emailPreparado = false; state.emailDraft = null; render(); });
    pagina.querySelector('[data-cobranca-form]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      const tipo = state.modalTipo;
      salvarInteracao(evento.currentTarget, tipo);
    });
  }

  function conectarSelecaoCliente(pagina) {
    pagina.querySelectorAll('[data-cobranca-action="selecionar"]').forEach(botao => botao.addEventListener('click', () => {
      state.selecionadoId = botao.dataset.id || '';
      state.mensagem = '';
      render();
    }));
  }

  document.addEventListener('click', evento => {
    if (!state.statusDropdownOpen || evento.target.closest('[data-status-filter]')) return;
    state.statusDropdownOpen = false;
    render();
  });

  return { abrir, navegarParaRota };
}
