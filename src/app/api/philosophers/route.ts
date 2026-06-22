import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Minimal fields for grid display - detail loaded via /api/philosophers/[slug]
    const philosophers = await db.philosopher.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        nameCn: true,
        nameEn: true,
        slug: true,
        era: true,
        category: true,
        avatarUrl: true,
        tagline: true,
        isHost: true,
      },
    })
    return NextResponse.json(philosophers)
  } catch (error) {
    console.error('Failed to fetch philosophers:', error)
    return NextResponse.json({ error: 'Failed to fetch philosophers' }, { status: 500 })
  }
}
