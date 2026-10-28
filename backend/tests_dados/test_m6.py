"""Cenários de qualidade e carga executáveis sem API, Docker ou bibliotecas extras."""

from copy import deepcopy
import csv
from decimal import Decimal
from hashlib import sha256
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

from scripts.carregar_m6 import abrir_ensaio, aplicar, validar_banco
from scripts.m6.contrato import carregar_pacote, decimal_exato, identidade, referencia, validar_observacao
from scripts.m6.planilha import referencias

PACOTE = Path(__file__).resolve().parents[1] / "dados/m6"


class ContratoTest(unittest.TestCase):
    def test_ano_pendente_nao_recebe_ano_atual(self):
        for valor in ("", "A confirmar", "A preencher", "2026?"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                referencia(valor)

    def test_anual_mensal_acumulado_e_levantamento_sao_distintos(self):
        self.assertEqual(referencia("2024")["tipo"], "anual")
        self.assertEqual(referencia("Junho de 2026")["mes"], 6)
        self.assertEqual(referencia("Março de 2027")["mes"], 3)
        self.assertEqual(referencia("Dezembro de 2025")["mes"], 12)
        self.assertEqual(referencia("2000–2024")["tipo"], "acumulada")
        self.assertEqual(referencia("2022 e 2023")["tipo"], "levantamento")
        self.assertIsNone(referencia("2022 e 2023")["mes"])

    def test_extracao_lattes_e_retrato_e_nao_serie_anual(self):
        resultado = referencia("2026 (extração 04/10/2026)")
        self.assertEqual(resultado["tipo"], "retrato")
        self.assertEqual(resultado["data_extracao"], "2026-10-04")

    def test_precisao_e_zero_preservados(self):
        self.assertEqual(decimal_exato("0"), "0")
        self.assertEqual(decimal_exato("0.0246093269349083"), "0.0246093269349083")
        for valor in ("NaN", "Infinity", "-1"):
            with self.subTest(valor=valor), self.assertRaises(ValueError):
                decimal_exato(valor)

    def test_dependencias_incluem_outras_abas_e_intervalos(self):
        self.assertEqual(referencias("D16/'Dados gerais'!D15*100", "Vale da Eletrônica"), [("Vale da Eletrônica", "D16"), ("Dados gerais", "D15")])
        self.assertEqual(referencias("SUM('Patentes por ano'!$Z$2:$AB$2)", "Pesquisa e inovação"), [("Patentes por ano", "Z2"), ("Patentes por ano", "AA2"), ("Patentes por ano", "AB2")])


class PacoteTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifesto, cls.catalogos, cls.registros = carregar_pacote(PACOTE)
        cls.por_local = {(p["aba"], p["celula"]): r for r in cls.registros for p in r["proveniencias"]}
        with (PACOTE / "triagem.csv").open(encoding="utf-8-sig", newline="") as arquivo:
            cls.triagem = {(r["aba"], r["celula"]): r for r in csv.DictReader(arquivo, delimiter=";")}

    def test_triagem_cobre_todas_as_linhas_e_series(self):
        self.assertEqual(len(self.triagem), 459 + 900)
        self.assertEqual(self.manifesto["linhas_indicadores_elegiveis"] + self.manifesto["linhas_indicadores_excluidas"], 459)
        self.assertEqual(len(self.catalogos["temas"]), 6)

    def test_fontes_e_periodos_pendentes_nao_vazam(self):
        for local in [("Dados gerais", "D15"), ("Turismo", "D12"), ("Turismo", "D38"), ("Economia criativa", "D2"), ("Eventos", "D2"), ("Pesquisa e inovação", "D224"), ("Pesquisa e inovação", "D74")]:
            with self.subTest(local=local):
                self.assertNotIn(local, self.por_local)
                self.assertEqual(self.triagem[local]["situacao"], "excluido")

    def test_formula_com_insumo_pendente_tambem_e_excluida(self):
        local = ("Vale da Eletrônica", "D7")
        self.assertNotIn(local, self.por_local)
        self.assertIn("depende_de_registro_excluido", self.triagem[local]["motivos"])

    def test_zeros_validos_nao_sao_bloqueados_por_valor_menor_que_cinco(self):
        self.assertEqual(self.por_local[("Turismo", "D5")]["valor"], "0")
        self.assertEqual(self.por_local[("Turismo", "D3")]["valor"], "3")

    def test_dez_hospedagens_nao_viram_dez_hoteis(self):
        total = self.por_local[("Turismo", "D2")]
        hoteis = self.por_local[("Turismo", "D3")]
        self.assertEqual(total["valor"], "10")
        self.assertEqual(hoteis["valor"], "3")
        self.assertIsNone(total["categoria_codigo"])
        self.assertEqual(self.catalogos["categorias"][hoteis["categoria_codigo"]]["nome"], "Hotel")

    def test_serie_e_acumulado_de_patentes_nao_sao_mesma_observacao(self):
        anual = self.por_local[("Pesquisa e inovação", "D3")]
        acumulado = self.por_local[("Pesquisa e inovação", "D2")]
        self.assertEqual(anual["valor"], "5")
        self.assertEqual(acumulado["valor"], "72")
        self.assertNotEqual(anual["id"], acumulado["id"])
        self.assertEqual(anual["id"], self.por_local[("Patentes por ano", "AB2")]["id"])

    def test_repeticoes_entre_temas_reutilizam_observacao(self):
        self.assertEqual(self.por_local[("Dados gerais", "D33")]["id"], self.por_local[("Vale da Eletrônica", "D3")]["id"])
        self.assertEqual(self.por_local[("Dados gerais", "D3")]["id"], self.por_local[("Pesquisa e inovação", "D32")]["id"])

    def test_meses_citados_sao_categorias_de_questionario(self):
        janeiro = self.por_local[("Turismo", "D39")]
        self.assertEqual(janeiro["referencia"]["tipo"], "anual")
        self.assertIsNone(janeiro["referencia"]["mes"])
        self.assertEqual(self.catalogos["categorias"][janeiro["categoria_codigo"]]["nome"], "Janeiro")

    def test_empreendimentos_ativos_consolidados(self):
        self.assertEqual(self.por_local[("Turismo", "D69")]["valor"], "116")
        self.assertEqual(self.por_local[("Turismo", "D11")]["valor"], "251")

    def test_fontes_diferentes_nao_se_sobrescrevem(self):
        mapa = self.por_local[("Dados gerais", "D26")]
        ambiente = self.por_local[("Dados gerais", "D46")]
        self.assertEqual(mapa["valor"], "5818")
        self.assertEqual(ambiente["valor"], "5879")
        self.assertNotEqual(mapa["fonte_codigo"], ambiente["fonte_codigo"])

    def test_sem_cnae_inventado_e_sem_ponto_flutuante(self):
        self.assertTrue(all(r["codigo_cnae"] is None and isinstance(r["valor"], str) for r in self.registros))
        exemplo = self.por_local[("Pesquisa e inovação", "D68")]
        self.assertGreater(len(exemplo["valor"].split(".")[1]), 4)
        self.assertEqual(Decimal(exemplo["valor"]), Decimal("0.0246093269349083"))

    def test_conferencia_das_36_series(self):
        self.assertEqual(len(self.manifesto["conferencia_series"]), 36)
        self.assertTrue(all(r["confere"] for r in self.manifesto["conferencia_series"]))

    def test_pacote_alterado_e_recusado(self):
        with tempfile.TemporaryDirectory() as tmp:
            destino = Path(tmp)
            for nome in ("manifesto.json", *self.manifesto["arquivos_sha256"]):
                (destino / nome).write_bytes((PACOTE / nome).read_bytes())
            with (destino / "observacoes.jsonl").open("ab") as arquivo:
                arquivo.write(b"\n")
            with self.assertRaisesRegex(ValueError, "Arquivo alterado"):
                carregar_pacote(destino)

    def test_validador_rejeita_decimal_float_e_percentual_fora_da_escala(self):
        registro = deepcopy(self.por_local[("Vale da Eletrônica", "D4")])
        registro["valor"] = 21.8
        with self.assertRaisesRegex(ValueError, "texto"):
            validar_observacao(registro, self.catalogos)
        registro["valor"] = "101"
        with self.assertRaisesRegex(ValueError, "escala"):
            validar_observacao(registro, self.catalogos)


class CargaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifesto, cls.catalogos, cls.registros = carregar_pacote(PACOTE)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.caminho = Path(self.tmp.name) / "ensaio.sqlite3"
        self.db = abrir_ensaio(self.caminho)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def carregar(self, registros=None, catalogos=None):
        self.db.execute("BEGIN")
        try:
            resultado = aplicar(self.db, "sqlite", self.manifesto, catalogos or self.catalogos, registros or self.registros)
            self.db.commit()
            return resultado
        except Exception:
            self.db.rollback()
            raise

    def test_reexecucao_reutiliza_todos_os_dados(self):
        primeira = self.carregar()
        segunda = self.carregar()
        self.assertEqual(primeira["observacoes_criadas"], len(self.registros))
        self.assertEqual(segunda["observacoes_criadas"], 0)
        self.assertEqual(segunda["observacoes_reutilizadas"], len(self.registros))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM cargas_m6").fetchone()[0], 1)

    def test_conflito_nao_sobrescreve_correcao_existente(self):
        self.carregar()
        original = self.db.execute("SELECT valor FROM observacoes_m6 WHERE id = ?", (self.registros[-1]["id"],)).fetchone()[0]
        alterados = deepcopy(self.registros)
        alterados[-1]["valor"] = "999999"
        with self.assertRaisesRegex(ValueError, "Conflito"):
            self.carregar(registros=alterados)
        preservado = self.db.execute("SELECT valor FROM observacoes_m6 WHERE id = ?", (self.registros[-1]["id"],)).fetchone()[0]
        self.assertEqual(original, preservado)

    def test_falha_no_final_reverte_insercoes_anteriores(self):
        ultimo = self.registros[-1]
        self.db.execute("INSERT INTO observacoes_m6 VALUES (?, ?, ?, 'rascunho', 0)", (ultimo["id"], "999999", json.dumps(ultimo)))
        self.db.commit()
        with self.assertRaisesRegex(ValueError, "Conflito"):
            self.carregar()
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM observacoes_m6").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM catalogos_m6").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM cargas_m6").fetchone()[0], 0)

    def test_dados_permanecem_apos_reabrir_o_ensaio(self):
        self.carregar()
        self.db.close()
        self.db = abrir_ensaio(self.caminho)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM observacoes_m6").fetchone()[0], len(self.registros))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM observacoes_m6 WHERE status <> 'rascunho' OR demonstracao <> 0").fetchone()[0], 0)

    def test_banco_antigo_nao_recebe_tabelas_automaticamente(self):
        outro = sqlite3.connect(":memory:")
        try:
            with self.assertRaisesRegex(ValueError, "Aguardar a migração V5"):
                validar_banco(outro, "sqlite")
            self.assertEqual(outro.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0], 0)
        finally:
            outro.close()

    def test_ensaio_recusa_sqlite_de_outra_aplicacao(self):
        caminho = Path(self.tmp.name) / "outro.sqlite3"
        outro = sqlite3.connect(caminho)
        outro.execute("CREATE TABLE importante (nome TEXT)")
        outro.execute("INSERT INTO importante VALUES ('Cristiano Ronaldo')")
        outro.commit()
        outro.close()
        with self.assertRaisesRegex(ValueError, "não pertence"):
            abrir_ensaio(caminho)
        outro = sqlite3.connect(caminho)
        try:
            self.assertEqual(outro.execute("SELECT nome FROM importante").fetchone()[0], "Cristiano Ronaldo")
        finally:
            outro.close()


if __name__ == "__main__":
    unittest.main()
