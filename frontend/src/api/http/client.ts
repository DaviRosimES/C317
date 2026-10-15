import axios from 'axios'
import { env } from '@/lib/env'
import { toApiError } from './api-error'
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

http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)
