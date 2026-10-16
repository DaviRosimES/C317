from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings

URL = "/api/v1/relatorios"
FONTE = "Dados fictícios de teste"
PDF_A = b"%PDF-1.4\n% relatorio A de teste\n%%EOF\n"
PDF_B = b"%PDF-1.4\n% relatorio B de teste\n%%EOF\n"


@pytest.fixture
def pasta(tmp_path, monkeypatch):
    """Pasta de PDFs isolada; os arquivos da demonstração não são usados."""
    monkeypatch.setattr(settings, "relatorios_dir", tmp_path)
    (tmp_path / "teste-a.pdf").write_bytes(PDF_A)
    (tmp_path / "teste-b.pdf").write_bytes(PDF_B)
    (tmp_path / "rascunho.pdf").write_bytes(PDF_A)
    return tmp_path


@pytest.fixture
def cadastrar(db):
    def _cadastrar(arquivo, status="publicado", titulo=None, mes=1, data="2080-02-10", fonte=FONTE):
        periodo = db.execute(
            text(
                """
                INSERT INTO periodos (ano, mes) VALUES (2080, :mes)
                ON CONFLICT (ano, mes) DO UPDATE SET ano = EXCLUDED.ano RETURNING id
                """
            ),
            {"mes": mes},
        ).scalar_one()
        return db.execute(
            text(
                """
                INSERT INTO relatorios
                    (periodo_id, titulo, arquivo_url, data_publicacao, fonte, status,
                     demonstracao)
                VALUES (:periodo, :titulo, :arquivo, :data, :fonte, :status, true)
                RETURNING id
                """
            ),
            {
                "periodo": periodo,
                "titulo": titulo or f"Relatório {arquivo}",
                "arquivo": arquivo,
                "data": date.fromisoformat(data),
                "fonte": fonte,
                "status": status,
            },
        ).scalar_one()

    return _cadastrar


def listar(client):
    resposta = client.get(URL)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def proprios(itens, ids):
    return [item for item in itens if item["id"] in ids]


def test_lista_somente_publicados_com_fonte_data_e_referencia(client, pasta, cadastrar):
    publicado = cadastrar("teste-a.pdf", titulo="Boletim de teste", mes=3, data="2080-04-05")
    rascunho = cadastrar("rascunho.pdf", status="rascunho")
    itens = proprios(listar(client), {publicado, rascunho})
    assert itens == [
        {
            "id": publicado,
            "titulo": "Boletim de teste",
            "fonte": FONTE,
            "data_publicacao": "2080-04-05",
            "ano": 2080,
            "mes": 3,
            "demonstracao": True,
        }
    ]


def test_lista_do_mais_recente_para_o_mais_antigo(client, pasta, cadastrar):
    antigo = cadastrar("teste-a.pdf", data="2080-02-01")
    recente = cadastrar("teste-b.pdf", data="2080-03-01")
    assert [item["id"] for item in proprios(listar(client), {antigo, recente})] == [
        recente,
        antigo,
    ]


def test_novo_relatorio_cadastrado_aparece_na_listagem(client, pasta, cadastrar):
    primeiro = cadastrar("teste-a.pdf")
    assert [item["id"] for item in proprios(listar(client), {primeiro})] == [primeiro]
    novo = cadastrar("teste-b.pdf")
    assert {item["id"] for item in proprios(listar(client), {primeiro, novo})} == {primeiro, novo}


def test_download_devolve_o_pdf_do_relatorio_selecionado(client, pasta, cadastrar):
    relatorio_a = cadastrar("teste-a.pdf")
    relatorio_b = cadastrar("teste-b.pdf")
    for relatorio, conteudo, nome in [
        (relatorio_a, PDF_A, "teste-a.pdf"),
        (relatorio_b, PDF_B, "teste-b.pdf"),
    ]:
        resposta = client.get(f"{URL}/{relatorio}/arquivo")
        assert resposta.status_code == 200
        assert resposta.content == conteudo
        assert resposta.headers["content-type"] == "application/pdf"
        assert resposta.headers["content-disposition"] == f'attachment; filename="{nome}"'


def test_download_nao_exige_autenticacao(client, pasta, cadastrar):
    relatorio = cadastrar("teste-a.pdf")
    assert "authorization" not in {k.lower() for k in client.headers}
    assert client.get(f"{URL}/{relatorio}/arquivo").status_code == 200


def test_rascunho_nao_pode_ser_baixado(client, pasta, cadastrar):
    rascunho = cadastrar("rascunho.pdf", status="rascunho")
    resposta = client.get(f"{URL}/{rascunho}/arquivo")
    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Relatório não encontrado."}


def test_relatorio_inexistente(client, db, pasta):
    assert client.get(f"{URL}/999999999/arquivo").status_code == 404


@pytest.mark.parametrize("arquivo", ["ausente.pdf", "../fora-da-pasta.pdf", "teste-a.txt"])
def test_arquivo_ausente_ou_fora_da_pasta_nao_e_servido(client, pasta, cadastrar, arquivo):
    (pasta.parent / "fora-da-pasta.pdf").write_bytes(PDF_A)
    (pasta / "teste-a.txt").write_bytes(PDF_A)
    relatorio = cadastrar(arquivo)
    resposta = client.get(f"{URL}/{relatorio}/arquivo")
    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Arquivo do relatório não encontrado."}


def test_relatorio_publicado_exige_fonte(db, cadastrar):
    with pytest.raises(IntegrityError, match="ck_relatorios_publicado_com_fonte"):
        with db.begin_nested():
            cadastrar("sem-fonte.pdf", fonte=None)
    with pytest.raises(IntegrityError, match="ck_relatorios_fonte"):
        with db.begin_nested():
            cadastrar("fonte-vazia.pdf", status="rascunho", fonte="   ")
    assert cadastrar("rascunho-sem-fonte.pdf", status="rascunho", fonte=None)


def test_mesmo_arquivo_nao_pertence_a_dois_relatorios(db, cadastrar):
    cadastrar("teste-a.pdf")
    with pytest.raises(IntegrityError, match="uq_relatorios_arquivo_url"):
        cadastrar("teste-a.pdf")

