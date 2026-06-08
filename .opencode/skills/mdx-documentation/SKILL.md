---
name: mdx-documentation
description: MDX documentation conventions for this project — admonition syntax, cross-references, dice notation, attribute/skill formatting, and UI element conventions.
---

# MDX Documentation Conventions

## Admonitions

Use bracket syntax for titles: `:::type[Title]` NOT `:::type Title`:

```mdx
:::tip[Before you begin]
Open the [Character Sheet](/universal_sheet) in a new tab.
:::

:::note[Difficulty reference]
Standard difficulty is 6.
:::

:::caution[Soaking Lethal damage]
PCs always lose at least 1 Health level.
:::

:::info[The 80/20 rule]
This guide covers 20% of rules for 80% of gameplay.
:::
```

## Cross-References

Use relative links: `[Dice Pools](../core-rules/dice-pools.mdx)` — never absolute.

## Text Formatting

| Element               | Format                     | Example                                |
| --------------------- | -------------------------- | -------------------------------------- |
| Dice notation         | `` `3d6` ``, `` `4d6+1` `` | inline code                            |
| Attribute/skill names | **bold**                   | **Dexterity**, **Blaster**             |
| Character examples    | _italic_                   | _Jax Vorn_                             |
| UI elements           | `` `inline code` ``        | click **New**, fill the **Name** field |
