#!/usr/bin/env bash
# Generate philosopher avatars using z-ai CLI
# Usage: bash scripts/generate-avatars.sh [LIMIT]
# Runs in background; logs to scripts/avatar-generation.log

set -euo pipefail

AVATAR_DIR="/home/z/my-project/public/avatars"
DATA_FILE="/home/z/my-project/prisma/seed-data-120.json"
LOG_FILE="/home/z/my-project/scripts/avatar-generation.log"
BATCH_SIZE=5
DELAY_BETWEEN_BATCHES=3
DELAY_BETWEEN_IMAGES=1

mkdir -p "$AVATAR_DIR"

# Era mapping
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

# Parse JSON using node - extract slug, nameEn, era
PHILOSOPHERS=$(node -e "
const data = require('$DATA_FILE');
const limit = parseInt('${1:-0}') || 0;
const list = limit > 0 ? data.slice(0, limit) : data;
list.forEach(p => console.log(p.slug + '|' + p.nameEn + '|' + p.era));
")

TOTAL=$(echo "$PHILOSOPHERS" | wc -l)
echo "============================================" | tee "$LOG_FILE"
echo "  Philosopher Avatar Generator (Bash)" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"
echo "  Total to process: $TOTAL" | tee -a "$LOG_FILE"
echo "  Output dir: $AVATAR_DIR" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

SUCCESS=0
FAIL=0
SKIPPED=0
COUNT=0
FAILED_SLUGS=""

while IFS='|' read -r slug nameEn era; do
  COUNT=$((COUNT + 1))
  OUTPUT_PATH="$AVATAR_DIR/${slug}.png"
  
  # Skip if already exists and non-empty
  if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
    echo "[$COUNT/$TOTAL] ⏭  Skipping $nameEn ($slug) - already exists" | tee -a "$LOG_FILE"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  ERA_EN=$(era_to_english "$era")
  PROMPT="Portrait of $nameEn, $ERA_EN philosopher, classical art style, bust portrait, dark background, philosophical atmosphere, oil painting style, high quality, detailed"
  
  echo "[$COUNT/$TOTAL] 🎨 Generating $nameEn ($slug)..." | tee -a "$LOG_FILE"
  echo "  Prompt: $PROMPT" | tee -a "$LOG_FILE"
  
  RETRY=0
  MAX_RETRIES=2
  GENERATED=false
  
  while [ $RETRY -lt $MAX_RETRIES ]; do
    RETRY=$((RETRY + 1))
    if z-ai image -p "$PROMPT" -o "$OUTPUT_PATH" -s 1024x1024 >> "$LOG_FILE" 2>&1; then
      if [ -f "$OUTPUT_PATH" ] && [ -s "$OUTPUT_PATH" ]; then
        SIZE=$(du -k "$OUTPUT_PATH" | cut -f1)
        echo "  ✅ Success: ${slug}.png (${SIZE}KB, attempt $RETRY)" | tee -a "$LOG_FILE"
        SUCCESS=$((SUCCESS + 1))
        GENERATED=true
        break
      fi
    fi
    echo "  ❌ Attempt $RETRY failed for $nameEn" | tee -a "$LOG_FILE"
    if [ $RETRY -lt $MAX_RETRIES ]; then
      sleep $((RETRY * 3))
    fi
  done
  
  if [ "$GENERATED" = false ]; then
    FAIL=$((FAIL + 1))
    FAILED_SLUGS="$FAILED_SLUGS $slug"
    echo "  ⚠️  All attempts failed for $nameEn" | tee -a "$LOG_FILE"
  fi
  
  # Delay between images
  sleep $DELAY_BETWEEN_IMAGES
  
  # Batch delay
  if [ $((COUNT % BATCH_SIZE)) -eq 0 ] && [ $COUNT -lt $TOTAL ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "⏳ Batch pause (${DELAY_BETWEEN_BATCHES}s)..." | tee -a "$LOG_FILE"
    sleep $DELAY_BETWEEN_BATCHES
  fi
  
done <<< "$PHILOSOPHERS"

echo "" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"
echo "  Generation Complete" | tee -a "$LOG_FILE"
echo "============================================" | tee -a "$LOG_FILE"
echo "  ✅ Generated: $SUCCESS" | tee -a "$LOG_FILE"
echo "  ⏭  Skipped:   $SKIPPED" | tee -a "$LOG_FILE"
echo "  ❌ Failed:    $FAIL" | tee -a "$LOG_FILE"
if [ -n "$FAILED_SLUGS" ]; then
  echo "  Failed slugs:$FAILED_SLUGS" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"
echo "Now run: npx tsx scripts/update-avatar-db.ts" | tee -a "$LOG_FILE"
