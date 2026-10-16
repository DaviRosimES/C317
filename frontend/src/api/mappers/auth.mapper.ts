import type { LoginRequestDto, TokenResponseDto, UsuarioResponseDto } from '@/api/dtos'
import type { Credenciais, Sessao, Usuario } from '@/models'

export const toLoginRequestDto = (credenciais: Credenciais): LoginRequestDto => ({
  email: credenciais.email.trim(),
  senha: credenciais.senha,
})

export const toSessao = (dto: TokenResponseDto, agora = new Date()): Sessao => ({
  token: dto.access_token,
  expiraEm: new Date(agora.getTime() + dto.expires_in * 1000),
})

export const toUsuario = (dto: UsuarioResponseDto): Usuario => ({ ...dto })
