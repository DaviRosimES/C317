# C317 — Documentação das correções aprovadas

**Revisão 3 — 05/11/2026.** Organização em três documentos de referência e um contexto para as IAs. Os requisitos foram aprovados e as nove tarefas foram publicadas no GitHub, com três por integrante. Este material não comprova a implementação das correções no programa.

## Comece por estes quatro arquivos

| Documento | Pergunta que responde | Conteúdo |
| --- | --- | --- |
| [1. Estrutura dos indicadores e dicionário](01-estrutura-e-dicionario.md) | Como os conceitos e campos se relacionam? | Modelo, UML, indicador x dados, setores, unidades, classificações, categorias, identidade e 61 definições. |
| [2. Dados recebidos, tratamento e integração](02-dados-e-integracao.md) | Quais dados temos e como preservá-los? | Origem, escopo municipal, transformações, arquivos, migração, fontes e os 303 valores preparados. |
| [3. Fluxos de uso e regras funcionais](03-fluxos-de-uso.md) | Como a plataforma deve funcionar? | Setor/Ano-Período gerais, recortes locais no detalhe, consulta unificada, CRUD, publicação, arquivo/restauração, PDFs, textos e 32 critérios. |
| [4. Contexto para as IAs](CONTEXTO-PARA-IAS.md) | O que a IA precisa saber antes de implementar? | Resumo portátil das decisões, campos, exemplos, limites e procedimento de trabalho; sem tarefas atribuídas. |

Os documentos 1–3 são a referência detalhada. O contexto 4 resume e aponta para eles. Para outra pessoa ou IA, enviar o contexto com a tarefa atribuída e disponibilizar os três documentos e o repositório.

## Tarefas publicadas

[Consultar a divisão, dependências e links das nove issues](tarefas-equipe.md). Todas foram conferidas em Todo no Project C317 em 05/11/2026. A adaptação do carregador está em V9, com Vitor.

## Anexos e dados técnicos

- [UML editável no StarUML](g7-modelo-de-dominio.mdj) e [Mermaid](g7-modelo-de-dominio.mmd).
- [Catálogo JSON](../../backend/dados/m7/catalogos.json), [dados JSONL](../../backend/dados/m7/dados_indicadores.jsonl), [dicionário CSV](../../backend/dados/m7/dicionario_indicadores.csv) e [associações a setores](../../backend/dados/m7/setores_indicadores.csv).
- Contrato de dados preservado: `c317.m7.g8.v2`. A reorganização documental não alterou os arquivos do pacote.

## Documentos anteriores

As versões `g7-modelo-de-dominio.md`, `g8-tratamento-dos-dados.md`, `g9-fluxos-e-criterios.md`, `g9-contrato-dos-filtros.md`, `g9-conteudo-institucional.md` e `guia-tarefas-equipe.md` permanecem como histórico, com aviso de substituição. Os nove rascunhos em `g9-tarefas-equipe.md` também ficam como histórico de planejamento; a divisão atual está em `tarefas-equipe.md`. O nome antigo dos anexos UML/Mermaid não muda sua validade como modelo aprovado.

A documentação da M6 continua como referência do contrato e da implementação anteriores. Para as correções novas, seguir esta organização. Diferenças entre documentação e aplicação devem ser apontadas e verificadas antes de declarar uma funcionalidade pronta.
