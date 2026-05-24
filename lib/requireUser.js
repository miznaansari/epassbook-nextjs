import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * Secures Next.js Route Handlers by verifying the session_token cookie.
 * Returns the authenticated User object if valid, or null if unauthenticated/expired.
 * 
 * @returns {Promise<import('@prisma/client').User | null>}
 */
export async function requireUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return null;
    }

    const session = await db.userSession.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Error in requireUser helper:', error);
    return null;
  }
}
