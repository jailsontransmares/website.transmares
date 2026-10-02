# Unimed Maceió: tarifas extraídas das imagens

O arquivo `unimed_maceio_tabelas_ate_2026-09-30.csv` preserva a transcrição original das 21 grades. O arquivo `unimed_maceio_tabelas_ate_2026-09-30_consolidado.csv` organiza essas grades em 16 tabelas lógicas: Individual e Empresarial. Nas tabelas Individuais, os preços para 1 vida e para 2 ou mais vidas ficam em colunas diferentes.

## Aplicação

A migração `20261002191404_simulador_saude_modalidade_tarifa.sql` cadastra os preços extraídos; `20261002194240_saude_tarifa_por_quantidade_vidas.sql` consolida as tarifas Familiar nas tabelas Individuais correspondentes. Não importe nenhum dos CSVs depois de aplicar as migrações, pois isso duplicaria os valores.

Em outros ambientes, use o CSV consolidado como modelo de importação. As tarifas sem início de vigência continuam em revisão até que a data correta seja informada e os valores atualizados sejam confirmados com a operadora.

## Limites da fonte

- As imagens informam validade até 30/09/2026, mas não mostram o início. O início foi deixado em branco deliberadamente.
- A validade indicada já passou; nenhuma tabela deve ser ativada com base somente nessas imagens.
- UNI Referência não separa valores de 1 vida e de 2 ou mais vidas. Para essa tabela, o sistema usa o valor Individual em cotações com múltiplas vidas.
- UNI Referência exibe percentuais por faixa sem explicar o que significam. Eles foram preservados em `Condicoes` como informação da fonte e não entram no cálculo de preço.
- As condições de coparticipação, carências e adicionais foram copiadas como informadas. Não foram inferidas condições ausentes; em especial, a imagem não informa uma tabela de coparticipação para o exclusivamente ambulatorial.
