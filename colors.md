# Visual Color Guide - Manage Monthly Money

This document outlines the premium design token variables and colors used throughout the **Manage Monthly Money** AI-powered E-Passbook. The theme leverages a futuristic, dark-mode glassmorphic interface with vibrant neon accents.

| Category | Type | Purpose | Brand Color Name | Light HEX | Dark HEX | Tailwind Classes |
|:---|:---|:---|:---|:---|:---|:---|
| **Salary** | Income | Month-wise salary inflow | Emerald Green | `#10B981` | `#34D399` | `bg-emerald-500` / `text-emerald-400` |
| **Spending** | Expense | Outflow tracking | Rose Red | `#F43F5E` | `#FB7185` | `bg-rose-500` / `text-rose-400` |
| **Lending** | Receivable | Money lent to others | Neon Blue | `#3B82F6` | `#60A5FA` | `bg-blue-500` / `text-blue-400` |
| **Loan** | Payable / Debt | Money borrowed | Safety Orange | `#F97316` | `#FB923C` | `bg-orange-500` / `text-orange-400` |
| **Balance** | Overall KPI | Current liquid balance | Electric Purple | `#8B5CF6` | `#A78BFA` | `bg-violet-500` / `text-violet-400` |
| **Advance** | Inflow Balance | Advance salary / deposit | Neon Cyan | `#06B6D4` | `#22D3EE` | `bg-cyan-500` / `text-cyan-400` |

---

## Tailwind Configuration Integration

To ensure unified styling, these colors are configured inside the application style definitions. In `/app/globals.css`, these values are registered under custom CSS variables, e.g.:

* `--salary`: `160 84% 39%` (Emerald)
* `--spending`: `343 89% 60%` (Rose)
* `--lending`: `217 91% 60%` (Blue)
* `--loan`: `24 95% 53%` (Orange)
* `--balance`: `262 83% 58%` (Purple)
* `--advance`: `189 94% 43%` (Cyan)

All dashboard panels, drawer highlights, Recharts data nodes, and AI response highlights dynamically reference these design tokens.
