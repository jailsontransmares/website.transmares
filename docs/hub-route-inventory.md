# Inventário de rotas atuais do Hub

Este documento congela o mapa de rotas existentes antes da reorganização do menu lateral.

## Objetivo

Registrar quais rotas já existem, quais são aliases/legadas e quais telas internas dependem de estado/hash, para que a nova estrutura de menu seja implantada sem quebrar navegação já utilizada.

## Base técnica atual

O roteador principal lê o `pathname`, remove a base `/hub` quando existir, normaliza o slug e trata `/admin` como módulo `administracao`.

Rotas especiais como `/perfil` e `/configuracoes/corretora` não são módulos do roteador principal; são páginas próprias carregadas por scripts específicos.

## Rotas principais atuais

| Rota | Tela/módulo atual | Tipo | Status para o novo menu |
|---|---|---|---|
| `/` | Home / Dashboard inicial | Principal | Manter |
| `/hub/` | Home / Dashboard inicial em base `/hub` | Principal | Manter |
| `/admin` | Administração | Módulo principal | Manter como rota base administrativa |
| `/painel-ar` | Painel AR | Módulo principal | Manter; será exibido como `Operações > AR Transmares` |
| `/central-senhas` | Central de Senhas | Módulo principal | Manter |
| `/links-corretora` | Links úteis da corretora | Módulo de links | Decidir encaixe futuro |
| `/links-ar` | Links úteis da AR | Módulo de links | Decidir encaixe futuro |
| `/links-gestao` | Links úteis gestão | Módulo de links | Decidir encaixe futuro |

## Rotas especiais atuais

| Rota | Tela atual | Tipo | Observação |
|---|---|---|---|
| `/perfil` | Meu perfil | Página especial | Não é módulo do roteador principal |
| `/configuracoes/corretora` | Configurações/Dados da Corretora | Página especial | Deve virar `Administração > Sistema > Configurações da Corretora` |

## Aliases administrativos atuais

| Rota limpa | Destino legado atual | Status |
|---|---|---|
| `/admin/usuarios` | `/admin#usuarios` | Manter |
| `/admin/perfis` | `/admin#perfis` | Manter |
| `/admin/permissoes` | `/admin#permissoes` | Legado/sensível; validar uso antes de reaproveitar |
| `/configuracoes` | `/admin#identidade` | Legado; será substituído conceitualmente por `/configuracoes/corretora` ou alias novo |

## Abas internas atuais da Administração

Estas opções existem hoje dentro de `/admin`, mas nem todas possuem rota limpa própria.

| Aba interna | Estado interno | Rota própria atual | Novo encaixe planejado |
|---|---|---|---|
| Identidade do Painel | `identidade` | Não; acessível por `/admin` ou `/admin#identidade` | Deixar de existir isolado; absorver em Configurações da Corretora |
| Aparência | `aparencia` | Não | Deixar de existir isolado; absorver em Configurações da Corretora |
| Logo e Marca | `logo` | Não | Deixar de existir isolado; absorver em Configurações da Corretora |
| Limites do Painel | `limites` | Não | `Administração > Parâmetros > Limites` |
| Categorias | `categorias` | Não | `Administração > Cadastros > Categorias` |
| Grupos | `grupos` | Não | `Administração > Cadastros > Grupos` |
| Home e Exibição | `home-exibicao` | Não | Deixar de existir isolado; absorver/reestruturar conforme necessidade |
| Usuários | `usuarios` | Sim: `/admin/usuarios` e `/admin#usuarios` | `Administração > Cadastros > Usuários` |
| Perfis de Acesso | `perfis` | Sim: `/admin/perfis` e `/admin#perfis` | `Administração > Cadastros > Perfis` |
| Permissões | `permissoes` | Alias existe, mas não há item visível atual confirmado | Legado/sensível; não encaixar sem validação |

## Rotas novas sugeridas para a próxima fase

Estas rotas ainda não devem substituir as atuais sem alias/fallback.

| Nova rota desejada | Deve apontar inicialmente para | Novo menu |
|---|---|---|
| `/operacoes/ar-transmares` | `/painel-ar` | Operações > AR Transmares |
| `/admin/sistema/corretora` | `/configuracoes/corretora` | Administração > Sistema > Configurações da Corretora |
| `/admin/parametros/limites` | `/admin#limites` | Administração > Parâmetros > Limites |
| `/admin/cadastros/categorias` | `/admin#categorias` | Administração > Cadastros > Categorias |
| `/admin/cadastros/grupos` | `/admin#grupos` | Administração > Cadastros > Grupos |
| `/admin/cadastros/usuarios` | `/admin#usuarios` | Administração > Cadastros > Usuários |
| `/admin/cadastros/perfis` | `/admin#perfis` | Administração > Cadastros > Perfis |

## Pontos de atenção antes da Fase 2

1. O sincronizador administrativo atual reconhece bem apenas `usuarios`, `perfis` e `permissoes` por rota/hash.
2. Antes de criar menu novo, será necessário ampliar a sincronização para `limites`, `categorias` e `grupos`.
3. Itens-pai do novo menu não devem ter rota própria. Ex.: `Operações`, `Administração`, `Sistema`, `Parâmetros` e `Cadastros` devem apenas expandir/recolher.
4. `/perfil` e `/configuracoes/corretora` devem ser tratados como páginas especiais ou convertidos formalmente em rotas reconhecidas pelo roteador antes de remover qualquer fallback.
5. `Identidade do Painel`, `Aparência`, `Logo e Marca` e `Home e Exibição` não devem aparecer como itens independentes no novo menu.
