import { carregarDadosAR, gerarLinksAR } from './services/arService.js';
import {
  carregarAdminData,
  listarRegistrosAdmin,
  restaurarCoresPadrao,
  salvarConfig,
  salvarRegistroAdmin,
  salvarTemaUsuario
} from './services/adminService.js';
import { carregarDadosIniciaisSupabase } from './services/hubService.js';
import {
  alternarFavoritoLink,
  carregarLinksData,
  salvarLinkItem
} from './services/linksService.js';
import {
  carregarPasswordsData,
  salvarPasswordItem
} from './services/passwordService.js';
import { isSupabaseConfigured } from './supabaseClient.js';

async function testarConexaoSupabase() {
  try {
    const dados = await carregarDadosAR();
    console.info('Teste Supabase produtos_ar:', dados.produtos.slice(0, 5));
  } catch (erro) {
    console.error('Erro no teste inicial do Supabase:', erro);
  }
}

if (isSupabaseConfigured) {
  testarConexaoSupabase();
}

export async function chamarApi(action, payload = {}) {
  try {
    if (action === 'getInitialData') {
      const dados = await carregarDadosIniciaisSupabase();
      return { ok: true, data: dados };
    }

    if (action === 'getArData') {
      const dados = await carregarDadosAR();
      return { ok: true, data: dados };
    }

    if (action === 'generateArLinks') {
      const resultado = await gerarLinksAR(payload);
      return { ok: true, data: resultado };
    }

    const acoes = {
      getAdminData: () => carregarAdminData(),
      listAdminRecords: () => listarRegistrosAdmin(payload),
      saveAdminRecord: () => salvarRegistroAdmin(payload),
      saveConfig: () => salvarConfig(payload),
      restoreDefaultColors: () => restaurarCoresPadrao(),
      saveUserTheme: () => salvarTemaUsuario(payload),
      getLinksData: () => carregarLinksData(payload),
      saveLinkItem: () => salvarLinkItem(payload),
      toggleFavoriteLink: () => alternarFavoritoLink(payload),
      getPasswordsData: () => carregarPasswordsData(payload),
      savePasswordItem: () => salvarPasswordItem(payload)
    };

    if (!acoes[action]) {
      return {
        ok: false,
        message: `Ação ${action} não foi implementada no Supabase.`
      };
    }

    const dados = await acoes[action]();
    return { ok: true, data: dados };
  } catch (erro) {
    console.error(`Erro ao executar ação ${action}:`, erro);
    return {
      ok: false,
      message: erro.message || `Erro ao executar ação ${action}.`
    };
  }
}
