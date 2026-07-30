export const FINANCEIRO_SECOES = [
  {
    id: 'dashboard',
    nome: 'Dashboard',
    descricao: 'Visão consolidada do caixa e dos principais indicadores.',
    recurso: 'financeiro.dashboard',
    fase: 7
  },
  {
    id: 'lancamentos',
    nome: 'Lançamentos',
    descricao: 'Contas a pagar, contas a receber, parcelas e baixas.',
    recurso: 'financeiro.lancamentos',
    fase: 3
  },
  {
    id: 'conciliacao',
    nome: 'Conciliação',
    descricao: 'Importação e vínculo rastreável de movimentos bancários.',
    recurso: 'financeiro.conciliacao',
    fase: 5
  },
  {
    id: 'cartoes',
    nome: 'Cartões',
    descricao: 'Compras, parcelamentos, faturas, pagamentos e estornos.',
    recurso: 'financeiro.cartoes',
    fase: 6
  },
  {
    id: 'relatorios',
    nome: 'Relatórios e Fechamento',
    descricao: 'DRE, fluxo de caixa, orçamento, inadimplência e fechamento de períodos.',
    recurso: 'financeiro.relatorios',
    recursosAlternativos: ['financeiro.fechamento'],
    fase: 7
  },
  {
    id: 'cadastros',
    nome: 'Cadastros',
    descricao: 'Pessoas, contas, categorias, centros de custo e contratos.',
    recurso: 'financeiro.cadastros',
    fase: 2
  },
  {
    id: 'configuracoes',
    nome: 'Configurações',
    descricao: 'Empresas, parâmetros, regras de acesso e auditoria.',
    recurso: 'financeiro.configuracoes',
    recursosAlternativos: ['financeiro.auditoria'],
    fase: 1
  }
];

export function podeAcessarSecaoFinanceiro(secao, pode) {
  return [secao.recurso, ...(secao.recursosAlternativos || [])]
    .some(recurso => pode(recurso, 'view'));
}

function nomeEmpresa(empresa = {}) {
  return empresa.nome_fantasia || empresa.razao_social || 'Empresa';
}

function renderSeletorEmpresa({ empresas, empresaId, escapeHtml, escapeAttr }) {
  if (!empresas.length) {
    return `
      <div class="fin-company-empty" role="status">
        Nenhuma empresa está vinculada ao seu usuário.
      </div>
    `;
  }

  return `
    <label class="fin-company-select">
      <span>Empresa</span>
      <select class="config-input" data-fin-action="change-company">
        ${empresas.map(empresa => `
          <option value="${escapeAttr(empresa.id)}" ${empresa.id === empresaId ? 'selected' : ''}>
            ${escapeHtml(nomeEmpresa(empresa))}
          </option>
        `).join('')}
      </select>
    </label>
  `;
}

