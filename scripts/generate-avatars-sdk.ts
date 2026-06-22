/**
 * Generate AI avatars for philosophers using z-ai-web-dev-sdk (SDK mode)
 * This is faster than CLI mode because the SDK is initialized once.
 * 
 * Usage:
 *   npx tsx scripts/generate-avatars-sdk.ts --limit 10   # Test with first 10
 *   npx tsx scripts/generate-avatars-sdk.ts               # Generate all 120
 *   npx tsx scripts/generate-avatars-sdk.ts --start 30    # Start from philosopher #30
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// ---- Configuration ----
const AVATAR_DIR = path.resolve(__dirname, '../public/avatars');
const DATA_PATH = path.resolve(__dirname, '../prisma/seed-data-120.json');
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 2000;
const DELAY_BETWEEN_IMAGES_MS = 500;
const MAX_RETRIES = 2;

// Era mapping for prompts
const ERA_MAP: Record<string, string> = {
  '古典': 'Ancient Greek/Roman',
  '中世纪': 'Medieval',
  '近代': 'Early Modern',
  '当代': 'Modern/Contemporary',
  '主理人': 'Modern',
};

interface PhilosopherData {
  nameCn: string;
  nameEn: string;
  slug: string;
  era: string;
  [key: string]: any;
}

// ---- Utility Functions ----

function parseArgs(): { limit?: number; start?: number } {
  const args = process.argv.slice(2);
  const result: { limit?: number; start?: number } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--start' && args[i + 1]) {
      result.start = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPrompt(philosopher: PhilosopherData): string {
  const eraEn = ERA_MAP[philosopher.era] || philosopher.era;
  return `Portrait of ${philosopher.nameEn}, ${eraEn} philosopher, classical art style, bust portrait, dark background, philosophical atmosphere, oil painting style, high quality, detailed`;
}

// ---- Main Logic ----

async function main() {
  const { limit, start: startIndex } = parseArgs();
  
  console.log('============================================');
  console.log('  Philosopher Avatar Generator (SDK Mode)');
  console.log('============================================');
  console.log(`  Output directory: ${AVATAR_DIR}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Start from: ${startIndex || 1}`);
  console.log(`  Limit: ${limit || 'All remaining'}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }

  // Read philosopher data
  const allPhilosophers: PhilosopherData[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  
  // Apply start index
  let philosophers = startIndex ? allPhilosophers.slice(startIndex - 1) : allPhilosophers;
  
  // Apply limit
  if (limit) {
    philosophers = philosophers.slice(0, limit);
  }
  
  // Filter out philosophers that already have avatars
  const existingAvatars = new Set(
    fs.readdirSync(AVATAR_DIR)
      .filter(f => f.endsWith('.png'))
      .map(f => f.replace('.png', ''))
  );
  
  const needsAvatar = philosophers.filter(p => !existingAvatars.has(p.slug));
  
  console.log(`  Total philosophers: ${allPhilosophers.length}`);
  console.log(`  To process: ${philosophers.length}`);
  console.log(`  Already exist: ${philosophers.length - needsAvatar.length}`);
  console.log(`  Need to generate: ${needsAvatar.length}`);
  console.log('');

  if (needsAvatar.length === 0) {
    console.log('All avatars already exist!');
    return;
  }

  // Initialize SDK
  console.log('🚀 Initializing Z-AI SDK...');
  const zai = await ZAI.create();
  console.log('✅ SDK initialized\n');

  // Process in batches
  let successCount = 0;
  let failCount = 0;
  const failedSlugs: string[] = [];

  for (let i = 0; i < needsAvatar.length; i += BATCH_SIZE) {
    const batch = needsAvatar.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsAvatar.length / BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} philosophers)`);
    console.log('─'.repeat(50));

    for (const philosopher of batch) {
      const prompt = buildPrompt(philosopher);
      const outputPath = path.join(AVATAR_DIR, `${philosopher.slug}.png`);
      const idx = needsAvatar.indexOf(philosopher) + 1;
      
      console.log(`\n[${idx}/${needsAvatar.length}] 🎨 ${philosopher.nameEn} (${philosopher.nameCn}) [${philosopher.era}]`);
      console.log(`  Prompt: ${prompt}`);

      let generated = false;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await zai.images.generations.create({
            prompt: prompt,
            size: '1024x1024'
          });

          if (response.data && response.data[0] && response.data[0].base64) {
            const buffer = Buffer.from(response.data[0].base64, 'base64');
            fs.writeFileSync(outputPath, buffer);
            console.log(`  ✅ Success: ${philosopher.slug}.png (${(buffer.length / 1024).toFixed(1)} KB, attempt ${attempt})`);
            successCount++;
            generated = true;
            break;
          } else {
            console.log(`  ❌ Invalid response on attempt ${attempt}`);
          }
        } catch (error: any) {
          console.error(`  ❌ Attempt ${attempt} failed: ${error.message?.substring(0, 200)}`);
        }

        if (attempt < MAX_RETRIES) {
          console.log(`  Retrying in ${attempt * 2}s...`);
          await sleep(attempt * 2000);
        }
      }

      if (!generated) {
        failCount++;
        failedSlugs.push(philosopher.slug);
        console.log(`  ⚠️  Skipping ${philosopher.nameEn} after ${MAX_RETRIES} failed attempts`);
      }

      // Small delay between individual images
      if (i + needsAvatar.indexOf(philosopher) < needsAvatar.length - 1) {
        await sleep(DELAY_BETWEEN_IMAGES_MS);
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < needsAvatar.length) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log('\n============================================');
  console.log('  Generation Summary');
  console.log('============================================');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed:  ${failCount}`);
  if (failedSlugs.length > 0) {
    console.log(`  Failed slugs: ${failedSlugs.join(', ')}`);
  }
  console.log(`  Total avatars now: ${fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.png')).length}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
