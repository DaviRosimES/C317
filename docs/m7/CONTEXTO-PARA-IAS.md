# C317 — Contexto de implementação para as IAs da equipe

**Revisão 3 — 05/11/2026.** Regras aprovadas por Gustavo. Este Markdown serve como contexto portátil do projeto. A tarefa de cada integrante será informada separadamente; este arquivo não atribui trabalho nem autoriza editar código, executar migrações ou publicar no GitHub.

## Como usar

Anexe este arquivo e informe à IA qual tarefa foi atribuída. Disponibilize o repositório e os três documentos abaixo. Antes de implementar, a IA deve explicar o que já existe, o que falta, os arquivos a alterar e as dependências, e aguardar o pedido explícito de implementação do integrante.

| Referência normativa | Conteúdo |
| --- | --- |
| [Estrutura e dicionário](01-estrutura-e-dicionario.md) | Conceitos, UML, campos, integridade, catálogos e as 61 definições preparadas. |
| [Dados e integração](02-dados-e-integracao.md) | Origem, escopo, transformações, pacote, migração e os 303 dados preparados. |
| [Fluxos de uso](03-fluxos-de-uso.md) | Navegação, filtros, CRUD, publicação, arquivo/restauração, PDFs e 32 critérios. |

Os três documentos são a referência detalhada. Se este resumo não responder a um caso, consultar o documento correspondente. Se houver divergência entre documentos e código existente, apontar a diferença; não tratar uma regra nova como implementada só por estar descrita. Divergência entre os documentos deve ser esclarecida, sem inventar outra regra.

Os rascunhos anteriores `g7-*`, `g8-*`, `g9-*` e `guia-tarefas-equipe.md` foram substituídos por esta organização. As instruções de segurança e trabalho do repositório continuam aplicáveis. O arquivo StarUML `g7-modelo-de-dominio.mdj` e o Mermaid correspondente permanecem como anexos do modelo.

## Projeto e estado da entrega

