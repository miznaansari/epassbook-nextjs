import { db } from '@/lib/db';
import { putR2Object } from '@/lib/r2';
import { fluentUrl } from '@/lib/spendIcons';

/**
 * Download-once registry for merchant logos and item icons.
 * Assets are fetched from their public source a single time, stored in R2 under
 * a fixed key, and recorded in the SpendAsset table so every later request
 * (any user) reuses the R2 URL.
 */

const RETRY_FAILED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MIN_BYTES = 100;

let r2Disabled = false; // set when R2 credentials are missing, so we stop retrying this process

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/gif': 'gif',
};

export const logoKey = (slug) => `logo:${slug}`;
export const itemAssetKey = (key) => `item:${key}`;

function logoSources(domain) {
  const d = encodeURIComponent(domain);
  return [
    // Returns 404 for domains it has no icon for, so failures are detectable.
    `https://www.google.com/s2/favicons?domain=${d}&sz=256`,
    `https://icons.duckduckgo.com/ip3/${d}.ico`,
  ];
}

async function download(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PassbookAssetFetcher/1.0)' },
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = EXT_BY_MIME[mimeType];
    if (!ext) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < MIN_BYTES) return null;
    return { buffer, mimeType, ext };
  } catch {
    return null;
  }
}

async function resolveOne(key, spec) {
  const sources = spec.kind === 'logo'
    ? logoSources(spec.domain)
    : [fluentUrl(spec.iconKey)].filter(Boolean);

  for (const src of sources) {
    const got = await download(src);
    if (!got) continue;
    const r2Key = spec.kind === 'logo'
      ? `spend-assets/logos/${spec.slug}.${got.ext}`
      : `spend-assets/items/${spec.iconKey}.${got.ext}`;
    try {
      const { url } = await putR2Object({ key: r2Key, buffer: got.buffer, mimeType: got.mimeType });
      await db.spendAsset.upsert({
        where: { key },
        create: { key, url, sourceUrl: src },
        update: { url, sourceUrl: src, failedAt: null },
      });
      return url;
    } catch (err) {
      // Storage problem, not a missing asset — don't record a failure, retry later.
      if (/R2_SECRET_ACCESS_KEY/.test(err.message)) r2Disabled = true;
      console.error(`[spendAssets] upload failed for ${key}:`, err.message);
      return null;
    }
  }

  await db.spendAsset.upsert({
    where: { key },
    create: { key, url: null, failedAt: new Date() },
    update: { failedAt: new Date() },
  });
  return null;
}

async function runPool(items, concurrency, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Make sure the given logos/icons exist in R2, downloading any that are missing.
 * @param {{ logos?: {slug:string, domain?:string|null}[], items?: string[] }} wanted
 * @param {{ cap?: number }} [opts] max downloads in this call (rest picked up next time)
 * @returns {Promise<Record<string,string>>} asset key -> public URL (only resolved ones)
 */
export async function ensureAssets({ logos = [], items = [] }, { cap = 25 } = {}) {
  const specs = new Map();
  for (const l of logos) {
    if (l?.slug && l?.domain) specs.set(logoKey(l.slug), { kind: 'logo', slug: l.slug, domain: l.domain });
  }
  for (const k of items) {
    if (k) specs.set(itemAssetKey(k), { kind: 'item', iconKey: k });
  }
  if (!specs.size) return {};

  const rows = await db.spendAsset.findMany({ where: { key: { in: [...specs.keys()] } } });
  const byKey = new Map(rows.map(r => [r.key, r]));
  const map = {};
  const todo = [];
  const now = Date.now();

  for (const [key, spec] of specs) {
    const row = byKey.get(key);
    if (row?.url) {
      map[key] = row.url;
    } else if (!(row?.failedAt && now - row.failedAt.getTime() < RETRY_FAILED_AFTER_MS)) {
      todo.push([key, spec]);
    }
  }

  if (todo.length && !r2Disabled) {
    const batch = Number.isFinite(cap) ? todo.slice(0, cap) : todo;
    let downloaded = 0;
    await runPool(batch, 4, async ([key, spec]) => {
      const url = await resolveOne(key, spec);
      if (url) {
        map[key] = url;
        downloaded++;
      }
    });
    console.log(`[spendAssets] resolved ${downloaded}/${batch.length} new assets (${todo.length - batch.length} deferred)`);
  }

  return map;
}
