import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { dominioDoLink } from '@/lib/format'
import { useFontesPublicas } from '@/queries/fonte-consulta.queries'
import { ORIENTACOES } from './canais'

const SETORES = [
  { nome: 'Dados gerais', descricao: 'população, território, empresas, educação e indicadores econômicos.' },
  { nome: 'Turismo', descricao: 'meios de hospedagem, unidades habitacionais informadas e empreendimentos cadastrados.' },
  { nome: 'Economia criativa', descricao: 'cadastros de atividades criativas e percepção da cidade nas pesquisas recebidas.' },
  { nome: 'Eventos', descricao: 'resultados das pesquisas do Observatório sobre eventos realizados no município.' },
  {
    nome: 'Pesquisa e inovação',
    descricao: 'depósitos e concessões de patentes, com referências anuais e acumuladas.',
  },
  { nome: 'Vale da Eletrônica', descricao: 'dados sobre a indústria e o segmento de eletroeletrônicos.' },
]

function LinkExterno({ href, rotulo, children }: { href: string; rotulo: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${rotulo}, abre em nova aba`}
      className="inline-flex max-w-full items-center gap-1 text-[13px] font-medium text-brand-purple underline-offset-4 hover:underline"
    >
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </a>
  )
}

const rotuloIndicadores = (quantidade: number) => (quantidade === 1 ? '1 indicador' : `${quantidade} indicadores`)

/** Fontes dos dados publicados, lidas de GET /consulta/fontes (a API já aplica a elegibilidade). */
function FontesDeDados() {
  const fontes = useFontesPublicas()
  if (fontes.isPending) return <Skeleton className="h-40 rounded-2xl" />
  if (fontes.error) return <EmptyState title="Não foi possível carregar as fontes" description={fontes.error.message} />

  if (!fontes.data.length) {
    return <EmptyState title="Nenhuma fonte com dados publicados" description="As fontes aparecem aqui quando a equipe publica os dados." />
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {fontes.data.map((fonte) => (
        <li key={fonte.codigo} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <p className="break-words text-sm font-semibold text-ink">{fonte.nome}</p>
          <p className="text-xs text-ink-muted">{rotuloIndicadores(fonte.indicadores)}</p>
          {fonte.links.length ? (
            fonte.links.map((link) => (
              <LinkExterno key={link} href={link} rotulo={`Fonte ${fonte.nome}: ${dominioDoLink(link)}`}>
                {dominioDoLink(link)}
              </LinkExterno>
            ))
          ) : (
            <p className="text-xs text-ink-subtle">Documento identificado pelo nome, sem link público.</p>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SobrePage() {
  return (
    <PublicContainer className="md:py-16">
      <PublicPageHeader
        eyebrow="Sobre"
        title="Observatório de Santa Rita do Sapucaí"
        description="O Observatório reúne informações sobre Santa Rita do Sapucaí para apoiar a consulta e o conhecimento do município. Moradores, empreendedores, estudantes, pesquisadores e o poder público podem explorar indicadores e acessar relatórios das pesquisas disponíveis."
      />

      <section aria-labelledby="origem" className="flex flex-col gap-3">
        <h2 id="origem" className="text-lg font-semibold text-ink">
          Origem
        </h2>
        <p className="text-sm text-ink-muted">
          A iniciativa teve origem no trabalho do Observatório do Turismo e ampliou sua organização para outros setores de
          informação do município. A plataforma aproxima informações de diferentes fontes, preservando o contexto necessário
          para compreender cada resultado.
        </p>
      </section>

      <section aria-labelledby="setores" className="flex flex-col gap-4">
        <h2 id="setores" className="text-lg font-semibold text-ink">
          Setores do Observatório
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {SETORES.map((setor) => (
            <li key={setor.nome} className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">
              <strong className="font-semibold text-ink">{setor.nome}:</strong> {setor.descricao}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="como-ler" className="flex flex-col gap-3">
        <h2 id="como-ler" className="text-lg font-semibold text-ink">
          Como ler os dados
        </h2>
        <p className="text-sm text-ink-muted">
          Os filtros Setor e Ano/Período mostram os indicadores que possuem dados disponíveis para sua seleção. Cada indicador
          explica o que está sendo medido e sua unidade. Seus dados apresentam valores para uma referência, uma fonte e, quando
          houver, uma categoria específica.
        </p>
        <p className="text-sm text-ink-muted">
          Consulte a fonte, o período e as notas antes de comparar resultados. Uma pesquisa pode representar apenas seus
          entrevistados ou os estabelecimentos que responderam ao levantamento. Um valor zero é diferente da ausência de
          informação.
        </p>
      </section>

      <section aria-labelledby="fontes" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h2 id="fontes" className="text-lg font-semibold text-ink">
            Fontes
          </h2>
          <p className="text-sm text-ink-muted">
            Os dados são fornecidos em valores consolidados, a partir de bases institucionais, cadastros e pesquisas. Cada
            resultado identifica sua fonte e apresenta um link quando ele está disponível.
          </p>
        </div>
        <FontesDeDados />
      </section>

      <section aria-labelledby="instituicoes" className="flex flex-col gap-3">
        <h2 id="instituicoes" className="text-lg font-semibold text-ink">
          Instituições participantes
        </h2>
        <p className="text-sm text-ink-muted">
          A iniciativa é da Prefeitura de Santa Rita do Sapucaí, por meio da Secretaria Municipal de Cultura, Esporte, Lazer e
          Turismo (SMCELT), com desenvolvimento acadêmico de estudantes do Inatel no projeto HEIComp 2026.2. O conteúdo sobre o
          Vale da Eletrônica conta com a contribuição da Secretaria de Ciência, Tecnologia e Desenvolvimento Econômico.
        </p>
      </section>

      <section aria-labelledby="participacao" className="flex flex-col gap-3 rounded-2xl bg-canvas p-6">
        <h2 id="participacao" className="text-lg font-semibold text-ink">
          Participação
        </h2>
        <p className="text-sm text-ink-muted">
          O conhecimento sobre a cidade pode crescer com a contribuição da comunidade. Conheça os canais disponíveis para
          fornecer informações do seu empreendimento ao Observatório.
        </p>
        <Button asChild variant="primary" className="mt-1 self-start">
          <Link to="/contribua">Conhecer os canais de contribuição</Link>
        </Button>
      </section>

      <section aria-labelledby="orientacoes-hospedagem" className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex flex-col gap-1">
          <h2 id="orientacoes-hospedagem" className="text-sm font-semibold text-ink-muted">
            Orientações para meios de hospedagem
          </h2>
          <p className="text-xs text-ink-subtle">
            Canais oficiais externos. A plataforma não tem integração com eles.
          </p>
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {ORIENTACOES.map((item) => (
            <li key={item.titulo} className="flex flex-col gap-1 p-4">
              <p className="text-[13px] font-semibold text-ink">{item.titulo}</p>
              <p className="text-xs text-ink-muted">{item.resumo}</p>
              <p className="text-xs text-ink-muted">{item.detalhe}</p>
              <div className="mt-1">
                <LinkExterno href={item.href} rotulo={`${item.titulo}, site oficial`}>
                  Acessar o site oficial
                </LinkExterno>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </PublicContainer>
  )
}
