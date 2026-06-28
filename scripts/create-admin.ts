/**
 * 创建超级管理员账号
 * 邮箱: piaoshu@mindway.life
 * 密码: Gai16999
 * 运行: bun run scripts/create-admin.ts
 */
import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('创建超级管理员账号...');

  const email = 'piaoshu@mindway.life';
  const password = 'Gai16999';
  const name = '飘叔(管理员)';
  const passwordHash = bcrypt.hashSync(password, 10);

  // 先检查是否已存在
  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // 更新为管理员
    await db.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: 'admin',
        plan: 'premium',
      },
    });
    console.log(`✅ 管理员账号已更新: ${email}`);
  } else {
    // 创建新管理员
    await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'admin',
        plan: 'premium',
        avatar: '/avatars/piao-shu.png',
      },
    });
    console.log(`✅ 管理员账号已创建: ${email}`);
  }

  console.log(`   姓名: ${name}`);
  console.log(`   密码: ${password}`);
  console.log(`   角色: admin`);
  console.log(`   套餐: premium`);
  console.log('');
  console.log('登录地址: https://mindway.life → 底部"管理"按钮');

  await db.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
