import { Link } from '@tanstack/react-router'
import { CalendarClock, ExternalLink } from 'lucide-react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Badge, BulletList, Button, Card } from '@/components/ui'
import { FORMULARIOS_HOSPEDAGEM } from './canais'

const ETAPAS = [
  {
    titulo: 'Resposta no formulário externo',
    texto: 'O formulário é do Google Forms e as respostas vão para a equipe do Observatório (SMCELT), não para esta plataforma.',
  },
  {
    titulo: 'Conferência pela equipe',
    texto: 'A equipe confere e consolida as respostas. Não há importação automática para o site.',
  },
  {
    titulo: 'Publicação de resultados agregados',
    texto: 'Somente totais e percentuais consolidados são publicados aqui, sempre com fonte e referência.',
  },
]

export function ContribuaPage() {
  return (
    <PublicContainer>
      <PublicPageHeader
        eyebrow="Contribua"
        title="Envie dados para o Observatório"
        description="Os formulários abaixo são os canais confirmados pelo Observatório do Turismo. Eles abrem no Google Forms, em uma nova aba."
      />

      <section aria-label="Formulários disponíveis" className="grid gap-5 lg:grid-cols-2">
        {FORMULARIOS_HOSPEDAGEM.map((formulario) => (
          <Card key={formulario.href} className="flex flex-col gap-3 p-6">
            <Badge variant="info" className="self-start">
              Hospedagem
            </Badge>
            <h2 className="text-xl font-bold text-ink">{formulario.titulo}</h2>
            <p className="text-sm text-ink-muted">{formulario.publico}</p>
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <CalendarClock aria-hidden className="size-4 shrink-0 text-brand-purple" />
              {formulario.frequencia}
            </p>
            <p className="text-[13px] text-ink-muted">{formulario.finalidade}</p>
            <p className="text-[13px] text-ink-muted">{formulario.continuidade}</p>
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <Button asChild variant="gradient" className="w-full sm:w-auto">
                <a href={formulario.href} target="_blank" rel="noreferrer" aria-label={`Abrir formulário no Google Forms (nova aba): ${formulario.titulo}`}>
                  <ExternalLink aria-hidden />
                  Abrir formulário
                </a>
              </Button>
              <span className="text-center text-xs text-ink-muted sm:text-left">Google Forms · nova aba</span>
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="como-funciona" className="flex flex-col gap-4">
        <h2 id="como-funciona" className="text-lg font-semibold text-ink">
          Como as respostas viram dados públicos
        </h2>
        <ol className="grid gap-4 lg:grid-cols-3">
          {ETAPAS.map((etapa, i) => (
            <li key={etapa.titulo} className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-bold text-brand-purple">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{etapa.titulo}</p>
                <p className="mt-1 text-[13px] text-ink-muted">{etapa.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Card className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold text-ink">Privacidade e amostra</h2>
          <BulletList className="mt-3 space-y-2">
            <li>Respostas individuais, receitas e informações de hóspedes não são publicadas.</li>
            <li>
              Os resultados representam os estabelecimentos que responderam; a cobertura de cada dado aparece nas notas da
              consulta.
            </li>
            <li>
              Quando a pesquisa exige um número mínimo de respondentes, recortes abaixo desse mínimo não são divulgados.
            </li>
            <li>
              O próprio formulário pede autorizações separadas para divulgar o estabelecimento no site oficial de turismo e para
              o uso estatístico das informações.
            </li>
          </BulletList>
        </div>
        <div className="rounded-xl bg-canvas p-5">
          <p className="text-[13px] font-semibold text-brand-purple">Importante</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            Esta plataforma não recebe as respostas automaticamente e não tem integração com o Cadastur ou o FNRH Digital.
          </p>
          <Button asChild variant="link" className="mt-2 h-auto px-0">
            <Link to="/sobre">Orientações sobre Cadastur e FNRH</Link>
          </Button>
        </div>
      </Card>
    </PublicContainer>
  )
}
