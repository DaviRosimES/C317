from collections.abc import Callable
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.engine import Connection, Row
from sqlalchemy.exc import IntegrityError

from app.core.apresentacao import valor_para_exibicao
from app.core.contrato_m6 import decimal_exato, identidade
from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.observacao_repository import ObservacaoRepository
from app.schemas.observacao import (
    CatalogosResponse,
    ObservacaoAdminDetalheResponse,
    ObservacaoCreate,
    ObservacaoPublicaResponse,
    ObservacaoUpdate,
    PaginaObservacoesAdmin,
    PaginaObservacoesPublicas,
    ReferenciaResponse,
)

TIPOS_CATALOGO = ("temas", "indicadores", "categorias", "territorios", "unidades", "fontes")
MESES = ("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez")
_DUPLICIDADE = {"observacoes_m6_pkey", "uq_observacoes_m6_identidade"}


def rotulo_referencia(referencia: dict) -> str:
    inicio, fim = referencia["ano_inicio"], referencia["ano_fim"]
    match referencia["tipo"]:
        case "mensal":
            return f"{MESES[referencia['mes'] - 1]}/{inicio}"
        case "acumulada":
            return f"{inicio}–{fim} (acumulado)"
        case "levantamento":
            return str(inicio) if inicio == fim else f"{inicio} e {fim}"
        case "retrato":
            data = datetime.fromisoformat(referencia["data_extracao"]).strftime("%d/%m/%Y")
            return f"{inicio} (extração {data})"
        case _:
            return str(inicio)


def _pares(conteudo: dict) -> set[tuple[str, str]]:
    """Itens de catálogo que uma observação referencia."""
    pares = {
        ("indicadores", conteudo["indicador_codigo"]),
        ("territorios", conteudo["territorio_codigo"]),
        ("unidades", conteudo["unidade_codigo"]),
        ("fontes", conteudo["fonte_codigo"]),
        *(("temas", tema) for tema in conteudo["temas"]),
    }
    if conteudo.get("categoria_codigo"):
        pares.add(("categorias", conteudo["categoria_codigo"]))
    return pares


