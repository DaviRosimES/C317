import { Badge, DemoBadge } from '@/components/ui'
import type { StatusPublicacao } from '@/models'

/**
 * Status e arquivamento são independentes: um publicado arquivado continua "Publicado" e também
 * "Arquivado". Cor não é o único sinal; cada estado tem o próprio texto.
 */
export function SituacaoBadges({
  status,
  arquivado,
  bloqueado = false,
  demonstracao = false,
}: {
  status?: StatusPublicacao
  arquivado: boolean
  bloqueado?: boolean
  demonstracao?: boolean
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {status === 'publicado' ? <Badge variant="success">Publicado</Badge> : status === 'rascunho' ? <Badge variant="warning">Rascunho</Badge> : null}
      {arquivado ? <Badge variant="neutral">Arquivado</Badge> : null}
      {bloqueado ? <Badge variant="danger">Divulgação bloqueada</Badge> : null}
      {demonstracao ? <DemoBadge /> : null}
    </span>
  )
}
