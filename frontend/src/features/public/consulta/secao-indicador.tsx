import type { SecaoIndicador as Secao } from '@/lib/observacoes'
import type { Observacao, Territorio } from '@/models'
import { ComparativoBloco } from './comparativo-bloco'
import { ForaDoFiltro } from './metadados'
import { ObservacaoCard } from './observacao-card'
import { RecorteBloco } from './recorte-bloco'
import { SerieBloco } from './serie-bloco'

interface SecaoIndicadorProps {
  secao: Secao
  territorioPrincipal: Territorio | null
  filtroDeRecorte: boolean
  alcancada: (o: Observacao) => boolean
}

export function SecaoIndicador({ secao, territorioPrincipal, filtroDeRecorte, alcancada }: SecaoIndicadorProps) {
  const foraDoFiltro = filtroDeRecorte && !secao.observacoes.some(alcancada)
  const acumulados = secao.observacoes.filter((o) => o.referencia.tipo === 'acumulada')
  const marcarFora = (observacoes: Observacao[]) => filtroDeRecorte && !foraDoFiltro && !observacoes.some(alcancada)

  return (
    <section aria-labelledby={`indicador-${secao.codigo}`} className="flex flex-col gap-4 border-t border-line pt-8 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`indicador-${secao.codigo}`} className="text-xl font-bold text-ink">
          {secao.nome}
        </h2>
        {foraDoFiltro ? <ForaDoFiltro /> : null}
      </div>

      {secao.series.length ? (
        <SerieBloco indicador={secao.nome} series={secao.series} acumulados={acumulados} territorioInicial={territorioPrincipal} />
      ) : null}
      {secao.comparativo ? <ComparativoBloco indicador={secao.nome} comparativo={secao.comparativo} /> : null}
      {secao.recortes.map((grupo) => (
        <RecorteBloco key={grupo.chave} grupo={grupo} foraDoFiltro={marcarFora(grupo.observacoes)} />
      ))}
      {secao.avulsas.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {secao.avulsas.map((o) => (
            <ObservacaoCard key={o.id} observacao={o} foraDoFiltro={marcarFora([o])} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
