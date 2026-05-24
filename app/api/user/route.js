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

// PUT: Update user configurations (e.g., salary cycle date, name)
export async function PUT(req) {
  try {
    const { uid, name, salaryCycleDate } = await req.json();

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
