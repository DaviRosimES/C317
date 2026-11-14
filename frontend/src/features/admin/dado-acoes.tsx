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
import type { DadoIndicadorAdmin } from '@/models'
import {
  useArquivarDado,
  useBloquearDado,
  useDesbloquearDado,
  useDespublicarDado,
  usePublicarDado,
  useRestaurarDado,
} from '@/queries/admin-dado-indicador.queries'
import { ResumoDado } from './dado-resumo'
import { TEXTOS_ADMIN } from './textos'

const MOTIVO_MAX = 1000

function ErroDaAcao({ erro }: { erro: Error | null }) {
  if (!erro) return null
  return (
    <Alert variant="danger" className="mt-4">
      <AlertCircle aria-hidden />
      <p>{erro.message}</p>
    </Alert>
  )
}

interface DialogoAcaoProps {
  dado: DadoIndicadorAdmin
  aberto: boolean
  titulo: string
  descricao: React.ReactNode
  rotulo: string
  rotuloPendente: string
  destaque?: boolean
  pendente: boolean
  erro: Error | null
  /** Limpa o estado da mutation ao fechar. */
  reiniciar: () => void
  onFechar: () => void
  /** Chamada ao confirmar; chama `aoConcluir` só depois do sucesso da API. */
  onConfirmar: (aoConcluir: () => void) => void
  children?: React.ReactNode
}

