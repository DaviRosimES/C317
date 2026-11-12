# G9 — Contrato dos filtros globais e dos recortes locais

> **Documento anterior — substituído em 05/11/2026.** Referência atual: [Fluxos de uso, seção de filtros](03-fluxos-de-uso.md). O restante está preservado como histórico e não deve orientar uma nova implementação isoladamente.

**Revisão 2, consolidada em 05/11/2026.** Gustavo confirmou a navegação por filtros antes da escolha do indicador e o uso dos seis grupos recebidos como Setores do Observatório. Esta regra substitui a proposta anterior de selecionar o indicador primeiro. A divisão de tarefas ainda aguarda revisão antes de publicar as issues.

## 1. Decisão e vocabulário

Os filtros principais da página são **Setor** e **Ano/Período**. A aplicação mostra somente indicadores com ao menos um dado público elegível que atenda à seleção. A escolha de um indicador para abrir detalhes é posterior e opcional conforme a composição de João.

Setor do Observatório usa os seis agrupamentos recebidos: **Dados gerais, Turismo, Economia criativa, Eventos, Pesquisa e inovação e Vale da Eletrônica**. O antigo Tema é reaproveitado como Setor; não criar os dois como classificações paralelas com os mesmos valores.

Um indicador pertence a um ou mais setores. Cada dado permanece ligado ao indicador e herda esse enquadramento para a consulta. O ano não é um atributo fixo do indicador: vem da referência de seus dados.

**Setor do Observatório não é setor econômico nem CNAE.** No detalhe do estoque de empresas, Comércio/Indústria/Serviços/Agropecuária continuam como recortes da classificação **Setor econômico (Sebrae)**. Moradores e Visitantes continuam como Público da pesquisa. Essa separação evita atribuir um significado novo ao valor recebido.

## 2. Estrutura e campos

| Elemento | Campos relevantes | Responsabilidade |
| --- | --- | --- |
| Setor | `codigo`, `nome` | Catálogo dos agrupamentos do Observatório. |
| Indicador | `setores` (lista não vazia), unidade, definição e classificações permitidas | Define em quais setores a medida pode aparecer. |
| Dado do indicador | `indicador_codigo`, `referencia`, valor, fonte e categoria | Fornece o valor e o período disponível para a medida. |
| Categoria e classificação | `categoria_codigo` e sua `classificacao` | Recorte local do dado, sem substituir o Setor global. |

No pacote v2, o catálogo `setores` e o campo `indicador.setores` substituem `temas`. Os códigos recebidos são preservados como identificadores opacos, inclusive quando seu prefixo interno antigo contém `tema`. Não expor esse prefixo no produto nem recriar IDs apenas para renomeá-lo.

Setor não faz parte da identidade semântica do dado. Alterar o enquadramento de um indicador não copia seus valores nem cria novos dados. A identidade continua indicador + município + categoria/ausência + referência completa + fonte.

## 3. Fluxo público obrigatório

1. Abrir Indicadores, que reúne dados, gráficos e tabela.
2. Mostrar Setor e Ano/Período antes da lista. Padrões: Todos os setores e Todos os períodos.
3. Escolher um setor e uma referência completa, quando desejado, e aplicar os filtros. Os filtros aplicados são refletidos na URL.
4. Retornar somente indicadores com dados elegíveis para a combinação. O indicador aparece uma vez, mesmo pertencendo a vários setores.
5. Em cada indicador, usar somente os dados que passaram no filtro global. O nome, a definição e a unidade acompanham a leitura.
6. Abrir um indicador ou seus recortes, se a composição visual usar detalhe. Fonte, classificação e categoria são filtros locais e não reclassificam o indicador em outro setor.

João decide cards, lista pesquisável, disposição e abertura dos detalhes. A página não exige escolher um indicador antes de aplicar Setor e Ano/Período. Não há outra consulta separada em Dashboard.

## 4. Regra de inclusão e exemplos

Um dado entra na seleção se for municipal, publicado, não arquivado, não bloqueado e ligado a indicador ativo; o indicador deve pertencer ao setor selecionado e a referência do dado deve coincidir com a opção selecionada. Todos elimina apenas a restrição daquele filtro.

**Um indicador aparece se existir ao menos um desses dados.** Não basta pertencer ao setor e ter algum dado de outro período. O backend e a tela usam a mesma regra; não esconder apenas os cards deixando a API retornar conteúdo indevido.

| Filtros globais | Resultado de referência no pacote preparado |
| --- | --- |
| Economia criativa + 2025 anual | Os quatro indicadores de percepção da cidade: Acolhedora, Criativa, Inovadora e Inspiradora. |
| Turismo + 2024 anual | Os 14 indicadores turísticos com dados anuais de 2024, incluindo hospedagem e UHs. Acolhedora não aparece. |
| Economia criativa + 2024 anual | Nenhum indicador nessa combinação; mostrar ausência, sem retornar todos como alternativa. |
| Turismo + 2022 e 2023 levantamento | Empreendimentos ativos locais; não duplicar esse levantamento em dois anos anuais. |
| Todos os setores + Todos os períodos | Até 61 indicadores e 303 dados da origem atual, sem duplicação pelas associações setoriais. |

