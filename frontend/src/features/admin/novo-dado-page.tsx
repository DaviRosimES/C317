import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileClock } from 'lucide-react'
import { Alert, Button, Card, CardContent, EmptyState, Skeleton } from '@/components/ui'
import type { DadoIndicadorAdmin } from '@/models'
import { useCriarDado } from '@/queries/admin-dado-indicador.queries'
import { useCatalogosAdmin, useDefinicoes } from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DialogoPublicar } from './dado-acoes'
import { DadoForm } from './dado-form'
import { FichaDado } from './dado-resumo'
import { rascunhoDoLote, rascunhoVazio, type DadoRascunho } from './dado-validacao'
import { TEXTOS_ADMIN } from './textos'

export function NovoDadoPage({ indicador }: { indicador?: string }) {
  const definicoes = useDefinicoes({ situacao: 'todos' })
  const catalogos = useCatalogosAdmin()
  const criar = useCriarDado()
  const [salvo, setSalvo] = React.useState<DadoIndicadorAdmin | null>(null)
  const [publicando, setPublicando] = React.useState(false)
  const [formulario, setFormulario] = React.useState(() => ({ chave: 0, inicial: rascunhoVazio({ indicador }) }))
  const ultimoRascunho = React.useRef<DadoRascunho | null>(null)

  function adicionarOutro() {
    // Mantém indicador e fonte; referência, categoria e valor voltam vazios.
    const anterior = ultimoRascunho.current
    setFormulario((atual) => ({ chave: atual.chave + 1, inicial: anterior ? rascunhoDoLote(anterior) : rascunhoVazio() }))
    setSalvo(null)
    criar.reset()
  }

  const erro = definicoes.error ?? catalogos.error
  // `?indicador=` só vale para um indicador ativo.
  const inicial =
    formulario.chave === 0 && definicoes.data && !definicoes.data.some((d) => d.codigo === formulario.inicial.indicador && !d.arquivado)
      ? rascunhoVazio()
      : formulario.inicial

  return (
    <AdminContainer>
      <AdminPageHeader title="Adicionar dado" description={TEXTOS_ADMIN.dados} />
      {erro ? (
        <EmptyState
          title="Não foi possível carregar o formulário"
          description={erro.message}
          action={
            <Button asChild variant="secondary">
              <Link to="/admin/dados">Voltar aos dados</Link>
            </Button>
          }
        />
      ) : !definicoes.data || !catalogos.data ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : salvo ? (
        <>
          <ResultadoCadastro dado={salvo} onPublicar={() => setPublicando(true)} onAdicionarOutro={adicionarOutro} />
          <DialogoPublicar dado={publicando ? salvo : null} onFechar={() => setPublicando(false)} onPublicado={setSalvo} />
        </>
      ) : (
        <DadoForm
          key={formulario.chave}
          inicial={inicial}
          definicoes={definicoes.data}
          catalogos={catalogos.data}
          salvando={criar.isPending}
          erro={criar.error}
          onSalvar={(entrada, rascunho) => {
            ultimoRascunho.current = rascunho
            criar.mutate(entrada, { onSuccess: setSalvo })
          }}
        />
      )}
    </AdminContainer>
  )
}

function ResultadoCadastro({
  dado,
  onPublicar,
  onAdicionarOutro,
}: {
  dado: DadoIndicadorAdmin
  onPublicar: () => void
  onAdicionarOutro: () => void
}) {
  const publicado = dado.status === 'publicado'
  return (
    <div className="flex flex-col gap-5">
      {publicado ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            <strong className="font-semibold">Dado publicado.</strong> Já aparece na consulta pública.
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
      <Card>
        <CardContent className="pt-6">
          <FichaDado dado={dado} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        {publicado ? null : (
          <Button variant="gradient" onClick={onPublicar}>
            Publicar
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to="/admin/dados/$dadoId" params={{ dadoId: dado.id }}>
            Abrir dado
          </Link>
        </Button>
        <Button variant="ghost" onClick={onAdicionarOutro}>
          Adicionar outro
        </Button>
      </div>
    </div>
  )
}
