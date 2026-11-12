# Pacote G8

Contrato: **c317.m7.g8.v2**. Dados preparados conforme a revisão 2 da G7: Setor e Ano/Período selecionam os indicadores disponíveis.

São 61 indicadores e 303 dados, todos referentes a Santa Rita do Sapucaí. As 119 exclusões da origem permanecem respeitadas. Os 925 dados de outras abrangências foram retirados da carga; o arquivo original e o pacote M6 continuam preservados como fontes.

Consulte [tratamento dos dados e orientações de integração](../../../docs/m7/g8-tratamento-dos-dados.md) antes da carga.

- `catalogos.json`: definições com `setores` e catálogos.
- `setores_indicadores.csv`: 67 associações entre os 61 indicadores e os seis setores, com seis indicadores multissetoriais.
- `dados_indicadores.jsonl`: valores, referência, fonte, recorte e origem documental.
- `dicionario_indicadores.csv`: revisão humana das definições.
- `mapeamento_m6_m7.csv`: correspondência de cada dado antigo com seu destino.
- `regras_normalizacao.json`: regras de correspondência aplicadas.
- `exclusoes.csv`: linhas que continuam fora da carga e seus motivos.
- `retirados_por_abrangencia.csv`: identificadores dos 925 dados fora do escopo, sem valores, para futuro arquivamento caso já existam no banco.
- `legado_demonstracao.csv`: orientação para os tipos fictícios antigos.
- `manifesto.json`: hashes, contagens e preservação de estados.

**Este pacote não foi aplicado ao banco.** O carregador da M6 não aceita este contrato. Nos 303 dados municipais, publicação, arquivamento e bloqueio existentes devem ser preservados na migração; dados novos começam como rascunhos. Os 925 dados fora do escopo não são importados e devem ser arquivados caso já existam no banco.

Identificadores dos dados são estáveis, e não devem ser recalculados após uma correção. A unidade vem da definição do indicador. Valores decimais são strings no JSONL para preservar a precisão.

O antigo agrupamento por temas foi reaproveitado como Setores do Observatório; não é CNAE ou setor econômico. O período continua nos dados. Um indicador só aparece no filtro global quando tem ao menos um dado público elegível para a combinação. O JSONL de valores é idêntico ao pacote preparado anterior.
