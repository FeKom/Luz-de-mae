"""Extract fetal death (SIM) and live birth (SINASC) tables from DATASUS TabNet.

TabNet has no API: each table is an HTML form POST. Sending `formato=prn`
makes it return the table as semicolon-separated text inside the HTML page,
which we parse and save as tidy CSV (row, column, value).

Usage:
    python data/scripts/extract_tabnet.py [--first-year 2015] [--last-year 2024]
"""

from __future__ import annotations

import argparse
import csv
import html
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

# HTTPS on tabnet.datasus.gov.br times out; plain HTTP works.
BASE_URL = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe"
NOT_ACTIVE = "--Não-Ativa--"
OUT_DIR = Path(__file__).resolve().parent.parent / "raw"


@dataclass(frozen=True)
class Source:
    def_path: str
    file_prefix: str
    increment: str


@dataclass(frozen=True)
class Query:
    name: str
    source: Source
    row: str
    column: str = NOT_ACTIVE


@dataclass(frozen=True)
class Cell:
    row: str
    column: str
    value: int


SIM_FETAL = Source("sim/cnv/fet10uf.def", "fetuf", "Óbitos_p/Residênc")
SINASC = Source("sinasc/cnv/nvuf.def", "nvuf", "Nascim_p/resid.mãe")

QUERIES: list[Query] = [
    # SIM: where and when fetal deaths happen
    Query("obitos_fetais_uf_ano", SIM_FETAL, "Unidade_da_Federação", "Ano_do_Óbito"),
    Query("obitos_fetais_causa_ano", SIM_FETAL, "Lista_Mort_CID-10", "Ano_do_Óbito"),
    Query(
        "obitos_fetais_cid_categoria_ano", SIM_FETAL, "Categoria_CID-10", "Ano_do_Óbito"
    ),
    Query("obitos_fetais_causa_regiao", SIM_FETAL, "Lista_Mort_CID-10", "Região"),
    # SIM: profile of the pregnancy and the mother
    Query(
        "obitos_fetais_relacao_parto_uf",
        SIM_FETAL,
        "Unidade_da_Federação",
        "Óbito_relação_parto",
    ),
    Query(
        "obitos_fetais_duracao_gestacao_ano",
        SIM_FETAL,
        "Duração_gestação",
        "Ano_do_Óbito",
    ),
    Query("obitos_fetais_idade_mae_ano", SIM_FETAL, "Idade_mãe", "Ano_do_Óbito"),
    Query(
        "obitos_fetais_escolaridade_mae_ano",
        SIM_FETAL,
        "Escolaridade_mãe",
        "Ano_do_Óbito",
    ),
    Query("obitos_fetais_cor_raca_ano", SIM_FETAL, "Cor/raça", "Ano_do_Óbito"),
    Query("obitos_fetais_peso_ano", SIM_FETAL, "Peso_ao_nascer", "Ano_do_Óbito"),
    # SIM: surveillance quality
    Query(
        "obitos_fetais_investigacao_uf",
        SIM_FETAL,
        "Unidade_da_Federação",
        "Óbito_investigado",
    ),
    # SINASC: denominator for rates and prenatal adherence
    Query("nascidos_vivos_uf_ano", SINASC, "Unidade_da_Federação", "Ano_do_nascimento"),
    Query(
        "nascidos_consultas_prenatal_uf",
        SINASC,
        "Unidade_da_Federação",
        "Consult_pré-natal",
    ),
    Query(
        "nascidos_consultas_prenatal_ano",
        SINASC,
        "Consult_pré-natal",
        "Ano_do_nascimento",
    ),
    Query(
        "nascidos_adequacao_prenatal_uf",
        SINASC,
        "Unidade_da_Federação",
        "Adeq_quant_pré-natal*",
    ),
    Query("nascidos_consultas_x_peso", SINASC, "Consult_pré-natal", "Peso_ao_nascer"),
    Query(
        "nascidos_consultas_x_duracao", SINASC, "Consult_pré-natal", "Duração_gestação"
    ),
    Query(
        "nascidos_consultas_x_apgar5", SINASC, "Consult_pré-natal", "Apgar_5º_minuto"
    ),
]


def build_form(query: Query, years: list[int]) -> bytes:
    fields: list[tuple[str, str]] = [
        ("Linha", query.row),
        ("Coluna", query.column),
        ("Incremento", query.source.increment),
    ]
    fields += [
        ("Arquivos", f"{query.source.file_prefix}{y % 100:02d}.dbf") for y in years
    ]
    fields += [("formato", "prn"), ("mostre", "Mostra")]
    # The CGI expects the form encoded as Latin-1, like the browser page.
    return urllib.parse.urlencode(fields, encoding="latin-1").encode("ascii")


def fetch(query: Query, years: list[int], *, timeout: float = 180.0) -> str:
    url = f"{BASE_URL}?{query.source.def_path}"
    request = urllib.request.Request(
        url, data=build_form(query, years), headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw: bytes = response.read()
    return raw.decode("latin-1")


def parse_number(text: str) -> int:
    # "-" means a true zero in TabNet's legend.
    cleaned = text.strip().replace(".", "")
    return 0 if cleaned in {"-", ""} else int(cleaned)


def parse_prn(page: str) -> list[Cell]:
    text = html.unescape(re.sub(r"<[^>]+>", "", page))
    lines = [ln.strip() for ln in text.splitlines() if ln.strip().startswith('"')]
    if not lines:
        msg = "no table found in TabNet response"
        raise ValueError(msg)
    reader = csv.reader(lines, delimiter=";", quotechar='"')
    header, *body = list(reader)
    columns = header[1:] if len(header) > 1 else ["Total"]
    return [
        Cell(row=values[0], column=column, value=parse_number(raw))
        for values in body
        for column, raw in zip(columns, values[1:], strict=True)
    ]


def write_csv(cells: list[Cell], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["linha", "coluna", "valor"])
        writer.writerows((c.row, c.column, c.value) for c in cells)


def run(queries: list[Query], years: list[int], out_dir: Path) -> None:
    for query in queries:
        cells = parse_prn(fetch(query, years))
        write_csv(cells, out_dir / f"{query.name}.csv")
        print(f"{query.name}: {len(cells)} células")
        time.sleep(1.0)  # be polite with a fragile public server


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first-year", type=int, default=2015)
    parser.add_argument("--last-year", type=int, default=2024)
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    years = list(range(args.first_year, args.last_year + 1))
    run(QUERIES, years, args.out)


if __name__ == "__main__":
    main()
