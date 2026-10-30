import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, FileClock } from 'lucide-react'
import { Alert, Button, Card, CardContent, EmptyState, Skeleton } from '@/components/ui'
import type { ObservacaoAdmin, ObservacaoEntrada } from '@/models'
import { useCriarObservacao, useObservacoesAdmin, usePublicarObservacao } from '@/queries/admin-observacao.queries'
import { useCnaes } from '@/queries/consulta.queries'
import { useCatalogosObservacoes } from '@/queries/observacao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { ObservacaoForm } from './observacao-form'
import { ConsultaPublicaObservacao, FichaObservacao } from './observacao-resumo'
import { ehConflito, mesmaIdentidade, rascunhoDoLote, rascunhoVazio, type ObservacaoRascunho } from './observacao-validacao'

export function NovaObservacaoPage() {
  const catalogos = useCatalogosObservacoes()
  const cnaes = useCnaes()
  const criar = useCriarObservacao()
  const publicar = usePublicarObservacao()
  const [entrada, setEntrada] = React.useState<ObservacaoEntrada | null>(null)
  const [salva, setSalva] = React.useState<ObservacaoAdmin | null>(null)
  const [formulario, setFormulario] = React.useState(() => ({ chave: 0, inicial: rascunhoVazio() }))
  const ultimoRascunho = React.useRef<ObservacaoRascunho | null>(null)

  // Em caso de duplicidade, localiza a observação existente para oferecer a correção.
  const duplicada = !!entrada && ehConflito(criar.error)
  const existentes = useObservacoesAdmin(
    entrada
      ? {
          indicadores: [entrada.indicadorCodigo],
          territorios: [entrada.territorioCodigo],
          referenciaTipos: [entrada.referencia.tipo],
          anoInicio: entrada.referencia.anoInicio,
          anoFim: entrada.referencia.anoFim,
        }
      : {},
    duplicada,
  )
  const conflito = duplicada && entrada ? existentes.data?.find((o) => mesmaIdentidade(o, entrada)) : undefined

  async function salvar(dados: ObservacaoEntrada, publicarAgora: boolean, rascunho: ObservacaoRascunho) {
    setEntrada(dados)
    ultimoRascunho.current = rascunho
    publicar.reset()
    const criada = await criar.mutateAsync(dados).catch(() => null)
    if (!criada) return
    const publicada = publicarAgora ? await publicar.mutateAsync(criada.id).catch(() => null) : null
    setSalva(publicada ?? criada)
  }

  function cadastrarOutra() {
    // Observações costumam chegar em lote da mesma fonte e território; a referência é informada de novo.
    const anterior = ultimoRascunho.current
    setFormulario((atual) => ({ chave: atual.chave + 1, inicial: anterior ? rascunhoDoLote(anterior) : rascunhoVazio() }))
    setSalva(null)
    criar.reset()
    publicar.reset()
  }

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Nova observação"
        description="Cadastre um valor pronto com indicador, território, recorte, referência, unidade e fonte. Publique para exibi-lo na consulta pública."
      />
      {catalogos.error || cnaes.error ? (
        <EmptyState title="Não foi possível carregar os catálogos" description={(catalogos.error ?? cnaes.error)?.message} />
      ) : catalogos.isPending || cnaes.isPending ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : salva ? (
        <ResultadoCadastro
          observacao={salva}
          indicadores={catalogos.data.indicadores}
          erroPublicacao={publicar.error}
          publicando={publicar.isPending}
          onPublicar={() => publicar.mutate(salva.id, { onSuccess: setSalva })}
          onCadastrarOutra={cadastrarOutra}
        />
      ) : (
        <ObservacaoForm
          key={formulario.chave}
          inicial={formulario.inicial}
          catalogos={catalogos.data}
          cnaes={cnaes.data}
          salvando={criar.isPending || publicar.isPending}
          erro={criar.error}
          conflito={conflito}
          onSalvar={salvar}
        />
      )}
    </AdminContainer>
  )
}

interface ResultadoCadastroProps {
  observacao: ObservacaoAdmin
  indicadores: { codigo: string; nome: string }[]
  /** Falha ao publicar uma observação que já foi salva como rascunho. */
  erroPublicacao: Error | null
  publicando: boolean
  onPublicar: () => void
  onCadastrarOutra: () => void
}

function ResultadoCadastro({ observacao, indicadores, erroPublicacao, publicando, onPublicar, onCadastrarOutra }: ResultadoCadastroProps) {
  const publicada = observacao.status === 'publicado'
  return (
    <div className="flex flex-col gap-5">
      {publicada ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            <strong className="font-semibold">Observação publicada.</strong> Já aparece na consulta pública, com unidade,
            referência e fonte.
          </p>
        </Alert>
      ) : (
        <Alert variant="info">
          <FileClock aria-hidden />
          <p>
            <strong className="font-semibold">Rascunho salvo.</strong> Fica fora da consulta pública até ser publicado.
          </p>
        </Alert>
      )}
      {erroPublicacao ? (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>A observação foi salva como rascunho, mas não foi publicada: {erroPublicacao.message}</p>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <FichaObservacao observacao={observacao} indicadores={indicadores} />
          </CardContent>
        </Card>
        <ConsultaPublicaObservacao id={observacao.id} />
      </div>

      <div className="flex flex-wrap gap-3">
        {publicada ? null : (
          <Button variant="gradient" disabled={publicando} onClick={onPublicar}>
            {publicando ? 'Publicando…' : 'Publicar agora'}
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to="/admin/observacoes/$observacaoId" params={{ observacaoId: observacao.id }}>
            Abrir observação
          </Link>
        </Button>
        <Button variant="ghost" onClick={onCadastrarOutra}>
          Cadastrar outra
        </Button>
      </div>
    </div>
  )
}
