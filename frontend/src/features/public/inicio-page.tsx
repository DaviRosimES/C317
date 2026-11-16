import { Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, FileText, Info } from 'lucide-react'
import { PublicContainer } from '@/components/layout/public-layout'
import { Button } from '@/components/ui'
import { SETORES_DO_OBSERVATORIO } from './setores-observatorio'

const ACESSOS = [
  {
    to: '/indicadores',
    titulo: 'Consultar indicadores',
    descricao: 'Escolha Setor e Ano/Período e veja dados, gráficos e tabela de cada indicador, com referência e fonte.',
    icone: BarChart3,
  },
  {
    to: '/relatorios',
    titulo: 'Acessar relatórios',
    descricao: 'Abra os relatórios e documentos publicados pelo Observatório.',
    icone: FileText,
  },
  {
    to: '/sobre',
    titulo: 'Conheça o Observatório',
    descricao: 'Origem, finalidade, setores, fontes e como ler os dados.',
    icone: Info,
  },
] as const

/** Início institucional: apresenta a plataforma e leva às áreas; a consulta fica em Indicadores. */
export function InicioPage() {
  return (
    <>
      <section aria-labelledby="inicio-titulo" className="bg-brand-gradient">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-14 md:px-16 md:py-20">
          <h1 id="inicio-titulo" className="max-w-3xl text-[30px] font-bold leading-tight tracking-tight text-on-brand md:text-[40px]">
            Observatório de Santa Rita do Sapucaí
          </h1>
          <p className="max-w-2xl text-base text-on-brand-muted">
            Consulte dados e pesquisas sobre Santa Rita do Sapucaí. Escolha um Setor do Observatório e um Ano/Período para
            consultar os indicadores disponíveis, com suas referências e fontes.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link to="/indicadores">
                Consultar indicadores
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicContainer className="gap-12">
        <nav aria-label="Acessos do Observatório">
          <ul className="grid gap-4 md:grid-cols-3">
            {ACESSOS.map(({ to, titulo, descricao, icone: Icone }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-card transition-colors hover:border-brand-purple/40 focus-visible:shadow-focus"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-brand-purple">
                    <Icone aria-hidden className="size-5" />
                  </span>
                  <span className="flex items-center gap-1 text-base font-semibold text-ink group-hover:text-brand-purple">
                    {titulo}
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                  <span className="text-sm text-ink-muted">{descricao}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="inicio-origem" className="flex max-w-3xl flex-col gap-3">
          <h2 id="inicio-origem" className="text-lg font-semibold text-ink">
            Origem
          </h2>
          <p className="text-sm text-ink-muted">
            A iniciativa teve origem no trabalho do Observatório do Turismo e ampliou sua organização para outros setores de
            informação do município. A plataforma aproxima informações de diferentes fontes, preservando o contexto necessário
            para compreender cada resultado.
          </p>
        </section>

        <section aria-labelledby="inicio-setores" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="inicio-setores" className="text-lg font-semibold text-ink">
              Setores do Observatório
            </h2>
            <p className="text-sm text-ink-muted">Os indicadores são organizados nestes setores, usados como filtro na consulta.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SETORES_DO_OBSERVATORIO.map((setor) => (
              <li key={setor.nome} className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">
                <strong className="block font-semibold text-ink">{setor.nome}</strong>
                <span className="block first-letter:uppercase">{setor.descricao}</span>
              </li>
            ))}
          </ul>
        </section>
      </PublicContainer>
    </>
  )
}
