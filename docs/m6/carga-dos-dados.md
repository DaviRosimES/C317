# Preparação e carga dos dados da M6

Os comandos abaixo partem de `backend/`. Preparação, validação offline, ensaio SQLite e testes dos dados usam apenas a biblioteca padrão do Python 3.12 ou 3.13. O acesso PostgreSQL usa as dependências já previstas no backend.

## Conferir o pacote recebido pelo Git

```powershell
# A partir da raiz do repositório:
cd backend
python -m scripts.carregar_m6 --simular
python -m unittest discover -s tests_dados -v
```

O primeiro comando não abre conexão com banco. Confere hashes, catálogos, referências, decimais, proveniências e o vínculo com a triagem. O resultado esperado é `1228` observações validadas e `119` linhas excluídas da planilha. Isso não significa que esses dados já apareçam na aplicação.

## Recriar a partir da planilha original

```powershell
python -m scripts.preparar_m6 --origem 'C:\Users\gusta\Downloads\_Indicadores_OT_SRS_.xlsx'
python -m scripts.carregar_m6 --simular
```

Outro integrante substitui o caminho pelo local onde recebeu a mesma planilha. O original não é alterado nem precisa ser colocado no Git; o preparador lê os valores/fórmulas armazenados no XLSX e preserva o decimal XML. Fórmulas não são executadas nem recalculadas. A versão é conferida por SHA-256 e o arquivo errado é recusado.

Para comparar sem alterar o pacote versionado:

```powershell
python -m scripts.preparar_m6 --origem 'CAMINHO\_Indicadores_OT_SRS_.xlsx' --saida '.execucao-m6\recriacao'
python -m scripts.carregar_m6 --pacote '.execucao-m6\recriacao' --simular
```

Uma nova planilha exige revisão do perfil, das referências, dos bloqueios e das correspondências. Não remover a conferência de hash apenas para aceitar uma versão diferente.

## Ensaiar a carga sem Docker

```powershell
python -m scripts.carregar_m6 --ensaio-sqlite '.execucao-m6\ensaio.sqlite3'
python -m scripts.carregar_m6 --ensaio-sqlite '.execucao-m6\ensaio.sqlite3'
```

Na primeira execução, são criadas 1.228 observações no arquivo de ensaio. Na segunda, zero são criadas e 1.228 são reutilizadas. O histórico registra o mesmo pacote uma única vez. Os registros entram como rascunhos, com `demonstracao = false`: são dados recebidos, usados em um banco isolado de teste, e não números fictícios.

O ensaio não altera o PostgreSQL, não cria endpoints e não alimenta o dashboard. Seu valor é verificar a leitura do pacote, persistência, repetição e rejeição de conflitos. O carregador recusa um SQLite com tabelas de outra aplicação.

## Aplicar no PostgreSQL após V5

Primeiro, Vitor deve incorporar/adaptar a [proposta de persistência](contrato-importacao.sql) em uma nova migração e integrar a API. O carregador não executa o SQL dessa proposta nem cria tabelas no PostgreSQL.

Com um ambiente virtual limpo, dependências instaladas e `.env` configurado:

```powershell
python -m alembic upgrade head
python -m scripts.carregar_m6 --conferir-banco
python -m scripts.carregar_m6 --aplicar --confirmar-carga-real
```

Se V5 ainda não existir, `--conferir-banco` e `--aplicar` recusam o esquema antigo. Não resolver essa mensagem importando os arquivos como CNAEs, reduzindo a precisão ou cadastrando um estabelecimento fictício.

O destino vem de `M6_DATABASE_URL`, quando definida, ou das variáveis `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` do ambiente/`.env`. Confirme o destino antes de aplicar. Não colocar credenciais em arquivos versionados.

A gravação é transacional. Inserções anteriores do mesmo lote são revertidas em caso de conflito. Registros existentes iguais são reutilizados; valor ou metadado diferente com a mesma identidade provoca recusa de todo o lote, preservando a correção existente. Não há sobrescrita automática. Uma atualização real exige rever o pacote e definir explicitamente a política de alteração.

Os novos registros são rascunhos. A publicação pelo fluxo administrativo depende da API e da interface integradas; o carregador não declara que eles já foram publicados.

## Arquivos do pacote

| Arquivo | Uso |
| --- | --- |
| `catalogos.json` | Dicionário de indicadores, categorias, temas, territórios, unidades e fontes. |
| `observacoes.jsonl` | 1.228 observações únicas prontas para o contrato. |
| `triagem.csv` | Todas as 1.359 posições analisadas, com elegibilidade e motivos; não contém os valores excluídos. |
| `perfil_origem.json` | Versão da planilha, bloqueios de grupos e correspondências revisadas. |
| `manifesto.json` | Contagens, conferências das 36 séries e hashes dos arquivos. |

O seed `scripts.seed_demo` permanece separado e contém valores fictícios. Ele não atualiza este pacote nem deve ser usado para completar as lacunas da origem real.
