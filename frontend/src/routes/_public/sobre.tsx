import { createFileRoute } from '@tanstack/react-router'
import { SobrePage } from '@/features/public/sobre-page'

export const Route = createFileRoute('/_public/sobre')({
  component: SobrePage,
})
