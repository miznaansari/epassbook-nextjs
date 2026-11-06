/**
 * Stroke icons from the MonthlyMoney redesign mockups (24px grid, 1.8 stroke,
 * round caps). Paths marked "mockup" are copied verbatim from
 * Artifacat/*.dc.html; the rest are drawn in the same style.
 */
const ICONS = {
  // --- mockup ---
  wallet: (<><path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M3 7l12-3v3" /><circle cx="16.5" cy="13.5" r="1" /></>),
  home: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>),
  passbook: (<><path d="M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2z" /><path d="M9 8h6" /></>),
  stocks: (<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  sparkle: (<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />),
  grid: (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
  bell: (<><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><path d="M10 21h4" /></>),
  camera: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  trend: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>),
  bag: (<><path d="M6 8h12l1 12H5z" /><path d="M9 8a3 3 0 016 0" /></>),
  person: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>),
  food: (<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 2-2 6 0 8v10" />),
  calendar: (<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  phone: (<><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>),
  love: (<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />),
  cash: (<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>),
  repeat: (<path d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M18 3v4h-4M6 21v-4h4" />),
  download: (<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  pencil: (<path d="M4 20h4L19 9l-4-4L4 16z" />),

  // --- same style, not in the mockup ---
  house: (<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>),
  code: (<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M3 12h2.5M18.5 12H21M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>),
  logout: (<><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>),
  close: (<path d="M6 6l12 12M18 6L6 18" />),
  chevron: (<path d="M9 6l6 6-6 6" />),
  panelClose: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15.5 10l-2 2 2 2" /></>),
  panelOpen: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M13.5 10l2 2-2 2" /></>),
  arrow: (<path d="M5 12h14M13 6l6 6-6 6" />),
  refresh: (<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" />),
  alert: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>),
  cart: (<><path d="M3 4h2l2.4 11h10.2L20 8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></>),
  tag: (<><path d="M3 12V4h8l9 9-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>),
  car: (<><path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /><path d="M9.5 17h5M3 12h18" /></>),
  bolt: (<path d="M13 3L5 14h6l-1 7 8-11h-6z" />),
  heart: (<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />),
  film: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" /></>),
  book: (<><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>),
  card: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  spinner: (<path d="M12 3a9 9 0 109 9" />),
  check: (<path d="M5 12l5 5 9-10" />),
  select: (<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></>),
  trash: (<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  chevronDown: (<path d="M6 9l6 6 6-6" />),
};

export default function LineIcon({ name, size = 20, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {ICONS[name] || ICONS.grid}
    </svg>
  );
}
