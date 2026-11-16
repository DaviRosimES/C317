import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { InicioPage } from '@/features/public/inicio-page'

/** Filtros do antigo Dashboard (`/?ano=&mes=&cnae=`): a consulta agora fica em Indicadores. */
const filtrosDoDashboard = z.object({ ano: z.unknown(), mes: z.unknown(), cnae: z.unknown() }).partial()

export const Route = createFileRoute('/_public/')({
  validateSearch: filtrosDoDashboard,
  beforeLoad: ({ search }) => {
    if (search.ano !== undefined || search.mes !== undefined || search.cnae !== undefined) {
      throw redirect({ to: '/indicadores', replace: true })
    }
  },
  component: InicioPage,
})
