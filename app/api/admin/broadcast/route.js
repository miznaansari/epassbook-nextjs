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
        payload.include_aliases = {
          external_id: [targetUserId]
        };
      }

      if (restApiKey) {
        const oneSignalRes = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${restApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!oneSignalRes.ok) {
          const oneSignalErr = await oneSignalRes.json();
          console.error("OneSignal push dispatch failed:", oneSignalErr);
        } else {
          console.log("OneSignal push notification sent successfully!");
        }
      }
    } catch (osErr) {
      console.error("Could not trigger OneSignal push API:", osErr);
    }

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Error in POST /api/admin/broadcast:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
