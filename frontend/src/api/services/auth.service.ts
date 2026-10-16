import { http } from '@/api/http/client'
import { ApiError } from '@/api/http/api-error'
import { sessaoStore } from '@/api/http/sessao'
import type { TokenResponseDto, UsuarioResponseDto } from '@/api/dtos'
import { toLoginRequestDto, toSessao, toUsuario } from '@/api/mappers/auth.mapper'
import type { Credenciais, EstadoSessao, MotivoFimSessao, Usuario } from '@/models'

export const PAPEL_ADMIN = 'admin'

export const authService = {
  /** Autentica e guarda a sessão somente para contas da equipe administrativa. */
  async entrar(credenciais: Credenciais): Promise<Usuario> {
    sessaoStore.limpar()
    const { data: token } = await http.post<TokenResponseDto>('/auth/login', toLoginRequestDto(credenciais))
    const sessao = toSessao(token)
    const { data: usuario } = await http.get<UsuarioResponseDto>('/auth/me', {
      headers: { Authorization: `Bearer ${sessao.token}` },
    })
    if (usuario.papel !== PAPEL_ADMIN) {
      throw new ApiError('Esta conta não tem acesso à área administrativa.', 403)
    }
    sessaoStore.salvar(sessao)
    return toUsuario(usuario)
  },

  async usuarioAtual(): Promise<Usuario> {
    const { data } = await http.get<UsuarioResponseDto>('/auth/me')
    return toUsuario(data)
  },

  estadoSessao: (): EstadoSessao => sessaoStore.estado(),

  sair() {
    sessaoStore.encerrar('saiu')
  },

  aoEncerrarSessao: (ouvinte: (motivo: MotivoFimSessao) => void) => sessaoStore.aoEncerrar(ouvinte),
}
