import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { db } from '@/lib/db';
import { APPS, classifySpend, getApp } from '@/lib/spendAnalytics';
import { ITEM_KEYS, isItemKey, itemKeyGuide, guessItemKey } from '@/lib/spendIcons';

/**
 * Gemini-powered merchant + item tagging for SPENDING entries.
 * Results are cached per entry in SpendTag; only untagged or edited entries
 * are sent to Gemini. If Gemini is unavailable we fall back to regex rules
 * (source: 'rules') so the dashboard always renders, and retry later.
 */

const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.0-flash'];
const CHUNK_SIZE = 60;
const PARALLEL_CHUNKS = 3;
const RULES_RETRY_AFTER_MS = 30 * 60 * 1000;

export const FAMILY = { name: 'Family & People', slug: 'family' };
export const MISC = { name: 'Miscellaneous', slug: 'misc' };

export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || MISC.slug;
}

const APP_BY_SLUG = new Map(APPS.map(a => [slugify(a.name), a]));

function cleanDomain(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(d) ? d : null;
}

/** Normalise a merchant name into { merchant, merchantSlug, merchantDomain }. */
function canonicalMerchant(name, domain) {
  const raw = (name || '').trim();
  if (!raw || /^misc/i.test(raw) || /^(unknown|other|none|n\/a)$/i.test(raw)) {
    return { merchant: MISC.name, merchantSlug: MISC.slug, merchantDomain: null };
  }
  if (/^family/i.test(raw) || /people$/i.test(raw)) {
    return { merchant: FAMILY.name, merchantSlug: FAMILY.slug, merchantDomain: null };
  }
  const slug = slugify(raw);
  const app = APP_BY_SLUG.get(slug);
  if (app) return { merchant: app.name, merchantSlug: slug, merchantDomain: app.domain || cleanDomain(domain) };
  return { merchant: raw.slice(0, 80), merchantSlug: slug, merchantDomain: cleanDomain(domain) };
}

const NOTE_BOILERPLATE = /^(quick ai entry:|logged via ai assistant receipt ocr|quick added\b)/i;

function noteOf(entry) {
  const d = (entry.description || '').trim();
  if (!d || /^logged via ai assistant/i.test(d)) return '';
  return d.replace(NOTE_BOILERPLATE, '').trim().slice(0, 200);
}

