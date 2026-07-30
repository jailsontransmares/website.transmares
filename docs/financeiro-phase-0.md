# Financeiro — Fase 0: preparação e segurança

## Resultado da fase

Esta fase congela as decisões técnicas necessárias para iniciar o módulo
Financeiro sem alterar o funcionamento atual do Hub.

Nenhuma rota, tela, permissão, tabela funcional ou item visível do Financeiro é
criado nesta fase.

## Fontes verificadas

- Repositório `jailsontransmares/website.transmares`, branch `hub`.
- Estrutura local de serviços, roteamento e migrations.
- Esquema `public` do projeto Supabase `website.production`, consultado apenas
  para leitura em 30/07/2026.
- Padrão já usado pelo RH & DP para controller/service, RLS, auditoria e Google
  Drive.

## Inventário que afeta o Financeiro

| Estrutura atual | Uso atual | Decisão para o Financeiro |
|---|---|---|
| `usuarios`, `perfis`, `recursos_acesso`, `perfil_permissoes`, `usuario_permissoes` | Identidade e autorização do Hub | Reutilizar. Não criar usuários ou perfis paralelos. |
| `app_usuario_atual_id()` e `app_tem_permissao()` | Contexto do usuário e verificação de permissão | Reutilizar nas políticas e operações financeiras. |
| `itens` | Registro e visibilidade dos módulos na Home | Reutilizar para ativação controlada do Financeiro. |
| `corretora_configuracoes` | Dados institucionais da corretora | Usar apenas como origem para a primeira empresa; não transformar na tabela multiempresa. |
| `parceiros` | Parceiros de indicação e operação da AR | Preservar. Não transformar diretamente em cadastro financeiro compartilhado. |
| `rh_colaboradores` | Cadastro interno do RH & DP | Preservar como domínio do RH; integrar por vínculo, sem duplicar nem mover os dados. |
| `rh_dados_bancarios_colaboradores` | Dados bancários sensíveis do RH | Não expor ao Financeiro por acesso direto. Copiar apenas os dados necessários para o lançamento, conforme permissão. |
| `categorias` e `grupos` | Organização de links e itens do Hub | Não reutilizar como categorias ou centros de custo financeiros. |
| `auditoria_acessos` | Auditoria de acesso e permissões | Manter separada da auditoria operacional financeira. |
| `rh_auditoria` | Auditoria do RH & DP | Manter separada; usar o padrão técnico como referência. |
| `rh_drive_*` e Edge Function `rh-drive` | Integração privada de documentos do RH | Reaproveitar o padrão, mas manter pastas, permissões e metadados financeiros separados. |

O banco verificado possui RLS habilitado em todas as tabelas públicas atuais.
Isso não substitui a criação de políticas específicas por empresa e ação para
as futuras tabelas do Financeiro.

## Modelo de domínio aprovado

### Prefixos e propriedade dos dados

- `fin_*`: dados exclusivamente financeiros.
- `cad_*`: cadastros compartilhados entre módulos.
- `rh_*`: continua pertencendo ao RH & DP.
- Estruturas atuais da AR e Administração permanecem inalteradas.

### Empresas e escopo

- Criar futuramente `fin_empresas` como entidade multiempresa.
- A primeira empresa poderá ser preenchida a partir de
  `corretora_configuracoes`, sem sincronização automática posterior.
- Criar `fin_usuario_empresas` para definir quais empresas cada usuário pode
  consultar ou operar.
- Toda entidade operacional financeira terá `empresa_id` obrigatório.
- A visão consolidada exigirá permissão própria e nunca removerá o filtro de
  empresa das políticas RLS.

### Pessoas compartilhadas

- Criar futuramente `cad_pessoas` como cadastro canônico de pessoa física,
  jurídica ou sem documento.
- Classificações cliente, fornecedor e parceiro serão relações, permitindo mais
  de uma classificação por pessoa.
- Parceiros e colaboradores existentes serão ligados por tabelas de
  correspondência, sem alterar suas chaves primárias.
- A migração de dados existentes será separada da criação do esquema, com
  pré-visualização, contagem, bloqueio de duplicidades e possibilidade de
  reversão.

### Valores e datas

- Valores monetários usarão `numeric(15,2)`.
- Valor do título será positivo; natureza e tipo determinarão entrada ou saída.
- Ajustes, juros, multa e desconto serão registros explícitos, evitando valores
  ambíguos no título principal.
- Datas operacionais serão `date`; eventos e auditoria usarão `timestamptz`.
- Competência será armazenada como o primeiro dia do mês e validada por
  constraint.

### Status, histórico e exclusão

- Preferir `text` com `check constraint` para status que possam evoluir.
- Cadastros usarão ativação/inativação.
- Lançamentos liquidados ou conciliados nunca terão exclusão física.
- Backfills e correções históricas serão migrations próprias, nunca misturados
  à criação das tabelas.

### Auditoria

- Criar futuramente `fin_auditoria`, append-only e separada das auditorias atuais.
- Registrar empresa, usuário, ação, entidade, registro, dados anteriores, dados
  posteriores, motivo, IP/contexto disponível e data/hora.
