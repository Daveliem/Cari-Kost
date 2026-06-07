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
    const reviews = await db.prepare('SELECT * FROM reviews WHERE listing_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(listingId);
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
    const u: any = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(user.id);
    const reviewer_name = u?.name || user.email || '';
    const reviewer_email = u?.email || user.email || '';

    const stmt = db.prepare('INSERT INTO reviews (listing_id, rating, comment, user_id, reviewer_name, reviewer_email) VALUES (?, ?, ?, ?, ?, ?)');
    const result = await stmt.run(listingId, rating, comment, user.id, reviewer_name, reviewer_email);

    return NextResponse.json({ message: 'Review added', id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, reason } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const existing: any = await db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    await db.prepare('UPDATE reviews SET deleted_at = NOW() WHERE id = ?').run(id);

    try {
      const details = JSON.stringify({ listing_id: existing.listing_id, rating: existing.rating, reason: reason || null });
      await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
        .run('delete', 'review', id, user.id, details);
    } catch (e) {
      console.error('Audit log insert failed', e);
    }

    return NextResponse.json({ message: 'Review soft-deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, action } = await request.json();
    if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

    if (action === 'restore') {
      await db.prepare('UPDATE reviews SET deleted_at = NULL WHERE id = ?').run(id);
      try {
        const details = JSON.stringify({ review_id: id });
        await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
          .run('restore', 'review', id, user.id, details);
      } catch (e) {
        console.error('Audit log insert failed', e);
      }
      return NextResponse.json({ message: 'Review restored' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('PUT /api/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}