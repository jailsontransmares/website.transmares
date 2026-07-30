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

export const FINANCEIRO_CADASTRO_ABAS = [
  {
    id: 'pessoas',
    nome: 'Pessoas',
    descricao: 'Clientes, fornecedores, parceiros e documentos cadastrais.',
    principal: 'cad_pessoas',
    tabelas: ['cad_pessoas', 'cad_pessoa_classificacoes', 'cad_pessoa_contatos', 'cad_pessoa_enderecos', 'cad_pessoa_documentos']
  },
  {
    id: 'contas',
    nome: 'Contas',
    descricao: 'Contas financeiras por empresa, banco, carteira ou caixa.',
    principal: 'fin_contas',
    tabelas: ['fin_contas']
  },
  {
    id: 'categorias',
    nome: 'Categorias',
    descricao: 'Plano de receitas, despesas e agrupamentos gerenciais.',
    principal: 'fin_categorias',
    tabelas: ['fin_categorias']
  },
  {
    id: 'centros_custo',
    nome: 'Centros de custo',
    descricao: 'Rateio gerencial por unidade, setor, equipe ou operacao.',
    principal: 'fin_centros_custo',
    tabelas: ['fin_centros_custo']
  },
  {
    id: 'linhas_negocio',
    nome: 'Linhas de negocio',
    descricao: 'Segmentos para apuracao por produto, carteira e origem.',
    principal: 'fin_linhas_negocio',
    tabelas: ['fin_linhas_negocio']
  },
  {
    id: 'contratos',
    nome: 'Contratos',
    descricao: 'Contratos financeiros vinculados a pessoas e regras recorrentes.',
    principal: 'fin_contratos',
    tabelas: ['fin_contratos']
  }
];

export const FINANCEIRO_LANCAMENTO_ABAS = [
  {
    id: 'titulos',
    nome: 'Titulos',
    descricao: 'Visao unificada de contas a pagar e contas a receber.',
    principal: 'fin_lancamentos',
    tabelas: ['fin_lancamentos', 'fin_lancamento_status_historico']
  },
  {
    id: 'receber',
    nome: 'A receber',
    descricao: 'Entradas previstas, vencidas, baixadas ou canceladas.',
    principal: 'fin_lancamento_parcelas',
    tabelas: ['fin_lancamentos', 'fin_lancamento_parcelas', 'fin_lancamento_baixas']
  },
  {
    id: 'pagar',
    nome: 'A pagar',
    descricao: 'Saidas previstas, vencidas, liquidadas ou canceladas.',
    principal: 'fin_lancamento_parcelas',
    tabelas: ['fin_lancamentos', 'fin_lancamento_parcelas', 'fin_lancamento_baixas']
  },
  {
    id: 'parcelas',
    nome: 'Parcelas',
    descricao: 'Agenda de vencimentos, valores, status e baixas.',
    principal: 'fin_lancamento_parcelas',
    tabelas: ['fin_lancamento_parcelas']
  },
  {
    id: 'recorrentes',
    nome: 'Recorrencias',
    descricao: 'Regras para gerar lancamentos periodicos controlados.',
    principal: 'fin_lancamento_recorrencias',
    tabelas: ['fin_lancamento_recorrencias']
  },
  {
    id: 'rateios',
    nome: 'Rateios',
    descricao: 'Distribuicao por centro de custo, categoria e linha de negocio.',
    principal: 'fin_lancamento_rateios',
    tabelas: ['fin_lancamento_rateios']
  },
  {
    id: 'baixas',
    nome: 'Baixas',
    descricao: 'Liquidacoes, cancelamentos, comprovantes e auditoria.',
    principal: 'fin_lancamento_baixas',
    tabelas: ['fin_lancamento_baixas', 'fin_lancamento_status_historico']
  }
];

const FINANCEIRO_CONFIG_ABAS = [
  { id: 'parametros', nome: 'Parametros' },
  { id: 'alertas', nome: 'Alertas' },
  { id: 'backups', nome: 'Backups' },
  { id: 'auditoria', nome: 'Auditoria' },
  { id: 'homologacao', nome: 'Homologacao' }
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

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString('pt-BR');
}

function formatarData(valor) {
  if (!valor) return '-';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : String(valor);
}

