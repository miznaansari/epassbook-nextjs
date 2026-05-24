import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Sync/Create user upon authentication
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in /api/user POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update user configurations (e.g., salary cycle date, name, currency, notification preferences)
export async function PUT(req) {
  try {
    const { 
      uid, 
      name, 
      salaryCycleDate, 
      currency, 
      dailyReminderTime, 
      notifSalary, 
      notifDaily, 
      notifCycle 
    } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

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
