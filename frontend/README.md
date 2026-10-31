# Observatório do Turismo SRS — Front-end

SPA em React para o Observatório do Turismo de Santa Rita do Sapucaí.

## Stack

- **React 19 + Vite + TypeScript**
- **TanStack Router** — roteamento por arquivos em `src/routes` (a árvore `src/routeTree.gen.ts` é gerada automaticamente pelo plugin do Vite; não edite à mão)
- **TanStack Query** + **axios** — cache/estado de servidor e cliente HTTP (camadas abaixo)
- **Zod** — validação de env e search params (`src/lib/schemas.ts`, `src/lib/env.ts`)
- **Recharts** — gráficos (cores de `chartPalette`)
- **Radix UI** (`radix-ui`) — primitivas acessíveis (Select, ToggleGroup, Label, Slot)
- **Tailwind CSS v4** — tokens em `src/styles/globals.css` (`@theme`)
- **Inter** via `@fontsource-variable/inter` (self-hosted)

## Rodando

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev           # http://localhost:5173
pnpm build         # typecheck + build de produção
```

## Design tokens (Figma → Tailwind)

| Token Figma | Hex       | Utilitário              |
| ----------- | --------- | ----------------------- |
| Azul        | `#0A4AAD` | `bg-brand-blue`         |
| Roxo        | `#6C5CE0` | `bg-brand-purple`       |
| Magenta     | `#C750D6` | `bg-brand-magenta`      |
| Ciano       | `#5FE6E0` | `bg-brand-cyan`         |
| Azul-céu    | `#27B7FD` | `bg-brand-sky`          |
| Lilás       | `#B986ED` | `bg-brand-lilac`        |
| Amarelo     | `#FADA77` | `bg-brand-yellow`       |

Neutros (extraídos do Figma): `canvas` #F7F8FC, `surface` #FFF, `ink` #171A2B, `ink-muted` #667085,
`line` #E7EAF0, `surface-muted`/`line-accent` (chip ativo), `on-brand` (texto sobre gradiente).
Sidebar admin: `sidebar` #11152A, `sidebar-active` #272C48, `sidebar-ink` #B6BCD0.
Status: `success` #22B573, `warning` #F59E0B (+ `*-soft` para fundos de badge), `info-soft` #F1EEFF.
Raios: `rounded-sm` 8 · `md` 10 · `lg` 12 · `xl` 14 · `2xl` 16. Sombra: `shadow-card`.
Destaque: `bg-brand-gradient` (azul → roxo 52% → magenta), usar com parcimônia.
Para gráficos, use `chartPalette` de `src/lib/brand.ts`.

## Componentes-base (`src/components/ui`)

| Componente                         | Uso no Figma                                   |
| ---------------------------------- | ---------------------------------------------- |
| `Button` (`primary`, `secondary`…) | "Explorar indicadores", "Baixar relatório"     |
| `Select*`                          | Seletor de período "Jan — Dez 2026"            |
| `Label` / `FormField`              | "PERÍODO" (`eyebrow`) / "Competência" (`field`) |
| `FilterChips` / `FilterChip`       | Hospedagem · Empregos · Empresas               |
| `StatCard`                         | "Empresas do setor", "Leitos disponíveis"      |
| `Card*`                            | Card "Princípios de interface"                 |
| `PageHero`                         | Faixa com gradiente do topo                    |
| `Badge` (`info`, `warning`…)       | "Aguardando", "Com observação" (admin)     |
| `SectionTitle`, `BulletList`, `Input` | Apoio                                       |
| `Textarea`, `Checkbox`             | Formulário de lançamentos (fonte, demonstração) |
| `Alert` (`info`, `success`…)       | Retorno de operações: login, salvar, publicar  |
| `Dialog*`                          | "Ver detalhes" do inventário                   |
| `ListRow` / `ListRowThumb`         | Linhas do inventário                           |
| `EmptyState`                       | "Sem dados para o período" (nunca exibir 0)    |
| `SourceNote` / `DemoBadge`         | Fonte do dado e selo "Dado fictício"           |
| `Skeleton`                         | Carregamento                                   |

Importe tudo de `@/components/ui`.

## Estrutura e camadas

```
src/
  api/
    http/        client.ts (axios: baseURL /api/v1, erros normalizados), api-error.ts
    dtos/        contratos de request/response 1:1 com o back (snake_case, `valor` como string decimal)
    mappers/     DTO → model (camelCase, números, datas, períodos)
    services/    uma função por endpoint; só devolvem models
    mocks/       adapter do axios para rotas que o back ainda não tem
  models/        tipos de domínio usados pela UI
  queries/       TanStack Query: query keys e hooks por domínio
  features/      telas públicas (public/) e administrativas (admin/) — usam só hooks de queries/
  components/    ui/ (base), layout/ (cabeçalho e rodapé públicos), charts/
  lib/           format (pt-BR), periodo, indicadores, schemas, env, brand, utils
  routes/        rotas do TanStack Router (só composição)
```

Fluxo: `routes` → `features` → `queries` → `services` → `http` (+ `mappers`/`dtos`).

## Rotas

