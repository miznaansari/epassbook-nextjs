#!/usr/bin/env node
/**
 * Downloads the 3D UI icons listed in lib/uiIcons.js into public/icons3d/.
 * Usage: node scripts/fetch-ui-icons.mjs [--force]
 * Existing files are skipped unless --force is passed.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_ICON_NAMES, uiIconSourceUrl } from '../lib/uiIcons.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public', 'icons3d');
const force = process.argv.includes('--force');

await mkdir(outDir, { recursive: true });

const exists = async (p) => access(p).then(() => true, () => false);
let downloaded = 0;
let skipped = 0;
const failed = [];

await Promise.all(UI_ICON_NAMES.map(async (name) => {
  const target = path.join(outDir, `${name}.png`);
  if (!force && await exists(target)) {
    skipped++;
    return;
  }
  const url = uiIconSourceUrl(name);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
    downloaded++;
  } catch (err) {
    failed.push(`${name}: ${err.message} (${url})`);
  }
}));

console.log(`icons3d: ${downloaded} downloaded, ${skipped} already present, ${failed.length} failed`);
if (failed.length) {
  failed.forEach(f => console.error('  ✗', f));
  process.exit(1);
}
