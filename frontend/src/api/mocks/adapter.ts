import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { handlers } from './handlers'
import { MockHttpError, type MockRequest } from './http'

const LATENCIA_MS = 250

function compilar(path: string) {
  const keys: string[] = []
  const pattern = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })
  return { regex: new RegExp(`^${pattern}/?$`), keys }
}

const rotas = handlers.map((rota) => ({ ...rota, ...compilar(rota.path) }))

function parseBody(data: unknown) {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

function resposta(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: String(status), headers: new AxiosHeaders(), config, request: {} }
}

export function createMockAdapter(real: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    const method = (config.method ?? 'get').toUpperCase()
    const url = (config.url ?? '').split('?')[0]

    for (const rota of rotas) {
      if (rota.method !== method) continue
      const match = rota.regex.exec(url)
      if (!match) continue

      const req: MockRequest = {
        params: Object.fromEntries(rota.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])),
        query: (config.params as Record<string, unknown>) ?? {},
        body: parseBody(config.data),
      }

      await new Promise((resolve) => setTimeout(resolve, LATENCIA_MS))
      try {
        const result = await rota.handler(req)
        return resposta(config, result.status ?? 200, result.data ?? null)
      } catch (error) {
        if (!(error instanceof MockHttpError)) throw error
        const response = resposta(config, error.status, { detail: error.message })
        throw new AxiosError(error.message, AxiosError.ERR_BAD_REQUEST, config, null, response)
      }
    }

    return real(config)
  }
}
