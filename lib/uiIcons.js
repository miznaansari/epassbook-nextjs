/**
 * 3D UI icon catalog (Microsoft Fluent Emoji 3D, MIT licence).
 * Files are downloaded once by `node scripts/fetch-ui-icons.mjs` into
 * public/icons3d/<name>.png and served same-origin. `emoji` is the fallback.
 *
 * name -> [emoji, fluentFolder, hasSkinTones?]
 */
export const UI_ICONS = {
  // Navigation
  home: ['🏠', 'House'],
  passbook: ['📒', 'Ledger'],
  savings: ['💰', 'Money bag'],
  stocks: ['📈', 'Chart increasing'],
  assistant: ['🤖', 'Robot'],
  reports: ['📊', 'Bar chart'],
  sips: ['🪙', 'Coin'],
  alerts: ['🔔', 'Bell'],
  developer: ['🔌', 'Electric plug'],
  settings: ['⚙️', 'Gear'],
  more: ['🗂️', 'Card index dividers'],
  logout: ['🚪', 'Door'],
  user: ['👤', 'Bust in silhouette'],

  // Money / KPIs
  balance: ['🏦', 'Bank'],
  spent: ['💸', 'Money with wings'],
  'salary-left': ['⏳', 'Hourglass not done'],
  income: ['💵', 'Dollar banknote'],
  card: ['💳', 'Credit card'],
  'chart-up': ['📈', 'Chart increasing'],
  'chart-down': ['📉', 'Chart decreasing'],
  target: ['🎯', 'Bullseye'],
  gem: ['💎', 'Gem stone'],
  trophy: ['🏆', 'Trophy'],
  fire: ['🔥', 'Fire'],

  // Actions
  camera: ['📸', 'Camera with flash'],
  mic: ['🎙️', 'Studio microphone'],
  sun: ['☀️', 'Sun'],
  moon: ['🌙', 'Crescent moon'],
  receipt: ['🧾', 'Receipt'],
  bulb: ['💡', 'Light bulb'],
  calendar: ['🗓️', 'Spiral calendar'],
  cart: ['🛒', 'Shopping cart'],
  memo: ['📝', 'Memo'],
  pin: ['📌', 'Pushpin'],
  bolt: ['⚡', 'High voltage'],
  key: ['🔑', 'Key'],
  clipboard: ['📋', 'Clipboard'],
  gift: ['🎁', 'Wrapped gift'],

  // Chat
  chat: ['💬', 'Speech balloon'],
  thought: ['💭', 'Thought balloon'],
  brain: ['🧠', 'Brain'],
  wave: ['👋', 'Waving hand', true],
  eyes: ['👀', 'Eyes'],

  // States
  warning: ['⚠️', 'Warning'],
  search: ['🔍', 'Magnifying glass tilted left'],
  offline: ['📡', 'Satellite antenna'],
  party: ['🎉', 'Party popper'],
  check: ['✅', 'Check mark button'],
  hundred: ['💯', 'Hundred points'],

  // Landing / marketing
  rocket: ['🚀', 'Rocket'],
  lock: ['🔐', 'Locked with key'],
  shield: ['🛡️', 'Shield'],
  sparkles: ['✨', 'Sparkles'],
  phone: ['📱', 'Mobile phone'],
  globe: ['🌐', 'Globe with meridians'],
  heart: ['💖', 'Sparkling heart'],
  handshake: ['🤝', 'Handshake'],

  // Generic merchant stand-ins (marketing mock — no real brand logos)
  tv: ['📺', 'Television'],
  store: ['🏪', 'Convenience store'],
  basket: ['🧺', 'Basket'],
  people: ['🫂', 'People hugging'],
};

export const UI_ICON_NAMES = Object.keys(UI_ICONS);

export function uiIconEmoji(name) {
  return UI_ICONS[name]?.[0] ?? '✨';
}

export function uiIconSrc(name) {
  return UI_ICONS[name] ? `/icons3d/${name}.png` : null;
}

const FLUENT_BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

/** Source URL used by the download script. */
export function uiIconSourceUrl(name) {
  const entry = UI_ICONS[name];
  if (!entry) return null;
  const [, folder, tones] = entry;
  const file = folder.toLowerCase().replace(/ /g, '_');
  const dir = encodeURIComponent(folder);
  return tones
    ? `${FLUENT_BASE}/${dir}/Default/3D/${file}_3d_default.png`
    : `${FLUENT_BASE}/${dir}/3D/${file}_3d.png`;
}
