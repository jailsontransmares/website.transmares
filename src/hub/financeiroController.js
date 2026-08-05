import {
  FINANCEIRO_CADASTRO_ABAS,
  FINANCEIRO_LANCAMENTO_ABAS,
  FINANCEIRO_SECOES,
  podeAcessarSecaoFinanceiro,
  renderFinanceiroPagina
} from './financeiroPage.js';
import {
  baixarParcelaFinanceira,
  cancelarLancamentoFinanceiro,
  atualizarStatusAlertaFinanceiro,
  atualizarStatusBackupFinanceiro,
  atualizarStatusCicloHomologacaoFinanceiro,
  arquivarCadastroFinanceiro,
  carregarCadastrosFinanceiros,
  carregarCartoesFinanceiros,
  carregarConciliacaoFinanceira,
  carregarContextoFinanceiro,
  carregarConfiguracoesFinanceiras,
  carregarLancamentosFinanceiros,
  carregarRelatoriosFechamentoFinanceiro,
  criarAgendamentoAlertaFinanceiro,
  criarAlertaFinanceiro,
  criarBackupFinanceiro,
  criarCartaoFinanceiro,
  criarCompraCartaoFinanceiro,
  criarChecklistHomologacaoFinanceiro,
  criarCicloHomologacaoFinanceiro,
  criarFaturaCartaoFinanceiro,
  criarPeriodoFechamentoFinanceiro,
  criarImportacaoExtratoFinanceiro,
  criarMovimentoBancarioFinanceiro,
  criarParametroFinanceiro,
  criarSugestaoConciliacaoFinanceira,
  cancelarItemCartaoFinanceiro,
  criarDivergenciaHomologacaoFinanceira,
  gerarRelatorioFinanceiro,
  confirmarConciliacaoFinanceira,
  desfazerConciliacaoFinanceira,
  pagarFaturaCartaoFinanceiro,
  arquivarOrcamentoFinanceiro,
  atualizarPeriodoFechamentoFinanceiro,
  exportarRelatorioFinanceiro,
  rejeitarSugestaoConciliacaoFinanceira,
  resolverDivergenciaHomologacaoFinanceira,
  salvarCadastroFinanceiro,
  salvarConfiguracoesFinanceiras,
  salvarLancamentoFinanceiro,
  salvarOrcamentoFinanceiro,
  validarChecklistHomologacaoFinanceiro
} from './services/financeiroService.js';
import {
  abrirMenuAcaoGlobal,
  fecharMenuAcaoGlobal
} from './actionMenuPortal.js';