function formatarCompetencia(valor = '') {
  if (!valor) return '-';

  const [ano, mes] = String(valor).slice(0, 7).split('-');
  return mes && ano ? `${mes}/${ano}` : String(valor);
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function nomePessoaFinanceiro(pessoa = {}) {
  return pessoa.nome_fantasia || pessoa.nome_razao_social || 'Sem pessoa';
}

function renderOptionsFinanceiro(itens = [], valorAtual = '', rotuloVazio = 'Selecione', labelFn = item => item.nome, escapeHtml, escapeAttr) {
  return `
    <option value="">${rotuloVazio}</option>
    ${itens.map(item => `
      <option value="${escapeAttr(item.id)}" ${item.id === valorAtual ? 'selected' : ''}>
        ${escapeHtml(labelFn(item))}
      </option>
    `).join('')}
  `;
}

function statusClasseFinanceiro(status = '') {
  return String(status || '').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function renderAtalhoDashboard({ label, detalhe, rota, permitido }) {
  if (!permitido) return '';

  return `
    <button class="fin-dashboard-action" type="button" data-fin-route="${rota}">
      <strong>${label}</strong>
      <span>${detalhe}</span>
    </button>
  `;
}

function renderListaDashboard(titulo, itens, vazio) {
  return `
    <article class="fin-dashboard-list">
      <div class="fin-dashboard-list-header">
        <strong>${titulo}</strong>
      </div>
      <div class="fin-dashboard-list-body">
        ${itens.length ? itens.join('') : `<p>${vazio}</p>`}
      </div>
    </article>
  `;
}

function renderLinhaResumo(label, valor, detalhe = '') {
  return `
    <div class="fin-dashboard-row">
      <span>${label}</span>
      <strong>${valor}</strong>
      ${detalhe ? `<small>${detalhe}</small>` : ''}
    </div>
  `;
}

function renderCadastrosTabs({ state }) {
  return `
    <nav class="fin-subtabs" aria-label="Cadastros financeiros">
      ${FINANCEIRO_CADASTRO_ABAS.map(aba => `
        <button
          class="fin-subtab ${state.cadastroAba === aba.id ? 'is-active' : ''}"
          type="button"
          data-fin-cadastro-tab="${aba.id}"
          ${state.cadastroAba === aba.id ? 'aria-current="page"' : ''}
        >
          ${aba.nome}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderLancamentosTabs({ state }) {
  return `
    <nav class="fin-subtabs" aria-label="Lancamentos financeiros">
      ${FINANCEIRO_LANCAMENTO_ABAS.map(aba => `
        <button
          class="fin-subtab ${state.lancamentoAba === aba.id ? 'is-active' : ''}"
          type="button"
          data-fin-lancamento-tab="${aba.id}"
          ${state.lancamentoAba === aba.id ? 'aria-current="page"' : ''}
        >
          ${aba.nome}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderConfiguracoesTabs({ state }) {
  return `
    <nav class="fin-subtabs" aria-label="Configuracoes financeiras">
      ${FINANCEIRO_CONFIG_ABAS.map(aba => `
        <button
          class="fin-subtab ${state.configuracaoAba === aba.id ? 'is-active' : ''}"
          type="button"
          data-fin-config-tab="${aba.id}"
          ${state.configuracaoAba === aba.id ? 'aria-current="page"' : ''}
        >
          ${aba.nome}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderCadastroCampo(label, valor) {
  return `
    <div class="fin-cadastro-field">
      <span>${label}</span>
      <strong>${valor}</strong>
    </div>
  `;
}

function renderCadastroFluxo(itens) {
  return `
    <ol class="fin-cadastro-flow">
      ${itens.map(item => `<li>${item}</li>`).join('')}
    </ol>
  `;
}

function obterCadastroPainel(abaId, resumo) {
  const paineis = {
    pessoas: {
      metricas: [
        ['Pessoas', resumo.pessoas],
        ['Ativas', resumo.pessoas_ativas],
        ['Clientes', resumo.clientes],
        ['Fornecedores', resumo.fornecedores],
        ['Parceiros', resumo.parceiros]
      ],
      campos: [
        ['Cadastro principal', 'Documento, nome, tipo e status'],
        ['Classificacoes', 'Cliente, fornecedor e parceiro'],
        ['Contatos', 'E-mail, telefone e responsavel'],
        ['Documentos', 'Referencias e vencimentos']
      ],
      fluxo: ['Cadastrar pessoa', 'Classificar papel financeiro', 'Completar contatos/documentos', 'Vincular em lancamentos e contratos']
    },
    contas: {
      metricas: [
        ['Contas', resumo.contas],
        ['Categorias', resumo.categorias],
        ['Centros de custo', resumo.centros_custo],
        ['Linhas de negocio', resumo.linhas_negocio]
      ],
      campos: [
        ['Conta', 'Banco, caixa ou carteira interna'],
        ['Controle', 'Agencia, numero e saldo inicial'],
        ['Uso', 'Recebimento, pagamento ou ambos'],
        ['Status', 'Ativa, inativa ou arquivada']
      ],
      fluxo: ['Cadastrar conta', 'Definir uso operacional', 'Conciliar movimentos', 'Apurar saldo por empresa']
    },
    categorias: {
      metricas: [
        ['Categorias', resumo.categorias],
        ['Contratos', resumo.contratos],
        ['Contas', resumo.contas],
        ['Linhas de negocio', resumo.linhas_negocio]
      ],
      campos: [
        ['Natureza', 'Receita, despesa ou transferencia'],
        ['Hierarquia', 'Categoria pai e subcategoria'],
        ['DRE', 'Grupo gerencial para relatorio'],
        ['Padrao', 'Categoria sugerida em lancamentos']
      ],
      fluxo: ['Criar categoria', 'Organizar hierarquia', 'Relacionar ao DRE', 'Usar em lancamentos e relatorios']
    },
    centros_custo: {
      metricas: [
        ['Centros de custo', resumo.centros_custo],
        ['Contratos', resumo.contratos],
        ['Categorias', resumo.categorias],
        ['Lancamentos base', resumo.pessoas]
      ],
      campos: [
        ['Centro', 'Unidade, area ou equipe'],
        ['Codigo', 'Identificador interno'],
        ['Responsavel', 'Pessoa ou gestor vinculado'],
        ['Rateio', 'Uso em parcelas e contratos']
      ],
      fluxo: ['Criar centro', 'Definir responsavel', 'Aplicar em rateios', 'Analisar resultado por area']
    },
    linhas_negocio: {
      metricas: [
        ['Linhas de negocio', resumo.linhas_negocio],
        ['Clientes', resumo.clientes],
        ['Parceiros', resumo.parceiros],
        ['Contratos', resumo.contratos]
      ],
      campos: [
        ['Linha', 'Produto, carteira ou origem'],
        ['Agrupamento', 'Segmento comercial/financeiro'],
        ['Importacoes', 'Comissoes e receitas consolidadas'],
        ['Relatorios', 'Resultado por linha']
      ],
      fluxo: ['Criar linha', 'Vincular contratos/importacoes', 'Classificar receitas', 'Comparar resultado']
    },
    contratos: {
      metricas: [
        ['Contratos', resumo.contratos],
        ['Pessoas ativas', resumo.pessoas_ativas],
        ['Contas', resumo.contas],
        ['Categorias', resumo.categorias]
      ],
      campos: [
        ['Parte vinculada', 'Cliente, fornecedor ou parceiro'],
        ['Vigencia', 'Inicio, termino e renovacao'],
        ['Financeiro', 'Valor, categoria e recorrencia'],
        ['Controle', 'Status, anexos e observacoes']
      ],
      fluxo: ['Cadastrar contrato', 'Definir vigencia e regras', 'Gerar lancamentos recorrentes', 'Acompanhar vencimentos']
    }
  };

  return paineis[abaId] || paineis.pessoas;
}

function obterLancamentoPainel(abaId, resumo, contas = []) {
  const receber = obterResumoNatureza(contas, 'entrada');
  const pagar = obterResumoNatureza(contas, 'saida');
  const paineis = {
    titulos: {
      metricas: [
        ['Total', resumo.total_lancamentos],
        ['Em aberto', resumo.em_aberto],
        ['Liquidados', resumo.liquidados],
        ['Cancelados', resumo.cancelados]
      ],
      campos: [
        ['Tipo', 'Entrada, saida ou transferencia'],
        ['Pessoa', 'Cliente, fornecedor ou parceiro'],
        ['Competencia', 'Data gerencial e vencimentos'],
        ['Status', 'Rascunho, aberto, liquidado ou cancelado']
      ],
      fluxo: ['Criar titulo', 'Gerar parcelas', 'Aplicar rateio', 'Baixar ou conciliar']
    },
    receber: {
      metricas: [
        ['Parcelas abertas', receber.parcelas_abertas],
        ['Vencidas', receber.vencidas],
        ['A vencer', receber.a_vencer],
        ['Valor aberto', formatarMoeda(receber.valor_aberto)]
      ],
      campos: [
        ['Origem', 'Receita manual, contrato ou importacao'],
        ['Carteira', 'Conta financeira de recebimento'],
        ['Aging', 'Vencido, hoje e proximos vencimentos'],
        ['Baixa', 'Recebimento total, parcial ou ajuste']
      ],
      fluxo: ['Registrar receita', 'Conferir vencimentos', 'Receber valor', 'Conciliar no banco']
    },
    pagar: {
      metricas: [
        ['Parcelas abertas', pagar.parcelas_abertas],
        ['Vencidas', pagar.vencidas],
        ['A vencer', pagar.a_vencer],
        ['Valor aberto', formatarMoeda(pagar.valor_aberto)]
      ],
      campos: [
        ['Origem', 'Despesa manual, contrato ou compra'],
        ['Conta', 'Conta financeira de pagamento'],
        ['Aprovacao', 'Conferencia antes da baixa'],
        ['Comprovante', 'Documento vinculado na baixa']
      ],
      fluxo: ['Registrar despesa', 'Conferir vencimento', 'Pagar parcela', 'Anexar comprovante']
    },
    parcelas: {
      metricas: [
        ['Em aberto', resumo.em_aberto],
        ['Vencidas', resumo.parcelas_vencidas],
        ['Baixas', resumo.baixas_confirmadas],
        ['Liquidados', resumo.liquidados]
      ],
      campos: [
        ['Vencimento', 'Agenda operacional'],
        ['Valor', 'Principal, juros, multa e desconto'],
        ['Status', 'Aberta, parcial, liquidada ou cancelada'],
        ['Baixas', 'Historico de liquidacoes']
      ],
      fluxo: ['Gerar parcela', 'Monitorar vencimento', 'Executar baixa', 'Atualizar saldo']
    },
    recorrentes: {
      metricas: [
        ['Titulos base', resumo.total_lancamentos],
        ['Em aberto', resumo.em_aberto],
        ['Contratos', resumo.liquidados],
        ['Cancelados', resumo.cancelados]
      ],
      campos: [
        ['Periodicidade', 'Mensal, anual ou personalizada'],
        ['Proxima geracao', 'Data de criacao do proximo titulo'],
        ['Limite', 'Quantidade ou data final'],
        ['Origem', 'Contrato, regra manual ou configuracao']
      ],
      fluxo: ['Definir regra', 'Validar proxima execucao', 'Gerar titulo', 'Auditar historico']
    },
    rateios: {
      metricas: [
        ['Rateios base', resumo.total_lancamentos],
        ['Categorias', resumo.em_aberto],
        ['Baixas', resumo.baixas_confirmadas],
        ['Liquidados', resumo.liquidados]
      ],
      campos: [
        ['Percentual', 'Distribuicao por parcela/titulo'],
        ['Centro de custo', 'Area responsavel'],
        ['Linha de negocio', 'Origem gerencial'],
        ['Categoria', 'DRE e relatorios']
      ],
      fluxo: ['Criar rateio', 'Conferir soma', 'Aplicar em relatorios', 'Auditar alteracoes']
    },
    baixas: {
      metricas: [
        ['Baixas confirmadas', resumo.baixas_confirmadas],
        ['Liquidados', resumo.liquidados],
        ['Entradas abertas', formatarMoeda(resumo.valor_entradas_abertas)],
        ['Saidas abertas', formatarMoeda(resumo.valor_saidas_abertas)]
      ],
      campos: [
        ['Forma', 'Pix, boleto, transferencia, dinheiro ou cartao'],
        ['Conta', 'Conta financeira movimentada'],
        ['Comprovante', 'Referencia ao documento'],
        ['Auditoria', 'Usuario, data e alteracoes']
      ],
      fluxo: ['Selecionar parcela', 'Informar valor e conta', 'Confirmar baixa', 'Conciliar movimento']
    }
  };

  return paineis[abaId] || paineis.titulos;
}

function renderCadastroSelectPessoas(pessoas = [], escapeHtml, escapeAttr) {
  return renderOptionsFinanceiro(
    pessoas.filter(item => item.status === 'ativo'),
    '',
    'Selecione uma pessoa',
    nomePessoaFinanceiro,
    escapeHtml,
    escapeAttr
  );
}

function renderCadastroForm({ abaId, operacional, escapeHtml, escapeAttr }) {
  const desabilitado = operacional.saving ? 'disabled' : '';
  const comuns = {
    pessoas: `
      <label><span>Tipo</span><select class="config-input" name="tipo_pessoa" ${desabilitado}>${['sem_documento', 'pf', 'pj'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Nome/Razao social</span><input class="config-input" name="nome_razao_social" required ${desabilitado}></label>
      <label><span>Nome fantasia</span><input class="config-input" name="nome_fantasia" ${desabilitado}></label>
      <label><span>CPF</span><input class="config-input" name="cpf" maxlength="14" ${desabilitado}></label>
      <label><span>CNPJ</span><input class="config-input" name="cnpj" maxlength="18" ${desabilitado}></label>
      <label class="fin-check-field"><input type="checkbox" name="cliente" ${desabilitado}><span>Cliente</span></label>
      <label class="fin-check-field"><input type="checkbox" name="fornecedor" ${desabilitado}><span>Fornecedor</span></label>
      <label class="fin-check-field"><input type="checkbox" name="parceiro" ${desabilitado}><span>Parceiro</span></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado}></label>
    `,
    contas: `
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado}>${['banco', 'caixa', 'carteira', 'cartao'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Banco</span><input class="config-input" name="banco" ${desabilitado}></label>
      <label><span>Agencia</span><input class="config-input" name="agencia" ${desabilitado}></label>
      <label><span>Conta</span><input class="config-input" name="conta" ${desabilitado}></label>
      <label><span>Chave Pix</span><input class="config-input" name="chave_pix" ${desabilitado}></label>
      <label><span>Saldo inicial</span><input class="config-input" name="saldo_inicial" type="number" step="0.01" value="0" ${desabilitado}></label>
      <label><span>Moeda</span><input class="config-input" name="moeda" value="BRL" maxlength="3" ${desabilitado}></label>
      <label class="fin-check-field"><input type="checkbox" name="sensivel" ${desabilitado}><span>Sensivel</span></label>
    `,
    categorias: `
      <label><span>Codigo</span><input class="config-input" name="codigo" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label><span>Natureza</span><select class="config-input" name="natureza" ${desabilitado}>${['entrada', 'saida', 'transferencia'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Categoria pai</span><select class="config-input" name="categoria_pai_id" ${desabilitado}>${renderOptionsFinanceiro(operacional.categorias, '', 'Sem pai', item => item.nome, escapeHtml, escapeAttr)}</select></label>
      <label><span>DRE grupo</span><input class="config-input" name="dre_grupo" ${desabilitado}></label>
      <label><span>Ordem</span><input class="config-input" name="ordem" type="number" value="0" ${desabilitado}></label>
    `,
    centros_custo: `
      <label><span>Codigo</span><input class="config-input" name="codigo" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" ${desabilitado}></label>
      <label><span>Ordem</span><input class="config-input" name="ordem" type="number" value="0" ${desabilitado}></label>
    `,
    linhas_negocio: `
      <label><span>Codigo</span><input class="config-input" name="codigo" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" ${desabilitado}></label>
      <label><span>Ordem</span><input class="config-input" name="ordem" type="number" value="0" ${desabilitado}></label>
    `,
    contratos: `
      <label><span>Pessoa</span><select class="config-input" name="pessoa_id" required ${desabilitado}>${renderCadastroSelectPessoas(operacional.pessoas, escapeHtml, escapeAttr)}</select></label>
      <label><span>Numero</span><input class="config-input" name="numero" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" required ${desabilitado}></label>
      <label><span>Inicio</span><input class="config-input" name="data_inicio" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label><span>Fim</span><input class="config-input" name="data_fim" type="date" ${desabilitado}></label>
      <label><span>Valor previsto</span><input class="config-input" name="valor_previsto" type="number" step="0.01" ${desabilitado}></label>
    `
  };

  return `
    <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-form="cadastro">
      <div class="fin-form-grid">${comuns[abaId] || comuns.pessoas}</div>
      <div class="fin-modal-actions">
        <button class="secondary-btn" type="button" data-fin-action="close-cadastro-modal" ${desabilitado}>Cancelar</button>
        <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar cadastro'}</button>
      </div>
    </form>
  `;
}

function renderCadastroModal({ aba, operacional, escapeHtml, escapeAttr }) {
  if (!operacional.modalCadastroAberto) return '';

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="Incluir cadastro">
        <div class="fin-modal-header">
          <div>
            <strong>Incluir cadastro</strong>
            <p>${escapeHtml(aba.nome)} - ${escapeHtml(aba.descricao)}</p>
          </div>
          <button
            class="secondary-btn"
            type="button"
            data-fin-action="close-cadastro-modal"
            aria-label="Fechar modal"
            ${operacional.saving ? 'disabled' : ''}
          >
            Fechar
          </button>
        </div>
        ${renderCadastroForm({ abaId: aba.id, operacional, escapeHtml, escapeAttr })}
      </section>
    </div>
  `;
}

function renderCadastroLista({ abaId, operacional, escapeHtml, escapeAttr }) {
  const listas = {
    pessoas: operacional.pessoas,
    contas: operacional.contas,
    categorias: operacional.categorias,
    centros_custo: operacional.centrosCusto,
    linhas_negocio: operacional.linhasNegocio,
    contratos: operacional.contratos
  };
  const itens = listas[abaId] || [];
  const titulo = FINANCEIRO_CADASTRO_ABAS.find(item => item.id === abaId)?.nome || 'Cadastros';

  if (!itens.length) return `<div class="fin-operational-empty">Nenhum registro em ${titulo}.</div>`;

  const linhas = {
    pessoas: item => [nomePessoaFinanceiro(item), item.classificacoes?.join(', ') || 'Sem classificacao', item.status],
    contas: item => [item.nome, `${item.tipo} | ${item.moeda}`, item.status],
    categorias: item => [item.nome, `${item.natureza}${item.codigo ? ` | ${item.codigo}` : ''}`, item.status],
    centros_custo: item => [item.nome, item.codigo || item.descricao || 'Sem codigo', item.status],
    linhas_negocio: item => [item.nome, item.codigo || item.descricao || 'Sem codigo', item.status],
    contratos: item => [item.descricao, item.pessoa ? nomePessoaFinanceiro(item.pessoa) : 'Sem pessoa', item.status]
  };

  return renderConfigLista({
    titulo,
    itens,
    vazio: `Nenhum registro em ${titulo}.`,
    escapeHtml,
    linhas: item => linhas[abaId](item),
    acoes: item => item.status !== 'arquivado'
      ? `<button class="secondary-btn danger" type="button" data-fin-cadastro-action="arquivar" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Arquivar</button>`
      : ''
  });
}

function renderCadastros({ state, escapeHtml, escapeAttr }) {
  const resumo = state.cadastrosResumo?.[state.empresaId] || {};
  const aba = FINANCEIRO_CADASTRO_ABAS.find(item => item.id === state.cadastroAba) || FINANCEIRO_CADASTRO_ABAS[0];
  const painel = obterCadastroPainel(aba.id, resumo);
  const operacional = state.cadastrosOperacional || {};

  return `
    <div class="fin-cadastros-layout">
      ${renderCadastrosTabs({ state })}
      <div class="fin-metrics-grid">
        ${painel.metricas.map(([label, valor]) => renderMetricaCadastro(label, valor)).join('')}
      </div>
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${operacional.loading
        ? '<div class="fin-loading" role="status">Carregando cadastros...</div>'
        : `
          <div class="fin-operational-toolbar">
            <div>
              <strong>${escapeHtml(aba.nome)}</strong>
              <p>${escapeHtml(aba.descricao)}</p>
            </div>
            <button class="save-btn" type="button" data-fin-action="open-cadastro-modal" ${operacional.loading ? 'disabled' : ''}>
              Incluir cadastro
            </button>
          </div>
          ${renderCadastroLista({ abaId: aba.id, operacional, escapeHtml, escapeAttr })}
          ${renderCadastroModal({ aba, operacional, escapeHtml, escapeAttr })}
        `}
    </div>
  `;
}

function renderLancamentoForm({ operacional, escapeHtml, escapeAttr }) {
  const desabilitado = operacional.saving ? 'disabled' : '';

  return `
    <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-form="lancamento">
      <div class="fin-form-grid">
        <label>
          <span>Natureza</span>
          <select class="config-input" name="natureza" required ${desabilitado}>
            <option value="entrada">A receber</option>
            <option value="saida">A pagar</option>
          </select>
        </label>
        <label class="fin-form-wide">
          <span>Descricao</span>
          <input class="config-input" name="descricao" type="text" maxlength="180" required ${desabilitado}>
        </label>
        <label>
          <span>Valor total</span>
          <input class="config-input" name="valor_total" type="number" min="0.01" step="0.01" required ${desabilitado}>
        </label>
        <label>
          <span>Parcelas</span>
          <input class="config-input" name="total_parcelas" type="number" min="1" max="36" step="1" value="1" required ${desabilitado}>
        </label>
        <label>
          <span>Emissao</span>
          <input class="config-input" name="data_emissao" type="date" value="${hojeIso()}" ${desabilitado}>
        </label>
        <label>
          <span>Competencia</span>
          <input class="config-input" name="data_competencia" type="month" value="${hojeIso().slice(0, 7)}" required ${desabilitado}>
        </label>
        <label>
          <span>Primeiro vencimento</span>
          <input class="config-input" name="data_vencimento" type="date" value="${hojeIso()}" required ${desabilitado}>
        </label>
        <label>
          <span>Pessoa</span>
          <select class="config-input" name="pessoa_id" ${desabilitado}>
            ${renderOptionsFinanceiro(operacional.pessoas, '', 'Sem pessoa', nomePessoaFinanceiro, escapeHtml, escapeAttr)}
          </select>
        </label>
        <label>
          <span>Conta</span>
          <select class="config-input" name="conta_id" ${desabilitado}>
            ${renderOptionsFinanceiro(operacional.contas, '', 'Sem conta', item => item.nome || 'Conta', escapeHtml, escapeAttr)}
          </select>
        </label>
        <label>
          <span>Categoria</span>
          <select class="config-input" name="categoria_id" ${desabilitado}>
            ${renderOptionsFinanceiro(operacional.categorias, '', 'Sem categoria', item => item.nome || 'Categoria', escapeHtml, escapeAttr)}
          </select>
        </label>
        <label>
          <span>Centro de custo</span>
          <select class="config-input" name="centro_custo_id" ${desabilitado}>
            ${renderOptionsFinanceiro(operacional.centrosCusto, '', 'Sem centro', item => item.nome || 'Centro', escapeHtml, escapeAttr)}
          </select>
        </label>
        <label>
          <span>Linha de negocio</span>
          <select class="config-input" name="linha_negocio_id" ${desabilitado}>
            ${renderOptionsFinanceiro(operacional.linhasNegocio, '', 'Sem linha', item => item.nome || 'Linha', escapeHtml, escapeAttr)}
          </select>
        </label>
        <label>
          <span>Forma</span>
          <input class="config-input" name="forma_pagamento" type="text" maxlength="60" ${desabilitado}>
        </label>
        <label class="fin-form-wide">
          <span>Observacoes</span>
          <input class="config-input" name="observacoes" type="text" maxlength="240" ${desabilitado}>
        </label>
        <label class="fin-check-field">
          <input type="checkbox" name="recorrente" ${desabilitado}>
          <span>Lancamento recorrente</span>
        </label>
        <label>
          <span>Periodicidade</span>
          <select class="config-input" name="periodicidade" ${desabilitado}>
            ${['mensal', 'semanal', 'quinzenal', 'bimestral', 'trimestral', 'semestral', 'anual'].map(item => `<option value="${item}">${item}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Inicio recorrencia</span>
          <input class="config-input" name="recorrencia_inicio" type="date" value="${hojeIso()}" ${desabilitado}>
        </label>
        <label>
          <span>Fim recorrencia</span>
          <input class="config-input" name="recorrencia_fim" type="date" ${desabilitado}>
        </label>
      </div>
      <div class="fin-modal-actions">
        <button class="secondary-btn" type="button" data-fin-action="close-lancamento-modal" ${desabilitado}>Cancelar</button>
        <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar lancamento'}</button>
      </div>
    </form>
  `;
}

function renderLancamentoModal({ operacional, escapeHtml, escapeAttr }) {
  if (!operacional.modalLancamentoAberto) return '';

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="Incluir lancamento">
        <div class="fin-modal-header">
          <div>
            <strong>Incluir lancamento</strong>
            <p>Registre o titulo e, se necessario, marque como recorrente.</p>
          </div>
          <button
            class="secondary-btn"
            type="button"
            data-fin-action="close-lancamento-modal"
            aria-label="Fechar modal"
            ${operacional.saving ? 'disabled' : ''}
          >
            Fechar
          </button>
        </div>
        ${renderLancamentoForm({ operacional, escapeHtml, escapeAttr })}
      </section>
    </div>
  `;
}

function renderLancamentosTabela({ lancamentos, operacional, escapeHtml, escapeAttr }) {
  if (!lancamentos.length) {
    return '<div class="fin-operational-empty">Nenhum titulo encontrado para esta empresa.</div>';
  }

  return `
    <div class="fin-table-wrap">
      <table class="fin-data-table">
        <thead>
          <tr>
            <th>Descricao</th>
            <th>Natureza</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${lancamentos.map(item => `
            <tr>
              <td>
                <strong>${escapeHtml(item.descricao)}</strong>
                <small>${escapeHtml(nomePessoaFinanceiro(item.pessoa))}</small>
              </td>
              <td>${item.natureza === 'saida' ? 'A pagar' : 'A receber'}</td>
              <td>${formatarData(item.data_vencimento)}</td>
              <td>${formatarMoeda(item.valor_total)}</td>
              <td><span class="fin-status ${statusClasseFinanceiro(item.status)}">${escapeHtml(item.status)}</span></td>
              <td>
                <button
                  class="secondary-btn danger"
                  type="button"
                  data-fin-action="cancelar-lancamento"
                  data-lancamento-id="${escapeAttr(item.id)}"
                  ${operacional.saving || ['cancelado', 'liquidado'].includes(item.status) ? 'disabled' : ''}
                >
                  Cancelar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderParcelasTabela({ parcelas, operacional, escapeHtml, escapeAttr }) {
  if (!parcelas.length) {
    return '<div class="fin-operational-empty">Nenhuma parcela encontrada para esta aba.</div>';
  }

  return `
    <div class="fin-table-wrap">
      <table class="fin-data-table">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Titulo</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Baixa</th>
          </tr>
        </thead>
        <tbody>
          ${parcelas.map(item => {
            const lancamento = item.lancamento || {};
            const baixavel = ['aberta', 'parcial'].includes(item.status) && !['cancelado', 'liquidado'].includes(lancamento.status);
            return `
              <tr>
                <td>${item.numero}/${item.total}</td>
                <td>
                  <strong>${escapeHtml(lancamento.descricao || 'Titulo')}</strong>
                  <small>${lancamento.natureza === 'saida' ? 'A pagar' : 'A receber'}</small>
                </td>
                <td>${formatarData(item.data_vencimento)}</td>
                <td>${formatarMoeda(item.valor)}</td>
                <td><span class="fin-status ${statusClasseFinanceiro(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>
                  ${baixavel ? `
                    <form class="fin-baixa-form" data-fin-form="baixa">
                      <input type="hidden" name="lancamento_id" value="${escapeAttr(item.lancamento_id)}">
                      <input type="hidden" name="parcela_id" value="${escapeAttr(item.id)}">
                      <input class="config-input" name="data_baixa" type="date" value="${hojeIso()}" aria-label="Data da baixa" ${operacional.saving ? 'disabled' : ''}>
                      <input class="config-input" name="valor_principal" type="number" min="0.01" step="0.01" value="${escapeAttr(item.valor)}" aria-label="Valor da baixa" ${operacional.saving ? 'disabled' : ''}>
                      <select class="config-input" name="conta_id" aria-label="Conta da baixa" ${operacional.saving ? 'disabled' : ''}>
                        ${renderOptionsFinanceiro(operacional.contas, lancamento.conta_id || '', 'Sem conta', conta => conta.nome || 'Conta', escapeHtml, escapeAttr)}
                      </select>
                      <input class="config-input" name="forma_pagamento" type="text" maxlength="60" placeholder="Forma" aria-label="Forma de pagamento" ${operacional.saving ? 'disabled' : ''}>
                      <button class="save-btn" type="submit" ${operacional.saving ? 'disabled' : ''}>Baixar</button>
                    </form>
                  ` : '-'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRecorrencias({ operacional, escapeHtml }) {
  return `
    <div class="fin-operational-grid">
      ${renderListaSimplesFinanceira({
        titulo: 'Recorrencias ativas',
        itens: operacional.recorrencias,
        vazio: 'Nenhuma recorrencia cadastrada.',
        linhas: item => [
          item.lancamento?.descricao || 'Modelo',
          item.periodicidade,
          `Proxima: ${formatarData(item.proxima_geracao)}`,
          item.status
        ],
        escapeHtml
      })}
    </div>
  `;
}

function renderListaSimplesFinanceira({ titulo, itens, vazio, linhas, escapeHtml }) {
  return `
    <article class="fin-simple-list">
      <strong>${titulo}</strong>
      ${itens.length ? `
        <div>
          ${itens.map(item => `
            <div class="fin-simple-row">
              ${linhas(item).map(valor => `<span>${escapeHtml(valor)}</span>`).join('')}
            </div>
          `).join('')}
        </div>
      ` : `<p>${vazio}</p>`}
    </article>
  `;
}

function renderLancamentosConteudoAba({ abaId, operacional, escapeHtml, escapeAttr }) {
  const parcelasPorNatureza = natureza => operacional.parcelas.filter(parcela => parcela.lancamento?.natureza === natureza);

  if (abaId === 'receber') {
    return renderParcelasTabela({ parcelas: parcelasPorNatureza('entrada'), operacional, escapeHtml, escapeAttr });
  }

  if (abaId === 'pagar') {
    return renderParcelasTabela({ parcelas: parcelasPorNatureza('saida'), operacional, escapeHtml, escapeAttr });
  }

  if (abaId === 'parcelas') {
    return renderParcelasTabela({ parcelas: operacional.parcelas, operacional, escapeHtml, escapeAttr });
  }

  if (abaId === 'recorrentes') {
    return renderRecorrencias({ operacional, escapeHtml, escapeAttr });
  }

  if (abaId === 'rateios') {
    return renderListaSimplesFinanceira({
      titulo: 'Rateios',
      itens: operacional.rateios,
      vazio: 'Nenhum rateio registrado.',
      linhas: item => [
        item.lancamento?.descricao || 'Titulo',
        item.categoria?.nome || 'Sem categoria',
        item.centroCusto?.nome || 'Sem centro',
        formatarMoeda(item.valor)
      ],
      escapeHtml
    });
  }

  if (abaId === 'baixas') {
    return renderListaSimplesFinanceira({
      titulo: 'Baixas confirmadas',
      itens: operacional.baixas,
      vazio: 'Nenhuma baixa registrada.',
      linhas: item => [
        item.lancamento?.descricao || 'Titulo',
        formatarData(item.data_baixa),
        item.conta?.nome || 'Sem conta',
        formatarMoeda(item.valor_total || item.valor_principal)
      ],
      escapeHtml
    });
  }

  return `
    ${renderLancamentosTabela({ lancamentos: operacional.lancamentos, operacional, escapeHtml, escapeAttr })}
  `;
}

function renderLancamentos({ state, escapeHtml, escapeAttr }) {
  const resumo = state.lancamentosResumo?.[state.empresaId] || {};
  const contas = state.contasPagarReceberResumo?.[state.empresaId] || [];
  const aba = FINANCEIRO_LANCAMENTO_ABAS.find(item => item.id === state.lancamentoAba) || FINANCEIRO_LANCAMENTO_ABAS[0];
  const painel = obterLancamentoPainel(aba.id, resumo, contas);
  const operacional = state.lancamentosOperacional || {};

  return `
    <div class="fin-cadastros-layout">
      ${renderLancamentosTabs({ state })}
      <div class="fin-metrics-grid">
        ${painel.metricas.map(([label, valor]) => renderMetricaCadastro(label, valor)).join('')}
      </div>
      <div class="fin-operational-toolbar">
        <div>
          <strong>${escapeHtml(aba.nome)}</strong>
          <p>${escapeHtml(aba.descricao)}</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-lancamento-modal" ${operacional.loading ? 'disabled' : ''}>
            Incluir lancamento
          </button>
          <button class="secondary-btn" type="button" data-fin-action="refresh-lancamentos" ${operacional.loading ? 'disabled' : ''}>
            Atualizar
          </button>
        </div>
      </div>
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${operacional.loading
        ? '<div class="fin-loading" role="status">Carregando lancamentos...</div>'
        : renderLancamentosConteudoAba({ abaId: aba.id, operacional, escapeHtml, escapeAttr })}
      ${renderLancamentoModal({ operacional, escapeHtml, escapeAttr })}
    </div>
  `;
}

function labelLancamentoConciliacao(item = {}) {
  return `${item.descricao || 'Titulo'} - ${formatarMoeda(item.valor_total)} - ${formatarData(item.data_vencimento)}`;
}

function labelParcelaConciliacao(item = {}) {
  const lancamento = item.lancamento || {};
  return `${lancamento.descricao || 'Parcela'} ${item.numero || 1}/${item.total || 1} - ${formatarMoeda(item.valor)} - ${formatarData(item.data_vencimento)}`;
}

function labelMovimentoConciliacao(item = {}) {
  return `${formatarData(item.data_movimento)} - ${item.descricao || 'Movimento'} - ${formatarMoeda(item.valor)}`;
}

function renderConciliacaoLista({ titulo, itens, vazio, escapeHtml, linhas, acoes = () => '' }) {
  return renderConfigLista({ titulo, itens, vazio, escapeHtml, linhas, acoes });
}

function renderConciliacaoModal({ operacional, tipo, escapeHtml, escapeAttr }) {
  if (!tipo) return '';

  const desabilitado = operacional.saving ? 'disabled' : '';
  const importacoesAtivas = operacional.importacoes.filter(item => !['cancelado', 'erro'].includes(item.status));
  const movimentosAbertos = operacional.movimentos.filter(item => ['pendente', 'sugerido'].includes(item.status));
  const parcelasAtivas = operacional.parcelas.filter(item => !['cancelada'].includes(item.status));
  const titulos = {
    importacao: 'Nova importacao',
    movimento: 'Novo movimento',
    sugestao: 'Nova sugestao',
    conciliacao: 'Nova conciliacao'
  };
  const campos = {
    importacao: `
      <label><span>Conta</span><select class="config-input" name="conta_id" required ${desabilitado}>${renderOptionsFinanceiro(operacional.contas, '', 'Selecione uma conta', item => item.nome || 'Conta', escapeHtml, escapeAttr)}</select></label>
      <label><span>Formato</span><select class="config-input" name="formato" ${desabilitado}>${['ofx', 'csv'].map(item => `<option value="${item}">${item.toUpperCase()}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Nome do arquivo</span><input class="config-input" name="nome_arquivo" required ${desabilitado}></label>
      <label><span>Periodo inicio</span><input class="config-input" name="periodo_inicio" type="date" ${desabilitado}></label>
      <label><span>Periodo fim</span><input class="config-input" name="periodo_fim" type="date" ${desabilitado}></label>
    `,
    movimento: `
      <label><span>Importacao</span><select class="config-input" name="importacao_id" required ${desabilitado}>${renderOptionsFinanceiro(importacoesAtivas, '', 'Selecione uma importacao', item => `${item.nome_arquivo} - ${item.conta?.nome || 'Conta'}`, escapeHtml, escapeAttr)}</select></label>
      <label><span>Conta</span><select class="config-input" name="conta_id" required ${desabilitado}>${renderOptionsFinanceiro(operacional.contas, '', 'Selecione uma conta', item => item.nome || 'Conta', escapeHtml, escapeAttr)}</select></label>
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado}><option value="credito">Credito</option><option value="debito">Debito</option></select></label>
      <label><span>Data</span><input class="config-input" name="data_movimento" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" required ${desabilitado}></label>
      <label><span>Valor</span><input class="config-input" name="valor" type="number" min="0.01" step="0.01" required ${desabilitado}></label>
      <label><span>Documento</span><input class="config-input" name="documento" ${desabilitado}></label>
      <label><span>Saldo apos</span><input class="config-input" name="saldo_apos" type="number" step="0.01" ${desabilitado}></label>
    `,
    sugestao: `
      <label class="fin-form-wide"><span>Movimento</span><select class="config-input" name="movimento_id" required ${desabilitado}>${renderOptionsFinanceiro(movimentosAbertos, '', 'Selecione um movimento', labelMovimentoConciliacao, escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Parcela/titulo</span><select class="config-input" name="parcela_id" required ${desabilitado}>${renderOptionsFinanceiro(parcelasAtivas, '', 'Selecione uma parcela', labelParcelaConciliacao, escapeHtml, escapeAttr)}</select></label>
      <label><span>Score</span><input class="config-input" name="score" type="number" min="0" max="1" step="0.01" value="0.85" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Observacao</span><input class="config-input" name="observacao" ${desabilitado}></label>
    `,
    conciliacao: `
      <label class="fin-form-wide"><span>Movimento</span><select class="config-input" name="movimento_id" required ${desabilitado}>${renderOptionsFinanceiro(movimentosAbertos, '', 'Selecione um movimento', labelMovimentoConciliacao, escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Parcela/titulo</span><select class="config-input" name="parcela_id" required ${desabilitado}>${renderOptionsFinanceiro(parcelasAtivas, '', 'Selecione uma parcela', labelParcelaConciliacao, escapeHtml, escapeAttr)}</select></label>
      <label><span>Valor conciliado</span><input class="config-input" name="valor_conciliado" type="number" min="0.01" step="0.01" ${desabilitado}></label>
      <label><span>Data conciliacao</span><input class="config-input" name="data_conciliacao" type="date" value="${hojeIso()}" ${desabilitado}></label>
    `
  };

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulos[tipo] || 'Conciliacao')}">
        <div class="fin-modal-header">
          <div>
            <strong>${escapeHtml(titulos[tipo] || 'Conciliacao')}</strong>
            <p>Preencha os dados para atualizar a conciliacao bancaria da empresa selecionada.</p>
          </div>
          <button class="secondary-btn" type="button" data-fin-action="close-conciliacao-modal" ${desabilitado}>Fechar</button>
        </div>
        <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-conciliacao-form="${escapeAttr(tipo)}">
          <div class="fin-form-grid">${campos[tipo] || ''}</div>
          <div class="fin-modal-actions">
            <button class="secondary-btn" type="button" data-fin-action="close-conciliacao-modal" ${desabilitado}>Cancelar</button>
            <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderConciliacao({ state, escapeHtml, escapeAttr }) {
  const resumo = state.conciliacaoResumo?.[state.empresaId] || {};
  const operacional = state.conciliacaoOperacional || {};
  const desabilitado = operacional.loading || operacional.saving ? 'disabled' : '';

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
      <div class="fin-operational-toolbar">
        <div>
          <strong>Conciliacao bancaria</strong>
          <p>Importacoes, movimentos, sugestoes e vinculos confirmados.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-conciliacao-modal" data-conciliacao-modal="importacao" ${desabilitado}>Nova importacao</button>
          <button class="secondary-btn" type="button" data-fin-action="open-conciliacao-modal" data-conciliacao-modal="movimento" ${desabilitado}>Novo movimento</button>
          <button class="secondary-btn" type="button" data-fin-action="open-conciliacao-modal" data-conciliacao-modal="sugestao" ${desabilitado}>Nova sugestao</button>
          <button class="secondary-btn" type="button" data-fin-action="open-conciliacao-modal" data-conciliacao-modal="conciliacao" ${desabilitado}>Nova conciliacao</button>
          <button class="secondary-btn" type="button" data-fin-action="refresh-conciliacao" ${desabilitado}>Atualizar</button>
        </div>
      </div>
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${operacional.loading ? '<div class="fin-loading" role="status">Carregando conciliacao...</div>' : `
        <div class="fin-operational-grid">
          ${renderConciliacaoLista({
            titulo: 'Importacoes',
            itens: operacional.importacoes,
            vazio: 'Nenhuma importacao encontrada.',
            escapeHtml,
            linhas: item => [item.nome_arquivo, `${item.formato?.toUpperCase() || 'OFX'} | ${item.status}`, item.conta?.nome || 'Conta']
          })}
          ${renderConciliacaoLista({
            titulo: 'Movimentos',
            itens: operacional.movimentos,
            vazio: 'Nenhum movimento bancario encontrado.',
            escapeHtml,
            linhas: item => [item.descricao, `${formatarData(item.data_movimento)} | ${item.tipo} | ${item.status}`, `${item.conta?.nome || 'Conta'} - ${formatarMoeda(item.valor)}`]
          })}
          ${renderConciliacaoLista({
            titulo: 'Sugestoes',
            itens: operacional.sugestoes,
            vazio: 'Nenhuma sugestao encontrada.',
            escapeHtml,
            linhas: item => [
              item.movimento?.descricao || 'Movimento',
              `${item.status} | score ${Number(item.score || 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 0 })}`,
              item.parcela ? labelParcelaConciliacao(item.parcela) : labelLancamentoConciliacao(item.lancamento)
            ],
            acoes: item => item.status === 'pendente'
              ? `
                <button class="save-btn" type="button" data-fin-conciliacao-action="confirmar-sugestao" data-id="${escapeAttr(item.id)}" data-valor="${escapeAttr(String(Math.abs(Number(item.movimento?.valor || item.parcela?.valor || 0))))}" ${operacional.saving ? 'disabled' : ''}>Confirmar</button>
                <button class="secondary-btn danger" type="button" data-fin-conciliacao-action="rejeitar-sugestao" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Rejeitar</button>
              `
              : ''
          })}
          ${renderConciliacaoLista({
            titulo: 'Conciliacoes',
            itens: operacional.conciliacoes,
            vazio: 'Nenhuma conciliacao confirmada.',
            escapeHtml,
            linhas: item => [
              item.movimento?.descricao || 'Movimento',
              `${formatarData(item.data_conciliacao)} | ${item.tipo_vinculo} | ${item.status}`,
              `${labelLancamentoConciliacao(item.lancamento)} - ${formatarMoeda(item.valor_conciliado)}`
            ],
            acoes: item => item.status === 'conciliada'
              ? `<button class="secondary-btn danger" type="button" data-fin-conciliacao-action="desfazer-conciliacao" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Desfazer</button>`
              : ''
          })}
        </div>
      `}
      ${renderConciliacaoModal({ operacional, tipo: operacional.modalConciliacaoTipo, escapeHtml, escapeAttr })}
    </div>
  `;
}

function labelCartaoFinanceiro(item = {}) {
  return `${item.nome || 'Cartao'}${item.bandeira ? ` - ${item.bandeira}` : ''}`;
}

function labelFaturaCartao(item = {}) {
  return `${item.cartao?.nome || 'Fatura'} - ${formatarCompetencia(item.competencia)} - ${formatarMoeda(Number(item.valor_total || 0) - Number(item.valor_pago || 0))}`;
}

function renderCartoesModal({ operacional, tipo, escapeHtml, escapeAttr }) {
  if (!tipo) return '';

  const desabilitado = operacional.saving ? 'disabled' : '';
  const cartoesAtivos = operacional.cartoes.filter(item => item.status === 'ativo');
  const faturasPagaveis = operacional.faturas.filter(item => ['aberta', 'fechada', 'parcial'].includes(item.status));
  const contasPagamento = operacional.contas.filter(item => item.tipo !== 'cartao');
  const titulos = {
    cartao: 'Novo cartao',
    compra: 'Nova compra',
    fatura: 'Nova fatura',
    pagamento: 'Pagar fatura'
  };
  const campos = {
    cartao: `
      <label><span>Conta vinculada</span><select class="config-input" name="conta_id" required ${desabilitado}>${renderOptionsFinanceiro(operacional.contas, '', 'Selecione uma conta', item => item.nome || 'Conta', escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label><span>Bandeira</span><input class="config-input" name="bandeira" placeholder="Visa, Mastercard..." ${desabilitado}></label>
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado}>${['credito', 'debito', 'beneficio', 'corporativo'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Limite</span><input class="config-input" name="limite_credito" type="number" min="0" step="0.01" value="0" ${desabilitado}></label>
      <label><span>Dia fechamento</span><input class="config-input" name="dia_fechamento" type="number" min="1" max="31" value="1" ${desabilitado}></label>
      <label><span>Dia vencimento</span><input class="config-input" name="dia_vencimento" type="number" min="1" max="31" value="10" ${desabilitado}></label>
    `,
    compra: `
      <label><span>Cartao</span><select class="config-input" name="cartao_id" required ${desabilitado}>${renderOptionsFinanceiro(cartoesAtivos, '', 'Selecione um cartao', labelCartaoFinanceiro, escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" required ${desabilitado}></label>
      <label><span>Estabelecimento</span><input class="config-input" name="estabelecimento" ${desabilitado}></label>
      <label><span>Data compra</span><input class="config-input" name="data_compra" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label><span>Valor total</span><input class="config-input" name="valor_total" type="number" min="0.01" step="0.01" required ${desabilitado}></label>
      <label><span>Parcelas</span><input class="config-input" name="parcelas" type="number" min="1" max="60" value="1" required ${desabilitado}></label>
      <label><span>Primeiro vencimento</span><input class="config-input" name="data_vencimento" type="date" value="${hojeIso()}" ${desabilitado}></label>
      <label><span>Competencia</span><input class="config-input" name="competencia" type="month" value="${hojeIso().slice(0, 7)}" ${desabilitado}></label>
      <label><span>Categoria</span><select class="config-input" name="categoria_id" ${desabilitado}>${renderOptionsFinanceiro(operacional.categorias, '', 'Sem categoria', item => item.nome || 'Categoria', escapeHtml, escapeAttr)}</select></label>
      <label><span>Centro de custo</span><select class="config-input" name="centro_custo_id" ${desabilitado}>${renderOptionsFinanceiro(operacional.centrosCusto, '', 'Sem centro', item => item.nome || 'Centro', escapeHtml, escapeAttr)}</select></label>
      <label><span>Linha de negocio</span><select class="config-input" name="linha_negocio_id" ${desabilitado}>${renderOptionsFinanceiro(operacional.linhasNegocio, '', 'Sem linha', item => item.nome || 'Linha', escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado}></label>
    `,
    fatura: `
      <label><span>Cartao</span><select class="config-input" name="cartao_id" required ${desabilitado}>${renderOptionsFinanceiro(cartoesAtivos, '', 'Selecione um cartao', labelCartaoFinanceiro, escapeHtml, escapeAttr)}</select></label>
      <label><span>Competencia</span><input class="config-input" name="competencia" type="month" value="${hojeIso().slice(0, 7)}" required ${desabilitado}></label>
      <label><span>Fechamento</span><input class="config-input" name="data_fechamento" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label><span>Vencimento</span><input class="config-input" name="data_vencimento" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label><span>Status</span><select class="config-input" name="status" ${desabilitado}>${['aberta', 'fechada'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado}></label>
    `,
    pagamento: `
      <label class="fin-form-wide"><span>Fatura</span><select class="config-input" name="fatura_id" required ${desabilitado}>${renderOptionsFinanceiro(faturasPagaveis, '', 'Selecione uma fatura', labelFaturaCartao, escapeHtml, escapeAttr)}</select></label>
      <label><span>Conta pagamento</span><select class="config-input" name="conta_id" ${desabilitado}>${renderOptionsFinanceiro(contasPagamento, '', 'Sem conta', item => item.nome || 'Conta', escapeHtml, escapeAttr)}</select></label>
      <label><span>Data pagamento</span><input class="config-input" name="data_pagamento" type="date" value="${hojeIso()}" required ${desabilitado}></label>
      <label><span>Valor</span><input class="config-input" name="valor" type="number" min="0.01" step="0.01" required ${desabilitado}></label>
      <label><span>Forma</span><input class="config-input" name="forma_pagamento" placeholder="Pix, boleto..." ${desabilitado}></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado}></label>
    `
  };

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulos[tipo] || 'Cartoes')}">
        <div class="fin-modal-header">
          <div>
            <strong>${escapeHtml(titulos[tipo] || 'Cartoes')}</strong>
            <p>Preencha os dados para atualizar compras, faturas e pagamentos.</p>
          </div>
          <button class="secondary-btn" type="button" data-fin-action="close-cartao-modal" ${desabilitado}>Fechar</button>
        </div>
        <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-cartao-form="${escapeAttr(tipo)}">
          <div class="fin-form-grid">${campos[tipo] || ''}</div>
          <div class="fin-modal-actions">
            <button class="secondary-btn" type="button" data-fin-action="close-cartao-modal" ${desabilitado}>Cancelar</button>
            <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderCartoes({ state, escapeHtml, escapeAttr }) {
  const resumo = state.cartoesResumo?.[state.empresaId] || {};
  const operacional = state.cartoesOperacional || {};
  const desabilitado = operacional.loading || operacional.saving ? 'disabled' : '';

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Cartoes ativos', resumo.cartoes_ativos)}
        ${renderMetricaCadastro('Compras ativas', resumo.compras_ativas)}
        ${renderMetricaCadastro('Faturas abertas', resumo.faturas_abertas)}
        ${renderMetricaCadastro('Valor em faturas', formatarMoeda(resumo.valor_faturas_abertas))}
        ${renderMetricaCadastro('Parcelas pendentes', resumo.parcelas_pendentes)}
        ${renderMetricaCadastro('Pagamentos', resumo.pagamentos_confirmados)}
      </div>
      <div class="fin-operational-toolbar">
        <div>
          <strong>Cartoes e faturas</strong>
          <p>Controle cartoes, compras parceladas, faturas e pagamentos.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-cartao-modal" data-cartao-modal="cartao" ${desabilitado}>Novo cartao</button>
          <button class="secondary-btn" type="button" data-fin-action="open-cartao-modal" data-cartao-modal="compra" ${desabilitado}>Nova compra</button>
          <button class="secondary-btn" type="button" data-fin-action="open-cartao-modal" data-cartao-modal="fatura" ${desabilitado}>Nova fatura</button>
          <button class="secondary-btn" type="button" data-fin-action="open-cartao-modal" data-cartao-modal="pagamento" ${desabilitado}>Pagar fatura</button>
          <button class="secondary-btn" type="button" data-fin-action="refresh-cartoes" ${desabilitado}>Atualizar</button>
        </div>
      </div>
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${operacional.loading ? '<div class="fin-loading" role="status">Carregando cartoes...</div>' : `
        <div class="fin-operational-grid">
          ${renderConfigLista({
            titulo: 'Cartoes',
            itens: operacional.cartoes,
            vazio: 'Nenhum cartao encontrado.',
            escapeHtml,
            linhas: item => [item.nome, `${item.tipo} | ${item.status}`, `${item.conta?.nome || 'Conta'} - limite ${formatarMoeda(item.limite_credito)}`],
            acoes: item => item.status === 'ativo'
              ? `<button class="secondary-btn danger" type="button" data-fin-cartao-action="cancelar" data-tipo="cartao" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Cancelar</button>`
              : ''
          })}
          ${renderConfigLista({
            titulo: 'Compras',
            itens: operacional.compras,
            vazio: 'Nenhuma compra encontrada.',
            escapeHtml,
            linhas: item => [item.descricao, `${formatarData(item.data_compra)} | ${item.parcelas}x | ${item.status}`, `${item.cartao?.nome || 'Cartao'} - ${formatarMoeda(item.valor_total)}`],
            acoes: item => ['ativa', 'faturada'].includes(item.status)
              ? `<button class="secondary-btn danger" type="button" data-fin-cartao-action="cancelar" data-tipo="compra" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Cancelar</button>`
              : ''
          })}
          ${renderConfigLista({
            titulo: 'Faturas',
            itens: operacional.faturas,
            vazio: 'Nenhuma fatura encontrada.',
            escapeHtml,
            linhas: item => [
              item.cartao?.nome || 'Cartao',
              `${formatarCompetencia(item.competencia)} | vence ${formatarData(item.data_vencimento)} | ${item.status}`,
              `${formatarMoeda(item.valor_pago)} pago de ${formatarMoeda(item.valor_total)}`
            ],
            acoes: item => ['aberta', 'fechada', 'parcial'].includes(item.status)
              ? `<button class="secondary-btn danger" type="button" data-fin-cartao-action="cancelar" data-tipo="fatura" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Cancelar</button>`
              : ''
          })}
          ${renderConfigLista({
            titulo: 'Pagamentos',
            itens: operacional.pagamentos,
            vazio: 'Nenhum pagamento encontrado.',
            escapeHtml,
            linhas: item => [item.fatura?.cartao?.nome || 'Fatura', `${formatarData(item.data_pagamento)} | ${item.status}`, `${item.conta?.nome || 'Conta'} - ${formatarMoeda(item.valor)}`],
            acoes: item => item.status === 'confirmado'
              ? `<button class="secondary-btn danger" type="button" data-fin-cartao-action="cancelar" data-tipo="pagamento" data-id="${escapeAttr(item.id)}" ${operacional.saving ? 'disabled' : ''}>Cancelar</button>`
              : ''
          })}
        </div>
      `}
      ${renderCartoesModal({ operacional, tipo: operacional.modalCartaoTipo, escapeHtml, escapeAttr })}
    </div>
  `;
}

function renderDashboard({ state }) {
  const resumo = state.dashboardResumo?.[state.empresaId] || {};
  const lancamentos = state.lancamentosResumo?.[state.empresaId] || {};
  const conciliacao = state.conciliacaoResumo?.[state.empresaId] || {};
  const complementares = state.complementaresResumo?.[state.empresaId] || {};
  const homologacao = state.homologacaoResumo?.[state.empresaId] || {};
  const contas = state.contasPagarReceberResumo?.[state.empresaId] || [];
  const fluxo = (state.fluxoCaixaResumo?.[state.empresaId] || []).slice(0, 4);
  const dre = (state.dreResumo?.[state.empresaId] || []).slice(0, 4);
  const receber = obterResumoNatureza(contas, 'entrada');
  const pagar = obterResumoNatureza(contas, 'saida');
  const saldoProjetado = Number(resumo.saldo_projetado_30d || 0);
  const saldoRealizado = Number(resumo.saldo_realizado_mes || 0);
  const saldoClasse = saldoProjetado < 0 ? 'is-danger' : 'is-ok';
  const atencoes = [
    renderLinhaResumo('Parcelas vencidas', formatarNumero(resumo.parcelas_vencidas), formatarMoeda(receber.valor_vencido || pagar.valor_vencido || 0)),
    renderLinhaResumo('Conciliação pendente', formatarNumero(resumo.conciliacao_pendente || conciliacao.pendentes), `${formatarNumero(conciliacao.sugestoes_pendentes)} sugestoes`),
    renderLinhaResumo('Alertas abertos', formatarNumero(complementares.alertas_abertos), `${formatarNumero(complementares.backups_falha)} backup(s) com falha`),
    renderLinhaResumo('Homologacao', formatarNumero(homologacao.ciclos_abertos), `${formatarNumero(homologacao.checklist_pendente)} checklist pendente`)
  ];
  const fluxoLinhas = fluxo.map(item => renderLinhaResumo(
    `${formatarCompetencia(item.competencia)} - ${item.regime || 'regime'}`,
    formatarMoeda(item.saldo),
    `${formatarMoeda(item.entradas)} entradas / ${formatarMoeda(item.saidas)} saidas`
  ));
  const dreLinhas = dre.map(item => renderLinhaResumo(
    formatarCompetencia(item.competencia),
    formatarMoeda(item.resultado),
    `${formatarMoeda(item.receitas)} receitas / ${formatarMoeda(item.despesas)} despesas`
  ));

  return `
    <div class="fin-dashboard-layout">
      <div class="fin-dashboard-hero">
        <div>
          <span>Resumo operacional</span>
          <strong class="${saldoClasse}">${formatarMoeda(saldoProjetado)}</strong>
          <p>Saldo projetado para os proximos 30 dias. Realizado no mes: ${formatarMoeda(saldoRealizado)}.</p>
        </div>
        <div class="fin-dashboard-hero-side">
          ${renderLinhaResumo('Receber aberto', formatarMoeda(receber.valor_aberto), `${formatarNumero(receber.parcelas_abertas)} parcelas`)}
          ${renderLinhaResumo('Pagar aberto', formatarMoeda(pagar.valor_aberto), `${formatarNumero(pagar.parcelas_abertas)} parcelas`)}
        </div>
      </div>

      <div class="fin-metrics-grid">
        ${renderMetricaCadastro('Em aberto', lancamentos.em_aberto)}
        ${renderMetricaCadastro('Liquidados', lancamentos.liquidados)}
        ${renderMetricaCadastro('Inadimplencia', formatarMoeda(resumo.inadimplencia))}
        ${renderMetricaCadastro('Baixas confirmadas', lancamentos.baixas_confirmadas)}
        ${renderMetricaCadastro('Periodos fechados', resumo.periodos_fechados)}
        ${renderMetricaCadastro('Relatorios gerados', resumo.relatorios_gerados)}
      </div>

      <div class="fin-dashboard-actions">
        ${renderAtalhoDashboard({
          label: 'Novo lancamento',
          detalhe: 'Ir para contas a pagar e receber',
          rota: 'lancamentos',
          permitido: state.pode('financeiro.lancamentos', 'view')
        })}
        ${renderAtalhoDashboard({
          label: 'Conciliar banco',
          detalhe: 'Importacoes, movimentos e sugestoes',
          rota: 'conciliacao',
          permitido: state.pode('financeiro.conciliacao', 'view')
        })}
        ${renderAtalhoDashboard({
          label: 'Ver relatorios',
          detalhe: 'Fluxo, DRE e fechamento',
          rota: 'relatorios',
          permitido: state.pode('financeiro.relatorios', 'view') || state.pode('financeiro.fechamento', 'view')
        })}
        ${renderAtalhoDashboard({
          label: 'Ajustar cadastros',
          detalhe: 'Pessoas, contas e centros de custo',
          rota: 'cadastros',
          permitido: state.pode('financeiro.cadastros', 'view')
        })}
      </div>

      <div class="fin-dashboard-columns">
        ${renderListaDashboard('Fila de atencao', atencoes, 'Nenhuma pendencia critica no momento.')}
        ${renderListaDashboard('Fluxo recente', fluxoLinhas, 'Sem competencias de fluxo para exibir.')}
        ${renderListaDashboard('DRE recente', dreLinhas, 'Sem competencias de DRE para exibir.')}
      </div>
    </div>
  `;
}

function obterResumoNatureza(lista = [], natureza) {
  return lista.find(item => item.natureza === natureza) || {};
}

function labelRelatorioTipo(tipo = '') {
  const mapa = {
    fluxo_caixa: 'Fluxo de caixa',
    contas_pagar_receber: 'Contas a pagar/receber',
    inadimplencia: 'Inadimplencia',
    dre_gerencial: 'DRE gerencial',
    orcamento_realizado: 'Orcamento realizado',
    dashboard: 'Dashboard'
  };
  return mapa[tipo] || tipo || 'Relatorio';
}

function renderRelatoriosModal({ operacional, tipo, escapeHtml, escapeAttr, podeRelatorios, podeExportar, podeFechamento }) {
  if (!tipo) return '';

  const desabilitado = operacional.saving ? 'disabled' : '';
  const titulos = {
    relatorio: 'Gerar relatorio',
    orcamento: 'Novo orcamento',
    fechamento: 'Novo fechamento'
  };
  const tiposRelatorio = ['fluxo_caixa', 'contas_pagar_receber', 'inadimplencia', 'dre_gerencial', 'orcamento_realizado', 'dashboard'];
  const campos = {
    relatorio: `
      <label><span>Tipo</span><select class="config-input" name="tipo_relatorio" required ${desabilitado || !podeRelatorios ? 'disabled' : ''}>${tiposRelatorio.map(item => `<option value="${item}">${labelRelatorioTipo(item)}</option>`).join('')}</select></label>
      <label><span>Inicio</span><input class="config-input" name="periodo_inicio" type="date" value="${hojeIso().slice(0, 8)}01" required ${desabilitado || !podeRelatorios ? 'disabled' : ''}></label>
      <label><span>Fim</span><input class="config-input" name="periodo_fim" type="date" value="${hojeIso()}" required ${desabilitado || !podeRelatorios ? 'disabled' : ''}></label>
      <label><span>Regime</span><select class="config-input" name="regime" ${desabilitado || !podeRelatorios ? 'disabled' : ''}><option value="">Todos</option><option value="realizado">Realizado</option><option value="projetado">Projetado</option></select></label>
      <label><span>Natureza</span><select class="config-input" name="natureza" ${desabilitado || !podeRelatorios ? 'disabled' : ''}><option value="">Todas</option><option value="entrada">Entrada</option><option value="saida">Saida</option></select></label>
      <label><span>Categoria</span><select class="config-input" name="categoria_id" ${desabilitado || !podeRelatorios ? 'disabled' : ''}>${renderOptionsFinanceiro(operacional.categorias, '', 'Todas', item => item.nome || 'Categoria', escapeHtml, escapeAttr)}</select></label>
      <label><span>Centro de custo</span><select class="config-input" name="centro_custo_id" ${desabilitado || !podeRelatorios ? 'disabled' : ''}>${renderOptionsFinanceiro(operacional.centrosCusto, '', 'Todos', item => item.nome || 'Centro', escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado || !podeRelatorios ? 'disabled' : ''}></label>
    `,
    orcamento: `
      <label><span>Competencia</span><input class="config-input" name="competencia" type="month" value="${hojeIso().slice(0, 7)}" required ${desabilitado || !podeExportar ? 'disabled' : ''}></label>
      <label><span>Natureza</span><select class="config-input" name="natureza" ${desabilitado || !podeExportar ? 'disabled' : ''}><option value="entrada">Entrada</option><option value="saida">Saida</option></select></label>
      <label><span>Valor previsto</span><input class="config-input" name="valor_previsto" type="number" min="0" step="0.01" required ${desabilitado || !podeExportar ? 'disabled' : ''}></label>
      <label><span>Categoria</span><select class="config-input" name="categoria_id" ${desabilitado || !podeExportar ? 'disabled' : ''}>${renderOptionsFinanceiro(operacional.categorias, '', 'Sem categoria', item => item.nome || 'Categoria', escapeHtml, escapeAttr)}</select></label>
      <label><span>Centro de custo</span><select class="config-input" name="centro_custo_id" ${desabilitado || !podeExportar ? 'disabled' : ''}>${renderOptionsFinanceiro(operacional.centrosCusto, '', 'Sem centro', item => item.nome || 'Centro', escapeHtml, escapeAttr)}</select></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado || !podeExportar ? 'disabled' : ''}></label>
    `,
    fechamento: `
      <label><span>Inicio</span><input class="config-input" name="periodo_inicio" type="date" value="${hojeIso().slice(0, 8)}01" required ${desabilitado || !podeFechamento ? 'disabled' : ''}></label>
      <label><span>Fim</span><input class="config-input" name="periodo_fim" type="date" value="${hojeIso()}" required ${desabilitado || !podeFechamento ? 'disabled' : ''}></label>
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado || !podeFechamento ? 'disabled' : ''}><option value="mensal">Mensal</option><option value="parcial">Parcial</option></select></label>
      <label><span>Status inicial</span><select class="config-input" name="status" ${desabilitado || !podeFechamento ? 'disabled' : ''}><option value="aberto">Aberto</option><option value="fechado">Fechado</option></select></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado || !podeFechamento ? 'disabled' : ''}></label>
    `
  };

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulos[tipo] || 'Relatorios')}">
        <div class="fin-modal-header">
          <div>
            <strong>${escapeHtml(titulos[tipo] || 'Relatorios')}</strong>
            <p>Preencha os dados para atualizar relatorios, orcamentos ou fechamento.</p>
          </div>
          <button class="secondary-btn" type="button" data-fin-action="close-relatorio-modal" ${desabilitado}>Fechar</button>
        </div>
        <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-relatorio-form="${escapeAttr(tipo)}">
          <div class="fin-form-grid">${campos[tipo] || ''}</div>
          <div class="fin-modal-actions">
            <button class="secondary-btn" type="button" data-fin-action="close-relatorio-modal" ${desabilitado}>Cancelar</button>
            <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderRelatoriosFechamento({ state, pode, escapeHtml, escapeAttr }) {
  const dashboard = state.dashboardResumo?.[state.empresaId] || {};
  const contas = state.contasPagarReceberResumo?.[state.empresaId] || [];
  const entradas = obterResumoNatureza(contas, 'entrada');
  const saidas = obterResumoNatureza(contas, 'saida');
  const operacional = state.relatoriosOperacional || {};
  const podeRelatorios = pode('financeiro.relatorios', 'view');
  const podeExportar = pode('financeiro.relatorios', 'export');
  const podeFechamento = pode('financeiro.fechamento', 'close');
  const podeReabrir = pode('financeiro.fechamento', 'reopen');
  const desabilitado = operacional.loading || operacional.saving ? 'disabled' : '';

  return `
    <div class="fin-cadastros-layout">
      <div class="fin-metrics-grid">
        ${podeRelatorios ? renderMetricaCadastro('Receber aberto', formatarMoeda(entradas.valor_aberto)) : ''}
        ${podeRelatorios ? renderMetricaCadastro('Pagar aberto', formatarMoeda(saidas.valor_aberto)) : ''}
        ${podeRelatorios ? renderMetricaCadastro('Receber vencido', formatarMoeda(entradas.valor_vencido)) : ''}
        ${podeRelatorios ? renderMetricaCadastro('Pagar vencido', formatarMoeda(saidas.valor_vencido)) : ''}
        ${pode('financeiro.fechamento', 'view') ? renderMetricaCadastro('Periodos fechados', dashboard.periodos_fechados) : ''}
        ${podeRelatorios ? renderMetricaCadastro('Relatorios gerados', dashboard.relatorios_gerados) : ''}
      </div>
      <div class="fin-operational-toolbar">
        <div>
          <strong>Relatorios e fechamento</strong>
          <p>Gere execucoes, acompanhe fluxo/DRE, controle orcamentos e periodos fechados.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-relatorio-modal" data-relatorio-modal="relatorio" ${desabilitado || !podeRelatorios ? 'disabled' : ''}>Gerar relatorio</button>
          <button class="secondary-btn" type="button" data-fin-action="open-relatorio-modal" data-relatorio-modal="orcamento" ${desabilitado || !podeExportar ? 'disabled' : ''}>Novo orcamento</button>
          <button class="secondary-btn" type="button" data-fin-action="open-relatorio-modal" data-relatorio-modal="fechamento" ${desabilitado || !podeFechamento ? 'disabled' : ''}>Novo fechamento</button>
          <button class="secondary-btn" type="button" data-fin-action="refresh-relatorios" ${desabilitado}>Atualizar</button>
        </div>
      </div>
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${operacional.loading ? '<div class="fin-loading" role="status">Carregando relatorios...</div>' : `
        <div class="fin-operational-grid">
          ${renderConfigLista({
            titulo: 'Execucoes de relatorio',
            itens: operacional.relatorios,
            vazio: 'Nenhum relatorio gerado.',
            escapeHtml,
            linhas: item => [labelRelatorioTipo(item.tipo_relatorio), `${formatarData(item.periodo_inicio)} ate ${formatarData(item.periodo_fim)} | ${item.status}`, item.exportado_em ? `Exportado em ${formatarData(item.exportado_em)}` : 'Pendente de exportacao'],
            acoes: item => item.status === 'gerado'
              ? `<button class="secondary-btn" type="button" data-fin-relatorio-action="exportar-relatorio" data-id="${escapeAttr(item.id)}" ${operacional.saving || !podeExportar ? 'disabled' : ''}>Exportar</button>`
              : ''
          })}
          ${renderConfigLista({
            titulo: 'Periodos de fechamento',
            itens: operacional.periodos,
            vazio: 'Nenhum periodo de fechamento encontrado.',
            escapeHtml,
            linhas: item => [item.tipo, `${formatarData(item.periodo_inicio)} ate ${formatarData(item.periodo_fim)} | ${item.status}`, item.hash_snapshot || item.motivo_reabertura || 'Snapshot operacional'],
            acoes: item => item.status !== 'fechado'
              ? `<button class="save-btn" type="button" data-fin-relatorio-action="fechar-periodo" data-id="${escapeAttr(item.id)}" ${operacional.saving || !podeFechamento ? 'disabled' : ''}>Fechar</button>`
              : `<button class="secondary-btn" type="button" data-fin-relatorio-action="reabrir-periodo" data-id="${escapeAttr(item.id)}" ${operacional.saving || !podeReabrir ? 'disabled' : ''}>Reabrir</button>`
          })}
          ${renderConfigLista({
            titulo: 'Orcamentos',
            itens: operacional.orcamentos,
            vazio: 'Nenhum orcamento cadastrado.',
            escapeHtml,
            linhas: item => [formatarCompetencia(item.competencia), `${item.natureza} | ${item.status}`, `${item.categoria?.nome || 'Sem categoria'} - ${formatarMoeda(item.valor_previsto)}`],
            acoes: item => item.status === 'ativo'
              ? `<button class="secondary-btn danger" type="button" data-fin-relatorio-action="arquivar-orcamento" data-id="${escapeAttr(item.id)}" ${operacional.saving || !podeExportar ? 'disabled' : ''}>Arquivar</button>`
              : ''
          })}
          ${renderConfigLista({
            titulo: 'Fluxo de caixa',
            itens: operacional.fluxo,
            vazio: 'Nenhum fluxo encontrado.',
            escapeHtml,
            linhas: item => [formatarCompetencia(item.competencia), `${item.regime} | saldo ${formatarMoeda(item.saldo)}`, `${formatarMoeda(item.entradas)} entradas / ${formatarMoeda(item.saidas)} saidas`]
          })}
          ${renderConfigLista({
            titulo: 'DRE gerencial',
            itens: operacional.dre,
            vazio: 'Nenhuma DRE encontrada.',
            escapeHtml,
            linhas: item => [formatarCompetencia(item.competencia), `Resultado ${formatarMoeda(item.resultado)}`, `${formatarMoeda(item.receitas)} receitas / ${formatarMoeda(item.despesas)} despesas`]
          })}
        </div>
      `}
      ${renderRelatoriosModal({ operacional, tipo: operacional.modalRelatorioTipo, escapeHtml, escapeAttr, podeRelatorios, podeExportar, podeFechamento })}
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

function obterParametroFinanceiro(state, chave, fallback = '') {
  const empresa = state.parametros?.[state.empresaId] || {};
  const global = state.parametros?.global || {};
  const valor = empresa[chave] ?? global[chave] ?? fallback;
  return valor === null || valor === undefined ? fallback : valor;
}

function renderParametrosConfiguracoes({ state, escapeHtml, escapeAttr, operacional, podeEditar }) {
  const desabilitado = operacional.saving || !podeEditar ? 'disabled' : '';
  const moduloAtivo = obterParametroFinanceiro(state, 'modulo_ativo', state.moduloAtivo) === true;
  const moeda = obterParametroFinanceiro(state, 'moeda_padrao', 'BRL');
  const timezone = obterParametroFinanceiro(state, 'timezone_padrao', 'America/Fortaleza');
  const competenciaBloqueada = obterParametroFinanceiro(state, 'competencia_bloqueada_ate', '');
  const diasAlerta = obterParametroFinanceiro(state, 'dias_alerta_vencimento', 7);
  const baixaSemConta = obterParametroFinanceiro(state, 'baixar_parcela_sem_conta', false) === true;
  const parametros = operacional.parametros || [];

  return `
    <div class="fin-cadastros-layout">
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${!podeEditar ? '<p class="fin-operational-message error">Seu perfil pode visualizar, mas nao alterar configuracoes financeiras.</p>' : ''}
      <div class="fin-operational-toolbar">
        <div>
          <strong>Parametros financeiros</strong>
          <p>Controle ativacao, moeda, fuso, bloqueios e parametros auxiliares por empresa.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-config-modal" data-config-modal="parametro" ${desabilitado}>Novo parametro</button>
        </div>
      </div>
      <form class="fin-lancamento-form" data-fin-form="configuracoes">
        <div class="fin-form-header">
          <strong>Parametros principais</strong>
          <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar configuracoes'}</button>
        </div>
        <div class="fin-form-grid">
          <label class="fin-check-field">
            <input type="checkbox" name="modulo_ativo" ${moduloAtivo ? 'checked' : ''} ${desabilitado}>
            <span>Modulo financeiro ativo</span>
          </label>
          <label>
            <span>Moeda padrao</span>
            <select class="config-input" name="moeda_padrao" ${desabilitado}>
              ${['BRL', 'USD', 'EUR'].map(item => `<option value="${item}" ${item === moeda ? 'selected' : ''}>${item}</option>`).join('')}
            </select>
          </label>
          <label>
            <span>Timezone</span>
            <select class="config-input" name="timezone_padrao" ${desabilitado}>
              ${['America/Fortaleza', 'America/Sao_Paulo', 'UTC'].map(item => `<option value="${item}" ${item === timezone ? 'selected' : ''}>${item}</option>`).join('')}
            </select>
          </label>
          <label>
            <span>Dias de alerta</span>
            <input class="config-input" name="dias_alerta_vencimento" type="number" min="0" max="90" step="1" value="${escapeAttr(diasAlerta)}" ${desabilitado}>
          </label>
          <label>
            <span>Bloqueio ate competencia</span>
            <input class="config-input" name="competencia_bloqueada_ate" type="month" value="${escapeAttr(String(competenciaBloqueada || '').slice(0, 7))}" ${desabilitado}>
          </label>
          <label class="fin-check-field">
            <input type="checkbox" name="baixar_parcela_sem_conta" ${baixaSemConta ? 'checked' : ''} ${desabilitado}>
            <span>Permitir baixa sem conta</span>
          </label>
        </div>
      </form>
      ${renderConfigLista({
        titulo: 'Parametros cadastrados',
        itens: parametros,
        vazio: 'Nenhum parametro encontrado.',
        escapeHtml,
        linhas: item => [
          item.chave,
          `${item.empresa_id ? 'Empresa' : 'Global'} | ${item.status}${item.sensivel ? ' | sensivel' : ''}`,
          item.sensivel ? 'Valor protegido' : JSON.stringify(item.valor)
        ]
      })}
    </div>
  `;
}

function renderConfigLista({ titulo, itens, vazio, escapeHtml, linhas, acoes = () => '' }) {
  return `
    <article class="fin-simple-list">
      <strong>${titulo}</strong>
      ${itens.length ? `
        <div>
          ${itens.map(item => `
            <div class="fin-config-row">
              <div>
                ${linhas(item).map((valor, index) => index === 0
                  ? `<strong>${escapeHtml(valor)}</strong>`
                  : `<span>${escapeHtml(valor)}</span>`).join('')}
              </div>
              <div class="fin-config-row-actions">${acoes(item)}</div>
            </div>
          `).join('')}
        </div>
      ` : `<p>${vazio}</p>`}
    </article>
  `;
}

function renderConfigModal({ operacional, tipo, escapeHtml, escapeAttr, podeEditar }) {
  if (!tipo) return '';

  const desabilitado = operacional.saving || !podeEditar ? 'disabled' : '';
  const ciclosAbertos = operacional.ciclos.filter(item => !['concluido', 'cancelado', 'bloqueado'].includes(item.status));
  const optionsCiclos = renderOptionsFinanceiro(ciclosAbertos, '', 'Selecione um ciclo', item => item.nome, escapeHtml, escapeAttr);
  const titulos = {
    parametro: 'Novo parametro',
    alerta: 'Novo alerta',
    'agendamento-alerta': 'Agendar alerta',
    backup: 'Agendar backup',
    ciclo: 'Novo ciclo',
    checklist: 'Novo checklist',
    divergencia: 'Nova divergencia'
  };
  const campos = {
    parametro: `
      <label><span>Escopo</span><select class="config-input" name="escopo" ${desabilitado}><option value="empresa">Empresa selecionada</option><option value="global">Global</option></select></label>
      <label><span>Tipo do valor</span><select class="config-input" name="tipo_valor" ${desabilitado}>${['texto', 'numero', 'booleano', 'json', 'nulo'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Chave</span><input class="config-input" name="chave" required placeholder="exemplo.parametro" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Valor</span><input class="config-input" name="valor" ${desabilitado}></label>
      <label class="fin-check-field"><input type="checkbox" name="valor_booleano" ${desabilitado}><span>Valor booleano verdadeiro</span></label>
      <label class="fin-check-field"><input type="checkbox" name="sensivel" ${desabilitado}><span>Parametro sensivel</span></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" ${desabilitado}></label>
    `,
    alerta: `
      <label><span>Tipo</span><input class="config-input" name="tipo" value="manual" ${desabilitado}></label>
      <label><span>Severidade</span><select class="config-input" name="severidade" ${desabilitado}>${['info', 'aviso', 'critico'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Titulo</span><input class="config-input" name="titulo" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Mensagem</span><input class="config-input" name="mensagem" required ${desabilitado}></label>
      <label><span>Vencimento</span><input class="config-input" name="vencimento_em" type="datetime-local" ${desabilitado}></label>
      <label class="fin-check-field"><input type="checkbox" name="global" ${desabilitado}><span>Global</span></label>
    `,
    'agendamento-alerta': `
      <label><span>Tipo</span><input class="config-input" name="tipo" value="vencimento" ${desabilitado}></label>
      <label><span>Recorrencia</span><select class="config-input" name="recorrencia" ${desabilitado}>${['unico', 'semanal', 'mensal', 'anual', 'personalizado'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Antecedencia</span><input class="config-input" name="antecedencia_dias" type="number" min="0" value="0" ${desabilitado}></label>
      <label><span>Proxima execucao</span><input class="config-input" name="proxima_execucao" type="datetime-local" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Titulo</span><input class="config-input" name="titulo" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Mensagem</span><input class="config-input" name="mensagem" required ${desabilitado}></label>
    `,
    backup: `
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado}>${['completo', 'parcial', 'restore', 'reversao'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Armazenamento</span><input class="config-input" name="armazenamento" value="google_drive" ${desabilitado}></label>
      <label class="fin-form-wide"><span>Caminho</span><input class="config-input" name="drive_path" placeholder="/Financeiro/backups" ${desabilitado}></label>
      <label><span>Retencao dias</span><input class="config-input" name="retencao_dias" type="number" min="1" max="365" value="15" ${desabilitado}></label>
      <label><span>Proxima tentativa</span><input class="config-input" name="proxima_tentativa" type="datetime-local" ${desabilitado}></label>
    `,
    ciclo: `
      <label class="fin-form-wide"><span>Nome</span><input class="config-input" name="nome" required ${desabilitado}></label>
      <label><span>Status</span><select class="config-input" name="status" ${desabilitado}>${['preparacao', 'operacao_paralela', 'ativacao_gradual'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Plano de reversao</span><input class="config-input" name="plano_reversao" ${desabilitado}></label>
    `,
    checklist: `
      <label><span>Ciclo</span><select class="config-input" name="ciclo_id" required ${desabilitado}>${optionsCiclos}</select></label>
      <label><span>Grupo</span><input class="config-input" name="grupo" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Item</span><input class="config-input" name="item" required ${desabilitado}></label>
      <label class="fin-form-wide"><span>Observacoes</span><input class="config-input" name="observacoes" ${desabilitado}></label>
    `,
    divergencia: `
      <label><span>Ciclo</span><select class="config-input" name="ciclo_id" required ${desabilitado}>${optionsCiclos}</select></label>
      <label><span>Tipo</span><select class="config-input" name="tipo" ${desabilitado}>${['saldo', 'baixa', 'documento', 'relatorio', 'permissao', 'outro'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label><span>Severidade</span><select class="config-input" name="severidade" ${desabilitado}>${['baixa', 'media', 'alta', 'critica'].map(item => `<option value="${item}">${item}</option>`).join('')}</select></label>
      <label class="fin-form-wide"><span>Descricao</span><input class="config-input" name="descricao" required ${desabilitado}></label>
    `
  };

  return `
    <div class="fin-modal-backdrop" role="presentation">
      <section class="fin-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(titulos[tipo] || 'Configurar')}">
        <div class="fin-modal-header">
          <div>
            <strong>${escapeHtml(titulos[tipo] || 'Configurar')}</strong>
            <p>Preencha os dados e salve para aplicar na empresa selecionada.</p>
          </div>
          <button class="secondary-btn" type="button" data-fin-action="close-config-modal" ${desabilitado}>Fechar</button>
        </div>
        <form class="fin-lancamento-form fin-lancamento-modal-form" data-fin-config-form="${escapeAttr(tipo)}">
          <div class="fin-form-grid">${campos[tipo] || ''}</div>
          <div class="fin-modal-actions">
            <button class="secondary-btn" type="button" data-fin-action="close-config-modal" ${desabilitado}>Cancelar</button>
            <button class="save-btn" type="submit" ${desabilitado}>${operacional.saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAlertasConfiguracoes({ operacional, escapeHtml, escapeAttr, podeEditar }) {
  const desabilitado = operacional.saving || !podeEditar ? 'disabled' : '';
  return `
    <div class="fin-operational-grid">
      <div class="fin-operational-toolbar">
        <div>
          <strong>Alertas</strong>
          <p>Crie alertas manuais ou agendamentos recorrentes.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-config-modal" data-config-modal="alerta" ${desabilitado}>Novo alerta</button>
          <button class="secondary-btn" type="button" data-fin-action="open-config-modal" data-config-modal="agendamento-alerta" ${desabilitado}>Agendar alerta</button>
        </div>
      </div>
      ${renderConfigLista({
        titulo: 'Alertas',
        itens: operacional.alertas,
        vazio: 'Nenhum alerta encontrado.',
        escapeHtml,
        linhas: item => [item.titulo, `${item.severidade} | ${item.status}`, item.mensagem],
        acoes: item => item.status === 'aberto'
          ? `<button class="secondary-btn" type="button" data-fin-config-action="resolver-alerta" data-id="${escapeAttr(item.id)}" ${desabilitado}>Resolver</button>`
          : ''
      })}
      ${renderConfigLista({
        titulo: 'Agendamentos',
        itens: operacional.agendamentos,
        vazio: 'Nenhum agendamento encontrado.',
        escapeHtml,
        linhas: item => [item.titulo, `${item.recorrencia} | ${item.status}`, item.mensagem]
      })}
      ${renderConfigModal({ operacional, tipo: operacional.modalConfigTipo, escapeHtml, escapeAttr, podeEditar })}
    </div>
  `;
}

function renderBackupsConfiguracoes({ operacional, escapeHtml, escapeAttr, podeEditar }) {
  const desabilitado = operacional.saving || !podeEditar ? 'disabled' : '';
  return `
    <div class="fin-operational-grid">
      <div class="fin-operational-toolbar">
        <div>
          <strong>Backups</strong>
          <p>Agende execucoes de backup, restore ou reversao.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-config-modal" data-config-modal="backup" ${desabilitado}>Agendar backup</button>
        </div>
      </div>
      ${renderConfigLista({
        titulo: 'Backups',
        itens: operacional.backups,
        vazio: 'Nenhum backup encontrado.',
        escapeHtml,
        linhas: item => [item.tipo, `${item.armazenamento} | ${item.status}`, item.drive_path || 'Sem caminho'],
        acoes: item => ['agendado', 'executando', 'falhou'].includes(item.status)
          ? `<button class="secondary-btn danger" type="button" data-fin-config-action="cancelar-backup" data-id="${escapeAttr(item.id)}" ${desabilitado}>Cancelar</button>`
          : ''
      })}
      ${renderConfigModal({ operacional, tipo: operacional.modalConfigTipo, escapeHtml, escapeAttr, podeEditar })}
    </div>
  `;
}

function renderAuditoriaConfiguracoes({ operacional, escapeHtml }) {
  return renderConfigLista({
    titulo: 'Auditoria',
    itens: operacional.auditoria,
    vazio: 'Nenhum evento de auditoria encontrado.',
    escapeHtml,
    linhas: item => [
      `${item.acao} em ${item.entidade}`,
      item.registro_id || 'Sem registro',
      formatarData(item.created_at)
    ]
  });
}

function renderHomologacaoOperacional({ operacional, escapeHtml, escapeAttr, podeEditar }) {
  const desabilitado = operacional.saving || !podeEditar ? 'disabled' : '';
  const ciclosAbertos = operacional.ciclos.filter(item => !['concluido', 'cancelado', 'bloqueado'].includes(item.status));
  return `
    <div class="fin-operational-grid">
      <div class="fin-operational-toolbar">
        <div>
          <strong>Homologacao</strong>
          <p>Gerencie ciclos, checklist e divergencias de ativacao.</p>
        </div>
        <div class="fin-toolbar-actions">
          <button class="save-btn" type="button" data-fin-action="open-config-modal" data-config-modal="ciclo" ${desabilitado}>Novo ciclo</button>
          <button class="secondary-btn" type="button" data-fin-action="open-config-modal" data-config-modal="checklist" ${desabilitado || !ciclosAbertos.length ? 'disabled' : ''}>Novo checklist</button>
          <button class="secondary-btn" type="button" data-fin-action="open-config-modal" data-config-modal="divergencia" ${desabilitado || !ciclosAbertos.length ? 'disabled' : ''}>Nova divergencia</button>
        </div>
      </div>
      ${renderConfigLista({
        titulo: 'Ciclos',
        itens: operacional.ciclos,
        vazio: 'Nenhum ciclo encontrado.',
        escapeHtml,
        linhas: item => [item.nome, item.status, formatarData(item.iniciado_em)],
        acoes: item => !['concluido', 'cancelado', 'bloqueado'].includes(item.status)
          ? `<button class="secondary-btn" type="button" data-fin-config-action="concluir-ciclo" data-id="${escapeAttr(item.id)}" ${desabilitado}>Concluir</button>`
          : ''
      })}
      ${renderConfigLista({
        titulo: 'Checklist',
        itens: operacional.checklist,
        vazio: 'Nenhum checklist encontrado.',
        escapeHtml,
        linhas: item => [item.item, `${item.grupo} | ${item.status}`, item.observacoes || ''],
        acoes: item => item.status === 'pendente'
          ? `<button class="secondary-btn" type="button" data-fin-config-action="validar-checklist" data-id="${escapeAttr(item.id)}" ${desabilitado}>Validar</button>`
          : ''
      })}
      ${renderConfigLista({
        titulo: 'Divergencias',
        itens: operacional.divergencias,
        vazio: 'Nenhuma divergencia encontrada.',
        escapeHtml,
        linhas: item => [item.descricao, `${item.tipo} | ${item.severidade} | ${item.status}`, item.resolucao || ''],
        acoes: item => ['aberta', 'em_analise'].includes(item.status)
          ? `<button class="secondary-btn" type="button" data-fin-config-action="resolver-divergencia" data-id="${escapeAttr(item.id)}" ${desabilitado}>Resolver</button>`
          : ''
      })}
      ${renderConfigModal({ operacional, tipo: operacional.modalConfigTipo, escapeHtml, escapeAttr, podeEditar })}
    </div>
  `;
}

function renderConfiguracoes({ state, escapeHtml, escapeAttr }) {
  const operacional = state.configuracoesOperacional || {};
  const podeEditar = state.pode('financeiro.configuracoes', 'update');
  const aba = FINANCEIRO_CONFIG_ABAS.find(item => item.id === state.configuracaoAba) || FINANCEIRO_CONFIG_ABAS[0];

  const conteudo = {
    parametros: () => renderParametrosConfiguracoes({ state, escapeHtml, escapeAttr, operacional, podeEditar }),
    alertas: () => renderAlertasConfiguracoes({ operacional, escapeHtml, escapeAttr, podeEditar }),
    backups: () => renderBackupsConfiguracoes({ operacional, escapeHtml, escapeAttr, podeEditar }),
    auditoria: () => renderAuditoriaConfiguracoes({ operacional, escapeHtml }),
    homologacao: () => renderHomologacaoOperacional({ operacional, escapeHtml, escapeAttr, podeEditar })
  };

  return `
    <div class="fin-cadastros-layout">
      ${renderConfiguracoesTabs({ state })}
      ${operacional.mensagem ? `<p class="fin-operational-message success">${escapeHtml(operacional.mensagem)}</p>` : ''}
      ${operacional.erro ? `<p class="fin-operational-message error">${escapeHtml(operacional.erro)}</p>` : ''}
      ${!podeEditar && aba.id !== 'auditoria' ? '<p class="fin-operational-message error">Seu perfil pode visualizar, mas nao alterar configuracoes financeiras.</p>' : ''}
      ${operacional.loading
        ? '<div class="fin-loading" role="status">Carregando configuracoes...</div>'
        : conteudo[aba.id]()}
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
  } else if (!state.moduloAtivo && secao.id !== 'configuracoes') {
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
          ? renderCadastros({ state, escapeHtml, escapeAttr })
          : secao.id === 'lancamentos'
            ? renderLancamentos({ state, escapeHtml, escapeAttr })
            : secao.id === 'conciliacao'
              ? renderConciliacao({ state, escapeHtml, escapeAttr })
              : secao.id === 'cartoes'
                ? renderCartoes({ state, escapeHtml, escapeAttr })
              : secao.id === 'dashboard'
                ? renderDashboard({ state })
                : secao.id === 'relatorios'
                  ? renderRelatoriosFechamento({ state, pode: state.pode, escapeHtml, escapeAttr })
                  : secao.id === 'configuracoes'
                    ? renderConfiguracoes({ state, escapeHtml, escapeAttr })
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
