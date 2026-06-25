import { carregarDadosAR, gerarLinksAR } from './services/arService.js';
import {
  cancelarReciboAR,
  carregarDadosValidacoesAR,
  criarValidacaoManual,
  emitirReciboAR,
  excluirImportacaoRepasseAR,
  importarRepasseAR,
  verificarImportacaoRepasseAR
} from './services/arValidacoesService.js';
import {
  carregarAdminData,
  listarPerfisAdmin,
  listarModulosAdmin,
  listarPermissoesAdmin,
  listarPermissoesUsuarioAdmin,
  listarRegistrosAdmin,
  excluirPerfilAdmin,
  listarUsuariosAdmin,
  restaurarCoresPadrao,
  salvarConfig,
  salvarPerfilAdmin,
  salvarPermissaoPerfilAdmin,
  salvarPermissoesPerfilAdminLote,
  salvarPermissaoUsuarioAdmin,
  salvarPermissoesUsuarioAdminLote,
  salvarRegistroAdmin,
  salvarUsuarioAdmin,
  salvarStatusModuloAdmin,
  salvarTemaUsuario,
  salvarVisibilidadeModulosHomeAdmin
} from './services/adminService.js';
import { carregarDadosIniciaisSupabase } from './services/hubService.js';
import {
  alternarFavoritoLink,
  carregarLinksData,
  salvarLinkItem
} from './services/linksService.js';
import {
  carregarPasswordsData,
  excluirPasswordItem,
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

    if (action === 'getArValidacoesData') {
      const dados = await carregarDadosValidacoesAR(payload);
      return { ok: true, data: dados };
    }

    if (action === 'createArValidacaoManual') {
      const dados = await criarValidacaoManual(payload);
      return { ok: true, data: dados };
    }

    if (action === 'checkArRepasseImportado') {
      const dados = await verificarImportacaoRepasseAR(payload);
      return { ok: true, data: dados };
    }

    if (action === 'importArRepasse') {
      const dados = await importarRepasseAR(payload);
      return { ok: true, data: dados };
    }

    if (action === 'deleteArRepasseImportado') {
      const dados = await excluirImportacaoRepasseAR(payload);
      return { ok: true, data: dados };
    }

    if (action === 'emitirArRecibo') {
      const dados = await emitirReciboAR(payload);
      return { ok: true, data: dados };
    }

    if (action === 'cancelarArRecibo') {
      const dados = await cancelarReciboAR(payload);
      return { ok: true, data: dados };
    }

    const acoes = {
      getAdminData: () => carregarAdminData(),
      listAdminModules: () => listarModulosAdmin(),
      listAdminUsers: () => listarUsuariosAdmin(),
      listAdminProfiles: () => listarPerfisAdmin(),
      listAdminPermissions: () => listarPermissoesAdmin(),
      listAdminUserPermissions: () => listarPermissoesUsuarioAdmin(payload),
      listAdminRecords: () => listarRegistrosAdmin(payload),
      saveAdminUser: () => salvarUsuarioAdmin(payload),
      saveAdminProfile: () => salvarPerfilAdmin(payload),
      deleteAdminProfile: () => excluirPerfilAdmin(payload),
      saveAdminProfilePermission: () => salvarPermissaoPerfilAdmin(payload),
      saveAdminProfilePermissionsBatch: () => salvarPermissoesPerfilAdminLote(payload),
      saveAdminUserPermission: () => salvarPermissaoUsuarioAdmin(payload),
      saveAdminUserPermissionsBatch: () => salvarPermissoesUsuarioAdminLote(payload),
      saveAdminRecord: () => salvarRegistroAdmin(payload),
      updateAdminModuleStatus: () => salvarStatusModuloAdmin(payload),
      saveAdminModuleHomeVisibilityBatch: () => salvarVisibilidadeModulosHomeAdmin(payload),
      saveConfig: () => salvarConfig(payload),
      restoreDefaultColors: () => restaurarCoresPadrao(),
      saveUserTheme: () => salvarTemaUsuario(payload),
      getLinksData: () => carregarLinksData(payload),
      saveLinkItem: () => salvarLinkItem(payload),
      toggleFavoriteLink: () => alternarFavoritoLink(payload),
      getPasswordsData: () => carregarPasswordsData(payload),
      deletePasswordItem: () => excluirPasswordItem(payload),
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
