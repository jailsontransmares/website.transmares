# Cartas · configuração do backend

A função `cartas-assinatura` usa um segredo AES-256-GCM para criptografar o PFX e a senha antes de gravá-los no bucket privado `cartas-private`.

Antes de habilitar a área no ambiente Supabase:

1. Aplique a migration `cartas_assinadas_foundation`.
2. Gere uma chave nova de 32 bytes, por exemplo com `openssl rand -base64 32`.
3. Cadastre o resultado como segredo da Edge Function: `supabase secrets set CARTAS_ENCRYPTION_KEY="<chave-base64>" --project-ref <project-ref>`.
4. Publique a função com `supabase functions deploy cartas-assinatura --project-ref <project-ref>`.

Não salve a chave em `.env`, no frontend, no banco ou no repositório. Sem esse segredo, o sistema não consegue importar ou usar certificados. Não rotacione a chave sem antes migrar os arquivos criptografados existentes para a chave nova.

O certificado e sua senha ficam criptografados no Storage privado; a função usa a service role apenas no backend após validar sessão, permissão e, para assinatura, autenticação recente. O PDF usa assinatura CMS destacada com subfiltro `ETSI.CAdES.detached`. A aceitação do perfil ICP-Brasil deve ser confirmada com certificado real em ambiente controlado pelo validador oficial antes de uso em produção.
