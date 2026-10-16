export interface Credenciais {
  email: string
  senha: string
}

export interface Sessao {
  token: string
  expiraEm: Date
}

/** 'ativa': token dentro da validade; 'expirada': havia sessão, mas o prazo acabou. */
export type EstadoSessao = 'ativa' | 'expirada' | 'ausente'

/** Por que a sessão terminou: saída da conta (nesta ou em outra aba) ou expiração/recusa do token. */
export type MotivoFimSessao = 'saiu' | 'expirada'

export interface Usuario {
  id: number
  nome: string
  email: string
  papel: string
}
