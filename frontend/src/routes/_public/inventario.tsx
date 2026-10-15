import { createFileRoute } from '@tanstack/react-router'
import { InventarioPage } from '@/features/public/inventario-page'

export const Route = createFileRoute('/_public/inventario')({
  component: InventarioPage,
})
