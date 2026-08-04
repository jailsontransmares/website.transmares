# Financeiro — Fase 1: fundação do módulo

## Entregas

- Controller, página e service independentes de `app.js`.
- Sete áreas principais: Dashboard, Lançamentos, Conciliação, Cartões,
  Relatórios e Fechamento, Cadastros e Configurações.
- Fechamento fica dentro de Relatórios; Auditoria fica dentro de Configurações.
- Estados de carregamento, erro, ausência de empresa e ausência de dados.
- Mapa de permissões financeiras disponível para perfis e usuários.
- Estrutura multiempresa com vínculo explícito entre usuário e empresa.
- Parâmetros globais com o módulo desativado por padrão.
- Auditoria financeira append-only na interface.
- RLS e privilégios mínimos nas tabelas expostas.

## Ativação

O item do Financeiro permanece com `status = inativo` e `exibir_home = false`.
Nenhuma permissão financeira é concedida automaticamente a perfis.

A futura ativação exige, em conjunto:

1. migration aplicada e validada;
2. vínculo do usuário com uma empresa;
3. concessão explícita de `financeiro:view` e das áreas necessárias;
4. ativação do item do módulo;
5. homologação com perfil-piloto.

## Banco

| Estrutura | Finalidade |
|---|---|
| `fin_empresas` | Entidade canônica de empresa do Financeiro. |
| `fin_usuario_empresas` | Escopo de empresas autorizado por usuário. |
| `fin_parametros` | Configurações globais ou específicas por empresa. |
| `fin_auditoria` | Histórico operacional imutável para o cliente. |

O cadastro inicial da Transmares é derivado de `corretora_configuracoes` quando
disponível. Administradores e usuários master recebem apenas o vínculo com essa
empresa; isso não concede acesso ao módulo.

A estrutura fica em `20260730170731_financeiro_foundation.sql`. A empresa inicial,
os vínculos e os parâmetros ficam no seed separado
`20260730170749_financeiro_foundation_seed.sql`.

## Histórico de migrations

O histórico remoto foi sincronizado com os nomes e versões locais. Cinco migrations
de base anteriores ao uso do histórico da CLI permanecem apenas no repositório:

- `202606230001_ar_validacoes_base.sql`
- `202606230002_ar_importacao_repasse.sql`
- `202606230003_ar_excluir_importacao_repasse.sql`
- `202606240001_access_control_base.sql`
- `202606250001_add_admin_modulos_permission.sql`

Não executar `db push --include-all` antes de reconciliar essas versões com o banco
remoto, para evitar a reaplicação de estruturas já existentes.

## Validação

- `supabase/tests/financeiro_phase_0_postflight.sql`
- `supabase/tests/financeiro_phase_1_foundation.sql`
- advisors de segurança e desempenho após a aplicação em preview
- testes com usuário sem permissão, sem empresa e com empresa autorizada

O projeto de preview estava inativo durante a implementação. A migration não foi
aplicada na produção nesta fase.
