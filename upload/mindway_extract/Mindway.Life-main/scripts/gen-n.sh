#!/usr/bin/env bash
# Generate exactly N missing philosopher avatars
# Usage: bash scripts/gen-n.sh [COUNT]
# Default COUNT=3

AVATAR_DIR="/home/z/my-project/public/avatars"
DATA_FILE="/home/z/my-project/prisma/seed-data-120.json"
COUNT=${1:-3}

mkdir -p "$AVATAR_DIR"

era_to_english() {
  case "$1" in
    古典) echo "Ancient Greek/Roman" ;;
    中世纪) echo "Medieval" ;;
    近代) echo "Early Modern" ;;
    当代) echo "Modern/Contemporary" ;;
    主理人) echo "Modern" ;;
    *) echo "$1" ;;
  esac
}

# Get first N philosophers that need avatars - use TAB as delimiter
PHILOSOPHERS=$(node -e "
const data = require('$DATA_FILE');
const fs = require('fs');
const existing = new Set(fs.readdirSync('$AVATAR_DIR').filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
const missing = data.filter(p => !existing.has(p.slug));
const count = Math.min($COUNT, missing.length);
missing.slice(0, count).forEach(p => console.log(p.slug + '\t' + p.nameEn + '\t' + p.era));
")

GENERATED=0

while IFS=$'\t' read -r slug nameEn era; do
  OUTPUT_PATH="$AVATAR_DIR/${slug}.png"
  ERA_EN=$(era_to_english "$era")
  PROMPT="Portrait of $nameEn, $ERA_EN philosopher, classical art style, bust portrait, dark background, philosophical atmosphere, oil painting style, high quality, detailed"
  
  echo "🎨 $nameEn ($slug)..."
  
  for attempt in 1 2; do
    if z-ai image -p "$PROMPT" -o "$OUTPUT_PATH" -s 1024x1024 2>&1; then
      if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
        SIZE=$(du -k "$OUTPUT_PATH" | cut -f1)
        echo "✅ ${slug}.png (${SIZE}KB)"
        GENERATED=$((GENERATED + 1))
        break
      fi
    fi
    echo "❌ Attempt $attempt failed"
    sleep 3
  done
  
  sleep 1
done <<< "$PHILOSOPHERS"

echo "Generated $GENERATED avatars. Total now: $(ls $AVATAR_DIR/*.png 2>/dev/null | wc -l)"
