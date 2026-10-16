import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { z } from 'zod'
import { Brand } from '@/components/layout/brand'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, FormField, Input } from '@/components/ui'
import type { LoginSearch, MotivoLogin } from '@/lib/schemas'
import type { Credenciais } from '@/models'
import { useEntrar } from '@/queries/auth.queries'

const credenciaisSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').pipe(z.email('Informe um e-mail válido.')),
  senha: z.string().min(1, 'Informe a senha.'),
})

type ErrosCredenciais = Partial<Record<keyof Credenciais, string>>

const AVISOS: Record<MotivoLogin, { variant: 'warning' | 'success' | 'danger'; icon: typeof Clock; texto: string }> = {
  expirada: { variant: 'warning', icon: Clock, texto: 'Sua sessão expirou. Entre novamente para continuar.' },
  saiu: { variant: 'success', icon: CheckCircle2, texto: 'Você saiu da área administrativa.' },
  'sem-permissao': {
    variant: 'danger',
    icon: AlertCircle,
    texto: 'Esta conta não tem acesso à área administrativa.',
  },
}

export function LoginPage({ search }: { search: LoginSearch }) {
  const navigate = useNavigate()
  const entrar = useEntrar()
  const [credenciais, setCredenciais] = React.useState<Credenciais>({ email: '', senha: '' })
  const [erros, setErros] = React.useState<ErrosCredenciais>({})

  const alterar = (campo: keyof Credenciais, valor: string) => {
    setCredenciais((atual) => ({ ...atual, [campo]: valor }))
    setErros((atual) => ({ ...atual, [campo]: undefined }))
    entrar.reset()
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resultado = credenciaisSchema.safeParse(credenciais)
    if (!resultado.success) {
      const novos: ErrosCredenciais = {}
      for (const issue of resultado.error.issues) novos[issue.path[0] as keyof Credenciais] ??= issue.message
      setErros(novos)
      document.getElementById(novos.email ? 'email' : 'senha')?.focus()
      return
    }
    entrar.mutate(resultado.data, {
      onSuccess: () => void navigate({ href: search.redirect ?? '/admin/lancamentos', replace: true }),
      onError: () => setCredenciais((atual) => ({ ...atual, senha: '' })),
    })
  }

  const aviso = !entrar.error && search.motivo ? AVISOS[search.motivo] : null

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Brand className="self-center" />
        <Card className="overflow-hidden shadow-card">
          <div aria-hidden className="h-1.5 bg-brand-gradient" />
          <CardHeader className="gap-1.5 pt-7">
            <h1 className="text-xl font-bold text-ink">Área administrativa</h1>
            <CardDescription>Entre com a conta da equipe responsável pelo cadastro e pela publicação dos indicadores.</CardDescription>
          </CardHeader>
          <CardContent>
            <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
              {aviso ? (
                <Alert variant={aviso.variant}>
                  <aviso.icon aria-hidden />
                  <p>{aviso.texto}</p>
                </Alert>
              ) : null}
              {entrar.error ? (
                <Alert variant="danger">
                  <AlertCircle aria-hidden />
                  <p>{entrar.error.message}</p>
                </Alert>
              ) : null}

              <FormField label="E-mail" labelVariant="field" htmlFor="email" error={erros.email}>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  value={credenciais.email}
                  onChange={(event) => alterar('email', event.target.value)}
                  aria-invalid={!!erros.email}
                  aria-describedby={erros.email ? 'email-message' : undefined}
                />
              </FormField>
              <FormField label="Senha" labelVariant="field" htmlFor="senha" error={erros.senha}>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  value={credenciais.senha}
                  onChange={(event) => alterar('senha', event.target.value)}
                  aria-invalid={!!erros.senha}
                  aria-describedby={erros.senha ? 'senha-message' : undefined}
                />
              </FormField>

              <Button type="submit" variant="gradient" className="mt-2 w-full" disabled={entrar.isPending}>
                {entrar.isPending ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button asChild variant="link" className="self-center">
          <Link to="/">
            <ArrowLeft aria-hidden />
            Voltar ao portal público
          </Link>
        </Button>
      </div>
    </main>
  )
}
