import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;
    const adminToken = req.cookies.get('admin_session_token')?.value;

    if (sessionToken) {
      try {
        await db.userSession.deleteMany({
          where: { token: sessionToken },
        });
      } catch (e) {
        console.error('Error deleting user session during logout:', e);
      }
    }

    if (adminToken) {
      try {
        await db.adminSession.deleteMany({
          where: { token: adminToken },
        });
      } catch (e) {
        console.error('Error deleting admin session during logout:', e);
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear cookies
    response.cookies.set('session_token', '', { expires: new Date(0), path: '/' });
    response.cookies.set('admin_session_token', '', { expires: new Date(0), path: '/' });

    return response;
  } catch (error) {
    console.error('Error in logout route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
