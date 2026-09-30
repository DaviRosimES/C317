# Observatório do Turismo SRS — Front-end

SPA em React para o Observatório do Turismo de Santa Rita do Sapucaí.

## Stack

- **React 19 + Vite + TypeScript**
- **TanStack Router** — roteamento por arquivos em `src/routes` (a árvore `src/routeTree.gen.ts` é gerada automaticamente pelo plugin do Vite; não edite à mão)
- **Zod** — validação de env, search params e formulários (`src/lib/schemas.ts`, `src/lib/env.ts`)
- **Radix UI** (`radix-ui`) — primitivas acessíveis (Select, ToggleGroup, Label, Slot)
- **Tailwind CSS v4** — tokens em `src/styles/globals.css` (`@theme`)
- **Inter** via `@fontsource-variable/inter` (self-hosted)

## Rodando

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção
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

Neutros: `canvas`, `surface`, `surface-muted`, `ink`, `ink-muted`, `ink-subtle`, `line`.
Feedback: `success`, `danger`, `warning`. Destaque: `bg-brand-gradient` (usar com parcimônia).
Para gráficos, use `chartPalette` de `src/lib/brand.ts`.

## Componentes-base (`src/components/ui`)

| Componente                         | Uso no Figma                                   |
| ---------------------------------- | ---------------------------------------------- |
| `Button` (`primary`, `secondary`…) | "Explorar indicadores", "Baixar relatório"     |
| `Select*`                          | Seletor de período "Jan — Dez 2026"            |
| `Label` / `FormField`              | Rótulo "PERÍODO", campos com erro do zod       |
| `FilterChips` / `FilterChip`       | Hospedagem · Empregos · Empresas               |
| `StatCard`                         | "Empresas do setor", "Leitos disponíveis"      |
| `Card*`                            | Card "Princípios de interface"                 |
| `PageHero`                         | Faixa com gradiente do topo                    |
| `SectionTitle`, `BulletList`, `Input` | Apoio                                       |

Importe tudo de `@/components/ui`.

## Estrutura

```
src/
  components/ui/   componentes-base
  lib/             utils (cn), format (pt-BR), brand, env, schemas (zod)
  routes/          rotas do TanStack Router
  styles/          globals.css (tokens + Tailwind)
```
