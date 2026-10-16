import axios, { isAxiosError } from 'axios'
import { env } from '@/lib/env'
import { toApiError } from './api-error'
import { sessaoStore } from './sessao'
import { createMockAdapter } from '@/api/mocks/adapter'

export const http = axios.create({
  baseURL: `${env.VITE_API_URL.replace(/\/$/, '')}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { indexes: null },
  timeout: 15_000,
})

if (env.VITE_API_MOCKS) {
  http.defaults.adapter = createMockAdapter(axios.getAdapter(axios.defaults.adapter))
}

http.interceptors.request.use((config) => {
  const token = sessaoStore.token()
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    // Token recusado pela API (vencido, revogado ou de outro ambiente): a área administrativa exige novo login.
    if (apiError.status === 401 && isAxiosError(error) && error.config?.headers.has('Authorization')) {
      sessaoStore.encerrar('expirada')
    }
    return Promise.reject(apiError)
  },
)
