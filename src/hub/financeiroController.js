import {
  FINANCEIRO_SECOES,
  podeAcessarSecaoFinanceiro,
  renderFinanceiroPagina
} from './financeiroPage.js';
import { carregarContextoFinanceiro } from './services/financeiroService.js';

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
    dashboardResumo: {},
    contasPagarReceberResumo: {},
    fluxoCaixaResumo: {},
    dreResumo: {},
    complementaresResumo: {},
    homologacaoResumo: {},
    moduloAtivo: false,
    secao: 'dashboard',
    pode
  };

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

  function obterSecaoPermitida(secao) {
    const candidata = FINANCEIRO_SECOES.find(item => item.id === secao);
    if (candidata && podeAcessarSecaoFinanceiro(candidata, pode)) return candidata.id;

    return FINANCEIRO_SECOES.find(item => podeAcessarSecaoFinanceiro(item, pode))?.id || '';
  }

  function render() {
    document.getElementById('app').innerHTML = renderFinanceiroPagina({
      state,
      renderShell,
      escapeHtml,
      escapeAttr
    });
    conectarEventos();
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

  function conectarEventos() {
    document.querySelectorAll('[data-fin-route]').forEach(botao => {
      botao.addEventListener('click', () => navegar(botao.dataset.finRoute));
    });

    document.querySelector('[data-fin-action="change-company"]')?.addEventListener('change', evento => {
      const empresaId = String(evento.target.value || '');
      if (state.empresas.some(empresa => empresa.id === empresaId)) {
        state.empresaId = empresaId;
        render();
      }
    });

    document.querySelector('[data-fin-action="retry"]')?.addEventListener('click', () => carregar(true));
  }

  async function carregar(forcar = false) {
    state.secao = obterSecaoPermitida(obterSecaoRota());

    if (state.carregado && !forcar) {
      render();
      return;
    }

    state.loading = true;
    state.erro = '';
    render();

    try {
      const contexto = await carregarContextoFinanceiro();
      state.empresas = contexto.empresas;
      state.parametros = contexto.parametros;
      state.cadastrosResumo = contexto.cadastrosResumo || {};
      state.lancamentosResumo = contexto.lancamentosResumo || {};
      state.conciliacaoResumo = contexto.conciliacaoResumo || {};
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
    } catch (erro) {
      state.erro = erro?.message || 'Erro inesperado ao carregar a estrutura financeira.';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function abrir() {
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
