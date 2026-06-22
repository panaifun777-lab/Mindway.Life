import { db } from '../src/lib/db';
import data from './seed-data-120.json';

async function main() {
  console.log('Seeding philosophers...');

  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.philosopher.deleteMany();

  for (const p of data) {
    await db.philosopher.create({
      data: {
        nameCn: p.nameCn,
        nameEn: p.nameEn,
        slug: p.slug,
        era: p.era,
        category: p.category,
        avatarUrl: p.avatarUrl || '',
        tagline: p.tagline,
        bioSummary: p.bioSummary,
        coreInsight: p.coreInsight,
        worries: p.worries,
        works: p.works,
        recommendedBooks: p.recommendedBooks || '',
        quote: p.quote,
        quoteSource: p.quoteSource || '',
        systemPrompt: p.systemPrompt,
        order: p.order,
        isHost: (p as any).isHost || false,
        published: true,
      },
    });
    console.log(`  + ${p.nameCn} (${p.nameEn})${(p as any).isHost ? ' ★ 主理人' : ''}`);
  }

  console.log(`\nSeeded ${data.length} philosophers!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
