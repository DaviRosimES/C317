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
  features/      telas públicas — usam só hooks de queries/
  components/    ui/ (base), layout/ (cabeçalho e rodapé públicos), charts/
  lib/           format (pt-BR), periodo, indicadores, schemas, env, brand, utils
  routes/        rotas do TanStack Router (só composição)
```

Fluxo: `routes` → `features` → `queries` → `services` → `http` (+ `mappers`/`dtos`).

## Rotas

| Rota | Tela (Figma) | Dados |
| --- | --- | --- |
| `/` | Public / Dashboard | API: `/periodos`, `/cnaes`, `/tipos-indicadores`, `/indicadores` |
| `/indicadores` | Public / Indicators | API: catálogos + `/indicadores` + `/rotas` |
| `/inventario` | Public / Inventário Turístico | simulado |
| `/sobre` | Public / Cadastur & FNRH | estático |

O cabeçalho já aponta para `/relatorios` (D3, #24) e `/admin/login` (D1, #22), que ainda não existem. Esses dois
links usam `<a>` em `components/layout/public-layout.tsx`; troque por `<Link>` quando as rotas forem criadas.

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
- CNAEs e tipos de indicador vêm da API; os temas da página de indicadores (`features/public/temas.ts`) só agrupam
  códigos e ignoram os que não existirem no catálogo.