function renderNavegacao({ secoes, secaoAtiva, escapeHtml, escapeAttr }) {
  return `
    <nav class="fin-section-tabs" aria-label="Navegação do Financeiro">
      ${secoes.map(secao => `
        <button
          class="secondary-btn ${secao.id === secaoAtiva ? 'is-active' : ''}"
          type="button"
          data-fin-route="${escapeAttr(secao.id)}"
          ${secao.id === secaoAtiva ? 'aria-current="page"' : ''}
        >
          ${escapeHtml(secao.nome)}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderMetricaCadastro(label, valor) {
  const valorFormatado = typeof valor === 'number'
    ? valor.toLocaleString('pt-BR')
    : String(valor || 0);

  return `
    <article class="fin-metric-card">
      <span>${label}</span>
      <strong>${valorFormatado}</strong>
    </article>
  `;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function renderCadastros({ state }) {
  const resumo = state.cadastrosResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Pessoas', 'cad_pessoas'],
    ['Classificacoes', 'cad_pessoa_classificacoes'],
    ['Contatos', 'cad_pessoa_contatos'],
    ['Enderecos', 'cad_pessoa_enderecos'],
    ['Documentos', 'cad_pessoa_documentos'],
    ['Contas', 'fin_contas'],
    ['Categorias', 'fin_categorias'],
    ['Centros de custo', 'fin_centros_custo'],
    ['Linhas de negocio', 'fin_linhas_negocio'],
    ['Contratos', 'fin_contratos']
  ];

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Pessoas ativas', resumo.pessoas_ativas)}
        ${renderMetricaCadastro('Clientes', resumo.clientes)}
        ${renderMetricaCadastro('Fornecedores', resumo.fornecedores)}
        ${renderMetricaCadastro('Parceiros', resumo.parceiros)}
        ${renderMetricaCadastro('Contas', resumo.contas)}
        ${renderMetricaCadastro('Contratos', resumo.contratos)}
      </div>
      <div class="fin-foundation-grid">
        ${estruturas.map(([nome, tabela]) => `
          <article>
            <span>${nome}</span>
            <strong>${tabela}</strong>
            <p>Estrutura criada com escopo por empresa, RLS, indices e auditoria.</p>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderLancamentos({ state }) {
  const resumo = state.lancamentosResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Lancamentos', 'fin_lancamentos'],
    ['Parcelas', 'fin_lancamento_parcelas'],
    ['Rateios', 'fin_lancamento_rateios'],
    ['Baixas', 'fin_lancamento_baixas'],
    ['Historico de status', 'fin_lancamento_status_historico'],
    ['Recorrencias', 'fin_lancamento_recorrencias']
  ];

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Em aberto', resumo.em_aberto)}
        ${renderMetricaCadastro('Liquidados', resumo.liquidados)}
        ${renderMetricaCadastro('Cancelados', resumo.cancelados)}
        ${renderMetricaCadastro('Parcelas vencidas', resumo.parcelas_vencidas)}
        ${renderMetricaCadastro('Entradas abertas', formatarMoeda(resumo.valor_entradas_abertas))}
        ${renderMetricaCadastro('Saidas abertas', formatarMoeda(resumo.valor_saidas_abertas))}
      </div>
      <div class="fin-foundation-grid">
        ${estruturas.map(([nome, tabela]) => `
          <article>
            <span>${nome}</span>
            <strong>${tabela}</strong>
            <p>Base operacional criada com empresa, RLS, indices, auditoria e historico.</p>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderConciliacao({ state }) {
  const resumo = state.conciliacaoResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Importacoes', 'fin_extrato_importacoes'],
    ['Movimentos', 'fin_movimentos_bancarios'],
    ['Sugestoes', 'fin_conciliacao_sugestoes'],
    ['Conciliacoes', 'fin_conciliacoes']
  ];

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Importacoes', resumo.importacoes)}
        ${renderMetricaCadastro('Movimentos', resumo.movimentos)}
        ${renderMetricaCadastro('Pendentes', resumo.pendentes)}
        ${renderMetricaCadastro('Sugeridos', resumo.sugeridos)}
        ${renderMetricaCadastro('Conciliados', resumo.conciliados)}
        ${renderMetricaCadastro('Sugestoes pendentes', resumo.sugestoes_pendentes)}
      </div>
      <div class="fin-foundation-grid">
        ${estruturas.map(([nome, tabela]) => `
          <article>
            <span>${nome}</span>
            <strong>${tabela}</strong>
            <p>Base de conciliacao criada com empresa, RLS, indices e auditoria.</p>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDashboard({ state }) {
  const resumo = state.dashboardResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Fluxo de caixa', 'fin_fluxo_caixa_resumo'],
    ['Contas abertas', 'fin_contas_pagar_receber_resumo'],
    ['Inadimplencia', 'fin_inadimplencia_resumo'],
    ['DRE gerencial', 'fin_dre_gerencial_resumo'],
    ['Orcamento', 'fin_orcamento_realizado_resumo'],
    ['Dashboard', 'fin_dashboard_resumo']
  ];

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Realizado no mes', formatarMoeda(resumo.saldo_realizado_mes))}
        ${renderMetricaCadastro('Projetado 30 dias', formatarMoeda(resumo.saldo_projetado_30d))}
        ${renderMetricaCadastro('Inadimplencia', formatarMoeda(resumo.inadimplencia))}
        ${renderMetricaCadastro('Parcelas vencidas', resumo.parcelas_vencidas)}
        ${renderMetricaCadastro('Conciliacao pendente', resumo.conciliacao_pendente)}
        ${renderMetricaCadastro('Periodos fechados', resumo.periodos_fechados)}
      </div>
      <div class="fin-foundation-grid">
        ${estruturas.map(([nome, tabela]) => `
          <article>
            <span>${nome}</span>
            <strong>${tabela}</strong>
            <p>Indicador calculado sobre lancamentos, baixas e movimentos validados por RLS.</p>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

function obterResumoNatureza(lista = [], natureza) {
  return lista.find(item => item.natureza === natureza) || {};
}

function renderRelatoriosFechamento({ state, pode }) {
  const dashboard = state.dashboardResumo?.[state.empresaId] || {};
  const contas = state.contasPagarReceberResumo?.[state.empresaId] || [];
  const entradas = obterResumoNatureza(contas, 'entrada');
  const saidas = obterResumoNatureza(contas, 'saida');
  const fluxoItens = state.fluxoCaixaResumo?.[state.empresaId] || [];
  const dreItens = state.dreResumo?.[state.empresaId] || [];
  const estruturas = [
    ['Execucoes', 'fin_relatorio_execucoes'],
    ['Fechamentos', 'fin_fechamento_periodos'],
    ['Orcamentos', 'fin_orcamentos'],
    ['Bloqueio', 'private.fin_bloquear_periodo_fechado']
  ];

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${pode('financeiro.relatorios', 'view') ? renderMetricaCadastro('Receber aberto', formatarMoeda(entradas.valor_aberto)) : ''}
        ${pode('financeiro.relatorios', 'view') ? renderMetricaCadastro('Pagar aberto', formatarMoeda(saidas.valor_aberto)) : ''}
        ${pode('financeiro.relatorios', 'view') ? renderMetricaCadastro('Receber vencido', formatarMoeda(entradas.valor_vencido)) : ''}
        ${pode('financeiro.relatorios', 'view') ? renderMetricaCadastro('Pagar vencido', formatarMoeda(saidas.valor_vencido)) : ''}
        ${pode('financeiro.fechamento', 'view') ? renderMetricaCadastro('Periodos fechados', dashboard.periodos_fechados) : ''}
        ${pode('financeiro.relatorios', 'view') ? renderMetricaCadastro('Relatorios gerados', dashboard.relatorios_gerados) : ''}
      </div>
      <div class="fin-foundation-grid">
        ${estruturas.map(([nome, tabela]) => `
          <article>
            <span>${nome}</span>
            <strong>${tabela}</strong>
            <p>Base criada para filtros reproduziveis, snapshots, bloqueio de periodo e reabertura auditada.</p>
          </article>
        `).join('')}
        <article>
          <span>Fluxo</span>
          <strong>${fluxoItens.length.toLocaleString('pt-BR')} competencias</strong>
          <p>Realizado e projetado separados por regime para conferencia operacional.</p>
        </article>
        <article>
          <span>DRE</span>
          <strong>${dreItens.length.toLocaleString('pt-BR')} competencias</strong>
          <p>Receitas, despesas e resultado consolidados por competencia.</p>
        </article>
      </div>
    </div>
  `;
}

function renderComplementaresConfiguracoes({ state }) {
  const resumo = state.complementaresResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Patrimonio', 'fin_patrimonios'],
    ['Estoque', 'fin_estoque_itens'],
    ['Movimentos de estoque', 'fin_estoque_movimentos'],
    ['Solicitacoes', 'fin_solicitacoes_compra'],
    ['Recibos', 'fin_recibos'],
    ['Alertas', 'fin_alertas'],
    ['Importacoes especiais', 'fin_importacoes_especiais'],
    ['Itens importados', 'fin_importacao_especial_itens'],
    ['Consolidacoes', 'fin_importacao_especial_consolidacoes'],
    ['Agendamentos', 'fin_alerta_agendamentos'],
    ['Backups', 'fin_backup_execucoes']
  ];

  return `
    <div class="fin-metrics-grid">
      ${renderMetricaCadastro('Patrimonios ativos', resumo.patrimonios_ativos)}
      ${renderMetricaCadastro('Itens de estoque', resumo.itens_estoque)}
      ${renderMetricaCadastro('Estoque baixo', resumo.itens_estoque_baixo)}
      ${renderMetricaCadastro('Compras abertas', resumo.compras_abertas)}
      ${renderMetricaCadastro('Recibos emitidos', resumo.recibos_emitidos)}
      ${renderMetricaCadastro('Alertas abertos', resumo.alertas_abertos)}
      ${renderMetricaCadastro('Importacoes pendentes', resumo.importacoes_pendentes)}
      ${renderMetricaCadastro('Itens com alerta', resumo.importacao_itens_pendentes)}
      ${renderMetricaCadastro('Alertas agendados', resumo.alertas_agendados)}
      ${renderMetricaCadastro('Backups com falha', resumo.backups_falha)}
    </div>
    <div class="fin-foundation-grid">
      ${estruturas.map(([nome, tabela]) => `
        <article>
          <span>${nome}</span>
          <strong>${tabela}</strong>
          <p>Fundacao complementar criada com escopo por empresa, RLS, indices e auditoria.</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderHomologacaoConfiguracoes({ state }) {
  const resumo = state.homologacaoResumo?.[state.empresaId] || {};
  const estruturas = [
    ['Ciclos', 'fin_homologacao_ciclos'],
    ['Checklist', 'fin_homologacao_checklist'],
    ['Divergencias', 'fin_homologacao_divergencias'],
    ['Backup e restore', 'fin_backup_restore_validacoes']
  ];

  return `
    <div class="fin-metrics-grid">
      ${renderMetricaCadastro('Ciclos', resumo.ciclos)}
      ${renderMetricaCadastro('Ciclos abertos', resumo.ciclos_abertos)}
      ${renderMetricaCadastro('Checklist pendente', resumo.checklist_pendente)}
      ${renderMetricaCadastro('Divergencias abertas', resumo.divergencias_abertas)}
      ${renderMetricaCadastro('Backup/restore pendente', resumo.backup_restore_pendente)}
    </div>
    <div class="fin-foundation-grid">
      ${estruturas.map(([nome, tabela]) => `
        <article>
          <span>${nome}</span>
          <strong>${tabela}</strong>
          <p>Base de homologacao e ativacao gradual criada com escopo por empresa, RLS, indices e auditoria.</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderEstadoFundacao({ secao, escapeHtml, pode, state }) {
  if (
    secao.id === 'cadastros'
    || secao.id === 'lancamentos'
    || secao.id === 'conciliacao'
    || secao.id === 'dashboard'
    || secao.id === 'relatorios'
  ) {
    return '';
  }

  if (secao.id === 'configuracoes') {
    return `
      <div class="fin-foundation-grid">
        <article>
          <span>Ativacao</span>
          <strong>${state.moduloAtivo ? 'Ativa' : 'Desativada'}</strong>
          <p>${state.moduloAtivo
            ? 'Modulo liberado em production para usuarios com permissao financeira.'
            : 'O modulo permanece oculto ate a homologacao e a liberacao de um perfil-piloto.'}</p>
        </article>
        <article>
          <span>Segurança</span>
          <strong>RLS por empresa</strong>
          <p>Autenticação isolada não concede acesso aos dados financeiros.</p>
        </article>
        <article>
          <span>${pode('financeiro.auditoria', 'view') ? 'Auditoria' : 'Parâmetros'}</span>
          <strong>${pode('financeiro.auditoria', 'view') ? 'Histórico imutável' : 'Base preparada'}</strong>
          <p>${pode('financeiro.auditoria', 'view')
            ? 'Os eventos respeitam a empresa vinculada e a permissão para dados sensíveis.'
            : 'Moeda, fuso horário e chave de ativação possuem configuração central.'}</p>
        </article>
      </div>
      ${renderComplementaresConfiguracoes({ state })}
      ${renderHomologacaoConfiguracoes({ state })}
    `;
  }

  return `
    <div class="fin-empty-state">
      <span class="fin-empty-icon" aria-hidden="true">◇</span>
      <strong>${escapeHtml(secao.nome)} preparado para a Fase ${secao.fase}</strong>
      <p>${escapeHtml(secao.descricao)}</p>
      <small>Nenhum dado fictício foi criado nesta fundação.</small>
    </div>
  `;
}

export function renderFinanceiroPagina({
  state,
  renderShell,
  escapeHtml,
  escapeAttr
}) {
  const secao = FINANCEIRO_SECOES.find(item => item.id === state.secao) || FINANCEIRO_SECOES[0];
  const secoesPermitidas = FINANCEIRO_SECOES.filter(item => podeAcessarSecaoFinanceiro(item, state.pode));

  let conteudoPrincipal = '';
  if (!secoesPermitidas.length) {
    conteudoPrincipal = `
      <section class="admin-panel">
        <div class="fin-error-state" role="alert">
          <strong>Acesso parcial ao Financeiro</strong>
          <p>Seu usuário possui acesso ao módulo, mas nenhuma área interna foi liberada.</p>
        </div>
      </section>
    `;
  } else if (state.loading) {
    conteudoPrincipal = '<div class="fin-loading" role="status">Carregando estrutura financeira...</div>';
  } else if (state.erro) {
    conteudoPrincipal = `
      <div class="fin-error-state" role="alert">
        <strong>Não foi possível carregar o Financeiro</strong>
        <p>${escapeHtml(state.erro)}</p>
        <button class="secondary-btn" type="button" data-fin-action="retry">Tentar novamente</button>
      </div>
    `;
  } else if (!state.moduloAtivo) {
    conteudoPrincipal = `
      <section class="admin-panel">
        <div class="fin-empty-state" role="status">
          <strong>Financeiro em homologação</strong>
          <p>O módulo permanece desativado até a liberação controlada.</p>
        </div>
      </section>
    `;
  } else {
    conteudoPrincipal = `
      ${renderNavegacao({
        secoes: secoesPermitidas,
        secaoAtiva: secao.id,
        escapeHtml,
        escapeAttr
      })}
      <section class="admin-panel fin-panel">
        <div class="admin-panel-header fin-panel-header">
          <div>
            <div class="fin-title-row">
              <h2>${escapeHtml(secao.nome)}</h2>
              <span class="fin-phase-badge">Fundação</span>
            </div>
            <p>${escapeHtml(secao.descricao)}</p>
          </div>
          ${renderSeletorEmpresa({
            empresas: state.empresas,
            empresaId: state.empresaId,
            escapeHtml,
            escapeAttr
          })}
        </div>
        ${secao.id === 'cadastros'
          ? renderCadastros({ state })
          : secao.id === 'lancamentos'
            ? renderLancamentos({ state })
            : secao.id === 'conciliacao'
              ? renderConciliacao({ state })
              : secao.id === 'dashboard'
                ? renderDashboard({ state })
                : secao.id === 'relatorios'
                  ? renderRelatoriosFechamento({ state, pode: state.pode })
                  : renderEstadoFundacao({ secao, escapeHtml, pode: state.pode, state })}
      </section>
    `;
  }

  return renderShell({
    tituloPagina: 'Financeiro',
    descricaoPagina: 'Controle financeiro interno, seguro e multiempresa.',
    classeConteudo: 'financeiro-page',
    conteudo: conteudoPrincipal
  });
}
