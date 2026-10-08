---
name: tailwind-theming
description:
    Tailwind CSS theme configuration, CSS variables, dark mode, and color palette for the Star Wars
    WEG/WoD TTRPG project.
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

- **Primary** (red) and **secondary** (gold) carry every accent: selection, focus, pressed states,
  active tabs, badges, section bars. Prefer them wherever a color marks something.
- **Tertiary** (violet, `--tertiary`, Tailwind `tertiary`) is reserved for edge cases a user must
  tell apart from ordinary accents — today only the parts the library adds automatically to an
  export or import. Never use it as the default accent of a surface, including the template editor.
- Template editor and library mapping (T-081):

    | Mark                                                   | Class family                                                  |
    | ------------------------------------------------------ | ------------------------------------------------------------- |
    | Selection, selected element frame and chip, drop line  | `primary` (`bg-primary`, `outline-primary`, `border-primary`) |
    | Insertion slot hover, pressed Edit/Preview, active tab | `primary` (`bg-primary/20`, `border-primary`)                 |
    | Hovered element frame, row and menu hover, help notes  | `secondary` (`outline-secondary`, `bg-secondary/10`–`/15`)    |
    | Parts added automatically (export and import)          | `tertiary`                                                    |

- **`primary-muted`** is primary toned toward the surface (`--primary-mute`: 8% light, 30% dark).
  Use it for large or emphatic red fills — primary buttons (New, Save, Create, Move, Import),
  pressed segment switches, the editor's selected-element outline and chip — with `hover:bg-primary`
  for feedback. Plain `primary` stays for thin marks, text, focus rings, and tints (`/10`–`/20`); a
  selected row is a tint plus an inset primary edge, not a solid fill.
- Semantic colors (`error`, `warning`, `success`, `info`) mean state, not decoration.

## Dark Mode

Dark mode overrides `--bg-base`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border`
via `[data-theme='dark']` selectors in `custom.css`.

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

Use `clsx` for conditional classes.

## Where Tailwind Is Configured (Tailwind 4, CSS-first)

There is no JavaScript config. Everything is in `src/css/custom.css`, with `postcss.config.js` only
naming the `@tailwindcss/postcss` plugin:

- **Tokens**: `@theme static { --color-primary-muted: …; }`. The class name is the token name
  (`bg-primary-muted`, `text-bgBase`). To add a color, add one `--color-*` line there (values reuse
  the `--primary`-style channel variables above); the storybook palette lists it automatically.
- **Line heights**: the `@theme` block above it restores Tailwind 3's absolute line heights
  (`--text-sm--line-height: 1.25rem`); v4's unitless ratios shrink inherited line height when a
  child sets its own font size.
- **Scope**: utilities are emitted inside `.tailwind-root { @tailwind utilities … }` (unlayered,
  with `@source` for `src` and `docs`). Do not use Tailwind's global `important`.
- **Reset**: `src/css/set_tailwind_styles.css` holds the reset in `@layer base`. It must stay
  layered: v4's `space-*` and `divide-*` utilities have zero specificity, and an unlayered reset
  (`margin: 0` on every element) cancels them. Unlayered rules in that file (focus border, default
  border colors) deliberately beat utilities as before.
- **Names changed in v4**: bare `rounded`/`shadow`/`blur` are now `-sm`, the old `-sm` is `-xs`,
  `ring` is `ring-3`, `outline-none` is `outline-hidden`, `flex-shrink`/`flex-grow` are
  `shrink`/`grow`, `bg-gradient-to-*` is `bg-linear-to-*`. `hover:` applies only on hover-capable
  devices; `dark:` follows the OS setting, not `data-theme`.