- O cliente não receberá permissão para atualizar ou excluir auditoria.
- Funções públicas serão `security invoker`. Funções privilegiadas indispensáveis
  ficarão no schema `private`, com `search_path` fixo, validação explícita do
  usuário e privilégios revogados de `public`, `anon` e `authenticated`.

## Contrato de arquitetura

- O módulo será interno ao Hub.
- UI, controller e service do Financeiro ficarão separados de `app.js`.
- Acesso ao Supabase ficará concentrado no service.
- O mapa de permissão passará a reconhecer `financeiro`, mas somente na Fase 1.
- OCR e integrações externas serão opcionais e não bloquearão lançamentos,
  documentos ou conciliação manual.
- Nenhuma tabela financeira será liberada apenas por `to authenticated`; RLS
  combinará ação permitida e empresa autorizada.
- Colunas usadas por RLS, filtros e chaves estrangeiras terão índices explícitos.

## Sequência segura de migrations

As migrations serão criadas pelo Supabase CLI no momento de cada fase. Não há
migration vazia ou aplicada antecipadamente na Fase 0.

| Ordem | Migration futura | Conteúdo |
|---|---|---|
| 1 | Fundação | Estrutura de empresas, vínculo usuário-empresa, parâmetros, auditoria, permissões e módulo inicialmente inativo. |
| 2 | Seed da fundação | Empresa inicial, vínculos administrativos e parâmetros globais, sem concessão automática de permissões. |
| 3 | Cadastro compartilhado | Pessoas, classificações, contatos, endereços, documentos e vínculos com cadastros existentes. |
| 4 | Cadastros financeiros | Contas, categorias, centros de custo, linhas de negócio e contratos. |
| 5 | Motor de lançamentos | Títulos, parcelas, recorrências, rateios, baixas, transferências e histórico. |
| 6 | Documentos | Metadados, vínculos, versões, lixeira e operações do Drive. |
| 7 | Conciliação | Importações, movimentos, sugestões, vínculos e desconciliação. |
| 8 | Cartões | Cartões, faturas, compras, parcelas, pagamentos e estornos. |
| 9 | Relatórios e fechamento | Orçamento, fechamento, snapshots e controles de período. |
| 10 | Recursos complementares | Patrimônio, estoque, compras, recibos, alertas e importações especiais. |

Regras obrigatórias:

1. Não alterar o banco remoto pelo Dashboard.
2. Desenvolver e testar primeiro no projeto Supabase de preview separado.
3. Criar cada arquivo com `supabase migration new`.
4. Aplicar migrations em ordem e de forma aditiva.
5. Separar alteração estrutural de backfill.
6. Executar preflight, reset local, testes RLS, advisors e postflight.
7. Validar a lista de migrations antes de qualquer envio ao ambiente produtivo.

## Estratégia de backup e recuperação

Antes de cada fase com mudança de banco:

1. Confirmar que o backup gerenciado do Supabase está saudável e registrar o
   ponto de recuperação disponível.
2. Gerar dumps separados de roles, schema e dados.
3. Registrar o commit e a última migration aplicada.
4. Preservar referências do Google Drive; arquivos não serão copiados no dump do
   banco.
5. Validar a restauração em ambiente isolado antes de considerar a contingência
   aprovada.

O procedimento técnico detalhado está em
`docs/financeiro-backup-restore-runbook.md`.

## Testes de entrada e saída

### Antes da Fase 1

- Executar `supabase/tests/financeiro_phase_0_preflight.sql`.
- Confirmar que as estruturas-base do Hub existem e estão com RLS.
- Confirmar que o projeto de preview está ativo, separado da produção e
  sincronizado pelas migrations.
- Confirmar backup e teste de restauração.

### Ao concluir cada fase futura

- Migração aplicada do zero no ambiente local.
- Migração aplicada sobre uma cópia do esquema atual.
- Reexecução idempotente dos trechos preparados para isso.
- Matriz de RLS por perfil, ação e empresa.
- Testes de negação para usuário sem empresa e sem permissão.
- Testes de auditoria e imutabilidade.
- Advisors de segurança e desempenho sem regressões críticas.
- `supabase/tests/financeiro_phase_0_postflight.sql` sem falhas.
- Homologação funcional antes da próxima fase.

## Ativação controlada

O Financeiro será protegido por três camadas:

1. configuração financeira global desativada por padrão;
2. item do módulo inativo e oculto da Home;
3. permissão `financeiro:view` sem concessão geral automática.

A ativação seguirá a ordem:

1. ambiente local;
2. preview com administrador técnico;
3. produção ainda oculta, com validação de banco;
4. liberação para um perfil-piloto e uma empresa;
5. ampliação gradual após homologação.

Desativar o módulo deve interromper novos acessos sem apagar dados nem afetar os
demais módulos.

## Critérios de conclusão da Fase 0

- Inventário do Hub e do Supabase registrado.
- Decisões de reaproveitamento e isolamento registradas.
- Modelo financeiro-base definido.
- Sequência de migrations definida.
- Preflight e postflight preparados.
- Procedimento de backup, restauração e reversão definido.
- Estratégia de ativação controlada definida.
- Nenhuma funcionalidade da Fase 1 iniciada.
