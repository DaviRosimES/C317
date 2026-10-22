# Observatório do Turismo SRS

Monorepo com `backend/` (FastAPI + PostgreSQL) e `frontend/` (SPA React). Requisitos, modelo de dados e roteiro de
validação em `docs/` — `docs/requisitos-entrega.md` (G1) é a referência para regras de negócio e textos.

As tarefas usam códigos ligados a issues do GitHub: G (requisitos/dados), V (API), J (front público),
D (área administrativa e relatórios). Mantenha cada branch no escopo da sua tarefa.

Para a Milestone 6, `docs/m6/requisitos-e-contrato.md` registra as decisões atuais e o contrato de intercâmbio;
`docs/m6/carga-dos-dados.md` documenta preparação, simulação e carga. Dados completos das categorias recebidas
são o foco; CNAE é secundário. A carga PostgreSQL e a consulta integrada dependem da migração V5 e da API V6.

## Comandos

Front-end (pnpm, a partir da raiz):

```bash
pnpm --dir frontend install
pnpm --dir frontend dev        # http://localhost:5173
pnpm --dir frontend typecheck  # tsc -b
pnpm --dir frontend build      # typecheck + build; também regenera src/routeTree.gen.ts
```

Back-end (dentro de `backend/`, com o venv ativo e o Postgres do `compose.yaml` rodando):

```bash
python -m uvicorn app.main:app --reload   # http://localhost:8000/docs
python -m pytest -q
alembic upgrade head
python -m scripts.seed_demo --confirmar-demonstracao
python -m scripts.criar_admin --email admin@c317.local --nome "Administrador"
```

O `.env` fica na raiz (veja `.env.example`). `CORS_ORIGINS` precisa incluir a origem do Vite.

## Front-end

Stack: React 19, Vite, TypeScript estrito (`verbatimModuleSyntax` → use `import type`), TanStack Router
(rotas por arquivo), TanStack Query, axios, Zod, Radix UI (`radix-ui`), Tailwind v4, Recharts. Alias `@/` → `src/`.

### Camadas

O fluxo é sempre `routes` → `features` → `queries` → `services` → `api/http`. Nenhuma camada pula a seguinte.

| Pasta | Responsabilidade |
| --- | --- |
| `src/api/dtos/*.dto.ts` | Contratos 1:1 com os schemas Pydantic (`backend/app/schemas`): snake_case, nomes `XxxResponseDto`, `XxxRequestDto`, `XxxQueryDto`. Decimais chegam como `string`. |
| `src/api/mappers/*.mapper.ts` | Funções puras `toXxx(dto)` (DTO → model) e `toXxxDto(model)` (model → DTO). Convertem `valor` para `number`, datas ISO para `Date`, `ano`/`mes` para `Periodo`. |
| `src/api/services/*.service.ts` | Objeto `xxxService` com um método por endpoint, usando `http` de `api/http/client.ts`. Recebem/retornam **models**, nunca DTOs. |
| `src/api/http/` | Instância axios (`baseURL = VITE_API_URL + /api/v1`, `paramsSerializer: { indexes: null }` para `?tipo=a&tipo=b`) e `ApiError`, que normaliza `{"detail": string}` e o 422 do Pydantic (`fieldErrors`). |
| `src/api/mocks/` | Adapter do axios que responde no navegador rotas que o back ainda não tem e repassa o resto para a API real. Ligado por `VITE_API_MOCKS`. |
| `src/models/` | Tipos de domínio em camelCase usados pela UI. |
| `src/queries/*.queries.ts` | `xxxKeys` (fábrica de query keys), `xxxQueryOptions` (para `loader`/prefetch) e hooks `useXxx`. Mutations invalidam as keys afetadas. |
| `src/features/<area>/` | Telas e componentes específicos de cada área (`public/`, …). Usam só hooks de `queries/`. |
| `src/routes/` | Só composição: `createFileRoute`, `validateSearch` (Zod de `lib/schemas.ts`), `loader` com `prefetchQuery` e o componente da feature. |
| `src/components/ui/` | Componentes-base reutilizáveis; exportados por `index.ts` e importados de `@/components/ui`. |
| `src/components/layout/`, `charts/` | Cabeçalho/rodapé e gráficos (`ColumnChart`, `HorizontalBars`). |
| `src/lib/` | `format` (pt-BR), `periodo`, `indicadores` (regras de série), `schemas`, `env`, `brand`, `utils` (`cn`). |

