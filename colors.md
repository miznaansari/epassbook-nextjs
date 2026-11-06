# MonthlyMoney design tokens

Source of truth: `app/globals.css`. Light values live in the `@theme` block; `.dark` / `[data-theme="dark"]` overrides the same variables. Every token is a Tailwind utility: `bg-card`, `text-ink-2`, `border-line`, `bg-primary`, `text-secondary-ink`, `shadow-card`, …

## Brand
| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#4F46E5` | `#818CF8` | Main buttons, links, focus, active nav |
| `primary-hover` | `#4338CA` | `#A5B4FC` | Hover state |
| `primary-fg` | `#FFFFFF` | `#0B0D14` | Text on `primary` |
| `primary-soft` / `primary-ink` | `#EEF2FF` / `#4338CA` | indigo 14% / `#C7D2FE` | Tinted chips, active rows, user chat bubbles |
| `secondary` | `#F59E0B` | `#FBBF24` | "Add" / AI / scan actions, highlights |
| `secondary-fg` | `#1F1300` | `#1F1300` | Text on `secondary` |
| `secondary-soft` / `secondary-ink` | `#FFF7E6` / `#B45309` | amber 14% / `#FCD34D` | Badges, tinted icon tiles |

## Surfaces, text, lines
| Token | Light | Dark |
|---|---|---|
| `canvas` / `canvas-2` | `#F6F7FB` / `#EEF0F7` | `#0B0D14` / `#10131C` |
| `card` / `card-2` / `card-3` | `#FFFFFF` / `#F8F9FC` / `#EEF1F7` | `#141824` / `#1A1F2E` / `#232A3B` |
| `ink` / `ink-2` / `ink-3` | `#0F172A` / `#475569` / `#8590A6` | `#F1F3F9` / `#A3ABBD` / `#6B7488` |
| `line` / `line-strong` | `#E4E7EF` / `#CBD2E1` | `#232838` / `#323A4E` |

## Status
`success`, `danger`, `warning`, `info`, each with `-soft` (tinted background). Use `success-ink` / `danger-ink` for **text** (light-mode contrast ≥ 4.5:1); the base colour is for icons and marks.

## Elevation and shape
`shadow-card`, `shadow-pop`, `shadow-glow-primary`, `shadow-glow-secondary`, `--radius-card` (1.25rem). Brand surfaces: `.bg-hero` (indigo gradient + amber glow), `.text-gradient-brand`. Display font: `.font-display` (Plus Jakarta Sans).

## Contrast (checked)
Body text `ink`/`ink-2` on any surface: 6.2–17.5:1. `primary-fg` on `primary`: 6.3–6.5:1. `secondary-fg` on `secondary`: 8.5–10.9:1. `ink-3` (meta text only): ≥ 3:1.

## Chart series (cycle comparison)
Light `#5E6AD2 #eb6834 #1baf7a #eda100`, dark `#727cf0 #d95926 #199e70 #c98500` (`components/reports/chartTheme.js`), CVD-validated with the dataviz validator.

## Finance semantics (legacy pages)
`salary`, `spending`, `lending`, `loan`, `balance`, `advance` as `hsl(var(--x))`.

## Legacy pages
Old token names (`--background-elevated`, `--foreground-muted`, `--border-default`, …) are aliases of the tokens above. Hardcoded dark hex classes are remapped in `globals.css` ("LEGACY CLASS REMAPS"). Rebuilt surfaces set `data-ui="v2"` on their root to opt out of those remaps.

## 3D icons
UI icons: `components/ui/Icon3D.jsx` + `lib/uiIcons.js` (files in `public/icons3d/`, fetched with `node scripts/fetch-ui-icons.mjs`). Spend item icons: `lib/spendIcons.js` (stored in R2).

## Dashboard redesign tokens (`--mm-*`)
The dashboard, the E-Passbook and the navigation (sidebar, mobile app bar, dock, drawer) use the exact mockup colours from `Artifacat/*.dc.html` as plain CSS variables (`:root` = light, `.dark` / `[data-theme="dark"]` = matched dark values), used as `bg-(--mm-card)`, `text-(--mm-ink)`, etc. Mockup classes are ported as `.mm-card`, `.mm-lbl`, `.mm-h2`, `.mm-btn(-amber|-ghost|-soft)`, `.mm-chip`, `.mm-tag`, `.mm-in`, `.mm-nav`, and for the passbook `.mm-seg`, `.mm-ft`, `.mm-tr`, in `@layer components`; put `.mm` on the root for the Plus Jakarta Sans type.
| Token | Light | Use |
|---|---|---|
| `--mm-canvas` / `--mm-card` / `--mm-soft` | `#F6F7FB` / `#FFFFFF` / `#F6F7FB` | Page, cards, soft buttons |
| `--mm-line` / `--mm-line-2` | `#E6E8F0` / `#EEF0F6` | Card borders / row dividers, bar tracks |
| `--mm-ink` / `--mm-ink-2` / `--mm-ink-3` | `#14142B` / `#4B4F66` / `#5B6078` | Text / body / labels |
| `--mm-brand` / `--mm-brand-soft` / `--mm-brand-ink` / `--mm-brand-line` | `#4F46E5` / `#EEF0FF` / `#3730A3` / `#C7CBFF` | Active nav, selected chip |
| `--mm-amber` / `--mm-sparkle` | `#F59E0B` / `#B45309` | New entry + AI dock button / sparkle icon |
| `--mm-hero*` | `#3730A3` bg, `#4A43C4` tiles, `#5B54D6` track, `#FBBF24` bar, `#C7CBFF` muted | Indigo hero (same in both themes) |
| Category series | indigo `#4F46E5`, orange `#EA580C`, green `#10B981`, gold `#F59E0B` (+ `-soft` / `-ink`) | Rank order in donut, breakdown, top items |
| Cycle series `--mm-cycle-0..4` | `#3730A3 #4F46E5 #EA580C #10B981 #F59E0B` | Newest → oldest cycle (chips + bars) |
| `--mm-red-soft` / `--mm-red-ink` | `#FEE2E2` / `#B91C1C` | Increases, spend amounts |
| `--mm-savings-ink` | `#92400E` | Passbook savings tag + amount (on `--mm-gold-soft`) |
| `--mm-seg` / `--mm-ft-on` | `#EAECF5` / `#3730A3` | Passbook Day/Month segmented control / active type filter |

Stroke icons for these surfaces: `components/ui/LineIcon.jsx` (mockup paths verbatim).
