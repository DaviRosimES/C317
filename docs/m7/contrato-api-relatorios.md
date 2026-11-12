# Contrato HTTP — relatórios (V8)

Implementação da [V8 (#45)](https://github.com/DaviRosimES/C317/issues/45) conforme os [fluxos de uso, seção 6](03-fluxos-de-uso.md#6-relatórios-administração-por-pdf-e-consulta-pública). Consumidor: D8 (administração e página pública de relatórios).

## Regras

- Relatório é um documento independente; publicar Dados do indicador não gera PDF.
- Novo cadastro exige **título, fonte e PDF** e começa em **rascunho**. Número, tipo, data original e referência são enviados só quando conhecidos; nunca são presumidos. Mês exige ano.
- Não há campo de URL no cadastro. Links externos existem apenas em relatórios legados reais e continuam acessíveis. Ao trocar o conteúdo de um legado, ele passa a ser um PDF.
- Cada relatório tem **um único conteúdo vigente** (PDF ou link legado). Não existe versão publicada paralela nem histórico.
- `status` (`rascunho`/`publicado`) e `arquivado` são independentes. Arquivar preserva o status; restaurar volta à situação anterior. Arquivado precisa ser restaurado antes de editar, trocar o PDF, publicar ou despublicar (409).
- Edição confirmada de um publicado vale na consulta pública imediatamente. Edição de rascunho continua privada.
- A consulta pública (lista, detalhe e download) mostra somente **publicados e não arquivados**. Arquivar/despublicar retira também o download pela API; isso não altera permissões no provedor de um link externo legado.
- `demonstracao: true` identifica documentos fictícios já existentes (exibir "Dado fictício"). Cadastros novos são sempre `false`.

## Erros

| Status | Quando | Corpo |
| --- | --- | --- |
| 401 / 403 | Rotas `/admin`: sem token válido / usuário fora da equipe | `{"detail": "..."}` |
| 404 | Relatório inexistente; no público, também rascunho ou arquivado | `{"detail": "Relatório não encontrado."}` |
| 409 | Ação sobre relatório arquivado | `{"detail": "Relatório arquivado. Restaure-o antes de editá-lo."}` |
| 413 | PDF acima do limite | `{"detail": "O PDF excede o limite de 20 MB. O conteúdo vigente foi mantido."}` |
| 422 | Arquivo vazio ou que não é PDF; publicar sem fonte ou com PDF ausente no servidor; mês sem ano na edição | `{"detail": "mensagem"}` |
| 422 | Formato do corpo (campo ausente, vazio, desconhecido, tipo inválido) | Padrão do FastAPI: `detail` é uma lista |

Mensagens de falha no envio terminam com "O conteúdo vigente foi mantido." e podem ser exibidas como estão.

## Administração: `/api/v1/admin/relatorios`

| Rota | Uso |
| --- | --- |
| `GET /limites` | `{"tamanho_maximo_bytes": 20971520, "tipos_aceitos": ["application/pdf"]}`; a interface informa o limite antes do envio |
| `GET ?situacao=ativos\|arquivados\|todos&status=rascunho\|publicado` | Lista (padrão: ativos, qualquer status), da data original mais recente para a mais antiga; sem data no fim |
| `GET /{id}` | Detalhe |
| `GET /{id}/arquivo` | PDF vigente em qualquer situação, para conferência (404 se o conteúdo é link legado) |
| `POST` (multipart) | Cadastra um rascunho (201) |
| `PATCH /{id}` (JSON) | Corrige metadados |
| `PUT /{id}/arquivo` (multipart) | Troca o conteúdo vigente por um PDF; mantém o status |
| `POST /{id}/publicar` | Publica |
| `POST /{id}/despublicar` | Volta a rascunho sem apagar o conteúdo |
| `POST /{id}/arquivar` | Arquiva, preservando o status |
| `POST /{id}/restaurar` | Restaura |

Todas as respostas de relatório usam `RelatorioAdminResponse`:

```json
{
  "id": 7,
  "titulo": "Impacto Turístico HackTown 2025",
  "numero": "004/2025",
  "tipo": "relatorio_tecnico",
  "fonte": "Observatório do Turismo de Santa Rita do Sapucaí",
  "data_publicacao": "2025-11-07",
  "ano": 2025,
  "mes": null,
  "status": "rascunho",
  "arquivado": false,
  "demonstracao": false,
  "possui_pdf": true,
  "arquivo_nome": "Relatorio-004-2025.pdf",
  "link_externo": null
}
```

- `tipo`: `relatorio_tecnico`, `peca_divulgacao` ou `null`.
- `data_publicacao`: data original do documento (não a data do envio).
- `ano`/`mes`: referência do conteúdo; `mes` nulo significa o ano inteiro.
- `fonte` só é nula em rascunhos antigos sem fonte confirmada; publicar exige preenchê-la.
- `arquivo_nome`: nome do arquivo como foi enviado, só para apresentação. É nulo para links legados e PDFs da demonstração.

### Cadastro (`POST`, `multipart/form-data`)

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `arquivo` | Sim | Conteúdo PDF (cabeçalho `%PDF-` e marcador `%%EOF`), até o limite de `/limites`. Extensão e `Content-Type` não bastam |
| `titulo`, `fonte` | Sim | Não vazios |
| `numero` | Não | Ex.: `004/2025` |
| `tipo` | Não | `relatorio_tecnico` ou `peca_divulgacao` |
| `data_publicacao` | Não | `AAAA-MM-DD` |
| `ano`, `mes` | Não | Ano 1900–2100; mês 1–12 e só com ano |

Campos opcionais vazios (`""`) contam como não informados. Qualquer outro campo (por exemplo `link_externo`) é recusado com 422.

```js
const corpo = new FormData()
corpo.append('titulo', titulo)
corpo.append('fonte', fonte)
corpo.append('arquivo', arquivoSelecionado) // File do <input type="file" accept="application/pdf">
http.post('/admin/relatorios', corpo)       // o axios define o boundary do multipart
```

### Correção (`PATCH`, JSON)

Envie só os campos alterados entre `titulo`, `fonte`, `numero`, `tipo`, `data_publicacao`, `ano` e `mes`. `null` remove um opcional; `titulo` e `fonte` não aceitam `null`. Retirar `ano` mantendo `mes` é recusado. O status não muda por aqui; use publicar/despublicar.

### Troca do PDF (`PUT /{id}/arquivo`, multipart com `arquivo`)

O novo arquivo é validado antes da troca. Se ele for inválido, ultrapassar o limite ou a gravação falhar, o conteúdo anterior continua vigente e a resposta informa o motivo. Na troca confirmada, o status é mantido (um publicado já mostra o novo PDF), `link_externo` passa a `null` e o PDF anterior enviado pela administração é apagado.

## Consulta pública: `/api/v1/relatorios`

| Rota | Uso |
| --- | --- |
| `GET` | Lista de `RelatorioPublicoResponse`, da data original mais recente para a mais antiga |
| `GET /{id}` | Detalhe (novo na V8) |
| `GET /{id}/arquivo` | Download do PDF (`Content-Disposition: attachment`, nome original quando houver) |

`RelatorioPublicoResponse` não mudou: `id`, `titulo`, `numero`, `tipo`, `fonte`, `data_publicacao`, `ano`, `mes`, `link_externo` e `demonstracao`. Com `link_externo` preenchido, o documento abre no endereço externo e `/arquivo` responde 404.

## Persistência

A migração `d8f1a6c3e905` acrescenta `relatorios.arquivado` (padrão `false`) e `relatorios.arquivo_nome`. Os PDFs enviados ficam em `<RELATORIOS_DIR>/enviados/` com nome gerado, fora do git. O limite vem de `RELATORIOS_TAMANHO_MAXIMO_MB` (padrão 20). Os PDFs da demonstração na raiz da pasta nunca são apagados por uma troca.
