# Dados recebidos, tratamento e integração

**Revisão 3 — 05/11/2026.** Definições aprovadas para as correções da entrega de Testes. A documentação descreve o comportamento a implementar; sua existência não comprova integração no banco, na API ou nas telas.

Este documento descreve o conteúdo recebido, as transformações aprovadas, os arquivos de carga e os valores preparados. A estrutura dos campos está em [Estrutura e dicionário](01-estrutura-e-dicionario.md); a consulta e as ações administrativas estão em [Fluxos de uso](03-fluxos-de-uso.md).

## 1. Origem e escopo

- Fonte recebida: `_Indicadores_OT_SRS_.xlsx`, preservada sem edição.
- SHA-256 da planilha: `e956c9350dbd4ca699b8803215413c23270daa5e4bfa5f7c4f594b969e9a3d8a`.
- Contrato preparado: **`c317.m7.g8.v2`**, em `backend/dados/m7/`.
- Conteúdo: **61 indicadores, 303 dados de Santa Rita do Sapucaí, seis setores, 67 associações, 18 classificações, 80 categorias, 22 unidades e 15 fontes**.
- As **119 exclusões** de origem continuam fora da carga. Os **925 dados não municipais** não são importados; seus IDs são listados para arquivamento caso existam no banco.
- O painel antigo contém apenas demonstrações, conforme confirmado por Gustavo. Não converter esses exemplos em dados reais.

O Observatório entrega os valores prontos. Não calcular novas taxas, estimar valores ausentes ou preencher pendências para completar a interface. Zero recebido é dado válido; vazio não vira zero.

## 2. Organização e preservação

Os seis grupos originais são os Setores do Observatório, associados à definição por `setores`. São preservados os 67 vínculos e os códigos existentes. Seis indicadores são multissetoriais e permanecem únicos.

O JSONL dos 303 dados permaneceu idêntico à preparação anterior ao ajuste de Setor: mesmos IDs, decimais, referências, fontes, qualificadores, notas e origens documentais. O setor não é copiado para cada valor e não muda a população medida.

Nenhum código CNAE individual foi recebido. Suporte opcional não autoriza inferir códigos a partir de nomes Sebrae ou categorias de hospedagem. A contagem de atividades CNAE não é uma relação de códigos CNAE.

### Medidas reunidas

| Antes | Agora | Como consultar |
| --- | --- | --- |
| Estoque de empresas, estoque por porte, estoque por setor, empresas por segmento e total do painel Ambiente de Negócios | **Estoque de empresas** | Escolher fonte, referência e classificação Porte, Setor econômico (Sebrae) ou Segmento Sebrae. |
| Meios de hospedagem e meios de hospedagem por zona | **Meios de hospedagem cadastrados** | Escolher fonte e classificação Categoria de hospedagem ou Zona de localização. |
| Empreendimentos ativos locais, ativos por categoria e criativos ativos cadastrados | **Empreendimentos ativos em Santa Rita do Sapucaí** | Total recebido de 116, dez categorias fornecidas e subtotal criativo recebido de 18 na classificação Grupo do cadastro SMCELT. |

O subtotal **Economia criativa = 18** tem classificação própria, separada das dez categorias de atividade. Não somar esse subtotal novamente às categorias que ele reúne. O total 116 também não é somado aos recortes. O pacote mantém cada valor recebido uma única vez.

**Fonte continua fazendo diferença:** os estoques de **5.818** e **5.879** empresas pertencem a painéis diferentes e continuam como dois dados. Reunir o indicador não autoriza somar, sobrescrever ou escolher um desses valores silenciosamente.

O catálogo ativo contém apenas definições com dados elegíveis de Santa Rita. As medidas que só tinham dados de outros municípios ou abrangências também foram retiradas, sem deixar opções vazias nos catálogos.

### Medidas mantidas separadas

| Antes | Definições resultantes |
| --- | --- |
| Indústria de eletroeletrônicos, com bases de comparação diferentes | Participação no estoque de empresas; participação de MPE no segmento; participação de pequenos negócios no segmento. |
| População, com Censo e estimativa | População residente (Censo) e população estimada (painel Sebrae). |

Uma unidade por indicador é aplicada a todos os dados. Medidas com a mesma unidade também permanecem separadas quando respondem a perguntas distintas, como média e mediana da diária, formação e atuação no Lattes ou depósito e concessão de patente.

O bloco Lattes de Santa Rita continua excluído por filtros pendentes. Os dados elegíveis de outros municípios foram retirados pelo escopo municipal. Portanto, nenhum indicador Lattes é carregado por este pacote; os exemplos de modelagem não criam valores ausentes.

## 3. Classificações e contexto da fonte

Cada categoria pertence a uma classificação identificada por código e nome. A definição do indicador informa quais classificações aceita. Exemplos:

- Hospedagem: **Categoria de hospedagem** → Hotel, Pousada, Resort etc.; **Zona de localização** → Rural ou Urbana.
- Empresas: **Porte**, **Setor econômico (Sebrae)** e **Segmento Sebrae Minas**. São classificações distintas e não implicam códigos CNAE.
- Pesquisa de fluxo: Janeiro, Fevereiro etc. ficam em **Mês citado no questionário**. A referência continua anual de 2024.
- Evento: o nome do evento é categoria; o ano fica na referência. No tipo de hospedagem usado, o evento é identificado pela fonte, referência e nota, enquanto a categoria informa Airbnb, Camping etc.

“6 respostas, sem a Fazenda Pinhal”, “Valor máximo”, “Total informado” e o nome do painel não são opções de filtro. Suas informações permanecem em definição, fonte e notas. A abrangência é validada como Santa Rita do Sapucaí na integração e não é um seletor de cidade. Intervalos que estavam no recorte das razões de patentes são representados pela referência completa.

Nenhum código CNAE foi recebido. O pacote mantém o suporte opcional, sem inventar códigos ou correspondências com setores Sebrae. O indicador de quantidade de atividades CNAE recebidas continua válido, mas sua contagem não fornece os códigos individuais dessas atividades.

## 4. Exemplos e cuidados de leitura