class ObservacaoService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.observacoes = ObservacaoRepository(connection)

    # Consulta pública

    def catalogo_publico(self) -> CatalogosResponse:
        return _catalogos(self.observacoes.catalogo_publico())

    def referencias_publicadas(self) -> list[ReferenciaResponse]:
        return [
            ReferenciaResponse(**referencia, rotulo=rotulo_referencia(referencia))
            for referencia in self.observacoes.referencias_publicadas()
        ]

    def listar_publicas(self, limite: int, deslocamento: int, **filtros) -> PaginaObservacoesPublicas:
        itens, total = self._listar(filtros, True, limite, deslocamento)
        return PaginaObservacoesPublicas(
            itens=itens, total=total, limite=limite, deslocamento=deslocamento
        )

    def obter_publica(self, observacao_id: str) -> ObservacaoPublicaResponse:
        linha = self.observacoes.get(observacao_id, somente_publica=True)
        if linha is None:
            raise NaoEncontradoError("Observação não encontrada.")
        return ObservacaoPublicaResponse(**self._respostas([linha])[0])

    # Administração

    def catalogo_completo(self) -> CatalogosResponse:
        return _catalogos(self.observacoes.catalogo_completo())

    def listar_admin(
        self, limite: int, deslocamento: int, status=None, divulgacao_bloqueada=None, **filtros
    ) -> PaginaObservacoesAdmin:
        itens, total = self._listar(
            filtros, False, limite, deslocamento,
            status=status, divulgacao_bloqueada=divulgacao_bloqueada,
        )
        return PaginaObservacoesAdmin(itens=itens, total=total, limite=limite, deslocamento=deslocamento)

    def obter_admin(self, observacao_id: str) -> ObservacaoAdminDetalheResponse:
        linha = self._linha(observacao_id)
        resposta = self._respostas([linha], admin=True)[0]
        resposta["historico"] = [linha._mapping for linha in self.observacoes.historico(observacao_id)]
        return ObservacaoAdminDetalheResponse(**resposta)

    def criar(self, dados: ObservacaoCreate, admin_id: int) -> ObservacaoAdminDetalheResponse:
        temas = list(dict.fromkeys(dados.temas))
        referencia = dados.referencia.model_dump(exclude={"data_extracao"})
        if dados.referencia.data_extracao:
            referencia["data_extracao"] = dados.referencia.data_extracao.isoformat()
        conteudo = {
            "indicador_codigo": dados.indicador_codigo,
            "territorio_codigo": dados.territorio_codigo,
            "categoria_codigo": dados.categoria_codigo,
            # O CNAE de um recorte vem da categoria, como no contrato da G4.
            "codigo_cnae": None,
            "referencia": referencia,
            "valor": dados.valor,
            "unidade_codigo": dados.unidade_codigo,
            "qualificador": dados.qualificador,
            "fonte_codigo": dados.fonte_codigo,
            "temas": temas,
            "notas": dados.notas,
            "proveniencias": [
                {
                    "origem": "cadastro_administrativo",
                    "usuario_id": admin_id,
                    "registrado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
            ],
        }
        catalogos = self._exigir(_pares(conteudo))
        conteudo["valor"] = _validar_valor(dados.valor, catalogos["unidades"][dados.unidade_codigo])
        conteudo["id"] = identidade(conteudo)
        self._gravar(lambda: self.observacoes.inserir(conteudo))
        self.observacoes.registrar(conteudo["id"], "cadastro", admin_id)
        return self.obter_admin(conteudo["id"])

    def corrigir(
        self, observacao_id: str, dados: ObservacaoUpdate, admin_id: int
    ) -> ObservacaoAdminDetalheResponse:
        linha = self._linha(observacao_id)
        conteudo = dict(linha.conteudo)
        alteracoes = dados.model_dump(exclude_unset=True)
        if "valor" in alteracoes:
            unidade = self._exigir({("unidades", conteudo["unidade_codigo"])})["unidades"]
            alteracoes["valor"] = _validar_valor(alteracoes["valor"], unidade[conteudo["unidade_codigo"]])
        anteriores = {campo: conteudo.get(campo) for campo in alteracoes}
        if anteriores == alteracoes:
            return self.obter_admin(observacao_id)
        conteudo.update(alteracoes)
        self._gravar(lambda: self.observacoes.atualizar_conteudo(observacao_id, conteudo))
        self.observacoes.registrar(
            observacao_id, "correcao", admin_id,
            {"anterior": anteriores, "novo": alteracoes, "estava_publicada": linha.status == "publicado"},
        )
        return self.obter_admin(observacao_id)

    def publicar(self, observacao_id: str, admin_id: int) -> ObservacaoAdminDetalheResponse:
        linha = self._linha(observacao_id)
        if linha.divulgacao_bloqueada:
            raise ValidacaoError(
                f"Divulgação bloqueada: {linha.motivo_bloqueio}. Desbloqueie antes de publicar."
            )
        if self.observacoes.publicar(observacao_id, admin_id):
            self.observacoes.registrar(observacao_id, "publicacao", admin_id)
        return self.obter_admin(observacao_id)

    def despublicar(self, observacao_id: str, admin_id: int) -> ObservacaoAdminDetalheResponse:
        linha = self._linha(observacao_id)
        if linha.status == "publicado":
            self.observacoes.despublicar(observacao_id)
            self.observacoes.registrar(observacao_id, "despublicacao", admin_id, _publicacao(linha))
        return self.obter_admin(observacao_id)

    def bloquear(self, observacao_id: str, motivo: str, admin_id: int) -> ObservacaoAdminDetalheResponse:
        linha = self._linha(observacao_id)
        self.observacoes.bloquear(observacao_id, motivo)
        self.observacoes.registrar(
            observacao_id, "bloqueio", admin_id, {"motivo": motivo, **_publicacao(linha)}
        )
        return self.obter_admin(observacao_id)

    def desbloquear(self, observacao_id: str, admin_id: int) -> ObservacaoAdminDetalheResponse:
        """Remove o bloqueio sem republicar: voltar à consulta exige nova publicação."""
        linha = self._linha(observacao_id)
        if linha.divulgacao_bloqueada:
            self.observacoes.desbloquear(observacao_id)
            self.observacoes.registrar(
                observacao_id, "desbloqueio", admin_id, {"motivo_anterior": linha.motivo_bloqueio}
            )
        return self.obter_admin(observacao_id)

    # Regras auxiliares

    def _listar(self, filtros: dict, somente_publicas: bool, limite: int, deslocamento: int, **extras):
        consulta = self._filtros(**filtros)
        if consulta is None:
            return [], 0
        consulta.update(extras)
        linhas, total = self.observacoes.listar(consulta, somente_publicas, limite, deslocamento)
        return self._respostas(linhas, admin=not somente_publicas), total

    def _filtros(
        self,
        tema=None,
        indicador=None,
        territorio=None,
        categoria=None,
        classificacao=None,
        codigo_cnae=None,
        referencia_tipo=None,
        ano=None,
        ano_inicio=None,
        ano_fim=None,
        mes=None,
    ) -> dict | None:
        """Valida os filtros; devolve None quando a combinação não pode ter resultados."""
        pares = {
            (tipo, codigo)
            for valores, tipo in (
                (tema, "temas"), (indicador, "indicadores"),
                (territorio, "territorios"), (categoria, "categorias"),
            )
            for codigo in valores or []
        }
        nomes = {"temas": "tema", "indicadores": "indicador", "territorios": "territorio", "categorias": "categoria"}
        self._exigir(pares, nomes)
        if mes is not None and ano is None:
            raise ValidacaoError("O filtro de mês exige o ano.")
        if mes is not None and referencia_tipo and "mensal" not in referencia_tipo:
            raise ValidacaoError("O filtro de mês só se aplica a referências mensais.")
        if ano_inicio is not None and ano_fim is not None and ano_inicio > ano_fim:
            raise ValidacaoError("O ano de início deve ser anterior ou igual ao ano de fim.")

        categorias = list(categoria or [])
        if classificacao:
            desconhecidas = set(classificacao) - self.observacoes.classificacoes_existentes(classificacao)
            if desconhecidas:
                raise ValidacaoError(f"Classificação desconhecida: {', '.join(sorted(desconhecidas))}.")
            da_classificacao = self.observacoes.categorias_da_classificacao(classificacao)
            categorias = [c for c in categorias if c in da_classificacao] if categoria else da_classificacao
            if not categorias:
                return None
        return {
            "temas": tema,
            "indicadores": indicador,
            "territorios": territorio,
            "categorias": categorias,
            "codigos_cnae": codigo_cnae,
            "referencia_tipos": referencia_tipo,
            "ano": ano,
            "ano_inicio": ano_inicio,
            "ano_fim": ano_fim,
            "mes": mes,
        }

    def _exigir(self, pares: set[tuple[str, str]], nomes: dict | None = None) -> dict[str, dict[str, dict]]:
        """Lê os itens pedidos; código desconhecido nunca vira total municipal ou outra unidade."""
        catalogos = self.observacoes.itens_catalogo(pares)
        for tipo, codigo in sorted(pares):
            if codigo not in catalogos.get(tipo, {}):
                campo = (nomes or {}).get(tipo, _CAMPO_CADASTRO[tipo])
                raise ValidacaoError(f"Código desconhecido em {campo}: {codigo}.")
        return catalogos

    def _linha(self, observacao_id: str) -> Row:
        linha = self.observacoes.get(observacao_id)
        if linha is None:
            raise NaoEncontradoError("Observação não encontrada.")
        return linha

    def _gravar(self, operacao: Callable[[], None]) -> None:
        # O savepoint mantém a transação da requisição utilizável após a violação.
        try:
            with self.connection.begin_nested():
                operacao()
        except IntegrityError as erro:
            diagnostico = erro.orig.diag
            if diagnostico.constraint_name in _DUPLICIDADE:
                raise ConflitoError(
                    "Já existe uma observação para este indicador, território, categoria, "
                    "referência, unidade e fonte. Corrija a observação existente."
                ) from erro
            if erro.orig.sqlstate in {"23514", "23503"}:  # check / foreign key
                raise ValidacaoError(diagnostico.message_primary) from erro
            raise

    def _respostas(self, linhas: list[Row], admin: bool = False) -> list[dict]:
        pares = set().union(*(_pares(linha.conteudo) for linha in linhas)) if linhas else set()
        catalogos = self.observacoes.itens_catalogo(pares)
        return [_resposta(linha, catalogos, admin) for linha in linhas]


_CAMPO_CADASTRO = {
    "indicadores": "indicador_codigo",
    "territorios": "territorio_codigo",
    "categorias": "categoria_codigo",
    "unidades": "unidade_codigo",
    "fontes": "fonte_codigo",
    "temas": "temas",
}


def _validar_valor(valor: str, unidade: dict) -> str:
    exato = decimal_exato(valor)
    numero = Decimal(exato)
    if unidade["inteira"] and numero != numero.to_integral_value():
        raise ValidacaoError(f"A unidade {unidade['nome']} exige um valor inteiro.")
    if unidade["maximo"] is not None and numero > Decimal(str(unidade["maximo"])):
        raise ValidacaoError(
            f"O valor excede o máximo da unidade {unidade['nome']} ({unidade['maximo']})."
        )
    return exato


def _publicacao(linha: Row) -> dict:
    """Quem publicou e quando, preservados no histórico antes de serem anulados."""
    if linha.status != "publicado":
        return {"estava_publicada": False}
    return {
        "estava_publicada": True,
        "publicado_por": linha.publicado_por,
        "publicado_em": linha.publicado_em.isoformat(),
    }


def _catalogos(linhas: list[Row]) -> CatalogosResponse:
    agrupados = {tipo: [] for tipo in TIPOS_CATALOGO}
    for linha in linhas:
        agrupados[linha.tipo].append({**linha.conteudo, "com_dados_publicados": linha.com_dados_publicados})
    return CatalogosResponse(**agrupados)


def _resposta(linha: Row, catalogos: dict, admin: bool) -> dict:
    conteudo = linha.conteudo
    unidade = catalogos["unidades"][conteudo["unidade_codigo"]]
    referencia = conteudo["referencia"]
    categoria = catalogos["categorias"][conteudo["categoria_codigo"]] if conteudo.get("categoria_codigo") else None
    resposta = {
        "id": linha.id,
        "indicador": catalogos["indicadores"][conteudo["indicador_codigo"]],
        "territorio": catalogos["territorios"][conteudo["territorio_codigo"]],
        "categoria": categoria,
        "codigo_cnae": conteudo.get("codigo_cnae") or (categoria or {}).get("codigo_cnae"),
        "referencia": {**referencia, "rotulo": rotulo_referencia(referencia)},
        "valor": conteudo["valor"],
        "valor_exibicao": str(valor_para_exibicao(Decimal(conteudo["valor"]), unidade["casas_exibicao"])),
        "qualificador": conteudo["qualificador"],
        "unidade": unidade,
        "fonte": catalogos["fontes"][conteudo["fonte_codigo"]],
        "temas": [catalogos["temas"][tema] for tema in conteudo["temas"]],
        "notas": conteudo.get("notas", []),
        "demonstracao": linha.demonstracao,
    }
    if admin:
        resposta.update(
            status=linha.status,
            divulgacao_bloqueada=linha.divulgacao_bloqueada,
            motivo_bloqueio=linha.motivo_bloqueio,
            publicado_por=linha.publicado_por,
            publicado_em=linha.publicado_em,
            proveniencias=conteudo["proveniencias"],
        )
    return resposta
