import { exigirSupabaseConfigurado } from '../supabaseClient.js';

export async function obterSessaoAtual() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Não foi possível verificar a sessão.');
  }

  return data.session || null;
}

export async function entrarComSenha(email, password) {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password
  });

  if (error) {
    throw new Error(error.message || 'E-mail ou senha inválidos.');
  }

  return data.session || null;
}

export async function sairDoHub() {
  const supabase = exigirSupabaseConfigurado();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || 'Não foi possível sair.');
  }
}
