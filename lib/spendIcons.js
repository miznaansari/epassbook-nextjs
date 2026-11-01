/**
 * Item icon catalog for AI-tagged spends.
 *
 * Gemini must pick `itemKey` from these keys (enforced via responseSchema enum),
 * so every tagged item maps to a known Microsoft Fluent Emoji 3D image (MIT).
 * Images are downloaded once into R2 by lib/spendAssets.js; `emoji` is the
 * client-side fallback while (or if) the image is unavailable.
 *
 * Entry: key -> [emoji, fluentFolder, hint, hasSkinTones?]
 */
const CATALOG = {
  // Vegetables
  onion: ['🧅', 'Onion', 'onion, pyaz, spring onion'],
  garlic: ['🧄', 'Garlic', 'garlic, lehsun'],
  ginger: ['🫚', 'Ginger root', 'ginger, adrak'],
  chilli: ['🌶️', 'Hot pepper', 'green/red chilli, mirchi'],
  tomato: ['🍅', 'Tomato', 'tomato, tamatar'],
  potato: ['🥔', 'Potato', 'potato, aloo'],
  carrot: ['🥕', 'Carrot', 'carrot, gajar'],
  corn: ['🌽', 'Ear of corn', 'corn, corn cob, bhutta'],
  cucumber: ['🥒', 'Cucumber', 'cucumber, kheera'],
  leafy_greens: ['🥬', 'Leafy green', 'cabbage, spinach, palak, methi, lettuce'],
  herbs: ['🌿', 'Herb', 'coriander, dhaniya, mint, pudina, curry leaves'],
  broccoli: ['🥦', 'Broccoli', 'broccoli, cauliflower'],
  brinjal: ['🍆', 'Eggplant', 'brinjal, baingan'],
  capsicum: ['🫑', 'Bell pepper', 'capsicum, shimla mirch'],
  mushroom: ['🍄', 'Mushroom', 'mushroom'],
  vegetables: ['🥗', 'Green salad', 'mixed vegetables, sabzi, salad'],
  sweet_potato: ['🍠', 'Roasted sweet potato', 'sweet potato, shakarkandi'],

  // Fruits
  apple: ['🍎', 'Red apple', 'apple, seb'],
  banana: ['🍌', 'Banana', 'banana, kela'],
  orange: ['🍊', 'Tangerine', 'orange, santra, grapefruit, mosambi'],
  lemon: ['🍋', 'Lemon', 'lemon, nimbu'],
  grapes: ['🍇', 'Grapes', 'grapes, angoor'],
  mango: ['🥭', 'Mango', 'mango, aam'],
  pineapple: ['🍍', 'Pineapple', 'pineapple'],
  watermelon: ['🍉', 'Watermelon', 'watermelon, tarbooz'],
  strawberry: ['🍓', 'Strawberry', 'strawberry, berries'],
  pear: ['🍐', 'Pear', 'pear, nashpati'],
  peach: ['🍑', 'Peach', 'peach, plum'],
  cherries: ['🍒', 'Cherries', 'cherries'],
  kiwi: ['🥝', 'Kiwi fruit', 'kiwi'],
  melon: ['🍈', 'Melon', 'melon, papaya, guava'],
  avocado: ['🥑', 'Avocado', 'avocado'],
  coconut: ['🥥', 'Coconut', 'coconut, nariyal'],
  olive: ['🫒', 'Olive', 'olives'],

  // Staples & pantry
  atta: ['🌾', 'Sheaf of rice', 'atta, flour, maida, besan, suji, grains'],
  rice: ['🍚', 'Cooked rice', 'rice, chawal, poha'],
  dal: ['🫘', 'Beans', 'dal, rajma, chana, pulses, lentils'],
  nuts: ['🥜', 'Peanuts', 'peanuts, groundnut, mixed nuts'],
  dry_fruits: ['🌰', 'Chestnut', 'almonds, cashews, makhana, dry fruits'],
  oil: ['🫗', 'Pouring liquid', 'cooking oil, mustard oil, refined oil, vinegar'],
  butter_ghee: ['🧈', 'Butter', 'butter, ghee'],
  salt_sugar: ['🧂', 'Salt', 'salt, sugar, namak, cheeni'],
  spices: ['🌶️', 'Hot pepper', 'masala, haldi, spices, saunf, jeera'],
  sauce_jar: ['🫙', 'Jar', 'sauce, ketchup, mayonnaise, jam, pickle, spreads'],
  honey: ['🍯', 'Honey pot', 'honey'],
  noodles: ['🍜', 'Steaming bowl', 'maggi, noodles, soup'],
  pasta: ['🍝', 'Spaghetti', 'pasta, macaroni'],
  packaged_food: ['🥫', 'Canned food', 'packaged/ready-to-eat food, gelatin, baking items, yeast'],
  tea: ['🍵', 'Teacup without handle', 'tea, chai, tea powder, green tea'],
  coffee: ['☕', 'Hot beverage', 'coffee, nescafe, cafe drink'],

  // Dairy & eggs
  milk: ['🥛', 'Glass of milk', 'milk, doodh, milkshake, lassi'],
  curd: ['🥣', 'Bowl with spoon', 'curd, dahi, yogurt, cereal, oats'],
  cheese: ['🧀', 'Cheese wedge', 'cheese, paneer, cream cheese'],
  cream: ['🍮', 'Custard', 'fresh cream, custard, pudding'],
  egg: ['🥚', 'Egg', 'eggs, anda'],

  // Bakery, snacks & sweets
  bread: ['🍞', 'Bread', 'bread, pav, bun'],
  biscuit: ['🍪', 'Cookie', 'biscuits, cookies, parle-g, biscoff, rusk'],
  cake: ['🍰', 'Shortcake', 'cake, pastry'],
  chips: ['🍟', 'French fries', 'chips, kurkure, namkeen, fries'],
  chocolate: ['🍫', 'Chocolate bar', 'chocolate'],
  sweets: ['🍬', 'Candy', 'sweets, mithai, chikki, toffee, candy'],
  popcorn: ['🍿', 'Popcorn', 'popcorn'],
  ice_cream: ['🍨', 'Ice cream', 'ice cream, kulfi, dessert'],

  // Beverages
  juice: ['🧃', 'Beverage box', 'juice, packaged juice, syrup'],
  soft_drink: ['🥤', 'Cup with straw', 'cold drink, coke, sprite, campa, soda'],
  water: ['💧', 'Droplet', 'water bottle, water can'],
  alcohol: ['🍺', 'Beer mug', 'beer, alcohol'],

  // Prepared food
  burger: ['🍔', 'Hamburger', 'burger'],
  pizza: ['🍕', 'Pizza', 'pizza'],
  meal: ['🍛', 'Curry rice', 'thali, biryani, restaurant meal, lunch, dinner'],
  flatbread: ['🫓', 'Flatbread', 'puri, paratha, roti, roll, keema puri'],
  sandwich: ['🥪', 'Sandwich', 'sandwich'],
  momos: ['🥟', 'Dumpling', 'momos, dumplings'],
  chicken: ['🍗', 'Poultry leg', 'chicken'],
  meat: ['🥩', 'Cut of meat', 'mutton, meat, keema'],
  fish: ['🐟', 'Fish', 'fish, seafood'],
  takeout: ['🥡', 'Takeout box', 'food delivery order, takeaway'],

  // Pets
  cat_food: ['🐈', 'Cat', 'cat food, whiskas'],
  dog_food: ['🐕', 'Dog', 'dog food, pedigree'],
  pet_care: ['🐾', 'Paw prints', 'cat litter, pet pads, pet supplies'],

  // Household & personal care
  detergent: ['🧼', 'Soap', 'detergent, surf, dishwash, soap, handwash'],
  cleaning: ['🧽', 'Sponge', 'cleaning supplies, scrubber, phenyl'],
  tissue: ['🧻', 'Roll of paper', 'tissue, toilet paper, napkins, kitchen roll'],
  broom: ['🧹', 'Broom', 'broom, mop'],
  battery: ['🔋', 'Battery', 'batteries, power bank'],
  bulb: ['💡', 'Light bulb', 'bulb, light, electricals'],
  personal_care: ['🧴', 'Lotion bottle', 'shampoo, lotion, hair dye, cosmetics bottle'],
  toothbrush: ['🪥', 'Toothbrush', 'toothbrush, toothpaste'],
  razor: ['🪒', 'Razor', 'razor, shaving'],
  cosmetics: ['💄', 'Lipstick', 'makeup, cosmetics'],
  medicine: ['💊', 'Pill', 'medicine, pharmacy, tablets'],
  doctor: ['🩺', 'Stethoscope', 'doctor, clinic, hospital, checkup'],
  first_aid: ['🩹', 'Adhesive bandage', 'bandage, first aid'],
  tools: ['🔧', 'Wrench', 'repair, tools, plumber, electrician'],
  furniture: ['🪑', 'Chair', 'chair, table, furniture'],
  home: ['🏠', 'House', 'rent, house, maintenance'],
  electricity: ['⚡', 'High voltage', 'electricity bill'],
  gas: ['🔥', 'Fire', 'gas cylinder, lpg'],

  // Fees & services
  fee: ['🧾', 'Receipt', 'delivery fee, handling charge, platform fee, convenience fee, tax'],
  courier: ['🛵', 'Motor scooter', 'courier, delivery service'],
  haircut: ['💈', 'Barber pole', 'haircut, hair cut, salon, barber'],
  auto: ['🛺', 'Auto rickshaw', 'auto rickshaw, rapido auto'],
  taxi: ['🚕', 'Taxi', 'cab, taxi, uber, ola'],
  bike_ride: ['🏍️', 'Motorcycle', 'bike taxi, rapido bike'],
  bus: ['🚌', 'Bus', 'bus ticket'],
  train: ['🚆', 'Train', 'train, metro, irctc'],
  flight: ['✈️', 'Airplane', 'flight'],
  fuel: ['⛽', 'Fuel pump', 'petrol, diesel, cng, fuel'],
  hotel: ['🏨', 'Hotel', 'hotel, stay'],
  recharge: ['📱', 'Mobile phone', 'mobile recharge, phone bill, phone accessories, tempered glass'],
  wifi: ['📶', 'Antenna bars', 'wifi, broadband, internet'],
  streaming: ['📺', 'Television', 'netflix, ott, streaming subscription, dth'],
  movie: ['🎬', 'Clapper board', 'movie tickets, cinema'],
  music: ['🎵', 'Musical notes', 'music subscription, spotify'],
  games: ['🎮', 'Video game', 'games, gaming'],
  ticket: ['🎟️', 'Ticket', 'event tickets, entry fee'],
  education: ['📚', 'Books', 'books, course, tuition, fees'],
  stationery: ['✏️', 'Pencil', 'stationery, pen, notebook'],

  // Shopping
  gadget: ['💻', 'Laptop', 'electronics, gadgets, laptop'],
  charger: ['🔌', 'Electric plug', 'charger, cable, adapter, extension board'],
  headphones: ['🎧', 'Headphone', 'headphones, earphones, earbuds'],
  clothes: ['👕', 'T-shirt', 'clothes, shirt, t-shirt, kurta'],
  jeans: ['👖', 'Jeans', 'jeans, trousers, pants'],
  shoes: ['👟', 'Running shoe', 'shoes, slippers, footwear'],
  bag: ['👜', 'Handbag', 'bag, purse, wallet'],
  watch: ['⌚', 'Watch', 'watch'],
  gift: ['🎁', 'Wrapped gift', 'gift, present'],
  parcel: ['📦', 'Package', 'online order, flipkart/amazon parcel'],
  shopping: ['🛍️', 'Shopping bags', 'general shopping'],
  groceries: ['🛒', 'Shopping cart', 'mixed groceries, general store items'],
  toys: ['🧸', 'Teddy bear', 'toys'],

  // People & transfers
  mother: ['👩', 'Woman', 'mother, amma, ammi, mom, sister, aunt, any woman', true],
  father: ['👨', 'Man', 'father, abba, papa, dad, brother, uncle, any man', true],
  elder_woman: ['👵', 'Old woman', 'grandmother, nani, dadi', true],
  elder_man: ['👴', 'Old man', 'grandfather, nana, dada', true],
  person: ['🧑', 'Person', 'friend, person, payee of unknown gender', true],
  donation: ['🤲', 'Palms up together', 'donation, charity, zakat, sadaqah', true],
  money_transfer: ['💸', 'Money with wings', 'money sent, upi transfer, payment to someone'],
  religious: ['🕌', 'Mosque', 'mosque, temple, religious offering'],
  party: ['🎉', 'Party popper', 'party, celebration'],

  // Fallback
  other: ['🏷️', 'Label', 'anything that fits nothing else'],
};

