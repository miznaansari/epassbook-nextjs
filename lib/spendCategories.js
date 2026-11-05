import { APPS, classifySpend } from '@/lib/spendAnalytics';

/**
 * Dashboard spend categories (the "Where it went" / "Category breakdown" view).
 * Pure module: used by /api/dashboard/overview to classify entries and by the
 * client for labels. `icon` keys live in components/ui/LineIcon.jsx.
 */
export const SPEND_GROUPS = {
  family: { name: 'Family & People', short: 'Family', icon: 'person' },
  food: { name: 'Food & Dining', short: 'Food', icon: 'food' },
  groceries: { name: 'Groceries', short: 'Groceries', icon: 'cart' },
  shopping: { name: 'Shopping', short: 'Shopping', icon: 'tag' },
  transport: { name: 'Transport & Travel', short: 'Transport', icon: 'car' },
  bills: { name: 'Bills & Subscriptions', short: 'Bills', icon: 'bolt' },
  home: { name: 'Rent & Home', short: 'Home', icon: 'house' },
  health: { name: 'Health & Care', short: 'Health', icon: 'heart' },
  fun: { name: 'Entertainment', short: 'Fun', icon: 'film' },
  education: { name: 'Education', short: 'Education', icon: 'book' },
  finance: { name: 'EMI & Fees', short: 'Fees', icon: 'card' },
  misc: { name: 'Miscellaneous', short: 'Misc', icon: 'bag' },
};

export const OTHER_GROUP = { id: 'other', name: 'Other', short: 'Other', icon: 'grid' };

export function groupInfo(id) {
  if (id === OTHER_GROUP.id) return OTHER_GROUP;
  return { id, ...(SPEND_GROUPS[id] || SPEND_GROUPS.misc) };
}

// lib/spendAnalytics category -> dashboard group
const RAW_TO_GROUP = {
  groceries: 'groceries',
  food_delivery: 'food',
  dining: 'food',
  shopping: 'shopping',
  transport: 'transport',
  travel: 'transport',
  bills: 'bills',
  subscriptions: 'bills',
  housing: 'home',
  entertainment: 'fun',
  health: 'health',
  personal: 'health',
  education: 'education',
  family: 'family',
  finance: 'finance',
  other: 'misc',
};

// lib/spendIcons.js itemKey -> dashboard group ('other' falls through to text rules)
const ITEM_GROUP = {};
const assign = (group, keys) => keys.split(/\s+/).forEach(k => { ITEM_GROUP[k] = group; });
assign('groceries', `onion garlic ginger chilli tomato potato carrot corn cucumber leafy_greens herbs broccoli
  brinjal capsicum mushroom vegetables sweet_potato apple banana orange lemon grapes mango pineapple watermelon
  strawberry pear peach cherries kiwi melon avocado coconut olive atta rice dal nuts dry_fruits oil butter_ghee
  salt_sugar spices sauce_jar honey noodles pasta packaged_food milk curd cheese cream egg chicken meat fish groceries`);
assign('food', `tea coffee bread biscuit cake chips chocolate sweets popcorn ice_cream juice soft_drink water alcohol
  burger pizza meal flatbread sandwich momos takeout`);
assign('home', 'cat_food dog_food pet_care detergent cleaning tissue broom battery bulb tools furniture home');
assign('health', 'personal_care toothbrush razor cosmetics medicine doctor first_aid haircut');
assign('bills', 'electricity gas recharge wifi streaming');
assign('transport', 'auto taxi bike_ride bus train flight fuel hotel');
assign('fun', 'movie music games ticket party');
assign('education', 'education stationery');
assign('finance', 'fee');
assign('shopping', 'courier gadget charger headphones clothes jeans shoes bag watch gift parcel shopping toys');
assign('family', 'mother father elder_woman elder_man person donation money_transfer religious');

const APP_BY_NAME = new Map(APPS.map(a => [a.name.toLowerCase(), a]));

/**
 * Category for one SPENDING entry. `tag` is its SpendTag (AI merchant/item), may be null.
 * Priority: Family group > known app > AI item icon > keyword rules > Miscellaneous.
 */
export function spendGroupOf(entry, tag) {
  if (tag?.merchantSlug === 'family') return 'family';

  const app = (tag?.merchant && APP_BY_NAME.get(tag.merchant.toLowerCase())) || null;
  if (app) return RAW_TO_GROUP[app.category] || 'misc';

  if (tag?.itemKey && ITEM_GROUP[tag.itemKey]) return ITEM_GROUP[tag.itemKey];

  const { category } = classifySpend({
    title: entry.title,
    description: [entry.description, tag?.item, tag?.merchant].filter(Boolean).join(' '),
  });
  return RAW_TO_GROUP[category] || 'misc';
}
