#!/usr/bin/env bash
# Kanvault paylaşım kitini üretir (Google Chrome headless gerekir):
#   1) Uygulama ekran görüntüleri (npm run dev açıkken, http://localhost:1420) → docs/screenshots
#   2) X / LinkedIn görselleri → marketing/images
#   3) LinkedIn PDF karuseli (TR + EN) → marketing/linkedin-carousel-{tr,en}.pdf
# Kullanım: bash marketing/render.sh [--no-shots]
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT
APP="http://localhost:1420"

chrome() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" --allow-file-access-from-files "$@" >/dev/null 2>&1; }

if [[ "${1:-}" != "--no-shots" ]]; then
  for lang in tr en; do
    for v in overview board history dashboards ai settings about; do
      chrome --lang=$lang --accept-lang=$lang --window-size=1600,1000 --force-device-scale-factor=2 --virtual-time-budget=7000 \
        --screenshot="docs/screenshots/$v-$lang.png" "$APP/?view=$v&shot=1"
    done
    for th in neon whiteboard chalkboard blueprint executive; do
      chrome --lang=$lang --accept-lang=$lang --window-size=1600,1000 --force-device-scale-factor=2 --virtual-time-budget=7000 \
        --screenshot="docs/screenshots/dash-$th-$lang.png" "$APP/?view=dashboards&theme=$th&shot=1"
    done
  done
  cp docs/screenshots/board-en.png docs/screenshots/board.png
  echo "screenshots ok"
fi

CARD="file://$PWD/marketing/templates/card.html"
for lang in tr en; do
  chrome --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=4000 --screenshot="$PWD/marketing/images/x-$lang.png" "$CARD?lang=$lang&format=x&shot=board"
  chrome --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=4000 --screenshot="$PWD/marketing/images/x-dashboard-$lang.png" "$CARD?lang=$lang&format=x&shot=dash-whiteboard"
  chrome --force-device-scale-factor=1 --window-size=1600,900 --virtual-time-budget=4000 --screenshot="$PWD/marketing/images/x-history-$lang.png" "$CARD?lang=$lang&format=x&shot=history"
  chrome --force-device-scale-factor=1 --window-size=1200,627 --virtual-time-budget=4000 --screenshot="$PWD/marketing/images/linkedin-$lang.png" "$CARD?lang=$lang&format=li&shot=board"
  chrome --force-device-scale-factor=1 --window-size=1080,1080 --virtual-time-budget=4000 --screenshot="$PWD/marketing/images/linkedin-square-$lang.png" "$CARD?lang=$lang&format=sq&shot=overview"
  chrome --virtual-time-budget=6000 --no-pdf-header-footer --print-to-pdf="$PWD/marketing/linkedin-carousel-$lang.pdf" "file://$PWD/marketing/templates/carousel.html?lang=$lang"
done
rm -f marketing/images/x-overview-*.png
echo "marketing ok"
