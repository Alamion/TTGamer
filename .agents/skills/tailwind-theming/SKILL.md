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
| `--bg-base`        | `24 245 249`  | Page background         |
| `--bg-surface`     | `255 255 255` | Card/surface background |
| `--text-primary`   | `15 23 42`    | Primary text            |
| `--text-secondary` | `71 85 105`   | Secondary text          |
| `--border`         | `226 232 240` | Borders                 |
| `--error`          | `185 28 28`   | Error states            |
| `--warning`        | `245 158 11`  | Warning states          |
| `--info`           | `2 132 199`   | Info states             |
| `--success`        | `21 128 61`   | Success states          |

## Dark Mode

Dark mode overrides `--bg-base`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border` via `[data-theme='dark']` selectors in `custom.css`.

## Star Wars Palette

| Variable            | Value | Usage        |
| ------------------- | ----- | ------------ |
| `--sw-jedi-blue`    | —     | Jedi blue    |
| `--sw-jedi-green`   | —     | Jedi green   |
| `--sw-jedi-violet`  | —     | Jedi violet  |
| `--sw-jedi-red`     | —     | Jedi red     |
| `--sw-empire-grey`  | —     | Empire grey  |
| `--sw-empire-black` | —     | Empire black |
| `--sw-empire-white` | —     | Empire white |
| `--sw-droid-gold`   | —     | Droid gold   |
| `--sw-droid-orange` | —     | Droid orange |
| `--sw-droid-rust`   | —     | Droid rust   |
| `--sw-mandalorian`  | —     | Mandalorian  |
| `--sw-hyperjump`    | —     | Hyperjump    |

## Block Colors (Sheet Manager)

| Section         | Color  | Tailwind class                              |
| --------------- | ------ | ------------------------------------------- |
| Attributes      | Blue   | `text-hologram-blue`                        |
| Skills          | Yellow | `text-cyber-yellow`                         |
| Advantages      | Red    | `text-rebel-red`                            |
| Force/Willpower | Blue   | `text-hologram-blue` / `text-imperial-blue` |

## Tailwind Classes

Use `clsx` for conditional classes. All custom color values are configured in `tailwind.config.cjs` under `theme.extend.colors`.
