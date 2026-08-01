# TOFIX — Cross-Cutting Issues

**Version:** 3.0.0
**Last updated:** June 2026

## Legend

| Icon        | Meaning                                     |
| ----------- | ------------------------------------------- |
| 🟠 Critical | Data corruption, crash, or major UX failure |
| 🟡 High     | Significant code smell, refactor needed     |
| 🟢 Medium   | Minor code quality issue                    |
| ⬜ Low      | Nitpick / nice-to-have                      |
| ✅ DONE     | fully implemented                           |

---

## 🟠 Critical

### Replace client-side Discord webhook with backend proxy

The Discord webhook URL is stored in `sessionStorage` and sent directly from the client via `fetch()`. This exposes the webhook URL to browser DevTools. Must be replaced with a backend proxy endpoint once a proper server is available.

**Files involved:**

- `src/external_apis/discord/sendToDiscord.ts`
- `src/dice_roller/store/diceRollerStore.ts`
- `src/dice_roller/components/DiceRollerSettingsModal.tsx`
- `src/dice_roller/components/DiscordWebhookSubscription.tsx`

**Fix:** Remove `sendToDiscordWebhook` client call. POST to own backend (e.g. `/api/discord/roll`) which proxies the message to Discord, keeping webhook token server-side.

---

## 🟡 High

### DataCatalog URL parameter init race condition

`DataCatalog.tsx` splits URL param initialisation across `useLayoutEffect` (first render) and `useEffect` (subsequent navigations) using a `firstRender` ref. This is fragile under React 19 concurrent features. Needs careful rework as it interacts with Docusaurus's own navigation/routing lifecycle.

**Files:** `src/shared/components/DataCatalog.tsx:355-368`

---

## 🟢 Medium

### Multi-file import toasts may fire out of order

`SheetLayout.tsx` uses `Array.from(files).forEach()` with async `FileReader` callbacks. When importing multiple files, the toast notifications may not appear in file order.

**File:** `src/sheet_manager/features/sheet/components/SheetLayout.tsx:60-78`

### `'Implant'` type added to `MeritFlawEntry.type` union

`src/data/meritsFlawsData.ts:13` — `type: 'Merit' | 'Flaw' | 'Implant'`. Existing code filtering by `type === 'Merit'` or `type === 'Flaw'` still works, but exhaustive-type-check consumers may miss the new variant.

---

## ✅ Done (previously tracked, now resolved)

- Close button on roll log — DONE
- Flip roll history order, auto-expand latest, add `Result: ` line — DONE
- Add d6 to WoD tab — DONE
- Fix export/import — DONE
- Force skills default to 0 — DONE
- Backgrounds and custom items resetting value on label change — DONE
- DataCatalog filter select losing tag — DONE
- Force point cost filters incorrect — DONE
- Document Passion consuming dark side resistance — DONE
- Document Force skills as attribute cards — DONE
- Merits & Flaws not automatic at character creation — DONE
- DiscordWebhookSubscription `includeRollContext` ternary dead branch — DONE
- sessionStorage stat label race condition — DONE: atomic `takeStatLabels()` (read+clear in one operation) + explicit clear when `rollOptions.statLabels` provided
- RollControls `toggleCharacterStats` both-toggles-same-value — DONE: reframed as explicit "anonymize rolls" toggle (turns both `includeCharacterName` + `includeCharacterStats` off/on together, indicator reflects anonymized state)
- RollControls right-click title mismatch — DONE: title now reads "anonymize rolls"
- DiscordWebhookSubscription stale `includeRollContext` closure — DONE: reads closure value, added to effect deps
- `useCharacter` recreating `updateCharacter` per character change — DONE: stable callback via refs, guards read fresh values at call time
- CharacterManagerModal blank name for unnamed characters — DONE: verified `|| 'New Character'` already works (no code change needed)
- ForceBlock no clamping on willpower/forcePoints — DONE: clamped to `[0, 10]` / `[0, forcePoints.max]`
- RollHistory expand/collapse for favorites/recent — MOVED to `src/dice_roller/TODO.md` (design decision, not a bug)
- BaseBlock `.tsx` extension import — DONE: extension removed for consistency
- Discord button not re-rendering when webhook URL changes — DONE: `useSessionStorageState` now syncs across component instances in the same tab (module-level pub/sub), so `RollControls`/`DiscordWebhookSubscription` update immediately when the URL is set/cleared in the settings modal
