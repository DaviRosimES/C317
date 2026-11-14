import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui'
import type { RelatorioAdmin } from '@/models'
import { useCriarRelatorio, useLimitesRelatorio } from '@/queries/admin-relatorio.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DialogoPublicarRelatorio } from './relatorio-acoes'
import { RelatorioFormCadastro, textoDoLimite } from './relatorio-form'
import { SituacaoBadges } from './situacao'

export function NovoRelatorioPage() {
  const limites = useLimitesRelatorio()
  const criar = useCriarRelatorio()
  const [criado, setCriado] = React.useState<RelatorioAdmin | null>(null)
  const [publicando, setPublicando] = React.useState(false)
  // Recria o formulário (campos e arquivo) em "Cadastrar outro".
  const [formulario, setFormulario] = React.useState(0)

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Novo relatório"
        description={limites.data ? `${textoDoLimite(limites.data)}. O relatório começa como rascunho.` : 'O relatório começa como rascunho.'}
      />

      {criado ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Alert variant="success">
              <CheckCircle2 aria-hidden />
              <p>Rascunho salvo. Fica fora da consulta pública até ser publicado.</p>
            </Alert>
            <div className="flex flex-col gap-1.5">
              <p className="break-words font-semibold text-ink">{criado.titulo}</p>
              <SituacaoBadges status={criado.status} arquivado={criado.arquivado} demonstracao={criado.demonstracao} />
            </div>
            <div className="flex flex-wrap gap-3">
              {criado.status === 'rascunho' ? (
                <Button variant="gradient" onClick={() => setPublicando(true)}>
                  Publicar
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link to="/admin/relatorios/$relatorioId" params={{ relatorioId: criado.id }}>
                  Abrir relatório
                </Link>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCriado(null)
                  criar.reset()
                  setFormulario((n) => n + 1)
                }}
              >
                Cadastrar outro
              </Button>
            </div>
            <DialogoPublicarRelatorio relatorio={criado} aberto={publicando} onFechar={() => setPublicando(false)} onPublicado={setCriado} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dados do relatório</CardTitle>
            <CardDescription>Informe número, tipo, data e referência somente se constarem no documento.</CardDescription>
          </CardHeader>
          <CardContent>
            {limites.isPending ? <Skeleton className="mb-4 h-5 w-48" /> : null}
            {limites.error ? (
              <Alert variant="warning" className="mb-4">
                <p>Não foi possível consultar o limite de envio: {limites.error.message} O servidor confere o arquivo ao salvar.</p>
              </Alert>
            ) : null}
            <RelatorioFormCadastro
              key={formulario}
              limites={limites.data}
              pendente={criar.isPending}
              erro={criar.error}
              onSubmit={(entrada) => criar.mutate(entrada, { onSuccess: setCriado })}
            />
          </CardContent>
        </Card>
      )}

      <Button asChild variant="secondary" className="self-start">
        <Link to="/admin/relatorios">Voltar aos relatórios</Link>
      </Button>
    </AdminContainer>
  )
}
