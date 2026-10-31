import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button, FormField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import type { Cnae } from '@/models'

export const TODOS = 'todos'

export function SetorSelect({
  cnaes,
  value,
  onChange,
  id = 'setor',
}: {
  cnaes: Cnae[] | undefined
  value: string | undefined
  onChange: (value: string | undefined) => void
  id?: string
}) {
  return (
    <FormField label="Setor (CNAE)" htmlFor={id} className="w-full sm:w-60">
      <Select value={value ?? TODOS} onValueChange={(v) => onChange(v === TODOS ? undefined : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Todos os setores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os setores</SelectItem>
          {cnaes?.map((cnae) => (
            <SelectItem key={cnae.codigo} value={cnae.codigo}>
              {cnae.nome} ({cnae.codigo}){cnae.provisorio ? ' · provisório' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export function AvisoFiltro({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-info-soft px-4 py-2.5 text-[13px] text-brand-purple">{children}</p>
}

export function AvisoFiltroCnae({ ativo }: { ativo: boolean }) {
  if (!ativo) return null
  return (
    <AvisoFiltro>
      O filtro de setor (CNAE) restringe os cards e gráficos por setor. Totais municipais continuam sendo do município inteiro
      e não representam o setor escolhido.
    </AvisoFiltro>
  )
}

export function LimparFiltros({ onClick, desabilitado }: { onClick: () => void; desabilitado?: boolean }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={desabilitado}>
      <RotateCcw aria-hidden />
      Limpar filtros
    </Button>
  )
}
