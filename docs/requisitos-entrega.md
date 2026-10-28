# Requisitos da próxima entrega — Observatório do Turismo

> Referência histórica da implementação anterior. Para a Milestone 6, consultar [requisitos e contrato atualizados](m6/requisitos-e-contrato.md) e [procedimento de carga](m6/carga-dos-dados.md). As categorias da fonte são o foco da nova carga; os pressupostos provisórios abaixo não autorizam usar dados pendentes.

Referência para as atividades [G1 (#13)](https://github.com/DaviRosimES/C317/issues/13), [G2 (#14)](https://github.com/DaviRosimES/C317/issues/14) e [G3 (#15)](https://github.com/DaviRosimES/C317/issues/15). Consolidação em 11/10/2026. As definições abaixo distinguem as solicitações confirmadas da Prefeitura das decisões provisórias para desenvolvimento.

## 1. Solicitações confirmadas

- Disponibilizar os oito indicadores da tabela abaixo.
- Filtrar a consulta por período e CNAE.
- Separar ou explicitar a rota tecnológica e a rota cultural no frontend.
- Apresentar a fonte dos dados junto de cada indicador, inclusive nos gráficos.
- Receber os valores dos indicadores prontos; cadastrar e publicar os valores fornecidos, sem calculá-los a partir de dados brutos.
- Começar com três CNAEs provisórios e permitir acrescentar categorias por cadastro, sem alterar o esquema do banco ou uma lista fixa no frontend.

A lista definitiva de CNAEs e a relação entre CNAEs e rotas serão fornecidas pela Prefeitura. Os valores e as classificações da demonstração não constituem informações oficiais sobre o município.

## 2. Dicionário dos indicadores

Os nomes foram informados na reunião. As unidades, os conceitos operacionais e os períodos desta tabela são propostas para desenvolvimento; precisam de validação pela Prefeitura antes da carga oficial. A fonte oficial de **todos os oito indicadores permanece pendente**.

| Código no catálogo | Indicador solicitado | Unidade proposta | Recorte proposto | Período da demonstração | Definição a confirmar |
| --- | --- | --- | --- | --- | --- |
| `empregos_formais` | Empregos formais | Quantidade inteira | Total municipal | Mensal | Estoque de vínculos, pessoas ou saldo de admissões/desligamentos; abrangência do município |
| `numero_hoteis` | Número de hotéis | Quantidade inteira | Total municipal | Mensal | Apenas hotéis ou todos os meios de hospedagem; registrados ou em funcionamento |
| `numero_leitos` | Número de leitos | Quantidade inteira | Total municipal | Mensal | Capacidade instalada ou disponível; abrangência dos estabelecimentos |
| `empresas_ativas` | Empresas ativas | Quantidade inteira | Total municipal | Mensal | Empresas ou estabelecimentos/CNPJs; situação cadastral e CNAEs abrangidos |
| `ocupacao_media_hoteis` | Ocupação média de hotéis | Percentual, de 0 a 100 | Total municipal | Mensal | Ocupação de leitos ou unidades habitacionais; denominador, ponderação e cobertura da pesquisa |
| `empregos_por_setor` | Empregos por setor | Quantidade inteira | Um CNAE por lançamento | Mensal | Mesma definição e fonte do total municipal; uso de CNAE principal ou secundário |
| `empresas_por_setor` | Empresas por setor | Quantidade inteira | Um CNAE por lançamento | Mensal | Mesma definição e fonte das empresas ativas; regras para evitar dupla contagem |
| `numero_patentes` | Número de patentes | Quantidade inteira | Total municipal | Anual | Depósitos, concessões ou estoque; ano de referência e critério de vínculo com o município |

O banco admite referências mensais (`ano`, `mes`) e anuais (`ano`, `mes = NULL`). Um dado anual não deve ser convertido em um mês fictício. Outras periodicidades exigem definição antes da implementação.

### Regras de interpretação

1. Empregos formais e empregos por setor podem representar duas consultas da mesma base. O mesmo vale para empresas ativas e empresas por setor. Os códigos separados preservam os oito itens solicitados, mas não autorizam somar o total municipal aos seus recortes.
2. A soma de três CNAEs não representa necessariamente o total municipal: existem atividades fora do catálogo inicial. Não distribuir um total entre CNAEs sem dados que sustentem essa distribuição.
3. Um zero informado pela fonte é um valor válido. Ausência de lançamento deve aparecer como “Sem dados para o período”, e não como zero.
4. Quantidades de hotéis, leitos, empresas e estoques de empregos não devem ser somadas entre meses para representar um total do intervalo. Mostrar a série ou a referência selecionada; uma agregação exige regra confirmada.
5. Não calcular ocupação média pela média simples de percentuais sem conhecer a ponderação. Nesta entrega, a proposta é registrar o percentual consolidado informado pela fonte.
6. O filtro por CNAE aplica-se aos lançamentos com recorte CNAE. Os totais municipais devem permanecer identificados como municipais, sem receber um CNAE arbitrário. O frontend deve explicitar que o filtro não se aplica a esses totais.
7. Períodos anuais e mensais devem ter seleção e identificação próprias; não comparar valores anuais com mensais sem explicar o recorte.

## 3. Catálogo CNAE extensível

| CNAE provisório | Descrição |
| --- | --- |
| `5510-8/01` | Hotéis |
| `5611-2/01` | Restaurantes e similares |
| `6201-5/01` | Desenvolvimento de programas de computador sob encomenda |

Os códigos e as descrições foram consultados na [tabela oficial CNAE 2.2 do IBGE/CONCLA](https://ftp.ibge.gov.br/Informacoes_Gerais_e_Referencia/Classificacoes/CNAE/cnae2_2/cnae2_2_subclasses_20150609.pdf). **A escolha dessas três categorias para o projeto é provisória**, autorizada para a demonstração. A tabela de CNAEs não é a fonte dos valores dos indicadores.

O catálogo deve ser consultado pelo backend e carregado pelo frontend. O formulário e os filtros não devem limitar as opções a um enum ou array com três valores. A validação do formato do código no banco não substitui a conferência de sua existência na classificação oficial.

## 4. Rotas tecnológica e cultural

As duas rotas devem ser nomeadas e distinguidas na interface. Sua composição permanece pendente. O banco contém um catálogo de rotas e uma associação configurável com CNAEs, que admite um CNAE em mais de uma rota.

Na carga inicial, as rotas existem **sem CNAEs associados**. Mostrar “Classificação dos CNAEs por rota em definição” quando necessário. Não associar automaticamente desenvolvimento de software à rota tecnológica ou restaurantes à rota cultural sem validação da Prefeitura. Se a classificação solicitada ocorrer por atrativo, estabelecimento ou outro critério, revisar o modelo com essa definição.

## 5. Recorte funcional da entrega

A meta informada é entregar 50% do projeto em seis dias. A contagem de issues encerradas não comprova esse percentual; a avaliação deve considerar as funcionalidades exigidas pela disciplina. O recorte proposto é uma demonstração utilizável do fluxo:

**acesso administrativo → lançamento com período/fonte → publicação → consulta pública → filtros e visualização.**

| Entrega | Critério verificável | Dependência |
| --- | --- | --- |
| Requisitos e catálogo | Dicionário único; definições pendentes explícitas; oito tipos e três CNAEs de demonstração | G1 |
| Persistência | Valores municipais/CNAE e períodos anuais/mensais persistidos; ampliação do catálogo por dados | G2 |
| Administração | Autenticação e cadastro/publicação com validação de unidade, recorte, período e fonte | V1/V2 (#16/#17), D1/D2 (#22/#23) |
| Consulta pública | Exibir somente publicados; retornar fonte, unidade, referência e marca de demonstração | V3 (#18) |
| Frontend | Layout orientado pelo protótipo; indicadores/gráficos; filtros dinâmicos; rotas explicitadas | J1/J2/J3 (#19/#20/#21) |
| Validação integrada | Fluxos completos e persistência após reinício conferidos com dados conhecidos | G3, após as dependências acima |

Relatórios PDF públicos fazem parte do escopo original e da tarefa D3 (#24). Sua entrada nesta próxima demonstração depende da prioridade e do cronograma do grupo. Coleta autônoma por estabelecimentos, painel informativo Cadastur/FNRH e inventário turístico permanecem extensões de fase 2; não são incluídos automaticamente pelo protótipo.

## 6. Entrada de dados e fontes

A Prefeitura confirmou que o sistema receberá **valores prontos**. O fluxo de entrada deve cadastrar os valores consolidados com unidade, período, recorte e fonte. O sistema valida o lançamento e controla sua publicação; não precisa calcular os indicadores a partir de dados brutos. Não foram implementadas coleta automática ou integração federal.

O protótipo da Prefeitura é uma referência visual. Suas simulações em `localStorage`, números e fontes sugeridas não provam que esses dados estejam disponíveis ou que integrações façam parte desta entrega.

Cada lançamento deve conter uma fonte identificável, preferencialmente nome da base/relatório, instituição, referência da publicação e URL quando disponível. `tipos_indicadores.fonte_referencia` descreve uma referência do catálogo; `indicadores.origem` identifica a fonte do valor concreto e deve acompanhar sua apresentação pública. Na demonstração, a origem declara explicitamente que os valores são fictícios.

## 7. Pendências para validação com a Prefeitura

| Pendência | Impacto na implementação |
| --- | --- |
| Fonte/dataset e exemplo de arquivo para cada indicador | Permite carga oficial e validação dos conceitos |
| Definição de cada contagem, ocupação e patentes | Evita resultados com significados diferentes |
| Periodicidade e anos/meses disponíveis | Confirma filtros e séries temporais |
| CNAEs definitivos, versão e nível de agrupamento | Substitui o catálogo provisório e orienta futuras categorias |
| Critério de composição das rotas tecnológica/cultural | Define as associações e sua apresentação |
| Obrigatoriedade de filtros CNAE para os totais municipais | Confirma o comportamento proposto para indicadores sem recorte setorial |
| Template da coleta por estabelecimentos | Necessário se a funcionalidade de fase 2 for antecipada |

Detalhes da persistência: [modelo de dados](modelo-dados.md). Dados e cenários de conferência: [validação da entrega](validacao-entrega.md).
