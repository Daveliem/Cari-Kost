import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const listing: any = await db.prepare(`
      SELECT l.*,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
        COUNT(r.id) AS review_count
      FROM listings AS l
      LEFT JOIN reviews AS r ON r.listing_id = l.id AND r.deleted_at IS NULL
      WHERE l.id = ? AND l.deleted_at IS NULL
      GROUP BY l.id
    `).get(params.id);

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    const parsed = {
      ...listing,
      images: typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : listing.images || [],
      average_rating: listing.average_rating != null ? Number(listing.average_rating) : 0,
      review_count: listing.review_count != null ? Number(listing.review_count) : 0,
      latitude: listing.latitude != null ? Number(listing.latitude) : null,
      longitude: listing.longitude != null ? Number(listing.longitude) : null,
    };
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('GET /api/listings/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const { title, description, price, location, latitude, longitude, room_type, amenities, images, contact } = await request.json();
    const imagePayload = images ? JSON.stringify(images) : JSON.stringify([]);

    // Ensure the listing belongs to the user
    const existing: any = await db.prepare('SELECT * FROM listings WHERE id = ?').get(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stmt = db.prepare(`
      UPDATE listings SET title = ?, description = ?, price = ?, location = ?, latitude = ?, longitude = ?, room_type = ?, amenities = ?, images = ?, contact = ? WHERE id = ?
    `);
    await stmt.run(title, description, price, location, latitude, longitude, room_type, amenities, imagePayload, contact, params.id);

    return NextResponse.json({ message: 'Listing updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const existing: any = await db.prepare('SELECT * FROM listings WHERE id = ?').get(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    // Only admin can delete listings
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft-delete associated reviews and listing
    await db.prepare('UPDATE reviews SET deleted_at = NOW() WHERE listing_id = ?').run(params.id);
    await db.prepare('UPDATE listings SET deleted_at = NOW() WHERE id = ?').run(params.id);

    // Insert audit log
    try {
      const details = JSON.stringify({ title: existing.title, price: existing.price, location: existing.location });
      await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
        .run('delete', 'listing', params.id, user.id, details);
    } catch (e) {
      console.error('Audit log insert failed', e);
    }

    return NextResponse.json({ message: 'Listing soft-deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const params = await context.params;
    const body = await request.json();
    const { action } = body as { action?: string };
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

    if (action === 'restore') {
      const existing: any = await db.prepare('SELECT * FROM listings WHERE id = ?').get(params.id);
      if (!existing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

      await db.prepare('UPDATE listings SET deleted_at = NULL WHERE id = ?').run(params.id);
      await db.prepare('UPDATE reviews SET deleted_at = NULL WHERE listing_id = ?').run(params.id);

      try {
        const details = JSON.stringify({ title: existing.title, listing_id: params.id });
        await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
          .run('restore', 'listing', params.id, user.id, details);
      } catch (e) {
        console.error('Audit log insert failed', e);
      }

      return NextResponse.json({ message: 'Listing restored' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/listings/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}