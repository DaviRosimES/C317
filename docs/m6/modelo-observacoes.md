# Modelo das observações da M6

Implementação da V5 ([#31](https://github.com/DaviRosimES/C317/issues/31)) sobre o contrato `c317.m6.v1` da G4 ([requisitos e contrato](requisitos-e-contrato.md)). A revisão `e3b8d41f6a27` sucede `c5e1f7a3b902` (a `f4c9a2d7e815` acrescenta o histórico) e incorpora a [proposta de persistência](contrato-importacao.sql) com as colunas que `scripts.carregar_m6` exige. Por isso o carregador funciona sem alteração.

As tabelas anteriores (`indicadores`, `tipos_indicadores`, `setores`/CNAE, `relatorios` etc.) não mudam. Os lançamentos antigos continuam consultáveis pelas rotas atuais. As observações da M6 ficam em tabelas próprias e serão expostas pela V6.

## Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `catalogos_m6` | Temas, indicadores, categorias, territórios, unidades e fontes, cada item como JSONB indexado por `(tipo, codigo)` |
| `observacoes_m6` | Uma linha por observação: o JSON do contrato em `conteudo`, o decimal exato em `valor`, o estado de publicação e colunas geradas a partir do JSON |
| `cargas_m6` | Histórico das cargas, por hash do pacote |
| `historico_observacoes_m6` | Ações administrativas (cadastro, correção, publicação, despublicação, bloqueio, desbloqueio), com usuário, data e detalhes. Fica fora de `conteudo`, para que repetir a carga não acuse conflito. |

As colunas geradas (`indicador_codigo`, `categoria_codigo`, `territorio_codigo`, `unidade_codigo`, `fonte_codigo`, `qualificador`, `referencia_tipo`, `ano_inicio`, `ano_fim`, `mes`) são calculadas pelo banco a partir de `conteudo`. Ninguém as grava diretamente. Elas existem para a identidade, as restrições e os filtros da V6.

## O que o banco garante

As regras valem para qualquer forma de escrita: carregador, API ou SQL manual.

| Regra | Como |
| --- | --- |
| Uma observação por indicador, território, categoria, unidade, fonte e referência | Índice único `uq_observacoes_m6_identidade` (com `NULLS NOT DISTINCT`). O valor não faz parte da identidade, então uma correção não vira uma segunda observação. |
| Mesmo indicador em vários municípios e categorias | A identidade inclui território e categoria; nenhuma categoria vira coluna. |
| Observação completa | Indicador, território, unidade, fonte, qualificador e referência são obrigatórios; temas e proveniências não podem ser vazios. |
| Códigos existem no catálogo | Trigger `validar_observacao_m6`. Um item de catálogo em uso não pode ser removido (`proteger_catalogo_m6`). |
| Unidade | O mesmo trigger aplica `inteira` e `maximo` da unidade. Toda unidade precisa declarar `inteira`, `maximo` e `casas_exibicao`. |
| Qualificador | `igual` ou `maior_que` ("mais de"); qualquer outro é recusado. |
| Referência | Os tipos são `anual`, `mensal`, `acumulada`, `levantamento` e `retrato`. O mês só existe na referência mensal; anual, mensal e retrato têm um único ano; retrato exige `data_extracao`. Não existe tipo para período desconhecido. |
| Valor | Não negativo, transmitido como texto em `conteudo.valor` e idêntico à coluna `valor`. |
| CNAE | Classificação própria e opcional (`conteudo.codigo_cnae`), nunca inferida da categoria. |
| Publicação | `status = 'publicado'` exige `publicado_por` e `publicado_em` e é impossível com `divulgacao_bloqueada`. O bloqueio exige `motivo_bloqueio` (por exemplo, amostra insuficiente). |

Registros novos entram como `rascunho`, inclusive os da carga. A publicação cabe ao fluxo administrativo da V6.

O CNAE de um recorte pertence à categoria do catálogo (`categorias.codigo_cnae`). A identidade não inclui `codigo_cnae`; por isso o cadastro pela API não aceita o campo solto, e dois CNAEs para o mesmo recorte são duas categorias.

## Unidades

A unidade define o significado e a validação; o banco nunca converte uma unidade em outra.

| Exemplo de unidade | `inteira` | `maximo` |
| --- | --- | --- |
| pessoas, empresas, patentes, UHs | sim | — |
| `%`, `% dos entrevistados` | não | 100 |
| `índice (0 a 1)` | não | 1 |
| `índice (0 a 100)` | não | 100 |
| `nota 0–10` | não | 10 |
| `R$`, `km²`, "por mil hab." | não | — |

Um índice de 0 a 1 continua de 0 a 1: `0.75` não é exibido nem guardado como 75%.

## Referências

- `2000–2024` é `acumulada` (ano de início 2000, ano de fim 2024) e nunca se confunde com o ano 2024.
- "Janeiro" no questionário de fluxo é uma **categoria** de uma referência `anual` de 2024. Não existe observação mensal de janeiro de 2024 nesta carga.
- Valores sem referência confirmada não entram no pacote da G4, e o banco não oferece como representá-los.

## Precisão e apresentação

- `valor` é `NUMERIC` sem escala fixa. O decimal recebido é guardado exatamente, inclusive os 41 valores com mais de quatro casas, e a API deve devolvê-lo como texto.
- A apresentação arredonda **meio para cima** nas `casas_exibicao` da unidade, com `app.core.apresentacao.valor_para_exibicao`. O valor original nunca é substituído pelo arredondado.
- O qualificador `maior_que` acompanha o valor na apresentação ("mais de 1.000").

## Aplicar

Dentro de `backend/`:

```bash
python -m alembic upgrade head
python -m scripts.carregar_m6 --conferir-banco
python -m scripts.carregar_m6 --aplicar --confirmar-carga-real
```

O downgrade é recusado quando há observações, para não descartar dados e o histórico de publicação.
