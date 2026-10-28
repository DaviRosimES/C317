"""Leitura dos valores e fórmulas armazenados no XLSX, sem recalcular o arquivo."""

from dataclasses import dataclass
from pathlib import Path
import posixpath
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


@dataclass(frozen=True)
class Celula:
    valor: str | None
    numerica: bool = False
    formula: str | None = None


def coluna(numero: int) -> str:
    resultado = ""
    while numero:
        numero, resto = divmod(numero - 1, 26)
        resultado = chr(65 + resto) + resultado
    return resultado


def numero_coluna(nome: str) -> int:
    resultado = 0
    for caractere in nome:
        resultado = resultado * 26 + ord(caractere) - 64
    return resultado


def ler_xlsx(caminho: Path) -> dict[str, dict[str, Celula]]:
    with ZipFile(caminho) as arquivo:
        strings = []
        if "xl/sharedStrings.xml" in arquivo.namelist():
            raiz = ET.fromstring(arquivo.read("xl/sharedStrings.xml"))
            strings = ["".join(t.itertext()) for t in raiz.findall("s:si", NS)]
        relacoes = ET.fromstring(arquivo.read("xl/_rels/workbook.xml.rels"))
        destinos = {r.attrib["Id"]: r.attrib["Target"] for r in relacoes}
        workbook = ET.fromstring(arquivo.read("xl/workbook.xml"))
        abas = {}
        for aba in workbook.findall("s:sheets/s:sheet", NS):
            destino = destinos[aba.attrib[REL]]
            destino = destino.lstrip("/") if destino.startswith("/") else posixpath.normpath("xl/" + destino)
            raiz = ET.fromstring(arquivo.read(destino))
            celulas = {}
            for c in raiz.findall("s:sheetData/s:row/s:c", NS):
                tipo = c.attrib.get("t", "n")
                valor = c.findtext("s:v", default=None, namespaces=NS)
                formula = c.find("s:f", NS)
                if formula is not None and formula.attrib.get("t") == "shared":
                    raise ValueError("Fórmula compartilhada não suportada: revisar a nova versão da origem.")
                if tipo == "s" and valor is not None:
                    valor = strings[int(valor)]
                elif tipo == "inlineStr":
                    valor = "".join(t.text or "" for t in c.findall("s:is//s:t", NS))
                elif tipo == "e":
                    raise ValueError(f"Erro de fórmula na origem: {aba.attrib['name']}!{c.attrib['r']}: {valor}")
                celulas[c.attrib["r"]] = Celula(valor, tipo == "n" and valor is not None, formula.text if formula is not None else None)
            abas[aba.attrib["name"]] = celulas
        return abas


PADRAO_REF = re.compile(r"(?:(?:'((?:[^']|'')+)'|([A-Za-z_][\w .-]*))!)?(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?")


def referencias(formula: str, aba_atual: str) -> list[tuple[str, str]]:
    resultado = []
    for m in PADRAO_REF.finditer(formula):
        aba = (m[1] or m[2] or aba_atual).replace("''", "'")
        inicio = m[3].replace("$", "")
        fim = (m[4] or m[3]).replace("$", "")
        a = re.fullmatch(r"([A-Z]+)(\d+)", inicio)
        b = re.fullmatch(r"([A-Z]+)(\d+)", fim)
        if int(b[2]) - int(a[2]) > 10000:
            raise ValueError("Intervalo de fórmula excessivo: revisar origem.")
        for linha in range(int(a[2]), int(b[2]) + 1):
            for col in range(numero_coluna(a[1]), numero_coluna(b[1]) + 1):
                resultado.append((aba, f"{coluna(col)}{linha}"))
    return resultado
