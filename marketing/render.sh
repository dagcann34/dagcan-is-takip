#!/usr/bin/env bash
# Sosyal medya görsellerini Google Chrome (headless) ile üretir.
# Kullanım: bash marketing/render.sh   (önce `npm run dev` ile ekran görüntüleri güncellenebilir)
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"
TEMPLATE="file://$PWD/templates/card.html"

render() { # dosya genişlik yükseklik parametreler
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" \
    --allow-file-access-from-files --force-device-scale-factor=1 \
    --window-size="$2,$3" --virtual-time-budget=4000 \
    --screenshot="$PWD/images/$1" "$TEMPLATE?$4" >/dev/null 2>&1
  echo "images/$1"
}

for lang in tr en; do
  render "x-${lang}.png"             1600 900  "lang=$lang&format=x&shot=board"
  render "x-overview-${lang}.png"    1600 900  "lang=$lang&format=x&shot=overview"
  render "linkedin-${lang}.png"      1200 627  "lang=$lang&format=li&shot=board"
  render "linkedin-square-${lang}.png" 1080 1080 "lang=$lang&format=sq&shot=overview"
done
rm -rf "$PROFILE"
