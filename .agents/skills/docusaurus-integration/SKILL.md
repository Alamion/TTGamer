---
name: docusaurus-integration
description:
    Docusaurus 3.10 configuration patterns for this project — Tailwind isolation, Layout wrapper,
    tsconfig setup, config file formats (CJS), adding pages, navbar, theme swizzles.
---

# Docusaurus Integration Patterns

## Layout Pattern

All Docusaurus pages in `src/pages/` must wrap content in `<Layout>` from `@theme/Layout` to get
navbar/footer:

```tsx
import Layout from '@theme/Layout';

function MyPage() {
    return (
        <Layout title="Page Title" description="Page description">
            <div className="tailwind-root">{/* content */}</div>
        </Layout>
    );
}
```

`src/@types/docusaurus-theme-augment.d.ts` augments `@theme/Layout` with `title` and `description`
props, and `@theme/Heading` with `as` prop.

## Tailwind Isolation

- Tailwind's preflight is **not** imported — it would reset Docusaurus/Infima styles globally
- `src/css/set_tailwind_styles.css` holds the normalize/reset **scoped to `.tailwind-root`**, in the
  `base` layer (`tailwind-theming` skill explains why)
- `custom.css` emits utilities as `.tailwind-root { @tailwind utilities }`: global but safe (they
  only apply under the root and when class names are used); `@source` there scans `src` and `docs`
- Module pages import their Tailwind CSS file directly (e.g., `../../css/set_tailwind_styles.css`)

## Config File Formats

- `postcss.config.js` — **must be CommonJS** (`module.exports`) — root `package.json` has no
  `"type": "module"`
- `docusaurus.config.ts` — ESM (TypeScript, compiled by Docusaurus)

## TypeScript Configuration

- `tsconfig.json` — solution file, references `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` — carries Docusaurus's options itself and `paths: { "@site/*": ["./*"] }`; it
  does not extend `@docusaurus/tsconfig`, whose `baseUrl` TypeScript 7 rejects (spec 029)
- Docusaurus virtual modules (`@theme/*`, `@site/*`, `@docusaurus/*`) are typed via
  `@docusaurus/module-type-aliases`

## Adding a New Page

1. Create file in `src/pages/` (e.g., `src/pages/my_page.tsx`)
2. Wrap content in `<Layout>` from `@theme/Layout`
3. Add navbar link in `docusaurus.config.ts` → `themeConfig.navbar.items`
