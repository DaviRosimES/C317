import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import {
  Alert,
  Badge,
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
import { rotuloTipoReferencia } from '@/lib/referencia'
import type { DefinicaoCorrecao, DefinicaoIndicador } from '@/models'
import { useDadosIndicador } from '@/queries/admin-dado-indicador.queries'
import {
  useArquivarDefinicao,
  useCatalogosAdmin,
  useCorrigirDefinicao,
  useDefinicao,
  useRestaurarDefinicao,
} from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DefinicaoForm } from './definicao-form'
import { correcaoDe, rascunhoDaDefinicao } from './definicao-validacao'
import { descreverUnidade } from '@/lib/format'
import { Item } from './ficha'
import { TEXTOS_ADMIN } from './textos'

const totalDados = (total: number) =>
  total === 0 ? 'Sem dados cadastrados' : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'dado' : 'dados'}`

export function DefinicaoPage({ codigo, criado = false }: { codigo: string; criado?: boolean }) {
  const definicao = useDefinicao(codigo)
  const catalogos = useCatalogosAdmin()
  const [editando, setEditando] = React.useState(false)
  const [aviso, setAviso] = React.useState<string | null>(null)
  const [dialogo, setDialogo] = React.useState<'arquivar' | 'restaurar' | null>(null)

  if (!definicao.isSuccess || !catalogos.isSuccess) {
    const erro = definicao.error ?? catalogos.error
    const naoEncontrado = definicao.error instanceof ApiError && definicao.error.status === 404
    return (
      <AdminContainer>
        <AdminPageHeader title="Indicador" />
        {erro ? (
          <EmptyState
            title={naoEncontrado ? 'Indicador não encontrado' : 'Não foi possível carregar o indicador'}
            description={naoEncontrado ? 'O endereço pode estar incorreto ou o indicador não existe.' : erro.message}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/indicadores">Voltar aos indicadores</Link>
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

  const d = definicao.data
  return (
    <AdminContainer>
      <AdminPageHeader
        title={d.nome}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {totalDados(d.totalDados)}
            {d.arquivado ? <Badge variant="neutral">Arquivado</Badge> : null}
          </span>
        }
        actions={
          <>
            {!d.arquivado && !editando ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setAviso(null)
                  setEditando(true)
                }}
              >
                Editar
              </Button>
            ) : null}
            {d.arquivado ? (
              <Button variant="secondary" onClick={() => setDialogo('restaurar')}>
                Restaurar indicador
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setDialogo('arquivar')}>
                Arquivar indicador
              </Button>
            )}
          </>
        }
      />

      {criado && !aviso ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            Indicador cadastrado. Ele só aparece na consulta pública quando tiver dados publicados; não existe publicação do
            indicador em si.
          </p>
        </Alert>
      ) : null}
      {aviso ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>{aviso}</p>
        </Alert>
      ) : null}
      {d.arquivado ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <p>Restaure o indicador antes de editar.</p>
        </Alert>
      ) : null}

      {editando && !d.arquivado ? (
        <EdicaoDefinicao
          definicao={d}
          catalogos={catalogos.data}
          onCancelar={() => setEditando(false)}
          onSalva={(mensagem) => {
            setAviso(mensagem)
            setEditando(false)
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Definição</CardTitle>
            <CardDescription>
              O código é gerado pelo sistema e não muda ao renomear. Nome, definição e nota podem ser corrigidos; unidade,
              tipos de referência e classificações em uso por dados não podem ser retirados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FichaDefinicao definicao={d} />
          </CardContent>
        </Card>
      )}

      <DialogoArquivar
        aberto={dialogo === 'arquivar'}
        definicao={d}
        onFechar={() => setDialogo(null)}
        onConcluido={() => setAviso('Indicador arquivado. Os dados dele foram preservados com as situações que já tinham.')}
      />
      <DialogoRestaurar
        aberto={dialogo === 'restaurar'}
        definicao={d}
        onFechar={() => setDialogo(null)}
        onConcluido={() => setAviso('Indicador restaurado. Os dados voltam à situação anterior ao arquivamento.')}
      />
    </AdminContainer>
  )
}

function FichaDefinicao({ definicao: d }: { definicao: DefinicaoIndicador }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      <Item termo="Nome" className="sm:col-span-2">
        {d.nome}
      </Item>
      <Item termo="O que mede" className="sm:col-span-2">
        <span className="whitespace-pre-line">{d.definicao}</span>
      </Item>
      <Item termo="Unidade">
        {d.unidade.nome}
        <span className="block text-xs text-ink-subtle">{descreverUnidade(d.unidade)}</span>
      </Item>
      <Item termo="Total de dados">{totalDados(d.totalDados)}</Item>
      <Item termo="Setores do Observatório">{d.setores.map((s) => s.nome).join(', ') || 'Nenhum'}</Item>
      <Item termo="Tipos de referência permitidos">
        {d.tiposReferenciaPermitidos.map(rotuloTipoReferencia).join(', ') || 'Nenhum'}
      </Item>
      <Item termo="Classificações permitidas" className="sm:col-span-2">
        {d.classificacoesPermitidas.length ? d.classificacoesPermitidas.map((c) => c.nome).join(', ') : 'Nenhuma'}
      </Item>
      <Item termo="Aceita dado sem categoria">
        {d.aceitaSemCategoria ? 'Sim (total informado pela fonte)' : 'Não (todo dado precisa de categoria)'}
      </Item>
      <Item termo="Nota metodológica" className="sm:col-span-2">
        {d.notaMetodologica ? (
          <span className="whitespace-pre-line">{d.notaMetodologica}</span>
        ) : (
          <span className="text-ink-muted">Sem nota metodológica</span>
        )}
      </Item>
    </dl>
  )
}

function EdicaoDefinicao({
  definicao,
  catalogos,
  onCancelar,
  onSalva,
}: {
  definicao: DefinicaoIndicador
  catalogos: NonNullable<ReturnType<typeof useCatalogosAdmin>['data']>
  onCancelar: () => void
  onSalva: (mensagem: string) => void
}) {
  const corrigir = useCorrigirDefinicao()
  const publicados = useDadosIndicador({ indicador: definicao.codigo, status: 'publicado' })
  const [pendente, setPendente] = React.useState<DefinicaoCorrecao | null>(null)
  const [semMudanca, setSemMudanca] = React.useState(false)
  const inicial = React.useMemo(() => rascunhoDaDefinicao(definicao), [definicao])

  function enviar(correcao: DefinicaoCorrecao) {
    corrigir.mutate(
      { codigo: definicao.codigo, correcao },
      {
        onSuccess: () => onSalva('Alterações salvas.'),
        // O erro aparece no formulário, que mantém o preenchimento; só fecha a confirmação.
        onSettled: () => setPendente(null),
      },
    )
  }

  return (
    <>
      {semMudanca ? (
        <Alert variant="info">
          <AlertCircle aria-hidden />
          <p>Nenhum campo foi alterado.</p>
        </Alert>
      ) : null}
      <Alert variant="info">
        <AlertCircle aria-hidden />
        <p>
          Quando o indicador já tem dados, a API recusa trocar a unidade, retirar um tipo de referência ou uma classificação em
          uso e desmarcar “aceita dado sem categoria” se houver dado sem categoria. A mensagem de recusa lista os vínculos.
        </p>
      </Alert>
      <DefinicaoForm
        inicial={inicial}
        catalogos={catalogos}
        salvando={corrigir.isPending || publicados.isPending}
        erro={corrigir.error}
        rotuloSalvar="Salvar alterações"
        cancelar={
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        }
        onSalvar={(entrada) => {
          const correcao = correcaoDe(definicao, entrada)
          setSemMudanca(Object.keys(correcao).length === 0)
          if (Object.keys(correcao).length === 0) return
          corrigir.reset()
          // Sem a lista de dados publicados (falha ao consultar), confirma por precaução.
          if (publicados.data?.length === 0) enviar(correcao)
          else setPendente(correcao)
        }}
      />

      <Dialog open={!!pendente} onOpenChange={(aberto) => (aberto ? undefined : setPendente(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar alterações?</DialogTitle>
            <DialogDescription>{TEXTOS_ADMIN.edicaoPublicada}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button variant="gradient" disabled={corrigir.isPending} onClick={() => pendente && enviar(pendente)}>
              {corrigir.isPending ? 'Salvando…' : 'Confirmar alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ErroDoDialogo({ erro }: { erro: Error | null }) {
  if (!erro) return null
  return (
    <Alert variant="danger" className="mt-4">
      <AlertCircle aria-hidden />
      <p>{erro.message}</p>
    </Alert>
  )
}

interface DialogoSituacaoProps {
  aberto: boolean
  definicao: DefinicaoIndicador
  onFechar: () => void
  onConcluido: () => void
}

function DialogoArquivar({ aberto, definicao, onFechar, onConcluido }: DialogoSituacaoProps) {
  const arquivar = useArquivarDefinicao()
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (valor) return
        arquivar.reset()
        onFechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arquivar indicador?</DialogTitle>
          <DialogDescription>{TEXTOS_ADMIN.arquivarIndicador}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-ink">
          <strong className="font-semibold">{definicao.nome}</strong>: {totalDados(definicao.totalDados).toLowerCase()}.
        </p>
        <ErroDoDialogo erro={arquivar.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={arquivar.isPending}
            onClick={() =>
              arquivar.mutate(definicao.codigo, {
                onSuccess: () => {
                  onConcluido()
                  onFechar()
                },
              })
            }
          >
            {arquivar.isPending ? 'Arquivando…' : 'Arquivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoRestaurar({ aberto, definicao, onFechar, onConcluido }: DialogoSituacaoProps) {
  const restaurar = useRestaurarDefinicao()
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (valor) return
        restaurar.reset()
        onFechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restaurar indicador?</DialogTitle>
          <DialogDescription>{TEXTOS_ADMIN.restauracao}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-ink-muted">
          Dados arquivados separadamente continuam arquivados e rascunhos continuam rascunhos.
        </p>
        <ErroDoDialogo erro={restaurar.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={restaurar.isPending}
            onClick={() =>
              restaurar.mutate(definicao.codigo, {
                onSuccess: () => {
                  onConcluido()
                  onFechar()
                },
              })
            }
          >
            {restaurar.isPending ? 'Restaurando…' : 'Restaurar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
