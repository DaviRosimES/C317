import type { EstadoSessao, MotivoFimSessao, Sessao } from '@/models'

const CHAVE = 'observatorio.sessao'
// setTimeout aceita no máximo ~24,8 dias; prazos maiores são reagendados ao disparar.
const ATRASO_MAXIMO = 2_147_483_647

type Ouvinte = (motivo: MotivoFimSessao) => void

const ouvintes = new Set<Ouvinte>()
let temporizador: ReturnType<typeof setTimeout> | undefined

function ler(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const { token, expiraEm } = JSON.parse(bruto) as { token?: unknown; expiraEm?: unknown }
    return typeof token === 'string' && typeof expiraEm === 'number' ? { token, expiraEm: new Date(expiraEm) } : null
  } catch {
    return null
  }
}

function remover() {
  clearTimeout(temporizador)
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    // Armazenamento indisponível: não há sessão persistida para remover.
  }
}

const vencida = (sessao: Sessao) => sessao.expiraEm.getTime() <= Date.now()

function notificar(motivo: MotivoFimSessao) {
  for (const ouvinte of ouvintes) ouvinte(motivo)
}

function agendarExpiracao(sessao: Sessao) {
  clearTimeout(temporizador)
  const restante = Math.max(sessao.expiraEm.getTime() - Date.now(), 0)
  temporizador = setTimeout(() => {
    const atual = ler()
    if (!atual) return
    if (vencida(atual)) sessaoStore.encerrar('expirada')
    else agendarExpiracao(atual)
  }, Math.min(restante, ATRASO_MAXIMO))
}

/**
 * Token da área administrativa guardado no navegador (localStorage, compartilhado entre abas).
 * A sessão termina ao sair, ao vencer o prazo do token ou quando a API recusa o token (401).
 */
export const sessaoStore = {
  estado(): EstadoSessao {
    const sessao = ler()
    if (!sessao) return 'ausente'
    if (vencida(sessao)) {
      sessaoStore.encerrar('expirada')
      return 'expirada'
    }
    return 'ativa'
  },

  /** Token da sessão ativa, ou null. */
  token(): string | null {
    const sessao = ler()
    return sessao && !vencida(sessao) ? sessao.token : null
  },

  salvar(sessao: Sessao) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ token: sessao.token, expiraEm: sessao.expiraEm.getTime() }))
    } catch {
      // Sem armazenamento persistente o login não sobrevive a um recarregamento, mas a sessão vale nesta página.
    }
    agendarExpiracao(sessao)
  },

  /** Descarta a sessão sem avisar a interface (ex.: antes de uma nova tentativa de login). */
  limpar: remover,

  encerrar(motivo: MotivoFimSessao) {
    remover()
    notificar(motivo)
  },

  aoEncerrar(ouvinte: Ouvinte) {
    ouvintes.add(ouvinte)
    return () => {
      ouvintes.delete(ouvinte)
    }
  },
}

const inicial = ler()
if (inicial && !vencida(inicial)) agendarExpiracao(inicial)

if (typeof window !== 'undefined') {
  // Saída ou novo login em outra aba.
  window.addEventListener('storage', (event) => {
    if (event.key !== CHAVE) return
    const sessao = ler()
    if (sessao) agendarExpiracao(sessao)
    else {
      clearTimeout(temporizador)
      notificar('saiu')
    }
  })
}
