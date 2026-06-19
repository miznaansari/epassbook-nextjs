import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let tokenVal = body.token;

    if (!tokenVal) {
      tokenVal = req.cookies.get('session_token')?.value;
    }

    if (!tokenVal) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 400 });
    }

    const session = await db.userSession.findUnique({
      where: { token: tokenVal },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Session invalid or expired' }, { status: 401 });
    }

    return NextResponse.json({ valid: true, user: session.user });
  } catch (error) {
    console.error('Error verifying user session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
