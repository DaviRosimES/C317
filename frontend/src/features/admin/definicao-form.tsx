import * as React from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { TIPOS_REFERENCIA } from '@/lib/referencia'
import type { CatalogosAdmin, DefinicaoEntrada, ItemCatalogo, TipoReferencia, Unidade } from '@/models'
import { DialogoNovaClassificacao } from './catalogo-dialogos'
import {
  IDS,
  ORDEM_CAMPOS,
  TEXTO_MAX,
  errosDaApi,
  validarDefinicao,
  type CampoDefinicao,
  type DefinicaoRascunho,
  type ErrosDefinicao,
} from './definicao-validacao'
import { descreverUnidade } from './observacao-catalogo'

interface DefinicaoFormProps {
  inicial: DefinicaoRascunho
  catalogos: CatalogosAdmin
  salvando: boolean
  /** Erro da última tentativa de salvar (validação da API, nome repetido, vínculos com dados). */
  erro: Error | null
  rotuloSalvar: string
  /** Botão ou link de cancelamento, ao lado de "Salvar". */
  cancelar?: React.ReactNode
  onSalvar: (entrada: DefinicaoEntrada) => void
}

function gruposDeUnidades(unidades: Unidade[]) {
  return [
    { rotulo: 'Contagens (números inteiros)', unidades: unidades.filter((u) => u.inteira) },
    { rotulo: 'Com limite máximo', unidades: unidades.filter((u) => !u.inteira && u.maximo !== null) },
    { rotulo: 'Outras medidas', unidades: unidades.filter((u) => !u.inteira && u.maximo === null) },
  ]
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Formulário de cadastro e correção de uma definição. O código do indicador é gerado pelo sistema. */
export function DefinicaoForm({ inicial, catalogos, salvando, erro, rotuloSalvar, cancelar, onSalvar }: DefinicaoFormProps) {
  const [r, setRascunho] = React.useState(inicial)
  const [erros, setErros] = React.useState<ErrosDefinicao>({})
  const [busca, setBusca] = React.useState('')
  const [criandoClassificacao, setCriandoClassificacao] = React.useState(false)
  // Classificações criadas aqui aparecem de imediato, antes de o catálogo ser recarregado.
  const [criadas, setCriadas] = React.useState<ItemCatalogo[]>([])

  const classificacoes = React.useMemo(() => {
    const todas = [...catalogos.classificacoes]
    for (const nova of criadas) if (!todas.some((c) => c.codigo === nova.codigo)) todas.push({ ...nova, emUso: false })
    return todas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [catalogos.classificacoes, criadas])
  const visiveis = busca.trim() ? classificacoes.filter((c) => semAcento(c.nome).includes(semAcento(busca.trim()))) : classificacoes

  const unidade = catalogos.unidades.find((u) => u.codigo === r.unidade)

  React.useEffect(() => {
    const daApi = errosDaApi(erro)
    if (Object.keys(daApi).length) setErros((atuais) => ({ ...atuais, ...daApi }))
  }, [erro])

  function alterar<K extends keyof DefinicaoRascunho>(campo: K, valor: DefinicaoRascunho[K], campoErro?: CampoDefinicao) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
    if (campoErro) setErros((atuais) => ({ ...atuais, [campoErro]: undefined }))
  }

  function alternar<T extends string>(lista: T[], item: T, marcado: boolean) {
    return marcado ? (lista.includes(item) ? lista : [...lista, item]) : lista.filter((i) => i !== item)
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resultado = validarDefinicao(r)
    if ('erros' in resultado) {
      setErros(resultado.erros)
      const primeiro = ORDEM_CAMPOS.find((campo) => resultado.erros[campo])
      if (primeiro) document.getElementById(IDS[primeiro])?.focus()
      return
    }
    setErros({})
    onSalvar(resultado.entrada)
  }

  const invalido = (campo: CampoDefinicao) => ({
    'aria-invalid': !!erros[campo],
    'aria-describedby': `${IDS[campo]}-message`,
  })

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
      {erro ? <ErroAoSalvar erro={erro} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>O que o indicador mede</CardTitle>
          <CardDescription>
            O código do indicador é gerado pelo sistema a partir do nome e não muda depois. Você não precisa informá-lo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Nome" labelVariant="field" htmlFor={IDS.nome} error={erros.nome} hint="Deve ser único entre indicadores ativos e arquivados.">
            <Input
              id={IDS.nome}
              autoComplete="off"
              value={r.nome}
              onChange={(event) => alterar('nome', event.target.value, 'nome')}
              {...invalido('nome')}
            />
          </FormField>

          <FormField
            label="O que mede"
            labelVariant="field"
            htmlFor={IDS.definicao}
            error={erros.definicao}
            hint="Explique a medida em linguagem simples, como será lida na consulta pública."
          >
            <Textarea
              id={IDS.definicao}
              rows={4}
              value={r.definicao}
              onChange={(event) => alterar('definicao', event.target.value, 'definicao')}
              {...invalido('definicao')}
            />
          </FormField>

          <FormField
            label="Unidade"
            labelVariant="field"
            htmlFor={IDS.unidade}
            error={erros.unidade}
            hint={unidade ? descreverUnidade(unidade) : 'A unidade define o significado e a validação dos valores. Cada indicador tem uma unidade.'}
          >
            <Select value={r.unidade} onValueChange={(valor) => alterar('unidade', valor, 'unidade')}>
              <SelectTrigger id={IDS.unidade} {...invalido('unidade')}>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {gruposDeUnidades(catalogos.unidades).map((grupo) =>
                  grupo.unidades.length ? (
                    <SelectGroup key={grupo.rotulo}>
                      <SelectLabel>{grupo.rotulo}</SelectLabel>
                      {grupo.unidades.map((u) => (
                        <SelectItem key={u.codigo} value={u.codigo} className="whitespace-normal">
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null,
                )}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onde aparece e que dados aceita</CardTitle>
          <CardDescription>
            O indicador aparece na consulta pública pelos dados publicados, nos Setores do Observatório escolhidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Grupo id={IDS.setores} legenda="Setores do Observatório" erro={erros.setores}>
            <div className="grid gap-3 sm:grid-cols-2">
              {catalogos.setores.map((setor) => {
                const id = `setor-${setor.codigo}`
                return (
                  <div key={setor.codigo} className="flex items-center gap-3">
                    <Checkbox
                      id={id}
                      checked={r.setores.includes(setor.codigo)}
                      onCheckedChange={(marcado) => alterar('setores', alternar(r.setores, setor.codigo, marcado === true), 'setores')}
                    />
                    <Label htmlFor={id} variant="field" className="text-sm text-ink">
                      {setor.nome}
                    </Label>
                  </div>
                )
              })}
            </div>
          </Grupo>

          <Grupo id={IDS.tipos} legenda="Tipos de referência permitidos" erro={erros.tipos}>
            <div className="flex flex-col gap-3">
              {TIPOS_REFERENCIA.map((item) => {
                const id = `tipo-${item.tipo}`
                return (
                  <div key={item.tipo} className="flex items-start gap-3">
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      checked={r.tipos.includes(item.tipo)}
                      onCheckedChange={(marcado) =>
                        alterar('tipos', alternar<TipoReferencia>(r.tipos, item.tipo, marcado === true), 'tipos')
                      }
                    />
                    <div className="min-w-0">
                      <Label htmlFor={id} variant="field" className="text-sm text-ink">
                        {item.rotulo}
                      </Label>
                      <p className="text-[13px] text-ink-muted">{item.descricao}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Grupo>

          <Grupo id={IDS.classificacoes} legenda="Classificações permitidas" erro={erros.classificacoes}>
            <p className="text-[13px] text-ink-muted">
              Classificações organizam os recortes dos dados (por exemplo, Público da pesquisa). Marque as que este indicador
              pode usar. {r.classificacoes.length ? `${r.classificacoes.length} selecionada(s).` : 'Nenhuma selecionada.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="search"
                aria-label="Buscar classificação"
                placeholder="Buscar classificação"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="sm:max-w-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => setCriandoClassificacao(true)}>
                <Plus aria-hidden />
                Nova classificação
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-line p-3">
              {visiveis.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visiveis.map((c) => {
                    const id = `classificacao-${c.codigo}`
                    return (
                      <div key={c.codigo} className="flex items-start gap-3">
                        <Checkbox
                          id={id}
                          className="mt-0.5"
                          checked={r.classificacoes.includes(c.codigo)}
                          onCheckedChange={(marcado) =>
                            alterar('classificacoes', alternar(r.classificacoes, c.codigo, marcado === true), 'classificacoes')
                          }
                        />
                        <Label htmlFor={id} variant="field" className="min-w-0 break-words text-sm text-ink">
                          {c.nome}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-ink-muted">Nenhuma classificação encontrada para esta busca.</p>
              )}
            </div>
          </Grupo>

          <div className="flex items-start gap-3">
            <Checkbox
              id={IDS.aceitaSemCategoria}
              className="mt-0.5"
              checked={r.aceitaSemCategoria}
              onCheckedChange={(marcado) => alterar('aceitaSemCategoria', marcado === true, 'classificacoes')}
              aria-describedby={`${IDS.aceitaSemCategoria}-ajuda`}
            />
            <div className="min-w-0">
              <Label htmlFor={IDS.aceitaSemCategoria} variant="field" className="text-sm text-ink">
                Aceita dado sem categoria
              </Label>
              <p id={`${IDS.aceitaSemCategoria}-ajuda`} className="text-[13px] text-ink-muted">
                Dado sem categoria é o total informado pela fonte. Se desmarcar, todo dado deste indicador precisará de uma
                categoria e será preciso permitir ao menos uma classificação.
              </p>
              {erros.aceitaSemCategoria ? (
                <p id={`${IDS.aceitaSemCategoria}-message`} role="alert" className="text-xs font-medium text-danger">
                  {erros.aceitaSemCategoria}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nota metodológica</CardTitle>
          <CardDescription>Opcional. Explica como a medida deve ser lida; acompanha o indicador na consulta pública.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField label="Nota metodológica (opcional)" labelVariant="field" htmlFor={IDS.nota} error={erros.nota}>
            <Textarea
              id={IDS.nota}
              rows={4}
              value={r.nota}
              onChange={(event) => alterar('nota', event.target.value, 'nota')}
              {...invalido('nota')}
            />
          </FormField>
          <p className="mt-1 text-xs text-ink-subtle">Até {TEXTO_MAX.toLocaleString('pt-BR')} caracteres.</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        {cancelar}
        <Button type="submit" variant="gradient" disabled={salvando}>
          {salvando ? 'Salvando…' : rotuloSalvar}
        </Button>
      </div>

      <DialogoNovaClassificacao
        aberto={criandoClassificacao}
        onFechar={() => setCriandoClassificacao(false)}
        onCriado={(classificacao) => {
          setCriadas((atuais) => [...atuais, classificacao])
          setRascunho((atual) => ({ ...atual, classificacoes: alternar(atual.classificacoes, classificacao.codigo, true) }))
          setErros((atuais) => ({ ...atuais, classificacoes: undefined }))
          setBusca('')
        }}
      />
    </form>
  )
}

/** fieldset com legenda e mensagem, para grupos de controles (setores, tipos, classificações). */
function Grupo({ id, legenda, erro, children }: { id: string; legenda: string; erro?: string; children: React.ReactNode }) {
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={erro ? `${id}-message` : undefined} className="flex min-w-0 flex-col gap-2 outline-none">
      <legend className="mb-1.5 text-xs font-medium text-ink-muted">{legenda}</legend>
      {children}
      {erro ? (
        <p id={`${id}-message`} role="alert" className="text-xs font-medium text-danger">
          {erro}
        </p>
      ) : null}
    </fieldset>
  )
}

function ErroAoSalvar({ erro }: { erro: Error }) {
  const porCampo = Object.keys(errosDaApi(erro)).length > 0
  const ref = React.useRef<HTMLDivElement>(null)
  // Os botões ficam no fim do formulário: traz o aviso para a vista.
  React.useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    ref.current?.focus({ preventScroll: true })
  }, [erro])
  return (
    <Alert ref={ref} tabIndex={-1} variant="danger" className="outline-none">
      <AlertCircle aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Não foi possível salvar o indicador</p>
        <p>{porCampo ? 'Revise os campos destacados. Nada do que você preencheu foi perdido.' : erro.message}</p>
      </div>
    </Alert>
  )
}
