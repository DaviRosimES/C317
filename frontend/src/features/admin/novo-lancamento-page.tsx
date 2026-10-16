import * as React from 'react'
import { EmptyState, Skeleton } from '@/components/ui'
import type { Lancamento, LancamentoEntrada } from '@/models'
import { useCnaes, useTiposIndicadores } from '@/queries/consulta.queries'
import { useCriarLancamento, useLancamentos, usePublicarLancamento } from '@/queries/lancamento.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { LancamentoForm, type AcaoFormulario } from './lancamento-form'
import { ResultadoLancamento } from './lancamento-resumo'
import { ehConflito, encontrarConflito, rascunhoVazio } from './lancamento-validacao'

const ACOES: AcaoFormulario[] = [
  { rotulo: 'Salvar rascunho', publicar: false, variant: 'secondary' },
  { rotulo: 'Salvar e publicar', publicar: true, variant: 'gradient' },
]

export function NovoLancamentoPage() {
  const tipos = useTiposIndicadores()
  const cnaes = useCnaes()
  const criar = useCriarLancamento()
  const publicar = usePublicarLancamento()
  const [entrada, setEntrada] = React.useState<LancamentoEntrada | null>(null)
  const [salvo, setSalvo] = React.useState<Lancamento | null>(null)
  const [formulario, setFormulario] = React.useState(() => ({ chave: 0, inicial: rascunhoVazio() }))

  // Em caso de duplicidade, localiza o lançamento existente para oferecer a correção.
  const existentes = useLancamentos({}, ehConflito(criar.error))
  const conflito = entrada && ehConflito(criar.error) ? encontrarConflito(existentes.data, entrada) : undefined

  async function salvar(dados: LancamentoEntrada, publicarAgora: boolean) {
    setEntrada(dados)
    publicar.reset()
    const criado = await criar.mutateAsync(dados).catch(() => null)
    if (!criado) return
    const publicado = publicarAgora ? await publicar.mutateAsync(criado.id).catch(() => null) : null
    setSalvo(publicado ?? criado)
  }

  function cadastrarOutro() {
    // Mantém período, fonte e marca de demonstração: lançamentos costumam chegar em lote da mesma fonte.
    setFormulario((atual) => ({ chave: atual.chave + 1, inicial: rascunhoVazio(entrada ?? undefined) }))
    setSalvo(null)
    criar.reset()
    publicar.reset()
  }

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Novo lançamento"
        description="Cadastre o valor pronto de um indicador, com período, recorte e fonte. Publique para exibi-lo na consulta pública."
      />
      {tipos.error || cnaes.error ? (
        <EmptyState
          title="Não foi possível carregar os catálogos"
          description={(tipos.error ?? cnaes.error)?.message}
        />
      ) : tipos.isPending || cnaes.isPending ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : salvo ? (
        <ResultadoLancamento
          lancamento={salvo}
          cnaes={cnaes.data}
          erroPublicacao={publicar.error}
          publicando={publicar.isPending}
          onPublicar={() => publicar.mutate(salvo.id, { onSuccess: setSalvo })}
          continuar={{ rotulo: 'Cadastrar outro', onClick: cadastrarOutro }}
        />
      ) : (
        <LancamentoForm
          key={formulario.chave}
          inicial={formulario.inicial}
          tipos={tipos.data}
          cnaes={cnaes.data}
          acoes={ACOES}
          salvando={criar.isPending || publicar.isPending}
          erro={criar.error}
          conflito={conflito}
          onSalvar={salvar}
        />
      )}
    </AdminContainer>
  )
}
