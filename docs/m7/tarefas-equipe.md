# Tarefas publicadas da equipe — Milestone 7

**Publicação e conferência: 05/11/2026.** Nove issues criadas pela conta `gustavogago`, atribuídas aos responsáveis e vinculadas ao Project C317, em **Todo** no momento da conferência. As tarefas implementam os três documentos aprovados; a criação das issues não comprova conclusão das funcionalidades.

Quadro: [C317](https://github.com/users/DaviRosimES/projects/3).

## Distribuição

| Integrante | Issue | Resultado | Prioridade |
| --- | --- | --- | --- |
| Vitor | [V7 #44](https://github.com/DaviRosimES/C317/issues/44) | Estruturar definições de indicadores, setores e catálogos | P0 |
| Vitor | [V8 #45](https://github.com/DaviRosimES/C317/issues/45) | Implementar administração e entrega de relatórios PDF no backend | P1 |
| Vitor | [V9 #46](https://github.com/DaviRosimES/C317/issues/46) | Adaptar a carga, migrar os dados e implementar a consulta global | P0 |
| João | [J7 #49](https://github.com/DaviRosimES/C317/issues/49) | Criar Início institucional e consolidar Dashboard em Indicadores | P1 |
| João | [J8 #48](https://github.com/DaviRosimES/C317/issues/48) | Apresentar os indicadores filtrados com gráficos, tabela e contexto | P0 |
| João | [J9 #47](https://github.com/DaviRosimES/C317/issues/47) | Implementar filtros gerais por Setor e Ano/Período e recortes no detalhe | P0 |
| Davi | [D7 #50](https://github.com/DaviRosimES/C317/issues/50) | Implementar administração de definições e Dados do indicador | P0 |
| Davi | [D8 #51](https://github.com/DaviRosimES/C317/issues/51) | Criar administração de relatórios por envio de PDF | P1 |
| Davi | [D9 #52](https://github.com/DaviRosimES/C317/issues/52) | Revisar Sobre, fontes e orientações institucionais | P1 |

## Ordem e dependências

- Começar por [V7 #44](https://github.com/DaviRosimES/C317/issues/44) e compartilhar o contrato de definições/catálogos.
- [V9 #46](https://github.com/DaviRosimES/C317/issues/46) depende de V7 e inclui **adaptar o código de carga**, simular, migrar, carregar e integrar consulta e administração dos dados. Não é uma implementação prévia de Gustavo.
- [V8 #45](https://github.com/DaviRosimES/C317/issues/45) pode avançar em paralelo e desbloqueia [D8 #51](https://github.com/DaviRosimES/C317/issues/51).
- A estrutura de [J7 #49](https://github.com/DaviRosimES/C317/issues/49) e os textos de [D9 #52](https://github.com/DaviRosimES/C317/issues/52) podem avançar em paralelo. O aceite da consulta depende de [J8 #48](https://github.com/DaviRosimES/C317/issues/48), [J9 #47](https://github.com/DaviRosimES/C317/issues/47) e V9; fontes dinâmicas de D9 também dependem de V9.
- [D7 #50](https://github.com/DaviRosimES/C317/issues/50) depende de V7/V9 para os formulários e as ações funcionarem com a API real.

O início de componentes com contrato ou exemplos não encerra critérios que dependem da integração.

## Arquivos que precisam estar disponíveis

Os três documentos e o contexto estão em [README da documentação](README.md). Gustavo os encaminhará ao grupo pelo Teams. Para implementar, disponibilizar também o pacote real `backend/dados/m7/`, contrato `c317.m7.g8.v2`; os Markdown não substituem os JSON/JSONL, mapeamentos e manifesto.

A carga atual aceita `c317.m6.v1`. Não trocar arquivos para forçar o contrato novo nem publicar a preparação inteira automaticamente. A V9 documentará simulação e aplicação, preservando dados, IDs, decimais e estados existentes. A próxima suíte de testes será planejada separadamente.

## Descrições publicadas

As descrições abaixo reproduzem as issues no momento da publicação. Alterações posteriores devem ser conferidas no GitHub.

### V7 · Estruturar definições de indicadores, setores e catálogos

[Issue #44](https://github.com/DaviRosimES/C317/issues/44) · Responsável: Vitor.

#### Entregas:
- Implementar migração incremental e persistência da definição: código estável, nome, significado, uma unidade, setores, referências e classificações permitidas, aceitação de dado sem categoria e nota metodológica.
- Reaproveitar Tema como Setor do Observatório, com um ou mais setores por indicador. Preservar os seis grupos e códigos, sem manter Tema e Setor em paralelo.
- Disponibilizar cadastro, consulta, edição e arquivo/restauração de definições e os catálogos necessários. Fontes, classificações e categorias podem ser acrescentadas por cadastro; unidades e setores vêm da API.
- Documentar contrato HTTP, DTOs, validações e erros para João e Davi, reutilizando autenticação e camadas existentes.

#### Critérios de conclusão:
- [ ] Criar, consultar e editar definição funciona sem componente/coluna por indicador. Cada definição possui uma unidade e pelo menos um setor, com compatibilidades validadas.
- [ ] Representar 61 definições e 67 associações, incluindo seis indicadores multissetoriais, sem duplicar dados.
- [ ] Renomear preserva códigos. Alteração que invalide dados existentes, inclusive arquivados, é recusada com indicação dos vínculos.
- [ ] Arquivar/restaurar a definição é persistido e pode ser consumido por V9; não há publicação independente da definição nem exclusão física como fluxo comum.
- [ ] Catálogos em uso são protegidos; novos setores/categorias não exigem lista fixa no frontend. Setor econômico (Sebrae) e CNAE permanecem distintos do Setor do Observatório.
- [ ] Operações administrativas exigem autenticação e o contrato compartilhado está documentado.

Dependências: documentação aprovada e pacote `backend/dados/m7/` disponível. Desbloqueia V9 e integração de D7.
Prioridade: P0.
Responsável: Vitor.

Critérios de referência: ADM-01, ADM-02, ADM-03, FILT-01, FILT-04, SEG-01.

Observação: os campos do pacote não são endpoints prontos. Preservar códigos opacos, inclusive o prefixo histórico tema_. Não apagar estruturas ou dados como atalho de migração.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### V8 · Implementar administração e entrega de relatórios PDF no backend

[Issue #45](https://github.com/DaviRosimES/C317/issues/45) · Responsável: Vitor.

#### Entregas:
- Criar API para cadastrar, consultar, editar, publicar, despublicar, arquivar e restaurar relatórios. Novo cadastro exige título, fonte e PDF; demais metadados são opcionais quando conhecidos.
- Implementar armazenamento e entrega do PDF, validação do conteúdo, limite configurado/informado e substituição que preserve o arquivo vigente em caso de falha.
- Preservar documentos legados reais em links externos. Novos cadastros e substituições usam PDF; cada relatório tem um único conteúdo vigente.
- Documentar upload, respostas e erros para D8 e aplicar autorização e elegibilidade no acesso direto aos arquivos/redirecionamentos.

#### Critérios de conclusão:
- [ ] Administrador cadastra, consulta e corrige título/fonte/PDF; número, tipo, data original e referência não são inventados. Mês exige ano.
- [ ] Arquivo inválido ou acima do limite é rejeitado. Falha na troca conserva o conteúdo vigente; troca confirmada mantém o status.
- [ ] Novo relatório é rascunho; publicar/despublicar funciona. Edição confirmada de publicado atualiza o público imediatamente e edição de rascunho continua privada.
- [ ] Arquivar/restaurar conserva o status anterior; arquivado precisa ser restaurado antes de edição/publicação. Não há versão publicada paralela.
- [ ] Lista, detalhe e download públicos não expõem rascunhos/arquivados. Links legados reais são preservados e documentos fictícios não são apresentados como reais.

Dependências: documentação aprovada e autenticação existente; pode avançar em paralelo à V7 (#44). Desbloqueia D8.
Prioridade: P1.
Responsável: Vitor.

Critérios de referência: REL-01, REL-02, REL-03, ADM-06, ADM-07, ADM-08, SEG-01.

Observação: publicar Dados do indicador não gera PDF. A plataforma controla seus endpoints; arquivar link legado não revoga permissões no provedor externo.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### V9 · Adaptar a carga, migrar os dados e implementar a consulta global

[Issue #46](https://github.com/DaviRosimES/C317/issues/46) · Responsável: Vitor.

#### Entregas:
- Implementar/adaptar o carregador para c317.m7.g8.v2, validando versão, manifesto/hashes, vínculos, unidades, referências, decimais e identidade. Oferecer simulação sem gravação e aplicação documentada no banco.
- Migrar e carregar incrementalmente as 61 definições e os 303 dados municipais, usando o mapeamento fornecido e preservando IDs, valores, origens, notas, fontes, qualificadores, referências e estados existentes.
- Garantir que reexecução não duplica dados nem reinicia publicação/arquivo/bloqueio. Conteúdo já corrigido que divergir do pacote gera conflito e resolução explícita, sem sobrescrita silenciosa.
- Não importar os 925 não municipais; arquivar seus IDs se existentes. Arquivar demonstrações antigas sem convertê-las em dados reais ou excluir fisicamente.
- Implementar operações administrativas de Dados do indicador e regras de publicação, correção completa, despublicação, arquivo/restauração e ocultação pelo indicador-pai.
- Oferecer consulta e opções por Setor e Ano/Período antes da escolha de indicador, com recortes locais e a mesma elegibilidade em listas, opções, detalhes e fontes públicas.

#### Critérios de conclusão:
- [ ] Outro integrante reproduz migrações, simulação e carga com comandos documentados. Simulação não grava; o resumo distingue inseridos, existentes, conflitos, arquivamentos previstos e exclusões.
- [ ] Preservar 303 IDs/decimais/fontes/referências/origens, 67 associações e 119 exclusões. Reexecutar não duplica ou redefine estados; novos dados começam em rascunho.
- [ ] Corrigir valor, fonte, categoria ou referência preserva ID. Duplicidade é recusada sem sobrescrever outro dado; Setor não integra a identidade.
- [ ] Edição confirmada de publicado é imediata; rascunho continua privado. Arquivo/restauração preserva status/bloqueios; arquivar indicador oculta filhos sem reescrever seus estados individuais.
- [ ] A API retorna cada indicador/dado uma vez, apenas se municipal, publicado, ativo, sem bloqueio e compatível com setor/referência completa. Anual 2024 não inclui acumulados encerrados em 2024.
- [ ] Na simulação do pacote: Economia criativa + anual 2025 encontra quatro indicadores; Turismo + anual 2024 encontra 14; Economia criativa + anual 2024 fica vazia. A publicação real continua obrigatória.
- [ ] Setores disponíveis consideram dados elegíveis em algum período; períodos dependem do setor. Fonte/classificação/categoria operam só no indicador aberto, sem inventar cruzamentos ou CNAEs.
- [ ] Dados e estados permanecem corretos após nova consulta/reinício. Detalhes públicos não contornam elegibilidade e administração exige autenticação.

Dependências: V7 (#44) e pacote `backend/dados/m7/` disponibilizado por Gustavo. Desbloqueia J8/J9/D7 e fontes de D9.
Prioridade: P0.
Responsável: Vitor.

Critérios de referência: MIG-01, MIG-02, ADM-04, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, PUB-01, PUB-02, PUB-04, PUB-05, FILT-01, FILT-02, FILT-03, FILT-04, SEG-01.

Observação: adaptar o código de carga faz parte desta tarefa, não é uma dependência de implementação de Gustavo. O carregador M6 aceita apenas c317.m6.v1: não trocar os arquivos para forçar a carga. Não publicar toda a preparação automaticamente nem construir um motor genérico de importação.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### J7 · Criar Início institucional e consolidar Dashboard em Indicadores

[Issue #49](https://github.com/DaviRosimES/C317/issues/49) · Responsável: João.

#### Entregas:
- Transformar / em apresentação institucional do Observatório, com acessos a Indicadores, Relatórios e Sobre, usando os textos aprovados.
- Reunir gráficos, dados e tabela em Indicadores; retirar Dashboard como consulta separada e atualizar menus, links internos e destino da rota antiga.
- Integrar filtros gerais J9 antes da lista e componentes J8 nos indicadores resultantes. Não exigir escolha de indicador antes de Setor/Ano-Período.
- Preservar os canais externos de Contribua e a navegação das demais áreas; não oferecer Inventário como funcionalidade pronta.

#### Critérios de conclusão:
- [ ] Início explica a plataforma e seus acessos funcionam. Gráficos ficam em Indicadores; Dashboard não é uma consulta concorrente.
- [ ] Setor e Ano/Período precedem a lista compatível. Cards/lista pesquisável e abertura dos detalhes ficam a critério de João.
- [ ] Menus e acessos internos seguem a navegação unificada, sem links quebrados ou textos internos de milestone.
- [ ] Consulta integrada usa API real, distingue carregamento/vazio/erro e funciona em tela estreita e por teclado, com rótulos e foco visível.

Dependências: texto institucional aprovado. Estrutura/navegação pode começar em paralelo; concluir a consulta depende de J8 (#48), J9 (#47) e V9 (#46).
Prioridade: P1.
Responsável: João.

Critérios de referência: NAV-01, NAV-02, PUB-02, FILT-01, TXT-01, UX-01, UX-02.

Observação: João mantém a navegação compartilhada para evitar edição simultânea com D9. Preparação visual pode ocorrer antes da API; aceite da consulta exige integração real.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### J8 · Apresentar os indicadores filtrados com gráficos, tabela e contexto

[Issue #48](https://github.com/DaviRosimES/C317/issues/48) · Responsável: João.

#### Entregas:
- Exibir os indicadores e dados retornados pelos filtros globais, com definição, unidade, referência, fonte, qualificador, cobertura e notas necessárias.
- Adaptar resumos, gráficos e tabela a valores avulsos, categorias, séries e referências não anuais. Oferecer tabela correspondente a cada visualização.
- Distinguir totais, recortes, fontes/edições, públicos de pesquisa e tipos de referência; preservar zero e ausência.
- Usar componentes reutilizáveis e catálogos da API, sem componente específico por definição/categoria.

#### Critérios de conclusão:
- [ ] Indicador sem dado compatível não aparece. Múltiplos setores não duplicam indicador/valor; resumo, gráfico e tabela acompanham a seleção aplicável.
- [ ] Decimais originais são preservados; exibição não altera o conteúdo. Fonte, unidade, referência e notas relevantes são legíveis.
- [ ] Não somar totais e recortes, classificações independentes, fontes distintas ou Amostra total/Moradores/Visitantes. Acumulados/levantamentos não viram pontos anuais.
- [ ] Acolhedora apresenta 51,1%, 44,5% e 60,6% com seus públicos. Hotel = 3 em hospedagem não transforma 251 UHs em número de Hotel; filtro local não afeta os outros indicadores.
- [ ] Em Economia criativa, 116 continua total municipal e 18 é o subtotal criativo recebido. A associação setorial não muda o significado do valor.
- [ ] Carregamento, vazio e erro são claros. Consulta e tabela funcionam em tela estreita e por teclado, sem depender apenas de cor/gráfico.

Dependências: V7 (#44) e V9 (#46) para contrato/dados. Integração com J7 e seleção de J9 (#47).
Prioridade: P0.
Responsável: João.

Critérios de referência: PUB-01, PUB-05, PUB-06, FILT-02, FILT-03, FILT-04, UX-01, UX-02.

Observação: as quantidades públicas dependem de publicação/arquivo/bloqueio. Os 61 indicadores e 303 dados são o pacote preparado, não obrigação de publicar todos.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### J9 · Implementar filtros gerais por Setor e Ano/Período e recortes no detalhe

[Issue #47](https://github.com/DaviRosimES/C317/issues/47) · Responsável: João.

#### Entregas:
- Implementar Setor e Ano/Período como os únicos filtros gerais, antes da lista. Consumir os seis grupos do catálogo, sem seletor de cidade ou indicador previamente selecionado.
- Oferecer Todos os setores/Todos os períodos como padrões, Aplicar/Limpar e consulta compartilhável pela URL.
- Setores disponíveis consideram dados elegíveis em algum período; referências dependem do setor selecionado. Trocar setor limpa período incompatível para Todos e informa a mudança.
- No detalhe, fonte/classificação/categoria restringem somente o indicador aberto, dentro da seleção global. Permitir trocar fonte e limpar recortes incompatíveis.
- Fechar detalhe de indicador que sai da lista e tratar carregamento, vazio, falha e parâmetros inválidos sem dados fictícios.

#### Critérios de conclusão:
- [ ] Setor consulta a definição e Ano/Período compara a referência completa dos dados. Anual 2024 difere dos acumulados 2000–2024/2020–2024 e do levantamento 2022 e 2023.
- [ ] Com dados públicos elegíveis, Economia criativa + 2025 lista os quatro indicadores de percepção e Turismo + 2024 os 14 compatíveis. API retorna vazio para combinação conhecida sem dados; troca de setor na tela limpa período incompatível.
- [ ] Seleção global atualiza lista e dados sem duplicar multissetoriais. Nenhum parâmetro permite outra cidade.
- [ ] Hotel = 3 e Resort = 0 afetam apenas Meios de hospedagem; Moradores = 44,5% afeta apenas Acolhedora. UHs e os demais indicadores da lista não recebem esses filtros locais.
- [ ] Não oferecer Comércio + MEI como interseção de marginais ou UHs por Hotel sem origem correspondente. Anual 2024 de depósitos de PI retorna 5, com fonte identificada.
- [ ] Aplicar atualiza resultados/URL; Limpar restaura os dois padrões; recarregar preserva filtros válidos e limpa desconhecidos/incompatíveis com indicação clara.
- [ ] Controles são rotulados e utilizáveis por teclado e em tela estreita, com estados de carregamento, vazio e falha claros.

Dependências: V7 (#44) e V9 (#46) para contrato, opções e consulta. Integração com J7 e J8.
Prioridade: P0.
Responsável: João.

Critérios de referência: PUB-01, PUB-02, PUB-03, PUB-04, PUB-07, FILT-01, FILT-02, FILT-03, FILT-04, UX-01, UX-02.

Observação: Setor econômico (Sebrae), Porte e Público da pesquisa são recortes locais, não novos filtros gerais. João escolhe a composição visual, preservando a ordem funcional.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### D7 · Implementar administração de definições e Dados do indicador

[Issue #50](https://github.com/DaviRosimES/C317/issues/50) · Responsável: Davi.

#### Entregas:
- Unificar Lançamentos/Observações em Dados do indicador e disponibilizar listagem, cadastro, consulta, edição e arquivo/restauração das definições.
- Formulário da definição inclui nome, significado, uma unidade, um ou mais setores, referências e classificações permitidas, aceitação sem categoria e nota metodológica.
- Implementar listagem/formulário completo dos dados: indicador, referência real, valor decimal/qualificador, fonte, categoria e notas. Unidade e setores são herdados; Santa Rita é fixa.
- Integrar cadastros auxiliares, publicação/despublicação, correção, arquivo/restauração, com resumo e confirmação conforme o fluxo.
- Retirar descrição interna com M6 e exibir validações/conflitos, carregamento, sucesso e falhas sem perder preenchimento relevante.

#### Critérios de conclusão:
- [ ] Administrador cria, consulta e edita definições/dados pela interface, sem editar arquivo/código. Setores do catálogo são obrigatórios na definição, sem campo Setor repetido no dado.
- [ ] Referência mantém tipo/intervalo reais; unidade é herdada e decimal preservado. Categoria pertence à classificação permitida; conflito não sobrescreve outro dado nem perde o formulário/ID.
- [ ] Novo dado fica em rascunho; publicar/despublicar funciona. Definição aparece pelos dados publicados, sem publicação independente.
- [ ] Edição confirmada de publicado atualiza o público imediatamente; rascunho continua privado. Não criar versão paralela ou registro de quem alterou.
- [ ] Arquivo/restauração conserva status e bloqueio. Arquivar indicador oculta filhos sem mudar estados; restaurar o pai não publica rascunho nem restaura filho arquivado individualmente.
- [ ] Textos usam Dados do indicador e Notas. Sucesso depende do servidor; telas funcionam por teclado e em tela estreita, com estados e mensagens claros.

Dependências: V7 (#44) e V9 (#46). Preparar formulários após o contrato; aceite exige operações reais.
Prioridade: P0.
Responsável: Davi.

Critérios de referência: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, FILT-01, FILT-03, FILT-04, TXT-01, UX-01, UX-02.

Observação: Davi decide a composição visual. Reutilizar componentes existentes; não criar construtor genérico de formulários, histórico de versões ou exclusão física como alternativa ao arquivamento.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### D8 · Criar administração de relatórios por envio de PDF

[Issue #51](https://github.com/DaviRosimES/C317/issues/51) · Responsável: Davi.

#### Entregas:
- Criar listagem/formulário para cadastrar, consultar e editar relatório com título, fonte e envio de PDF; opcionais somente quando conhecidos.
- Implementar upload/substituição com limite visível, validações e mensagens que preservem o PDF vigente em caso de falha.
- Integrar publicação/despublicação, arquivo/restauração e consulta do resultado público. Novos cadastros não oferecem URL.
- Usar os estados/respostas do backend e permitir operação em tela estreita e por teclado.

#### Critérios de conclusão:
- [ ] Administrador cadastra título/fonte/PDF sem editar arquivo do repositório ou informar URL. Metadados desconhecidos permanecem vazios.
- [ ] PDF inválido, limite excedido ou falha de upload informa o motivo e conserva o conteúdo anterior. Troca confirmada mantém o estado de publicação.
- [ ] Novo relatório é rascunho; publicar/despublicar funciona. Edição confirmada de publicado entra em vigor imediatamente e rascunho editado continua privado.
- [ ] Arquivo/restauração preserva status anterior. Arquivados/despublicados saem da consulta e não mantêm acesso público direto pelos endpoints da plataforma. Links legados reais são preservados.
- [ ] Sucesso só ocorre após confirmação da API. Listagem e formulário distinguem carregamento, vazio e erro; ações funcionam em tela estreita e por teclado.

Dependências: V8 (#45). Preservar a consulta pública e os documentos legados reais.
Prioridade: P1.
Responsável: Davi.

Critérios de referência: REL-01, REL-02, REL-03, ADM-06, ADM-07, ADM-08, TXT-01, UX-01, UX-02.

Observação: um conteúdo vigente por relatório, sem versões paralelas. Publicar Dados do indicador não gera PDF automaticamente.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.

### D9 · Revisar Sobre, fontes e orientações institucionais

[Issue #52](https://github.com/DaviRosimES/C317/issues/52) · Responsável: Davi.

#### Entregas:
- Aplicar em Sobre o conteúdo institucional aprovado: finalidade, origem no Observatório do Turismo, seis setores, leitura dos indicadores, fontes e instituições participantes.
- Explicar Setor/Ano-Período e os recortes no detalhe com vocabulário coerente com a administração.
- Preservar Contribua e orientações pertinentes. Cadastur/FNRH ficam secundários, sem afirmar integração automática.
- Exibir somente fontes de dados municipais públicos elegíveis e retirar promessas de comparação regional, dados pendentes e Inventário pronto.

#### Critérios de conclusão:
- [ ] Sobre explica o Observatório e a leitura dos dados; não se limita a Cadastur/FNRH. Os seis setores usam os nomes aprovados.
- [ ] Fontes públicas correspondem a dados elegíveis de Santa Rita. Fontes apenas de dados retirados, rascunhos ou arquivados não são anunciadas como disponíveis.
- [ ] Não prometer leitos, ocupação ou Lattes municipal excluídos, comparações entre cidades, coleta nativa ou integração automática com formulários/sistemas externos.
- [ ] Linguagem usa Indicadores, Dados do indicador e Notas, sem textos de milestone. Links, estados da lista de fontes, teclado e tela estreita funcionam.

Dependências: textos aprovados disponíveis; pode começar em paralelo. Fontes dinâmicas dependem de V9 (#46).
Prioridade: P1.
Responsável: Davi.

Critérios de referência: INS-01, PUB-01, TXT-01, UX-01, UX-02.

Observação: conteúdo e mensagens-base estão em 03-fluxos-de-uso.md. João mantém a navegação compartilhada na J7 (#49), evitando conflito de edição.

#### Referências:
- `01-estrutura-e-dicionario.md`: modelo, campos, unidades, setores e dicionário.
- `02-dados-e-integracao.md`: conteúdo preparado, origens, exclusões e migração.
- `03-fluxos-de-uso.md`: comportamentos e critérios funcionais.
- `CONTEXTO-PARA-IAS.md`: contexto de implementação e limites de atuação.

Gustavo encaminhará esses documentos pelo Teams; a referência prevista no repositório é `docs/m7/`. Conferir os arquivos e o pacote necessário no checkout antes de integrar. Documentos não substituem JSON/JSONL nem autorizam inventar dados ou endpoints ausentes.

Etapa: Milestone 7 — Testes, correções de implementação. A suíte de testes será planejada separadamente; executar as verificações apropriadas à mudança e as exigidas pelo repositório.
