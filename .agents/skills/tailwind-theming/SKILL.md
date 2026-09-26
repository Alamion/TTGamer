---
name: tailwind-theming
description: Tailwind CSS theme configuration, CSS variables, dark mode, and color palette for the Star Wars WEG/WoD TTRPG project.
---

# Theme & Styling

## CSS Variables

Defined in `src/css/custom.css`:

| Variable           | Value         | Usage                   |
| ------------------ | ------------- | ----------------------- |
| `--primary`        | `220 38 38`   | Accent / rebel red      |
| `--secondary`      | `202 138 4`   | Secondary / droid gold  |
| `--bg-base`        | `245 245 249` | Page background         |
| `--bg-surface`     | `249 249 255` | Card/surface background |
| `--text-primary`   | `15 23 42`    | Primary text            |
| `--text-secondary` | `71 85 105`   | Secondary text          |
| `--border`         | `226 232 240` | Borders                 |
| `--error`          | `185 28 28`   | Error states            |
| `--warning`        | `245 158 11`  | Warning states          |
| `--info`           | `2 132 199`   | Info states             |
| `--success`        | `21 128 61`   | Success states          |

## Accent Roles

- **Primary** (red) and **secondary** (gold) carry every accent: selection, focus, pressed
  states, active tabs, badges, section bars. Prefer them wherever a color marks something.
- **Tertiary** (violet, `--editor` today; T-081 renames it) is reserved for edge cases a user
  must tell apart from ordinary accents — for example something added automatically on the
  user's behalf. Never use it as the default accent of a surface, including the template editor.
- Semantic colors (`error`, `warning`, `success`, `info`) mean state, not decoration.

## Dark Mode

Dark mode overrides `--bg-base`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border` via `[data-theme='dark']` selectors in `custom.css`.

## Star Wars Palette

Values live in `src/css/custom.css`; current RGB triplets:

| Variable            | Value         |
| ------------------- | ------------- |
| `--sw-jedi-blue`    | `0 153 255`   |
| `--sw-jedi-green`   | `0 255 64`    |
| `--sw-jedi-violet`  | `150 0 255`   |
| `--sw-jedi-red`     | `255 0 0`     |
| `--sw-empire-grey`  | `170 175 180` |
| `--sw-empire-black` | `20 20 20`    |
| `--sw-empire-white` | `240 240 245` |
| `--sw-droid-gold`   | `212 175 55`  |
| `--sw-droid-orange` | `255 127 0`   |
| `--sw-droid-rust`   | `210 180 140` |
| `--sw-mandalorian`  | `0 153 255`   |
| `--sw-hyperjump`    | `220 240 255` |

## Block Colors (Sheet Manager)

Sheet blocks use the shared `AccentColor` prop (`'primary' | 'secondary'`), mapped in
`CollapsibleBlock.tsx` to `bg-primary` / `bg-secondary` markers. There are no
`hologram-blue`/`cyber-yellow`-style utility classes; use the theme tokens above.

## Tailwind Classes

Use `clsx` for conditional classes. All custom color values are configured in `tailwind.config.cjs` under `theme.extend.colors`.
