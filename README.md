# C317

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
