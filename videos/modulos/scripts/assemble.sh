#!/usr/bin/env bash
# Assemble one module video: scripts/assemble.sh <slug> <9x16|16x9>
# Writes index.html (+ compositions/captions.html) for that video; lint/check/
# snapshot/render then run on index.html. Deterministic, so re-run it before
# re-rendering any module (scripts/render-all.sh does all 18).
set -euo pipefail
cd "$(dirname "$0")/.."
slug=$1; fmt=$2; id="$slug-$fmt"
P=$(ls -d ~/.claude/plugins/cache/hyperframes/hyperframes/*/skills | tail -1)
hf() { node "$P/hyperframes/scripts/plugin-cli.mjs" --script "$P/product-launch-video/scripts/$1" "${@:2}"; }
hf captions.mjs build --storyboard "storyboards/$id.md" --audio-meta ".hyperframes/captions/$slug.json" \
  --hyperframes . --out ".hyperframes/caption_groups.json" >/dev/null
hf assemble-index.mjs --storyboard "storyboards/$id.md" --audio-meta "audio-meta/$slug.json" --hyperframes . >/dev/null
./scripts/post-assemble.sh
hf transitions.mjs inject --storyboard "storyboards/$id.md" --hyperframes . >/dev/null
hf transitions.mjs verify --storyboard "storyboards/$id.md" --hyperframes . | tail -1
