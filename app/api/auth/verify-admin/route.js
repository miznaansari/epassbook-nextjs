import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing admin session token' }, { status: 400 });
    }

    const session = await db.adminSession.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Admin session invalid or expired' }, { status: 401 });
    }

    return NextResponse.json({ valid: true, admin: session.admin });
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
