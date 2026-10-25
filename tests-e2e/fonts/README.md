# Test fonts

Browser tests draw every page in these fonts (`tests-e2e/fixtures.ts`), so pinned heights match on
every machine whatever its system font. They are Noto Sans 2.015 (variable, with italic) and Noto
Sans Mono, subset to Latin, Cyrillic, and common symbols, under the SIL Open Font License
(`OFL.txt`).

Made with fontTools from the variable fonts of the Noto project:

```sh
pyftsubset 'NotoSans[wght].ttf' --flavor=woff2 --layout-features='*' --output-file=NotoSans.woff2 \
    --unicodes='U+0000-024F,U+0300-036F,U+0400-04FF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2200-22FF,U+2300-23FF,U+2460-24FF,U+2500-25FF,U+2600-26FF,U+FFFD'
```

The same for `NotoSans-Italic[wght].ttf` and `NotoSansMono[wght].ttf`. Changing a font changes
every pinned height: measure them again.
