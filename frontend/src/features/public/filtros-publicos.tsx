import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'

export function LimparFiltros({ onClick, desabilitado }: { onClick: () => void; desabilitado?: boolean }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={desabilitado}>
      <RotateCcw aria-hidden />
      Limpar filtros
    </Button>
  )
}
