import { z } from 'zod'

/** Variáveis de ambiente validadas na inicialização da aplicação. */
const envSchema = z.object({
  VITE_API_URL: z.url().default('http://localhost:8000'),
  VITE_API_MOCKS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
})

export const env = envSchema.parse(import.meta.env)
