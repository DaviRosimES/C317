import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import type { CategoriaCatalogo, Fonte, ItemCatalogo } from '@/models'
import { useCriarCategoria, useCriarClassificacao, useCriarFonte } from '@/queries/admin-definicao.queries'

const LINK = /^https?:\/\/\S+$/
const CNAE = /^[0-9]{4}-[0-9]\/[0-9]{2}$/
const NOME_MAX = 300

const erroDoNome = (nome: string) =>
  !nome.trim() ? 'Informe o nome.' : nome.trim().length > NOME_MAX ? 'O nome pode ter até 300 caracteres.' : undefined

interface DialogoCatalogoProps<T> {
  aberto: boolean
  onFechar: () => void
  /** Item confirmado pela API; o formulário que abriu o diálogo pode selecioná-lo. */
  onCriado: (item: T) => void
}

/**
 * Esqueleto comum: o formulário fica num portal, mas o React propaga o submit pela árvore de
 * componentes; sem `stopPropagation`, salvar aqui também enviaria o formulário da página.
 */
function DialogoCadastro({
  aberto,
  titulo,
  descricao,
  erro,
  salvando,
  onFechar,
  onSalvar,
  children,
}: {
  aberto: boolean
  titulo: string
  descricao: string
  erro: Error | null
  salvando: boolean
  onFechar: () => void
  onSalvar: () => void
  children: React.ReactNode
}) {
  return (
    <Dialog open={aberto} onOpenChange={(valor) => (valor ? undefined : onFechar())}>
      <DialogContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onSalvar()
          }}
        >
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">{children}</div>
          {erro ? (
            <Alert variant="danger" className="mt-4">
              <AlertCircle aria-hidden />
              <p>{erro.message}</p>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DialogoNovaFonte({ aberto, onFechar, onCriado }: DialogoCatalogoProps<Fonte>) {
  const criar = useCriarFonte()
  const [nome, setNome] = React.useState('')
  const [links, setLinks] = React.useState('')
  const [erros, setErros] = React.useState<{ nome?: string; links?: string }>({})

  function fechar() {
    criar.reset()
    setNome('')
    setLinks('')
    setErros({})
    onFechar()
  }

  function salvar() {
    const lista = links
      .split('\n')
      .map((linha) => linha.trim())
      .filter(Boolean)
    const novos = {
      nome: erroDoNome(nome),
      links: lista.some((link) => !LINK.test(link)) ? 'Cada link deve começar com http:// ou https:// e não ter espaços.' : undefined,
    }
    setErros(novos)
    if (novos.nome || novos.links) return
    criar.mutate(
      { nome: nome.trim(), links: lista },
      {
        onSuccess: (fonte) => {
          onCriado(fonte)
          fechar()
        },
      },
    )
  }

  return (
    <DialogoCadastro
      aberto={aberto}
      titulo="Nova fonte"
      descricao="Documento, base ou pesquisa que informa os valores. Um link não é obrigatório quando a origem é um documento recebido."
      erro={criar.error}
      salvando={criar.isPending}
      onFechar={fechar}
      onSalvar={salvar}
    >
      <FormField label="Nome" labelVariant="field" htmlFor="fonte-nome" error={erros.nome} hint="Inclua a edição quando conhecida.">
        <Input
          id="fonte-nome"
          maxLength={NOME_MAX}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          aria-invalid={!!erros.nome}
          aria-describedby="fonte-nome-message"
        />
      </FormField>
      <FormField label="Links (opcional)" labelVariant="field" htmlFor="fonte-links" error={erros.links} hint="Um endereço por linha.">
        <Textarea
          id="fonte-links"
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          aria-invalid={!!erros.links}
          aria-describedby="fonte-links-message"
        />
      </FormField>
    </DialogoCadastro>
  )
}

export function DialogoNovaClassificacao({ aberto, onFechar, onCriado }: DialogoCatalogoProps<ItemCatalogo>) {
  const criar = useCriarClassificacao()
  const [nome, setNome] = React.useState('')
  const [erro, setErro] = React.useState<string>()

  function fechar() {
    criar.reset()
    setNome('')
    setErro(undefined)
    onFechar()
  }

  function salvar() {
    const problema = erroDoNome(nome)
    setErro(problema)
    if (problema) return
    criar.mutate(
      { nome: nome.trim() },
      {
        onSuccess: (classificacao) => {
          onCriado(classificacao)
          fechar()
        },
      },
    )
  }

  return (
    <DialogoCadastro
      aberto={aberto}
      titulo="Nova classificação"
      descricao="Critério que organiza os recortes dos dados, como Público da pesquisa ou Porte da empresa. As opções são cadastradas como categorias."
      erro={criar.error}
      salvando={criar.isPending}
      onFechar={fechar}
      onSalvar={salvar}
    >
      <FormField label="Nome" labelVariant="field" htmlFor="classificacao-nome" error={erro}>
        <Input
          id="classificacao-nome"
          maxLength={NOME_MAX}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          aria-invalid={!!erro}
          aria-describedby="classificacao-nome-message"
        />
      </FormField>
    </DialogoCadastro>
  )
}

export function DialogoNovaCategoria({
  aberto,
  onFechar,
  onCriado,
  classificacoes,
  classificacaoInicial,
}: DialogoCatalogoProps<CategoriaCatalogo> & {
  /** Classificações oferecidas (ex.: as permitidas pelo indicador). */
  classificacoes: ItemCatalogo[]
  classificacaoInicial?: string
}) {
  const criar = useCriarCategoria()
  const [nome, setNome] = React.useState('')
  const [classificacao, setClassificacao] = React.useState(classificacaoInicial ?? '')
  const [cnae, setCnae] = React.useState('')
  const [erros, setErros] = React.useState<{ nome?: string; classificacao?: string; cnae?: string }>({})

  React.useEffect(() => {
    if (aberto) setClassificacao(classificacaoInicial ?? '')
  }, [aberto, classificacaoInicial])

  function fechar() {
    criar.reset()
    setNome('')
    setCnae('')
    setErros({})
    onFechar()
  }

  function salvar() {
    const novos = {
      nome: erroDoNome(nome),
      classificacao: classificacoes.some((c) => c.codigo === classificacao) ? undefined : 'Selecione a classificação.',
      cnae: cnae.trim() && !CNAE.test(cnae.trim()) ? 'Use o formato 0000-0/00, somente se a fonte informar o CNAE.' : undefined,
    }
    setErros(novos)
    if (novos.nome || novos.classificacao || novos.cnae) return
    criar.mutate(
      { nome: nome.trim(), classificacaoCodigo: classificacao, codigoCnae: cnae.trim() || null },
      {
        onSuccess: (categoria) => {
          onCriado(categoria)
          fechar()
        },
      },
    )
  }

  return (
    <DialogoCadastro
      aberto={aberto}
      titulo="Nova categoria"
      descricao="Opção de uma classificação, como Moradores em Público da pesquisa. Setor do Observatório, Setor econômico (Sebrae) e CNAE são coisas distintas."
      erro={criar.error}
      salvando={criar.isPending}
      onFechar={fechar}
      onSalvar={salvar}
    >
      <FormField label="Classificação" labelVariant="field" htmlFor="categoria-classificacao" error={erros.classificacao}>
        <Select value={classificacao} onValueChange={setClassificacao}>
          <SelectTrigger id="categoria-classificacao" aria-invalid={!!erros.classificacao} aria-describedby="categoria-classificacao-message">
            <SelectValue placeholder="Selecione a classificação" />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {classificacoes.map((c) => (
              <SelectItem key={c.codigo} value={c.codigo} className="whitespace-normal">
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Nome" labelVariant="field" htmlFor="categoria-nome" error={erros.nome}>
        <Input
          id="categoria-nome"
          maxLength={NOME_MAX}
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          aria-invalid={!!erros.nome}
          aria-describedby="categoria-nome-message"
        />
      </FormField>
      <FormField
        label="CNAE (opcional)"
        labelVariant="field"
        htmlFor="categoria-cnae"
        error={erros.cnae}
        hint="Somente quando informado pela fonte; nunca deduzido do nome."
      >
        <Input
          id="categoria-cnae"
          placeholder="0000-0/00"
          value={cnae}
          onChange={(event) => setCnae(event.target.value)}
          aria-invalid={!!erros.cnae}
          aria-describedby="categoria-cnae-message"
        />
      </FormField>
    </DialogoCadastro>
  )
}