// Capitalise word starts only ("chheda's" -> "Chheda's", keeps "BearHugs").
const titleCase = (s) => s.replace(/\s+/g, ' ').trim().replace(/(^|[\s(/&-])([a-z])/g, (_, p, c) => p + c.toUpperCase());

// --- Regex fallback (used when Gemini is unavailable) -----------------------

const FEMALE_REL = /\b(amma|ammi|ammy|mummy|mumma|mom|maa|didi|behen|appa|appi|aapa|chachi|mami|khala|phupho|aunty)\b/i;
const MALE_REL = /\b(abba|abbu|papa|dad|bhai|bhaiya|chacha|mama|uncle)\b/i;
const ELDER_F = /\b(nani|dadi)\b/i;
const ELDER_M = /\b(nana|dada)\b/i;
const PAID_TO = /^(paid:?|payment to|paid to|sent to|transfer(?:red)? to)\s+/i;
const LOCAL_SHOP = /\b([a-z]{3,})\s+(?:general|genral|genrl|kirana)\s+(?:store|stores|shop)\b|\b([a-z]{3,})\s+(store|stores|shop|mart|traders|bakery|dairy|medical)\b/i;
const NOT_A_SHOP_NAME = /^(the|general|grocery|medical|online|local|from|some|ration|kirana|vegetable|sabzi)$/i;

// Default icon for known apps when the item text gives no hint.
const CATEGORY_ICON = {
  groceries: 'groceries', food_delivery: 'takeout', dining: 'meal', subscriptions: 'streaming',
  shopping: 'parcel', transport: 'taxi', travel: 'train', bills: 'recharge', health: 'medicine',
  entertainment: 'movie', personal: 'cosmetics', housing: 'tools',
};

function familyTag(entry, text) {
  const title = (entry.title || '').trim();
  const stripped = title.replace(PAID_TO, '').trim();
  const relation = text.match(ELDER_F) || text.match(ELDER_M) || text.match(FEMALE_REL) || text.match(MALE_REL);
  const words = stripped.split(/\s+/).filter(Boolean);
  const person = words.length <= 3 ? stripped : (relation ? relation[1] : words.slice(0, 2).join(' '));
  const itemKey = ELDER_F.test(text) ? 'elder_woman'
    : ELDER_M.test(text) ? 'elder_man'
    : FEMALE_REL.test(text) ? 'mother'
    : MALE_REL.test(text) ? 'father'
    : 'person';
  return { ...canonicalMerchant(FAMILY.name), item: titleCase(person).slice(0, 80), itemKey };
}

function ruleTag(entry) {
  const title = (entry.title || '').trim();
  const note = noteOf(entry);
  const text = `${title} ${note}`;
  const c = classifySpend(entry);
  const prefix = title.match(/^\s*([A-Za-z][\w .&']{1,30}?)\s*[-:]\s+(.+)$/);
  const isFee = /handling|delivery charge|platform fee|convenience fee/i.test(title);
  const fee = { item: 'Delivery & Handling Fee', itemKey: 'fee' };

  if (c.appId) {
    const app = getApp(c.appId);
    let item = title;
    if (prefix && app.match.test(prefix[1].toLowerCase())) item = prefix[2];
    const guessed = guessItemKey(item);
    return {
      ...canonicalMerchant(app.name, app.domain),
      ...(isFee ? fee : {
        item: titleCase(item).slice(0, 80),
        itemKey: guessed !== 'other' ? guessed : (app.id === 'rapido' ? 'bike_ride' : CATEGORY_ICON[app.category] || 'other'),
      }),
    };
  }

  // Money to a person: "Amma", "Paid: Sejal Kashyap", "Payment to Abba"
  const paidToPerson = PAID_TO.test(title) && !/\bfor\b/i.test(title);
  if (FEMALE_REL.test(text) || MALE_REL.test(text) || ELDER_F.test(text) || ELDER_M.test(text) || paidToPerson) {
    return familyTag(entry, text);
  }

  // Local shop named in the note: "150 refined oil ajaz genral store"
  const shop = text.match(LOCAL_SHOP);
  const shopWord = shop && (shop[1] || shop[2]);
  if (shopWord && !NOT_A_SHOP_NAME.test(shopWord)) {
    const name = shop[1] ? `${shopWord} General Store` : `${shopWord} ${shop[3]}`;
    const item = c.merchantName || title;
    return { ...canonicalMerchant(titleCase(name)), item: titleCase(item).slice(0, 80), itemKey: guessItemKey(item) };
  }

  const item = c.merchantName || title || 'Untitled';
  return { ...canonicalMerchant(MISC.name), item: titleCase(item).slice(0, 80), itemKey: guessItemKey(item) };
}

const RESPONSE_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.INTEGER },
      merchant: { type: SchemaType.STRING },
      merchantDomain: { type: SchemaType.STRING, nullable: true },
      item: { type: SchemaType.STRING },
      itemKey: { type: SchemaType.STRING, format: 'enum', enum: ITEM_KEYS },
    },
    required: ['id', 'merchant', 'item', 'itemKey'],
  },
};

