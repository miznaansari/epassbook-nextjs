import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// GET: Fetch all API keys for the authenticated user
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = await db.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Error in /api/api-keys GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Generate and save a new API key
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || 'Default API Key').trim();
    const expiresDays = body.expiresDays ? parseInt(body.expiresDays) : null;

    // Generate cryptographically secure API key
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const rawKey = `pb_live_${randomSecret}`;
    const prefix = `pb_live_${randomSecret.slice(0, 6)}...${randomSecret.slice(-4)}`;

    let expiresAt = null;
    if (expiresDays && expiresDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);
    }

    const apiKey = await db.apiKey.create({
      data: {
        userId: user.id,
        name,
        key: rawKey,
        prefix,
        expiresAt,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Returned ONLY on creation
        prefix: apiKey.prefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in /api/api-keys POST:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// DELETE: Delete an API key
export async function DELETE(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing API key ID' }, { status: 400 });
    }

    const existingKey = await db.apiKey.findUnique({
      where: { id },
    });

    if (!existingKey || existingKey.userId !== user.id) {
      return NextResponse.json({ error: 'API key not found or unauthorized' }, { status: 404 });
    }

    await db.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'API key successfully deleted.' });
  } catch (error) {
    console.error('Error in /api/api-keys DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Toggle active status or rename API key
export async function PATCH(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, isActive, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing API key ID' }, { status: 400 });
    }

    const existingKey = await db.apiKey.findUnique({
      where: { id },
    });

    if (!existingKey || existingKey.userId !== user.id) {
      return NextResponse.json({ error: 'API key not found or unauthorized' }, { status: 404 });
    }

    const updateData = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (name && typeof name === 'string') updateData.name = name.trim();

    const updated = await db.apiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        prefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, apiKey: updated });
  } catch (error) {
    console.error('Error in /api/api-keys PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