| Consulta | Dado recebido | Cuidado de interpretação |
| --- | --- | --- |
| Hospedagens cadastradas, anual 2024, sem recorte | 10 empreendimentos | Fonte: Formulário Google com complemento Econodata. |
| Hospedagens cadastradas, anual 2024, categoria Hotel | 3 empreendimentos | Fonte: cadastro de hospedagem SMCELT. O total de 10 não muda de fonte. |
| Hospedagens cadastradas, anual 2024, categoria Resort | 0 empreendimentos | Zero informado é diferente de ausência. |
| UHs informadas, anual 2024 | 251 UHs | Oito respostas numéricas, incluindo 50 UHs geridas pela CCI Imóveis. Não há divisão confirmada por categoria de hospedagem. |
| Empreendimentos ativos SMCELT, levantamento 2022 e 2023, categoria Hospedagem | 11 empreendimentos | Outra base e outro levantamento; não substituir pelos 10 de 2024. |
| Depósitos de PI, anual 2024 | 5 patentes | Diferente dos 72 de 2000–2024 e dos 24 de 2020–2024, que continuam acumulados. |

Os dados de Acolhedora são 51,1% (Amostra total), 44,5% (Moradores) e 60,6% (Visitantes), anual 2025. O total recebido não é recalculado pela média dos públicos e os três percentuais não são somados como partes de um todo.

Na consulta setorial, 116 continua o total municipal de empreendimentos ativos; 18 é o subtotal criativo explicitamente recebido. Hotel = 3 não permite decompor as 251 UHs. Estoques 5.818 e 5.879 permanecem separados por fonte.

## 5. Arquivos do pacote

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

### Contrato de intercâmbio

No indicador: `codigo`, `nome`, `definicao`, `unidade_codigo`, `setores`, `tipos_referencia_permitidos`, `classificacoes_permitidas`, `aceita_sem_categoria` e `nota_metodologica`.

No dado: `id`, `indicador_codigo`, `categoria_codigo`, `territorio_codigo`, `referencia`, `valor`, `qualificador`, `fonte_codigo`, `notas`, `origens` e `demonstracao`.

Unidade e setores vêm da definição. `categoria_codigo` pode ser nulo quando a definição aceita ausência de recorte. Não existe fonte única na definição: cada dado informa a sua. As opções de filtros públicos dependem dos dados publicados e elegíveis, e não apenas do cadastro de opções permitidas.

O [catálogo JSON](../../backend/dados/m7/catalogos.json) é a definição preparada; o [JSONL dos dados](../../backend/dados/m7/dados_indicadores.jsonl) contém cada dado e seus vínculos. O [mapa indicador–setor](../../backend/dados/m7/setores_indicadores.csv) permite conferir as associações. O [manifesto](../../backend/dados/m7/manifesto.json) registra contrato, hashes e contagens.

## 6. Regras para a futura integração

1. Validar o contrato e os hashes do pacote antes da carga. **O carregador `scripts.carregar_m6` não aceita este contrato novo**; não trocar os arquivos da M6 para tentar reutilizá-lo.
2. Adaptar a persistência e a API ao modelo do documento Estrutura dos indicadores e dicionário. Reaproveitar o catálogo e as associações de temas como setores, sem manter os dois em paralelo. Oferecer a consulta global e suas opções antes de conectar as telas.
3. Preservar os códigos de indicador e categoria quando o conceito permaneceu equivalente. Códigos novos identificam medidas separadas ou categorias reclassificadas.
4. Preservar o `id` de cada dado já existente. Ele deixa de ser tratado como um hash recalculável dos campos editáveis; o mapeamento fornece a nova identidade semântica para unicidade e conflito. A restrição atual que pressupõe identidade M6 precisará ser adaptada em migração incremental.
5. Para os 303 dados municipais existentes, preservar status, arquivamento e bloqueio do banco. O pacote não define esses estados e não pode reiniciar publicados como rascunhos. Dados novos entram como rascunhos, conforme os fluxos aprovados.
6. Nas definições reunidas, remapear os filhos para a definição mantida. Retirar as definições substituídas do cadastro ativo, preservando a correspondência. Não criar cópias dos filhos nem apagar históricos ou tabelas como efeito colateral.
7. Manter somente Santa Rita no pacote ativo, na API e nas consultas. Não importar os 925 dados retirados. Caso já existam no banco, arquivar os identificadores de `retirados_por_abrangencia.csv`, preservando a possibilidade de restauração. Não mantê-los como dados administrativos ativos nem excluir fisicamente como efeito colateral da migração.
8. Arquivar os exemplos antigos de demonstração no fluxo legado, sem convertê-los em valores reais e sem excluí-los. Antes da execução, conferir se o banco corresponde à condição de demonstração declarada por Gustavo; uma divergência não deve ser resolvida sobrescrevendo dados.

O fixture do repositório contém oito tipos, 25 valores de demonstração e três relatórios fictícios. Essas contagens descrevem o arquivo, não um inventário independente do banco em execução. Relatórios e dados do legado não foram alterados nesta entrega.

Esses passos orientam uma implementação futura do carregador e das migrações. Não são comandos de carga já disponíveis para este contrato. Antes de integrar, documentar o payload HTTP para os consumidores e inventariar o banco real.

## 7. Conferência do pacote

A preparação confere preservação dos valores e metadados, unicidade da identidade de destino, compatibilidade de unidade e referência e validade dos vínculos de catálogo. A conferência independente compara os arquivos gravados com a M6 e com as células da planilha. Uma segunda geração em diretório separado verifica a reprodutibilidade por hash.

As 119 exclusões anteriores permanecem: leitos pendentes, ocupação com divulgação restrita, empregos sem período confirmado, Lattes de Santa Rita com filtros pendentes, bloco Cadastur sem significado confirmado e demais linhas listadas. Não há regras de preenchimento fictício para completar esses campos.

A revisão também verifica que os setores preservam os agrupamentos recebidos e que a consulta global encontra os indicadores corretos, sem duplicação por associação. Esta conferência valida a preparação do pacote. A aplicação no banco, o comportamento da API e a navegação após a migração dependem da implementação e da validação integrada posteriores.

As contagens de consulta presumem dados elegíveis apenas na simulação. O pacote não decide a publicação persistida. A quantidade mostrada no site depende dos estados aplicados pela administração.

## 8. Fontes dos dados abaixo

F01 a F15 são referências de leitura deste documento, não novos códigos de cadastro. Os códigos estáveis e links completos permanecem no catálogo.

