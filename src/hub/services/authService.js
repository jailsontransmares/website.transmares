import { exigirSupabaseConfigurado } from '../supabaseClient.js';

export async function obterSessaoAtual() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Não foi possível verificar a sessão.');
  }

  return data.session || null;
}

export async function entrarComSenha(identificador, password) {
  const supabase = exigirSupabaseConfigurado();
  const valor = String(identificador || '').trim();
  let sessao = null;

  if (valor.includes('@')) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: valor.toLowerCase(),
      password
    });

    if (error) throw new Error('Usuário ou senha inválidos.');
    sessao = data.session || null;
  } else {
    const { data, error } = await supabase.functions.invoke('username-login', {
      body: { username: valor, password }
    });

    if (error || data?.ok === false || !data?.session?.access_token || !data?.session?.refresh_token) {
      throw new Error(data?.message || 'Usuário ou senha inválidos.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    if (sessionError) throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
    sessao = sessionData.session || null;
  }

  return sessao;
}

export async function sairDoHub() {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || 'Não foi possível sair.');
  }
}
