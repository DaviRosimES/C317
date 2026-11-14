import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
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
import { formatDate, toDataIso } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import type { RelatorioAdmin, RelatorioCorrecao } from '@/models'
import {
  useCorrigirRelatorio,
  useLimitesRelatorio,
  useRelatorioAdmin,
  useSubstituirArquivoRelatorio,
} from '@/queries/admin-relatorio.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { AcoesRelatorio, BotaoBaixarPdf } from './relatorio-acoes'
import { RelatorioFormEdicao, SeletorPdf, TIPOS_RELATORIO, textoDoLimite, validarArquivo } from './relatorio-form'
import { SituacaoBadges } from './situacao'
import { TEXTOS_ADMIN } from './textos'

const NAO_INFORMADO = 'Não informado'

export function RelatorioPage({ id }: { id: number }) {
  const relatorio = useRelatorioAdmin(id)

  if (!relatorio.isSuccess) {
    const naoEncontrado = relatorio.error instanceof ApiError && relatorio.error.status === 404
    return (
      <AdminContainer>
        <AdminPageHeader title="Relatório" />
        {relatorio.error ? (
          <EmptyState
            title={naoEncontrado ? 'Relatório não encontrado' : 'Não foi possível carregar o relatório'}
            description={naoEncontrado ? 'O endereço pode estar incorreto.' : relatorio.error.message}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/relatorios">Voltar aos relatórios</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        )}
      </AdminContainer>
    )
  }

  const r = relatorio.data
  const publicoAgora = r.status === 'publicado' && !r.arquivado
  return (
    <AdminContainer>
      <AdminPageHeader
        title={r.titulo}
        description={<SituacaoBadges status={r.status} arquivado={r.arquivado} demonstracao={r.demonstracao} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Dados do relatório</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Ficha relatorio={r} />
              <ConteudoVigente relatorio={r} />
            </CardContent>
          </Card>

          {r.arquivado ? (
            <Alert variant="warning">
              <AlertCircle aria-hidden />
              <p>Restaure o relatório antes de editá-lo. A edição, a troca do PDF, a publicação e a despublicação ficam indisponíveis enquanto ele está arquivado.</p>
            </Alert>
          ) : (
            <>
              {/* Outro relatório começa sem o texto digitado no anterior. */}
              <EdicaoRelatorio key={r.id} relatorio={r} />
              <SubstituirPdf key={`pdf-${r.id}`} relatorio={r} />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Situação</CardTitle>
            </CardHeader>
            <CardContent>
              <AcoesRelatorio relatorio={r} />
            </CardContent>
          </Card>
          {publicoAgora ? (
            <Card>
              <CardHeader>
                <CardTitle>Na consulta pública</CardTitle>
                <CardDescription>Este relatório está disponível para o público.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link to="/relatorios">Ver em Relatórios</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Button asChild variant="secondary" className="self-start">
        <Link to="/admin/relatorios">Voltar aos relatórios</Link>
      </Button>
    </AdminContainer>
  )
}

function Ficha({ relatorio: r }: { relatorio: RelatorioAdmin }) {
  const linhas: [string, React.ReactNode][] = [
    ['Fonte', r.fonte ?? 'Fonte não confirmada'],
    ['Número', r.numero ?? NAO_INFORMADO],
    ['Tipo', r.tipo ? TIPOS_RELATORIO[r.tipo] : NAO_INFORMADO],
    [
      'Data original',
      r.dataPublicacao ? <time dateTime={toDataIso(r.dataPublicacao)}>{formatDate(r.dataPublicacao)}</time> : NAO_INFORMADO,
    ],
    ['Referência', r.periodo ? formatPeriodo(r.periodo, 'longo') : NAO_INFORMADO],
  ]
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {linhas.map(([termo, valor]) => (
        <div key={termo} className="flex flex-col gap-0.5">
          <dt className="text-ink-muted">{termo}</dt>
          <dd className="min-w-0 break-words text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function ConteudoVigente({ relatorio: r }: { relatorio: RelatorioAdmin }) {
  const c = r.conteudo
  return (
    <section aria-label="Conteúdo vigente" className="flex flex-col gap-3 border-t border-line pt-5">
      <h2 className="text-sm font-semibold text-ink">Conteúdo vigente</h2>
      {c.tipo === 'pdf' ? (
        <>
          <p className="break-all text-sm text-ink">{c.nomeArquivo ? `PDF: ${c.nomeArquivo}` : 'PDF'}</p>
          <BotaoBaixarPdf relatorio={r} />
        </>
      ) : c.tipo === 'link' ? (
        <>
          <Alert variant="info">
            <p>
              Documento legado, publicado em outro endereço. Trocar por um PDF substitui o link; o acesso no provedor externo não é alterado.
            </p>
          </Alert>
          <Button asChild variant="secondary" className="self-start">
            <a href={c.url} target="_blank" rel="noreferrer" aria-label={`Abrir em ${c.destino} (nova aba)`}>
              <ExternalLink aria-hidden />
              Abrir em {c.destino}
            </a>
          </Button>
        </>
      ) : (
        <p className="text-sm text-ink-muted">Sem conteúdo.</p>
      )}
    </section>
  )
}

function EdicaoRelatorio({ relatorio }: { relatorio: RelatorioAdmin }) {
  const corrigir = useCorrigirRelatorio()
  const [pendente, setPendente] = React.useState<RelatorioCorrecao | null>(null)
  const [salvo, setSalvo] = React.useState(false)
  const publicado = relatorio.status === 'publicado'

  function salvar(correcao: RelatorioCorrecao) {
    setSalvo(false)
    corrigir.mutate(
      { id: relatorio.id, correcao },
      {
        onSuccess: () => {
          setSalvo(true)
          setPendente(null)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar dados</CardTitle>
        <CardDescription>
          {publicado ? TEXTOS_ADMIN.edicaoPublicada : 'Rascunho: a alteração continua fora da consulta pública.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {salvo ? (
          <Alert variant="success">
            <CheckCircle2 aria-hidden />
            <p>Alterações salvas.</p>
          </Alert>
        ) : null}
        <RelatorioFormEdicao
          relatorio={relatorio}
          pendente={corrigir.isPending && !pendente}
          // Com a confirmação aberta, o erro aparece no diálogo.
          erro={pendente ? null : corrigir.error}
          onSalvar={(correcao) => {
            setSalvo(false)
            if (publicado) {
              corrigir.reset()
              setPendente(correcao)
            } else salvar(correcao)
          }}
        />
      </CardContent>

      <Dialog
        open={!!pendente}
        onOpenChange={(aberto) => {
          if (aberto) return
          corrigir.reset()
          setPendente(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar alterações no relatório publicado?</DialogTitle>
            <DialogDescription>{TEXTOS_ADMIN.edicaoPublicada}</DialogDescription>
          </DialogHeader>
          {corrigir.error ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <p>{corrigir.error.message}</p>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button disabled={corrigir.isPending} onClick={() => pendente && salvar(pendente)}>
              {corrigir.isPending ? 'Salvando…' : 'Confirmar e salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SubstituirPdf({ relatorio }: { relatorio: RelatorioAdmin }) {
  const limites = useLimitesRelatorio()
  const substituir = useSubstituirArquivoRelatorio()
  const [arquivo, setArquivo] = React.useState<File | null>(null)
  const [erro, setErro] = React.useState<string>()
  const [concluido, setConcluido] = React.useState<RelatorioAdmin | null>(null)
  // Recria o seletor após o envio para limpar o arquivo escolhido.
  const [seletor, setSeletor] = React.useState(0)
  const publicado = relatorio.status === 'publicado'

  function enviar() {
    const invalido = validarArquivo(arquivo, limites.data)
    setErro(invalido)
    setConcluido(null)
    if (invalido || !arquivo) return
    substituir.mutate(
      { id: relatorio.id, arquivo },
      {
        onSuccess: (atualizado) => {
          setConcluido(atualizado)
          setArquivo(null)
          setSeletor((n) => n + 1)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Substituir PDF</CardTitle>
        <CardDescription>
          {limites.data ? `${textoDoLimite(limites.data)}. ` : ''}O status é mantido.
          {publicado ? ' Como o relatório está publicado, o novo PDF aparece na consulta pública assim que for aceito.' : ''}
          {relatorio.conteudo.tipo === 'link' ? ' O link externo legado será substituído pelo PDF.' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {concluido ? (
          <Alert variant="success">
            <CheckCircle2 aria-hidden />
            <p>
              PDF substituído. O status foi mantido ({concluido.status === 'publicado' ? 'Publicado: o novo PDF já está na consulta pública' : 'Rascunho'}).
            </p>
          </Alert>
        ) : null}
        {substituir.error ? (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <p>
              {TEXTOS_ADMIN.falhaSubstituirPdf} {substituir.error.message}
            </p>
          </Alert>
        ) : null}
        <SeletorPdf
          key={seletor}
          id="relatorio-novo-pdf"
          label="Novo arquivo PDF"
          limites={limites.data}
          arquivo={arquivo}
          onChange={(f) => {
            setArquivo(f)
            setErro(undefined)
          }}
          erro={erro}
          disabled={substituir.isPending}
        />
        <Button className="self-start" disabled={substituir.isPending || !arquivo} onClick={enviar}>
          {substituir.isPending ? 'Enviando…' : 'Substituir PDF'}
        </Button>
      </CardContent>
    </Card>
  )
}
