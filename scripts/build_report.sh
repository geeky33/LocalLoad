#!/usr/bin/env bash
# Builds docs/report/output/report.docx from the Markdown sections in docs/report/.
#
#   scripts/build_report.sh
#
# Steps: 1) regenerate code-derived sections  2) render diagrams/*.mmd to PNG
#        3) build the Word style template      4) pandoc -> report.docx
# Any failing step stops the build with a non-zero exit code.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT="$ROOT/docs/report"
OUT="$REPORT/output"
TOOLS="$ROOT/scripts/report"

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
trap 'die "build failed at line $LINENO (see the message above)"' ERR

# ---------------------------------------------------------------- tools
step "Checking tools"
command -v node >/dev/null || die "Node.js not found. Install Node.js 20+."
command -v python3 >/dev/null || die "python3 not found."
command -v pandoc >/dev/null || die "pandoc not found. Install it: sudo apt install pandoc  (or see docs/report/README.md)"
if [[ -x "$TOOLS/node_modules/.bin/mmdc" ]]; then
  MMDC="$TOOLS/node_modules/.bin/mmdc"
elif command -v mmdc >/dev/null; then
  MMDC="$(command -v mmdc)"
else
  die "mermaid-cli not found. Run: npm --prefix scripts/report install"
fi
echo "pandoc: $(pandoc --version | head -1)"
echo "mmdc:   $("$MMDC" --version)"

# Use an installed Chrome/Chromium for mermaid-cli when available (no extra browser download needed).
PUPPETEER_CFG="$(mktemp --suffix=.json)"
trap 'rm -f "$PUPPETEER_CFG"' EXIT
CHROME="${PUPPETEER_EXECUTABLE_PATH:-}"
if [[ -z "$CHROME" ]]; then
  for c in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$c" >/dev/null; then CHROME="$(command -v "$c")"; break; fi
  done
fi
if [[ -n "$CHROME" ]]; then
  printf '{"executablePath":"%s","args":["--no-sandbox"]}' "$CHROME" > "$PUPPETEER_CFG"
  echo "chrome: $CHROME"
else
  printf '{"args":["--no-sandbox"]}' > "$PUPPETEER_CFG"
  echo "chrome: (puppeteer's bundled browser)"
fi

# ---------------------------------------------------------------- 1. generate
step "1/4 Regenerating code-derived sections"
node "$TOOLS/generate.mjs"

# ---------------------------------------------------------------- 2. diagrams
step "2/4 Rendering Mermaid diagrams"
mkdir -p "$REPORT/diagrams/png"
shopt -s nullglob
diagrams=("$REPORT"/diagrams/*.mmd)
(( ${#diagrams[@]} > 0 )) || die "no diagrams found in docs/report/diagrams/"
for mmd in "${diagrams[@]}"; do
  name="$(basename "$mmd" .mmd)"
  "$MMDC" -q -i "$mmd" -o "$REPORT/diagrams/png/$name.png" -b white -s 2 -t neutral -p "$PUPPETEER_CFG" \
    || die "mermaid-cli failed on diagrams/$name.mmd"
  echo "  diagrams/png/$name.png"
done

# Every image referenced from the sections must exist.
while IFS= read -r img; do
  [[ -f "$REPORT/$img" ]] || die "missing image referenced in the report: $img"
done < <(grep -ohE '\]\((diagrams/[^)]+\.png)\)' "$REPORT"/[0-9][0-9]-*.md | sed -E 's/^\]\(|\)$//g')

# ---------------------------------------------------------------- 3. style template
step "3/4 Building the Word style template"
python3 "$TOOLS/make_reference_docx.py" "$REPORT/reference.docx"

# ---------------------------------------------------------------- 4. pandoc
step "4/4 Combining sections into report.docx"
sections=("$REPORT"/[0-9][0-9]-*.md)
(( ${#sections[@]} == 14 )) || die "expected 14 section files (01-...md to 14-...md), found ${#sections[@]}"

# Build settings are read from metadata.yaml so it is the single source of truth.
setting() { grep -E "^$1:" "$REPORT/metadata.yaml" | head -1 | sed -E "s/^$1:[[:space:]]*//; s/[\"']//g"; }
flags=()
[[ "$(setting toc)" == "true" ]] && flags+=(--toc "--toc-depth=$(setting toc-depth || echo 2)")
# Numbering is done by a Lua filter (works on pandoc 2.9+, which ignores --number-sections for .docx).
[[ "$(setting number-sections)" == "true" ]] && flags+=(--lua-filter="$TOOLS/number-headings.lua")

mkdir -p "$OUT"
pandoc \
  --from markdown \
  --metadata-file="$REPORT/metadata.yaml" \
  --metadata date="$(date '+%d %B %Y')" \
  --resource-path="$REPORT" \
  --reference-doc="$REPORT/reference.docx" \
  "${flags[@]}" \
  --fail-if-warnings \
  -o "$OUT/report.docx" \
  "${sections[@]}"

[[ -s "$OUT/report.docx" ]] || die "pandoc did not produce report.docx"
python3 "$TOOLS/finalize_docx.py" "$OUT/report.docx"
step "Done: docs/report/output/report.docx ($(du -h "$OUT/report.docx" | cut -f1))"
echo "Open it in Word and press 'Yes' when asked to update fields, so the table of contents gets page numbers."
