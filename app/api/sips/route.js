import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

export async function GET(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sips = await db.sip.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch all savings transactions for this user once to filter in memory
    const savings = await db.financialEntry.findMany({
      where: {
        userId: user.id,
        type: 'SAVINGS'
      }
    });

    const enrichedSips = sips.map(sip => {
      const periods = [];
      const now = new Date();
      const amount = parseFloat(sip.amount);

      if (sip.frequency === 'MONTHLY') {
        // Generate last 6 months (current month and 5 preceding months)
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = d.getFullYear();
          const month = d.getMonth(); // 0-indexed

          // Get last day of this month
          const lastDay = new Date(year, month + 1, 0).getDate();
          const targetDay = Math.min(sip.dayOfMonth || 1, lastDay);
          
          // Set to target day of the month
          const targetDate = new Date(year, month, targetDay, 23, 59, 59, 999);

          // Find if there is a matching transaction in this month
          const isPaid = savings.some(entry => {
            const entryDate = new Date(entry.date);
            return (
              entry.title.toLowerCase() === sip.title.toLowerCase() &&
              entryDate.getFullYear() === year &&
              entryDate.getMonth() === month
            );
          });

          // Check if missed (unpaid and targetDate is in the past)
          let status = 'PENDING';
          if (isPaid) {
            status = 'PAID';
          } else if (targetDate < now) {
            status = 'MISSED'; // Missed (danger mark)
          }

          periods.push({
            label: `${String(month + 1).padStart(2, '0')}/${String(year).slice(-2)}`,
            targetDate: targetDate.toISOString(),
            status,
            isPaid
          });
        }
      } else if (sip.frequency === 'WEEKLY') {
        // Generate last 6 weeks (current week and 5 preceding weeks)
        // Get current Monday
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday);

        for (let i = 5; i >= 0; i--) {
          const monday = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          monday.setHours(0, 0, 0, 0);
          const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 999);

          // Get target date based on dayOfWeek (1 = Mon, ..., 7 = Sun)
          const offsetDays = (sip.dayOfWeek || 1) - 1;
          const targetDate = new Date(monday.getTime() + offsetDays * 24 * 60 * 60 * 1000);
          targetDate.setHours(23, 59, 59, 999);

          // Check if paid in this week
          const isPaid = savings.some(entry => {
            const entryDate = new Date(entry.date);
            return (
              entry.title.toLowerCase() === sip.title.toLowerCase() &&
              entryDate >= monday &&
              entryDate <= sunday
            );
          });

          let status = 'PENDING';
          if (isPaid) {
            status = 'PAID';
          } else if (targetDate < now) {
            status = 'MISSED'; // Missed (danger mark)
          }

          periods.push({
            label: `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
            targetDate: targetDate.toISOString(),
            status,
            isPaid
          });
        }
      }

      return {
        ...sip,
        amount,
        periods
      };
    });

    return NextResponse.json(enrichedSips);
  } catch (error) {
    console.error('Error in /api/sips GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, title, frequency, dayOfMonth, dayOfWeek, reminderTime } = await req.json();

    if (!amount || !title || !frequency) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid SIP amount' }, { status: 400 });
    }

    if (frequency !== 'MONTHLY' && frequency !== 'WEEKLY') {
      return NextResponse.json({ error: 'Frequency must be WEEKLY or MONTHLY' }, { status: 400 });
    }

    const data = {
      userId: user.id,
      amount: parsedAmount,
      title,
      frequency,
      reminderTime: reminderTime || '10:00',
    };

    if (frequency === 'MONTHLY') {
      const day = parseInt(dayOfMonth);
      if (isNaN(day) || day < 1 || day > 31) {
        return NextResponse.json({ error: 'Invalid day of month' }, { status: 400 });
      }
      data.dayOfMonth = day;
    } else {
      const day = parseInt(dayOfWeek);
      if (isNaN(day) || day < 1 || day > 7) {
        return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 });
      }
      data.dayOfWeek = day;
    }

    const newSip = await db.sip.create({ data });
    return NextResponse.json(newSip);
  } catch (error) {
    console.error('Error in /api/sips POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing SIP id' }, { status: 400 });
    }

    const sipId = parseInt(id);

    const existingSip = await db.sip.findUnique({
      where: { id: sipId }
    });

    if (!existingSip) {
      return NextResponse.json({ error: 'SIP not found' }, { status: 404 });
    }

    if (existingSip.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.sip.delete({
      where: { id: sipId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/sips DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
