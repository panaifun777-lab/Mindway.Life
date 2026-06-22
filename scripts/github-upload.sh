#!/bin/bash
set -e

# === Mindway.Life GitHub Upload Script ===
# Usage: GITHUB_TOKEN=xxx bash scripts/github-upload.sh

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN not set"
  echo "Usage: GITHUB_TOKEN=xxx bash scripts/github-upload.sh"
  exit 1
fi

REPO="panaifun777-lab/Mindway.Life"
BRANCH="main"
PROJECT_DIR="/home/z/my-project"

cd "$PROJECT_DIR"

git config user.name "Mindway Bot"
git config user.email "mindway@bot.local"
git branch -m main 2>/dev/null || true

# Set remote
git remote remove origin 2>/dev/null || true
git remote add origin "https://panaifun777-lab:${GITHUB_TOKEN}@github.com/${REPO}.git"

# Add and commit
git add -A
git commit --no-verify -m "Update - $(date '+%Y-%m-%d %H:%M')" || echo "Nothing to commit"

# Push
git push -u origin "$BRANCH" --force

echo "=== Upload Complete ==="
echo "https://github.com/${REPO}"
