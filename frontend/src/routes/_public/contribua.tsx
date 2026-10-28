import { createFileRoute } from '@tanstack/react-router'
import { ContribuaPage } from '@/features/public/contribua-page'

export const Route = createFileRoute('/_public/contribua')({
  component: ContribuaPage,
})
