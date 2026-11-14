import { Ban, CircleCheck, CircleDashed } from 'lucide-react'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, SourceLinks } from '@/components/ui'
import { descreverUnidade, formatValorObservacao } from '@/lib/format'
import { rotuloTipoReferencia } from '@/lib/referencia'
import type { DadoIndicadorAdmin, Fonte } from '@/models'
import { Item } from './ficha'
import { SituacaoBadges } from './situacao'

/** Valor exato, como recebido; o arredondamento é só da consulta pública. */
export const valorDado = (d: DadoIndicadorAdmin) => formatValorObservacao(d.valor, d.unidade, d.qualificador)

/** "Classificação: Categoria" ou "Sem categoria". */
export const descreverRecorte = (d: DadoIndicadorAdmin) =>
  d.categoria ? `${d.categoria.classificacaoNome}: ${d.categoria.nome}` : 'Sem categoria'

export function LinksFonte({ fonte, className }: { fonte: Fonte; className?: string }) {
  return <SourceLinks links={fonte.links} className={className} />
}

export function SituacaoDado({ dado }: { dado: DadoIndicadorAdmin }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <SituacaoBadges
        status={dado.status}
        arquivado={dado.arquivado}
        bloqueado={dado.divulgacaoBloqueada}
        demonstracao={dado.demonstracao}
      />
      {dado.indicador.arquivado ? <Badge variant="neutral">Indicador arquivado</Badge> : null}
    </span>
  )
}

/** Resumo exibido antes de confirmar uma ação sobre o dado. */
export function ResumoDado({ dado: d }: { dado: DadoIndicadorAdmin }) {
  const linhas = [
    ['Indicador', d.indicador.nome],
    ['Recorte', descreverRecorte(d)],
    ['Referência', d.referencia.rotulo],
    ['Valor', valorDado(d)],
    ['Fonte', d.fonte.nome],
  ]
  return (
    <dl className="grid gap-3 rounded-lg bg-canvas p-4 text-sm">
      {linhas.map(([termo, valor]) => (
        <div key={termo} className="flex justify-between gap-4">
          <dt className="shrink-0 text-ink-muted">{termo}</dt>
          <dd className="min-w-0 break-words text-right text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Ficha completa do dado, sem histórico nem autoria. */
export function FichaDado({ dado: d }: { dado: DadoIndicadorAdmin }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      <Item termo="Indicador" className="sm:col-span-2">
        {d.indicador.nome}
      </Item>
      <Item termo="Unidade (herdada do indicador)">
        {d.unidade.nome}
        <span className="block text-xs text-ink-subtle">{descreverUnidade(d.unidade)}</span>
      </Item>
      <Item termo="Território">{d.territorio.nome}</Item>
      <Item termo="Categoria">
        {d.categoria ? (
          <>
            {d.categoria.nome}
            <span className="block text-xs text-ink-subtle">
              Classificação: {d.categoria.classificacaoNome}
              {d.categoria.codigoCnae ? ` · CNAE ${d.categoria.codigoCnae}` : ''}
            </span>
          </>
        ) : (
          <>
            Sem categoria
            <span className="block text-xs text-ink-subtle">Total informado pela fonte</span>
          </>
        )}
      </Item>
      <Item termo="Referência">
        {d.referencia.rotulo}
        <span className="block text-xs text-ink-subtle">{rotuloTipoReferencia(d.referencia.tipo)}</span>
      </Item>
      <Item termo="Valor exato">
        <span className="break-all text-lg font-bold tabular-nums">{valorDado(d)}</span>
        <span className="block text-xs text-ink-subtle">{d.qualificador === 'maior_que' ? 'Limite (“mais de”)' : 'Igual ao informado'}</span>
      </Item>
      <Item termo="Fonte" className="sm:col-span-2">
        {d.fonte.nome}
        <LinksFonte fonte={d.fonte} className="mt-1" />
      </Item>
      <Item termo="Notas" className="sm:col-span-2">
        {d.notas.length ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink-muted">
            {d.notas.map((nota, i) => (
              <li key={i}>{nota}</li>
            ))}
          </ul>
        ) : (
          <span className="text-ink-muted">Sem notas</span>
        )}
      </Item>
      <Item termo="Origem na fonte" className="sm:col-span-2">
        {d.origens.length ? (
          <ul className="flex flex-col gap-2">
            {d.origens.map((o, i) => (
              <li key={i} className="rounded-lg bg-canvas p-3 text-[13px]">
                <span className="block font-medium text-ink">
                  {[o.arquivo, o.aba && o.celula ? `${o.aba}!${o.celula}` : (o.aba ?? o.celula)].filter(Boolean).join(' · ') ||
                    'Origem sem arquivo informado'}
                </span>
                {o.valorOriginal !== null ? <span className="block text-ink-muted">Valor original: {o.valorOriginal}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-ink-muted">Cadastrado pela administração; sem planilha de origem</span>
        )}
      </Item>
      <Item termo="Identificador" className="sm:col-span-2">
        <span className="break-all font-mono text-[11px] text-ink-subtle">{d.id}</span>
      </Item>
    </dl>
  )
}

/** Motivo de o dado estar fora da consulta pública; vazio quando ele está visível. */
export function motivosForaDaConsulta(d: DadoIndicadorAdmin) {
  const motivos: string[] = []
  if (d.status === 'rascunho') motivos.push('O dado é um rascunho e ainda não foi publicado.')
  if (d.arquivado) motivos.push('O dado está arquivado.')
  if (d.divulgacaoBloqueada) motivos.push(`A divulgação está bloqueada${d.motivoBloqueio ? `: ${d.motivoBloqueio}` : '.'}`)
  if (d.indicador.arquivado) motivos.push('O indicador está arquivado.')
  return motivos
}

export function PainelConsultaPublica({ dado }: { dado: DadoIndicadorAdmin }) {
  const motivos = motivosForaDaConsulta(dado)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Na consulta pública</CardTitle>
        <CardDescription>Visível quando o dado está publicado, ativo, sem bloqueio e de um indicador ativo.</CardDescription>
      </CardHeader>
      <CardContent aria-live="polite">
        {dado.visivelPublicamente ? (
          <p className="flex items-start gap-2 text-sm font-medium text-ink">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            Visível na consulta pública.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-start gap-2 font-medium text-ink">
              <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              Fora da consulta pública.
            </p>
            <ul className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
              {motivos.map((motivo) => (
                <li key={motivo} className="flex items-start gap-2">
                  {motivo.includes('bloqueada') ? <Ban aria-hidden className="mt-0.5 size-3.5 shrink-0 text-danger" /> : null}
                  <span className="min-w-0 break-words">{motivo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
