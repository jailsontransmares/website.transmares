# Sincronização bidirecional do RH com Google Sheets

## Fluxos

- **Hub → Supabase → Sheets:** os triggers do Postgres enfileiram mudanças; o cron chama o worker a cada minuto. As linhas de colaboradores são localizadas pelo CPF e as alterações pelo UUID em `REGISTRO DA ALTERAÇÃO`.
- **Sheets → Supabase → Hub:** o Apps Script envia edições individuais feitas por uma pessoa nas duas abas para esta Edge Function. Ela só grava colunas com mapeamento explícito; o trigger do Postgres atualiza a fila e o worker devolve a versão canônica do Hub à planilha. Escritas feitas pela API do Sheets não disparam o gatilho `onEdit`, evitando eco.

As colunas de identificação, cálculo/fórmula e sem correspondência direta permanecem somente para leitura. `CARGA HORARIA / MÊS` é um valor próprio, sem conversão da carga semanal.

## Configuração de credenciais e acesso

1. Ative a Google Sheets API no Google Cloud e use uma conta de serviço. O worker procura a credencial em `GOOGLE_SERVICE_ACCOUNT_JSON` e, como alternativa, em `GCP_ACCOUNT_KEY` (caso esse secret existente contenha o JSON da conta de serviço).
2. Compartilhe a planilha `1NG_kq5afXgsqhaklu-D0JXPhd4ICyV_U6x7M8dN2V-8` com o `client_email` da conta de serviço, com permissão de editor.
3. Configure estes secrets no Supabase → Edge Functions → Secrets:
   - `RH_GOOGLE_SHEETS_WORKER_TOKEN`: token aleatório exclusivo do worker.
   - `RH_GOOGLE_SHEETS_INBOUND_TOKEN`: outro token aleatório, usado somente pelo Apps Script para enviar edições.
   - `GOOGLE_SERVICE_ACCOUNT_JSON` somente se `GCP_ACCOUNT_KEY` não for a chave correta.
4. Grave o valor de `RH_GOOGLE_SHEETS_WORKER_TOKEN` no Supabase Vault sob `rh_google_sheets_worker_token`. O cron usa esse valor para chamar o worker.
5. Depois de autenticar a Supabase CLI, implante com `npx supabase functions deploy rh-google-sheets-sync --project-ref lmzdtsqhlrosovbxiadx --use-api --no-verify-jwt`.

Não coloque tokens nem a chave JSON no repositório ou em mensagens. Nunca reutilize o token do ClickUp.

## Ativar o fluxo Sheets → Supabase

1. Abra a planilha e acesse **Extensões → Apps Script**.
2. Copie `apps-script/Code.gs` para o editor vinculado à planilha e configure o manifesto conforme `apps-script/appsscript.json` (o runtime requer `spreadsheets.currentonly`, `script.external_request` e `script.scriptapp`).
3. Em **Configurações do projeto → Propriedades do script**, crie `RH_GOOGLE_SHEETS_INBOUND_TOKEN` com o mesmo valor do secret do Supabase.
4. Execute `rhInstalarGatilhoDeEdicao` uma vez e autorize as permissões solicitadas. O gatilho envia apenas a célula editada junto com o CPF da linha ou o UUID do registro.

## Colunas que aceitam edição na planilha

- `CAD_COLABORADOR`: campos pessoais e de contato, endereço, documentos, vínculo, cargo/função, remuneração, carga mensal, jornada, intervalo e até três dependentes legais. CPF, status do Hub, carimbo, dependentes agregados e endereço concatenado são identificadores ou campos derivados e não entram de volta no Hub. O tipo de desligamento só pode ser editado quando já existe um desligamento no Hub.
- `CAD_ALTERACOES`: data e observações; nos registros de férias, início/fim do período aquisitivo, início/fim do gozo e abono. Identificadores, tipo, nome e textos compostos ficam somente para leitura. As colunas de fórmula `AQUISIÇÃO`, `GOZO` e `ABONO` não são escritas.
- Exclusão de linha na planilha não apaga o cadastro do Hub. Para preservar o histórico, inative o colaborador pelo Hub.

## Operação

- A migration enfileira os registros existentes para a carga inicial.
- Na tela Colaboradores do Hub, usuários com permissões de edição e visualização de dados sensíveis podem usar **Sincronizar planilha** para processar até 20 alterações pendentes imediatamente. O endpoint valida a sessão e as permissões no Supabase; nenhum token de worker é enviado ao navegador.
- Usuários com permissões de criação, edição e visualização de dados sensíveis também podem usar **Importar da planilha** para criar no Hub até 100 cadastros por execução a partir de `CAD_COLABORADOR`. A importação exige CPF válido e único, ignora CPFs que já existem no Hub e informa linhas inválidas; não sobrescreve cadastros existentes. A lista do Hub é atualizada após a importação.
- O worker reprocessa falhas com espera crescente; não grava colunas sem mapeamento nem as colunas de fórmula.
- Falhas de saída são registradas em `integracao_logs` e na fila. Edições recusadas pelo mapeamento ou validação retornam erro ao Apps Script e são registradas sem incluir CPF ou valor editado no log.
