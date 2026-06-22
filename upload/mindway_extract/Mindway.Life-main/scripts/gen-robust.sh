#!/usr/bin/env bash
# Robust avatar generator - runs in background
# Uses z-ai CLI directly for each philosopher
# Logs progress to avatar-progress.log

AVATAR_DIR="/home/z/my-project/public/avatars"
DATA_FILE="/home/z/my-project/prisma/seed-data-120.json"
PROGRESS_LOG="/home/z/my-project/scripts/avatar-progress.log"

mkdir -p "$AVATAR_DIR"

# Get list of slugs that need avatars
NEED_GENERATION=$(node -e "
const data = require('$DATA_FILE');
const fs = require('fs');
const existing = new Set(fs.readdirSync('$AVATAR_DIR').filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
const missing = data.filter(p => !existing.has(p.slug));
missing.forEach(p => console.log(p.slug + '|||' + p.nameEn + '|||' + p.era));
")

TOTAL=$(echo "$NEED_GENERATION" | wc -l)
echo "[$(date)] Starting generation of $TOTAL avatars" > "$PROGRESS_LOG"

COUNT=0
SUCCESS=0
FAIL=0

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

while IFS='|||' read -r slug nameEn era; do
  COUNT=$((COUNT + 1))
  OUTPUT_PATH="$AVATAR_DIR/${slug}.png"
  
  # Double-check file doesn't exist
  if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
    echo "[$COUNT/$TOTAL] ⏭ $nameEn already exists" >> "$PROGRESS_LOG"
    continue
  fi
  
  ERA_EN=$(era_to_english "$era")
  PROMPT="Portrait of $nameEn, $ERA_EN philosopher, classical art style, bust portrait, dark background, philosophical atmosphere, oil painting style, high quality, detailed"
  
  echo "[$COUNT/$TOTAL] 🎨 $nameEn ($slug)..." >> "$PROGRESS_LOG"
  
  GENERATED=false
  for attempt in 1 2; do
    if z-ai image -p "$PROMPT" -o "$OUTPUT_PATH" -s 1024x1024 >> "$PROGRESS_LOG" 2>&1; then
      if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
        SIZE=$(du -k "$OUTPUT_PATH" | cut -f1)
        echo "  ✅ ${slug}.png (${SIZE}KB)" >> "$PROGRESS_LOG"
        SUCCESS=$((SUCCESS + 1))
        GENERATED=true
        break
      fi
    fi
    echo "  ❌ Attempt $attempt failed" >> "$PROGRESS_LOG"
    sleep 5
  done
  
  if [ "$GENERATED" = false ]; then
    FAIL=$((FAIL + 1))
    echo "  ⚠️ Failed: $slug" >> "$PROGRESS_LOG"
  fi
  
  # Small delay between images
  sleep 2
  
  # Every 5 images, write a status line
  if [ $((COUNT % 5)) -eq 0 ]; then
    echo "--- Progress: $COUNT/$TOTAL (✅$SUCCESS ❌$FAIL) ---" >> "$PROGRESS_LOG"
  fi
  
done <<< "$NEED_GENERATION"

echo "" >> "$PROGRESS_LOG"
echo "[$(date)] COMPLETE! Success: $SUCCESS, Failed: $FAIL out of $TOTAL" >> "$PROGRESS_LOG"
