import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req) {
  try {
    const adminToken = req.cookies.get('admin_session_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.adminSession.findUnique({
      where: { token: adminToken },
    });
    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const broadcasts = await db.notificationBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    return NextResponse.json(broadcasts);
  } catch (error) {
    console.error('Error in GET /api/admin/broadcast:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const adminToken = req.cookies.get('admin_session_token')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await db.adminSession.findUnique({
      where: { token: adminToken },
    });
    if (!session || session.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, target } = await req.json();

    if (!title || !body || !target) {
      return NextResponse.json({ error: 'Missing title, body, or target' }, { status: 400 });
    }

    let targetUserId = null;
    let targetDisplay = "ALL";

    if (target !== 'ALL') {
      const targetUser = await db.user.findUnique({
        where: { email: target },
      });
      if (!targetUser) {
        return NextResponse.json({ error: `User with email ${target} not found.` }, { status: 404 });
      }
      targetUserId = targetUser.id;
      targetDisplay = targetUser.email;
    }

    // 1. Save broadcast in MySQL database
    const broadcast = await db.notificationBroadcast.create({
      data: {
        title,
        body,
        target: targetDisplay,
        userId: targetUserId,
      },
    });

    // 2. Trigger OneSignal push notification
    try {
      const oneSignalAppId = "722dd7e4-705a-4a0e-a0b8-b4e2a3c93057";
      const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

      const payload = {
        app_id: oneSignalAppId,
        headings: { en: title },
        contents: { en: body },
        target_channel: "push",
      };

      if (target === 'ALL') {
        payload.included_segments = ["Subscribed Users"];
      } else if (targetUserId) {
        const userRec = await db.user.findUnique({
          where: { id: targetUserId },
          select: { oneSignalId: true, oneSignalSubId: true }
        });
        console.log(`[Broadcast Dispatch] Target User ID: ${targetUserId}, DB oneSignalId: ${userRec?.oneSignalId}, DB oneSignalSubId: ${userRec?.oneSignalSubId}`);
        
        if (userRec?.oneSignalSubId) {
          // If we have their direct push subscription ID in the database, target it directly!
          // This is a 100% reliable mechanism that bypasses any external_id indexing delays.
          payload.include_subscription_ids = [userRec.oneSignalSubId];
        } else {
          // Otherwise, target by their authenticated external_id alias
          payload.include_aliases = {
            external_id: [targetUserId]
          };
        }
      }

      console.log("[OneSignal Debug] Outgoing Payload:", JSON.stringify(payload, null, 2));
      console.log(`[OneSignal Debug] API Key Available: ${!!restApiKey}`);

      if (restApiKey) {
        console.log("[OneSignal Debug] Sending POST request to https://api.onesignal.com/notifications?c=push...");
        const oneSignalRes = await fetch("https://api.onesignal.com/notifications?c=push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${restApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        console.log(`[OneSignal Debug] Response Status: ${oneSignalRes.status} ${oneSignalRes.statusText}`);
        const responseText = await oneSignalRes.text();
        console.log("[OneSignal Debug] Response Body:", responseText);

        if (!oneSignalRes.ok) {
          console.error(`[OneSignal Debug] OneSignal push dispatch failed with status ${oneSignalRes.status}`);
        } else {
          console.log("[OneSignal Debug] OneSignal push notification sent successfully!");
        }
      } else {
        console.warn("[OneSignal Debug] ONESIGNAL_REST_API_KEY environment variable is not defined!");
      }
    } catch (osErr) {
      console.error("[OneSignal Debug] Exception during OneSignal push API call:", osErr);
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Error in POST /api/admin/broadcast:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