export function criarFinanceiroController({
  renderShell,
  pode,
  escapeHtml,
  escapeAttr,
  obterPartesRota,
  montarCaminhoModulo,
  navegarParaRota
}) {
  const state = {
    loading: false,
    erro: '',
    carregado: false,
    empresas: [],
    empresaId: '',
    parametros: {},
    cadastrosResumo: {},
    lancamentosResumo: {},
    conciliacaoResumo: {},
    cartoesResumo: {},
    dashboardResumo: {},
    contasPagarReceberResumo: {},
    fluxoCaixaResumo: {},
    dreResumo: {},
    complementaresResumo: {},
    homologacaoResumo: {},
    configuracoesOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      alertas: [],
      agendamentos: [],
      backups: [],
      auditoria: [],
      ciclos: [],
      checklist: [],
      divergencias: [],
      restoreValidacoes: [],
      modalConfigTipo: ''
    },
    conciliacaoOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      importacoes: [],
      movimentos: [],
      sugestoes: [],
      conciliacoes: [],
      contas: [],
      lancamentos: [],
      parcelas: [],
      modalConciliacaoTipo: ''
    },
    cartoesOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      cartoes: [],
      compras: [],
      parcelas: [],
      faturas: [],
      pagamentos: [],
      contas: [],
      categorias: [],
      centrosCusto: [],
      linhasNegocio: [],
      modalCartaoTipo: ''
    },
    relatoriosOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      periodos: [],
      relatorios: [],
      orcamentos: [],
      fluxo: [],
      contas: [],
      dre: [],
      categorias: [],
      centrosCusto: [],
      modalRelatorioTipo: ''
    },
    moduloAtivo: false,
    secao: 'dashboard',
    cadastroAba: 'pessoas',
    cadastrosOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      pessoas: [],
      contas: [],
      categorias: [],
      centrosCusto: [],
      linhasNegocio: [],
      contratos: [],
      modalCadastroAberto: false
    },
    lancamentoAba: 'titulos',
    configuracaoAba: 'parametros',
    lancamentosOperacional: {
      carregadoEmpresaId: '',
      loading: false,
      saving: false,
      erro: '',
      mensagem: '',
      lancamentos: [],
      parcelas: [],
      baixas: [],
      rateios: [],
      recorrencias: [],
      pessoas: [],
      contas: [],
      categorias: [],
      centrosCusto: [],
      linhasNegocio: [],
      modalLancamentoAberto: false
    },
    pode
  };

  let faixaNavegacaoFinanceiro = '';
  let resizeNavegacaoFinanceiroConfigurado = false;
  let menuMaisFinanceiroAberto = null;
  let listenersMenuMaisFinanceiroConfigurados = false;

  function fecharMenuMaisFinanceiro() {
    if (!menuMaisFinanceiroAberto) return;

    const menu = menuMaisFinanceiroAberto.menu;
    const trigger = menuMaisFinanceiroAberto.trigger;
    fecharMenuAcaoGlobal(menu);
    menu.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    menuMaisFinanceiroAberto = null;
  }

  function configurarListenersMenuMaisFinanceiro() {
    if (listenersMenuMaisFinanceiroConfigurados || typeof document === 'undefined') return;

    document.addEventListener('click', event => {
      const trigger = event.target?.closest?.('[data-fin-more-trigger]');
      const menu = event.target?.closest?.('[data-hub-action-menu-portal]');

      if (!trigger && !menu) fecharMenuMaisFinanceiro();
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menuMaisFinanceiroAberto) return;

      event.preventDefault();
      const trigger = menuMaisFinanceiroAberto.trigger;
      fecharMenuMaisFinanceiro();
      trigger?.focus();
    });

    listenersMenuMaisFinanceiroConfigurados = true;
  }

  function conectarMenusMaisFinanceiro() {
    configurarListenersMenuMaisFinanceiro();

    document.querySelectorAll('[data-fin-more-trigger]').forEach(trigger => {
      trigger.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;

        event.preventDefault();
        trigger.click();
        const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
        const itens = Array.from(menu?.querySelectorAll('[role="menuitem"]') || []);
        itens[event.key === 'ArrowDown' ? 0 : itens.length - 1]?.focus();
      });

      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();

        const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
        if (!menu) return;

        const abrir = menu.hidden;
        fecharMenuMaisFinanceiro();
        if (!abrir) return;

        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        menuMaisFinanceiroAberto = { menu, trigger };
        abrirMenuAcaoGlobal(trigger, menu, {
          minWidth: 190,
          maxWidth: 320,
          gap: 6,
          flipVertical: true
        });
        menu.querySelector('[role="menuitem"], button')?.focus();
      });

      const menu = document.getElementById(trigger.getAttribute('aria-controls') || '');
      menu?.addEventListener('keydown', event => {
        const itens = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        const atual = itens.indexOf(event.target);
        if (!itens.length) return;

        if (event.key === 'Escape') {
          event.preventDefault();
          fecharMenuMaisFinanceiro();
          trigger.focus();
          return;
        }

        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const proximo = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? itens.length - 1
            : (atual + (event.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
        itens[proximo]?.focus();
      });

      menu?.querySelectorAll('[role="menuitem"]').forEach(item => {
        item.addEventListener('click', () => fecharMenuMaisFinanceiro());
      });
    });
  }

  function obterFaixaNavegacaoFinanceiroAtual() {
    const largura = window.innerWidth;
    if (largura <= 480) return 'compact';
    if (largura <= 760) return 'mobile';
    if (largura <= 1000) return 'tablet';
    return 'desktop';
  }

  function configurarResizeNavegacaoFinanceiro() {
    if (resizeNavegacaoFinanceiroConfigurado || typeof window === 'undefined') return;

    faixaNavegacaoFinanceiro = obterFaixaNavegacaoFinanceiroAtual();
    window.addEventListener('resize', () => {
      const novaFaixa = obterFaixaNavegacaoFinanceiroAtual();
      if (novaFaixa === faixaNavegacaoFinanceiro) return;

      faixaNavegacaoFinanceiro = novaFaixa;
      render();
    });
    resizeNavegacaoFinanceiroConfigurado = true;
  }

  function obterSecaoRota() {
    const partes = obterPartesRota();
    const aliases = {
      fechamento: 'relatorios',
      auditoria: 'configuracoes'
    };
    const secaoInformada = String(partes[1] || 'dashboard').trim().toLowerCase();
    const secao = aliases[secaoInformada] || secaoInformada;
    return FINANCEIRO_SECOES.some(item => item.id === secao) ? secao : 'dashboard';
  }

  function obterCadastroAbaRota() {
    const partes = obterPartesRota();
    const aliases = {
      'centros-custo': 'centros_custo',
      'linhas-negocio': 'linhas_negocio'
    };
    const abaInformada = String(partes[2] || 'pessoas').trim().toLowerCase();
    const aba = aliases[abaInformada] || abaInformada;

    return FINANCEIRO_CADASTRO_ABAS.some(item => item.id === aba) ? aba : 'pessoas';
  }

  function obterRotaCadastros() {
    return `${montarCaminhoModulo('financeiro').replace(/\/+$/g, '')}/cadastros/${state.cadastroAba.replace(/_/g, '-')}`;
  }

  function obterCadastroModalRota() {
    const partes = obterPartesRota();
    return state.secao === 'cadastros' && partes[3] === 'novo';
  }

  function obterLancamentoAbaRota() {
    const partes = obterPartesRota();
    const aliases = {
      'contas-pagar': 'pagar',
      'contas-receber': 'receber',
      recorrencias: 'recorrentes'
    };
    const abaInformada = String(partes[2] || 'titulos').trim().toLowerCase();
    const aba = aliases[abaInformada] || abaInformada;

    return FINANCEIRO_LANCAMENTO_ABAS.some(item => item.id === aba) ? aba : 'titulos';
  }

  function obterConfiguracaoAbaRota() {
    const partes = obterPartesRota();
    const aba = String(partes[2] || 'parametros').trim().toLowerCase();
    return ['parametros', 'alertas', 'backups', 'auditoria', 'homologacao'].includes(aba) ? aba : 'parametros';
  }

  function obterSecaoPermitida(secao) {
    const candidata = FINANCEIRO_SECOES.find(item => item.id === secao);
    if (candidata && podeAcessarSecaoFinanceiro(candidata, pode)) return candidata.id;

    return FINANCEIRO_SECOES.find(item => podeAcessarSecaoFinanceiro(item, pode))?.id || '';
  }

  function render() {
    fecharMenuMaisFinanceiro();
    document.getElementById('app').innerHTML = renderFinanceiroPagina({
      state,
      renderShell,
      escapeHtml,
      escapeAttr
    });
    conectarEventos();
    conectarMenusMaisFinanceiro();
  }

  function navegar(secao) {
    const destino = obterSecaoPermitida(secao);
    if (!destino) {
      state.secao = '';
      render();
      return Promise.resolve();
    }

    return navegarParaRota(`${montarCaminhoModulo('financeiro').replace(/\/+$/g, '')}/${destino}`);
  }

  function dadosFormulario(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function carregarLancamentosOperacionais(forcar = false) {
    if (!state.empresaId || state.secao !== 'lancamentos') return;
    if (
      state.lancamentosOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.lancamentosOperacional.erro
    ) {
      return;
    }

    state.lancamentosOperacional.loading = true;
    state.lancamentosOperacional.erro = '';
    render();

    try {
      const contexto = await carregarLancamentosFinanceiros(state.empresaId);
      state.lancamentosOperacional = {
        ...state.lancamentosOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.lancamentosOperacional.loading = false;
      state.lancamentosOperacional.erro = erro?.message || 'Nao foi possivel carregar os lancamentos.';
    }

    render();
  }

  async function carregarCadastrosOperacionais(forcar = false) {
    if (!state.empresaId || state.secao !== 'cadastros') return;
    if (
      state.cadastrosOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.cadastrosOperacional.erro
    ) {
      return;
    }

    state.cadastrosOperacional.loading = true;
    state.cadastrosOperacional.erro = '';
    render();

    try {
      const contexto = await carregarCadastrosFinanceiros(state.empresaId);
      state.cadastrosOperacional = {
        ...state.cadastrosOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.cadastrosOperacional.loading = false;
      state.cadastrosOperacional.erro = erro?.message || 'Nao foi possivel carregar os cadastros.';
    }

    render();
  }

  async function executarAcaoLancamentos(acao) {
    state.lancamentosOperacional.saving = true;
    state.lancamentosOperacional.erro = '';
    state.lancamentosOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.lancamentosOperacional.mensagem = mensagem || 'Operacao concluida.';
      await carregarContextoBase();
      await carregarLancamentosOperacionais(true);
    } catch (erro) {
      state.lancamentosOperacional.erro = erro?.message || 'Nao foi possivel concluir a operacao.';
      render();
    } finally {
      state.lancamentosOperacional.saving = false;
      render();
    }
  }

  async function executarAcaoCadastros(acao) {
    state.cadastrosOperacional.saving = true;
    state.cadastrosOperacional.erro = '';
    state.cadastrosOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.cadastrosOperacional.mensagem = mensagem || 'Cadastro salvo.';
      await carregarContextoBase();
      await carregarCadastrosOperacionais(true);
      if (!state.cadastrosOperacional.modalCadastroAberto) {
        const url = new URL(window.location.href);
        url.pathname = obterRotaCadastros();
        url.hash = '';
        window.history.replaceState({}, '', url);
      }
    } catch (erro) {
      state.cadastrosOperacional.erro = erro?.message || 'Nao foi possivel concluir a operacao.';
    } finally {
      state.cadastrosOperacional.saving = false;
      render();
    }
  }

  async function executarAcaoConfiguracoes(acao) {
    state.configuracoesOperacional.saving = true;
    state.configuracoesOperacional.erro = '';
    state.configuracoesOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.configuracoesOperacional.mensagem = mensagem || 'Configuracoes salvas.';
      await carregarContextoBase();
      await carregarConfiguracoesOperacionais(true);
    } catch (erro) {
      state.configuracoesOperacional.erro = erro?.message || 'Nao foi possivel salvar as configuracoes.';
    } finally {
      state.configuracoesOperacional.saving = false;
      render();
    }
  }

  async function executarAcaoConciliacao(acao) {
    state.conciliacaoOperacional.saving = true;
    state.conciliacaoOperacional.erro = '';
    state.conciliacaoOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.conciliacaoOperacional.mensagem = mensagem || 'Operacao concluida.';
      await carregarContextoBase();
      await carregarConciliacaoOperacional(true);
    } catch (erro) {
      state.conciliacaoOperacional.erro = erro?.message || 'Nao foi possivel concluir a conciliacao.';
    } finally {
      state.conciliacaoOperacional.saving = false;
      render();
    }
  }

  async function executarAcaoCartoes(acao) {
    state.cartoesOperacional.saving = true;
    state.cartoesOperacional.erro = '';
    state.cartoesOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.cartoesOperacional.mensagem = mensagem || 'Operacao concluida.';
      await carregarContextoBase();
      await carregarCartoesOperacionais(true);
    } catch (erro) {
      state.cartoesOperacional.erro = erro?.message || 'Nao foi possivel concluir a operacao de cartoes.';
    } finally {
      state.cartoesOperacional.saving = false;
      render();
    }
  }

  async function executarAcaoRelatorios(acao) {
    state.relatoriosOperacional.saving = true;
    state.relatoriosOperacional.erro = '';
    state.relatoriosOperacional.mensagem = '';
    render();

    try {
      const mensagem = await acao();
      state.relatoriosOperacional.mensagem = mensagem || 'Operacao concluida.';
      await carregarContextoBase();
      await carregarRelatoriosOperacionais(true);
    } catch (erro) {
      state.relatoriosOperacional.erro = erro?.message || 'Nao foi possivel concluir a operacao.';
    } finally {
      state.relatoriosOperacional.saving = false;
      render();
    }
  }

  async function carregarConfiguracoesOperacionais(forcar = false) {
    if (!state.empresaId || state.secao !== 'configuracoes') return;
    if (
      state.configuracoesOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.configuracoesOperacional.erro
    ) {
      return;
    }

    state.configuracoesOperacional.loading = true;
    state.configuracoesOperacional.erro = '';
    render();

    try {
      const contexto = await carregarConfiguracoesFinanceiras(state.empresaId);
      state.configuracoesOperacional = {
        ...state.configuracoesOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.configuracoesOperacional.loading = false;
      state.configuracoesOperacional.erro = erro?.message || 'Nao foi possivel carregar as configuracoes.';
    }

    render();
  }

  async function carregarConciliacaoOperacional(forcar = false) {
    if (!state.empresaId || state.secao !== 'conciliacao') return;
    if (
      state.conciliacaoOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.conciliacaoOperacional.erro
    ) {
      return;
    }

    state.conciliacaoOperacional.loading = true;
    state.conciliacaoOperacional.erro = '';
    render();

    try {
      const contexto = await carregarConciliacaoFinanceira(state.empresaId);
      state.conciliacaoOperacional = {
        ...state.conciliacaoOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.conciliacaoOperacional.loading = false;
      state.conciliacaoOperacional.erro = erro?.message || 'Nao foi possivel carregar a conciliacao.';
    }

    render();
  }

  async function carregarCartoesOperacionais(forcar = false) {
    if (!state.empresaId || state.secao !== 'cartoes') return;
    if (
      state.cartoesOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.cartoesOperacional.erro
    ) {
      return;
    }

    state.cartoesOperacional.loading = true;
    state.cartoesOperacional.erro = '';
    render();

    try {
      const contexto = await carregarCartoesFinanceiros(state.empresaId);
      state.cartoesOperacional = {
        ...state.cartoesOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.cartoesOperacional.loading = false;
      state.cartoesOperacional.erro = erro?.message || 'Nao foi possivel carregar os cartoes.';
    }

    render();
  }

  async function carregarRelatoriosOperacionais(forcar = false) {
    if (!state.empresaId || state.secao !== 'relatorios') return;
    if (
      state.relatoriosOperacional.carregadoEmpresaId === state.empresaId
      && !forcar
      && !state.relatoriosOperacional.erro
    ) {
      return;
    }

    state.relatoriosOperacional.loading = true;
    state.relatoriosOperacional.erro = '';
    render();

    try {
      const contexto = await carregarRelatoriosFechamentoFinanceiro(state.empresaId);
      state.relatoriosOperacional = {
        ...state.relatoriosOperacional,
        ...contexto,
        carregadoEmpresaId: state.empresaId,
        loading: false,
        erro: ''
      };
    } catch (erro) {
      state.relatoriosOperacional.loading = false;
      state.relatoriosOperacional.erro = erro?.message || 'Nao foi possivel carregar relatorios e fechamento.';
    }

    render();
  }

  async function carregarContextoBase() {
    const contexto = await carregarContextoFinanceiro();
    state.empresas = contexto.empresas;
    state.parametros = contexto.parametros;
    state.cadastrosResumo = contexto.cadastrosResumo || {};
    state.lancamentosResumo = contexto.lancamentosResumo || {};
    state.conciliacaoResumo = contexto.conciliacaoResumo || {};
    state.cartoesResumo = contexto.cartoesResumo || {};
    state.dashboardResumo = contexto.dashboardResumo || {};
    state.contasPagarReceberResumo = contexto.contasPagarReceberResumo || {};
    state.fluxoCaixaResumo = contexto.fluxoCaixaResumo || {};
    state.dreResumo = contexto.dreResumo || {};
    state.complementaresResumo = contexto.complementaresResumo || {};
    state.homologacaoResumo = contexto.homologacaoResumo || {};
    state.moduloAtivo = contexto.parametros.global?.modulo_ativo === true;
    state.empresaId = state.empresas.some(empresa => empresa.id === state.empresaId)
      ? state.empresaId
      : (state.empresas[0]?.id || '');
    state.carregado = true;
  }

  function conectarEventos() {
    document.querySelectorAll('[data-fin-route]').forEach(botao => {
      botao.addEventListener('click', () => navegar(botao.dataset.finRoute));
    });

    document.querySelectorAll('[data-fin-cadastro-tab]').forEach(botao => {
      botao.addEventListener('click', () => {
        const aba = botao.dataset.finCadastroTab;
        if (!FINANCEIRO_CADASTRO_ABAS.some(item => item.id === aba)) return;

        const base = montarCaminhoModulo('financeiro').replace(/\/+$/g, '');
        navegarParaRota(`${base}/cadastros/${aba.replace(/_/g, '-')}`);
      });
    });

    document.querySelectorAll('[data-fin-lancamento-tab]').forEach(botao => {
      botao.addEventListener('click', () => {
        const aba = botao.dataset.finLancamentoTab;
        if (!FINANCEIRO_LANCAMENTO_ABAS.some(item => item.id === aba)) return;

        const base = montarCaminhoModulo('financeiro').replace(/\/+$/g, '');
        navegarParaRota(`${base}/lancamentos/${aba.replace(/_/g, '-')}`);
      });
    });

    document.querySelectorAll('[data-fin-config-tab]').forEach(botao => {
      botao.addEventListener('click', () => {
        const aba = botao.dataset.finConfigTab;
        if (!['parametros', 'alertas', 'backups', 'auditoria', 'homologacao'].includes(aba)) return;

        state.configuracoesOperacional.modalConfigTipo = '';
        const base = montarCaminhoModulo('financeiro').replace(/\/+$/g, '');
        navegarParaRota(`${base}/configuracoes/${aba}`);
      });
    });

    document.querySelector('[data-fin-action="change-company"]')?.addEventListener('change', evento => {
      const empresaId = String(evento.target.value || '');
      if (state.empresas.some(empresa => empresa.id === empresaId)) {
        state.empresaId = empresaId;
        state.cadastrosOperacional.carregadoEmpresaId = '';
        state.lancamentosOperacional.carregadoEmpresaId = '';
        state.configuracoesOperacional.carregadoEmpresaId = '';
        state.conciliacaoOperacional.carregadoEmpresaId = '';
        state.cartoesOperacional.carregadoEmpresaId = '';
        state.relatoriosOperacional.carregadoEmpresaId = '';
        state.cadastrosOperacional.mensagem = '';
        state.cadastrosOperacional.erro = '';
        state.lancamentosOperacional.mensagem = '';
        state.lancamentosOperacional.erro = '';
        state.configuracoesOperacional.mensagem = '';
        state.configuracoesOperacional.erro = '';
        state.configuracoesOperacional.modalConfigTipo = '';
        state.conciliacaoOperacional.mensagem = '';
        state.conciliacaoOperacional.erro = '';
        state.conciliacaoOperacional.modalConciliacaoTipo = '';
        state.cartoesOperacional.mensagem = '';
        state.cartoesOperacional.erro = '';
        state.cartoesOperacional.modalCartaoTipo = '';
        state.relatoriosOperacional.mensagem = '';
        state.relatoriosOperacional.erro = '';
        state.relatoriosOperacional.modalRelatorioTipo = '';
        render();
        carregarCadastrosOperacionais(true);
        carregarLancamentosOperacionais(true);
        carregarConfiguracoesOperacionais(true);
        carregarConciliacaoOperacional(true);
        carregarCartoesOperacionais(true);
        carregarRelatoriosOperacionais(true);
      }
    });

    document.querySelector('[data-fin-form="cadastro"]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      executarAcaoCadastros(async () => {
        await salvarCadastroFinanceiro(state.cadastroAba, {
          ...dadosFormulario(evento.currentTarget),
          empresa_id: state.empresaId
        });
        state.cadastrosOperacional.modalCadastroAberto = false;
        return 'Cadastro salvo.';
      });
    });

    document.querySelector('[data-fin-action="open-cadastro-modal"]')?.addEventListener('click', () => {
      state.cadastrosOperacional.erro = '';
      state.cadastrosOperacional.mensagem = '';
      navegarParaRota(`${obterRotaCadastros()}/novo`);
    });

    document.querySelectorAll('[data-fin-action="close-cadastro-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        navegarParaRota(obterRotaCadastros());
      });
    });

    document.querySelectorAll('[data-fin-cadastro-action="arquivar"]').forEach(botao => {
      botao.addEventListener('click', () => {
        executarAcaoCadastros(async () => {
          await arquivarCadastroFinanceiro(state.cadastroAba, {
            empresa_id: state.empresaId,
            id: botao.dataset.id
          });
          return 'Cadastro arquivado.';
        });
      });
    });

    document.querySelector('[data-fin-action="refresh-lancamentos"]')?.addEventListener('click', () => {
      carregarLancamentosOperacionais(true);
    });

    document.querySelector('[data-fin-action="open-lancamento-modal"]')?.addEventListener('click', () => {
      state.lancamentosOperacional.modalLancamentoAberto = true;
      state.lancamentosOperacional.erro = '';
      state.lancamentosOperacional.mensagem = '';
      render();
    });

    document.querySelectorAll('[data-fin-action="close-lancamento-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.lancamentosOperacional.modalLancamentoAberto = false;
        render();
      });
    });

    document.querySelector('[data-fin-form="lancamento"]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      executarAcaoLancamentos(async () => {
        await salvarLancamentoFinanceiro({
          ...dadosFormulario(evento.currentTarget),
          empresa_id: state.empresaId
        });
        state.lancamentosOperacional.modalLancamentoAberto = false;
        return 'Lancamento criado.';
      });
    });

    document.querySelector('[data-fin-form="configuracoes"]')?.addEventListener('submit', evento => {
      evento.preventDefault();
      executarAcaoConfiguracoes(async () => {
        await salvarConfiguracoesFinanceiras({
          ...dadosFormulario(evento.currentTarget),
          empresa_id: state.empresaId
        });
        return 'Configuracoes salvas.';
      });
    });

    document.querySelectorAll('[data-fin-action="open-config-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.configuracoesOperacional.modalConfigTipo = botao.dataset.configModal || '';
        state.configuracoesOperacional.erro = '';
        state.configuracoesOperacional.mensagem = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-action="close-config-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.configuracoesOperacional.modalConfigTipo = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-config-form]').forEach(form => {
      form.addEventListener('submit', evento => {
        evento.preventDefault();
        const tipo = form.dataset.finConfigForm;
        const dados = {
          ...dadosFormulario(form),
          empresa_id: state.empresaId
        };

        executarAcaoConfiguracoes(async () => {
          if (tipo === 'parametro') await criarParametroFinanceiro(dados);
          if (tipo === 'alerta') await criarAlertaFinanceiro(dados);
          if (tipo === 'agendamento-alerta') await criarAgendamentoAlertaFinanceiro(dados);
          if (tipo === 'backup') await criarBackupFinanceiro(dados);
          if (tipo === 'ciclo') await criarCicloHomologacaoFinanceiro(dados);
          if (tipo === 'checklist') await criarChecklistHomologacaoFinanceiro(dados);
          if (tipo === 'divergencia') await criarDivergenciaHomologacaoFinanceira(dados);
          state.configuracoesOperacional.modalConfigTipo = '';
          return 'Operacao concluida.';
        });
      });
    });

    document.querySelectorAll('[data-fin-config-action]').forEach(botao => {
      botao.addEventListener('click', () => {
        const acao = botao.dataset.finConfigAction;
        executarAcaoConfiguracoes(async () => {
          if (acao === 'resolver-alerta') {
            await atualizarStatusAlertaFinanceiro({ alerta_id: botao.dataset.id, status: 'resolvido' });
          }
          if (acao === 'cancelar-backup') {
            await atualizarStatusBackupFinanceiro({ backup_id: botao.dataset.id, status: 'cancelado' });
          }
          if (acao === 'concluir-ciclo') {
            await atualizarStatusCicloHomologacaoFinanceiro({
              empresa_id: state.empresaId,
              ciclo_id: botao.dataset.id,
              status: 'concluido'
            });
          }
          if (acao === 'validar-checklist') {
            await validarChecklistHomologacaoFinanceiro({
              empresa_id: state.empresaId,
              checklist_id: botao.dataset.id
            });
          }
          if (acao === 'resolver-divergencia') {
            await resolverDivergenciaHomologacaoFinanceira({
              empresa_id: state.empresaId,
              divergencia_id: botao.dataset.id
            });
          }
          return 'Operacao concluida.';
        });
      });
    });

    document.querySelector('[data-fin-action="refresh-conciliacao"]')?.addEventListener('click', () => {
      carregarConciliacaoOperacional(true);
    });

    document.querySelectorAll('[data-fin-action="open-conciliacao-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.conciliacaoOperacional.modalConciliacaoTipo = botao.dataset.conciliacaoModal || '';
        state.conciliacaoOperacional.erro = '';
        state.conciliacaoOperacional.mensagem = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-action="close-conciliacao-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.conciliacaoOperacional.modalConciliacaoTipo = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-conciliacao-form]').forEach(form => {
      form.addEventListener('submit', evento => {
        evento.preventDefault();
        const tipo = form.dataset.finConciliacaoForm;
        const dados = {
          ...dadosFormulario(form),
          empresa_id: state.empresaId
        };

        executarAcaoConciliacao(async () => {
          if (tipo === 'importacao') await criarImportacaoExtratoFinanceiro(dados);
          if (tipo === 'movimento') await criarMovimentoBancarioFinanceiro(dados);
          if (tipo === 'sugestao') await criarSugestaoConciliacaoFinanceira(dados);
          if (tipo === 'conciliacao') await confirmarConciliacaoFinanceira(dados);
          state.conciliacaoOperacional.modalConciliacaoTipo = '';
          return 'Conciliacao atualizada.';
        });
      });
    });

    document.querySelectorAll('[data-fin-conciliacao-action]').forEach(botao => {
      botao.addEventListener('click', () => {
        const acao = botao.dataset.finConciliacaoAction;
        executarAcaoConciliacao(async () => {
          if (acao === 'confirmar-sugestao') {
            await confirmarConciliacaoFinanceira({
              empresa_id: state.empresaId,
              sugestao_id: botao.dataset.id,
              valor_conciliado: botao.dataset.valor
            });
          }
          if (acao === 'rejeitar-sugestao') {
            await rejeitarSugestaoConciliacaoFinanceira({
              empresa_id: state.empresaId,
              sugestao_id: botao.dataset.id
            });
          }
          if (acao === 'desfazer-conciliacao') {
            await desfazerConciliacaoFinanceira({
              empresa_id: state.empresaId,
              conciliacao_id: botao.dataset.id
            });
          }
          return 'Conciliacao atualizada.';
        });
      });
    });

    document.querySelector('[data-fin-action="refresh-cartoes"]')?.addEventListener('click', () => {
      carregarCartoesOperacionais(true);
    });

    document.querySelectorAll('[data-fin-action="open-cartao-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.cartoesOperacional.modalCartaoTipo = botao.dataset.cartaoModal || '';
        state.cartoesOperacional.erro = '';
        state.cartoesOperacional.mensagem = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-action="close-cartao-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.cartoesOperacional.modalCartaoTipo = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-cartao-form]').forEach(form => {
      form.addEventListener('submit', evento => {
        evento.preventDefault();
        const tipo = form.dataset.finCartaoForm;
        const dados = {
          ...dadosFormulario(form),
          empresa_id: state.empresaId
        };

        executarAcaoCartoes(async () => {
          if (tipo === 'cartao') await criarCartaoFinanceiro(dados);
          if (tipo === 'compra') await criarCompraCartaoFinanceiro(dados);
          if (tipo === 'fatura') await criarFaturaCartaoFinanceiro(dados);
          if (tipo === 'pagamento') await pagarFaturaCartaoFinanceiro(dados);
          state.cartoesOperacional.modalCartaoTipo = '';
          return 'Cartoes atualizados.';
        });
      });
    });

    document.querySelectorAll('[data-fin-cartao-action="cancelar"]').forEach(botao => {
      botao.addEventListener('click', () => {
        executarAcaoCartoes(async () => {
          await cancelarItemCartaoFinanceiro(botao.dataset.tipo, {
            empresa_id: state.empresaId,
            id: botao.dataset.id
          });
          return 'Registro cancelado.';
        });
      });
    });

    document.querySelector('[data-fin-action="refresh-relatorios"]')?.addEventListener('click', () => {
      carregarRelatoriosOperacionais(true);
    });

    document.querySelectorAll('[data-fin-action="open-relatorio-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.relatoriosOperacional.modalRelatorioTipo = botao.dataset.relatorioModal || '';
        state.relatoriosOperacional.erro = '';
        state.relatoriosOperacional.mensagem = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-action="close-relatorio-modal"]').forEach(botao => {
      botao.addEventListener('click', () => {
        state.relatoriosOperacional.modalRelatorioTipo = '';
        render();
      });
    });

    document.querySelectorAll('[data-fin-relatorio-form]').forEach(form => {
      form.addEventListener('submit', evento => {
        evento.preventDefault();
        const tipo = form.dataset.finRelatorioForm;
        const dados = {
          ...dadosFormulario(form),
          empresa_id: state.empresaId
        };

        executarAcaoRelatorios(async () => {
          if (tipo === 'relatorio') await gerarRelatorioFinanceiro(dados);
          if (tipo === 'orcamento') await salvarOrcamentoFinanceiro(dados);
          if (tipo === 'fechamento') await criarPeriodoFechamentoFinanceiro(dados);
          state.relatoriosOperacional.modalRelatorioTipo = '';
          return 'Relatorios e fechamento atualizados.';
        });
      });
    });

    document.querySelectorAll('[data-fin-relatorio-action]').forEach(botao => {
      botao.addEventListener('click', () => {
        const acao = botao.dataset.finRelatorioAction;
        executarAcaoRelatorios(async () => {
          if (acao === 'exportar-relatorio') {
            await exportarRelatorioFinanceiro({
              empresa_id: state.empresaId,
              relatorio_id: botao.dataset.id
            });
          }
          if (acao === 'arquivar-orcamento') {
            await arquivarOrcamentoFinanceiro({
              empresa_id: state.empresaId,
              orcamento_id: botao.dataset.id
            });
          }
          if (acao === 'fechar-periodo') {
            await atualizarPeriodoFechamentoFinanceiro({
              empresa_id: state.empresaId,
              periodo_id: botao.dataset.id,
              status: 'fechado'
            });
          }
          if (acao === 'reabrir-periodo') {
            await atualizarPeriodoFechamentoFinanceiro({
              empresa_id: state.empresaId,
              periodo_id: botao.dataset.id,
              status: 'reaberto',
              motivo_reabertura: 'Reaberto pela tela de relatorios.'
            });
          }
          return 'Relatorios e fechamento atualizados.';
        });
      });
    });

    document.querySelectorAll('[data-fin-form="baixa"]').forEach(form => {
      form.addEventListener('submit', evento => {
        evento.preventDefault();
        executarAcaoLancamentos(async () => {
          await baixarParcelaFinanceira({
            ...dadosFormulario(evento.currentTarget),
            empresa_id: state.empresaId
          });
          return 'Baixa registrada.';
        });
      });
    });

    document.querySelectorAll('[data-fin-action="cancelar-lancamento"]').forEach(botao => {
      botao.addEventListener('click', () => {
        const lancamentoId = botao.dataset.lancamentoId;
        if (!lancamentoId) return;

        executarAcaoLancamentos(async () => {
          await cancelarLancamentoFinanceiro({
            empresa_id: state.empresaId,
            lancamento_id: lancamentoId
          });
          return 'Lancamento cancelado.';
        });
      });
    });

    document.querySelector('[data-fin-action="retry"]')?.addEventListener('click', () => carregar(true));
  }

  async function carregar(forcar = false) {
    state.secao = obterSecaoPermitida(obterSecaoRota());
    state.cadastroAba = state.secao === 'cadastros' ? obterCadastroAbaRota() : state.cadastroAba;
    state.cadastrosOperacional.modalCadastroAberto = state.secao === 'cadastros' && obterCadastroModalRota();
    state.lancamentoAba = state.secao === 'lancamentos' ? obterLancamentoAbaRota() : state.lancamentoAba;
    state.configuracaoAba = state.secao === 'configuracoes' ? obterConfiguracaoAbaRota() : state.configuracaoAba;

    if (state.carregado && !forcar) {
      render();
      await carregarCadastrosOperacionais();
      await carregarLancamentosOperacionais();
      await carregarConfiguracoesOperacionais();
      await carregarConciliacaoOperacional();
      await carregarCartoesOperacionais();
      await carregarRelatoriosOperacionais();
      return;
    }

    state.loading = true;
    state.erro = '';
    render();

    try {
      await carregarContextoBase();
    } catch (erro) {
      state.erro = erro?.message || 'Erro inesperado ao carregar a estrutura financeira.';
    } finally {
      state.loading = false;
      render();
    }

    await carregarCadastrosOperacionais(forcar);
    await carregarLancamentosOperacionais(forcar);
    await carregarConfiguracoesOperacionais(forcar);
    await carregarConciliacaoOperacional(forcar);
    await carregarCartoesOperacionais(forcar);
    await carregarRelatoriosOperacionais(forcar);
  }

  async function abrir() {
    configurarResizeNavegacaoFinanceiro();
    const secaoRota = obterSecaoRota();
    const secaoPermitida = obterSecaoPermitida(secaoRota);
    const rotaAtual = obterPartesRota();
    const secaoInformada = String(rotaAtual[1] || '').trim().toLowerCase();

    if (
      secaoPermitida
      && (!secaoInformada || secaoPermitida !== secaoRota || secaoInformada !== secaoRota)
    ) {
      await navegar(secaoPermitida);
      return;
    }

    await carregar();
  }

  return {
    abrir,
    recarregar: () => carregar(true)
  };
}
