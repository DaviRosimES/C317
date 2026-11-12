# G8 — Pacote consolidado por Setores do Observatório

> **Documento anterior — substituído em 05/11/2026.** Referência atual: [Dados, tratamento e integração](02-dados-e-integracao.md). O restante está preservado como histórico e não deve orientar uma nova implementação isoladamente.

## Resultado

O pacote em `backend/dados/m7/` organiza exclusivamente os dados de **Santa Rita do Sapucaí**, conforme o modelo da G7 e a decisão de restringir o escopo municipal. Contém **61 indicadores com definição e unidade próprias, 18 classificações, 80 categorias e 303 dados**. Os 925 dados de outras cidades, da região e da base cadastral mais ampla foram retirados do pacote de carga. A planilha original e o pacote M6 permanecem preservados como fontes.

Esta entrega prepara os arquivos para implementação e migração. **Não altera o banco, a API, as telas nem o pacote da M6.** O site continuará usando os cadastros anteriores até a integração pelos responsáveis pela aplicação.

Gustavo aprovou a reunião de totais e recortes quando representam a mesma medida. Também confirmou que o painel antigo contém apenas exemplos de demonstração. Nenhum exemplo fictício foi incorporado aos dados reais deste pacote.

## Ajuste da estrutura e do tratamento

A consulta agora começa por **Setor e Ano/Período**, antes de listar indicadores. O antigo catálogo Tema é reaproveitado como **Setor do Observatório**. Os seis valores são Dados gerais, Turismo, Economia criativa, Eventos, Pesquisa e inovação e Vale da Eletrônica.

`catalogos.setores` e `indicador.setores` substituem os campos `temas` do contrato preparado anterior. As associações recebidas são preservadas: **61 indicadores, 67 vínculos com setores e seis indicadores multissetoriais**. Os códigos antigos permanecem estáveis; um indicador pode aparecer em vários setores, mas seu cadastro e seus dados continuam únicos.

**O arquivo `dados_indicadores.jsonl` permanece idêntico, byte a byte, à preparação anterior.** A revisão altera a organização da definição e a consulta, sem recalcular valores, mudar referências, inferir CNAEs ou criar cópias por setor. O período continua no dado.

A lista por Setor/Ano-Período é obtida dos indicadores vinculados ao setor que tenham ao menos um dado público elegível na referência completa escolhida. Se não houver dado compatível, o indicador não aparece. O contrato funcional está em [filtros globais e recortes locais](g9-contrato-dos-filtros.md).

O Setor do Observatório é organização de consulta. Ele não muda a população medida. O total 116 de empreendimentos ativos locais continua total municipal mesmo quando o indicador aparece em Economia criativa; o subtotal criativo recebido de 18 continua identificado em seu recorte local. Comércio e Indústria são recortes de Setor econômico (Sebrae), distintos desses agrupamentos globais.

## Origem e preservação

- Planilha recebida: `_Indicadores_OT_SRS_.xlsx`.
- SHA-256: `e956c9350dbd4ca699b8803215413c23270daa5e4bfa5f7c4f594b969e9a3d8a`.
- Base de preparação: pacote `c317.m6.v1`, preservado em `backend/dados/m6/`.
- Contrato novo: **`c317.m7.g8.v2`**, alinhado ao filtro global por Setor e Ano/Período.
- Os valores decimais, qualificadores, fontes, referências, territórios e identificadores dos 303 dados municipais são preservados. A localização original permanece em `origens`, com arquivo, aba, célula, valor XML e demais metadados recebidos.
- As notas existentes são preservadas. Quando uma antiga categoria era contexto metodológico, sua informação foi mantida em notas ou na definição da medida.
- Não foram calculados indicadores novos, percentuais, razões ou totais. Contagens usadas na conferência do pacote não são indicadores adicionais.

## O que foi reunido

