import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile: any = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const listingCount = Number((db.prepare('SELECT COUNT(*) AS count FROM listings WHERE user_id = ?').get(user.id) as { count: number } | undefined)?.count ?? 0);
    const favoriteCount = Number((db.prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?').get(user.id) as { count: number } | undefined)?.count ?? 0);
    const reviewCount = Number((db.prepare('SELECT COUNT(*) AS count FROM reviews WHERE user_id = ?').get(user.id) as { count: number } | undefined)?.count ?? 0);

    return NextResponse.json({
      ...profile,
      listingCount,
      favoriteCount,
      reviewCount,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
