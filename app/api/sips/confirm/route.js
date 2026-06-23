import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sipId, date } = await req.json();

    if (!sipId || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const sip = await db.sip.findUnique({
      where: { id: parseInt(sipId) }
    });

    if (!sip) {
      return NextResponse.json({ error: 'SIP not found' }, { status: 404 });
    }

    if (sip.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create the savings entry
    const entry = await db.financialEntry.create({
      data: {
        userId: user.id,
        amount: sip.amount,
        title: sip.title,
        type: 'SAVINGS',
        date: new Date(date),
        description: `SIP Payment: ${sip.title} (${sip.frequency.toLowerCase()})`
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error in /api/sips/confirm POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
