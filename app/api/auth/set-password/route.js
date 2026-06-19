import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const { email, token, password } = await req.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Find user by email and resetToken
    const user = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user || user.resetToken !== token) {
      return NextResponse.json({ error: 'Invalid setup token or email' }, { status: 400 });
    }

    // Check expiration
    if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
      return NextResponse.json({ error: 'Setup token has expired. Please try logging in again to request a new link.' }, { status: 400 });
    }

    // Update password and clear reset fields
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        password,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Auto-login: Create new session in DB
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.userSession.create({
      data: {
        userId: updatedUser.id,
        token: sessionToken,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      sessionToken,
    });

    // Set cookie
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('Error in /api/auth/set-password:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