/** Confirmação com o resumo do dado; o erro da API aparece aqui e o sucesso só é tratado após a resposta. */
function DialogoAcao({
  dado,
  aberto,
  titulo,
  descricao,
  rotulo,
  rotuloPendente,
  destaque,
  pendente,
  erro,
  reiniciar,
  onFechar,
  onConfirmar,
  children,
}: DialogoAcaoProps) {
  const fechar = () => {
    reiniciar()
    onFechar()
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
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <ResumoDado dado={dado} />
        {children}
        <ErroDaAcao erro={erro} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button variant={destaque ? 'gradient' : 'primary'} disabled={pendente} onClick={() => onConfirmar(fechar)}>
            {pendente ? rotuloPendente : rotulo}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Publicação com resumo, usada na lista, no resultado do cadastro e no detalhe. */
export function DialogoPublicar({
  dado,
  onFechar,
  onPublicado,
}: {
  dado: DadoIndicadorAdmin | null
  onFechar: () => void
  onPublicado?: (dado: DadoIndicadorAdmin) => void
}) {
  const publicar = usePublicarDado()
  if (!dado) return <DialogoVazio />
  return (
    <DialogoAcao
      dado={dado}
      aberto
      titulo="Publicar dado?"
      descricao="O valor fica visível na consulta pública, com unidade, referência, fonte e notas."
      rotulo="Publicar"
      rotuloPendente="Publicando…"
      destaque
      pendente={publicar.isPending}
      erro={publicar.error}
      reiniciar={publicar.reset}
      onFechar={onFechar}
      onConfirmar={(concluir) =>
        publicar.mutate(dado.id, {
          onSuccess: (publicado) => {
            onPublicado?.(publicado)
            concluir()
          },
        })
      }
    />
  )
}

const DialogoVazio = () => null

type Acao = 'publicar' | 'despublicar' | 'arquivar' | 'restaurar' | 'bloquear' | 'desbloquear'

/** Publicar, despublicar, arquivar, restaurar, bloquear e desbloquear, cada um com confirmação. */
export function AcoesDado({ dado }: { dado: DadoIndicadorAdmin }) {
  const [aberta, setAberta] = React.useState<Acao | null>(null)
  const fechar = () => setAberta(null)
  const publicar = usePublicarDado()
  const despublicar = useDespublicarDado()
  const arquivar = useArquivarDado()
  const restaurar = useRestaurarDado()
  const bloquear = useBloquearDado()
  const desbloquear = useDesbloquearDado()
  const [motivo, setMotivo] = React.useState('')
  const [erroMotivo, setErroMotivo] = React.useState<string>()

  const bloqueado = dado.divulgacaoBloqueada
  const publicado = dado.status === 'publicado'
  const indicadorArquivado = dado.indicador.arquivado
  const impedePublicar = bloqueado || indicadorArquivado

  if (dado.arquivado) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-muted">
          Este dado está arquivado. Restaure-o para editar, publicar, despublicar ou bloquear a divulgação; ele volta à situação
          anterior ao arquivamento.
        </p>
        <Button className="self-start" onClick={() => setAberta('restaurar')}>
          Restaurar
        </Button>
        <DialogoAcao
          dado={dado}
          aberto={aberta === 'restaurar'}
          titulo="Restaurar dado?"
          descricao={TEXTOS_ADMIN.restauracao}
          rotulo="Restaurar"
          rotuloPendente="Restaurando…"
          pendente={restaurar.isPending}
          erro={restaurar.error}
          reiniciar={restaurar.reset}
          onFechar={fechar}
          onConfirmar={(concluir) => restaurar.mutate(dado.id, { onSuccess: concluir })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {bloqueado ? (
        <Alert variant="danger">
          <Ban aria-hidden />
          <p>
            <strong className="font-semibold">Publicação impedida.</strong> Divulgação bloqueada: {dado.motivoBloqueio}
          </p>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {publicado ? (
          <Button variant="secondary" onClick={() => setAberta('despublicar')}>
            Despublicar
          </Button>
        ) : (
          <Button variant="gradient" disabled={impedePublicar} aria-describedby={impedePublicar ? 'publicacao-impedida' : undefined} onClick={() => setAberta('publicar')}>
            Publicar
          </Button>
        )}
        {bloqueado ? (
          <Button variant="secondary" onClick={() => setAberta('desbloquear')}>
            Desbloquear divulgação
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setAberta('bloquear')}>
            Bloquear divulgação
          </Button>
        )}
        <Button variant="ghost" onClick={() => setAberta('arquivar')}>
          Arquivar
        </Button>
      </div>
      {impedePublicar ? (
        <p id="publicacao-impedida" className="text-xs text-ink-muted">
          {bloqueado
            ? 'Desbloqueie somente se a restrição da fonte deixou de valer. O dado continua em rascunho até ser publicado.'
            : 'O indicador está arquivado: restaure o indicador para publicar este dado.'}
        </p>
      ) : null}

      <DialogoAcao
        dado={dado}
        aberto={aberta === 'publicar'}
        titulo="Publicar dado?"
        descricao="O valor fica visível na consulta pública, com unidade, referência, fonte e notas."
        rotulo="Publicar"
        rotuloPendente="Publicando…"
        destaque
        pendente={publicar.isPending}
        erro={publicar.error}
        reiniciar={publicar.reset}
        onFechar={fechar}
        onConfirmar={(concluir) => publicar.mutate(dado.id, { onSuccess: concluir })}
      />
      <DialogoAcao
        dado={dado}
        aberto={aberta === 'despublicar'}
        titulo="Despublicar dado?"
        descricao="O dado volta a ser rascunho e sai da consulta pública imediatamente. Nada é apagado."
        rotulo="Despublicar"
        rotuloPendente="Despublicando…"
        pendente={despublicar.isPending}
        erro={despublicar.error}
        reiniciar={despublicar.reset}
        onFechar={fechar}
        onConfirmar={(concluir) => despublicar.mutate(dado.id, { onSuccess: concluir })}
      />
      <DialogoAcao
        dado={dado}
        aberto={aberta === 'arquivar'}
        titulo="Arquivar dado?"
        descricao="O dado sai da consulta pública e das listas ativas. O status (rascunho ou publicado) e o bloqueio são preservados, e ele pode ser restaurado depois."
        rotulo="Arquivar"
        rotuloPendente="Arquivando…"
        pendente={arquivar.isPending}
        erro={arquivar.error}
        reiniciar={arquivar.reset}
        onFechar={fechar}
        onConfirmar={(concluir) => arquivar.mutate(dado.id, { onSuccess: concluir })}
      />
      <DialogoAcao
        dado={dado}
        aberto={aberta === 'bloquear'}
        titulo="Bloquear divulgação?"
        descricao="Use quando a fonte restringe a divulgação, por exemplo por amostra insuficiente da pesquisa. Valores pequenos, como três hotéis ou zero patentes, são válidos e não exigem bloqueio."
        rotulo="Bloquear"
        rotuloPendente="Bloqueando…"
        pendente={bloquear.isPending}
        erro={bloquear.error}
        reiniciar={() => {
          bloquear.reset()
          setMotivo('')
          setErroMotivo(undefined)
        }}
        onFechar={fechar}
        onConfirmar={(concluir) => {
          const texto = motivo.trim()
          if (!texto) return setErroMotivo('Informe o motivo do bloqueio; ele é exibido a quem tentar publicar.')
          if (texto.length > MOTIVO_MAX) return setErroMotivo('O motivo pode ter até 1.000 caracteres.')
          bloquear.mutate({ id: dado.id, motivo: texto }, { onSuccess: concluir })
        }}
      >
        <FormField label="Motivo" labelVariant="field" htmlFor="motivo-bloqueio" error={erroMotivo} className="mt-4">
          <Textarea
            id="motivo-bloqueio"
            maxLength={MOTIVO_MAX}
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value)
              setErroMotivo(undefined)
            }}
            aria-invalid={!!erroMotivo}
            aria-describedby="motivo-bloqueio-message"
          />
        </FormField>
        {publicado ? <p className="mt-2 text-xs text-ink-muted">Este dado está publicado e sai da consulta pública ao ser bloqueado.</p> : null}
      </DialogoAcao>
      <DialogoAcao
        dado={dado}
        aberto={aberta === 'desbloquear'}
        titulo="Desbloquear divulgação?"
        descricao={`Motivo registrado: ${dado.motivoBloqueio ?? '—'}. O dado continua em seu status atual e só aparece na consulta quando estiver publicado.`}
        rotulo="Desbloquear"
        rotuloPendente="Desbloqueando…"
        pendente={desbloquear.isPending}
        erro={desbloquear.error}
        reiniciar={desbloquear.reset}
        onFechar={fechar}
        onConfirmar={(concluir) => desbloquear.mutate(dado.id, { onSuccess: concluir })}
      />
    </div>
  )
}
