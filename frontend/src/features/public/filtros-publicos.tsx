import { FormField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
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
    <FormField label="Setor" htmlFor={id} className="w-full sm:w-60">
      <Select value={value ?? TODOS} onValueChange={(v) => onChange(v === TODOS ? undefined : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Todos os setores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os setores</SelectItem>
          {cnaes?.map((cnae) => (
            <SelectItem key={cnae.codigo} value={cnae.codigo}>
              {cnae.nome} ({cnae.codigo})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export function AvisoFiltroCnae({ ativo }: { ativo: boolean }) {
  if (!ativo) return null
  return (
    <p className="rounded-md bg-info-soft px-4 py-2.5 text-[13px] text-brand-purple">
      O filtro de setor (CNAE) vale para os indicadores por setor. Totais municipais — como leitos e ocupação média — não
      são afetados.
    </p>
  )
}
