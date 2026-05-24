import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // 1. Auto-seeding check: if admin table is empty, seed master account
    const adminCount = await db.admin.count();
    if (adminCount === 0) {
      await db.admin.create({
        data: {
          email: 'admin@monthlymoney.com',
          password: 'admin123',
          name: 'Master Admin',
        },
      });
    }

    // 2. Find administrative record
    const admin = await db.admin.findUnique({
      where: { email },
    });

    if (!admin || admin.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 3. Establish secure administrative session
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.adminSession.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });

    // Set cookie
    response.cookies.set('admin_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('Error in /api/admin/login:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
