import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Plus } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  FilterChip,
  FilterChips,
  FormField,
  Input,
  ListRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import { rotuloTipoReferencia } from '@/lib/referencia'
import type { DefinicoesSearch } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { CatalogosAdmin, DefinicoesFiltro, SituacaoArquivo } from '@/models'
import { useCatalogosAdmin, useDefinicoes } from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { TEXTOS_ADMIN } from './textos'

const SITUACOES: { valor: SituacaoArquivo; rotulo: string }[] = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'arquivados', rotulo: 'Arquivados' },
  { valor: 'todos', rotulo: 'Todos' },
]

/** Filtros da URL → filtro da API. Usado também pelo loader da rota. */
export function filtroDasDefinicoes(search: DefinicoesSearch): DefinicoesFiltro {
  return { situacao: search.situacao ?? 'ativos', setor: search.setor, busca: search.busca }
}

export function DefinicoesPage({ search }: { search: DefinicoesSearch }) {
  const navigate = useNavigate()
  const catalogos = useCatalogosAdmin()
  const definicoes = useDefinicoes(filtroDasDefinicoes(search))

  const buscar = (novo: DefinicoesSearch) => void navigate({ to: '/admin/indicadores', search: novo })
  const situacao = search.situacao ?? 'ativos'
  const filtrosAtivos = search.setor !== undefined || search.busca !== undefined

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Indicadores"
        description={TEXTOS_ADMIN.indicadores}
        actions={
          <Button asChild variant="gradient">
            <Link to="/admin/indicadores/novo">
              <Plus aria-hidden />
              Novo indicador
            </Link>
          </Button>
        }
      />

      <FilterChips
        aria-label="Situação"
        value={situacao}
        onValueChange={(valor) => buscar({ ...search, situacao: valor === 'ativos' ? undefined : (valor as SituacaoArquivo) })}
      >
        {SITUACOES.map((item) => (
          <FilterChip key={item.valor} value={item.valor}>
            {item.rotulo}
          </FilterChip>
        ))}
      </FilterChips>

      {catalogos.data ? (
        <FiltrosDefinicoes
          // Recriado quando a URL muda (ex.: "Limpar"), descartando o rascunho anterior.
          key={JSON.stringify(search)}
          search={search}
          catalogos={catalogos.data}
          onAplicar={(filtros) => buscar({ situacao: search.situacao, ...filtros })}
          onLimpar={filtrosAtivos ? () => buscar({ situacao: search.situacao }) : undefined}
        />
      ) : catalogos.isPending ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>Não foi possível carregar os filtros: {catalogos.error.message}</p>
        </Alert>
      )}

      <section aria-live="polite" className={cn('flex flex-col gap-3', definicoes.isFetching && 'opacity-70')}>
        {definicoes.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : definicoes.isError ? (
          <EmptyState title="Não foi possível carregar os indicadores" description={definicoes.error.message} />
        ) : definicoes.data.length ? (
          <>
            <p className="text-[13px] text-ink-muted">
              {definicoes.data.length === 1 ? '1 indicador' : `${definicoes.data.length.toLocaleString('pt-BR')} indicadores`}
            </p>
            {definicoes.data.map((d) => (
              <ListRow
                key={d.codigo}
                title={d.nome}
                subtitle={`Unidade: ${d.unidade.nome}`}
                meta={
                  <>
                    <span className="break-words">Setores: {d.setores.map((s) => s.nome).join(', ') || 'nenhum'}</span>
                    <span className="break-words">
                      Referências: {d.tiposReferenciaPermitidos.map(rotuloTipoReferencia).join(', ') || 'nenhuma'}
                    </span>
                    <span>{d.totalDados ? `${d.totalDados.toLocaleString('pt-BR')} ${d.totalDados === 1 ? 'dado' : 'dados'}` : 'Sem dados cadastrados'}</span>
                  </>
                }
                aside={d.arquivado ? <Badge variant="neutral">Arquivado</Badge> : null}
                actions={
                  <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                    <Link to="/admin/indicadores/$codigo" params={{ codigo: d.codigo }}>
                      Abrir
                    </Link>
                  </Button>
                }
              />
            ))}
          </>
        ) : filtrosAtivos || situacao !== 'ativos' ? (
          <EmptyState
            title="Nenhum indicador para estes filtros"
            description="Altere ou limpe os filtros, ou escolha outra situação, para ver outros indicadores."
          />
        ) : (
          <EmptyState
            title="Nenhum indicador cadastrado"
            description="Cadastre o primeiro indicador para depois registrar os dados dele."
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/indicadores/novo">Novo indicador</Link>
              </Button>
            }
          />
        )}
      </section>
    </AdminContainer>
  )
}

const TODOS = 'todos'
type Filtros = Pick<DefinicoesSearch, 'setor' | 'busca'>

/** Rascunho local dos filtros; a consulta só muda ao aplicar. */
function FiltrosDefinicoes({
  search,
  catalogos,
  onAplicar,
  onLimpar,
}: {
  search: DefinicoesSearch
  catalogos: CatalogosAdmin
  onAplicar: (filtros: Filtros) => void
  onLimpar?: () => void
}) {
  const [setor, setSetor] = React.useState(search.setor)
  const [busca, setBusca] = React.useState(search.busca ?? '')

  function aplicar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAplicar({ setor, busca: busca.trim() || undefined })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form noValidate onSubmit={aplicar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Setor do Observatório" labelVariant="field" htmlFor="filtro-setor">
              <Select value={setor ?? TODOS} onValueChange={(valor) => setSetor(valor === TODOS ? undefined : valor)}>
                <SelectTrigger id="filtro-setor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value={TODOS}>Todos os setores</SelectItem>
                  {catalogos.setores.map((s) => (
                    <SelectItem key={s.codigo} value={s.codigo} className="whitespace-normal">
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Nome do indicador" labelVariant="field" htmlFor="filtro-busca">
              <Input
                id="filtro-busca"
                type="search"
                autoComplete="off"
                maxLength={300}
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {onLimpar ? (
              <Button type="button" variant="ghost" onClick={onLimpar}>
                Limpar filtros
              </Button>
            ) : null}
            <Button type="submit" variant="secondary">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
