import { exigirSupabaseConfigurado } from '../supabaseClient.js';

export async function reconhecerPrecosPlanoComOpenAI({ imageBase64, mimeType = 'image/jpeg' } = {}) {
  if (!imageBase64 || typeof imageBase64 !== 'string') throw new Error('A imagem para reconhecimento está vazia.');

  const supabase = exigirSupabaseConfigurado();
  const { data, error } = await supabase.functions.invoke('gemini-plan-price-ocr', {
    body: { imageBase64, mimeType }
  });
  if (error) throw new Error(error.message || 'Não foi possível consultar a OpenAI.');
  if (!data?.ok) throw new Error(data?.message || 'A OpenAI não conseguiu ler a tabela de preços.');
  return data;
}