function buildPrompt(rows, knownMerchants, knownItems) {
  const merchants = knownMerchants.map(m => `${m.name}${m.domain ? ` | ${m.domain}` : ''}`).join('\n');
  const items = knownItems.length ? knownItems.map(i => `${i.merchant}: ${i.item}`).join('\n') : '(none yet)';
  return `You organise personal spending transactions from India (currency INR) by WHERE the money went (merchant) and WHAT was bought (item).
Titles/notes are often Hinglish, abbreviated or misspelt. Return exactly one result per input transaction, with the same id.

FIELDS
- merchant: the merchant/payee group, Title Case.
  * Online brands: use the brand name exactly as listed in KNOWN MERCHANTS (e.g. "Blinkit", "Netflix", "Rapido", "Flipkart"). "Blinkit - Onion" and "Blinkit: Onion" are Blinkit.
  * Local shops named anywhere in the title or note: use the shop name and fix typos ("ajaz genral store" -> "Ajaz General Store"). If a person is clearly the owner of a shop already in KNOWN MERCHANTS (e.g. "Payment to Ajaz Ahmad for egg" when "Ajaz General Store" exists), use that shop.
  * Money given to family, relatives, friends or any person (Amma, Ammi, Abba, Papa, Bhai, "Hera appa", "Paid: Sejal Kashyap", "Payment to Abba", "Amma ko diya"): merchant = "${FAMILY.name}".
  * If no merchant can be identified: merchant = "${MISC.name}". Never invent a merchant from an item name ("Coffee", "Chair", "Hair Cut" alone -> "${MISC.name}").
  * Reuse a KNOWN MERCHANTS name whenever it is the same merchant. Never create spelling variants.
- merchantDomain: official website domain for real online brands/chains (e.g. "blinkit.com", "netflix.com", "rapido.bike"); null for local shops, people, "${FAMILY.name}" and "${MISC.name}".
- item: short canonical name of what was bought, 1-4 words, Title Case, no prices, quantities or merchant prefix.
  * Keep the product brand when it identifies the product ("Aashirvaad Atta", "Lotus Biscoff Cookies", "Amul Cheese Slices"); drop marketing words ("Whole Farm Premium", "Organically Grown").
  * Delivery, handling, platform or convenience charges -> "Delivery & Handling Fee".
  * Translate Hinglish to English ("bartan dhulne wala surf" -> "Dishwash Detergent", "ek tray egg laya" -> "Eggs", "keeme ki puri" -> "Keema Puri").
  * Several items in one transaction: join up to 3 names ("Potato, Egg, Ginger").
  * For "${FAMILY.name}": item = the person's name, cleaned ("Amma", "Abba", "Hera Appa", "Sejal Kashyap").
  * Reuse the exact KNOWN ITEMS spelling for the same product.
- itemKey: the ITEM KEYS entry that best pictures the item. Use "fee" for charges; mother/father/elder_woman/elder_man/person for people; "streaming" for Netflix-like subscriptions; "other" only if nothing fits.

KNOWN MERCHANTS (name | domain)
${merchants}

KNOWN ITEMS (merchant: item)
${items}

ITEM KEYS
${itemKeyGuide()}

TRANSACTIONS (JSON)
${JSON.stringify(rows)}`;
}

// Circuit breaker: when every model fails (bad key, outage), skip Gemini for a
// few minutes instead of paying the full fallback chain on every chunk.
const BREAKER_MS = 5 * 60 * 1000;
let geminiDownUntil = 0;

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || Date.now() < geminiDownUntil) return null;
  const result = await tryModels(new GoogleGenerativeAI(apiKey), prompt);
  if (!result) {
    geminiDownUntil = Date.now() + BREAKER_MS;
    console.warn(`[spendTagger] all Gemini models failed; using rules for ${BREAKER_MS / 60000} min`);
  }
  return result;
}

async function tryModels(ai, prompt) {
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      if (Array.isArray(parsed)) return { results: parsed, modelUsed: modelName };
    } catch (err) {
      console.warn(`[spendTagger] ${modelName} failed:`, err.message?.slice(0, 160));
    }
  }
  return null;
}

async function loadKnown(userId) {
  const [merchantRows, itemRows] = await Promise.all([
    db.spendTag.groupBy({
      by: ['merchant', 'merchantDomain'],
      where: { userId, source: 'ai' },
      _count: { _all: true },
      orderBy: { _count: { merchant: 'desc' } },
      take: 80,
    }),
    db.spendTag.groupBy({
      by: ['merchant', 'item'],
      where: { userId, source: 'ai', merchantSlug: { not: FAMILY.slug } },
      _count: { _all: true },
      orderBy: { _count: { item: 'desc' } },
      take: 150,
    }),
  ]);
  const merchants = new Map(APPS.map(a => [a.name, { name: a.name, domain: a.domain }]));
  for (const r of merchantRows) {
    if (!merchants.has(r.merchant)) merchants.set(r.merchant, { name: r.merchant, domain: r.merchantDomain });
  }
  return { merchants: [...merchants.values()], items: itemRows.map(r => ({ merchant: r.merchant, item: r.item })) };
}

