import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req) {
  try {
    const adminToken = req.cookies.get('admin_session_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.adminSession.findUnique({
      where: { token: adminToken },
    });
    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { salaries: true, financialEntries: true },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error in /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
