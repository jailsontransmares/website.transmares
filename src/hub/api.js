import { carregarDadosAR, gerarLinksAR } from './services/arService.js';

const LEGACY_APPS_SCRIPT_URL = import.meta.env.VITE_LEGACY_APPS_SCRIPT_URL;

function chamarApiLegada(action, payload = {}) {
  // TODO: substituir chamada Apps Script por Supabase.
  if (!LEGACY_APPS_SCRIPT_URL) {
    return Promise.resolve({
      ok: false,
      message: `Ação ${action} ainda depende do Apps Script legado. Configure VITE_LEGACY_APPS_SCRIPT_URL ou migre esta ação para Supabase.`
    });
  }

  return new Promise((resolve, reject) => {
    const callbackName =
      'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    const params = new URLSearchParams({
      action,
      callback: callbackName,
      payload: JSON.stringify(payload)
    });

    const script = document.createElement('script');
    script.src = `${LEGACY_APPS_SCRIPT_URL}?${params.toString()}`;

    window[callbackName] = function (response) {
      cleanup();
      resolve(response);
    };

    script.onerror = function () {
      cleanup();
      reject(new Error('Não foi possível conectar à API legada.'));
    };

    function cleanup() {
      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    document.body.appendChild(script);
  });
}

async function testarConexaoSupabase() {
  try {
    const dados = await carregarDadosAR();
    console.info('Teste Supabase produtos_ar:', dados.produtos.slice(0, 5));
  } catch (erro) {
    console.error('Erro no teste inicial do Supabase:', erro);
  }
}

testarConexaoSupabase();

export async function chamarApi(action, payload = {}) {
  try {
    if (action === 'getArData') {
      const dados = await carregarDadosAR();
      return { ok: true, data: dados };
    }

    if (action === 'generateArLinks') {
      const resultado = await gerarLinksAR(payload);
      return { ok: true, data: resultado };
    }

    return await chamarApiLegada(action, payload);
  } catch (erro) {
    console.error(`Erro ao executar ação ${action}:`, erro);
    return {
      ok: false,
      message: erro.message || `Erro ao executar ação ${action}.`
    };
  }
}
