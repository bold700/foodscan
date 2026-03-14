#!/bin/bash
# Verwijder node_modules uit Git zodat push naar GitHub lukt (bestand te groot).
# Run in Terminal: cd /Users/kennytimmer/Documents/GitHub/foodscan && bash fix-git-push.sh

set -e
cd "$(dirname "$0")"

echo "→ Laatste commit terugdraaien (wijzigingen blijven staan)..."
git reset --soft HEAD~1 2>/dev/null || true

echo "→ node_modules uit Git halen (blijft lokaal staan)..."
git rm -r --cached node_modules 2>/dev/null || true

echo "→ Alles opnieuw stagen (node_modules wordt door .gitignore genegeerd)..."
git add -A
git status

echo "→ Committen..."
git commit -m "foodscan Next.js app (zonder node_modules)"

echo ""
echo "Klaar. Open GitHub Desktop en klik op Push origin."
echo "Of in Terminal: git push origin main"
