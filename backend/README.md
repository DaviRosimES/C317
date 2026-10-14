# Backend

FastAPI + Uvicorn, organizado em camadas:

- `app/api/routes` – rotas (HTTP)
- `app/services` – regras de negócio
- `app/repositories` – acesso a dados
- `app/schemas` – schemas Pydantic (contratos da API / OpenAPI)
- `app/models` – modelos de dados
- `app/core` – configuração e utilitários transversais

## Rodando

Na raiz do repositório, em PowerShell:

```powershell
python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Set-Location backend
& ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Em Linux/macOS, na raiz:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
python -m uvicorn app.main:app --reload
```

Swagger em http://localhost:8000/docs

## Testes

Inicie o PostgreSQL e aplique as migrações antes de rodar os testes de integridade.

```bash
python -m pytest -q
```

## Migrações do banco

Com o PostgreSQL iniciado pelo `compose.yaml` da raiz e o `.env` criado a partir
de `.env.example`, execute em `backend/` com o ambiente virtual ativo:

```bash
alembic upgrade head
alembic current
```

A primeira migração cria as seis tabelas do desenho.
A revisão seguinte permite indicadores municipais sem estabelecimento, CNAEs
extensíveis, períodos anuais e associação configurável de rotas. Consulte o
[modelo de dados](../docs/modelo-dados.md), inclusive antes de um downgrade.

Para alterar o esquema depois, crie outra revisão, preencha `upgrade()` e
`downgrade()` e aplique-a:

```bash
alembic revision -m "descricao"
alembic upgrade head
```

Não edite uma migração já aplicada em bancos compartilhados.

## Carga de demonstração

Dentro de `backend/`, com o ambiente ativo e o banco migrado:

```bash
python -m scripts.seed_demo --confirmar-demonstracao
```

Em PowerShell sem ativar o ambiente, use `..\.venv\Scripts\python.exe` no lugar
de `python`. A carga contém 25 valores fictícios, oito tipos de indicadores e três
CNAEs provisórios. Repeti-la não duplica os registros nem substitui dados reais.
Não é executada automaticamente ao iniciar a aplicação ou aplicar migrações.

O seed e o Alembic leem o `.env` da raiz. As variáveis necessárias são
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` e `POSTGRES_PORT`.
`POSTGRES_HOST` é opcional e usa `localhost` por padrão. Variáveis já definidas
no ambiente têm precedência sobre o arquivo.

Valores esperados e conferências da interface estão em
[validação da entrega](../docs/validacao-entrega.md). Os cenários integrados
dependem das futuras APIs e telas; o roteiro não comprova sua execução.
