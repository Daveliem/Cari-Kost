import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get('listingId');

  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  }

  try {
    const reviews = db.prepare('SELECT * FROM reviews WHERE listing_id = ? ORDER BY created_at DESC').all(listingId);
    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { listingId, rating, comment } = await request.json();

    // Get user name/email from users table when available
    const u: any = db.prepare('SELECT name, email FROM users WHERE id = ?').get(user.id);
    const reviewer_name = u?.name || user.email || '';
    const reviewer_email = u?.email || user.email || '';

    const stmt = db.prepare('INSERT INTO reviews (listing_id, rating, comment, user_id, reviewer_name, reviewer_email) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(listingId, rating, comment, user.id, reviewer_name, reviewer_email);

    return NextResponse.json({ message: 'Review added', id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}