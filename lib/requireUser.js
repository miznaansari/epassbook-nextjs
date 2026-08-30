import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';

/**
 * Universal User Authentication Helper for Next.js Route Handlers.
 * Seamlessly supports BOTH Cookie and Header authentication methods:
 * 
 * 🍪 COOKIE AUTH:
 *   - Next.js `cookies()` (`session_token`)
 *   - Raw `Cookie` header (`session_token=...`)
 * 
 * 🏷️ HEADER AUTH:
 *   - `x-api-key: pb_live_...`
 *   - `Authorization: Bearer pb_live_...`
 *   - `Authorization: Bearer <session_token>`
 *   - `x-session-token: <session_token>`
 * 
 * 🔗 QUERY PARAMETERS (if req is passed):
 *   - `?api_key=pb_live_...`
 * 
 * @param {Request} [req] Optional incoming Request object
 * @returns {Promise<import('@prisma/client').User | null>}
 */
export async function requireUser(req) {
  try {
    let headerList = null;
    let cookieStore = null;

    try {
      headerList = await headers();
    } catch (_) {}

    try {
      cookieStore = await cookies();
    } catch (_) {}

    // Helper to get header from either req.headers or Next.js headers()
    const getHeader = (name) => {
      const lower = name.toLowerCase();
      if (req?.headers?.get) {
        const val = req.headers.get(lower);
        if (val) return val;
      }
      if (headerList?.get) {
        const val = headerList.get(lower);
        if (val) return val;
      }
      return null;
    };

    // Helper to get cookie value
    const getCookie = (name) => {
      // 1. From Next.js cookies()
      if (cookieStore?.get) {
        const val = cookieStore.get(name)?.value;
        if (val) return val;
      }
      // 2. From req.cookies
      if (req?.cookies?.get) {
        const val = req.cookies.get(name)?.value;
        if (val) return val;
      }
      // 3. From raw Cookie header
      const rawCookie = getHeader('cookie');
      if (rawCookie) {
        const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
        if (match) return decodeURIComponent(match[1]);
      }
      return null;
    };

    // -------------------------------------------------------------
    // 1. Check API Key in Query Parameters (e.g. ?api_key=pb_live_...)
    // -------------------------------------------------------------
    let candidateApiKey = null;
    if (req?.url) {
      try {
        const url = new URL(req.url, 'http://localhost');
        candidateApiKey = url.searchParams.get('api_key') || 
                          url.searchParams.get('apiKey') || 
                          url.searchParams.get('key');
      } catch (_) {}
    }

    // -------------------------------------------------------------
    // 2. Check API Key in Headers (x-api-key or apiKey)
    // -------------------------------------------------------------
    if (!candidateApiKey) {
      candidateApiKey = getHeader('x-api-key') || getHeader('apiKey');
    }

    // -------------------------------------------------------------
    // 3. Check Authorization Header (Bearer pb_live_... OR Bearer session_token)
    // -------------------------------------------------------------
    let candidateSessionToken = null;
    const authHeader = getHeader('authorization');
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7).trim() 
        : authHeader.trim();

      if (token.startsWith('pb_live_') || token.startsWith('pb_')) {
        candidateApiKey = token;
      } else if (token) {
        candidateSessionToken = token;
      }
    }

    // Also check x-session-token header
    if (!candidateSessionToken) {
      candidateSessionToken = getHeader('x-session-token');
    }

    // -------------------------------------------------------------
    // 4. Check Cookie for session_token
    // -------------------------------------------------------------
    if (!candidateSessionToken) {
      candidateSessionToken = getCookie('session_token');
    }

    // =============================================================
    // Authenticate via API Key (if provided)
    // =============================================================
    if (candidateApiKey) {
      const apiKeyRecord = await db.apiKey.findUnique({
        where: { key: candidateApiKey },
        include: { user: true },
      });

      if (apiKeyRecord && apiKeyRecord.isActive && (!apiKeyRecord.expiresAt || apiKeyRecord.expiresAt > new Date())) {
        if (apiKeyRecord.user) {
          // Update lastUsedAt in background
          db.apiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() },
          }).catch(() => {});
          return apiKeyRecord.user;
        }
      }
    }

    // =============================================================
    // Authenticate via Session Token (Cookie or Header)
    // =============================================================
    if (candidateSessionToken) {
      const session = await db.userSession.findUnique({
        where: { token: candidateSessionToken },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date() && session.user) {
        return session.user;
      }
    }

    return null;
  } catch (error) {
    console.error('Error in requireUser helper:', error);
    return null;
  }
}

