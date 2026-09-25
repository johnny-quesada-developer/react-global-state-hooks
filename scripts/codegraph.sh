#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cgc_bin="${CGC_BIN:-$HOME/.local/share/codegraphcontext/venv/bin/cgc}"
if [ ! -x "$cgc_bin" ]; then
  echo "CodeGraphContext executable not found at $cgc_bin. Install CodeGraphContext or set CGC_BIN to its executable." >&2
  exit 1
fi
repo_key=$(printf '%s' "$repo_root" | shasum -a 256 | cut -c1-12)
cd "$repo_root"
exec "$cgc_bin" --database falkordb --path "$HOME/.local/share/codegraphcontext/graphs/$repo_key/graph.db" "$@"
