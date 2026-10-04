#!/usr/bin/env bash
# Assemble, lint/check and render every module video in both formats.
# Output: renders/<slug>-<fmt>.mp4 ; per-video check summary in renders/checks.txt
set -uo pipefail
cd "$(dirname "$0")/.."
P=$(ls -d ~/.claude/plugins/cache/hyperframes/hyperframes/*/skills | tail -1)
hf() { node "$P/hyperframes/scripts/plugin-cli.mjs" "$@"; }
mkdir -p renders; : > renders/checks.txt
for slug in $(python3 -c "import json;print(' '.join(m['slug'] for m in json.load(open('modules.json'))['modules']))"); do
  for fmt in 9x16 16x9; do
    id="$slug-$fmt"
    ./scripts/assemble.sh "$slug" "$fmt" >/dev/null || { echo "$id ASSEMBLE FAILED" | tee -a renders/checks.txt; continue; }
    lint=$(hf lint 2>&1 | grep -E '[0-9]+ errors?, [0-9]+ warnings?' | tail -1)
    check=$(hf check 2>&1 | grep -E 'error\(s\)|Check (passed|failed)|⚠' | tr '\n' ' ')
    echo "$id | lint: $lint | check: $check" >> renders/checks.txt
    hf render --skill=product-launch-video --quality high --quiet --output "renders/$id.mp4" >/dev/null 2>&1 \
      && echo "$id rendered" || echo "$id RENDER FAILED"
  done
done
