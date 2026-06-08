import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// PATCH: Update an existing notification campaign (isActive toggle or fields modification)
export async function PATCH(req, { params }) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const campaign = await db.notificationCampaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.userId !== user.id) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const updateData = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.message !== undefined) updateData.message = body.message;
    if (body.frequency !== undefined) {
      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'SIX_MONTHS'];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json({ error: 'Invalid frequency option' }, { status: 400 });
      }
      updateData.frequency = body.frequency;
    }
    if (body.time !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(body.time)) {
        return NextResponse.json({ error: 'Invalid time format. Use HH:MM (e.g. 14:30)' }, { status: 400 });
      }
      updateData.time = body.time;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updatedCampaign = await db.notificationCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error('Error in /api/notifications/campaigns/[id] PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Soft delete a notification campaign
export async function DELETE(req, { params }) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const campaign = await db.notificationCampaign.findUnique({
      where: { id },
    });

    if (!campaign || campaign.userId !== user.id) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const softDeleted = await db.notificationCampaign.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true, campaign: softDeleted });
  } catch (error) {
    console.error('Error in /api/notifications/campaigns/[id] DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