| Antes | Agora | Como consultar |
| --- | --- | --- |
| Estoque de empresas, estoque por porte, estoque por setor, empresas por segmento e total do painel Ambiente de Negócios | **Estoque de empresas** | Escolher fonte, referência e classificação Porte, Setor econômico (Sebrae) ou Segmento Sebrae. |
| Meios de hospedagem e meios de hospedagem por zona | **Meios de hospedagem cadastrados** | Escolher fonte e classificação Categoria de hospedagem ou Zona de localização. |
| Empreendimentos ativos locais, ativos por categoria e criativos ativos cadastrados | **Empreendimentos ativos em Santa Rita do Sapucaí** | Total recebido de 116, dez categorias fornecidas e subtotal criativo recebido de 18 na classificação Grupo do cadastro SMCELT. |

O subtotal **Economia criativa = 18** tem classificação própria, separada das dez categorias de atividade. Não somar esse subtotal novamente às categorias que ele reúne. O total 116 também não é somado aos recortes. O pacote mantém cada valor recebido uma única vez.

**Fonte continua fazendo diferença:** os estoques de **5.818** e **5.879** empresas pertencem a painéis diferentes e continuam como dois dados. Reunir o indicador não autoriza somar, sobrescrever ou escolher um desses valores silenciosamente.

O catálogo ativo contém apenas definições com dados elegíveis de Santa Rita. As medidas que só tinham dados de outros municípios ou abrangências também foram retiradas, sem deixar opções vazias nos catálogos.

## O que foi separado

| Antes | Definições resultantes |
| --- | --- |
| Indústria de eletroeletrônicos, com bases de comparação diferentes | Participação no estoque de empresas; participação de MPE no segmento; participação de pequenos negócios no segmento. |
| População, com Censo e estimativa | População residente (Censo) e população estimada (painel Sebrae). |

Uma unidade por indicador é aplicada a todos os dados. Medidas com a mesma unidade também permanecem separadas quando respondem a perguntas distintas, como média e mediana da diária, formação e atuação no Lattes ou depósito e concessão de patente.

O bloco Lattes de Santa Rita continua excluído por filtros pendentes. Os dados elegíveis de outros municípios foram retirados pelo escopo municipal. Portanto, nenhum indicador Lattes é carregado por este pacote; os exemplos de modelagem da G7 não criam valores ausentes.

## Classificações e contexto

Cada categoria pertence a uma classificação identificada por código e nome. A definição do indicador informa quais classificações aceita. Exemplos:

- Hospedagem: **Categoria de hospedagem** → Hotel, Pousada, Resort etc.; **Zona de localização** → Rural ou Urbana.
- Empresas: **Porte**, **Setor econômico (Sebrae)** e **Segmento Sebrae Minas**. São classificações distintas e não implicam códigos CNAE.
- Pesquisa de fluxo: Janeiro, Fevereiro etc. ficam em **Mês citado no questionário**. A referência continua anual de 2024.
- Evento: o nome do evento é categoria; o ano fica na referência. No tipo de hospedagem usado, o evento é identificado pela fonte, referência e nota, enquanto a categoria informa Airbnb, Camping etc.

“6 respostas, sem a Fazenda Pinhal”, “Valor máximo”, “Total informado” e o nome do painel não são opções de filtro. Suas informações permanecem em definição, fonte e notas. A abrangência é validada como Santa Rita do Sapucaí na integração e não é um seletor de cidade. Intervalos que estavam no recorte das razões de patentes são representados pela referência completa.

Nenhum código CNAE foi recebido. O pacote mantém o suporte opcional, sem inventar códigos ou correspondências com setores Sebrae. O indicador de quantidade de atividades CNAE recebidas continua válido, mas sua contagem não fornece os códigos individuais dessas atividades.

## Exemplos de leitura

