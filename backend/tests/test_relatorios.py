import json
import sys
from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from scripts.carregar_relatorios import carregar, ler, main
from scripts.seed_demo import load_dataset, seed_demo

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
    def _cadastrar(
        arquivo,
        status="publicado",
        titulo=None,
        mes=1,
        data="2080-02-10",
        fonte=FONTE,
        link=None,
        numero=None,
        tipo=None,
        sem_referencia=False,
    ):
        periodo = None
        if not sem_referencia:
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
                    (periodo_id, titulo, arquivo_url, link_externo, numero, tipo,
                     data_publicacao, fonte, status, demonstracao)
                VALUES (:periodo, :titulo, :arquivo, :link, :numero, :tipo, :data, :fonte,
                        :status, true)
                RETURNING id
                """
            ),
            {
                "periodo": periodo,
                "titulo": titulo or f"Relatório {arquivo or link}",
                "arquivo": arquivo,
                "link": link,
                "numero": numero,
                "tipo": tipo,
                "data": date.fromisoformat(data) if data else None,
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
            "numero": None,
            "tipo": None,
            "fonte": FONTE,
            "data_publicacao": "2080-04-05",
            "ano": 2080,
            "mes": 3,
            "link_externo": None,
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


def test_seed_cadastra_relatorios_de_demonstracao_sem_duplicar(client, db):
    dataset = load_dataset()
    seed_demo(db, dataset)
    seed_demo(db, dataset)
    linhas = db.execute(
        text(
            "SELECT arquivo_url, status FROM relatorios "
            "WHERE demonstracao AND fonte = :fonte ORDER BY arquivo_url"
        ),
        {"fonte": dataset["fonte"]},
    ).all()
    assert [tuple(linha) for linha in linhas] == [
        ("boletim-demonstracao-2026-08.pdf", "publicado"),
        ("boletim-demonstracao-2026-09.pdf", "publicado"),
        ("boletim-demonstracao-2026-10.pdf", "rascunho"),
    ]

    publicados = [item for item in listar(client) if item["fonte"] == dataset["fonte"]]
    assert [item["titulo"] for item in publicados] == [
        "Boletim do turismo — setembro de 2026",
        "Boletim do turismo — agosto de 2026",
    ]
    resposta = client.get(f"{URL}/{publicados[0]['id']}/arquivo")
    assert resposta.status_code == 200
    assert resposta.content.startswith(b"%PDF-")
    assert resposta.content == (
        settings.relatorios_dir / "boletim-demonstracao-2026-09.pdf"
    ).read_bytes()


LINK = "https://drive.google.com/open?id=teste-relatorio-externo"


def test_relatorio_externo_informa_link_e_nao_tem_pdf_na_api(client, pasta, cadastrar):
    externo = cadastrar(
        None, link=LINK, numero="004/2080", tipo="relatorio_tecnico", data="2080-03-01"
    )
    [item] = proprios(listar(client), {externo})
    assert item["link_externo"] == LINK
    assert (item["numero"], item["tipo"]) == ("004/2080", "relatorio_tecnico")

    resposta = client.get(f"{URL}/{externo}/arquivo")
    assert resposta.status_code == 404
    assert "link externo" in resposta.json()["detail"]


def test_data_e_referencia_desconhecidas_nao_sao_presumidas(client, pasta, cadastrar):
    datado = cadastrar("teste-a.pdf", data="2080-02-01")
    sem_data = cadastrar(None, link=LINK, data=None, sem_referencia=True, tipo="peca_divulgacao")
    itens = proprios(listar(client), {datado, sem_data})
    # Sem data, o relatório vai para o fim em vez de receber uma data qualquer.
    assert [item["id"] for item in itens] == [datado, sem_data]
    assert {k: itens[1][k] for k in ("data_publicacao", "ano", "mes", "numero")} == {
        "data_publicacao": None,
        "ano": None,
        "mes": None,
        "numero": None,
    }


@pytest.mark.parametrize(
    ("campos", "restricao"),
    [
        ({"arquivo": "teste-a.pdf", "link": LINK}, "ck_relatorios_um_destino"),
        ({"arquivo": None, "link": None}, "ck_relatorios_um_destino"),
        ({"arquivo": None, "link": "http://inseguro.example/relatorio.pdf"}, "ck_relatorios_link_externo"),
        ({"arquivo": "teste-a.pdf", "tipo": "boletim"}, "ck_relatorios_tipo"),
        ({"arquivo": "teste-a.pdf", "numero": "  "}, "ck_relatorios_numero"),
    ],
)
def test_banco_exige_um_destino_e_metadados_validos(db, cadastrar, campos, restricao):
    arquivo = campos.pop("arquivo")
    with pytest.raises(IntegrityError, match=restricao):
        with db.begin_nested():
            cadastrar(arquivo, **campos)


def test_mesmo_link_nao_pertence_a_dois_relatorios(db, cadastrar):
    cadastrar(None, link=LINK)
    with pytest.raises(IntegrityError, match="uq_relatorios_link_externo"):
        cadastrar(None, link=LINK)


@pytest.fixture
def recebidos(db):
    """Relatórios reais do arquivo versionado, sem depender do estado do banco local."""
    relatorios = ler()
    db.execute(
        text("DELETE FROM relatorios WHERE link_externo = ANY(:links)"),
        {"links": [relatorio["link_externo"] for relatorio in relatorios]},
    )
    return relatorios


def test_relatorios_recebidos_preservam_numeros_e_datas_conhecidos(recebidos):
    por_numero = {relatorio["numero"]: relatorio for relatorio in recebidos}
    assert por_numero["001/2024"]["data_publicacao"] == "2024-11-08"
    assert por_numero["004/2025"]["data_publicacao"] == "2025-11-07"
    assert all(not relatorio["titulo"].lower().startswith("boletim") for relatorio in recebidos)


def test_carga_dos_recebidos_publica_sem_duplicar(client, db, recebidos):
    assert carregar(db, recebidos) == {"criados": len(recebidos), "reutilizados": 0}
    assert carregar(db, recebidos) == {"criados": 0, "reutilizados": len(recebidos)}

    links = {relatorio["link_externo"] for relatorio in recebidos}
    publicados = [item for item in listar(client) if item["link_externo"] in links]
    assert len(publicados) == len(recebidos)
    hacktown = next(item for item in publicados if item["numero"] == "004/2025")
    assert hacktown["data_publicacao"] == "2025-11-07"
    assert (hacktown["ano"], hacktown["mes"]) == (2025, None)
    assert hacktown["tipo"] == "relatorio_tecnico"
    assert hacktown["demonstracao"] is False


def test_carga_nao_sobrescreve_relatorio_corrigido(db, recebidos):
    carregar(db, recebidos)
    db.execute(
        text("UPDATE relatorios SET titulo = 'Título corrigido' WHERE link_externo = :link"),
        {"link": recebidos[0]["link_externo"]},
    )
    with pytest.raises(ValueError, match="já existe com outros metadados"):
        carregar(db, recebidos)
    titulo = db.execute(
        text("SELECT titulo FROM relatorios WHERE link_externo = :link"),
        {"link": recebidos[0]["link_externo"]},
    ).scalar_one()
    assert titulo == "Título corrigido"


RECEBIDO = {
    "titulo": "Peça",
    "fonte": "Observatório",
    "link_externo": "https://drive.google.com/open?id=x",
    "acesso_conferido_em": "2026-10-01",
}


def gravar(tmp_path, dados):
    arquivo = tmp_path / "relatorios.json"
    arquivo.write_text(json.dumps(dados), encoding="utf-8")
    return arquivo


def test_carga_recusa_relatorio_sem_acesso_conferido(tmp_path):
    arquivo = gravar(tmp_path, {"relatorios": [{**RECEBIDO, "acesso_conferido_em": None}]})
    with pytest.raises(ValueError, match="sem data de acesso conferido"):
        ler(arquivo)


@pytest.mark.parametrize(
    ("dados", "mensagem"),
    [
        ([RECEBIDO], 'lista "relatorios"'),
        ({"relatorios": 4}, 'lista "relatorios"'),
        ({"relatorios": ["Peça"]}, "precisa ser um objeto"),
        ({"relatorios": [{**RECEBIDO, "numero": 4}]}, "numero precisa ser texto"),
        ({"relatorios": [{**RECEBIDO, "titulo": ["Peça"]}]}, "titulo precisa ser texto"),
        ({"relatorios": [{**RECEBIDO, "ano": "2024"}]}, "ano precisa ser um número inteiro"),
        ({"relatorios": [{**RECEBIDO, "ano": 2024, "mes": True}]}, "mes precisa ser um número inteiro"),
    ],
)
def test_carga_recusa_json_malformado_com_mensagem(tmp_path, dados, mensagem):
    with pytest.raises(ValueError, match=mensagem):
        ler(gravar(tmp_path, dados))


def test_carga_recusada_sai_com_codigo_2(tmp_path, monkeypatch, capsys):
    arquivo = gravar(tmp_path, {"relatorios": [{**RECEBIDO, "ano": "2024"}]})
    monkeypatch.setattr(sys, "argv", ["carregar_relatorios", "--arquivo", str(arquivo)])
    assert main() == 2
    assert "Carga recusada: O campo ano" in capsys.readouterr().err
