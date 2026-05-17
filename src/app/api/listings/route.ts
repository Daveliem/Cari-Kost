import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, price, location, latitude, longitude, room_type, amenities, images, contact } = await request.json();
    const imagePayload = images ? JSON.stringify(images) : JSON.stringify([]);

    const stmt = db.prepare(`
      INSERT INTO listings (title, description, price, location, latitude, longitude, room_type, amenities, images, contact, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt.run(title, description, price, location, latitude, longitude, room_type, amenities, imagePayload, contact, user.id);

    return NextResponse.json({ message: 'Listing created', id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const amenitiesParam = searchParams.get('amenities');
  const amenitiesMode = (searchParams.get('amenitiesMode') || 'and').toLowerCase();
  const roomType = searchParams.get('roomType');
  const amenities = amenitiesParam ? amenitiesParam.split(',').map(s => s.trim()).filter(Boolean) : [];

  let query = `
    SELECT l.*,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
      COUNT(r.id) AS review_count
    FROM listings AS l
    LEFT JOIN reviews AS r ON r.listing_id = l.id
    WHERE 1=1`;
  const params: any[] = [];

  if (location) {
    query += ' AND l.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (priceMin) {
    query += ' AND l.price >= ?';
    params.push(priceMin);
  }
  if (priceMax) {
    query += ' AND l.price <= ?';
    params.push(priceMax);
  }
  if (amenities.length > 0) {
    if (amenitiesMode === 'or') {
      query += ' AND (' + amenities.map(() => 'LOWER(l.amenities) LIKE ?').join(' OR ') + ')';
      for (const am of amenities) params.push(`%${am.toLowerCase()}%`);
    } else {
      // require ALL selected amenities to be present (AND)
      for (const am of amenities) {
        query += ' AND LOWER(l.amenities) LIKE ?';
        params.push(`%${am.toLowerCase()}%`);
      }
    }
  }
  if (roomType) {
    query += ' AND l.room_type = ?';
    params.push(roomType);
  }

  query += ' GROUP BY l.id';

  try {
    const listings = await db.prepare(query).all(...params);
    const parsedListings = listings.map((listing: any) => ({
      ...listing,
      images: typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : listing.images || []
    }));
    return NextResponse.json(parsedListings);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}