| Consulta | Dado recebido | Cuidado de interpretação |
| --- | --- | --- |
| Hospedagens cadastradas, anual 2024, sem recorte | 10 empreendimentos | Fonte: Formulário Google com complemento Econodata. |
| Hospedagens cadastradas, anual 2024, categoria Hotel | 3 empreendimentos | Fonte: cadastro de hospedagem SMCELT. O total de 10 não muda de fonte. |
| Hospedagens cadastradas, anual 2024, categoria Resort | 0 empreendimentos | Zero informado é diferente de ausência. |
| UHs informadas, anual 2024 | 251 UHs | Oito respostas numéricas, incluindo 50 UHs geridas pela CCI Imóveis. Não há divisão confirmada por categoria de hospedagem. |
| Empreendimentos ativos SMCELT, levantamento 2022 e 2023, categoria Hospedagem | 11 empreendimentos | Outra base e outro levantamento; não substituir pelos 10 de 2024. |
| Depósitos de PI, anual 2024 | 5 patentes | Diferente dos 72 de 2000–2024 e dos 24 de 2020–2024, que continuam acumulados. |

## Como o indicador do print se encaixa

**Indicador:** Cidade vista como: Acolhedora. Mede o percentual dos entrevistados que associaram Santa Rita ao atributo Acolhedora. A unidade é **% dos entrevistados**, e o tema é Economia criativa.

**Classificação:** Público da pesquisa. As categorias são Amostra total, Moradores e Visitantes.

| Dado do indicador | Referência | Categoria | Valor recebido |
| --- | --- | --- | ---: |
| 1 | Anual 2025 | Amostra total | 51,1% |
| 2 | Anual 2025 | Moradores | 44,5% |
| 3 | Anual 2025 | Visitantes | 60,6% |

A fonte dos três dados é o Relatório OT nº 004/2025 — Impacto Turístico HackTown 2025, seção 7.2. As células de origem são Economia criativa!D14, D15 e D16.

Cada linha é um dado, pois identifica um valor da mesma medida para um público. Na consulta, o indicador e a referência são escolhidos; o filtro Público da pesquisa = Moradores seleciona 44,5%.

O percentual se refere aos entrevistados da pesquisa, não a toda a população de Santa Rita. Cada grupo tem sua base de entrevistados. A amostra total já considera os grupos: os percentuais não devem ser somados nem usados em uma média simples para recriar o total. O valor total de 51,1% já foi recebido pronto.

## Arquivos entregues

| Arquivo em `backend/dados/m7/` | Uso |
| --- | --- |
| `catalogos.json` | Definições dos 61 indicadores com seus setores; unidades, fontes, territórios, classificações e categorias. |
| `setores_indicadores.csv` | Os 67 vínculos entre indicadores e os seis setores, sem duplicar valores. |
| `dados_indicadores.jsonl` | Conteúdo dos 303 dados municipais, com valores decimais em texto e proveniência documental. |
| `dicionario_indicadores.csv` | Revisão humana de nomes, definições, unidades, referências e classificações. |
| `mapeamento_m6_m7.csv` | Correspondência dos 303 identificadores municipais antigos com indicador e categoria de destino. Inclui a chave semântica de destino para conferência. |
| `regras_normalizacao.json` | Correspondências por indicador, categoria e unidade de origem, com as ações de preparação. |
| `exclusoes.csv` | As 119 linhas excluídas da origem e seus motivos, sem reinserir seus valores. |
| `retirados_por_abrangencia.csv` | Apenas os identificadores dos 925 dados fora do escopo e a ação de futuro arquivamento, sem seus valores. |
| `legado_demonstracao.csv` | Os oito tipos do fixture antigo e a orientação de arquivamento dos exemplos. |
| `manifesto.json` | Contrato, contagens, hashes, abrangências e política de preservação de estados. |

O JSON/JSONL é a referência para integração e precisão. Os CSVs usam UTF-8 e separador `;` e servem à inspeção e ao mapeamento. A regravação por uma planilha não deve substituir o conteúdo decimal canônico do JSONL.

