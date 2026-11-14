import * as React from 'react'
import { AlertCircle, Download } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import type { RelatorioAdmin } from '@/models'
import {
  useArquivarRelatorio,
  useBaixarArquivoRelatorio,
  useDespublicarRelatorio,
  usePublicarRelatorio,
  useRestaurarRelatorio,
} from '@/queries/admin-relatorio.queries'
import { TEXTOS_ADMIN } from './textos'

type Acao = 'publicar' | 'despublicar' | 'arquivar' | 'restaurar'
type Mutacao = UseMutationResult<RelatorioAdmin, Error, number>

const TEXTOS: Record<Acao, { titulo: string; descricao: string; confirmar: string; andamento: string }> = {
  publicar: {
    titulo: 'Publicar relatório?',
    descricao: 'O relatório fica disponível na consulta pública, com título, fonte e documento.',
    confirmar: 'Publicar',
    andamento: 'Publicando…',
  },
  despublicar: {
    titulo: 'Despublicar relatório?',
    descricao: 'O relatório volta a rascunho e deixa de aparecer na consulta pública. O conteúdo é mantido.',
    confirmar: 'Despublicar',
    andamento: 'Despublicando…',
  },
  arquivar: {
    titulo: 'Arquivar relatório?',
    descricao:
      'O relatório sai da lista de ativos e da consulta pública. O status (Rascunho ou Publicado) é preservado e volta ao restaurar.',
    confirmar: 'Arquivar',
    andamento: 'Arquivando…',
  },
  restaurar: {
    titulo: 'Restaurar relatório?',
    descricao: TEXTOS_ADMIN.restauracao,
    confirmar: 'Restaurar',
    andamento: 'Restaurando…',
  },
}

function DialogoAcao({
  relatorio,
  acao,
  mutacao,
  aberto,
  onFechar,
  onConcluida,
}: {
  relatorio: RelatorioAdmin
  acao: Acao
  mutacao: Mutacao
  aberto: boolean
  onFechar: () => void
  onConcluida?: (relatorio: RelatorioAdmin) => void
}) {
  const texto = TEXTOS[acao]
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (valor) return
        mutacao.reset()
        onFechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{texto.titulo}</DialogTitle>
          <DialogDescription>{texto.descricao}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg bg-canvas p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-muted">Relatório</dt>
            <dd className="min-w-0 break-words text-right text-ink">{relatorio.titulo}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-muted">Fonte</dt>
            <dd className="min-w-0 break-words text-right text-ink">{relatorio.fonte ?? 'Fonte não confirmada'}</dd>
          </div>
        </dl>
        {mutacao.error ? (
          <Alert variant="danger">
            <AlertCircle aria-hidden />
            <p>{mutacao.error.message}</p>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button
            variant={acao === 'publicar' ? 'gradient' : 'primary'}
            disabled={mutacao.isPending}
            onClick={() =>
              mutacao.mutate(relatorio.id, {
                onSuccess: (atualizado) => {
                  onConcluida?.(atualizado)
                  mutacao.reset()
                  onFechar()
                },
              })
            }
          >
            {mutacao.isPending ? texto.andamento : texto.confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Confirmação de publicação, usada no resultado do cadastro e no detalhe. */
export function DialogoPublicarRelatorio({
  relatorio,
  aberto,
  onFechar,
  onPublicado,
}: {
  relatorio: RelatorioAdmin
  aberto: boolean
  onFechar: () => void
  onPublicado?: (relatorio: RelatorioAdmin) => void
}) {
  const publicar = usePublicarRelatorio()
  return (
    <DialogoAcao
      relatorio={relatorio}
      acao="publicar"
      mutacao={publicar}
      aberto={aberto}
      onFechar={onFechar}
      onConcluida={onPublicado}
    />
  )
}

/** Publicar/Despublicar e Arquivar/Restaurar. Arquivado só pode ser restaurado. */
export function AcoesRelatorio({ relatorio }: { relatorio: RelatorioAdmin }) {
  const [aberta, setAberta] = React.useState<Acao | null>(null)
  const publicar = usePublicarRelatorio()
  const despublicar = useDespublicarRelatorio()
  const arquivar = useArquivarRelatorio()
  const restaurar = useRestaurarRelatorio()
  const fechar = () => setAberta(null)

  return (
    <div className="flex flex-col gap-3">
      {relatorio.arquivado ? (
        <Alert variant="warning">
          <AlertCircle aria-hidden />
          <p>Restaure o relatório antes de editá-lo.</p>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {relatorio.arquivado ? (
          <Button variant="gradient" onClick={() => setAberta('restaurar')}>
            Restaurar
          </Button>
        ) : (
          <>
            {relatorio.status === 'publicado' ? (
              <Button variant="secondary" onClick={() => setAberta('despublicar')}>
                Despublicar
              </Button>
            ) : (
              <Button variant="gradient" onClick={() => setAberta('publicar')}>
                Publicar
              </Button>
            )}
            <Button variant="ghost" onClick={() => setAberta('arquivar')}>
              Arquivar
            </Button>
          </>
        )}
      </div>
      <DialogoAcao relatorio={relatorio} acao="publicar" mutacao={publicar} aberto={aberta === 'publicar'} onFechar={fechar} />
      <DialogoAcao relatorio={relatorio} acao="despublicar" mutacao={despublicar} aberto={aberta === 'despublicar'} onFechar={fechar} />
      <DialogoAcao relatorio={relatorio} acao="arquivar" mutacao={arquivar} aberto={aberta === 'arquivar'} onFechar={fechar} />
      <DialogoAcao relatorio={relatorio} acao="restaurar" mutacao={restaurar} aberto={aberta === 'restaurar'} onFechar={fechar} />
    </div>
  )
}

/** Baixa o PDF vigente com o token (um link direto não enviaria o Authorization). */
export function BotaoBaixarPdf({ relatorio }: { relatorio: RelatorioAdmin }) {
  const baixar = useBaixarArquivoRelatorio()

  function salvar(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = relatorio.arquivoNome ?? `relatorio-${relatorio.id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="self-start" disabled={baixar.isPending} onClick={() => baixar.mutate(relatorio.id, { onSuccess: salvar })}>
        <Download aria-hidden />
        {baixar.isPending ? 'Baixando…' : 'Baixar para conferir'}
      </Button>
      {baixar.error ? (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>{baixar.error.message}</p>
        </Alert>
      ) : null}
    </div>
  )
}