// Group-level icons for the two synthetic merchants.
export const GROUP_ICON_KEYS = {
  family: 'family_people',
  misc: 'misc_group',
};
const GROUP_ICONS = {
  family_people: ['🫂', 'People hugging', 'family & people group'],
  misc_group: ['🧺', 'Basket', 'miscellaneous group'],
};

const ALL = { ...CATALOG, ...GROUP_ICONS };

/** Keys Gemini may choose from (group icons excluded). */
export const ITEM_KEYS = Object.keys(CATALOG);

export function isItemKey(key) {
  return Object.prototype.hasOwnProperty.call(CATALOG, key);
}

export function iconEmoji(key) {
  return (ALL[key] || ALL.other)[0];
}

/** Compact "key: hint" list used in the Gemini prompt. */
export function itemKeyGuide() {
  return ITEM_KEYS.map(k => `${k} (${CATALOG[k][2]})`).join('; ');
}

// Keys that are only ever chosen deliberately (people, generic buckets), never by keyword.
const NO_KEYWORD_KEYS = new Set(['other', 'person', 'mother', 'father', 'elder_woman', 'elder_man', 'shopping', 'groceries', 'money_transfer', 'party']);
let keywordIndex = null;

function getKeywordIndex() {
  if (keywordIndex) return keywordIndex;
  const pairs = [];
  for (const [key, [, , hint]] of Object.entries(CATALOG)) {
    if (NO_KEYWORD_KEYS.has(key)) continue;
    const phrases = new Set([key.replace(/_/g, ' '), ...hint.split(/[,/]/).map(s => s.trim().toLowerCase())]);
    for (const p of phrases) {
      if (p.length >= 3 && p.split(' ').length <= 3) pairs.push([p, key]);
    }
  }
  pairs.sort((a, b) => b[0].length - a[0].length); // most specific phrase wins
  keywordIndex = pairs.map(([p, key]) => {
    const stem = p.length > 4 && p.endsWith('s') ? p.slice(0, -1) : p;
    const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    return [new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'i'), key];
  });
  return keywordIndex;
}

/** Best-effort icon key from free text (used when Gemini is unavailable). */
export function guessItemKey(text) {
  if (!text) return 'other';
  for (const [re, key] of getKeywordIndex()) {
    if (re.test(text)) return key;
  }
  return 'other';
}

const FLUENT_BASE ='https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

/** Source URL of the Fluent Emoji 3D PNG for an icon key (catalog or group icon). */
export function fluentUrl(key) {
  const entry = ALL[key];
  if (!entry) return null;
  const [, folder, , tones] = entry;
  const file = folder.toLowerCase().replace(/ /g, '_');
  const dir = encodeURIComponent(folder);
  return tones
    ? `${FLUENT_BASE}/${dir}/Default/3D/${file}_3d_default.png`
    : `${FLUENT_BASE}/${dir}/3D/${file}_3d.png`;
}

export const ALL_ICON_KEYS = Object.keys(ALL);
