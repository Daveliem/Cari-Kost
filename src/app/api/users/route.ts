import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === '1';
    const sql = includeDeleted ? 'SELECT id, name, email, role, deleted_at FROM users' : 'SELECT id, name, email, role, deleted_at FROM users WHERE deleted_at IS NULL';
    const users = await db.prepare(sql).all() as any[];
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = verifyToken(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, action } = body as { id?: number, action?: string };
    if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

    if (action === 'restore') {
      await db.prepare('UPDATE users SET deleted_at = NULL WHERE id = ?').run(id);
      try {
        const details = JSON.stringify({ user_id: id });
        await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
          .run('restore', 'user', id, user.id, details);
      } catch (e) {
        console.error('Audit log insert failed', e);
      }
      return NextResponse.json({ message: 'User restored' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('PUT /api/users error:', error);
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

    const existing: any = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.prepare('UPDATE users SET deleted_at = NOW() WHERE id = ?').run(id);

    // audit log
    try {
      const details = JSON.stringify({ email: existing.email, name: existing.name, reason: reason || null });
      await db.prepare('INSERT INTO audit_logs (action, object_type, object_id, user_id, details) VALUES (?, ?, ?, ?, ?)')
        .run('delete', 'user', id, user.id, details);
    } catch (e) {
      console.error('Audit log insert failed', e);
    }

    return NextResponse.json({ message: 'User soft-deleted' });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}