import * as React from 'react'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { PAPEL_ADMIN, authService } from '@/api/services/auth.service'
import type { MotivoFimSessao, Usuario } from '@/models'

export const authKeys = {
  all: ['auth'] as const,
  usuario: () => [...authKeys.all, 'usuario'] as const,
}

/** Usuário do token atual; muda só no login e no fim da sessão, que atualizam o cache. */
export const usuarioAtualQueryOptions = queryOptions({
  queryKey: authKeys.usuario(),
  queryFn: authService.usuarioAtual,
  staleTime: Infinity,
  retry: false,
})

export const estadoSessao = authService.estadoSessao
export const ehAdmin = (usuario: Usuario) => usuario.papel === PAPEL_ADMIN

export function useEntrar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.entrar,
    onSuccess: (usuario) => queryClient.setQueryData(authKeys.usuario(), usuario),
  })
}

export const useSair = () => authService.sair

/**
 * Chama `aoEncerrar` quando a sessão termina — saída, expiração do token, recusa pela API
 * ou saída em outra aba — e depois descarta do cache os dados que exigiam autenticação.
 */
export function useFimDaSessao(aoEncerrar: (motivo: MotivoFimSessao) => void | Promise<void>) {
  const queryClient = useQueryClient()
  const callback = React.useRef(aoEncerrar)
  React.useEffect(() => {
    callback.current = aoEncerrar
  })
  React.useEffect(
    () =>
      authService.aoEncerrarSessao((motivo) => {
        // Limpa após sair das telas administrativas, para que elas não refaçam consultas sem token.
        void Promise.resolve(callback.current(motivo)).finally(() => {
          queryClient.removeQueries({ queryKey: authKeys.all })
        })
      }),
    [queryClient],
  )
}