### Contrato mínimo dos arquivos

No indicador: `codigo`, `nome`, `definicao`, `unidade_codigo`, `setores`, `tipos_referencia_permitidos`, `classificacoes_permitidas`, `aceita_sem_categoria` e `nota_metodologica`.

No dado: `id`, `indicador_codigo`, `categoria_codigo`, `territorio_codigo`, `referencia`, `valor`, `qualificador`, `fonte_codigo`, `notas`, `origens` e `demonstracao`.

Unidade e setores vêm da definição. `categoria_codigo` pode ser nulo quando a definição aceita ausência de recorte. Não existe fonte única na definição: cada dado informa a sua. As opções de filtros públicos dependem dos dados publicados e elegíveis, e não apenas do cadastro de opções permitidas.

## Orientações para a migração

1. Validar o contrato e os hashes do pacote antes da carga. **O carregador `scripts.carregar_m6` não aceita este contrato novo**; não trocar os arquivos da M6 para tentar reutilizá-lo.
2. Adaptar a persistência e a API à revisão 2 da G7. Reaproveitar o catálogo e as associações de temas como setores, sem manter os dois em paralelo. Oferecer a consulta global e suas opções antes de conectar as telas.
3. Preservar os códigos de indicador e categoria quando o conceito permaneceu equivalente. Códigos novos identificam medidas separadas ou categorias reclassificadas.
4. Preservar o `id` de cada dado já existente. Ele deixa de ser tratado como um hash recalculável dos campos editáveis; o mapeamento fornece a nova identidade semântica para unicidade e conflito. A restrição atual que pressupõe identidade M6 precisará ser adaptada em migração incremental.
5. Para os 303 dados municipais existentes, preservar status, arquivamento e bloqueio do banco. O pacote não define esses estados e não pode reiniciar publicados como rascunhos. Dados novos entram como rascunhos, conforme a G7.
6. Nas definições reunidas, remapear os filhos para a definição mantida. Retirar as definições substituídas do cadastro ativo, preservando a correspondência. Não criar cópias dos filhos nem apagar históricos ou tabelas como efeito colateral.
7. Manter somente Santa Rita no pacote ativo, na API e nas consultas. Não importar os 925 dados retirados. Caso já existam no banco, arquivar os identificadores de `retirados_por_abrangencia.csv`, preservando a possibilidade de restauração. Não mantê-los como dados administrativos ativos nem excluir fisicamente como efeito colateral da migração.
8. Arquivar os exemplos antigos de demonstração no fluxo legado, sem convertê-los em valores reais e sem excluí-los. Antes da execução, conferir se o banco corresponde à condição de demonstração declarada por Gustavo; uma divergência não deve ser resolvida sobrescrevendo dados.

O fixture do repositório contém oito tipos, 25 valores de demonstração e três relatórios fictícios. Essas contagens descrevem o arquivo, não um inventário independente do banco em execução. Relatórios e dados do legado não foram alterados nesta entrega.

## Conferência e limites

A preparação confere preservação dos valores e metadados, unicidade da identidade de destino, compatibilidade de unidade e referência e validade dos vínculos de catálogo. A conferência independente compara os arquivos gravados com a M6 e com as células da planilha. Uma segunda geração em diretório separado verifica a reprodutibilidade por hash.

As 119 exclusões anteriores permanecem: leitos pendentes, ocupação com divulgação restrita, empregos sem período confirmado, Lattes de Santa Rita com filtros pendentes, bloco Cadastur sem significado confirmado e demais linhas listadas. Não há regras de preenchimento fictício para completar esses campos.

A revisão também verifica que os setores preservam os agrupamentos recebidos e que a consulta global encontra os indicadores corretos, sem duplicação por associação. Esta conferência valida a preparação do pacote. A aplicação no banco, o comportamento da API e a navegação após a migração dependem da implementação e da validação integrada posteriores.