function needsTag(entry, now) {
  const t = entry.spendTag;
  if (!t) return true;
  if (t.entryUpdatedAt.getTime() !== new Date(entry.updatedAt).getTime()) return true;
  if (t.source !== 'ai') return now - t.updatedAt.getTime() > RULES_RETRY_AFTER_MS;
  return false;
}

async function saveTags(userId, tagged) {
  if (!tagged.length) return;
  await db.$transaction(tagged.map(({ entry, tag, source }) => {
    const data = {
      userId,
      merchant: tag.merchant,
      merchantSlug: tag.merchantSlug,
      merchantDomain: tag.merchantDomain,
      item: tag.item,
      itemKey: tag.itemKey,
      source,
      entryUpdatedAt: new Date(entry.updatedAt),
    };
    return db.spendTag.upsert({
      where: { entryId: entry.id },
      create: { entryId: entry.id, ...data },
      update: data,
    });
  }));
}

async function tagChunk(userId, chunk, known) {
  const rows = chunk.map(e => ({ id: e.id, title: e.title, note: noteOf(e), amount: Number(e.amount) }));
  const response = await callGemini(buildPrompt(rows, known.merchants, known.items));
  const byId = new Map((response?.results || []).map(r => [Number(r.id), r]));

  const tagged = chunk.map(entry => {
    const r = byId.get(entry.id);
    if (!r || !r.merchant || !r.item) return { entry, tag: ruleTag(entry), source: 'rules' };
    return {
      entry,
      source: 'ai',
      tag: {
        ...canonicalMerchant(r.merchant, r.merchantDomain),
        item: titleCase(String(r.item)).slice(0, 80),
        itemKey: isItemKey(r.itemKey) ? r.itemKey : 'other',
      },
    };
  });

  await saveTags(userId, tagged);
  return { tagged, modelUsed: response?.modelUsed || null };
}

/**
 * Ensure SpendTags exist and are fresh for the given SPENDING entries.
 * Entries must include `spendTag` (Prisma include). Mutates nothing; returns
 * a Map of entryId -> fresh tag for every entry that was (re)tagged.
 * @param {string} userId
 * @param {Array} entries
 * @param {{ maxAi?: number }} [opts] cap on entries sent to Gemini in one call; the rest get rules tags for now
 */
export async function tagEntries(userId, entries, { maxAi = 240 } = {}) {
  const now = Date.now();
  const stale = entries.filter(e => e.type === 'SPENDING' && needsTag(e, now));
  const fresh = new Map();
  if (!stale.length) return fresh;

  const forAi = stale.slice(0, maxAi);
  const overflow = stale.slice(maxAi);
  const started = Date.now();

  let known = await loadKnown(userId);
  const chunks = [];
  for (let i = 0; i < forAi.length; i += CHUNK_SIZE) chunks.push(forAi.slice(i, i + CHUNK_SIZE));

  const models = new Set();
  const collect = ({ tagged, modelUsed }) => {
    if (modelUsed) models.add(modelUsed);
    for (const t of tagged) fresh.set(t.entry.id, { ...t.tag, source: t.source });
  };

  if (chunks.length) {
    // First chunk alone seeds merchant/item names so parallel chunks reuse them.
    collect(await tagChunk(userId, chunks[0], known));
    if (chunks.length > 1) {
      known = await loadKnown(userId);
      for (let i = 1; i < chunks.length; i += PARALLEL_CHUNKS) {
        const group = chunks.slice(i, i + PARALLEL_CHUNKS);
        (await Promise.all(group.map(c => tagChunk(userId, c, known)))).forEach(collect);
      }
    }
  }

  if (overflow.length) {
    const tagged = overflow.map(entry => ({ entry, tag: ruleTag(entry), source: 'rules' }));
    await saveTags(userId, tagged);
    tagged.forEach(t => fresh.set(t.entry.id, { ...t.tag, source: t.source }));
  }

  const aiCount = [...fresh.values()].filter(t => t.source === 'ai').length;
  console.log(`[spendTagger] user ${userId}: tagged ${fresh.size} entries (${aiCount} ai, ${fresh.size - aiCount} rules) in ${Date.now() - started}ms via ${[...models].join(', ') || 'rules only'}`);
  return fresh;
}
