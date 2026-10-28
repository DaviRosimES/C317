import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { dominioDoLink } from '@/lib/format'
import { useCatalogosObservacoes } from '@/queries/observacao.queries'
import { ORIENTACOES, SRI_LINK } from './canais'

function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-[13px] font-medium text-brand-purple underline-offset-4 hover:underline"
    >
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </a>
  )
}

/** Fontes das observações publicadas, lidas do catálogo da API. */
function FontesDeDados() {
  const catalogos = useCatalogosObservacoes()
  if (catalogos.isPending) return <Skeleton className="h-40 rounded-2xl" />
  if (catalogos.error) return <EmptyState title="Não foi possível carregar as fontes" description={catalogos.error.message} />

  const fontes = catalogos.data.fontes.filter((fonte) => fonte.comDadosPublicados)
  if (!fontes.length) {
    return <EmptyState title="Nenhuma fonte com dados publicados" description="As fontes aparecem aqui quando a equipe publica os dados." />
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {fontes.map((fonte) => (
        <li key={fonte.codigo} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <p className="break-words text-sm font-medium text-ink">{fonte.nome}</p>
          {fonte.links.length ? (
            fonte.links.map((link) => (
              <LinkExterno key={link} href={link}>
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
        title="Regularização e informação para o setor"
        description="Conteúdo institucional para apoiar hotéis, pousadas e demais estabelecimentos no acesso a informações oficiais, e as fontes dos dados publicados."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {ORIENTACOES.map((item, i) => (
          <Card key={item.titulo} className="flex flex-col gap-3 p-6">
            <span aria-hidden className={`flex size-12 items-center justify-center rounded-lg text-base font-bold text-white ${item.cor}`}>
              {item.sigla}
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink">{item.titulo}</h2>
            <p className="text-sm text-ink-muted">{item.resumo}</p>
            <p className="text-[13px] text-ink-muted">{item.detalhe}</p>
            <Button asChild variant={i === 0 ? 'gradient' : 'secondary'} className="mt-2 self-start">
              <a href={item.href} target="_blank" rel="noreferrer">
                Acessar orientação
              </a>
            </Button>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-semibold text-ink">Sistema Regional de Inovação (SRI) do Sul de Minas</h2>
        <p className="text-sm text-ink-muted">
          Parte dos indicadores de pesquisa e inovação é informada para o SRI do Sul de Minas e para outros municípios da
          região, o que permite comparações com Santa Rita do Sapucaí. Esses valores aparecem como território próprio, com
          fonte e referência, e não são somados aos do município.
        </p>
        <LinkExterno href={SRI_LINK.href}>{SRI_LINK.rotulo}</LinkExterno>
      </Card>

      <section aria-labelledby="fontes-de-dados" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="fontes-de-dados" className="text-lg font-semibold text-ink">
            Fontes de dados
          </h2>
          <p className="text-sm text-ink-muted">
            Bases, pesquisas e documentos dos valores publicados. O Observatório recebe os valores prontos; a plataforma não
            calcula indicadores nem se conecta automaticamente a essas bases.
          </p>
        </div>
        <FontesDeDados />
      </section>

      <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold text-ink">Por que esta seção existe?</h2>
          <p className="mt-3 text-sm text-ink-muted">
            O Observatório também pode funcionar como ponto de apoio para a profissionalização do turismo local. Nesta fase, a
            plataforma centraliza orientações e links oficiais, sem depender de integrações complexas.
          </p>
        </div>
        <div className="rounded-xl bg-canvas p-5">
          <p className="text-[13px] font-semibold text-brand-purple">Responsável por um meio de hospedagem?</p>
          <p className="mt-2 text-[13px] text-ink-muted">Veja os formulários do Observatório e como os dados são publicados.</p>
          <Button asChild variant="link" className="mt-2 h-auto px-0">
            <Link to="/contribua">Ir para Contribua</Link>
          </Button>
        </div>
      </Card>
    </PublicContainer>
  )
}
