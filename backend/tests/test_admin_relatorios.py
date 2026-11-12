"""V8: administração de relatórios por PDF e elegibilidade da consulta pública."""

import pytest
from sqlalchemy import text

from app.core.config import settings
from app.core.security import create_access_token
from app.repositories.relatorio_repository import RelatorioRepository
from tests.conftest import auth

ADMIN = "/api/v1/admin/relatorios"
PUBLICO = "/api/v1/relatorios"
FONTE = "Observatório de teste"
PDF_A = b"%PDF-1.7\n% relatorio A enviado\n%%EOF\n"
PDF_B = b"%PDF-1.7\n% relatorio B enviado\n%%EOF\n"
LINK = "https://drive.google.com/open?id=teste-v8-legado"


@pytest.fixture
def pasta(tmp_path, monkeypatch):
    """Pasta de PDFs isolada, com um arquivo na raiz como os da demonstração."""
    monkeypatch.setattr(settings, "relatorios_dir", tmp_path)
    (tmp_path / "demonstracao.pdf").write_bytes(PDF_A)
    return tmp_path


def enviados(pasta) -> list:
    pasta_enviados = pasta / "enviados"
    return sorted(pasta_enviados.iterdir()) if pasta_enviados.exists() else []


def cadastrar(client, headers, conteudo=PDF_A, nome="relatorio.pdf", **campos):
    dados = {"titulo": "Relatório de teste", "fonte": FONTE, **campos}
    return client.post(
        ADMIN,
        data={chave: valor for chave, valor in dados.items() if valor is not None},
        files={"arquivo": (nome, conteudo, "application/pdf")},
        headers=headers,
    )


@pytest.fixture
def novo(client, admin_headers, pasta):
    resposta = cadastrar(client, admin_headers)
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def publicos(client) -> set[int]:
    return {item["id"] for item in client.get(PUBLICO).json()}


def acao(client, headers, relatorio_id, nome):
    return client.post(f"{ADMIN}/{relatorio_id}/{nome}", headers=headers)


def legado(db, **campos) -> int:
    """Relatório anterior à V8, inserido direto no banco (link externo ou PDF da raiz)."""
    valores = {
        "titulo": "Relatório legado",
        "fonte": FONTE,
        "arquivo": None,
        "link": LINK,
        "status": "publicado",
        **campos,
    }
    return db.execute(
        text(
            """
            INSERT INTO relatorios (titulo, fonte, arquivo_url, link_externo, status, demonstracao)
            VALUES (:titulo, :fonte, :arquivo, :link, :status, false)
            RETURNING id
            """
        ),
        valores,
    ).scalar_one()


# Cadastro


def test_cadastro_cria_rascunho_privado_com_o_pdf(client, admin_headers, pasta, novo):
    assert novo == {
        "id": novo["id"],
        "titulo": "Relatório de teste",
        "numero": None,
        "tipo": None,
        "fonte": FONTE,
        "data_publicacao": None,
        "ano": None,
        "mes": None,
        "status": "rascunho",
        "arquivado": False,
        "demonstracao": False,
        "possui_pdf": True,
        "arquivo_nome": "relatorio.pdf",
        "link_externo": None,
    }
    [arquivo] = enviados(pasta)
    assert arquivo.read_bytes() == PDF_A

    assert novo["id"] not in publicos(client)
    assert client.get(f"{PUBLICO}/{novo['id']}").status_code == 404
    assert client.get(f"{PUBLICO}/{novo['id']}/arquivo").status_code == 404

    baixado = client.get(f"{ADMIN}/{novo['id']}/arquivo", headers=admin_headers)
    assert baixado.status_code == 200
    assert baixado.content == PDF_A
    assert baixado.headers["content-disposition"] == 'attachment; filename="relatorio.pdf"'


