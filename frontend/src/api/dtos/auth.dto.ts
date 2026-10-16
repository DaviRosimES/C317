export interface LoginRequestDto {
  email: string
  senha: string
}

export interface TokenResponseDto {
  access_token: string
  token_type: string
  /** Validade do token em segundos. */
  expires_in: number
}

export interface UsuarioResponseDto {
  id: number
  nome: string
  email: string
  papel: string
}
