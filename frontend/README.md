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

Importe tudo de `@/components/ui`.

## Estrutura

```
src/
  components/ui/   componentes-base
  lib/             utils (cn), format (pt-BR), brand, env, schemas (zod)
  routes/          rotas do TanStack Router
  styles/          globals.css (tokens + Tailwind)
```
