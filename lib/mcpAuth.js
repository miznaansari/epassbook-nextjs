import { db } from '@/lib/db';

/**
 * Authenticates an incoming MCP request using an API key from query params or headers.
 * 
 * Supports:
 * - Query parameter: `?api_key=...`, `?apiKey=...`, or `?key=...`
 * - Header: `x-api-key: ...`
 * - Authorization Header: `Bearer pb_live_...`
 * 
 * @param {Request} req
 * @returns {Promise<{ user: import('@prisma/client').User, apiKey: import('@prisma/client').ApiKey } | null>}
 */
export async function authenticateApiKey(req) {
  try {
    let key = null;

    // 1. Try URL search parameters (e.g. /api/mcp?api_key=pb_live_...)
    if (req.url) {
      try {
        const url = new URL(req.url);
        key = url.searchParams.get('api_key') || 
              url.searchParams.get('apiKey') || 
              url.searchParams.get('key');
      } catch (err) {
        // Fallback for relative URLs if any
      }
    }

    // 2. Try x-api-key header
    if (!key && req.headers) {
      key = req.headers.get('x-api-key');
    }

    // 3. Try Authorization: Bearer <key>
    if (!key && req.headers) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        key = authHeader.substring(7).trim();
      }
    }

    if (!key) {
      return null;
    }

    // Find the active API key in database
    const apiKeyRecord = await db.apiKey.findUnique({
      where: { key },
      include: {
        user: true,
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    if (!apiKeyRecord.isActive) {
      return null;
    }

    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) <= new Date()) {
      return null;
    }

    if (!apiKeyRecord.user) {
      return null;
    }

    // Non-blocking update of lastUsedAt
    db.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(err => {
      console.warn('[MCP Auth] Error updating lastUsedAt:', err.message);
    });

    return {
      user: apiKeyRecord.user,
      apiKey: apiKeyRecord,
    };
  } catch (error) {
    console.error('[MCP Auth] Authentication error:', error);
    return null;
  }
}
