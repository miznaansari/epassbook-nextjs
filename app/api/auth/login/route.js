import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPasswordSetupEmail } from '@/lib/email';

export async function POST(req) {
  try {
    const { email, password, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Missing email address' }, { status: 400 });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Find user by email
    let user = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    const origin = req.headers.get('origin') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    // Case 1: User does not exist - Auto-register them (with password if provided, else null)
    if (!user) {
      const generatedId = `custom_${crypto.randomUUID()}`;
      user = await db.user.create({
        data: {
          id: generatedId,
          email: sanitizedEmail,
          name: name || sanitizedEmail.split('@')[0],
          salaryCycleDate: 1,
          password: password || null,
        },
      });
    }

    // Case 2: User exists but has no password set (password is null)
    if (!user.password) {
      const resetToken = crypto.randomUUID();
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires,
        },
      });

      // Send password setup email
      const emailSent = await sendPasswordSetupEmail(user.email, user.name, resetToken, origin);

      return NextResponse.json({
        error: 'Password not set. We have sent an email to set your password.',
        passwordNotSet: true,
        emailSent,
      }, { status: 200 });
    }

    // Case 3: User exists and has a password
    // If the client didn't supply a password (just checking status), return unauthorized or tell them
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Verify password (plain text check for consistency with admin login)
    if (user.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Authentication Success - Create new session in DB
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      user,
      sessionToken: token,
    });

    // Set HTTP-only cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
