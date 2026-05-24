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

    // Gather Aggregated Statistics
    const usersCount = await db.user.count();
    const activeUserSessions = await db.userSession.count({
      where: { expiresAt: { gt: new Date() } }
    });
    const salariesCount = await db.salary.count();
    const entriesCount = await db.financialEntry.count();
    
    // Get recent notifications log
    const recentBroadcasts = await db.notificationBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      usersCount,
      activeUserSessions,
      salariesCount,
      entriesCount,
      recentBroadcasts,
    });
  } catch (error) {
    console.error('Error in /api/admin/dashboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
