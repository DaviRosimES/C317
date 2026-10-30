import * as React from 'react'
import { AlertCircle, Ban } from 'lucide-react'
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
  FormField,
  Textarea,
} from '@/components/ui'
import type { ObservacaoAdmin } from '@/models'
import {
  useBloquearObservacao,
  useDesbloquearObservacao,
  useDespublicarObservacao,
  usePublicarObservacao,
} from '@/queries/admin-observacao.queries'
import { descreverRecorte, valorExato } from './observacao-resumo'

const MOTIVO_MAX = 500

type Acao = 'publicar' | 'despublicar' | 'bloquear' | 'desbloquear'

/** Resumo exibido antes de confirmar uma ação sobre a observação. */
function ResumoConfirmacao({ observacao: o }: { observacao: ObservacaoAdmin }) {
  const linhas = [
    ['Indicador', o.indicador.nome],
    ['Território', o.territorio.nome],
    ['Recorte', descreverRecorte(o)],
    ['Referência', o.referencia.rotulo],
    ['Valor', valorExato(o)],
  ]
  return (
    <dl className="grid gap-3 rounded-lg bg-canvas p-4 text-sm">
      {linhas.map(([termo, valor]) => (
        <div key={termo} className="flex justify-between gap-4">
          <dt className="shrink-0 text-ink-muted">{termo}</dt>
          <dd className="min-w-0 break-words text-right text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function ErroDaAcao({ erro }: { erro: Error | null }) {
  if (!erro) return null
  return (
    <Alert variant="danger" className="mt-4">
      <AlertCircle aria-hidden />
      <p>{erro.message}</p>
    </Alert>
  )
}

/** Confirmação de publicação, usada na listagem e no detalhe. */
export function DialogoPublicar({
  observacao,
  onFechar,
  onPublicada,
}: {
  observacao: ObservacaoAdmin | null
  onFechar: () => void
  onPublicada?: (observacao: ObservacaoAdmin) => void
}) {
  const publicar = usePublicarObservacao()
  return (
    <Dialog
      open={!!observacao}
      onOpenChange={(aberto) => {
        if (aberto) return
        publicar.reset()
        onFechar()
      }}
    >
      <DialogContent>
        {observacao ? (
          <>
            <DialogHeader>
              <DialogTitle>Publicar observação?</DialogTitle>
              <DialogDescription>O valor fica visível na consulta pública, com unidade, referência, fonte e notas.</DialogDescription>
            </DialogHeader>
            <ResumoConfirmacao observacao={observacao} />
            <ErroDaAcao erro={publicar.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button
                variant="gradient"
                disabled={publicar.isPending}
                onClick={() =>
                  publicar.mutate(observacao.id, {
                    onSuccess: (publicada) => {
                      onPublicada?.(publicada)
                      onFechar()
                    },
                  })
                }
              >
                {publicar.isPending ? 'Publicando…' : 'Publicar'}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Publicar, retirar da consulta, bloquear e desbloquear a divulgação. */
export function AcoesPublicacao({ observacao }: { observacao: ObservacaoAdmin }) {
  const [aberta, setAberta] = React.useState<Acao | null>(null)
  const bloqueada = observacao.divulgacaoBloqueada
  const publicada = observacao.status === 'publicado'

  return (
    <div className="flex flex-col gap-3">
      {bloqueada ? (
        <Alert variant="danger">
          <Ban aria-hidden />
          <p>
            <strong className="font-semibold">Publicação impedida.</strong> Divulgação bloqueada: {observacao.motivoBloqueio}
          </p>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {publicada ? (
          <Button variant="secondary" onClick={() => setAberta('despublicar')}>
            Retirar da consulta
          </Button>
        ) : (
          <Button
            variant="gradient"
            disabled={bloqueada}
            aria-describedby={bloqueada ? 'publicacao-impedida' : undefined}
            onClick={() => setAberta('publicar')}
          >
            Publicar
          </Button>
        )}
        {bloqueada ? (
          <Button variant="secondary" onClick={() => setAberta('desbloquear')}>
            Desbloquear divulgação
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setAberta('bloquear')}>
            Bloquear divulgação
          </Button>
        )}
      </div>
      {bloqueada ? (
        <p id="publicacao-impedida" className="text-xs text-ink-muted">
          Desbloqueie somente se a restrição da fonte deixou de valer. A observação continua em rascunho até ser publicada.
        </p>
      ) : null}

      <DialogoPublicar observacao={aberta === 'publicar' ? observacao : null} onFechar={() => setAberta(null)} />
      <DialogoDespublicar observacao={observacao} aberto={aberta === 'despublicar'} onFechar={() => setAberta(null)} />
      <DialogoBloquear observacao={observacao} aberto={aberta === 'bloquear'} onFechar={() => setAberta(null)} />
      <DialogoDesbloquear observacao={observacao} aberto={aberta === 'desbloquear'} onFechar={() => setAberta(null)} />
    </div>
  )
}

interface DialogoProps {
  observacao: ObservacaoAdmin
  aberto: boolean
  onFechar: () => void
}

function DialogoDespublicar({ observacao, aberto, onFechar }: DialogoProps) {
  const despublicar = useDespublicarObservacao()
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (valor) return
        despublicar.reset()
        onFechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirar da consulta pública?</DialogTitle>
          <DialogDescription>A observação volta a ser rascunho e deixa de aparecer na consulta imediatamente.</DialogDescription>
        </DialogHeader>
        <ResumoConfirmacao observacao={observacao} />
        <ErroDaAcao erro={despublicar.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button disabled={despublicar.isPending} onClick={() => despublicar.mutate(observacao.id, { onSuccess: onFechar })}>
            {despublicar.isPending ? 'Retirando…' : 'Retirar da consulta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoBloquear({ observacao, aberto, onFechar }: DialogoProps) {
  const bloquear = useBloquearObservacao()
  const [motivo, setMotivo] = React.useState('')
  const [erro, setErro] = React.useState<string>()

  // Cancelar, Esc ou bloquear: o próximo bloqueio começa sem o motivo anterior.
  function fechar() {
    bloquear.reset()
    setMotivo('')
    setErro(undefined)
    onFechar()
  }

  function confirmar() {
    const texto = motivo.trim()
    if (!texto) return setErro('Informe o motivo do bloqueio; ele é exibido a quem tentar publicar.')
    if (texto.length > MOTIVO_MAX) return setErro('O motivo pode ter até 500 caracteres.')
    bloquear.mutate({ id: observacao.id, motivo: texto }, { onSuccess: fechar })
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor) fechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear divulgação?</DialogTitle>
          <DialogDescription>
            Use quando a fonte restringe a divulgação, por exemplo por amostra insuficiente da pesquisa. Valores pequenos,
            como três hotéis ou zero patentes, são válidos e não exigem bloqueio.
          </DialogDescription>
        </DialogHeader>
        <ResumoConfirmacao observacao={observacao} />
        <FormField label="Motivo" labelVariant="field" htmlFor="motivo-bloqueio" error={erro} className="mt-4">
          <Textarea
            id="motivo-bloqueio"
            maxLength={MOTIVO_MAX}
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value)
              setErro(undefined)
            }}
            aria-invalid={!!erro}
            aria-describedby="motivo-bloqueio-message"
          />
        </FormField>
        {observacao.status === 'publicado' ? (
          <p className="mt-2 text-xs text-ink-muted">Esta observação está publicada e sai da consulta pública ao ser bloqueada.</p>
        ) : null}
        <ErroDaAcao erro={bloquear.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button disabled={bloquear.isPending} onClick={confirmar}>
            {bloquear.isPending ? 'Bloqueando…' : 'Bloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoDesbloquear({ observacao, aberto, onFechar }: DialogoProps) {
  const desbloquear = useDesbloquearObservacao()
  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (valor) return
        desbloquear.reset()
        onFechar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desbloquear divulgação?</DialogTitle>
          <DialogDescription>
            Motivo registrado: {observacao.motivoBloqueio}. A observação continua em rascunho e só aparece na consulta depois de
            publicada.
          </DialogDescription>
        </DialogHeader>
        <ErroDaAcao erro={desbloquear.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button disabled={desbloquear.isPending} onClick={() => desbloquear.mutate(observacao.id, { onSuccess: onFechar })}>
            {desbloquear.isPending ? 'Desbloqueando…' : 'Desbloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
