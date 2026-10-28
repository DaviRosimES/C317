# Validação e demonstração da implementação 3

Conferência de 21/10/2026, a partir da main `074884537e7c9c6f71dd9b5b03d3f5b5089b206a`, com os novos arquivos de G4/G5/G6. Os resultados distinguem a preparação dos dados, o ensaio do carregador e a integração da aplicação.

## Estado das tarefas de Gustavo

| Tarefa | Entregue nesta versão | Critério ainda dependente |
| --- | --- | --- |
| G4 #29 | Escopo, regras, dicionário/catálogos, triagem completa e contrato de intercâmbio. | Revisão do contrato físico com Vitor antes da migração V5. A proposta SQL não é uma migração aplicada. |
| G5 #33 | Pacote com 1.228 observações, preparador, validação, carga reexecutável, documentação e testes. | Carga na base da aplicação após V5; disponibilização pela API após V6. |
| G6 #40 | Ambiente compatível, testes locais, ensaio PostgreSQL/SQLite, compilação do frontend, roteiro do vídeo e DOCX com o estado conhecido. | Homologação dos novos dados pela API/interface, persistência após reinício da versão integrada, atualização final do relatório e gravação do vídeo. |

Não encerrar G5/G6 como integralmente concluídas apenas com os ensaios. O commit entrega os dados e instrumentos para integrar; não faz os novos valores aparecerem automaticamente no dashboard.

## Verificações executadas

- **25 testes de dados e carga:** referências, decimais, zero/ausência, categorias de hospedagem, dependências pendentes, deduplicação entre abas, fontes/edições distintas, idempotência, conflitos e reversão do lote.
- **123 testes existentes do backend aprovados** em PostgreSQL 17. A coleta conjunta após incluir `tests_dados` no pytest também aprovou os **148 testes**. A mudança em `pytest.ini` faz os cenários novos participarem do CI existente.
- **Frontend:** TypeScript e build Vite aprovados. A alteração pré-existente em `frontend/src/routeTree.gen.ts` foi preservada; não faz parte desta entrega de Gustavo.
- **PostgreSQL real de teste:** 1.228 observações criadas na primeira execução e reutilizadas na segunda, 291 itens de catálogo, conflito recusado e precisão decimal preservada. O ensaio usou esquema descartável separado, criado a partir da proposta de contrato. Não foi uma migração do projeto.
- **Proteção do esquema antigo:** o carregador recusou a base com apenas as migrações atuais. Nenhuma tabela nova foi criada automaticamente nela.
- **SQLite isolado:** repetição sem duplicação, preservação após reabrir e recusa de banco de outra aplicação.
- **Integridade:** hashes do pacote e da planilha original conferidos. A recriação deve manter os mesmos arquivos para a mesma origem e perfil.

A validação local usou Python 3.12.14, FastAPI 0.159.1, Pydantic 2.14.1, Pydantic Core 2.50.1, psycopg 3.3.6 e SQLAlchemy 2.1.6. As 41 versões estão em `backend/requirements-m6.txt`; o `requirements.txt` original permanece como estava. São as versões desta execução, não as da auditoria de 20/10. O pytest registrou um aviso de depreciação do adaptador HTTPX no TestClient; não houve falha por esse aviso.

Os resultados não comprovam publicação/consulta dos novos recortes, porque V4–V6/J4–J6/D4–D6 ainda não estavam integradas na main consultada. A regra de confirmação imediata precisa da regressão HTTP de V4; os testes antigos que compartilham conexão não substituem esse aceite.

## Ambiente local limpo

Na máquina de Gustavo foi preparado `backend/.venv-m6`, com Python 3.12 e as versões registradas. Para conferir os dados, a partir de `backend/`:

```powershell
.\.venv-m6\Scripts\python.exe -m scripts.carregar_m6 --simular
.\.venv-m6\Scripts\python.exe -m unittest discover -s tests_dados -v
```

Em outra máquina, criar um ambiente novo com Python 3.12 ou 3.13 e instalar as dependências nele:

```powershell
python -m venv .venv-m6
.\.venv-m6\Scripts\python.exe -m pip install -r requirements-m6.txt
.\.venv-m6\Scripts\python.exe -c "import sys,pydantic_core,psycopg; print(sys.version); print(pydantic_core.__version__); print(psycopg.__version__)"
```

Não copiar `site-packages`, extensões `.pyd` ou um ambiente virtual de outra instalação. Python 3.13 precisa de extensões compatíveis com essa ABI; a validação registrada aqui foi executada em 3.12.

## Reproduzir o ensaio PostgreSQL

Usar somente um contêiner novo e descartável. Os valores de conexão abaixo são exclusivos do teste e não devem substituir o `.env` da aplicação.

