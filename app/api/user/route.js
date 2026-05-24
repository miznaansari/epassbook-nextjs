import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// POST: Sync/Create user upon authentication and establish secure UserSession
export async function POST(req) {
  try {
    const { uid, email, name } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    let user = await db.user.findUnique({
      where: { id: uid },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: uid,
          email,
          name: name || email.split('@')[0],
          salaryCycleDate: 1, // Default cycle start on 1st of month
        },
      });
    }

    // Session Management: Check if a valid session cookie already exists for this user
    const existingToken = req.cookies.get('session_token')?.value;
    let sessionIsValid = false;

    if (existingToken) {
      const activeSession = await db.userSession.findUnique({
        where: { token: existingToken },
      });
      if (activeSession && activeSession.userId === uid && activeSession.expiresAt > new Date()) {
        sessionIsValid = true;
      }
    }

    const response = NextResponse.json(user);

    if (!sessionIsValid) {
      // Create new session in DB
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.userSession.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      });
    }

    return response;
  } catch (error) {
    console.error('Error in /api/user POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update user configurations (e.g., salary cycle date, name, currency, notification preferences)
export async function PUT(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      name, 
      salaryCycleDate, 
      currency, 
      dailyReminderTime, 
      notifSalary, 
      notifDaily, 
      notifCycle 
    } = await req.json();

    const uid = user.id;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    
    if (salaryCycleDate !== undefined) {
      const cycleDate = parseInt(salaryCycleDate);
      if (cycleDate >= 1 && cycleDate <= 31) {
        updateData.salaryCycleDate = cycleDate;
      } else {
        return NextResponse.json({ error: 'Salary cycle date must be between 1 and 31' }, { status: 400 });
      }
    }

    if (currency !== undefined) {
      if (currency === 'USD' || currency === 'INR') {
        updateData.currency = currency;
      } else {
        return NextResponse.json({ error: 'Invalid currency preference' }, { status: 400 });
      }
    }

    if (dailyReminderTime !== undefined) {
      // Basic HH:MM verification
      const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timeRegex.test(dailyReminderTime)) {
        updateData.dailyReminderTime = dailyReminderTime;
      } else {
        return NextResponse.json({ error: 'Invalid daily reminder time (must be HH:MM format)' }, { status: 400 });
      }
    }

    if (notifSalary !== undefined) updateData.notifSalary = !!notifSalary;
    if (notifDaily !== undefined) updateData.notifDaily = !!notifDaily;
    if (notifCycle !== undefined) updateData.notifCycle = !!notifCycle;

    const updatedUser = await db.user.update({
      where: { id: uid },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error in /api/user PUT:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