As contagens descrevem uma simulação do pacote preparado. A quantidade pública real depende de publicação, arquivo e bloqueio persistidos. Dados novos não são publicados automaticamente para atingir essas contagens.

## 5. Ano/Período é uma referência completa

| Opção | Correspondência | Exemplo após abrir o indicador |
| --- | --- | --- |
| 2024 — anual | Tipo anual, início/fim 2024, sem mês | Depósitos de PI = 5. |
| 2000–2024 — acumulado | Tipo acumulada, início 2000 e fim 2024 | Depósitos de PI = 72. |
| 2020–2024 — acumulado | Tipo acumulada, início 2020 e fim 2024 | Depósitos de PI = 24. |
| 2022 e 2023 — levantamento | Tipo levantamento, início 2022 e fim 2023 | Total de empreendimentos ativos locais = 116. |

2024 anual não inclui acumulados encerrados em 2024. Não testar se um ano está dentro de qualquer intervalo. O levantamento de 2022 e 2023 não vira dois dados anuais.

Todos os períodos conserva cada referência identificada e não autoriza somar ou misturar tipos de referência. Mensal e retrato continuam suportados pelo modelo quando existirem dados recebidos completos; não criar opções vazias para eles no pacote atual.

## 6. Opções, mudança de filtros e URL

As opções de Setor vêm dos setores com ao menos um indicador ativo e dado público elegível em algum período. A opção não desaparece apenas porque o ano atualmente selecionado é incompatível.

As opções de Ano/Período vêm dos dados elegíveis dos indicadores do setor escolhido. Se a troca de Setor tornar o período inválido, limpar o período para Todos e informar a mudança. Aplicar atualiza a seleção, os resultados e a URL. Limpar filtros volta aos dois valores Todos.

O exemplo Economia criativa + 2024 anual verifica a ausência de correspondência no pacote e a resposta vazia da consulta para essa combinação. Não exige criar uma opção vazia no controle: ao trocar o setor na interface, aplica-se a limpeza do período incompatível descrita acima. A API nunca substitui silenciosamente uma combinação sem dados por todos os dados.

Ao recarregar uma URL válida, restaurar a seleção. Valor desconhecido ou incompatível deve ser removido com indicação clara, sem mudar silenciosamente para outro setor/período. Parâmetros antigos não permitem consultar outra cidade.

Se o indicador aberto deixar de pertencer aos resultados, fechar ou limpar seu detalhe. Se continuar, limpar apenas recortes locais incompatíveis. Carregamento, vazio, falha e atualização de publicação precisam atualizar a lista e as opções sem usar dados fictícios como fallback.

## 7. Recortes locais e significado dos números

| Indicador | Recorte local recebido |
| --- | --- |
| Estoque de empresas | Setor econômico (Sebrae), Porte ou Segmento, uma classificação por vez. |
| Empreendimentos ativos locais | Categoria do cadastro SMCELT ou Grupo do cadastro SMCELT. |
| Meios de hospedagem cadastrados | Categoria de hospedagem ou Zona. |
| Cidade vista como: Acolhedora | Público da pesquisa: Amostra total, Moradores ou Visitantes. |
| UHs informadas | Não recebeu divisão por tipo de hospedagem. |

O filtro global seleciona indicadores; não muda a população medida por seus dados. Um indicador multissetorial mantém a mesma definição em todos os setores. Por exemplo, o total 116 de empreendimentos ativos locais não se transforma em total de criativos ao abrir Economia criativa. O subtotal criativo recebido de 18 continua identificado no recorte Grupo do cadastro SMCELT.

Fonte e recortes locais restringem somente os dados daquele indicador que já passaram pelos filtros globais. Não afetam os demais indicadores da lista. Fonte deve poder mudar sem ficar presa à categoria anterior; limpar as opções locais incompatíveis.

Não oferecer Comércio + MEI como cruzamento do estoque, pois os dados por Setor econômico e por Porte são distribuições independentes. Hotel = 3 não fornece uma divisão das 251 UHs. Não somar amostra total e grupos de entrevistados, totais e recortes ou fontes/edições distintas.

## 8. Responsabilidade por tarefa

| Tarefa | Resultado exigido |
| --- | --- |
| V7 | Catálogo Setor e associação obrigatória de um ou mais setores na definição; migrar a antiga organização por temas sem duplicá-la. |
| V9 | Consulta global de indicadores e opções disponíveis por setor/período; mesma elegibilidade e referência completa; sem duplicatas ou reinício de estados. |
| J7 | Filtros antes da lista na consulta unificada; início institucional oferece acesso a essa consulta. |
| J8 | Mostrar os indicadores e dados retornados, com metadados e recortes locais semanticamente corretos. |
| J9 | Estado global Setor/Ano-Período, opções dependentes, aplicação, limpeza, URL e atualização dos resultados. |
| D7 | Cadastro da definição exige setores; cadastro do dado usa referência e categoria reais, sem copiar o setor para cada valor. |
| D9 | Textos e lista de fontes refletem os Setores do Observatório e os dados municipais públicos elegíveis. |

Os nomes e payloads HTTP serão documentados por Vitor para os consumidores. Este contrato define o comportamento e os campos do pacote, não presume que os endpoints novos já estejam implementados.
