import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/requireUser';

// GET: List all chat sessions for the authenticated user, ordered by most recently updated
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await db.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error in /api/chat/sessions GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new chat session
export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let title = 'New Chat';
    try {
      const body = await req.json();
      if (body && body.title) {
        title = body.title;
      }
    } catch (_) {
      // Body may be empty, default to 'New Chat'
    }

    const session = await db.chatSession.create({
      data: {
        userId: user.id,
        title,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error in /api/chat/sessions POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
