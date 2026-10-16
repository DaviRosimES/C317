import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import { Alert, Button, EmptyState, Skeleton } from '@/components/ui'
import { formatPeriodo } from '@/lib/periodo'
import type { Lancamento, LancamentoEntrada } from '@/models'
import { useCnaes, useTiposIndicadores } from '@/queries/consulta.queries'
import {
  useAtualizarLancamento,
  useLancamento,
  useLancamentos,
  usePublicarLancamento,
} from '@/queries/lancamento.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { LancamentoForm, type AcaoFormulario } from './lancamento-form'
import { ResultadoLancamento, StatusBadge } from './lancamento-resumo'
import { ehConflito, encontrarConflito, rascunhoDe } from './lancamento-validacao'

const ACOES_RASCUNHO: AcaoFormulario[] = [
  { rotulo: 'Salvar alterações', publicar: false, variant: 'secondary' },
  { rotulo: 'Salvar e publicar', publicar: true, variant: 'gradient' },
]
const ACOES_PUBLICADO: AcaoFormulario[] = [{ rotulo: 'Salvar correção', publicar: false, variant: 'gradient' }]

export function EditarLancamentoPage({ id }: { id: number }) {
  const lancamento = useLancamento(id)
  const tipos = useTiposIndicadores()
  const cnaes = useCnaes()
  const atualizar = useAtualizarLancamento()
  const publicar = usePublicarLancamento()
  const [entrada, setEntrada] = React.useState<LancamentoEntrada | null>(null)
  const [salvo, setSalvo] = React.useState<Lancamento | null>(null)
  const [versaoFormulario, setVersaoFormulario] = React.useState(0)

  const existentes = useLancamentos({}, ehConflito(atualizar.error))
  const conflito = entrada && ehConflito(atualizar.error) ? encontrarConflito(existentes.data, entrada, id) : undefined

  async function salvar(dados: LancamentoEntrada, publicarAgora: boolean) {
    setEntrada(dados)
    publicar.reset()
    const atualizado = await atualizar.mutateAsync({ id, entrada: dados }).catch(() => null)
    if (!atualizado) return
    const publicado = publicarAgora ? await publicar.mutateAsync(id).catch(() => null) : null
    setSalvo(publicado ?? atualizado)
  }

  function continuarEditando() {
    setVersaoFormulario((versao) => versao + 1)
    setSalvo(null)
    atualizar.reset()
    publicar.reset()
  }

  const erro = lancamento.error ?? tipos.error ?? cnaes.error
  const naoEncontrado = lancamento.error instanceof ApiError && lancamento.error.status === 404

  if (!lancamento.isSuccess || !tipos.isSuccess || !cnaes.isSuccess) {
    return (
      <AdminContainer>
        <AdminPageHeader title="Editar lançamento" />
        {erro ? (
          <EmptyState
            title={naoEncontrado ? 'Lançamento não encontrado' : 'Não foi possível carregar o lançamento'}
            description={naoEncontrado ? 'Ele pode ter sido removido ou o endereço está incorreto.' : erro.message}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/lancamentos">Voltar aos lançamentos</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        )}
      </AdminContainer>
    )
  }

  const atual = lancamento.data
  return (
    <AdminContainer>
      <AdminPageHeader
        title="Editar lançamento"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {atual.nome} · {formatPeriodo(atual.periodo, 'longo')}
            <StatusBadge status={atual.status} />
          </span>
        }
      />
      {salvo ? (
        <ResultadoLancamento
          lancamento={salvo}
          cnaes={cnaes.data}
          erroPublicacao={publicar.error}
          publicando={publicar.isPending}
          onPublicar={() => publicar.mutate(salvo.id, { onSuccess: setSalvo })}
          continuar={{ rotulo: 'Continuar editando', onClick: continuarEditando }}
        />
      ) : atual.escopo === 'estabelecimento' ? (
        <EmptyState
          title="Lançamento de estabelecimento"
          description="Lançamentos por estabelecimento não são editados por este formulário e não aparecem na consulta pública."
        />
      ) : (
        <>
          {atual.status === 'publicado' ? (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <p>Este lançamento está publicado: a correção aparece imediatamente na consulta pública.</p>
            </Alert>
          ) : null}
          <LancamentoForm
            // Recriado ao continuar editando, já com os dados salvos.
            key={versaoFormulario}
            inicial={rascunhoDe(atual)}
            tipos={tipos.data}
            cnaes={cnaes.data}
            acoes={atual.status === 'publicado' ? ACOES_PUBLICADO : ACOES_RASCUNHO}
            salvando={atualizar.isPending || publicar.isPending}
            erro={atualizar.error}
            conflito={conflito}
            onSalvar={salvar}
          />
        </>
      )}
    </AdminContainer>
  )
}
