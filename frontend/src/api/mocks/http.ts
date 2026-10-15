export interface MockRequest {
  params: Record<string, string>
  query: Record<string, unknown>
  body: unknown
}

export interface MockResult {
  status?: number
  data?: unknown
}

export type MockHandler = (req: MockRequest) => MockResult | Promise<MockResult>

export interface MockRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  handler: MockHandler
}

export class MockHttpError extends Error {
  readonly status: number
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}
