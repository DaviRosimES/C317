from collections import defaultdict
from collections.abc import Callable

from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from app.core.codigos import gerar_codigo
from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.definicao_repository import DefinicaoRepository
from app.schemas.definicao import (
    CatalogosResponse,
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
    ClassificacaoCreate,
    ClassificacaoResponse,
    ClassificacaoUpdate,
    DefinicaoCreate,
    DefinicaoResponse,
    DefinicaoUpdate,
    FonteCreate,
    FonteResponse,
    FonteUpdate,
    Situacao,
)

# Índices de unicidade -> mensagem de conflito.
_NOMES_DUPLICADOS = {
    "uq_indicadores_definicoes_nome": "Já existe um indicador com este nome, ativo ou arquivado.",
    "uq_fontes_nome": "Já existe uma fonte com este nome.",
    "uq_classificacoes_nome": "Já existe uma classificação com este nome.",
    "uq_categorias_nome": "Já existe uma categoria com este nome nesta classificação.",
}


def _dados(quantidade: int) -> str:
    return f"{quantidade} dado{'s' if quantidade != 1 else ''}"


class DefinicaoService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.repo = DefinicaoRepository(connection)

    # Catálogos

    def catalogos(self) -> CatalogosResponse:
        return CatalogosResponse(
            setores=[linha._mapping for linha in self.repo.setores()],
            unidades=[linha._mapping for linha in self.repo.unidades()],
            fontes=[linha._mapping for linha in self.repo.fontes()],
            classificacoes=[linha._mapping for linha in self.repo.classificacoes()],
            categorias=[linha._mapping for linha in self.repo.categorias()],
        )

    def criar_fonte(self, dados: FonteCreate) -> FonteResponse:
        codigo = self._novo_codigo("fontes", "f", dados.nome)
        self._gravar(lambda: self.repo.inserir_fonte(codigo, dados.nome, dados.links))
        return self._fonte(codigo)

    def corrigir_fonte(self, codigo: str, dados: FonteUpdate) -> FonteResponse:
        atual = self._fonte(codigo)
        nome = dados.nome if dados.nome is not None else atual.nome
        links = dados.links if dados.links is not None else atual.links
        self._gravar(lambda: self.repo.atualizar_fonte(codigo, nome, links))
        return self._fonte(codigo)

    def criar_classificacao(self, dados: ClassificacaoCreate) -> ClassificacaoResponse:
        codigo = self._novo_codigo("classificacoes", "cl", dados.nome)
        self._gravar(lambda: self.repo.inserir_classificacao(codigo, dados.nome))
        return self._classificacao(codigo)

    def corrigir_classificacao(self, codigo: str, dados: ClassificacaoUpdate) -> ClassificacaoResponse:
        self._classificacao(codigo)
        self._gravar(lambda: self.repo.atualizar_classificacao(codigo, dados.nome))
        return self._classificacao(codigo)

    def criar_categoria(self, dados: CategoriaCreate) -> CategoriaResponse:
        self._exigir("classificacoes", [dados.classificacao_codigo], "classificacao_codigo")
        codigo = self._novo_codigo("categorias", "c", f"{dados.classificacao_codigo} {dados.nome}")
        campos = {"codigo": codigo, **dados.model_dump()}
        self._gravar(lambda: self.repo.inserir_categoria(campos))
        return self._categoria(codigo)

    def corrigir_categoria(self, codigo: str, dados: CategoriaUpdate) -> CategoriaResponse:
        atual = self._categoria(codigo)
        campos = {**atual.model_dump(exclude={"em_uso"}), **dados.model_dump(exclude_unset=True)}
        if campos["nome"] is None:
            raise ValidacaoError("O nome da categoria não pode ser nulo.")
        if campos["classificacao_codigo"] is None:
            raise ValidacaoError("A categoria precisa de uma classificação.")
        muda_significado = (
            campos["classificacao_codigo"] != atual.classificacao_codigo
            or campos["codigo_cnae"] != atual.codigo_cnae
        )
        if muda_significado and atual.em_uso:
            raise ConflitoError(
                "A categoria é usada por dados; a classificação e o CNAE não podem mudar. "
                "Cadastre outra categoria para o novo recorte."
            )
        self._exigir("classificacoes", [campos["classificacao_codigo"]], "classificacao_codigo")
        self._gravar(lambda: self.repo.atualizar_categoria(campos))
        return self._categoria(codigo)

    # Definições

    def listar(self, situacao: Situacao, setor: str | None, busca: str | None) -> list[DefinicaoResponse]:
        if setor:
            self._exigir("setores_observatorio", [setor], "setor")
        return [DefinicaoResponse.model_validate(linha._mapping) for linha in self.repo.listar(situacao, setor, busca)]

    def obter(self, codigo: str) -> DefinicaoResponse:
        linha = self.repo.get(codigo)
        if linha is None:
            raise NaoEncontradoError("Indicador não encontrado.")
        return DefinicaoResponse.model_validate(linha._mapping)

    def criar(self, dados: DefinicaoCreate) -> DefinicaoResponse:
        campos = dados.model_dump()
        campos["codigo"] = self._novo_codigo("indicadores_definicoes", "i", dados.nome)
        # O código novo não pertence a nenhum dado: não há vínculos a conferir.
        self._validar(campos)
        self._gravar(lambda: self._salvar(campos, novo=True))
        return self.obter(campos["codigo"])

    def corrigir(self, codigo: str, dados: DefinicaoUpdate) -> DefinicaoResponse:
        atual = self._campos(codigo)
        if atual["arquivado"]:
            raise ConflitoError("O indicador está arquivado. Restaure-o antes de editar.")
        campos = {**atual, **dados.model_dump(exclude_unset=True)}
        self._validar(campos)
        self._validar_vinculos(atual, campos)
        self._gravar(lambda: self._salvar(campos, novo=False))
        return self.obter(codigo)

    def arquivar(self, codigo: str) -> DefinicaoResponse:
        """Oculta os dados do indicador sem alterar o estado individual de cada um."""
        self._campos(codigo)
        self.repo.definir_arquivado(codigo, True)
        return self.obter(codigo)

    def restaurar(self, codigo: str) -> DefinicaoResponse:
        self._campos(codigo)
        self.repo.definir_arquivado(codigo, False)
        return self.obter(codigo)

    # Regras auxiliares

    def _validar(self, campos: dict) -> None:
        campos["setores"] = list(dict.fromkeys(campos["setores"]))
        campos["classificacoes_permitidas"] = list(dict.fromkeys(campos["classificacoes_permitidas"]))
        campos["tipos_referencia_permitidos"] = list(dict.fromkeys(campos["tipos_referencia_permitidos"]))

        self._exigir("unidades", [campos["unidade_codigo"]], "unidade_codigo")
        self._exigir("setores_observatorio", campos["setores"], "setores")
        self._exigir("classificacoes", campos["classificacoes_permitidas"], "classificacoes_permitidas")
        if not campos["aceita_sem_categoria"] and not campos["classificacoes_permitidas"]:
            raise ValidacaoError(
                "Um indicador que não aceita dado sem categoria precisa de ao menos uma classificação."
            )

    def _validar_vinculos(self, atual: dict, campos: dict) -> None:
        """Recusa a alteração que invalidaria dados existentes, inclusive arquivados.

        Só contam os problemas que a alteração introduz: dados anteriores à definição
        atual (ainda não remapeados) não impedem uma correção descritiva.
        """
        vinculos = self.repo.vinculos(campos["codigo"])
        anteriores = self._problemas(atual, vinculos)
        novos = [msg for chave, msg in self._problemas(campos, vinculos).items() if chave not in anteriores]
        if novos:
            raise ConflitoError(
                "A alteração invalidaria dados existentes, inclusive arquivados: " + "; ".join(novos) + "."
            )

    def _problemas(self, campos: dict, vinculos: list) -> dict[tuple, str]:
        unidades, tipos, classificacoes = defaultdict(int), defaultdict(int), defaultdict(int)
        sem_categoria = 0
        for linha in vinculos:
            unidades[linha.unidade_codigo] += linha.quantidade
            tipos[linha.referencia_tipo] += linha.quantidade
            if linha.sem_categoria:
                sem_categoria += linha.quantidade
            else:
                classificacoes[linha.classificacao] += linha.quantidade

        problemas = {}
        nomes_unidades = {u.codigo: u.nome for u in self.repo.unidades()}
        for unidade, quantidade in sorted(unidades.items()):
            if unidade != campos["unidade_codigo"]:
                problemas[("unidade", unidade)] = (
                    f"{_dados(quantidade)} na unidade {nomes_unidades.get(unidade, unidade)} "
                    "(uma nova unidade exige outra definição de indicador)"
                )
        for tipo, quantidade in sorted(tipos.items()):
            if tipo not in campos["tipos_referencia_permitidos"]:
                problemas[("referencia", tipo)] = f"{_dados(quantidade)} com referência {tipo}"
        nomes_classificacoes = {c.codigo: c.nome for c in self.repo.classificacoes()}
        for classificacao, quantidade in sorted(classificacoes.items(), key=lambda par: str(par[0])):
            if classificacao not in campos["classificacoes_permitidas"]:
                nome = nomes_classificacoes.get(classificacao, classificacao)
                problemas[("classificacao", classificacao)] = f"{_dados(quantidade)} na classificação {nome}"
        if sem_categoria and not campos["aceita_sem_categoria"]:
            problemas[("sem_categoria",)] = f"{_dados(sem_categoria)} sem categoria"
        return problemas

    def _salvar(self, campos: dict, novo: bool) -> None:
        if novo:
            self.repo.inserir(campos)
        else:
            self.repo.atualizar(campos)
        self.repo.definir_setores(campos["codigo"], campos["setores"])
        self.repo.definir_classificacoes(campos["codigo"], campos["classificacoes_permitidas"])

    def _campos(self, codigo: str) -> dict:
        linha = self.repo.campos(codigo)
        if linha is None:
            raise NaoEncontradoError("Indicador não encontrado.")
        return dict(linha._mapping)

    def _novo_codigo(self, tabela: str, prefixo: str, nome: str) -> str:
        """Código no formato do pacote; se já estiver em uso por outro item, acrescenta um sufixo."""
        codigo = gerar_codigo(prefixo, nome)
        sufixo = 2
        while self.repo.codigo_existe(tabela, codigo) or (
            tabela == "indicadores_definicoes" and self.repo.codigo_em_dados(codigo)
        ):
            codigo = gerar_codigo(prefixo, f"{nome} {sufixo}")
            sufixo += 1
        return codigo

    def _exigir(self, tabela: str, codigos: list[str], campo: str) -> None:
        desconhecidos = sorted(set(codigos) - self.repo.existentes(tabela, codigos))
        if desconhecidos:
            raise ValidacaoError(f"Código desconhecido em {campo}: {', '.join(desconhecidos)}.")

    def _fonte(self, codigo: str) -> FonteResponse:
        linhas = self.repo.fontes(codigo)
        if not linhas:
            raise NaoEncontradoError("Fonte não encontrada.")
        return FonteResponse.model_validate(linhas[0]._mapping)

    def _classificacao(self, codigo: str) -> ClassificacaoResponse:
        linhas = self.repo.classificacoes(codigo)
        if not linhas:
            raise NaoEncontradoError("Classificação não encontrada.")
        return ClassificacaoResponse.model_validate(linhas[0]._mapping)

    def _categoria(self, codigo: str) -> CategoriaResponse:
        linhas = self.repo.categorias(codigo)
        if not linhas:
            raise NaoEncontradoError("Categoria não encontrada.")
        return CategoriaResponse.model_validate(linhas[0]._mapping)

    def _gravar(self, operacao: Callable[[], None]) -> None:
        # O savepoint mantém a transação da requisição utilizável após a violação.
        try:
            with self.connection.begin_nested():
                operacao()
        except IntegrityError as erro:
            restricao = erro.orig.diag.constraint_name
            if restricao in _NOMES_DUPLICADOS:
                raise ConflitoError(_NOMES_DUPLICADOS[restricao]) from erro
            if erro.orig.sqlstate in {"23514", "23503"}:  # check / foreign key
                raise ValidacaoError(erro.orig.diag.message_primary) from erro
            raise
