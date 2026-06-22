#!/usr/bin/env bash
# Generate philosopher avatars - simple inline version
# Process philosophers one at a time using z-ai CLI
# Usage: bash scripts/gen-batch.sh [START_INDEX] [COUNT]
# Example: bash scripts/gen-batch.sh 16 8  (process philosophers 16-23)

AVATAR_DIR="/home/z/my-project/public/avatars"
DATA_FILE="/home/z/my-project/prisma/seed-data-120.json"

mkdir -p "$AVATAR_DIR"

START=${1:-1}
COUNT=${2:-8}

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

# Get the list of philosophers to process (1-indexed start, count items)
PHILOSOPHERS=$(node -e "
const data = require('$DATA_FILE');
const start = $START - 1;  // Convert to 0-indexed
const count = $COUNT;
const list = data.slice(start, start + count);
list.forEach(p => console.log(p.slug + '|' + p.nameEn + '|' + p.era));
")

echo "Processing $COUNT philosophers starting from index $START"
echo ""

while IFS='|' read -r slug nameEn era; do
  OUTPUT_PATH="$AVATAR_DIR/${slug}.png"
  
  # Skip if already exists
  if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
    echo "⏭ Skipping $nameEn ($slug) - already exists"
    continue
  fi
  
  ERA_EN=$(era_to_english "$era")
  PROMPT="Portrait of $nameEn, $ERA_EN philosopher, classical art style, bust portrait, dark background, philosophical atmosphere, oil painting style, high quality, detailed"
  
  echo "🎨 Generating $nameEn ($slug)..."
  
  # Try up to 2 times
  for attempt in 1 2; do
    if z-ai image -p "$PROMPT" -o "$OUTPUT_PATH" -s 1024x1024 2>&1; then
      if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
        SIZE=$(du -k "$OUTPUT_PATH" | cut -f1)
        echo "✅ ${slug}.png (${SIZE}KB)"
        break
      fi
    fi
    echo "❌ Attempt $attempt failed"
    if [ $attempt -lt 2 ]; then
      sleep 3
    fi
  done
  
  sleep 1
done <<< "$PHILOSOPHERS"

echo ""
echo "Batch complete!"
