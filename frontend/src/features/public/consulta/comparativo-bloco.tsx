import * as React from 'react'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  FormField,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { fontesDistintas, linhasDoComparativo, notasDe, referenciaKey, valorNumerico, type Comparativo } from '@/lib/observacoes'
import { rotuloTipoReferencia } from '@/lib/referencia'
import type { Observacao, ReferenciaRotulada } from '@/models'
import { FonteObservacao, NotasObservacao, valorTexto } from './metadados'

function referenciaInicial(comparativo: Comparativo) {
  const cidades = (r: ReferenciaRotulada) =>
    new Set(comparativo.observacoes.filter((o) => referenciaKey(o.referencia) === referenciaKey(r)).map((o) => o.territorio.codigo)).size
  return [...comparativo.referencias].sort(
    (a, b) =>
      cidades(b) - cidades(a) ||
      Number(b.tipo === 'acumulada') - Number(a.tipo === 'acumulada') ||
      b.anoFim - b.anoInicio - (a.anoFim - a.anoInicio) ||
      b.anoFim - a.anoFim,
  )[0]
}

export function ComparativoBloco({ indicador, comparativo }: { indicador: string; comparativo: Comparativo }) {
  const [referencia, setReferencia] = React.useState(() => referenciaKey(referenciaInicial(comparativo)))
  const [cidades, setCidades] = React.useState(() => new Set(comparativo.territorios.map((t) => t.codigo)))
  const [linhaEscolhida, setLinhaEscolhida] = React.useState<string>()

  const daReferencia = comparativo.observacoes.filter((o) => referenciaKey(o.referencia) === referencia)
  const linhas = linhasDoComparativo(daReferencia)
  const linha = linhas.find((l) => l.chave === linhaEscolhida) ?? linhas[0]
  const territorios = comparativo.territorios.filter((t) => cidades.has(t.codigo))
  const valores = territorios.map((t) => ({ territorio: t, observacao: linha?.observacoes.find((o) => o.territorio.codigo === t.codigo) }))
  const disponiveis = valores.filter((v): v is { territorio: typeof v.territorio; observacao: Observacao } => !!v.observacao)
  const indisponiveis = valores.filter((v) => !v.observacao).map((v) => v.territorio.nome)
  const exibidas = disponiveis.map((v) => v.observacao)
  const referenciaAtual = daReferencia[0]?.referencia
  const tiposDeReferencia = [...new Set(comparativo.referencias.map((r) => r.tipo))]
  const id = `comparativo-${indicador}`

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-base">Comparativo entre cidades</CardTitle>
        <CardDescription>
          Cada barra é um valor publicado para a cidade na mesma referência e unidade. Valores de referências diferentes não
          são misturados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Referência" labelVariant="field" htmlFor={`${id}-referencia`}>
            <Select
              value={referencia}
              onValueChange={(valor) => {
                setReferencia(valor)
                setLinhaEscolhida(undefined)
              }}
            >
              <SelectTrigger id={`${id}-referencia`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDeReferencia.map((tipo) => (
                  <SelectGroup key={tipo}>
                    <SelectLabel>{rotuloTipoReferencia(tipo)}</SelectLabel>
                    {comparativo.referencias
                      .filter((r) => r.tipo === tipo)
                      .map((r) => (
                        <SelectItem key={referenciaKey(r)} value={referenciaKey(r)}>
                          {r.rotulo}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {linhas.length > 1 ? (
            <FormField label="Recorte" labelVariant="field" htmlFor={`${id}-recorte`}>
              <Select value={linha?.chave} onValueChange={setLinhaEscolhida}>
                <SelectTrigger id={`${id}-recorte`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {linhas.map((l) => (
                    <SelectItem key={l.chave} value={l.chave}>
                      {l.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-ink-muted">Cidades comparadas</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {comparativo.territorios.map((t) => (
              <div key={t.codigo} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-${t.codigo}`}
                  checked={cidades.has(t.codigo)}
                  onCheckedChange={(marcado) =>
                    setCidades((atual) => {
                      const proximo = new Set(atual)
                      if (marcado === true) proximo.add(t.codigo)
                      else proximo.delete(t.codigo)
                      return proximo
                    })
                  }
                />
                <Label htmlFor={`${id}-${t.codigo}`} variant="field" className="text-[13px] text-ink">
                  {t.nome}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>

        {referenciaAtual ? (
          <p className="text-xs font-semibold text-brand-purple">
            Referência: {referenciaAtual.rotulo}
            {linha ? ` · ${linha.rotulo}` : ''}
          </p>
        ) : null}

        {disponiveis.length ? (
          <HorizontalBars
            data={[...disponiveis].sort((a, b) => valorNumerico(b.observacao) - valorNumerico(a.observacao)).map(({ territorio, observacao }) => ({
              key: territorio.codigo,
              label: territorio.nome,
              valor: valorNumerico(observacao),
              rotulo: valorTexto(observacao),
              title: observacao.categoria?.nome,
            }))}
          />
        ) : (
          <p className="text-[13px] text-ink-muted">Nenhuma das cidades selecionadas tem valor nesta referência.</p>
        )}
        {indisponiveis.length ? (
          <p className="text-xs text-ink-muted">Indisponível nesta referência: {indisponiveis.join(', ')}.</p>
        ) : null}
        {fontesDistintas(exibidas).length > 1 ? (
          <Alert variant="info">
            As cidades vêm de fontes diferentes. Compare pela fonte de cada linha da tabela; os valores não são somados.
          </Alert>
        ) : null}

        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium text-brand-purple">Ver dados em tabela</summary>
          <DataTable
            className="mt-3"
            caption={`${indicador}: comparativo entre cidades`}
            columns={[
              { key: 'cidade', header: 'Cidade' },
              { key: 'valor', header: 'Valor', align: 'right' },
              { key: 'recorte', header: 'Recorte' },
              { key: 'fonte', header: 'Fonte' },
            ]}
            rows={valores.map(({ territorio, observacao }) => ({
              key: territorio.codigo,
              cells: {
                cidade: territorio.nome,
                valor: observacao ? valorTexto(observacao) : 'Indisponível',
                recorte: observacao?.categoria?.nome ?? (observacao ? 'Total' : '—'),
                fonte: observacao?.fonte.nome ?? '—',
              },
            }))}
          />
        </details>
        <FonteObservacao fontes={fontesDistintas(exibidas)} />
        <NotasObservacao titulo="Notas, método e ressalvas" notas={notasDe(exibidas)} />
      </CardContent>
    </Card>
  )
}
