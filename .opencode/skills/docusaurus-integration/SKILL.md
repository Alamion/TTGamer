---
name: docusaurus-integration
description: Docusaurus 3.10 configuration patterns for this project — Tailwind isolation, Layout wrapper, tsconfig setup, config file formats (CJS), adding pages, navbar, theme swizzles.
---

# Docusaurus Integration Patterns

## Layout Pattern

All Docusaurus pages in `src/pages/` must wrap content in `<Layout>` from `@theme/Layout` to get navbar/footer:

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

`src/@types/docusaurus-theme-augment.d.ts` augments `@theme/Layout` with `title` and `description` props, and `@theme/Heading` with `as` prop.

## Tailwind Isolation

- `@tailwind base` is **not** in `custom.css` — it would reset Docusaurus/Infima styles globally
- `src/css/tailwind-base-reset.scss` provides normalize/reset **scoped to `.tailwind-root`**
- `@tailwind components` and `@tailwind utilities` are global but safe (only apply when class names are used)
- Tailwind `content` in `tailwind.config.cjs` scans both `./src/**` and `./src/sheet_manager/**`
- Module pages import their Tailwind CSS file directly (e.g., `../../css/set_tailwind_styles.css`)

## Config File Formats

- `tailwind.config.cjs` — **must be CommonJS** (`module.exports`) for Docusaurus webpack
- `postcss.config.js` — **must be CommonJS** (`module.exports`) — root `package.json` has no `"type": "module"`
- `docusaurus.config.ts` — ESM (TypeScript, compiled by Docusaurus)

## TypeScript Configuration

- `tsconfig.json` — solution file, references `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` — extends `@docusaurus/tsconfig`, sets `baseUrl: "."` and `paths: { "@site/*": ["./*"] }`
- Docusaurus virtual modules (`@theme/*`, `@site/*`, `@docusaurus/*`) are typed via `@docusaurus/module-type-aliases`

## Adding a New Page

1. Create file in `src/pages/` (e.g., `src/pages/my_page.tsx`)
2. Wrap content in `<Layout>` from `@theme/Layout`
3. Add navbar link in `docusaurus.config.ts` → `themeConfig.navbar.items`