```powershell
docker run --detach --rm --name c317-m6-validacao --publish 127.0.0.1:5437:5432 --env POSTGRES_DB=c317_m6_validacao --env POSTGRES_USER=c317_m6 --env POSTGRES_PASSWORD=teste-cristiano-ronaldo postgres:17
docker exec c317-m6-validacao pg_isready -U c317_m6 -d c317_m6_validacao

$env:POSTGRES_HOST='127.0.0.1'
$env:POSTGRES_PORT='5437'
$env:POSTGRES_DB='c317_m6_validacao'
$env:POSTGRES_USER='c317_m6'
$env:POSTGRES_PASSWORD='teste-cristiano-ronaldo'
$env:M6_BANCO_DESCARTAVEL='1'
.\.venv-m6\Scripts\python.exe -m scripts.validar_m6 --postgresql

docker stop c317-m6-validacao
```

Aguardar `pg_isready` indicar que o banco aceita conexões. O validador exige o nome `c317_m6_validacao*` e a flag de descarte. Ele aplica as migrações atuais apenas nesse banco, executa os testes do backend e cria/remove seu próprio esquema de ensaio. Os resultados ficam em `.execucao-m6/validacao`, pasta ignorada pelo Git.

## Roteiro de vídeo com até um minuto

1. **0–15 s:** mostrar os requisitos e dizer: “Organizei o contrato dos dados da M6, priorizando as categorias recebidas e excluindo informações pendentes.”
2. **15–30 s:** mostrar `manifesto.json` e `triagem.csv`: “Foram analisadas 459 linhas e 900 pontos anuais. O pacote ficou com 1.228 observações únicas, com fonte e origem rastreáveis.”
3. **30–45 s:** executar a simulação e mostrar o resumo dos testes: “A validação preserva os decimais e diferencia referências, valores iguais a zero e dados ausentes.”
4. **45–60 s:** mostrar duas execuções de `--ensaio-sqlite` e concluir: “O carregador reutiliza os dados sem duplicar e recusa conflitos. A carga na aplicação aguarda a migração e a integração da equipe.”

Para a primeira gravação, usar um arquivo de ensaio ainda inexistente, por exemplo `.execucao-m6/video-01.sqlite3`. Na segunda execução do mesmo comando, o resumo mostra reutilização. Para regravar desde a primeira carga, escolher outro nome de arquivo.

## Comunicação ao grupo

> Preparei o contrato e o pacote da M6 com 1.228 observações únicas. As categorias vieram da planilha e nenhum CNAE foi inventado. Dados pendentes, inclusive os leitos a confirmar e o bloco Lattes de SRS, ficaram fora. O carregador passou nos ensaios de repetição, conflito e precisão. Vitor precisa revisar/incorporar o contrato da V5 e integrar a API; João e Davi podem usar o dicionário para as telas. Depois dessas integrações concluo a carga na aplicação e a validação G6. O commit atual não coloca os novos dados no dashboard sozinho.

## Revisão e commit

O preparador lê a origem e produz o pacote; o módulo `scripts/m6/contrato.py` valida seus campos e hashes; o carregador aplica o pacote em transação; `tests_dados` cobre as regras de negócio e proteção da carga. A proposta SQL permite ao responsável pela V5 avaliar a integração antes de criar a migração.

Na raiz do repositório, conferir as alterações e selecionar somente os arquivos desta entrega:

```powershell
git status
git diff -- .gitignore .gitattributes CLAUDE.md README.md docs/requisitos-entrega.md backend/pytest.ini
git add -- .gitignore .gitattributes CLAUDE.md README.md docs/requisitos-entrega.md docs/m6 backend/pytest.ini backend/requirements-m6.txt backend/dados/m6 backend/scripts/m6 backend/scripts/preparar_m6.py backend/scripts/carregar_m6.py backend/scripts/validar_m6.py backend/tests_dados
git diff --cached --stat
git commit -m "feat: preparar contrato e carga validada dos dados da M6"
```

`frontend/src/routeTree.gen.ts` já estava alterado antes desta entrega e ficou fora dessa seleção. Ambientes virtuais e `.execucao-m6` são ignorados. A planilha original e os arquivos temporários não entram no commit. A branch local `gustavo` foi avançada para a mesma base da main, preservando os commits anteriores; nenhum commit ou push foi feito durante a preparação.

O DOCX da implementação 3 foi preparado fora do repositório para revisão, mantendo o modelo anterior e o link do vídeo em branco. As marcações de uso de IA herdadas do formulário precisam da revisão da equipe antes da entrega final. Não marcar G5/G6 como concluídas nem usar `Closes` para essas issues enquanto seus critérios dependentes estiverem abertos.
