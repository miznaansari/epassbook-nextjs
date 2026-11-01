import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tagEntries, FAMILY, MISC } from '@/lib/spendTagger';
import { ensureAssets } from '@/lib/spendAssets';
import { GROUP_ICON_KEYS } from '@/lib/spendIcons';

// Tags every SPENDING entry, then downloads every logo/icon those tags need.
export const maxDuration = 300;

async function requireAdmin(req) {
  const adminToken = req.cookies.get('admin_session_token')?.value;
  if (!adminToken) return false;
  const session = await db.adminSession.findUnique({ where: { token: adminToken } });
  return !!session && session.expiresAt > new Date();
}

/**
 * POST /api/admin/spend-assets/sync[?email=user@example.com]
 * Idempotent: already-tagged entries and already-downloaded assets are skipped.
 */
export async function POST(req) {
  try {
    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = new URL(req.url).searchParams.get('email');
    const users = await db.user.findMany({
      where: email ? { email } : {},
      select: { id: true, email: true },
    });

    const perUser = [];
    for (const u of users) {
      const entries = await db.financialEntry.findMany({
        where: { userId: u.id, type: 'SPENDING' },
        include: { spendTag: true },
        orderBy: { date: 'desc' },
      });
      const fresh = await tagEntries(u.id, entries, { maxAi: Infinity });
      perUser.push({ email: u.email, entries: entries.length, tagged: fresh.size });
    }

    const userIds = users.map(u => u.id);
    const [logoRows, itemRows] = await Promise.all([
      db.spendTag.groupBy({
        by: ['merchantSlug', 'merchantDomain'],
        where: { userId: { in: userIds }, merchantDomain: { not: null } },
      }),
      db.spendTag.groupBy({ by: ['itemKey'], where: { userId: { in: userIds } } }),
    ]);

    const logos = logoRows
      .filter(r => r.merchantSlug !== FAMILY.slug && r.merchantSlug !== MISC.slug)
      .map(r => ({ slug: r.merchantSlug, domain: r.merchantDomain }));
    const items = [...new Set([...itemRows.map(r => r.itemKey), GROUP_ICON_KEYS.family, GROUP_ICON_KEYS.misc])];

    const assets = await ensureAssets({ logos, items }, { cap: Infinity });

    return NextResponse.json({
      success: true,
      users: perUser,
      logosWanted: logos.length,
      iconsWanted: items.length,
      assetsAvailable: Object.keys(assets).length,
    });
  } catch (error) {
    console.error('Error in /api/admin/spend-assets/sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
