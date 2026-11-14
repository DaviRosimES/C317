# Contrato HTTP — definições de indicadores e catálogos (V7)

Implementação da [V7 (#44)](https://github.com/DaviRosimES/C317/issues/44) conforme a [estrutura e dicionário](01-estrutura-e-dicionario.md) e os [fluxos de uso](03-fluxos-de-uso.md). Consumidores: D7 (formulário administrativo) e, na V9, os Dados do indicador.

Todas as rotas abaixo são administrativas: exigem `Authorization: Bearer <token>` de um usuário `admin` (401 sem token válido, 403 fora da equipe). A consulta pública por Setor e Ano/Período é da V9.

## Erros

| Status | Quando | Corpo |
| --- | --- | --- |
| 404 | Código inexistente | `{"detail": "Indicador não encontrado."}` |
| 409 | Nome duplicado; edição de indicador arquivado; alteração que invalidaria dados existentes; mudança de significado de categoria em uso | `{"detail": "mensagem"}` |
| 422 | Código de catálogo desconhecido ou incompatibilidade da definição | `{"detail": "mensagem"}` |
| 422 | Formato do corpo (campo ausente, vazio, extra) | Padrão do FastAPI: `detail` é uma lista |

Campos desconhecidos no corpo são recusados (422), inclusive `codigo`: o código é gerado pelo sistema.

## Definições: `/api/v1/admin/definicoes-indicadores`

| Rota | Uso |
| --- | --- |
| `GET ?situacao=ativos\|arquivados\|todos&setor=&busca=` | Lista (padrão: ativos), ordenada por nome. `setor` é o código do Setor do Observatório; `busca` filtra pelo nome |
| `GET /{codigo}` | Detalhe |
| `POST` | Cadastra uma definição ativa (201) |
| `PATCH /{codigo}` | Correção parcial |
| `POST /{codigo}/arquivar` | Arquiva |
| `POST /{codigo}/restaurar` | Restaura |

### Resposta (`DefinicaoResponse`)

```json
{
  "codigo": "i_cidade_vista_como_acolhedora_fc339b5db8",
  "nome": "Cidade vista como: Acolhedora",
  "definicao": "Percentual dos entrevistados que associaram a cidade ao atributo Acolhedora, por público da pesquisa recebida.",
  "nota_metodologica": "Valores consolidados recebidos. …",
  "unidade": {"codigo": "u_dos_entrevistados_d2d9128f71", "nome": "% dos entrevistados", "inteira": false, "maximo": 100, "casas_exibicao": 2},
  "setores": [{"codigo": "tema_economia_criativa_ca3ef6a61b", "nome": "Economia criativa"}],
  "tipos_referencia_permitidos": ["anual"],
  "classificacoes_permitidas": [{"codigo": "publico_pesquisa", "nome": "Público da pesquisa"}],
  "aceita_sem_categoria": false,
  "arquivado": false,
  "total_dados": 3
}
```

`total_dados` conta os dados vinculados em qualquer estado (rascunho, publicado, arquivado). Os códigos de setor são opacos: o prefixo histórico `tema_` não deve aparecer na interface.

### Cadastro (`POST`)

```json
{
  "nome": "Visitantes atendidos no centro de informações",
  "definicao": "Quantidade de visitantes atendidos, conforme o registro recebido.",
  "unidade_codigo": "u_pessoas_4ee4c52930",
  "setores": ["tema_turismo_f09ebc929b"],
  "tipos_referencia_permitidos": ["anual", "mensal"],
  "classificacoes_permitidas": [],
  "aceita_sem_categoria": true,
  "nota_metodologica": null
}
```

| Campo | Regra |
| --- | --- |
| `nome`, `definicao` | Obrigatórios, não vazios. Nome único (sem diferenciar maiúsculas), entre ativos e arquivados → senão 409 |
| `unidade_codigo` | Obrigatória; uma unidade por definição |
| `setores` | Lista não vazia de Setores do Observatório |
| `tipos_referencia_permitidos` | Lista não vazia de `anual`, `mensal`, `acumulada`, `levantamento`, `retrato` |
| `classificacoes_permitidas` | Pode ser vazia; se `aceita_sem_categoria` for `false`, precisa de ao menos uma (422) |
| `aceita_sem_categoria` | Obrigatório |
| `nota_metodologica` | Opcional |

O código gerado segue o formato do pacote (`i_<nome>_<hash>`) e nunca muda depois.

### Correção (`PATCH`)

Envie só os campos alterados. `nota_metodologica: null` remove a nota; os demais campos não aceitam `null`.

- **Renomear preserva o código.** Nome, definição e nota são correções descritivas.
- Um indicador **arquivado** precisa ser restaurado antes da edição (409).
- **Alterações que invalidariam dados existentes, inclusive arquivados, são recusadas com 409** e a lista dos vínculos:
  - trocar a unidade quando há dados (outra unidade é outra medida e exige outra definição);
  - retirar um tipo de referência usado por algum dado;
  - retirar uma classificação usada pela categoria de algum dado;
  - passar `aceita_sem_categoria` para `false` com dados sem categoria.

  Exemplo: `{"detail": "A alteração invalidaria dados existentes, inclusive arquivados: 2 dados com referência acumulada."}`

  Ampliar compatibilidades (acrescentar setor, tipo de referência ou classificação) é sempre permitido. Setores não afetam os dados.

### Arquivar e restaurar

Arquivar oculta o indicador da seleção ativa e, na consulta pública da V9, todos os seus dados, **sem alterar o estado individual de cada dado**. Restaurar volta à situação anterior: dados em rascunho ou arquivados separadamente continuam como estavam. Não há exclusão nem publicação independente da definição: ela aparece publicamente pelos dados publicados.

## Catálogos: `/api/v1/admin/catalogos`

`GET /admin/catalogos` devolve:

```json
{
  "setores": [{"codigo": "tema_turismo_f09ebc929b", "nome": "Turismo", "em_uso": true}],
  "unidades": [{"codigo": "u__bbf3f11cb5", "nome": "%", "inteira": false, "maximo": 100, "casas_exibicao": 2, "em_uso": true}],
  "fontes": [{"codigo": "f_…", "nome": "…", "links": ["https://…"], "em_uso": true}],
  "classificacoes": [{"codigo": "publico_pesquisa", "nome": "Público da pesquisa", "em_uso": true}],
  "categorias": [{"codigo": "c_…", "nome": "Moradores", "classificacao_codigo": "publico_pesquisa", "codigo_cnae": null, "em_uso": true}]
}
```

`em_uso` indica se o item está associado a definições ou dados. Itens nunca são excluídos pela API.

| Catálogo | Pela API |
| --- | --- |
| Setores, unidades | Somente leitura. Um setor novo entra por cadastro no banco e aparece sem mudar o frontend |
| Fontes | `POST /fontes {nome, links}`, `PATCH /fontes/{codigo}` (nome e links). Links `http(s)://` guardados como recebidos |
| Classificações | `POST /classificacoes {nome}`, `PATCH /classificacoes/{codigo} {nome}` |
| Categorias | `POST /categorias {nome, classificacao_codigo, codigo_cnae?}`, `PATCH /categorias/{codigo}` |

- Nomes repetidos (sem diferenciar maiúsculas) respondem 409; para categorias, a repetição é dentro da mesma classificação.
- **Categoria em uso por dados:** o nome pode ser corrigido; a classificação e o `codigo_cnae` não (409), porque mudariam o significado dos dados. Cadastre outra categoria para o novo recorte.
- `codigo_cnae` é opcional e só deve ser informado quando a fonte o fornece. Setor do Observatório, Setor econômico (Sebrae) e CNAE são coisas distintas.

## Persistência e transição

A migração `b7e2d9c4a610` cria `setores_observatorio`, `unidades`, `fontes`, `classificacoes`, `categorias`, `indicadores_definicoes`, `indicador_setores` e `indicador_classificacoes`. Ela copia os temas e as unidades já existentes em `catalogos_m6`, preservando os códigos. As demais definições e catálogos do pacote entram pela carga da V9.

Até a V9, os dados continuam em `observacoes_m6` e a consulta da M6 (`/observacoes`) continua lendo `catalogos_m6`. As validações de vínculos da V7 já consultam esses dados. A V9 migra os dados para o novo modelo e passa a consulta pública a usar os setores das definições.
