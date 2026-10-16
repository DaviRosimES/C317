import * as React from 'react'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { Label, type labelVariants } from './label'

interface FormFieldProps extends React.ComponentProps<'div'> {
  /** Estilo do rótulo: 'eyebrow' (público) ou 'field' (admin). */
  labelVariant?: VariantProps<typeof labelVariants>['variant']
  label: string
  /** id do controle associado ao rótulo. */
  htmlFor?: string
  hint?: string
  /** Mensagem de erro (ex.: vinda de um z.safeParse). */
  error?: string
}

/** Rótulo + controle + dica/erro. Combine com schemas do zod. */
function FormField({ label, labelVariant, htmlFor, hint, error, className, children, ...props }: FormFieldProps) {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined
  return (
    <div data-slot="form-field" className={cn('flex flex-col gap-1.5', className)} {...props}>
      <Label htmlFor={htmlFor} variant={labelVariant}>{label}</Label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { FormField }