Repositório: [DaviRosimES/C317](https://github.com/DaviRosimES/C317). Monorepo com FastAPI/PostgreSQL em `backend/` e React em `frontend/`.

O objetivo desta correção é dar coerência aos indicadores, aos dados e aos fluxos da Prefeitura. As decisões e os arquivos estão preparados; isso não comprova que o banco/API/telas já executam o novo modelo. Conferir branch, arquivos, contratos e estado de integração antes de afirmar o que está pronto.

Não substituir as convenções do repositório por uma arquitetura criada do zero. Respeitar as camadas atuais: backend com rotas, serviços e repositórios; frontend com `routes → features → queries → services → api/http`, DTOs e mapeadores.

## Modelo aprovado

- **Indicador:** define uma medida, nome, significado, uma unidade, um ou mais setores, referências e classificações permitidas e aceitação de dado sem categoria.
- **Dados do indicador:** ID estável, indicador, Santa Rita fixa, referência completa, valor decimal, qualificador, fonte, categoria quando aplicável, notas e origem documental. Publicação, arquivo e bloqueio são estados da aplicação.
- **Setor do Observatório:** Dados gerais, Turismo, Economia criativa, Eventos, Pesquisa e inovação e Vale da Eletrônica. Reaproveita o antigo Tema; não manter os dois em paralelo.
- **Classificação/Categoria:** recortes locais, como Público da pesquisa → Moradores ou Categoria de hospedagem → Hotel. Cada categoria pertence a uma classificação permitida pelo indicador.
- **Unidade:** uma por definição. Quantidade, percentual e razão por mil habitantes são medidas distintas quando significam coisas diferentes.
- **Relatório:** documento independente. Novo cadastro por PDF, com título e fonte; publicar um dado não gera um relatório.

Setor pertence à definição, não a cada valor. Ano pertence à referência do dado, não à definição. Fonte pertence ao dado e não é uma fonte única fixa do indicador. Uma nova categoria, fonte, setor ou definição não exige um componente ou uma coluna específica por item.

Identidade semântica: indicador + município + categoria/ausência + referência completa + fonte. Setor não integra a identidade. Corrigir preserva o ID e recusa conflito sem sobrescrever outro dado. Não recalcular IDs antigos com campos editáveis. Uma mudança de significado/unidade que altera a medida exige outra definição e remapeamento validado.

## Consulta pública e filtros

1. `/` apresenta o Observatório e oferece acessos a Indicadores, Relatórios e Sobre.
2. Gráficos, dados e tabela ficam em Indicadores. Dashboard sai do menu como consulta separada; seus acessos conduzem à área unificada.
3. **Setor e Ano/Período são os únicos filtros gerais**, antes da lista. Padrões: Todos os setores e Todos os períodos. Não exigir escolher indicador primeiro.
4. Listar um indicador uma vez se tiver ao menos um dado compatível e público elegível. Mostrar somente os dados que passaram pela seleção global, sem duplicar por associações setoriais.
5. Referência é comparada inteira: anual 2024 não é acumulado 2000–2024 nem 2020–2024. Levantamento 2022 e 2023 é uma referência, não dois dados anuais.
6. No detalhe, fonte/classificação/categoria restringem somente aquele indicador, dentro do filtro global. Não afetam outros indicadores da lista. Permitir trocar fonte limpando recortes incompatíveis.
7. Setores disponíveis vêm de dados elegíveis em algum período. Períodos disponíveis dependem do setor. Se mudar setor invalidar o período, voltar a Todos com informação clara.
8. Aplicar atualiza resultados e URL; Limpar volta aos dois padrões. Restaurar URL válida; retirar parâmetros desconhecidos/incompatíveis com indicação. Não permitir outra cidade por parâmetro antigo.
9. Se o detalhe aberto sair da lista, fechá-lo; se continuar, limpar somente recortes incompatíveis. Sem dados compatíveis é vazio, sem retorno silencioso de todos os dados.

Elegibilidade do dado: publicado + não arquivado + não bloqueado + indicador não arquivado + Santa Rita. Aplicar no backend também a opções, detalhes e acessos diretos. Estados reais de publicação não são definidos pelo pacote.

Setor do Observatório não é CNAE nem Setor econômico (Sebrae). A associação setorial não muda a população medida: total municipal 116 não vira subtotal criativo 18. Não fabricar interseções Comércio + MEI a partir de distribuições independentes ou UHs por Hotel sem dados da fonte.

Não somar total e recortes, fontes/edições distintas, públicos sobrepostos ou períodos incompatíveis. Zero difere de ausência. Mostrar unidade, fonte, referência, notas e qualificadores. A tabela corresponde ao gráfico. Arredondamento de exibição não altera o decimal original.

## CRUD, publicação e arquivamento

- Administração permite cadastrar, consultar, editar e arquivar/restaurar definições, dados e relatórios. Dados e relatórios também podem ser publicados/despublicados.
- A definição exige setores e uma unidade; o dado herda ambos. Fonte/categoria/referência/valor devem ser editáveis com validação e ID preservado. Não invalidar dados existentes ao alterar uma definição.
- Novo dado/relatório começa em rascunho. Publicar é explícito. A definição aparece pelos dados publicados, sem outro botão para publicar a própria definição.
- Confirmar edição de publicado atualiza o público imediatamente. Editar rascunho mantém rascunho. Não criar versão editada paralela.
- `status` (rascunho/publicado) é separado de `arquivado`. Arquivar oculta sem reescrever status; restaurar conserva a situação anterior e os bloqueios.
- Arquivar indicador oculta todos os filhos sem alterar seus estados individuais. Restaurar não publica rascunhos nem restaura filhos arquivados separadamente.
- Arquivado exige restauração antes de editar/publicar/despublicar. Usar arquivamento reversível, sem exclusão física como atalho.
- Não criar registro de quem alterou nem histórico de versões. Autenticação e autorização administrativas continuam obrigatórias. Proveniência documental e notas continuam porque explicam o dado.

## Relatórios e conteúdo institucional

Novo relatório exige título, fonte e PDF válido. Número, tipo, data original e referência são opcionais quando conhecidos; mês exige ano. Não oferecer URL para novos cadastros. Preservar documentos legados reais em links externos.

Validar conteúdo PDF e limite informado. Uma troca com falha mantém o arquivo vigente; uma troca confirmada mantém o estado de publicação e, se publicado, atualiza o público. Há um único conteúdo vigente, PDF ou link legado. Arquivar/despublicar impede listagem e acesso público direto pelos endpoints da plataforma; não altera permissões do provedor externo.

Sobre explica origem, finalidade, setores, fontes e leitura dos dados. Cadastur/FNRH ficam secundários. Contribua preserva canais externos existentes. Não apresentar inventário como pronto. Não prometer comparações regionais, dados pendentes ou integração automática.

Textos do produto usam **Indicadores**, **Dados do indicador**, **Relatórios**, **Notas**, **Rascunho**, **Publicado** e **Arquivado**. Retirar Lançamentos/Observações como cadastros paralelos e mensagens internas com M6/M7, tarefas ou migração.

## Pacote de dados: contrato e preservação

`backend/dados/m7/`, contrato **`c317.m7.g8.v2`**: 61 indicadores, 303 dados municipais, seis setores, 67 associações, 18 classificações, 80 categorias. Seis indicadores multissetoriais. Contagens descrevem o pacote preparado, não limites do sistema nem itens já publicados.

| Arquivo | Uso |
| --- | --- |
| `catalogos.json` | Definições em `indicadores`, unidades, setores, fontes, classificações, categorias e território. |
| `dados_indicadores.jsonl` | Um dado por linha, com ID, referência, valor, fonte, categoria, notas e origens. |
| `dicionario_indicadores.csv` | Definições para revisão humana. |
| `setores_indicadores.csv` | As 67 associações sem duplicar os valores. |
| `mapeamento_m6_m7.csv` | Correspondência dos 303 IDs e identidade de destino. |
| `retirados_por_abrangencia.csv` | IDs dos 925 não municipais; não importar, arquivar se existentes. |
| `exclusoes.csv` | As 119 linhas que continuam excluídas por pendência ou restrição. |
| `legado_demonstracao.csv` | Arquivamento previsto dos exemplos fictícios antigos. |
| `regras_normalizacao.json`, `manifesto.json` | Regras, versão, contagens, hashes e condições de integração. |

Campos reais da definição: `codigo`, `nome`, `definicao`, `unidade_codigo`, `setores`, `tipos_referencia_permitidos`, `classificacoes_permitidas`, `aceita_sem_categoria`, `nota_metodologica`. Campos do JSONL: `id`, `indicador_codigo`, `territorio_codigo`, `categoria_codigo`, `referencia`, `valor`, `qualificador`, `fonte_codigo`, `notas`, `origens`, `demonstracao`.

`valor` é string decimal para preservar precisão. Não armazenar/transmitir por ponto flutuante; conversão para desenhar gráfico não substitui o valor exato. O estado da aplicação não faz parte desse JSONL. O nome de um campo do pacote não define automaticamente o nome do endpoint HTTP ou do DTO da aplicação.

Preservar M6 e planilha original como fontes. O carregador M6 não aceita o novo contrato por troca de arquivos. Adaptar migração/carga incrementalmente e inventariar o banco real: existentes mantêm publicação/arquivo/bloqueio; novos ficam em rascunho; 925 não municipais e demonstrações antigas são destinados a arquivo, sem descarte físico implícito. Não introduzir dados pendentes, códigos CNAE inferidos ou cálculos não recebidos.

## Exemplos reais para validar entendimento

| Consulta | Conteúdo preparado |
| --- | --- |
| Economia criativa + 2025 anual | Quatro indicadores de percepção: Acolhedora, Criativa, Inovadora e Inspiradora. |
| Turismo + 2024 anual | 14 indicadores; não inclui Acolhedora. |
| Economia criativa + 2024 anual | Nenhuma correspondência; a interface limpa período incompatível ao mudar setor. |
| Acolhedora, anual 2025, Moradores | 44,5% dos entrevistados. Amostra total 51,1%; Visitantes 60,6%. |
| Meios de hospedagem, anual 2024, Hotel / Resort | 3 / 0, fonte SMCELT. Total 10 tem outra fonte. |
| UHs, anual 2024 | 251; sem divisão recebida por Hotel. Oito respostas numéricas, incluindo 50 UHs da CCI Imóveis. |
| Depósitos de PI | Anual 2024 = 5; acumulado 2000–2024 = 72; acumulado 2020–2024 = 24. |
| Estoque de empresas, anual 2026 | Totais 5.818 ou 5.879 conforme a fonte; não somar ou sobrescrever. |
| Empreendimentos ativos, levantamento 2022 e 2023 | Total 116; subtotal criativo 18, explicitamente identificado. |

Exemplos de quantidade pública presumem elegibilidade e não justificam publicar toda a carga automaticamente.

### Exemplo de conteúdo real do contrato

O objeto abaixo combina uma definição e um dado preparado, para mostrar os vínculos. Não é um payload HTTP já implementado; `origens` foi omitido deste exemplo compacto, mas deve ser preservado no dado real.

```json
{
  "indicador": {
    "aceita_sem_categoria": false,
    "classificacoes_permitidas": [
      "publico_pesquisa"
    ],
    "codigo": "i_cidade_vista_como_acolhedora_fc339b5db8",
    "definicao": "Percentual dos entrevistados que associaram a cidade ao atributo Acolhedora, por público da pesquisa recebida.",
    "nome": "Cidade vista como: Acolhedora",
    "nota_metodologica": "Valores consolidados recebidos. Preservar fonte, referência e notas de cada dado; não somar totais com recortes, recortes de classificações diferentes ou períodos.",
    "setores": [
      "tema_economia_criativa_ca3ef6a61b"
    ],
    "tipos_referencia_permitidos": [
      "anual"
    ],
    "unidade_codigo": "u_dos_entrevistados_d2d9128f71"
  },
  "dado_preparado": {
    "categoria_codigo": "c_publico_pesquisa_moradores_ad535c7f5e",
    "demonstracao": false,
    "fonte_codigo": "f_relatorio_ot_no_004_2025_impacto_turistico_hacktown_2025_sec_d2e1f26742",
    "id": "4152c38ca7d8e01a414d268629189bebb381815c979fdb82c1b31a0ddb25735b",
    "indicador_codigo": "i_cidade_vista_como_acolhedora_fc339b5db8",
    "notas": [],
    "qualificador": "igual",
    "referencia": {
      "ano_fim": 2025,
      "ano_inicio": 2025,
      "mes": null,
      "tipo": "anual"
    },
    "territorio_codigo": "t_santa_rita_do_sapucai_831ff035c3",
    "valor": "44.5"
  }
}
```

## Trabalho seguro e conclusão da tarefa

1. Ler `AGENTS.md`, se existir, e `CLAUDE.md`; conferir branch, `git status` e contratos antes de propor alterações.
2. Explicar a solução e aguardar pedido explícito para modificar código. Implementar somente a tarefa atribuída, preservando alterações dos demais.
3. Documentar o contrato compartilhado antes de integrar consumidores. Não inventar endpoints ou dados se a dependência ainda não existir.
4. Usar API real no aceite. Mocks apoiam preparação e não podem ocultar erro da API no produto.
5. Preservar estados após nova consulta e reinício; mostrar sucesso somente após confirmação do servidor.
6. Executar as verificações exigidas e apropriadas à mudança. O plano da suíte de testes será definido separadamente. Em testes que precisarem de nomes/emails, preferir Cristiano Ronaldo e `cristiano.ronaldo@example.test`.
7. Informar separadamente implementado, verificado e pendente de integração. Não declarar Done apenas por interface, PR ou CI isolados.
8. Não fazer commit, push, merge ou migração sem a solicitação correspondente do integrante.

Inventário completo, coleta nativa, comparações entre cidades, integrações automáticas, auditoria de autor e histórico de versões não fazem parte desta correção. As tarefas aprovadas estão publicadas no GitHub e relacionadas em [Tarefas da equipe](tarefas-equipe.md). A IA deve atuar somente na tarefa atribuída ao integrante.
