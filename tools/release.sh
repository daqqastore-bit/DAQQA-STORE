#!/usr/bin/env bash
# Stamp a new site version before pushing: busts cached css/js and tells open pages to reload themselves.
set -euo pipefail
cd "$(dirname "$0")/.."
v=$(date -u +%Y%m%d%H%M%S)
sed -i -E "s/\?v=[0-9A-Za-z]+/?v=$v/g" *.html
sed -i -E "s/^RC\.build = .*/RC.build = '$v';/" assets/config.js
grep -q "^RC.build" assets/config.js || echo "RC.build = '$v';" >> assets/config.js
printf '{"v":"%s"}\n' "$v" > version.json
echo "version $v"
