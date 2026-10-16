import * as React from 'react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  ListRow,
  ListRowThumb,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import { formatDate, formatRelativo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventarioFiltro, ItemInventario } from '@/models'
import { useInventarioPublico } from '@/queries/inventario.queries'
import { CATEGORIAS_INVENTARIO } from './categorias'

const TODAS = 'todas'

export function InventarioPage() {
  const [categoria, setCategoria] = React.useState(TODAS)
  const [busca, setBusca] = React.useState('')
  const [filtro, setFiltro] = React.useState<InventarioFiltro>({})
  const [detalhe, setDetalhe] = React.useState<ItemInventario | null>(null)
  const itens = useInventarioPublico(filtro)

  return (
    <PublicContainer>
      <PublicPageHeader
        title="Inventário Turístico Municipal"
        description="Consulte atrativos, equipamentos e serviços turísticos catalogados no município."
      />

      <form
        role="search"
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          setFiltro({ busca, categoria: categoria === TODAS ? undefined : categoria })
        }}
      >
        <FormField label="Categoria" labelVariant="field" htmlFor="categoria" className="sm:w-64">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger id="categoria">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as categorias</SelectItem>
              {CATEGORIAS_INVENTARIO.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Busca" labelVariant="field" htmlFor="busca" className="sm:w-80">
          <Input id="busca" placeholder="Nome ou palavra-chave" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </FormField>
        <Button type="submit" variant="gradient" className="sm:w-28">
          Filtrar
        </Button>
      </form>

      <section aria-live="polite" className={cn('flex flex-col gap-4', itens.isFetching && 'opacity-70')}>
        {itens.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : itens.error ? (
          <EmptyState title="Não foi possível carregar o inventário" description={itens.error.message} />
        ) : itens.data.length ? (
          itens.data.map((item) => (
            <ListRow
              key={item.id}
              leading={<ListRowThumb>PIT</ListRowThumb>}
              title={item.nome}
              subtitle={`${item.categoria} • ${item.localizacao}`}
              meta={<span>Atualizado {formatRelativo(item.ultimaRevisao)}</span>}
              actions={
                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDetalhe(item)}>
                  Ver detalhes
                </Button>
              }
            />
          ))
        ) : (
          <EmptyState title="Nenhum item encontrado" description="Ajuste a categoria ou a busca." />
        )}
      </section>

      <Dialog open={!!detalhe} onOpenChange={(open) => !open && setDetalhe(null)}>
        <DialogContent>
          {detalhe ? (
            <>
              <DialogHeader>
                <DialogTitle>{detalhe.nome}</DialogTitle>
                <DialogDescription>
                  {detalhe.categoria} • {detalhe.localizacao}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-ink">{detalhe.descricao || 'Sem descrição cadastrada.'}</p>
              <p className="mt-4 text-xs text-ink-muted">Última revisão: {formatDate(detalhe.ultimaRevisao)}</p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PublicContainer>
  )
}
