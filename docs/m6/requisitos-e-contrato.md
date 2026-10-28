# Implementação 3 requisitos e contrato dos dados

Referência da G4 [#29](https://github.com/DaviRosimES/C317/issues/29), consolidada em 21/10/2026. As decisões confirmadas nesta referência substituem, para a M6, os pressupostos de demonstração da entrega anterior.

## Escopo confirmado

A entrega de 30/10/2026 tem como meta de planejamento 80% do projeto. Deve reunir consulta, filtros, administração e publicação confiáveis, relatórios disponíveis, uso dos dados elegíveis dos seis temas e canais externos já prontos. A formalização usa o modelo DOCX anterior e vídeo das contribuições. O percentual não é uma contagem de linhas importadas ou issues fechadas.

M7 concentra os testes finais e a integração/homologação; M8, a manutenção e a estabilização para a apresentação. Testes necessários à correção de cada implementação continuam na M6. Falhas essenciais conhecidas não são adiadas apenas para caber nessa divisão.

- O Observatório fornece valores prontos, inclusive resultados já calculados na planilha. O sistema não passa a calcular ocupação, PIB ou patentes a partir de microdados.
- As categorias recebidas são a classificação principal. CNAE é um suporte secundário, sem criar correspondências não fornecidas entre os setores Sebrae e códigos oficiais.
- Entram somente observações completas, confirmadas no material recebido e permitidas para divulgação. A conferência de metadados não equivale a uma auditoria independente de todas as fontes institucionais.
- Uma pendência exclui a observação afetada e os resultados que dela dependem; outros períodos e recortes completos podem ser aproveitados.
- Não entram inventário persistido completo, coleta nativa, integração FNRH/Cadastur, importação automática dos Forms nem conectores para todo o catálogo de fontes.
- Os dois Forms de hospedagem podem ser vinculados após conferir seu acesso. Formulários ainda a criar e relatórios em elaboração ficam fora da interface.

## Origem e cobertura

A versão recebida é `_Indicadores_OT_SRS_.xlsx`, SHA-256 `e956c9350dbd4ca699b8803215413c23270daa5e4bfa5f7c4f594b969e9a3d8a`. O arquivo original é preservado fora do pacote público. O preparador recusa outra versão até que o perfil seja revisado.

| Origem | Linhas elegíveis | Linhas excluídas |
| --- | ---: | ---: |
| Dados gerais | 40 | 25 |
| Vale da Eletrônica | 7 | 8 |
| Pesquisa e inovação | 187 | 63 |
| Turismo | 73 | 14 |
| Economia criativa | 16 | 3 |
| Eventos | 17 | 6 |
| Total das seis abas | 340 | 119 |
| Patentes por ano | 900 | 0 |

Há 1.240 posições elegíveis na origem e **1.228 observações únicas** após unificar 12 repetições. São 36 séries anuais de patentes de 2000 a 2024. Os 36 totais informados conferem com as somas anuais; essa soma é uma conferência, não a substituição do valor recebido por uma nova estatística.

O dicionário técnico está em [catalogos.json](../../backend/dados/m6/catalogos.json). O inventário completo, incluindo cada localização excluída e seu motivo, está em [triagem.csv](../../backend/dados/m6/triagem.csv). O controle não divulga os valores excluídos. `manifesto.json` registra as contagens e hashes dos arquivos.

### Exclusões relevantes

| Localização | Motivo e efeito |
| --- | --- |
| Dados gerais!D15 e demais períodos a confirmar | A referência temporal não está definida; não atribuir 2025 ou 2026 por aproximação. |
| Turismo!D12 | A nota dos 443 leitos pede confirmação de uma resposta. O total fica fora; não recalcular um total alternativo removendo essa resposta. |
| Turismo!D38 | A média de ocupação tem quatro respondentes e divulgação explicitamente restrita. |
| Pesquisa e inovação!D74:D95 e D210:D250 | Os recortes Lattes de SRS reutilizam filtros de cidade/formação/atuação ainda a confirmar. A exclusão abrange o bloco, não só a linha com a nota. |
| Turismo!D77:D86 | O bloco Cadastur contém situação cadastral cujo significado precisa ser confirmado. Não o apresentar como cadastro ativo validado. |
| Eventos!D2, D10:D11 | Escala da nota a confirmar e composição do público a alinhar, respectivamente. |
| Valores da página Rota da Inovação | A própria origem pede confirmação da fonte primária. Não usar esses números para substituir informações confirmadas de outra edição. |
| Vale da Eletrônica!D7 | A fórmula depende de empregos com referência indefinida; o cache numérico não torna o resultado elegível. |

A coluna “Alunos: dá para automatizar?” é uma avaliação técnica futura. Seu texto “A avaliar” não torna todo dado pendente. Em Dados gerais!D3, a observação a confirmar se refere à estimativa de outra fonte citada como comparação; o Censo IBGE 2022 permanece elegível, com essa comparação removida da nota pública.

## Regras do dicionário

1. **Hospedagem:** dez meios de hospedagem cadastrados não significam dez hotéis. A categoria Hotel tem três. As 251 UHs representam oito respostas; não devem ser apresentadas como censo integral da capacidade municipal.
2. **Empresas:** 5.818 no Mapa Sebrae e 5.879 no painel Ambiente de Negócios têm fontes/edições próprias. Não se sobrescrevem nem são somadas.
3. **Patentes:** depósito e concessão, PI/MU/CA, valor anual e acumulado são observações diferentes. Os cinco depósitos de PI em 2024 não são os 72 do acumulado 2000–2024.
4. **Cadastro:** 116 empreendimentos ativos locais pertencem ao levantamento de 2022 e 2023. Os 121 cadastrados incluem outros municípios e situações; os totais gerais usam a abrangência da base cadastral.
5. **Lattes:** a extração em 04/10/2026 é um retrato da base, não uma série de produção científica anual. Formação e atuação continuam distintas. Os recortes elegíveis de outros municípios não confirmam os filtros pendentes de SRS.
6. **Meses citados:** Janeiro no questionário de fluxo é categoria de uma resposta anual de 2024. Não criar um lançamento mensal para janeiro por causa desse rótulo.
7. **Respostas múltiplas:** procedência, faixa etária e meses citados podem admitir mais de uma opção. As categorias não são automaticamente exclusivas e seus totais não devem ser somados como pessoas distintas.
8. **Zero e ausência:** três hotéis e zero resorts são valores válidos. O mínimo de cinco respondentes é uma regra de divulgação da pesquisa afetada, não um bloqueio para todo número menor que cinco.
9. **Precisão:** guardar o decimal do XML como texto no intercâmbio, sem passar por `float` nem cortar em quatro casas. PostgreSQL usa NUMERIC sem escala fixa no contrato proposto; a apresentação pode arredondar sem modificar o original.
10. **Estoque e cobertura:** não somar empregos, empresas, UHs ou leitos entre períodos. Uma amostra com cobertura conhecida pode ter uma observação completa; isso não a transforma em total de toda a cidade.

## Contrato de intercâmbio c317.m6.v1

`observacoes.jsonl` contém um objeto JSON por linha, com os campos abaixo. Catálogos são objetos indexados pelos códigos correspondentes; não são listas fixas no frontend.

| Campo | Significado |
| --- | --- |
| `id` | SHA-256 da identidade da observação, sem incluir seu valor. Uma correção não cria outra identidade para ocultar um conflito. |
| `indicador_codigo` | O que se mede; resolve nome e código em `catalogos.indicadores`. |
| `categoria_codigo` | Recorte da fonte, ou nulo para total. Categoria referencia sua classificação própria: setor Sebrae, segmento, porte, hospedagem, categoria SMCELT ou recorte informado. |
| `territorio_codigo` | Município, região ou abrangência da base cadastral. Os códigos são internos; não simulam códigos IBGE. |
| `referencia` | Tipo, anos de início/fim, mês quando realmente mensal e data de extração quando for retrato. |
| `valor` | Decimal exato em texto, inclusive `"0"`. |
| `unidade_codigo` | Unidade e escala, quando explicitada. Índice de 0 a 1 é distinto de percentual de 0 a 100. |
| `qualificador` | `igual` ou `maior_que`, preservando limites informados. |
| `fonte_codigo` | Identificação da fonte e links recebidos quando existentes. Nome de documento também identifica fonte; URL não é inventada. |
| `temas` | Um ou mais dos seis temas onde a mesma observação pode aparecer. |
| `notas` | Ressalvas necessárias à leitura, como cobertura e respostas múltiplas. |
| `proveniencias` | Aba, célula, referência e recorte originais, decimal XML, fonte e fórmula já fornecida. |
| `codigo_cnae` | Nulo nesta carga: nenhum código foi fornecido. Não significa pendência impeditiva para uma categoria confirmada. |

Tipos de referência: `anual`, `mensal`, `acumulada`, `levantamento` (como 2022 e 2023) e `retrato` (extração datada). Nenhum tipo representa “ano desconhecido” nesta carga.

A identidade combina indicador, categoria, território, referência, unidade e fonte. Repetições confirmadas entre abas compartilham identidade e acumulam proveniências/temas. Referências diretas e a correspondência explícita do Censo 2022 estão registradas no perfil da origem; valores iguais, isoladamente, não provam duplicidade.

## Integração com Vitor João e Davi

G4 entrega um contrato de intercâmbio e uma proposta mínima de persistência em [contrato-importacao.sql](contrato-importacao.sql). Esse SQL não é uma migração aplicada nem substitui a responsabilidade da V5. O carregador PostgreSQL exige as tabelas `catalogos_m6`, `observacoes_m6` e `cargas_m6` desse contrato e recusa o esquema anterior sem gravar. Caso Vitor escolha outra organização física, o adaptador do carregador precisa ser ajustado e testado antes da carga real.

- **Vitor / V5 e V6:** incorporar ou adaptar o contrato em migração incremental, integrar a consulta/administração às observações e garantir apenas publicados na consulta pública. Uma importação nova entra como rascunho; publicação exige o fluxo administrativo.
- **João / J5 e J6:** consumir os catálogos da API, usar categorias recebidas, preservar referência/unidade/fonte/notas e não repetir observações compartilhadas ao somar temas. Catálogos JSON servem como exemplos do contrato, não como substituição fixa da API.
- **Davi / D4 a D6:** adaptar os campos do formulário, verificar documentos e links prontos, omitir conteúdo pendente e publicar somente registros completos aprovados.
- **Gustavo / G5 e G6:** entregar o pacote e o carregador, conferir a compatibilidade após V5 e concluir a validação integrada quando as implementações anteriores estiverem disponíveis.

A main `0748845`, consultada em 21/10/2026, ainda não contém V4–V6/J4–J6/D4–D6. Portanto, a carga real, a homologação pelo frontend e a conclusão integral da G6 continuam dependentes dessas entregas. O ensaio SQLite comprova o comportamento do carregador em ambiente isolado; não comprova integração PostgreSQL/API/frontend.
