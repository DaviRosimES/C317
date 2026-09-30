# Backend

FastAPI + Uvicorn, organizado em camadas:

- `app/api/routes` – rotas (HTTP)
- `app/services` – regras de negócio
- `app/repositories` – acesso a dados
- `app/schemas` – schemas Pydantic (contratos da API / OpenAPI)
- `app/models` – modelos de dados
- `app/core` – configuração e utilitários transversais

## Rodando

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger em http://localhost:8000/docs

## Testes

Inicie o PostgreSQL e aplique as migrações antes de rodar os testes de integridade.

```bash
pytest
```

## Migrações do banco

Com o PostgreSQL iniciado pelo `compose.yaml` da raiz e o `.env` criado a partir
de `.env.example`, execute em `backend/` com o ambiente virtual ativo:

```bash
alembic upgrade head
alembic current
```

A primeira migração cria as seis tabelas do desenho.

Para alterar o esquema depois, crie outra revisão, preencha `upgrade()` e
`downgrade()` e aplique-a:

```bash
alembic revision -m "descricao"
alembic upgrade head
```

Não edite uma migração já aplicada em bancos compartilhados.
