import { Link } from '@tanstack/react-router'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Button, Card } from '@/components/ui'

const ORIENTACOES = [
  {
    sigla: 'C',
    cor: 'bg-brand-blue',
    titulo: 'Cadastur',
    resumo: 'Cadastro obrigatório para prestadores de serviços turísticos previstos em lei.',
    detalhe: 'Entenda quem precisa se cadastrar, benefícios e onde realizar o cadastro.',
    href: 'https://cadastur.turismo.gov.br/',
    destaque: true,
  },
  {
    sigla: 'F',
    cor: 'bg-brand-purple',
    titulo: 'FNRH Digital',
    resumo: 'Ficha Nacional de Registro de Hóspedes em formato digital.',
    detalhe: 'Orientações de uso e acesso aos canais oficiais, sem integração direta com sistemas federais.',
    href: 'https://www.gov.br/turismo/pt-br/assuntos/fnrh',
    destaque: false,
  },
]

export function SobrePage() {
  return (
    <PublicContainer className="md:py-16">
      <PublicPageHeader
        title="Regularização e informação para o setor"
        description="Conteúdo institucional para apoiar hotéis, pousadas e demais estabelecimentos no acesso a informações oficiais."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {ORIENTACOES.map((item) => (
          <Card key={item.titulo} className="flex flex-col gap-3 p-6">
            <span aria-hidden className={`flex size-12 items-center justify-center rounded-lg text-base font-bold text-white ${item.cor}`}>
              {item.sigla}
            </span>
            <h2 className="mt-3 text-xl font-bold text-ink">{item.titulo}</h2>
            <p className="text-sm text-ink-muted">{item.resumo}</p>
            <p className="text-[13px] text-ink-muted">{item.detalhe}</p>
            <Button asChild variant={item.destaque ? 'gradient' : 'secondary'} className="mt-2 self-start">
              <a href={item.href} target="_blank" rel="noreferrer">
                Acessar orientação
              </a>
            </Button>
          </Card>
        ))}
      </div>

      <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold text-ink">Por que esta seção existe?</h2>
          <p className="mt-3 text-sm text-ink-muted">
            O Observatório também pode funcionar como ponto de apoio para a profissionalização do turismo local. Nesta fase, a
            plataforma centraliza orientações e links oficiais, sem depender de integrações complexas.
          </p>
        </div>
        <div className="rounded-xl bg-canvas p-5">
          <p className="text-[13px] font-semibold text-brand-purple">Importante</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            As informações oficiais devem ser revisadas periodicamente antes da publicação.
          </p>
        </div>
      </Card>

      <Button asChild variant="secondary" className="self-start">
        <Link to="/">Voltar ao dashboard</Link>
      </Button>
    </PublicContainer>
  )
}
