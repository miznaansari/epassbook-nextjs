import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
  try {
    const { userId, onesignalId, subscriptionId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Update user record with OneSignal IDs
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        oneSignalId: onesignalId || null,
        oneSignalSubId: subscriptionId || null,
      },
    });

    console.log(`[OneSignal Sync] Updated user ${userId} with OneSignalId: ${onesignalId}, SubscriptionId: ${subscriptionId}`);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating OneSignal details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
