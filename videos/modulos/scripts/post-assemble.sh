#!/usr/bin/env bash
# Post-process after captions.mjs + assemble-index.mjs (rerun after either):
#  - GSAP from the vendored copy (the CDN is unreachable from the build env)
#  - mark the captions clip as the caption track (lint caption_track_kind_missing)
#  - caption highlight in the app's indigo, not the logo's violet/cyan
set -euo pipefail
cd "$(dirname "$0")/.."
sed -i 's#<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"[^>]*>#<script src="assets/vendor/gsap.min.js">#' index.html compositions/captions.html
grep -q 'data-track-kind="captions"' index.html || sed -i 's|id="el-captions"|id="el-captions" data-track-kind="captions"|' index.html
sed -i 's|--cap-accent: #A21CF0;|--cap-accent: #5856D6;|; s|--cap-accent-2: #2DD4EF;|--cap-accent-2: #7D7AFF;|' compositions/captions.html
