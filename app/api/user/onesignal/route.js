import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onesignalId, oneSignalId: altOneSignalId, subscriptionId, timezone } = await req.json();

    const targetOneSignalId = onesignalId || altOneSignalId;
    const data = {};

    if (targetOneSignalId && typeof targetOneSignalId === 'string' && targetOneSignalId.trim() !== '') {
      data.oneSignalId = targetOneSignalId;
    }

    if (subscriptionId && typeof subscriptionId === 'string' && subscriptionId.trim() !== '') {
      data.oneSignalSubId = subscriptionId;
    }

    if (timezone && typeof timezone === 'string' && timezone.trim() !== '') {
      data.timezone = timezone;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, message: 'No valid OneSignal fields to update' });
    }

    // Update user record with OneSignal IDs using authenticated user id
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data,
    });

    console.log(`[OneSignal Sync] Updated user ${user.id} with data:`, data);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating OneSignal details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

