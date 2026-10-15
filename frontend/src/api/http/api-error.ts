import { isAxiosError } from 'axios'

interface PydanticErrorItem {
  loc: (string | number)[]
  msg: string
  type?: string
}

interface ErrorBody {
  detail?: string | PydanticErrorItem[]
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const GENERIC_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.'
const NETWORK_MESSAGE = 'Não foi possível conectar à API. Verifique se o back-end está em execução.'

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!isAxiosError<ErrorBody>(error)) return new ApiError(GENERIC_MESSAGE, 0)
  if (!error.response) return new ApiError(NETWORK_MESSAGE, 0)

  const { status, data } = error.response
  const detail = data?.detail
  if (typeof detail === 'string') return new ApiError(detail, status)
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of detail) {
      const field = item.loc.slice(1).join('.') || String(item.loc[0])
      fieldErrors[field] ??= item.msg
    }
    const first = detail[0]?.msg
    return new ApiError(first ?? GENERIC_MESSAGE, status, fieldErrors)
  }
  return new ApiError(GENERIC_MESSAGE, status)
}

export const errorMessage = (error: unknown) => toApiError(error).message
