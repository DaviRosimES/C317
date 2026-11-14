import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import type { CatalogosAdmin, DadoCorrecao, DadoIndicadorAdmin, DefinicaoIndicador } from '@/models'
import { useCorrigirDado, useDadoIndicador } from '@/queries/admin-dado-indicador.queries'
import { useCatalogosAdmin, useDefinicao } from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { AcoesDado } from './dado-acoes'
import { CamposDado, ErroAoSalvar, focarPrimeiroErro } from './dado-form'
import { FichaDado, PainelConsultaPublica, SituacaoDado, descreverRecorte } from './dado-resumo'
import {
  diferencas,
  errosDaApi,
  rascunhoDoDado,
  validarCampos,
  type DadoRascunho,
  type ErrosDado,
} from './dado-validacao'
import { TEXTOS_ADMIN } from './textos'

export function DadoPage({ id }: { id: string }) {
  const dado = useDadoIndicador(id)
  const catalogos = useCatalogosAdmin()
  const definicao = useDefinicao(dado.data?.indicador.codigo ?? '', !!dado.data)

  if (!dado.isSuccess) {
    const naoEncontrado = dado.error instanceof ApiError && dado.error.status === 404
    return (
      <AdminContainer>
        <AdminPageHeader title="Dado do indicador" />
        {dado.error ? (
          <EmptyState
            title={naoEncontrado ? 'Dado não encontrado' : 'Não foi possível carregar o dado'}
            description={naoEncontrado ? 'O endereço pode estar incorreto ou o dado não existe.' : dado.error.message}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/dados">Voltar aos dados</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        )}
      </AdminContainer>
    )
  }

  const d = dado.data
  return (
    <AdminContainer>
      <AdminPageHeader
        title={d.indicador.nome}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {descreverRecorte(d)} · {d.referencia.rotulo}
            <SituacaoDado dado={d} />
          </span>
        }
      />

      {d.indicador.arquivado ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <p>
            O indicador está arquivado. Este dado fica fora da consulta pública enquanto o indicador estiver arquivado; a situação do
            próprio dado não muda.
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Dado</CardTitle>
              <CardDescription>Unidade e território vêm do indicador.</CardDescription>
            </CardHeader>
            <CardContent>
              <FichaDado dado={d} />
            </CardContent>
          </Card>

          {d.arquivado ? (
            <Card>
              <CardHeader>
                <CardTitle>Correção</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ink-muted">Restaure o dado antes de editar.</p>
              </CardContent>
            </Card>
          ) : catalogos.data && definicao.data ? (
            // Outro dado começa uma correção nova, sem o texto digitado no anterior.
            <CorrecaoDado key={d.id} dado={d} definicao={definicao.data} catalogos={catalogos.data} />
          ) : catalogos.error || definicao.error ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <p>Não foi possível carregar o formulário de correção: {(catalogos.error ?? definicao.error)?.message}</p>
            </Alert>
          ) : (
            <Skeleton className="h-56 rounded-2xl" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <PainelConsultaPublica dado={d} />
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <AcoesDado dado={d} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Button asChild variant="secondary" className="self-start">
        <Link to="/admin/dados">Voltar aos dados</Link>
      </Button>
    </AdminContainer>
  )
}

function CorrecaoDado({
  dado,
  definicao,
  catalogos,
}: {
  dado: DadoIndicadorAdmin
  definicao: DefinicaoIndicador
  catalogos: CatalogosAdmin
}) {
  const corrigir = useCorrigirDado()
  const [r, setRascunho] = React.useState<DadoRascunho>(() => rascunhoDoDado(dado))
  const [erros, setErros] = React.useState<ErrosDado>({})
  const [aviso, setAviso] = React.useState<'salva' | 'sem-alteracao' | null>(null)
  const [pendente, setPendente] = React.useState<DadoCorrecao | null>(null)

  const publicado = dado.status === 'publicado'

  function alterar(parcial: Partial<DadoRascunho>, limpar: (keyof ErrosDado)[] = []) {
    setRascunho((atual) => ({ ...atual, ...parcial }))
    setErros((atuais) => {
      const novos = { ...atuais }
      for (const campo of [...limpar, ...(Object.keys(parcial) as (keyof ErrosDado)[])]) delete novos[campo]
      return novos
    })
    setAviso(null)
    corrigir.reset()
  }

  function enviar(correcao: DadoCorrecao) {
    corrigir.mutate(
      { id: dado.id, correcao },
      {
        onSuccess: () => {
          // O formulário passa a refletir o dado salvo.
          setAviso('salva')
          setErros({})
        },
        onError: (erro) => {
          const daApi = errosDaApi(erro, r.referenciaTipo)
          setErros(daApi)
          if (Object.keys(daApi).length) focarPrimeiroErro(daApi)
        },
        onSettled: () => setPendente(null),
      },
    )
  }

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAviso(null)
    const resultado = validarCampos(r, definicao, catalogos)
    if ('erros' in resultado) {
      setErros(resultado.erros)
      focarPrimeiroErro(resultado.erros)
      return
    }
    const correcao = diferencas(dado, resultado.campos)
    if (!Object.keys(correcao).length) {
      setAviso('sem-alteracao')
      return
    }
    if (publicado) setPendente(correcao)
    else enviar(correcao)
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="titulo-correcao">
      <div className="flex flex-col gap-1.5">
        <h2 id="titulo-correcao" className="text-lg font-bold tracking-tight text-ink">
          Corrigir dado
        </h2>
        <p className="text-sm text-ink-muted">
          Corrija categoria, referência, valor, fonte ou notas no mesmo dado; o identificador é preservado. Para outro indicador,
          cadastre um novo dado.
        </p>
      </div>

      <form noValidate onSubmit={salvar} className="flex flex-col gap-5">
        {publicado ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <p>{TEXTOS_ADMIN.edicaoPublicada}</p>
          </Alert>
        ) : null}
        {corrigir.error ? (
          <ErroAoSalvar erro={corrigir.error} titulo="Não foi possível salvar a correção" />
        ) : aviso === 'salva' ? (
          <Alert variant="success">
            <CheckCircle2 aria-hidden />
            <p>Correção salva.</p>
          </Alert>
        ) : aviso === 'sem-alteracao' ? (
          <Alert variant="info">
            <AlertCircle aria-hidden />
            <p>Nada foi alterado.</p>
          </Alert>
        ) : null}

        <CamposDado r={r} definicao={definicao} catalogos={catalogos} erros={erros} onAlterar={alterar} />

        <Button type="submit" variant={publicado ? 'gradient' : 'secondary'} className="self-start" disabled={corrigir.isPending}>
          {corrigir.isPending ? 'Salvando…' : 'Salvar correção'}
        </Button>
      </form>

      <Dialog open={!!pendente} onOpenChange={(aberto) => !aberto && setPendente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar correção do dado publicado?</DialogTitle>
            <DialogDescription>{TEXTOS_ADMIN.edicaoPublicada}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button variant="gradient" disabled={corrigir.isPending} onClick={() => pendente && enviar(pendente)}>
              {corrigir.isPending ? 'Salvando…' : 'Confirmar e salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
