# Financeiro — runbook de backup, restauração e reversão

Este procedimento deve ser executado antes de qualquer migration do Financeiro.
A restauração é uma operação técnica fora do Hub.

## Variáveis e segredos

- Usar a connection string do Session Pooler fornecida pelo Supabase.
- Informar a senha somente no ambiente seguro de execução.
- Nunca salvar connection string, senha ou token no repositório.
- Salvar os dumps em diretório privado e criptografado.

## Backup pré-migration

Com Supabase CLI e Docker disponíveis:

```bash
supabase db dump --db-url "$FIN_DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$FIN_DATABASE_URL" -f schema.sql
supabase db dump --db-url "$FIN_DATABASE_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Registrar junto ao backup:

- ambiente e project ref;
- data/hora;
- commit da branch `hub`;
- última migration aplicada;
- responsável;
- hashes SHA-256 dos três arquivos;
- resultado do preflight.

Os dumps não incluem o conteúdo dos arquivos do Google Drive. As tabelas de
documentos guardarão somente ids, links e metadados necessários para
reconciliação.

## Validação obrigatória do backup

1. Criar ou usar um projeto isolado de recuperação.
2. Confirmar extensões e configurações exigidas pelo esquema.
3. Restaurar roles, schema e dados em transação com parada no primeiro erro.
4. Reativar publicações necessárias.
5. Executar preflight e testes de autenticação/RLS.
6. Comparar contagens por tabela e amostras por hash, sem exportar dados
   sensíveis para logs.

Exemplo de restauração:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command "SET session_replication_role = replica" \
  --file data.sql \
  --dbname "$FIN_RESTORE_DATABASE_URL"
```

## Reversão de migration

### Migration ainda não aplicada em produção

- Corrigir o arquivo na própria branch.
- Recriar o banco local e repetir todos os testes.
- Não marcar migration como aplicada manualmente.

### Migration aplicada, sem dados novos relevantes

- Criar uma nova migration compensatória.
- Não editar nem apagar o arquivo já aplicado.
- Preservar tabelas e colunas quando a remoção imediata não for indispensável.

### Migration aplicada, com dados financeiros novos

- Desativar o módulo e bloquear novas gravações.
- Preservar dados e auditoria.
- Fazer backup adicional do estado afetado.
- Aplicar migration compensatória somente após validar o procedimento no
  ambiente de recuperação.

### Falha ampla ou corrupção

- Manter o Hub financeiro indisponível.
- Usar o ponto de recuperação gerenciado ou o backup validado.
- Restaurar em ambiente isolado e homologar antes do corte.
- Reconciliar referências do Google Drive pelos ids persistidos.

## Critérios para seguir após o backup

- Os três dumps foram gerados sem erro.
- Os hashes foram registrados.
- A restauração isolada terminou sem erro.
- Contagens e validações são compatíveis.
- O procedimento de retorno foi estimado e aceito para a janela de mudança.

