# Contrato HTTP — Dados do indicador e consulta por Setor e Ano/Período (V9)

Implementação da [V9 (#46)](https://github.com/DaviRosimES/C317/issues/46) conforme a [estrutura e dicionário](01-estrutura-e-dicionario.md), os [dados e integração](02-dados-e-integracao.md) e os [fluxos de uso](03-fluxos-de-uso.md). Consumidores: J8/J9 (consulta pública), D7 (Dados do indicador na administração) e D9 (fontes na página Sobre). As definições e os catálogos estão no [contrato da V7](contrato-api-definicoes.md).

## Regra de elegibilidade

Um dado é público somente se for **publicado + não arquivado + não bloqueado + de indicador não arquivado + de Santa Rita do Sapucaí**. A regra é a mesma em todas as rotas de `/consulta`: opções, lista, detalhe, acesso por id e fontes. Um indicador só aparece quando tem ao menos um dado elegível na seleção.

## Consulta pública: `/api/v1/consulta`

Sem autenticação.

| Rota | Uso |
| --- | --- |
| `GET /opcoes?setor=` | Setores com dados elegíveis (em qualquer período) e os períodos disponíveis no setor informado (ou em todos) |
| `GET /indicadores?setor=&periodo=` | Indicadores com dados elegíveis na seleção, cada um uma vez, só com os dados que passaram no filtro |
| `GET /indicadores/{codigo}?setor=&periodo=` | Um indicador com os mesmos filtros; 404 se ele não tem dado elegível na seleção |
| `GET /dados/{id}` | Um dado elegível; 404 em qualquer outro caso |
| `GET /fontes` | Fontes dos dados elegíveis, com a quantidade de indicadores |

- `setor`: código do Setor do Observatório (opaco; não exiba o prefixo `tema_`). Se for omitido, vale para todos os setores. Um código inexistente responde 422 com `{"detail": "Setor desconhecido."}`.
- `periodo`: a `chave` de uma opção de Ano/Período. Se for omitido, vale para todos os períodos. Um formato inválido responde 422 com `{"detail": "Período desconhecido."}`.
- Uma combinação válida sem dados devolve `indicadores: []`. Ela **nunca** é trocada por todos os dados. A interface mostra "Não há dados publicados para esta seleção. Revise os filtros."

### Ano/Período

Cada opção é uma referência completa. `2024 — anual` não inclui acumulados que terminam em 2024, e um levantamento de 2022 e 2023 não vira dois anos.

| Tipo | `chave` | `rotulo` |
| --- | --- | --- |
| anual | `anual-2024` | `2024 — anual` |
| mensal | `mensal-2024-03` | `março de 2024 — mensal` |
| acumulada | `acumulada-2000-2024` | `2000–2024 — acumulado` |
| levantamento | `levantamento-2022-2023` | `2022 e 2023 — levantamento` |
| retrato | `retrato-2026-2026-10-04` | `2026 — retrato de 04/10/2026` |

`GET /opcoes` devolve os períodos do mais recente para o mais antigo:

```json
{
  "setores": [{"codigo": "tema_economia_criativa_ca3ef6a61b", "nome": "Economia criativa"}],
  "periodos": [
    {"chave": "anual-2025", "rotulo": "2025 — anual", "tipo": "anual", "ano_inicio": 2025, "ano_fim": 2025, "mes": null, "data_extracao": null}
  ]
}
```

Os setores não dependem do período nem do setor escolhido. Se a troca de Setor tornar o período inválido, a interface limpa o período e avisa (fluxos, seção 2).

### `GET /indicadores`

```json
{
  "setor": {"codigo": "tema_economia_criativa_ca3ef6a61b", "nome": "Economia criativa"},
  "periodo": {"chave": "anual-2025", "rotulo": "2025 — anual", "tipo": "anual", "ano_inicio": 2025, "ano_fim": 2025, "mes": null, "data_extracao": null},
  "indicadores": [
    {
      "codigo": "i_cidade_vista_como_acolhedora_fc339b5db8",
      "nome": "Cidade vista como: Acolhedora",
      "definicao": "Percentual dos entrevistados que associaram a cidade ao atributo Acolhedora, …",
      "nota_metodologica": "Valores consolidados recebidos. …",
      "unidade": {"codigo": "u_dos_entrevistados_d2d9128f71", "nome": "% dos entrevistados", "inteira": false, "maximo": 100, "casas_exibicao": 2},
      "setores": [{"codigo": "tema_economia_criativa_ca3ef6a61b", "nome": "Economia criativa"}],
      "classificacoes": [{"codigo": "publico_pesquisa", "nome": "Público da pesquisa"}],
      "dados": [
        {
          "id": "4152c38ca7d8e01a414d268629189bebb381815c979fdb82c1b31a0ddb25735b",
          "categoria": {"codigo": "c_publico_pesquisa_moradores_ad535c7f5e", "nome": "Moradores", "classificacao_codigo": "publico_pesquisa", "classificacao_nome": "Público da pesquisa", "codigo_cnae": null},
          "fonte": {"codigo": "f_relatorio_ot_no_004_2025_…", "nome": "Relatório OT nº 004/2025 – …", "links": ["https://…"]},
          "referencia": {"tipo": "anual", "ano_inicio": 2025, "ano_fim": 2025, "mes": null, "data_extracao": null, "chave": "anual-2025", "rotulo": "2025 — anual"},
          "valor": "44.5",
          "qualificador": "igual",
          "notas": [],
          "origens": [{"arquivo": "_Indicadores_OT_SRS_.xlsx", "aba": "…", "celula": "…"}],
          "demonstracao": false
        }
      ]
    }
  ]
}
```

- `valor` é um decimal exato em texto. Exiba-o com a unidade e as `casas_exibicao` da unidade. Converta para número só para desenhar o gráfico.
- `qualificador: "maior_que"` significa "mais de".
- `categoria: null` é o total sem recorte. Fonte, classificação e categoria são **recortes locais** do indicador aberto. Não some total com recortes, nem recortes de classificações diferentes, nem fontes diferentes.
- Os indicadores vêm ordenados por nome. Os dados vêm do período mais recente para o mais antigo e, dentro dele, pela classificação e pela categoria (o total primeiro).
- `GET /dados/{id}` devolve o mesmo dado com `indicador` (`codigo`, `nome`) e `unidade`.

## Administração: `/api/v1/admin/dados-indicadores`

Exige um token de `admin` (401 sem token, 403 para quem está fora da equipe).

| Rota | Uso |
| --- | --- |
| `GET ?indicador=&situacao=ativos\|arquivados\|todos&status=rascunho\|publicado` | Lista (padrão: ativos), inclusive de indicadores arquivados |
| `GET /{id}` | Detalhe |
| `POST` | Cadastra um rascunho (201) |
| `PATCH /{id}` | Correção parcial; preserva o id |
| `POST /{id}/publicar` · `/despublicar` | Status |
| `POST /{id}/arquivar` · `/restaurar` | Arquivamento; preserva status e bloqueio |
| `POST /{id}/bloquear` `{"motivo": "..."}` · `/desbloquear` | Bloqueio de divulgação, sempre explícito e com motivo |

`DadoAdminResponse` traz os mesmos campos do dado público, mais estes:
- `indicador` (`codigo`, `nome`, `arquivado`), `unidade` e `territorio`;
- `status`, `arquivado`, `divulgacao_bloqueada` e `motivo_bloqueio`;
- `visivel_publicamente`, calculado pela regra de elegibilidade.

### Cadastro (`POST`)

```json
{
  "indicador_codigo": "i_cidade_vista_como_acolhedora_fc339b5db8",
  "categoria_codigo": "c_publico_pesquisa_moradores_ad535c7f5e",
  "referencia": {"tipo": "anual", "ano_inicio": 2026},
  "valor": "44,5",
  "qualificador": "igual",
  "fonte_codigo": "f_relatorio_ot_no_004_2025_…",
  "notas": []
}
```

| Campo | Regra |
| --- | --- |
| `indicador_codigo` | Indicador existente e **ativo** (arquivado → 409) |
| `referencia` | Obrigatória e de um tipo aceito pelo indicador. `ano_fim` só é necessário em acumulada e levantamento; `mes` só na mensal; `data_extracao` só no retrato |
| `categoria_codigo` | Opcional se o indicador aceita dado sem categoria; quando informada, precisa ser de uma classificação aceita |
| `valor` | **Texto** decimal não negativo, com vírgula ou ponto e sem separador de milhar. `"0"` é válido. Respeita os limites de inteiro e de máximo da unidade |
| `qualificador` | `igual` (padrão) ou `maior_que` |
| `fonte_codigo` | Fonte existente |
| `notas` | Lista de ressalvas; opcional |

O território (Santa Rita do Sapucaí), a unidade e os setores vêm da definição e não são enviados. O id (64 caracteres hexadecimais) é gerado pelo sistema e nunca muda. `origens` fica vazio no cadastro manual, porque não se inventa planilha nem célula.

### Correção (`PATCH`)

Envie só os campos alterados entre `valor`, `qualificador`, `fonte_codigo`, `categoria_codigo`, `referencia` e `notas`.
- `categoria_codigo: null` remove a categoria. Os demais campos não aceitam `null`.
- O indicador não muda: outra medida é outro dado.
- Corrigir um publicado vale na consulta imediatamente. A interface confirma antes de enviar: "Este conteúdo já está publicado. Ao confirmar, a alteração ficará disponível na consulta pública."

### Erros

| Status | Quando |
| --- | --- |
| 404 | `{"detail": "Dado não encontrado."}` |
| 409 | A combinação indicador + categoria + referência + fonte já existe: `"Já existe um dado para este indicador, categoria, referência e fonte. Consulte o dado existente para fazer a correção. (dado <id>)"` |
| 409 | Dado arquivado ("Restaure-o antes de …"), indicador arquivado, ou tentativa de publicar um dado bloqueado |
| 422 | `detail` em texto: referência incompleta, categoria ou classificação não aceita, limite da unidade, fonte, categoria ou indicador desconhecidos |
| 422 | `detail` em lista (padrão FastAPI): formato do corpo, campo desconhecido, `valor` enviado como número |

### Estados

| Ação | Efeito |
| --- | --- |
| Cadastrar | Rascunho, ativo, não bloqueado |
| Publicar | Exige dado e indicador ativos e não bloqueados |
| Despublicar | Volta a rascunho sem apagar nada |
| Arquivar / restaurar | Preserva status e bloqueio. Arquivado precisa ser restaurado antes de editar, publicar, despublicar ou bloquear |
| Arquivar o indicador (V7) | Oculta todos os seus dados sem alterar o estado de nenhum. Restaurar o indicador não restaura um dado arquivado separadamente |

Não há exclusão física nem histórico de versões.

## Carga do pacote e migração

Veja [o README do back](../../backend/README.md#dados-do-indicador-e-consulta-v9). O carregador `scripts.carregar_m7` faz o seguinte:
- simula por padrão e grava só com `--aplicar`;
- preserva o estado da M6 pelo id;
- não importa os 925 dados não municipais e arquiva os que já existem em `observacoes_m6`;
- arquiva os oito tipos de demonstração do legado.

A consulta antiga `/observacoes` (M6) continua disponível, sem os dados arquivados, até a migração das telas.
