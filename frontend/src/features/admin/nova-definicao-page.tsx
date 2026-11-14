import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { Alert, Button, EmptyState, Skeleton } from '@/components/ui'
import { useCatalogosAdmin, useCriarDefinicao } from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DefinicaoForm } from './definicao-form'
import { rascunhoVazio } from './definicao-validacao'

export function NovaDefinicaoPage() {
  const navigate = useNavigate()
  const catalogos = useCatalogosAdmin()
  const criar = useCriarDefinicao()

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Novo indicador"
        description="Defina o que será medido e quais dados o indicador aceita. Os valores são cadastrados depois, em Dados do indicador."
      />

      <Alert variant="info">
        <AlertCircle aria-hidden />
        <p>
          O indicador só aparece na consulta pública quando tiver dados publicados. Não é preciso publicar o indicador em si.
        </p>
      </Alert>

      {catalogos.isSuccess ? (
        <DefinicaoForm
          inicial={rascunhoVazio()}
          catalogos={catalogos.data}
          salvando={criar.isPending}
          erro={criar.error}
          rotuloSalvar="Cadastrar indicador"
          cancelar={
            <Button asChild variant="ghost">
              <Link to="/admin/indicadores">Cancelar</Link>
            </Button>
          }
          onSalvar={(entrada) =>
            // O sucesso só é mostrado depois da resposta da API; em falha o formulário continua preenchido.
            criar.mutate(entrada, {
              onSuccess: (definicao) =>
                void navigate({ to: '/admin/indicadores/$codigo', params: { codigo: definicao.codigo }, search: { criado: true } }),
            })
          }
        />
      ) : catalogos.isError ? (
        <EmptyState
          title="Não foi possível carregar as opções do formulário"
          description={catalogos.error.message}
          action={
            <Button variant="secondary" onClick={() => void catalogos.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
    </AdminContainer>
  )
}
