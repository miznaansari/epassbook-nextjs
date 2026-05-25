import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onesignalId, subscriptionId, timezone } = await req.json();

    const data = {
      oneSignalId: onesignalId || null,
      oneSignalSubId: subscriptionId || null,
    };
    if (timezone) {
      data.timezone = timezone;
    }

    // Update user record with OneSignal IDs using authenticated user id
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data,
    });

    console.log(`[OneSignal Sync] Updated user ${user.id} with OneSignalId: ${onesignalId}, SubscriptionId: ${subscriptionId}, Timezone: ${timezone}`);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating OneSignal details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
