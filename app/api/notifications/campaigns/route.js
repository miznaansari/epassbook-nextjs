import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// GET: Fetch all active (non-soft-deleted) notification campaigns for the logged-in user
export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await db.notificationCampaign.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error in /api/notifications/campaigns GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new notification campaign
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, frequency, time, isActive } = await req.json();

    if (!title || !message || !frequency) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'SIX_MONTHS'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency option' }, { status: 400 });
    }

    // Validate time format (HH:MM)
    let targetTime = '12:00';
    if (time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return NextResponse.json({ error: 'Invalid time format. Use HH:MM (e.g. 14:30)' }, { status: 400 });
      }
      targetTime = time;
    }

    const campaign = await db.notificationCampaign.create({
      data: {
        userId: user.id,
        title,
        message,
        frequency,
        time: targetTime,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error in /api/notifications/campaigns POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
