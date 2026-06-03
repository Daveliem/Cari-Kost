import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { role } = await request.json();
    const userId = request.nextUrl.searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!['user', 'owner', 'landlord', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    await stmt.run(role, parseInt(userId));

    return NextResponse.json({ message: 'Role updated' });
  } catch (error) {
    console.error('PUT /api/update-user-role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}