| Referência neste documento | Fonte recebida | Links informados |
| --- | --- | --- |
| F01 | Cadastro de meios de hospedagem 2024 (formulário Google da SMCELT, respostas de jun e jul de 2024) | [Acesso 1](https://forms.gle/82ef7PG85ZCKuqFZ9) |
| F02 | Cálculo do Observatório com INPI e IBGE | Documento/base recebida, sem URL |
| F03 | Formulário Google (coleta espontânea) + complemento via Econodata | [Acesso 1](https://docs.google.com/spreadsheets/d/e/2PACX-1vT7U9_EOTCUmjcDdRjQJ3JYe5FukQ7F5a1m6iUJb4JvSePvyV-pOrM3xTcgDW3mZ-zX9RSKqhlkLOvC/pubhtml?gid=939101547&single=true) |
| F04 | Formulários de cadastro de negócios turísticos e criativos da SMCELT (respostas de 2022 e 2023), cruzados e sem repetições pelo Observatório | Documento/base recebida, sem URL |
| F05 | IBGE Cidades – perfil do município (código 3159605) | [Acesso 1](https://cidades.ibge.gov.br/brasil/mg/santa-rita-do-sapucai/panorama) |
| F06 | IBGE Cidades – perfil do município (código 3159605) (IBGE e órgãos estaduais de estatística) | [Acesso 1](https://cidades.ibge.gov.br/brasil/mg/santa-rita-do-sapucai/panorama) |
| F07 | IBGE Cidades – perfil do município (código 3159605) (INEP) | [Acesso 1](https://cidades.ibge.gov.br/brasil/mg/santa-rita-do-sapucai/panorama) |
| F08 | INPI – Anuário Estatístico de Propriedade Industrial (patentes), 2000–2024 | [Acesso 1](https://www.gov.br/inpi/pt-br/inpi-data/dados-e-series-temporais/tabelas-completas-dos-indicadores-de-pi) |
| F09 | Inatel Startups e Incubadora Municipal | Documento/base recebida, sem URL |
| F10 | Painel Inteligência Sebrae – Ambiente de Negócios em Minas Gerais (Raio-X Municipal) | [Acesso 1](https://datasebrae.com.br) |
| F11 | Painel Inteligência Sebrae – Mapa Sebrae de Empresas no Brasil (dados até 13/09/2026) | [Acesso 1](https://datasebrae.com.br) |
| F12 | Peça 'Festa de Santa Rita em números' (publicada em 11/06/2025) | [Acesso 1](https://drive.google.com/open?id=1zODjUZjcK8OX9B2qqimcn627N73jo5H2) |
| F13 | Relatório OT nº 001/2024 – Festa de Santa Rita 2024 | [Acesso 1](https://drive.google.com/open?id=13EO8-Qg_5OLmpuezfwsPaFnHBgBeNu0l) |
| F14 | Relatório OT nº 004/2025 – Impacto Turístico HackTown 2025 | [Acesso 1](https://drive.google.com/open?id=1OiVuPbT2qKs_KpocGyBZ2SbdxA-9Gyhr) |
| F15 | Relatório OT nº 004/2025 – Impacto Turístico HackTown 2025 (seção 7.2, Percepção geral sobre a cidade) | [Acesso 1](https://drive.google.com/open?id=1OiVuPbT2qKs_KpocGyBZ2SbdxA-9Gyhr) |


## 9. Conteúdo completo dos 303 dados preparados

Cada linha abaixo corresponde a um dado do JSONL, agrupado por indicador. O valor é apresentado com vírgula decimal sem arredondar o conteúdo recebido. O símbolo `>` preserva o qualificador maior que. O identificador estável completo e os metadados originais permanecem no arquivo JSONL. Pertencer a vários setores não duplica linhas nesta relação.

### Acessibilidade para pessoas com deficiência

Unidade: **empreendimentos**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Resposta sobre acessibilidade: Não têm | 3 | F01 | — | Turismo!D22 |
| 2024 — anual | Resposta sobre acessibilidade: Têm | 4 | F01 | 3 não têm e 3 não responderam. | Turismo!D21 |

### Atendimento bilíngue

Unidade: **empreendimentos**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Resposta sobre atendimento bilíngue: Não têm | 2 | F01 | — | Turismo!D27 |
| 2024 — anual | Resposta sobre atendimento bilíngue: Têm | 5 | F01 | 2 não têm e 3 não responderam. | Turismo!D26 |

### Atividades econômicas (CNAE) cadastradas no município

Unidade: **atividades**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 1358 | F11 | — | Dados gerais!D36 |

### Avaliação geral do evento

Unidade: **nota 0–10**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Evento: Festa de Santa Rita | 8,5 | F13 | — | Eventos!D9 |
| 2025 — anual | Evento: HackTown | 8,7 | F14 | — | Eventos!D21 |

### Cidade vista como: Acolhedora

Unidade: **% dos entrevistados**. Dados preparados: **3**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Público da pesquisa: Amostra total | 51,1 | F15 | — | Economia criativa!D14 |
| 2025 — anual | Público da pesquisa: Moradores | 44,5 | F15 | — | Economia criativa!D15 |
| 2025 — anual | Público da pesquisa: Visitantes | 60,6 | F15 | — | Economia criativa!D16 |

### Cidade vista como: Criativa

Unidade: **% dos entrevistados**. Dados preparados: **3**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Público da pesquisa: Amostra total | 61,4 | F15 | Pesquisa com 264 entrevistas. Cada pessoa podia citar mais de um termo, por isso a soma passa de 100%. | Economia criativa!D8 |
| 2025 — anual | Público da pesquisa: Moradores | 61,94 | F15 | — | Economia criativa!D9 |
| 2025 — anual | Público da pesquisa: Visitantes | 60,6 | F15 | — | Economia criativa!D10 |

### Cidade vista como: Inovadora

Unidade: **% dos entrevistados**. Dados preparados: **3**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Público da pesquisa: Amostra total | 53,4 | F15 | — | Economia criativa!D11 |
| 2025 — anual | Público da pesquisa: Moradores | 54,8 | F15 | — | Economia criativa!D12 |
| 2025 — anual | Público da pesquisa: Visitantes | 51,4 | F15 | — | Economia criativa!D13 |

### Cidade vista como: Inspiradora

Unidade: **% dos entrevistados**. Dados preparados: **3**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Público da pesquisa: Amostra total | 47 | F15 | — | Economia criativa!D17 |
| 2025 — anual | Público da pesquisa: Moradores | 45,8 | F15 | — | Economia criativa!D18 |
| 2025 — anual | Público da pesquisa: Visitantes | 48,6 | F15 | — | Economia criativa!D19 |

### Concessão de patentes de invenção por mil habitantes

Unidade: **concessões por mil hab.**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000–2024 — acumulado | Sem recorte | 0,270702596283992 | F02 | Concessões ÷ população × 1.000. Concessão é a patente aprovada pelo INPI; pode vir de pedido feito em ano anterior.; Recorte original: Santa Rita do Sapucaí (acumulado 2000–2024). Cidade e intervalo estão representados em território e referência. | Pesquisa e inovação!D56 |
| 2020–2024 — acumulado | Sem recorte | 0,0246093269349083 | F02 | Recorte original: Santa Rita do Sapucaí (2020–2024). Cidade e intervalo estão representados em território e referência. | Pesquisa e inovação!D68 |

### Concessões de certificados de adição de invenção (CA)

Unidade: **patentes**. Dados preparados: **26**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D7 |
| 2000–2024 — acumulado | Sem recorte | 0 | F08 | Santa Rita do Sapucaí não aparece na tabela, ou seja, nenhum registro. Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Concessao_CA_Cidade. | Dados gerais!D25 |
| 2001 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E7 |
| 2002 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F7 |
| 2003 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G7 |
| 2004 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H7 |
| 2005 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I7 |
| 2006 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J7 |
| 2007 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K7 |
| 2008 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L7 |
| 2009 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M7 |
| 2010 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N7 |
| 2011 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O7 |
| 2012 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P7 |
| 2013 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q7 |
| 2014 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R7 |
| 2015 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S7 |
| 2016 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T7 |
| 2017 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U7 |
| 2018 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V7 |
| 2019 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W7 |
| 2020 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X7 |
| 2021 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y7 |
| 2022 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z7 |
| 2023 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA7 |
| 2024 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AB7 |

### Concessões de modelos de utilidade (MU)

Unidade: **patentes**. Dados preparados: **26**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D6 |
| 2000–2024 — acumulado | Sem recorte | 15 | F08 | Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Concessao_MU_Cidade.; Série ano a ano de todos os municípios na aba Patentes por ano. Contagem pela cidade do 1º depositante residente. | Dados gerais!D23; Pesquisa e inovação!D26 |
| 2001 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E6 |
| 2002 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F6 |
| 2003 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G6 |
| 2004 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H6 |
| 2005 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I6 |
| 2006 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J6 |
| 2007 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K6 |
| 2008 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L6 |
| 2009 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M6 |
| 2010 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N6 |
| 2011 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O6 |
| 2012 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P6 |
| 2013 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q6 |
| 2014 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R6 |
| 2015 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S6 |
| 2016 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T6 |
| 2017 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U6 |
| 2018 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V6 |
| 2019 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W6 |
| 2020 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X6 |
| 2021 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y6 |
| 2022 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z6 |
| 2023 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA6 |
| 2024 — anual | Sem recorte | 1 | F08 | Ver série completa na aba Séries.; Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Dados gerais!D24; Patentes por ano!AB6 |

### Concessões de patentes de invenção (PI)

Unidade: **patentes**. Dados preparados: **27**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D5 |
| 2000–2024 — acumulado | Sem recorte | 11 | F08 | Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Concessao_PI_Cidade.; Série ano a ano de todos os municípios na aba Patentes por ano. Contagem pela cidade do 1º depositante residente. | Dados gerais!D21; Pesquisa e inovação!D20 |
| 2001 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E5 |
| 2002 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F5 |
| 2003 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G5 |
| 2004 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H5 |
| 2005 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I5 |
| 2006 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J5 |
| 2007 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K5 |
| 2008 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L5 |
| 2009 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M5 |
| 2010 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N5 |
| 2011 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O5 |
| 2012 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P5 |
| 2013 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q5 |
| 2014 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R5 |
| 2015 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S5 |
| 2016 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T5 |
| 2017 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U5 |
| 2018 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V5 |
| 2019 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W5 |
| 2020 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X5 |
| 2020–2024 — acumulado | Sem recorte | 1 | F08 | Soma dos últimos 5 anos da aba Patentes por ano. | Pesquisa e inovação!D62 |
| 2021 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y5 |
| 2022 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z5 |
| 2023 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA5 |
| 2024 — anual | Sem recorte | 1 | F08 | Ver série completa na aba Séries.; Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Dados gerais!D22; Patentes por ano!AB5 |

### Densidade demográfica

Unidade: **hab/km²**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2022 — anual | Sem recorte | 115,12 | F05 | — | Dados gerais!D4 |

### Densidade do estoque empresarial

Unidade: **empresas por mil habitantes**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 136,24 | F11 | Por porte: MEI 69,60; ME 47,56; EPP 8,38; demais 10,70. | Dados gerais!D35 |

### Depósito de patentes de invenção por mil habitantes

Unidade: **depósitos por mil hab.**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000–2024 — acumulado | Sem recorte | 1,7718715393134 | F02 | Depósitos ÷ população × 1.000. Permite comparar cidades de tamanhos diferentes.; Recorte original: Santa Rita do Sapucaí (acumulado 2000–2024). Cidade e intervalo estão representados em território e referência. | Pesquisa e inovação!D44 |
| 2020–2024 — acumulado | Sem recorte | 0,5906238464378 | F02 | Recorte original: Santa Rita do Sapucaí (2020–2024). Cidade e intervalo estão representados em território e referência. | Pesquisa e inovação!D50 |

### Depósitos de certificados de adição de invenção (CA)

Unidade: **patentes**. Dados preparados: **26**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D4 |
| 2000–2024 — acumulado | Sem recorte | 1 | F08 | Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Deposito_CA_Cidade. | Pesquisa e inovação!D6 |
| 2001 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E4 |
| 2002 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F4 |
| 2003 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G4 |
| 2004 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H4 |
| 2005 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I4 |
| 2006 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J4 |
| 2007 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K4 |
| 2008 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L4 |
| 2009 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M4 |
| 2010 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N4 |
| 2011 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O4 |
| 2012 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P4 |
| 2013 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q4 |
| 2014 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R4 |
| 2015 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S4 |
| 2016 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T4 |
| 2017 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U4 |
| 2018 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V4 |
| 2019 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W4 |
| 2020 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X4 |
| 2021 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y4 |
| 2022 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z4 |
| 2023 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA4 |
| 2024 — anual | Sem recorte | 0 | F08 | Ver série completa na aba Séries.; Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AB4; Pesquisa e inovação!D7 |

### Depósitos de modelos de utilidade (MU)

Unidade: **patentes**. Dados preparados: **26**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D3 |
| 2000–2024 — acumulado | Sem recorte | 49 | F08 | Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Deposito_MU_Cidade.; Série ano a ano de todos os municípios na aba Patentes por ano. Contagem pela cidade do 1º depositante residente. | Pesquisa e inovação!D14; Pesquisa e inovação!D4 |
| 2001 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E3 |
| 2002 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F3 |
| 2003 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G3 |
| 2004 — anual | Sem recorte | 3 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H3 |
| 2005 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I3 |
| 2006 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J3 |
| 2007 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K3 |
| 2008 — anual | Sem recorte | 7 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L3 |
| 2009 — anual | Sem recorte | 4 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M3 |
| 2010 — anual | Sem recorte | 4 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N3 |
| 2011 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O3 |
| 2012 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P3 |
| 2013 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q3 |
| 2014 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R3 |
| 2015 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S3 |
| 2016 — anual | Sem recorte | 5 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T3 |
| 2017 — anual | Sem recorte | 6 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U3 |
| 2018 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V3 |
| 2019 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W3 |
| 2020 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X3 |
| 2021 — anual | Sem recorte | 4 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y3 |
| 2022 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z3 |
| 2023 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA3 |
| 2024 — anual | Sem recorte | 0 | F08 | Ver série completa na aba Séries.; Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AB3; Pesquisa e inovação!D5 |

### Depósitos de patentes de invenção (PI)

Unidade: **patentes**. Dados preparados: **27**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2000 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!D2 |
| 2000–2024 — acumulado | Sem recorte | 72 | F08 | Contagem por cidade da origem do 1º depositante residente (o INPI separa os casos de origem não identificada). Inclui patente de invenção (PI), modelo de utilidade (MU) e certificado de adição (CA); registros de software não estão neste arquivo. Série anual na aba Séries. Arquivo: INPI_Indicadores_PTN_Anuario_2024.xlsx, aba Deposito_PI_Cidade.; Série ano a ano de todos os municípios na aba Patentes por ano. Contagem pela cidade do 1º depositante residente. | Pesquisa e inovação!D2; Pesquisa e inovação!D8 |
| 2001 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!E2 |
| 2002 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!F2 |
| 2003 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!G2 |
| 2004 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!H2 |
| 2005 — anual | Sem recorte | 5 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!I2 |
| 2006 — anual | Sem recorte | 4 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!J2 |
| 2007 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!K2 |
| 2008 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!L2 |
| 2009 — anual | Sem recorte | 6 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!M2 |
| 2010 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!N2 |
| 2011 — anual | Sem recorte | 1 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!O2 |
| 2012 — anual | Sem recorte | 0 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!P2 |
| 2013 — anual | Sem recorte | 5 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Q2 |
| 2014 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!R2 |
| 2015 — anual | Sem recorte | 5 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!S2 |
| 2016 — anual | Sem recorte | 3 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!T2 |
| 2017 — anual | Sem recorte | 3 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!U2 |
| 2018 — anual | Sem recorte | 2 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!V2 |
| 2019 — anual | Sem recorte | 4 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!W2 |
| 2020 — anual | Sem recorte | 7 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!X2 |
| 2020–2024 — acumulado | Sem recorte | 24 | F08 | Soma dos últimos 5 anos da aba Patentes por ano. | Pesquisa e inovação!D38 |
| 2021 — anual | Sem recorte | 3 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Y2 |
| 2022 — anual | Sem recorte | 6 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!Z2 |
| 2023 — anual | Sem recorte | 3 | F08 | Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AA2 |
| 2024 — anual | Sem recorte | 5 | F08 | Ver série completa na aba Séries.; Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI. | Patentes por ano!AB2; Pesquisa e inovação!D3 |

### Diária informada (mediana)

Unidade: **R$**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Sem recorte | 162,5 | F01 | Mediana: metade dos valores é menor e metade é maior. Calculada sem a Fazenda Pinhal.; Contexto informado na origem: 6 respostas, sem a Fazenda Pinhal. | Turismo!D19 |

### Diária informada (média simples)

Unidade: **R$**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Sem recorte | 229,416666666667 | F01 | Média simples de 6 valores (R$ 35, 100, 125, 200, 216,50 e 700). A Fazenda Pinhal (casa inteira para grupos, R$ 2.263,50) ficou de fora porque o valor é desproporcional ao cobrado na cidade. O painel de 2024 mostrava R$ 364 porque somava o valor da Pinhal e dividia por 10, mas só 7 informaram a diária.; Contexto informado na origem: 6 respostas, sem a Fazenda Pinhal. | Turismo!D18 |

### Eletroeletrônicos como parte da indústria

Unidade: **%**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 17,8881008668243 | F11 | Cálculo do Observatório: eletroeletrônicos ÷ empresas da indústria. | Vale da Eletrônica!D6 |

### Empreendimentos ativos em Santa Rita do Sapucaí

Unidade: **empreendimentos**. Dados preparados: **12**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Agências, agentes e guias | 8 | F04 | — | Turismo!D74 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Arte e artesanato | 10 | F04 | Quem se declarou de artesanato e ateliês de costura, cerâmica e afins. | Economia criativa!D3 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Comércio de produtos locais | 16 | F04 | — | Turismo!D71 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Experiências | 17 | F04 | Fazendas, sítios e cafés com visita, equoterapia e experiências rurais. | Turismo!D72 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Gastronomia | 37 | F04 | — | Turismo!D70 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Hospedagem | 11 | F04 | Veja a aba Turismo, tema de hospedagem, para o cruzamento com o cadastro de 2024. | Turismo!D73 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Mobilidade urbana | 4 | F04 | — | Turismo!D75 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Negócios criativos | 2 | F04 | Quem escolheu a seção 'Negócios criativos' do formulário de 2023, mais o estúdio de fotografia de 2022. | Economia criativa!D5 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Organização de eventos | 6 | F04 | Produtoras e organizadores de eventos, shows, festivais e espetáculos. | Economia criativa!D4 |
| 2022 e 2023 — levantamento | Categoria do cadastro SMCELT: Outros (fora do Guia) | 5 | F04 | Negócios que se cadastraram, mas não são do turismo (corretora de imóveis, drogaria, papelaria, mercado financeiro e cafeteria). | Turismo!D76 |
| 2022 e 2023 — levantamento | Grupo do cadastro SMCELT: Economia criativa | 18 | F04 | Soma das três categorias de negócios criativos ativos nos formulários. Abrange somente os cadastrados, não todas as empresas criativas do município. | Economia criativa!D6 |
| 2022 e 2023 — levantamento | Sem recorte | 116 | F04 | Ficam de fora 4 marcados como 'fechado' e 1 de Lavras (Vivette Cerâmica Casa & Jardim). | Turismo!D69 |

### Envio do Boletim de Ocupação Hoteleira (BOH)

Unidade: **empreendimentos**. Dados preparados: **3**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Resposta sobre envio do BOH: Enviam | 0 | F01 | Nenhum dos 7 que responderam envia o BOH. 6 não enviam e 1 disse que não sabe o que é. 3 não responderam. Mostra a importância do FNRH Digital e do formulário mensal. | Turismo!D23 |
| 2024 — anual | Resposta sobre envio do BOH: Não enviam | 6 | F01 | — | Turismo!D24 |
| 2024 — anual | Resposta sobre envio do BOH: Não sabem o que é | 1 | F01 | — | Turismo!D25 |

### Estoque de empresas

Unidade: **empresas**. Dados preparados: **19**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Porte da empresa: Demais | 457 | F11 | — | Dados gerais!D30 |
| 2026 — anual | Porte da empresa: EPP (empresa de pequeno porte) | 358 | F11 | — | Dados gerais!D29 |
| 2026 — anual | Porte da empresa: ME (microempresa) | 2031 | F11 | — | Dados gerais!D28 |
| 2026 — anual | Porte da empresa: MEI | 2972 | F11 | — | Dados gerais!D27 |
| 2026 — anual | Segmento Sebrae Minas: Alimentação fora do lar | 458 | F11 | — | Dados gerais!D38 |
| 2026 — anual | Segmento Sebrae Minas: Beleza | 336 | F11 | — | Dados gerais!D40 |
| 2026 — anual | Segmento Sebrae Minas: Comércio de alimentos e bebidas | 276 | F11 | — | Dados gerais!D41 |
| 2026 — anual | Segmento Sebrae Minas: Comércio varejista da moda | 274 | F11 | — | Dados gerais!D42 |
| 2026 — anual | Segmento Sebrae Minas: Cursos livres | 247 | F11 | — | Dados gerais!D43 |
| 2026 — anual | Segmento Sebrae Minas: Indústria de eletroeletrônicos | 227 | F11 | Segmento Indústria de eletroeletrônicos do Sebrae Minas. Participação de 3,90% no estoque; 56,83% são pequenos negócios, conforme o painel.; Segmento Indústria de eletroeletrônicos do Sebrae Minas, com referência de 2026. | Dados gerais!D45; Vale da Eletrônica!D5 |
| 2026 — anual | Segmento Sebrae Minas: Serviços de construção | 376 | F11 | — | Dados gerais!D39 |
| 2026 — anual | Segmento Sebrae Minas: Serviços empresariais | 536 | F11 | Lista parcial: os 9 maiores segmentos do painel. | Dados gerais!D37 |
| 2026 — anual | Segmento Sebrae Minas: Transporte terrestre | 232 | F11 | — | Dados gerais!D44 |
| 2026 — anual | Sem recorte | 5879 | F10 | Fonte primária: Receita Federal (consulta em 01/10/2026). Diverge do Mapa Sebrae de Empresas (5.818); ver observação daquela linha. | Dados gerais!D46 |
| 2026 — anual | Sem recorte | 5818 | F11 | Painel Power BI, com o município Santa Rita do Sapucaí selecionado. O painel Ambiente de Negócios mostra 5.879 empresas (consulta à Receita Federal em 01/10/2026); a diferença vem da data e da fonte. | Dados gerais!D26 |
| 2026 — anual | Setor econômico (Sebrae): Agropecuária | 50 | F11 | — | Dados gerais!D34 |
| 2026 — anual | Setor econômico (Sebrae): Comércio | 1398 | F11 | — | Dados gerais!D32 |
| 2026 — anual | Setor econômico (Sebrae): Indústria | 1269 | F11 | Mesmo número da aba Dados gerais. Reúne toda a indústria, não só eletroeletrônicos. | Dados gerais!D33; Vale da Eletrônica!D3 |
| 2026 — anual | Setor econômico (Sebrae): Serviços | 3101 | F11 | — | Dados gerais!D31 |

### Gasto médio per capita

Unidade: **R$**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Público da pesquisa: Moradores | 361,75 | F14 | Gasto declarado pelos entrevistados.; Evento informado na origem: HackTown 2025. | Eventos!D20 |
| 2025 — anual | Público da pesquisa: Visitantes | 1022,48 | F14 | Gasto declarado pelos entrevistados.; Evento informado na origem: HackTown 2025. | Eventos!D19 |

### IDEB – anos finais do ensino fundamental (rede pública)

Unidade: **nota**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Sem recorte | 5,9 | F07 | 729º no país e 26º entre 853 municípios de Minas. | Dados gerais!D17 |

### Idade mediana

Unidade: **anos**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2022 — anual | Sem recorte | 36 | F05 | — | Dados gerais!D6 |

### Indústria como parte de todas as empresas

Unidade: **%**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 21,8116191130973 | F11 | Cálculo do Observatório: empresas da indústria ÷ total de empresas. | Vale da Eletrônica!D4 |

### Meios de hospedagem cadastrados

Unidade: **empreendimentos**. Dados preparados: **11**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Categoria de hospedagem: Cama e café | 0 | F01 | — | Turismo!D7 |
| 2024 — anual | Categoria de hospedagem: Flat/apart-hotel | 1 | F01 | — | Turismo!D9 |
| 2024 — anual | Categoria de hospedagem: Hotel | 3 | F01 | Total do painel: 10 hospedagens cadastradas, igual ao total de 10 empreendimentos de 2024. | Turismo!D3 |
| 2024 — anual | Categoria de hospedagem: Hotel fazenda | 1 | F01 | — | Turismo!D6 |
| 2024 — anual | Categoria de hospedagem: Hotel histórico | 1 | F01 | — | Turismo!D8 |
| 2024 — anual | Categoria de hospedagem: Outros | 3 | F01 | — | Turismo!D10 |
| 2024 — anual | Categoria de hospedagem: Pousada | 1 | F01 | — | Turismo!D4 |
| 2024 — anual | Categoria de hospedagem: Resort | 0 | F01 | — | Turismo!D5 |
| 2024 — anual | Sem recorte | 10 | F03 | Coleta espontânea via formulário Google e complemento via Econodata (econodata.com.br/consulta-empresa). | Turismo!D2 |
| 2024 — anual | Zona de localização da hospedagem: Rural | 3 | F01 | — | Turismo!D14 |
| 2024 — anual | Zona de localização da hospedagem: Urbana | 7 | F01 | — | Turismo!D13 |

### Meios de hospedagem com CNPJ ativo

Unidade: **empreendimentos**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Autodeclaração de CNPJ ativo: Sim | 10 | F01 | Todos os 10 informaram CNPJ. | Turismo!D15 |

### Meios de hospedagem que dizem estar no Cadastur

Unidade: **empreendimentos**. Dados preparados: **2**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Autodeclaração de Cadastur: Não | 5 | F01 | Sapucaia Flat respondeu 'Não', mas preencheu um número no campo do Cadastur. Contado aqui como 'Não'. | Turismo!D17 |
| 2024 — anual | Autodeclaração de Cadastur: Sim | 5 | F01 | Autodeclaração dos estabelecimentos no questionário de 2024; não equivale à comprovação de registro no Cadastur oficial. | Turismo!D16 |

### Meses de MAIOR fluxo de hóspedes (quantos empreendimentos citam)

Unidade: **empreendimentos**. Dados preparados: **12**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Mês citado no questionário: Abril | 1 | F01 | — | Turismo!D42 |
| 2024 — anual | Mês citado no questionário: Agosto | 5 | F01 | — | Turismo!D46 |
| 2024 — anual | Mês citado no questionário: Dezembro | 2 | F01 | — | Turismo!D50 |
| 2024 — anual | Mês citado no questionário: Fevereiro | 4 | F01 | — | Turismo!D40 |
| 2024 — anual | Mês citado no questionário: Janeiro | 2 | F01 | 5 empreendimentos responderam; cada um podia marcar vários meses. | Turismo!D39 |
| 2024 — anual | Mês citado no questionário: Julho | 2 | F01 | — | Turismo!D45 |
| 2024 — anual | Mês citado no questionário: Junho | 1 | F01 | — | Turismo!D44 |
| 2024 — anual | Mês citado no questionário: Maio | 1 | F01 | — | Turismo!D43 |
| 2024 — anual | Mês citado no questionário: Março | 1 | F01 | — | Turismo!D41 |
| 2024 — anual | Mês citado no questionário: Novembro | 3 | F01 | — | Turismo!D49 |
| 2024 — anual | Mês citado no questionário: Outubro | 3 | F01 | — | Turismo!D48 |
| 2024 — anual | Mês citado no questionário: Setembro | 3 | F01 | — | Turismo!D47 |

### Meses de MENOR fluxo de hóspedes (quantos empreendimentos citam)

Unidade: **empreendimentos**. Dados preparados: **12**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Mês citado no questionário: Abril | 4 | F01 | — | Turismo!D54 |
| 2024 — anual | Mês citado no questionário: Agosto | 0 | F01 | — | Turismo!D58 |
| 2024 — anual | Mês citado no questionário: Dezembro | 1 | F01 | — | Turismo!D62 |
| 2024 — anual | Mês citado no questionário: Fevereiro | 1 | F01 | — | Turismo!D52 |
| 2024 — anual | Mês citado no questionário: Janeiro | 1 | F01 | 5 empreendimentos responderam; cada um podia marcar vários meses. | Turismo!D51 |
| 2024 — anual | Mês citado no questionário: Julho | 1 | F01 | — | Turismo!D57 |
| 2024 — anual | Mês citado no questionário: Junho | 1 | F01 | — | Turismo!D56 |
| 2024 — anual | Mês citado no questionário: Maio | 1 | F01 | — | Turismo!D55 |
| 2024 — anual | Mês citado no questionário: Março | 3 | F01 | — | Turismo!D53 |
| 2024 — anual | Mês citado no questionário: Novembro | 0 | F01 | — | Turismo!D61 |
| 2024 — anual | Mês citado no questionário: Outubro | 1 | F01 | — | Turismo!D60 |
| 2024 — anual | Mês citado no questionário: Setembro | 1 | F01 | — | Turismo!D59 |

### PIB per capita

Unidade: **R$**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2023 — anual | Sem recorte | 61875,17 | F06 | 873º no país e 93º entre 853 municípios de Minas. | Dados gerais!D14 |

### Participantes estimados

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Evento: Festa de Santa Rita | 20000 | F13 | — | Eventos!D6 |

### Participação de MPE no segmento de eletroeletrônicos

Unidade: **% das empresas do segmento**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 55,51 | F11 | — | Vale da Eletrônica!D13 |

### Participação de eletroeletrônicos no estoque de empresas

Unidade: **%**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 3,9 | F11 | — | Vale da Eletrônica!D11 |

### Participação de pequenos negócios no segmento de eletroeletrônicos

Unidade: **% das empresas do segmento**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 56,83 | F11 | — | Vale da Eletrônica!D12 |

### Permanência média dos turistas

Unidade: **dias**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Evento: Festa de Santa Rita | 2,4 | F13 | — | Eventos!D8 |

### Permanência média dos visitantes

Unidade: **dias**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Evento: HackTown | 3 | F14 | — | Eventos!D13 |

### Pessoas empregadas nos meios de hospedagem

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Sem recorte | 29 | F01 | 5 empreendimentos informaram o número. O Hotel Real Palace responde por 24 dos 29. Crisal, Estação do Vale e Tadini não informaram.; Contexto informado na origem: Total informado. | Turismo!D20 |

### Pessoas que passaram pelo evento (mais de)

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Evento: Festa de Santa Rita | > 240000 | F12 | Texto original: '+240 mil'. | Eventos!D3 |

### Pessoas que trabalharam no evento (mais de)

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Evento: Festa de Santa Rita | > 1500 | F12 | Texto original: '+1,5 mil'. | Eventos!D5 |

### População estimada (painel Sebrae)

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 42520 | F10 | Valor de referência para o Observatório (painel mostra 43 mil, 42,52 mil no detalhe). | Dados gerais!D2 |

### População residente (Censo)

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2022 — anual | Sem recorte | 40635 | F05 | População residente no Censo IBGE 2022, preservada separadamente da estimativa Sebrae de outra referência. | Dados gerais!D3; Pesquisa e inovação!D32 |

### Principais faixas etárias dos hóspedes (quantos empreendimentos citam)

Unidade: **empreendimentos**. Dados preparados: **6**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Faixa etária citada: 16 a 24 anos | 2 | F01 | 7 empreendimentos responderam e cada um podia marcar mais de uma faixa. | Turismo!D32 |
| 2024 — anual | Faixa etária citada: 25 a 34 anos | 4 | F01 | — | Turismo!D33 |
| 2024 — anual | Faixa etária citada: 35 a 44 anos | 6 | F01 | — | Turismo!D34 |
| 2024 — anual | Faixa etária citada: 45 a 54 anos | 4 | F01 | — | Turismo!D35 |
| 2024 — anual | Faixa etária citada: 55 a 64 anos | 3 | F01 | — | Turismo!D36 |
| 2024 — anual | Faixa etária citada: 65 anos ou mais | 1 | F01 | — | Turismo!D37 |

### Procedência dos hóspedes (quantos empreendimentos recebem)

Unidade: **empreendimentos**. Dados preparados: **4**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Procedência dos hóspedes: Entorno regional | 5 | F01 | — | Turismo!D29 |
| 2024 — anual | Procedência dos hóspedes: Internacional | 5 | F01 | — | Turismo!D30 |
| 2024 — anual | Procedência dos hóspedes: Municipal | 3 | F01 | — | Turismo!D31 |
| 2024 — anual | Procedência dos hóspedes: Nacional | 7 | F01 | 7 empreendimentos responderam. Cada um podia marcar mais de uma procedência, por isso a soma passa de 7. O painel de 2024 mostra 12 para Nacional, o que não confere com as respostas (máximo possível: 7). | Turismo!D28 |

### Recursos movimentados na economia local (mais de)

Unidade: **R$**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Evento: Festa de Santa Rita | > 25000000 | F12 | Texto original: '+R$25 milhões'. | Eventos!D4 |

### Startups em processo de incubação

Unidade: **startups**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 47 | F09 | Desejável ter formulário de cadastro para saber o número total de startups do Vale da Eletrônica. | Pesquisa e inovação!D251 |

### Tipo de hospedagem usado pelos visitantes

Unidade: **%**. Dados preparados: **5**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Tipo de hospedagem usado: Airbnb | 9,2 | F14 | Percentual entre os visitantes que pernoitaram.; Evento informado na origem: HackTown 2025. | Eventos!D17 |
| 2025 — anual | Tipo de hospedagem usado: Camping | 7,7 | F14 | Percentual entre os visitantes que pernoitaram.; Evento informado na origem: HackTown 2025. | Eventos!D18 |
| 2025 — anual | Tipo de hospedagem usado: Casa de amigos/parentes | 44,6 | F14 | Percentual entre os visitantes que pernoitaram.; Evento informado na origem: HackTown 2025. | Eventos!D14 |
| 2025 — anual | Tipo de hospedagem usado: Casa própria ou alugada | 10,8 | F14 | Percentual entre os visitantes que pernoitaram.; Evento informado na origem: HackTown 2025. | Eventos!D16 |
| 2025 — anual | Tipo de hospedagem usado: Hotéis e pousadas | 27,7 | F14 | Percentual entre os visitantes que pernoitaram.; Evento informado na origem: HackTown 2025. | Eventos!D15 |

### Turistas estimados

Unidade: **pessoas**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Evento: Festa de Santa Rita | 5600 | F13 | Dentro dos 20.000 participantes estimados. | Eventos!D7 |

### Unidades habitacionais (UHs) informadas

Unidade: **UHs**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2024 — anual | Sem recorte | 251 | F03 | Soma de 8 respostas numéricas. Inclui 50 UHs da CCI Imóveis (imobiliária de temporada, que gerencia vários imóveis, não é um hotel). Não entram Camping Pedra do Osso (resposta em texto) e Pousada Estação do Vale (sem resposta). | Turismo!D11 |

### Visitantes que pernoitaram na cidade

Unidade: **%**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Evento: HackTown | 63,7 | F14 | — | Eventos!D12 |

### Área territorial

Unidade: **km²**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Sem recorte | 352,969 | F05 | — | Dados gerais!D5 |

### Índice Sebrae de Desenvolvimento Econômico Local (ISDEL)

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2021 — anual | Sem recorte | 0,47 | F10 | Fonte do painel: ISDEL – Sebrae Minas (2021). Média dos municípios: 0,32. Nível ALTO. | Dados gerais!D10 |

### Índice de conectividade das telecomunicações e internet

Unidade: **índice (0 a 100)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Sem recorte | 71,54 | F10 | Fonte do painel: Anatel (2025). Mediana de MG: 57,37. 99ª posição entre 853. Nível MUITO ALTO. | Dados gerais!D18 |

### Índice de densidade empresarial

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 0,73 | F10 | Fonte do painel: Receita Federal (consulta 01/10/2026) e CAF/DAP 2025. Mediana de MG: 0,49. 94ª posição entre 853. Nível MUITO ALTO. | Dados gerais!D47 |

### Índice de empregabilidade

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2025 — anual | Sem recorte | 0,83 | F10 | Fonte do painel: RAIS (2025). Mediana de MG: 0,48. 55ª posição entre 853. Nível MUITO ALTO. | Dados gerais!D12 |

### Índice de infraestrutura de saúde

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 0,53 | F10 | Fonte do painel: DATASUS (2026). Mediana de MG: 0,45. 368ª posição entre 853. Nível MÉDIO. | Dados gerais!D20 |

### Índice de riqueza

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2023 — anual | Sem recorte | 0,95 | F10 | Fonte do painel: IBGE (2023). Mediana dos municípios de MG: 0,46. 93ª posição entre 853. Nível MUITO ALTO. | Dados gerais!D11 |

### Índice de vulnerabilidade social

Unidade: **índice (0 a 1)**. Dados preparados: **1**.

| Referência | Recorte | Valor | Fonte | Notas | Origem na planilha |
| --- | --- | --- | --- | --- | --- |
| 2026 — anual | Sem recorte | 0,31 | F10 | Fonte do painel: MDS (2026). Mediana de MG: 0,48. 93ª posição entre 853. Nível MUITO BAIXO (quanto menor, melhor). | Dados gerais!D13 |
