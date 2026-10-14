# Dados de demonstração e validação da entrega

Referência da atividade [G3 (#15)](https://github.com/DaviRosimES/C317/issues/15). Use um banco de desenvolvimento dedicado: todos os valores desta carga são fictícios e devem ser apresentados dessa forma na interface.

## 1. Preparação reproduzível

Na raiz do repositório, com Docker ativo e Python instalado, execute em PowerShell. Não substitua um `.env` existente; confira a configuração do banco de demonstração antes de seguir.

```powershell
# Somente se o arquivo ainda não existir:
Copy-Item .env.example .env

python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
docker compose up -d db
docker compose ps

Set-Location backend
& ..\.venv\Scripts\python.exe -m alembic upgrade head
& ..\.venv\Scripts\python.exe -m scripts.seed_demo --confirmar-demonstracao
& ..\.venv\Scripts\python.exe -m scripts.seed_demo --confirmar-demonstracao
& ..\.venv\Scripts\python.exe -m pytest -q
```

A segunda execução deve preservar os mesmos registros, sem duplicá-los. A carga só atualiza valores que já pertencem à própria demonstração e têm a mesma fonte. Se encontrar um dado real ou outro lançamento para a mesma chave, reverte a carga e informa o conflito.

Em Linux/macOS, use `.venv/bin/python` na raiz ou `../.venv/bin/python` dentro de `backend/`. Alternativamente, ative seu ambiente virtual e use `python -m ...`.

Arquivos: [`demonstracao.json`](../backend/fixtures/demonstracao.json), [`seed_demo.py`](../backend/scripts/seed_demo.py), [`test_indicadores_cnae.py`](../backend/tests/test_indicadores_cnae.py).

## 2. Resultado esperado em banco vazio

| Item | Quantidade/resultado |
| --- | --- |
| Tipos de indicadores | 8, com definições provisórias |
| CNAEs | 3, com seleção provisória |
| Rotas | 2, tecnológica e cultural |
| Associações CNAE/rota | 0; composição pendente |
| Períodos | 5: agosto, setembro e outubro de 2026; anos 2024 e 2025 |
| Lançamentos | 25, todos com `demonstracao = true` e fonte fictícia |
| Publicados | 24 |
| Rascunhos | 1: empregos formais de outubro/2026, valor 1200 |
| Estabelecimentos criados pela carga | 0 |

### Valores municipais

| Indicador | Agosto/2026 | Setembro/2026 |
| --- | ---: | ---: |
| Empregos formais | 1000 | 1100 |
| Número de hotéis | 15 | 16 |
| Número de leitos | 450 | 480 |
| Empresas ativas | 150 | 160 |
| Ocupação média de hotéis | 60,50% | 68,25% |

Patentes: **2024 = 0** e **2025 = 9**, em referências anuais. O zero deve ser exibido; não existe valor para 2026.

### Valores por CNAE

| CNAE | Empregos agosto | Empregos setembro | Empresas agosto | Empresas setembro |
| --- | ---: | ---: | ---: | ---: |
| `5510-8/01` | 80 | 90 | 12 | 14 |
| `5611-2/01` | 120 | 130 | 30 | 32 |
| `6201-5/01` | 500 | 550 | 40 | 44 |

Os totais municipais incluem atividades não representadas pelos três CNAEs da demonstração. Não devem ser reconstruídos pela soma desta tabela.

## 3. Conferência direta no PostgreSQL

Na raiz, abra o cliente no banco configurado no Compose:

```powershell
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Execute:

```sql
SELECT status, count(*) FROM indicadores
WHERE demonstracao GROUP BY status ORDER BY status;

SELECT i.tipo, p.ano, p.mes, s.codigo_cnae, i.valor, i.origem, i.demonstracao
FROM indicadores i
JOIN periodos p ON p.id = i.periodo_id
LEFT JOIN setores s ON s.id = i.setor_id
WHERE i.status = 'publicado' AND i.demonstracao
ORDER BY i.tipo, p.ano, p.mes NULLS FIRST, s.codigo_cnae;

SELECT codigo_cnae, nome, provisorio FROM setores
WHERE codigo_cnae IS NOT NULL ORDER BY codigo_cnae;
```

Use os valores acima como referência da consulta pública. Reinicie o banco com `docker compose restart db`, espere ficar saudável e repita a consulta: os valores devem permanecer. Não execute `down -v` nesse teste, pois esse comando apaga o volume.

## 4. Testes automatizados incluídos

A suíte cobre inserção municipal sem estabelecimento, recorte CNAE, período anual, unicidade de CNAE/agregados, fonte obrigatória, tipo inexistente, alvo incompatível, associações de rotas, ampliação do catálogo, repetição do seed, percentual inválido e reversão de uma carga que encontra dados reais. Os testes do banco usam transações revertidas ao final.

O teste de catálogo confirma que um quarto CNAE pode ser inserido sem mudar o esquema. A sua aparição na interface depende da implementação de V3/J3 e precisa da verificação manual abaixo.

## 5. Validação integrada — executar quando APIs e telas estiverem disponíveis

Os cenários abaixo são critérios de aceitação, **não resultados já obtidos**. No código-base usado para preparar estas atividades, somente a rota de saúde e o setup do frontend estavam implementados; os fluxos administrativos e públicos dependem das tarefas dos demais integrantes.

| Cenário | Procedimento e resultado esperado | Dependência | Situação |
| --- | --- | --- | --- |
| Login | Criar usuário de teste “Cristiano Ronaldo”, `cristiano.ronaldo@example.com`, pelo mecanismo de V1. Credenciais válidas permitem acesso; inválidas são recusadas; consulta pública dispensa login | V1/D1 | Pendente |
| Novo lançamento | Cadastrar `numero_leitos`, novembro/2026, valor 500, fonte “Dados fictícios de teste integrado — C317”, `demonstracao = true`, escopo municipal. Deve persistir sem estabelecimento ou CNAE inventado | V2/D2 | Pendente |
| Publicação | Salvar o lançamento como rascunho: não aparece na consulta pública. Publicar com usuário autorizado: aparece com valor, referência e fonte corretos | V2/V3/D2 | Pendente |
| Consulta inicial | Com a fixture, consultar publicados: outubro/2026 não apresenta os 1200 empregos em rascunho; setembro apresenta os valores da tabela | V3/J2 | Pendente |
| Período mensal | Selecionar agosto e setembro em sequência: empregos municipais mudam de 1000 para 1100 e ocupação de 60,50% para 68,25%. Não somar estoques dos dois meses | V3/J2/J3 | Pendente |
| Filtro CNAE | Selecionar `5510-8/01`, setembro: empregos por setor = 90 e empresas por setor = 14. Totais municipais continuam identificados como municipais | V3/J3 | Pendente |
| Referência anual | Consultar patentes em 2024 e 2025: 0 e 9; sem mês fictício. Em 2026 mostrar ausência de dados | V3/J2/J3 | Pendente |
| Fonte e demonstração | Cards e gráficos apresentam fonte e identificação dos valores fictícios; não rotular a fixture como dado oficial da Prefeitura | J1/J2/V3 | Pendente |
| Rotas | Interface distingue tecnológica/cultural e informa composição pendente, sem classificar CNAEs automaticamente | J1/J3/V3 | Pendente |
| Ampliação do catálogo | Inserir o quarto CNAE pelo exemplo do modelo de dados, recarregar o catálogo. Deve aparecer no formulário/filtro sem editar frontend ou criar migração | V3/J3/D2 | Pendente |
| Persistência | Reiniciar API e banco após criar/publicar; o lançamento e os catálogos continuam presentes | V2/V3/D2 | Pendente |
| Validação | Fonte vazia, contagem negativa/fracionária, percentual >100, CNAE desconhecido, recorte incompatível e publicação não autorizada são recusados com mensagens compreensíveis | V1/V2/D2 | Pendente |

O quarto CNAE deve aparecer no catálogo mesmo sem observações; a consulta dos seus indicadores deve indicar ausência de dados, não inventar um valor. Remova somente os registros criados pelo teste quando precisar restaurar a fixture.

## 6. Registro de conferência

Para cada cenário integrado, registre data, ambiente/commit, executor, resultado, evidência e número da issue associada em caso de falha. Só marque G3 como concluída depois dos fluxos integrados. Modelo:

| Data/commit | Cenário | Resultado observado | Evidência | Issue de correção |
| --- | --- | --- | --- | --- |
| A preencher | A preencher | Não executado | A preencher | A preencher |

## 7. Verificações locais realizadas em 11/10/2026

Base da implementação: `main` no commit `2135ad1f0a1cfdc1f9e302e7caeb70b65bac8eb9`. Alterações de G1/G2/G3 ainda sem commit nesta conferência.

O ambiente local bloqueou bibliotecas nativas do PostgreSQL/Psycopg e o Docker não iniciou. As verificações SQL foram executadas em **PGlite 0.5.8, baseado em PostgreSQL 18.3**, num banco temporário. Isso não confirma execução no PostgreSQL 17 definido no Compose/CI.

| Verificação | Resultado observado |
| --- | --- |
| Migração em banco vazio, downgrade e novo upgrade | Passou |
| Migração com dados legados nas seis tabelas originais | Passou; valores, referências e relacionamentos preservados no upgrade/downgrade/reupgrade |
| Fonte legada vazia | Upgrade recusado; revisão inicial e dados preservados; alterações da migração revertidas |
| Downgrade com agregados e anos completos | Recusado; nova revisão e 25 lançamentos preservados |
| Subconjunto de pytest: saúde e dez casos de inserção, catálogo e seed | 11 passaram; usou pg8000 e uma conexão compartilhada com rollback por teste como adaptação exclusiva do ambiente temporário |
| Dez restrições: tipo, fonte, alvo, unicidade municipal/CNAE/código, formato CNAE, referência anual, mês e estabelecimento inexistente | Conferidas diretamente pela API SQL do PGlite, incluindo o nome da restrição esperado |
| Repetição da carga | 25 registros, com os mesmos IDs; 24 publicados e um rascunho |
| Persistência após encerrar e iniciar o servidor temporário | Os 25 registros, valores e fontes permaneceram idênticos |
| Compilação dos módulos Python e geração do SQL do upgrade | Passou |
| Suíte completa com Psycopg/PostgreSQL 17 | **Pendente**: tentativas no socket PGlite falharam na recuperação do protocolo após erros esperados; a análise automática de permissão expirou nas tentativas de nova execução fora do sandbox |
| Fluxos completos de login, cadastro/publicação e frontend | **Pendentes** das APIs e telas dos demais integrantes |

pg8000, PGlite e os adaptadores usados nessa conferência não foram adicionados às dependências do projeto. Antes de aprovar a integração, executar no ambiente PostgreSQL 17 do grupo os comandos da seção 1 e verificar a suíte completa, sem adaptadores. Não interpretar os cenários integrados da seção 5 como concluídos.
