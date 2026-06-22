/**
 * Update philosopher avatar URLs in the database
 * Reads all avatar files from /public/avatars/ and updates matching philosopher records
 * 
 * Usage: npx tsx scripts/update-avatar-db.ts
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const AVATAR_DIR = path.resolve(__dirname, '../public/avatars');
const DATA_PATH = path.resolve(__dirname, '../prisma/seed-data-120.json');

interface PhilosopherData {
  slug: string;
  nameEn: string;
  nameCn: string;
}

async function main() {
  console.log('📝 Updating avatar URLs in database...\n');

  const db = new PrismaClient();

  try {
    // Read philosopher data
    const philosophers: PhilosopherData[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    // Get list of existing avatar files
    const avatarFiles = fs.existsSync(AVATAR_DIR)
      ? fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.png'))
      : [];
    
    const avatarSlugs = new Set(avatarFiles.map(f => f.replace('.png', '')));
    
    console.log(`  Found ${avatarSlugs.size} avatar files`);
    console.log(`  Checking ${philosophers.length} philosophers\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const philosopher of philosophers) {
      if (avatarSlugs.has(philosopher.slug)) {
        const avatarUrl = `/avatars/${philosopher.slug}.png`;
        
        // Verify the file is not empty
        const filePath = path.join(AVATAR_DIR, `${philosopher.slug}.png`);
        const stats = fs.statSync(filePath);
        
        if (stats.size > 0) {
          await db.philosopher.updateMany({
            where: { slug: philosopher.slug },
            data: { avatarUrl }
          });
          console.log(`  ✅ ${philosopher.nameEn} → ${avatarUrl}`);
          updatedCount++;
        } else {
          console.log(`  ⚠️  ${philosopher.nameEn} - avatar file is empty, skipping`);
          skippedCount++;
        }
      } else {
        console.log(`  ⏭  ${philosopher.nameEn} - no avatar file`);
        skippedCount++;
      }
    }

    console.log(`\n============================================`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`============================================`);
  } catch (error: any) {
    console.error('Database update error:', error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
