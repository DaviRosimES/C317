# C317

## Implementação 3 Milestone 6

- [Requisitos e contrato atuais](docs/m6/requisitos-e-contrato.md): categorias recebidas, precisão, referências e exclusão de dados pendentes.
- [Preparação e carga dos dados](docs/m6/carga-dos-dados.md): pacote real, simulação sem banco e ensaio isolado.
- [Validação da M6](docs/m6/validacao-e-demonstracao.md): verificações executadas, ambiente e critérios ainda dependentes da equipe.
- [Controle de documentos e canais](docs/m6/controle-documentos-e-canais.md): relatórios e formulários conferidos, disponíveis, excluídos e pendentes (D5, D6).

O pacote está em `backend/dados/m6`. A integração ao PostgreSQL/API/frontend depende de V5/V6/J5/D4; os dados não passam a aparecer no dashboard apenas por fazer o commit.

## Requisitos e demonstração

- [Requisitos da próxima entrega](docs/requisitos-entrega.md): indicadores, CNAEs, rotas, fontes e definições pendentes.
- [Modelo de dados](docs/modelo-dados.md): migração, catálogos e contrato proposto para as APIs.
- [Dados e validação](docs/validacao-entrega.md): carga fictícia reproduzível e cenários de aceitação.
- [Backend](backend/README.md): ambiente Python, migrações e testes.

## Banco de dados local

O PostgreSQL de desenvolvimento é definido no `compose.yaml` da raiz. Para iniciar:

```bash
cp .env.example .env
docker compose up -d db
docker compose ps
```

O banco fica disponível somente nesta máquina, na porta definida por
`POSTGRES_PORT` (padrão: `5432`). Os dados persistem no volume Docker
`postgres_data`. O arquivo `.env` é local e não deve ser versionado.

Para parar o banco sem apagar os dados:

```bash
docker compose down
```

`docker compose down -v` também remove o volume e apaga os dados locais.
