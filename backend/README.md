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
extensíveis, períodos anuais e associação configurável de rotas. As revisões
posteriores acrescentam o hash de senha dos usuários e a publicação de
relatórios (fonte, status e marca de demonstração). Consulte o
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
de `python`. A carga contém 25 valores fictícios, oito tipos de indicadores, três
CNAEs provisórios e três relatórios em PDF (dois publicados e um rascunho).
Repeti-la não duplica os registros nem substitui dados reais.
Não é executada automaticamente ao iniciar a aplicação ou aplicar migrações.

O seed e o Alembic leem o `.env` da raiz. As variáveis necessárias são
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` e `POSTGRES_PORT`.
`POSTGRES_HOST` é opcional e usa `localhost` por padrão. Variáveis já definidas
no ambiente têm precedência sobre o arquivo.

Valores esperados e conferências da interface estão em
[validação da entrega](../docs/validacao-entrega.md). Os cenários integrados
dependem das futuras APIs e telas; o roteiro não comprova sua execução.

## Autenticação administrativa

As operações administrativas (cadastro e publicação de indicadores) exigem um
token JWT; as consultas públicas continuam abertas. Defina `AUTH_SECRET_KEY`
no `.env` da raiz (veja `.env.example`) e crie a conta de desenvolvimento,
dentro de `backend/` com o banco migrado:

```bash
python -m scripts.criar_admin --email admin@c317.local --nome "Administrador"
```

A senha é pedida no terminal (ou lida de `ADMIN_SENHA`) e armazenada somente
como hash Argon2. Repetir o comando redefine a senha da mesma conta.

| Rota | Uso |
| --- | --- |
| `POST /api/v1/auth/login` | Recebe `{"email", "senha"}` e devolve `access_token` e `expires_in` (segundos) |
| `GET /api/v1/auth/me` | Dados do usuário do token |

Envie o token em `Authorization: Bearer <token>`. No Swagger, use o botão
**Authorize**. Rotas administrativas usam a dependência `AdminUser` de
`app/api/deps.py`: sem token válido respondem 401; com usuário fora do papel
`admin`, 403.

Para testar o portal do parceiro no front, crie uma conta sem papel `admin`
(senha pedida no terminal ou lida de `USUARIO_SENHA`):

```bash
python -m scripts.criar_usuario --email hotel@c317.local --nome "Hotel Serra Azul" --papel parceiro
```

O navegador só chama a API a partir das origens em `CORS_ORIGINS` (padrão
`http://localhost:5173`, o servidor do Vite); separe várias por vírgula.

## Cadastro e publicação de indicadores

Rotas administrativas (exigem token de admin) para lançar valores prontos:

| Rota | Uso |
| --- | --- |
| `POST /api/v1/admin/indicadores` | Cria o lançamento como `rascunho` |
| `GET /api/v1/admin/indicadores?status=` | Lista lançamentos, inclusive rascunhos |
| `GET /api/v1/admin/indicadores/{id}` | Detalha um lançamento |
| `PATCH /api/v1/admin/indicadores/{id}` | Corrige somente os campos enviados |
| `POST /api/v1/admin/indicadores/{id}/publicar` | Publica e registra o responsável em `validado_por` |

O corpo usa `tipo`, `valor`, `ano`, `mes` (nulo para período anual), `fonte`,
`codigo_cnae` e `estabelecimento_id`, conforme o escopo do tipo, e `demonstracao`.
`valor` é aceito e devolvido como string decimal. A API valida o escopo do tipo
(municipal, CNAE ou estabelecimento), a unidade (quantidade inteira e não
negativa; percentual de 0 a 100), a fonte e a existência do tipo e do CNAE.

Erros de regra de negócio respondem `{"detail": "mensagem"}` com 422, 404 ou
409 (lançamento já existente para o mesmo tipo, período e CNAE). Erros de
formato do corpo seguem o padrão do FastAPI, com `detail` como lista.

## Consulta pública

Rotas sem autenticação; retornam somente lançamentos publicados e agregados
(municipais ou por CNAE), nunca dados de estabelecimentos individuais:

| Rota | Uso |
| --- | --- |
| `GET /api/v1/indicadores` | Valores publicados, com filtros combináveis |
| `GET /api/v1/cnaes` | Catálogo de CNAEs e rotas associadas; novos cadastros aparecem automaticamente |
| `GET /api/v1/tipos-indicadores` | Catálogo com unidade, escopo e fonte de referência |
| `GET /api/v1/rotas` | Rotas, seus CNAEs e `composicao_pendente` |
| `GET /api/v1/periodos` | Referências (ano/mês ou ano) com dados publicados |

Filtros de `/indicadores`: `tipo`, `cnae` e `rota` (repetíveis), `escopo`
(`municipal` ou `cnae`), `periodicidade` (`mensal` ou `anual`), `ano`, `mes`
(exige `ano`) e o intervalo mensal `inicio`/`fim` no formato `AAAA-MM`.

- A API não soma valores: cada registro mantém seu escopo, e totais municipais
  nunca são combinados aos valores por CNAE.
- O filtro `cnae` retorna apenas lançamentos por CNAE; os totais municipais
  não recebem um CNAE e ficam fora dessa consulta.
- Uma combinação sem registros devolve `[]` ("sem dados"); um zero informado
  pela fonte é devolvido como `"0"`.
- `inicio`/`fim` selecionam referências mensais; períodos anuais exigem `ano`
  ou `periodicidade=anual`.

## Relatórios públicos

Rotas sem autenticação; somente relatórios com `status = 'publicado'`:

| Rota | Uso |
| --- | --- |
| `GET /api/v1/relatorios` | Título, fonte, data de publicação, referência (ano/mês) e marca de demonstração, do mais recente para o mais antigo |
| `GET /api/v1/relatorios/{id}/arquivo` | PDF do relatório, com `Content-Disposition: attachment` |

Os PDFs ficam em `backend/arquivos/relatorios/` (ou na pasta indicada por
`RELATORIOS_DIR`, relativa a `backend/`). `relatorios.arquivo_url` guarda o nome
do arquivo dentro dessa pasta; caminhos que saiam dela, arquivos ausentes ou sem
extensão `.pdf` respondem 404, assim como relatórios em rascunho. O envio de
arquivos e a geração automática não fazem parte desta entrega: para cadastrar um
relatório, copie o PDF para a pasta e insira a linha. Ele aparece na listagem sem
alteração no frontend:

```sql
INSERT INTO relatorios (periodo_id, titulo, arquivo_url, data_publicacao, fonte, status)
VALUES (
    (SELECT id FROM periodos WHERE ano = 2026 AND mes = 9),
    'Boletim do turismo — setembro de 2026', 'boletim-2026-09.pdf', '2026-10-08',
    'Secretaria de Turismo — boletim mensal', 'publicado'
);
```

O banco recusa um relatório publicado sem fonte e dois relatórios com o mesmo
arquivo. `autor_id` é opcional: relatórios carregados por script não têm autor.
