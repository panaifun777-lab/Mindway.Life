import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');

async function generateAvatar(zai: any, nameCn: string, nameEn: string, slug: string, era: string): Promise<string | null> {
  const outputPath = path.join(AVATAR_DIR, `${slug}.png`);
  
  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  ⊙ ${nameCn} - avatar already exists`);
    return `/avatars/${slug}.png`;
  }

  const eraStyle = era === '古典' ? 'ancient classical style' : 
                   era === '中世纪' ? 'medieval European style' :
                   era === '近代' ? 'Renaissance era style' :
                   era === '当代' ? 'modern portrait style' :
                   'contemporary style';

  const prompt = `Portrait of a wise thinker from ${eraStyle}, classical oil painting, dark moody background, dramatic lighting, high quality, detailed, centered composition, thoughtful expression`;

  try {
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`  ✓ ${nameCn} - avatar generated`);
    return `/avatars/${slug}.png`;
  } catch (error: any) {
    console.error(`  ✗ ${nameCn} - failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
  
  // Ensure avatar directory exists
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }

  const philosophers = await db.philosopher.findMany({
    where: { isHost: false },
    orderBy: { order: 'asc' },
    select: { id: true, nameCn: true, nameEn: true, slug: true, era: true, avatarUrl: true },
  });

  const toProcess = limit > 0 ? philosophers.slice(0, limit) : philosophers;
  console.log(`Generating avatars for ${toProcess.length} philosophers...`);

  const zai = await ZAI.create();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of 3
  for (let i = 0; i < toProcess.length; i += 3) {
    const batch = toProcess.slice(i, i + 3);
    const promises = batch.map(async (p) => {
      const avatarPath = await generateAvatar(zai, p.nameCn, p.nameEn, p.slug, p.era);
      if (avatarPath) {
        // Update database
        await db.philosopher.update({
          where: { id: p.id },
          data: { avatarUrl: avatarPath },
        });
        generated++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limits
    if (i + 3 < toProcess.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\nAvatar generation complete:`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);

  await db.$disconnect();
}

main().catch(console.error);
