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

```bash
pytest
```
