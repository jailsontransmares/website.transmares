import { exigirSupabaseConfigurado } from '../supabaseClient.js';

export async function listarResponsaveisAtivosCrm2() {
  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.rpc('crm2_responsaveis_ativos');

  if (error) {
    throw new Error(error.message || 'Não foi possível carregar usuários ativos.');
  }

  return (data || [])
    .map((user) => ({ id: user.id, nome: String(user.nome || '').trim() }))
    .filter((user) => user.id && user.nome);
}