### Rota que o back ainda não tem

1. Escreva o DTO marcado como contrato **PROPOSTO**, o mapper, o service e a query como se a rota existisse.
2. Adicione o handler em `src/api/mocks/handlers.ts` (dados em `mocks/db.ts`, erros com `MockHttpError` no formato `{"detail"}`).
3. Quando o back implementar a rota, remova apenas o handler; service, DTO e tela não mudam.

### Componentes e estilo

- Reutilize `components/ui` antes de criar algo novo. Componentes seguem o padrão existente: função que espalha
  props nativas, `data-slot`, variantes com `cva`, classes mescladas com `cn()`.
- Use somente os tokens de `src/styles/globals.css` (`bg-canvas`, `text-ink-muted`, `border-line`, `bg-brand-*`,
  `rounded-2xl`, `shadow-card`…). Nada de cores hex soltas em componentes; em gráficos use `chartPalette`/`brandColors`.
- `bg-brand-gradient` apenas para destaques (hero, ação principal).
- Layout precisa funcionar em celular (375px) sem rolagem horizontal: comece pelo mobile e use `sm:`/`md:`/`lg:`.
- Filtros de listagem: estado de rascunho local + botão "Aplicar"; filtros públicos que precisam ser compartilháveis
  vão para a URL via `validateSearch`.
- Estados de carregamento (`Skeleton`), erro e vazio (`EmptyState`) são obrigatórios em toda consulta.
- `Link` do TanStack Router só aceita rotas existentes; o item ativo usa `data-status="active"`.

### Regras de exibição de indicadores (G1)

- Ausência de lançamento = "Sem dados para o período" (`EmptyState`), nunca `0`. Um `0` publicado é exibido como zero.
- Não somar estoques (empresas, leitos, empregos) entre meses; use o último valor (`lib/indicadores.ts`).
- Não somar totais municipais com recortes por CNAE nem distribuir totais entre CNAEs.
- Todo valor ou gráfico exibe período e fonte (`SourceNote`); `demonstracao: true` recebe `DemoBadge` ("Dado fictício").
- Períodos mensais e anuais têm rótulos distintos (`formatPeriodo`); percentuais vêm de 0 a 100 (`formatValorIndicador`).
- O filtro de CNAE não se aplica a totais municipais e a interface avisa isso (`AvisoFiltroCnae`).
- CNAEs, tipos de indicador, rotas e períodos vêm sempre da API (`/cnaes`, `/tipos-indicadores`, `/rotas`,
  `/periodos`); nunca crie enum/array fixo deles no front.
- Rotas sem CNAEs mostram "Classificação dos CNAEs por rota em definição".

### Área administrativa

- Telas em `routes/admin/_autenticado/` (prefixo `/admin`); o `beforeLoad` do layout `_autenticado.tsx` exige
  sessão ativa e papel `admin`, senão redireciona para `/admin/login?redirect=…&motivo=…`.
- O token fica em `api/http/sessao.ts` (localStorage, com prazo de `expires_in`). O cliente HTTP anexa o
  `Authorization` e, em um 401 com token, encerra a sessão; `useFimDaSessao` leva ao login e limpa o cache.
- Mutations administrativas invalidam também `consultaKeys.all`, pois publicar muda a consulta pública.

## Back-end

Camadas em `backend/app`: `api/routes` (HTTP) → `services` (regras) → `repositories` (SQL com `text()`) e
`schemas` (Pydantic). Erros de domínio em `core/errors.py` (`ValidacaoError` 422, `NaoEncontradoError` 404,
`ConflitoError` 409) viram `{"detail": "..."}`. Rotas administrativas usam a dependência `AdminUser`
(`api/deps.py`). Prefixo da API: `/api/v1`. Mudanças de esquema sempre por nova revisão do Alembic.

## Convenções gerais

- Domínio, nomes de variáveis/funções de negócio e textos da interface em português (`indicador`, `periodo`,
  `listarIndicadores`); termos técnicos podem ficar em inglês (`queryKey`, `service`, `mapper`).
- Commits no formato `feat:`, `fix:`, `refactor:`, `chore:` com descrição em português; branches `feat/<escopo>`.
- Antes de concluir uma alteração no front: `pnpm --dir frontend build` sem erros.
