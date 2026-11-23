#!/usr/bin/env bash
# AMDM registry: .xls export → data-tmp/amdm_registry.csv (+ SQL upsert files).
#
#   bash scripts/amdm/build.sh [path/to/nomenclator-medicamente.xls]
#
# Needs: python3 (no pip/venv), node 22, curl. Reads the .xls with xlrd 2.0.1,
# a pure-Python wheel downloaded once into data-tmp/vendor/ and checked by
# SHA-256 (nothing is installed). Everything it writes stays in data-tmp/,
# which is git-ignored: the registry data does not go into the public repo.
# Owner steps: docs/SETUP-SUPABASE.md, section 7.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/data-tmp"
XLS="${1:-$OUT/nomenclator-medicamente.xls}"

WHEEL_NAME="xlrd-2.0.1-py2.py3-none-any.whl"
WHEEL_URL="https://files.pythonhosted.org/packages/a6/0c/c2a72d51fe56e08a08acc85d13013558a2d793028ae7385448a6ccdfae64/$WHEEL_NAME"
WHEEL_SHA256="6a33ee89877bd9abc1158129f6e94be74e2679636b8a205b43b85206c3f0bbdd"
WHEEL="$OUT/vendor/$WHEEL_NAME"

[ -f "$XLS" ] || { echo "No such file: $XLS" >&2; exit 1; }
mkdir -p "$OUT/vendor"
if [ ! -f "$WHEEL" ]; then
  curl -fsSL -o "$WHEEL" "$WHEEL_URL"
fi
echo "$WHEEL_SHA256  $WHEEL" | sha256sum -c --quiet - || { rm -f "$WHEEL"; echo "xlrd checksum mismatch" >&2; exit 1; }

python3 -I "$ROOT/scripts/amdm/xls_to_json.py" "$WHEEL" "$XLS" "$OUT/amdm_raw.json"
node "$ROOT/scripts/amdm/build-csv.ts" "$OUT/amdm_raw.json" "$OUT"