def test_cadastro_com_metadados_conhecidos(client, admin_headers, pasta):
    resposta = cadastrar(
        client,
        admin_headers,
        nome="C:\\Users\\equipe\\Relatório 004.pdf",
        numero=" 004/2025 ",
        tipo="relatorio_tecnico",
        data_publicacao="2025-11-07",
        ano="2025",
        mes="10",
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert {campo: corpo[campo] for campo in ("numero", "tipo", "data_publicacao", "ano", "mes")} == {
        "numero": "004/2025",
        "tipo": "relatorio_tecnico",
        "data_publicacao": "2025-11-07",
        "ano": 2025,
        "mes": 10,
    }
    # Só o nome do arquivo é guardado, sem o caminho da máquina de quem enviou.
    assert corpo["arquivo_nome"] == "Relatório 004.pdf"


def test_opcionais_vazios_nao_sao_inventados(client, admin_headers, pasta):
    resposta = cadastrar(
        client, admin_headers, numero="", tipo="", data_publicacao="", ano="", mes=""
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert [corpo[campo] for campo in ("numero", "tipo", "data_publicacao", "ano", "mes")] == [None] * 5


@pytest.mark.parametrize(
    "campos",
    [
        {"titulo": None},
        {"titulo": "   "},
        {"fonte": None},
        {"fonte": ""},
        {"mes": "3"},
        {"ano": "2025", "mes": "13"},
        {"tipo": "boletim"},
        {"data_publicacao": "07/11/2025"},
        {"link_externo": LINK},
    ],
)
def test_cadastro_recusa_campos_invalidos_sem_gravar_nada(client, db, admin_headers, pasta, campos):
    antes = db.execute(text("SELECT count(*) FROM relatorios")).scalar_one()
    resposta = cadastrar(client, admin_headers, **campos)
    assert resposta.status_code == 422, resposta.text
    assert db.execute(text("SELECT count(*) FROM relatorios")).scalar_one() == antes
    assert enviados(pasta) == []


def test_mes_sem_ano_tem_mensagem(client, admin_headers, pasta):
    resposta = cadastrar(client, admin_headers, mes="3")
    assert "Mês de referência exige ano" in resposta.text


def test_cadastro_exige_pdf(client, admin_headers, pasta):
    resposta = client.post(ADMIN, data={"titulo": "Sem PDF", "fonte": FONTE}, headers=admin_headers)
    assert resposta.status_code == 422


@pytest.mark.parametrize(
    "conteudo",
    [
        b"",
        b"Isto e um texto com nome de PDF\n",
        b"%PDF-1.7\n% sem marcador de fim",
        b"\x89PNG\r\n\x1a\n%%EOF",
    ],
)
def test_conteudo_que_nao_e_pdf_e_recusado(client, admin_headers, pasta, conteudo):
    resposta = cadastrar(client, admin_headers, conteudo=conteudo, nome="parece.pdf")
    assert resposta.status_code == 422
    assert "PDF válido" in resposta.json()["detail"] or "vazio" in resposta.json()["detail"]
    assert enviados(pasta) == []


def test_pdf_acima_do_limite_e_recusado(client, admin_headers, pasta, monkeypatch):
    monkeypatch.setattr(settings, "relatorios_tamanho_maximo", 1024 * 1024)
    grande = b"%PDF-1.7\n" + b"0" * (1024 * 1024) + b"\n%%EOF\n"
    resposta = cadastrar(client, admin_headers, conteudo=grande)
    assert resposta.status_code == 413
    assert resposta.json()["detail"].startswith("O PDF excede o limite de 1 MB")
    assert enviados(pasta) == []


def test_limite_informado(client, admin_headers, monkeypatch):
    monkeypatch.setattr(settings, "relatorios_tamanho_maximo", 5 * 1024 * 1024)
    resposta = client.get(f"{ADMIN}/limites", headers=admin_headers)
    assert resposta.json() == {"tamanho_maximo_bytes": 5 * 1024 * 1024, "tipos_aceitos": ["application/pdf"]}


def test_falha_ao_gravar_no_banco_nao_deixa_pdf_orfao(client, admin_headers, pasta, monkeypatch):
    def falhar(*_):
        raise RuntimeError("falha simulada")

    monkeypatch.setattr(RelatorioRepository, "inserir", falhar)
    with pytest.raises(RuntimeError, match="falha simulada"):
        cadastrar(client, admin_headers)
    assert enviados(pasta) == []


# Publicação e edição


def test_publicar_e_despublicar(client, admin_headers, novo):
    publicado = acao(client, admin_headers, novo["id"], "publicar")
    assert publicado.json()["status"] == "publicado"
    assert novo["id"] in publicos(client)
    assert client.get(f"{PUBLICO}/{novo['id']}").json()["titulo"] == "Relatório de teste"
    baixado = client.get(f"{PUBLICO}/{novo['id']}/arquivo")
    assert baixado.status_code == 200
    assert baixado.content == PDF_A

    rascunho = acao(client, admin_headers, novo["id"], "despublicar")
    assert rascunho.json()["status"] == "rascunho"
    assert rascunho.json()["possui_pdf"] is True
    assert novo["id"] not in publicos(client)
    assert client.get(f"{PUBLICO}/{novo['id']}/arquivo").status_code == 404


def test_edicao_de_publicado_vale_na_hora(client, admin_headers, novo):
    acao(client, admin_headers, novo["id"], "publicar")
    resposta = client.patch(
        f"{ADMIN}/{novo['id']}",
        json={"titulo": "Título corrigido", "ano": 2025, "mes": 9},
        headers=admin_headers,
    )
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["status"] == "publicado"
    publico = client.get(f"{PUBLICO}/{novo['id']}").json()
    assert (publico["titulo"], publico["ano"], publico["mes"]) == ("Título corrigido", 2025, 9)


def test_edicao_de_rascunho_continua_privada(client, admin_headers, novo):
    resposta = client.patch(f"{ADMIN}/{novo['id']}", json={"titulo": "Outro"}, headers=admin_headers)
    assert resposta.json()["status"] == "rascunho"
    assert novo["id"] not in publicos(client)


def test_edicao_remove_metadados_opcionais(client, admin_headers, pasta):
    criado = cadastrar(client, admin_headers, numero="001/2024", ano="2024", mes="5").json()
    resposta = client.patch(
        f"{ADMIN}/{criado['id']}", json={"numero": None, "ano": None, "mes": None}, headers=admin_headers
    )
    assert [resposta.json()[c] for c in ("numero", "ano", "mes")] == [None, None, None]


@pytest.mark.parametrize(
    ("corpo", "trecho"),
    [
        ({"titulo": None}, "titulo"),
        ({"fonte": None}, "fonte"),
        ({"titulo": "  "}, "titulo"),
        ({"mes": 4}, "Mês de referência exige ano"),
        ({"link_externo": LINK}, "link_externo"),
        ({"status": "publicado"}, "status"),
    ],
)
def test_edicao_recusa_campos_invalidos(client, admin_headers, novo, corpo, trecho):
    resposta = client.patch(f"{ADMIN}/{novo['id']}", json=corpo, headers=admin_headers)
    assert resposta.status_code == 422
    assert trecho in resposta.text


def test_retirar_ano_com_mes_informado_e_recusado(client, admin_headers, pasta):
    criado = cadastrar(client, admin_headers, ano="2024", mes="5").json()
    resposta = client.patch(f"{ADMIN}/{criado['id']}", json={"ano": None}, headers=admin_headers)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": "Mês de referência exige ano."}


def test_publicar_exige_fonte(client, db, admin_headers, pasta):
    sem_fonte = legado(db, fonte=None, status="rascunho")
    resposta = acao(client, admin_headers, sem_fonte, "publicar")
    assert resposta.status_code == 422
    assert "fonte" in resposta.json()["detail"]


def test_publicar_exige_pdf_presente_no_servidor(client, db, admin_headers, pasta):
    perdido = legado(db, arquivo="enviados/ausente.pdf", link=None, status="rascunho")
    resposta = acao(client, admin_headers, perdido, "publicar")
    assert resposta.status_code == 422
    assert "não foi encontrado" in resposta.json()["detail"]


# Substituição do PDF


def test_troca_confirmada_mantem_status_e_conteudo_unico(client, admin_headers, pasta, novo):
    acao(client, admin_headers, novo["id"], "publicar")
    resposta = client.put(
        f"{ADMIN}/{novo['id']}/arquivo",
        files={"arquivo": ("novo.pdf", PDF_B, "application/pdf")},
        headers=admin_headers,
    )
    assert resposta.status_code == 200, resposta.text
    assert (resposta.json()["status"], resposta.json()["arquivo_nome"]) == ("publicado", "novo.pdf")
    assert client.get(f"{PUBLICO}/{novo['id']}/arquivo").content == PDF_B
    # O PDF anterior deixa de existir: não há versão paralela.
    assert [arquivo.read_bytes() for arquivo in enviados(pasta)] == [PDF_B]


def test_falha_na_troca_conserva_o_vigente(client, admin_headers, pasta, novo, monkeypatch):
    acao(client, admin_headers, novo["id"], "publicar")
    invalido = client.put(
        f"{ADMIN}/{novo['id']}/arquivo",
        files={"arquivo": ("novo.pdf", b"nao e pdf", "application/pdf")},
        headers=admin_headers,
    )
    assert invalido.status_code == 422
    assert "conteúdo vigente foi mantido" in invalido.json()["detail"]

    monkeypatch.setattr(settings, "relatorios_tamanho_maximo", 10)
    grande = client.put(
        f"{ADMIN}/{novo['id']}/arquivo",
        files={"arquivo": ("novo.pdf", PDF_B, "application/pdf")},
        headers=admin_headers,
    )
    assert grande.status_code == 413

    assert client.get(f"{PUBLICO}/{novo['id']}/arquivo").content == PDF_A
    assert client.get(f"{ADMIN}/{novo['id']}", headers=admin_headers).json()["arquivo_nome"] == "relatorio.pdf"
    assert [arquivo.read_bytes() for arquivo in enviados(pasta)] == [PDF_A]


def test_falha_no_banco_durante_a_troca_conserva_o_vigente(client, admin_headers, pasta, novo, monkeypatch):
    def falhar(*_):
        raise RuntimeError("falha simulada")

    monkeypatch.setattr(RelatorioRepository, "substituir_arquivo", falhar)
    with pytest.raises(RuntimeError, match="falha simulada"):
        client.put(
            f"{ADMIN}/{novo['id']}/arquivo",
            files={"arquivo": ("novo.pdf", PDF_B, "application/pdf")},
            headers=admin_headers,
        )
    assert [arquivo.read_bytes() for arquivo in enviados(pasta)] == [PDF_A]


def test_link_legado_continua_acessivel_e_troca_vira_pdf(client, db, admin_headers, pasta):
    relatorio = legado(db)
    assert client.get(f"{PUBLICO}/{relatorio}").json()["link_externo"] == LINK

    resposta = client.put(
        f"{ADMIN}/{relatorio}/arquivo",
        files={"arquivo": ("legado.pdf", PDF_B, "application/pdf")},
        headers=admin_headers,
    )
    corpo = resposta.json()
    assert (corpo["link_externo"], corpo["possui_pdf"], corpo["status"]) == (None, True, "publicado")
    assert client.get(f"{PUBLICO}/{relatorio}/arquivo").content == PDF_B


def test_troca_nao_apaga_pdf_da_demonstracao(client, db, admin_headers, pasta):
    relatorio = legado(db, arquivo="demonstracao.pdf", link=None)
    client.put(
        f"{ADMIN}/{relatorio}/arquivo",
        files={"arquivo": ("novo.pdf", PDF_B, "application/pdf")},
        headers=admin_headers,
    )
    assert (pasta / "demonstracao.pdf").read_bytes() == PDF_A


# Arquivamento


@pytest.mark.parametrize("publicar", [True, False])
def test_arquivar_e_restaurar_preservam_o_status(client, admin_headers, novo, publicar):
    if publicar:
        acao(client, admin_headers, novo["id"], "publicar")
    status = "publicado" if publicar else "rascunho"

    arquivado = acao(client, admin_headers, novo["id"], "arquivar").json()
    assert (arquivado["status"], arquivado["arquivado"]) == (status, True)
    assert novo["id"] not in publicos(client)
    assert client.get(f"{PUBLICO}/{novo['id']}").status_code == 404
    assert client.get(f"{PUBLICO}/{novo['id']}/arquivo").status_code == 404
    # A administração continua consultando e baixando.
    assert client.get(f"{ADMIN}/{novo['id']}/arquivo", headers=admin_headers).status_code == 200

    restaurado = acao(client, admin_headers, novo["id"], "restaurar").json()
    assert (restaurado["status"], restaurado["arquivado"]) == (status, False)
    assert (novo["id"] in publicos(client)) is publicar


def test_arquivado_precisa_ser_restaurado_antes_de_editar_ou_publicar(client, admin_headers, novo):
    acao(client, admin_headers, novo["id"], "arquivar")
    tentativas = [
        client.patch(f"{ADMIN}/{novo['id']}", json={"titulo": "x"}, headers=admin_headers),
        client.put(
            f"{ADMIN}/{novo['id']}/arquivo",
            files={"arquivo": ("novo.pdf", PDF_B, "application/pdf")},
            headers=admin_headers,
        ),
        acao(client, admin_headers, novo["id"], "publicar"),
        acao(client, admin_headers, novo["id"], "despublicar"),
    ]
    for resposta in tentativas:
        assert resposta.status_code == 409, resposta.text
        assert "Restaure-o" in resposta.json()["detail"]
    atual = client.get(f"{ADMIN}/{novo['id']}", headers=admin_headers).json()
    assert (atual["titulo"], atual["status"]) == ("Relatório de teste", "rascunho")


def test_link_legado_arquivado_sai_da_consulta_publica(client, db, admin_headers, pasta):
    relatorio = legado(db)
    acao(client, admin_headers, relatorio, "arquivar")
    assert relatorio not in publicos(client)
    assert client.get(f"{PUBLICO}/{relatorio}").status_code == 404


# Listagem administrativa


def test_listagem_por_situacao_e_status(client, admin_headers, pasta):
    rascunho = cadastrar(client, admin_headers).json()["id"]
    publicado = cadastrar(client, admin_headers).json()["id"]
    acao(client, admin_headers, publicado, "publicar")
    arquivado = cadastrar(client, admin_headers).json()["id"]
    acao(client, admin_headers, arquivado, "arquivar")

    def ids(**params):
        resposta = client.get(ADMIN, params=params, headers=admin_headers)
        assert resposta.status_code == 200, resposta.text
        return {item["id"] for item in resposta.json()} & {rascunho, publicado, arquivado}

    assert ids() == {rascunho, publicado}
    assert ids(situacao="arquivados") == {arquivado}
    assert ids(situacao="todos") == {rascunho, publicado, arquivado}
    assert ids(status="publicado") == {publicado}
    assert ids(situacao="todos", status="rascunho") == {rascunho, arquivado}
    assert client.get(ADMIN, params={"situacao": "x"}, headers=admin_headers).status_code == 422


def test_inexistente(client, admin_headers, pasta):
    for resposta in (
        client.get(f"{ADMIN}/999999999", headers=admin_headers),
        client.patch(f"{ADMIN}/999999999", json={"titulo": "x"}, headers=admin_headers),
        acao(client, admin_headers, 999999999, "arquivar"),
        client.get(f"{PUBLICO}/999999999"),
    ):
        assert resposta.status_code == 404
        assert resposta.json() == {"detail": "Relatório não encontrado."}


# Autenticação


def test_exige_administrador(client, db, pasta, novo):
    leitor = db.execute(
        text(
            "INSERT INTO usuarios (nome, email, papel) "
            "VALUES ('Cristiano Ronaldo', 'cristiano.ronaldo@example.test', 'leitor') RETURNING id"
        )
    ).scalar_one()
    for headers, esperado in (({}, 401), (auth(create_access_token(leitor)), 403)):
        assert client.get(ADMIN, headers=headers).status_code == esperado
        assert client.get(f"{ADMIN}/limites", headers=headers).status_code == esperado
        assert client.get(f"{ADMIN}/{novo['id']}", headers=headers).status_code == esperado
        assert client.get(f"{ADMIN}/{novo['id']}/arquivo", headers=headers).status_code == esperado
        assert cadastrar(client, headers).status_code == esperado
        assert client.patch(f"{ADMIN}/{novo['id']}", json={"titulo": "x"}, headers=headers).status_code == esperado
        assert client.put(
            f"{ADMIN}/{novo['id']}/arquivo",
            files={"arquivo": ("x.pdf", PDF_B, "application/pdf")},
            headers=headers,
        ).status_code == esperado
        for nome in ("publicar", "despublicar", "arquivar", "restaurar"):
            assert acao(client, headers, novo["id"], nome).status_code == esperado
    assert len(enviados(pasta)) == 1
