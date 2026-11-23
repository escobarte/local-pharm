"""Step 1 of the AMDM import: dump the raw cells of the registry .xls to JSON.

Only reads the file; all cleaning happens in build-csv.ts (step 2), which shares
the search normalization with the app. Run through scripts/amdm/build.sh.

Usage: python3 -I xls_to_json.py <xlrd.whl> <input.xls> <output.json>
"""

import json
import sys

EXPECTED_HEADER = [
    "Nr. d/o",
    "Codul medicamentului",
    "Denumirea comercială",
    "Forma farmaceutică",
    "Doza, concentraţia",
    "Volum",
    "Divizarea",
    "Deținător al CÎM",
    "Ţara",
    "Firma producătoare",
    "Numărul de înregistrare",
    "Data înregistrării",
    "Codul ATC",
    "Denumirea comună internaţională",
    "Termenul de valabilitate",
    "Codul cu bare",
    "Tip cerere",
    "Data expirării CÎM",
    "Presciptie",
    "Tip medicament",
]


def cell(value):
    """Numbers come as floats (24722.0); keep integers without '.0'."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return value if isinstance(value, str) else str(value)


def main():
    wheel, src, dst = sys.argv[1:4]
    sys.path.insert(0, wheel)
    import xlrd  # noqa: E402 (pure-Python wheel added to sys.path above)

    sheet = xlrd.open_workbook(src).sheet_by_index(0)
    header = [str(v).strip() for v in sheet.row_values(0)]
    if header != EXPECTED_HEADER:
        sys.exit(f"Unexpected header, the export format changed:\n{header}")

    # Row 1 is a service row numbering the columns 0..19 — skip it.
    numbering = [cell(v) for v in sheet.row_values(1)]
    if numbering[2:] != [str(i) for i in range(2, 20)]:
        sys.exit(f"Row 2 is not the column numbering row: {numbering}")

    rows = [[cell(v) for v in sheet.row_values(r)] for r in range(2, sheet.nrows)]
    with open(dst, "w", encoding="utf-8") as f:
        json.dump({"header": header, "rows": rows}, f, ensure_ascii=False)
    print(f"xls: {len(rows)} data rows -> {dst}")


if __name__ == "__main__":
    main()
