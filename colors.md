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