| Rota | Tela (Figma) | Dados |
| --- | --- | --- |
| `/` | Public / Dashboard (modelo anterior, base fictícia) | API: `/periodos`, `/cnaes`, `/tipos-indicadores`, `/indicadores`, `/rotas` |
| `/indicadores` | Consulta da M6 por tema, cidade, referência e categoria de origem (J5/J6) | API: `/observacoes/catalogos` + `/observacoes` |
| `/relatorios` | Relatórios (D3, D5) | API: `/relatorios`; download em `/relatorios/{id}/arquivo` ou link externo sinalizado |
| `/inventario` | Public / Inventário Turístico | simulado |
| `/contribua` | Formulários externos confirmados (D6) | estático (`features/public/canais.ts`) |
| `/sobre` | Cadastur, FNRH, SRI e fontes de dados (D6) | estático + API: `/observacoes/catalogos` (fontes com dados publicados) |
| `/admin/login` | Login da área administrativa (D1) | API: `/auth/login`, `/auth/me` |
| `/admin/observacoes` | Observações da M6, filtros e publicação (D4) | API: `/admin/observacoes` (paginada), `/admin/observacoes/catalogos` |
| `/admin/observacoes/nova` | Cadastro de observação (D4) | API: `/admin/observacoes/catalogos` + `POST /admin/observacoes` |
| `/admin/observacoes/$observacaoId` | Correção, publicação e bloqueio (D4) | API: `/admin/observacoes/{id}` (+ ações) e `/observacoes/{id}` |
| `/admin/lancamentos` | Lançamentos anteriores, filtro por situação e publicação (D2) | API: `/admin/indicadores` |
| `/admin/lancamentos/novo` | Cadastro de lançamento (D2) | API: catálogos + `POST /admin/indicadores` |
| `/admin/lancamentos/$lancamentoId` | Correção de lançamento (D2) | API: `PATCH /admin/indicadores/{id}` |

## Área administrativa

- As rotas em `src/routes/admin/_autenticado/` passam pelo `beforeLoad` de `_autenticado.tsx`: sem sessão válida, o
  acesso direto redireciona para `/admin/login`, que volta à tela pedida após o login. Contas sem papel `admin` são
  recusadas.
- O token fica no `localStorage` (`src/api/http/sessao.ts`) com o prazo informado pela API (`expires_in`). A sessão
  termina ao sair, quando o prazo vence (inclusive com a tela aberta), quando a API recusa o token (401) ou quando
  outra aba sai da conta; nesses casos a interface volta ao login com um aviso.
- O formulário valida tipo, período, valor (inteiro não negativo para quantidades; 0 a 100 para percentuais), fonte e
  CNAE (só para tipos por setor) antes de enviar; erros da API aparecem no topo e nos campos. Tipos e CNAEs vêm dos
  catálogos da API.
- Observações (D4): o formulário segue o contrato da V5/V6. Indicador, território, categoria, unidade, fonte e temas
  vêm de `/admin/observacoes/catalogos`, que inclui itens ainda sem dado publicado. O CNAE de um recorte vem do
  catálogo da categoria; o cadastro não envia CNAE. A referência é anual,
  mensal, acumulada, levantamento ou retrato, sem ano preenchido de antemão. O valor é texto decimal sem limite de
  casas (`lib/decimal.ts`): a validação aplica `inteira`/`maximo` da unidade, e a edição mostra o valor exato.
  Observação com divulgação bloqueada não pode ser publicada; o motivo aparece na tela e a API responde 422.
- A listagem é paginada pela API (30 por vez em "Mostrar mais"). O detalhe mostra a proveniência e o histórico das
  ações administrativas (`historico`) e lê `/observacoes/{id}` depois de cada alteração para mostrar o que a
  consulta pública já devolve.
- Para testar localmente, crie a conta com `python -m scripts.criar_admin` (veja `backend/README.md`).

## Rotas simuladas (mocks)

O inventário turístico ainda não existe no back. O service já chama a rota proposta (contrato em
`src/api/dtos/inventario.dto.ts`, marcado como **PROPOSTO**) e `src/api/mocks/adapter.ts` responde essa rota no
navegador, repassando todo o resto para a API real.

- Quando o back implementar a rota, remova-a de `src/api/mocks/handlers.ts` — service, DTO e tela não mudam.
- `VITE_API_MOCKS=false` desliga as simulações.

## Regras de exibição de indicadores

- Ausência de registro aparece como "Sem dados para o período" (`EmptyState`); `0` publicado é exibido como zero.
- Estoques (empresas, leitos, empregos) nunca são somados entre meses: usa-se o último valor (`src/lib/indicadores.ts`).
- Todo valor/gráfico mostra a fonte; valores com `demonstracao` recebem o selo "Dado fictício".
- Períodos anuais e mensais têm rótulos distintos (`formatPeriodo`), e o filtro de CNAE avisa que não altera
  totais municipais.
- CNAEs e tipos de indicador vêm da API; o Dashboard monta cards e gráficos a partir dos tipos com valores.
- Um escopo ou uma unidade desconhecidos da V3 não viram "total municipal": o escopo fica `desconhecido` e é
  sinalizado; a unidade aparece pelo nome recebido.

## Consulta da M6 (`/indicadores`)

- Temas, cidades, referências e categorias saem do catálogo e das observações publicadas; não há tela nem lista
  por indicador. `lib/observacoes.ts` organiza cada indicador em série (≥ 3 referências anuais ou mensais do mesmo
  território), comparativo entre cidades (uma referência por vez), recortes de origem e valores avulsos.
- Séries só usam referências `anual`/`mensal`; acumulados aparecem com rótulo próprio ("72 no total 2000–2024
  (acumulado)") e nunca como valor do último ano.
- O filtro de categoria restringe só os recortes da mesma classificação; totais e outros indicadores continuam
  visíveis com "Filtro de recorte não se aplica". O filtro de CNAE só aparece quando a fonte informou CNAE.
- No comparativo, municípios do tema sem valor no indicador aparecem como indisponíveis; fontes diferentes são
  mostradas linha a linha, sem soma.
- Todo gráfico tem tabela equivalente ("Ver dados em tabela") e rola dentro do próprio card no celular.
