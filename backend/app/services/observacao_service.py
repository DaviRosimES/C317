from collections.abc import Callable
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.engine import Connection, Row
from sqlalchemy.exc import IntegrityError

from app.core.apresentacao import valor_para_exibicao
from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.observacao_repository import ObservacaoRepository
from app.schemas.observacao import (
    CatalogosResponse,
    ObservacaoAdminResponse,
    ObservacaoCreate,
    ObservacaoPublicaResponse,
    ObservacaoUpdate,
    ReferenciaResponse,
)

# A identidade precisa ser a mesma do carregador da G4: a observação cadastrada
# pela API e a mesma observação vinda de um pacote não podem virar duas.
from scripts.m6.contrato import decimal_exato, identidade

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


class ObservacaoService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.observacoes = ObservacaoRepository(connection)
        self._catalogos: dict[str, dict[str, dict]] | None = None

    @property
    def catalogos(self) -> dict[str, dict[str, dict]]:
        if self._catalogos is None:
            carregados = self.observacoes.catalogos()
            self._catalogos = {tipo: carregados.get(tipo, {}) for tipo in TIPOS_CATALOGO}
        return self._catalogos

    # Consulta pública

    def listar_catalogos(self) -> CatalogosResponse:
        usados = self.observacoes.codigos_publicados()
        return CatalogosResponse(
            **{
                tipo: [
                    {**item, "com_dados_publicados": codigo in usados[tipo]}
                    for codigo, item in sorted(
                        self.catalogos[tipo].items(), key=lambda par: (par[1]["nome"], par[0])
                    )
                ]
                for tipo in TIPOS_CATALOGO
            }
        )

    def referencias_publicadas(self) -> list[ReferenciaResponse]:
        return [
            ReferenciaResponse(**referencia, rotulo=rotulo_referencia(referencia))
            for referencia in self.observacoes.referencias_publicadas()
        ]

    def listar_publicas(self, **filtros) -> list[ObservacaoPublicaResponse]:
        consulta = self._filtros(**filtros)
        if consulta is None:
            return []
        return [
            ObservacaoPublicaResponse(**self._resposta(linha))
            for linha in self.observacoes.listar(consulta, somente_publicas=True)
        ]

    def obter_publica(self, observacao_id: str) -> ObservacaoPublicaResponse:
        linha = self.observacoes.get(observacao_id, somente_publica=True)
        if linha is None:
            raise NaoEncontradoError("Observação não encontrada.")
        return ObservacaoPublicaResponse(**self._resposta(linha))

    # Administração

    def listar_admin(self, status=None, divulgacao_bloqueada=None, **filtros) -> list[ObservacaoAdminResponse]:
        consulta = self._filtros(**filtros)
        if consulta is None:
            return []
        consulta.update(status=status, divulgacao_bloqueada=divulgacao_bloqueada)
        return [
            ObservacaoAdminResponse(**self._resposta(linha, admin=True))
            for linha in self.observacoes.listar(consulta, somente_publicas=False)
        ]

    def obter_admin(self, observacao_id: str) -> ObservacaoAdminResponse:
        return ObservacaoAdminResponse(**self._resposta(self._linha(observacao_id), admin=True))

    def criar(self, dados: ObservacaoCreate, admin_id: int) -> ObservacaoAdminResponse:
        for campo, tipo in (
            ("indicador_codigo", "indicadores"),
            ("territorio_codigo", "territorios"),
            ("categoria_codigo", "categorias"),
            ("unidade_codigo", "unidades"),
            ("fonte_codigo", "fontes"),
        ):
            codigo = getattr(dados, campo)
            if codigo is not None:
                self._exigir(tipo, codigo, campo)
        temas = list(dict.fromkeys(dados.temas))
        for tema in temas:
            self._exigir("temas", tema, "temas")

        referencia = dados.referencia.model_dump(exclude={"data_extracao"})
        if dados.referencia.data_extracao:
            referencia["data_extracao"] = dados.referencia.data_extracao.isoformat()
        conteudo = {
            "indicador_codigo": dados.indicador_codigo,
            "territorio_codigo": dados.territorio_codigo,
            "categoria_codigo": dados.categoria_codigo,
            "codigo_cnae": dados.codigo_cnae,
            "referencia": referencia,
            "valor": self._validar_valor(dados.valor, dados.unidade_codigo),
            "unidade_codigo": dados.unidade_codigo,
            "qualificador": dados.qualificador,
            "fonte_codigo": dados.fonte_codigo,
            "temas": temas,
            "notas": dados.notas,
            "proveniencias": [_registro("cadastro_administrativo", admin_id)],
        }
        conteudo["id"] = identidade(conteudo)
        self._gravar(lambda: self.observacoes.inserir(conteudo))
        return self.obter_admin(conteudo["id"])

    def corrigir(
        self, observacao_id: str, dados: ObservacaoUpdate, admin_id: int
    ) -> ObservacaoAdminResponse:
        linha = self._linha(observacao_id)
        conteudo = dict(linha.conteudo)
        alteracoes = dados.model_dump(exclude_unset=True)
        if "valor" in alteracoes:
            alteracoes["valor"] = self._validar_valor(alteracoes["valor"], conteudo["unidade_codigo"])
        anteriores = {campo: conteudo.get(campo) for campo in alteracoes}
        if anteriores == alteracoes:
            return self.obter_admin(observacao_id)
        conteudo.update(alteracoes)
        conteudo["proveniencias"] = [
            *conteudo["proveniencias"],
            {**_registro("correcao_administrativa", admin_id), "anterior": anteriores},
        ]
        responsavel = admin_id if linha.status == "publicado" else None
        self._gravar(
            lambda: self.observacoes.atualizar_conteudo(observacao_id, conteudo, responsavel)
        )
        return self.obter_admin(observacao_id)

    def publicar(self, observacao_id: str, admin_id: int) -> ObservacaoAdminResponse:
        linha = self._linha(observacao_id)
        if linha.divulgacao_bloqueada:
            raise ValidacaoError(
                f"Divulgação bloqueada: {linha.motivo_bloqueio}. Desbloqueie antes de publicar."
            )
        self.observacoes.publicar(observacao_id, admin_id)
        return self.obter_admin(observacao_id)

    def despublicar(self, observacao_id: str) -> ObservacaoAdminResponse:
        self._linha(observacao_id)
        self.observacoes.despublicar(observacao_id)
        return self.obter_admin(observacao_id)

    def bloquear(self, observacao_id: str, motivo: str) -> ObservacaoAdminResponse:
        self._linha(observacao_id)
        self.observacoes.bloquear(observacao_id, motivo)
        return self.obter_admin(observacao_id)

    def desbloquear(self, observacao_id: str) -> ObservacaoAdminResponse:
        self._linha(observacao_id)
        self.observacoes.desbloquear(observacao_id)
        return self.obter_admin(observacao_id)

    # Regras auxiliares

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
        for valores, tipo, parametro in (
            (tema, "temas", "tema"),
            (indicador, "indicadores", "indicador"),
            (territorio, "territorios", "territorio"),
            (categoria, "categorias", "categoria"),
        ):
            for codigo in valores or []:
                self._exigir(tipo, codigo, parametro)
        if mes is not None and ano is None:
            raise ValidacaoError("O filtro de mês exige o ano.")
        if mes is not None and referencia_tipo and "mensal" not in referencia_tipo:
            raise ValidacaoError("O filtro de mês só se aplica a referências mensais.")

        categorias = list(categoria or [])
        if classificacao:
            conhecidas = {item["classificacao"] for item in self.catalogos["categorias"].values()}
            for nome in classificacao:
                if nome not in conhecidas:
                    raise ValidacaoError(f"Classificação desconhecida: {nome}.")
            da_classificacao = [
                codigo
                for codigo, item in self.catalogos["categorias"].items()
                if item["classificacao"] in classificacao
            ]
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

    def _exigir(self, tipo: str, codigo: str, campo: str) -> None:
        # Código desconhecido nunca é tratado como total municipal ou outra unidade.
        if codigo not in self.catalogos[tipo]:
            raise ValidacaoError(f"Código desconhecido em {campo}: {codigo}.")

    def _validar_valor(self, valor: str, unidade_codigo: str) -> str:
        exato = decimal_exato(valor)
        unidade = self.catalogos["unidades"][unidade_codigo]
        numero = Decimal(exato)
        if unidade["inteira"] and numero != numero.to_integral_value():
            raise ValidacaoError(f"A unidade {unidade['nome']} exige um valor inteiro.")
        if unidade["maximo"] is not None and numero > Decimal(str(unidade["maximo"])):
            raise ValidacaoError(
                f"O valor excede o máximo da unidade {unidade['nome']} ({unidade['maximo']})."
            )
        return exato

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

    def _resposta(self, linha: Row, admin: bool = False) -> dict:
        conteudo = linha.conteudo
        catalogos = self.catalogos
        unidade = catalogos["unidades"][conteudo["unidade_codigo"]]
        referencia = conteudo["referencia"]
        categoria = conteudo.get("categoria_codigo")
        resposta = {
            "id": linha.id,
            "indicador": catalogos["indicadores"][conteudo["indicador_codigo"]],
            "territorio": catalogos["territorios"][conteudo["territorio_codigo"]],
            "categoria": catalogos["categorias"][categoria] if categoria else None,
            "codigo_cnae": conteudo.get("codigo_cnae"),
            "referencia": {**referencia, "rotulo": rotulo_referencia(referencia)},
            "valor": conteudo["valor"],
            "valor_exibicao": str(
                valor_para_exibicao(Decimal(conteudo["valor"]), unidade["casas_exibicao"])
            ),
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


def _registro(origem: str, admin_id: int) -> dict:
    return {
        "origem": origem,
        "usuario_id": admin_id,
        "registrado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
