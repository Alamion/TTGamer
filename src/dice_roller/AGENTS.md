# Dice Roller Module

## File Structure

```
src/dice_roller/
├── dice-logic/               # Core dice engine (pure logic, no UI)
│   ├── dice-lexer.ts         # Tokenizer (moo, 22 token types)
│   ├── dice-parser.ts        # AST parser (shunting-yard)
│   ├── dice-evaluator.ts     # AST evaluator (all modifiers)
│   ├── dice-roller.ts        # High-level roll orchestration
│   ├── roll-orchestrator.ts  # 3D → Roll Engine coordination
│   ├── notation-utils.ts     # Notation manipulation (ADV/DIS, increment)
│   ├── types.ts              # DiceNotation AST types
│   ├── errors.ts             # Custom errors
│   ├── utils.ts              # Internal helpers
│   ├── renderer/             # 3D visualization (Three.js + Cannon-es)
│   │   ├── scene.ts, physics.ts, renderer.ts, factory.ts, ...
│   │   ├── sound-manager.ts, shapes.ts, geometries.ts, resource.ts
│   │   └── renderer-pool.ts
│   └── index.ts              # Public API exports
├── components/
│   ├── DiceRollerContext.tsx  # Provider (settings, history, roll fn)
│   ├── DicePanel.tsx          # Main panel entry point
│   ├── SettingsPanel.tsx      # Settings UI
│   ├── RollHistory.tsx        # History (All/Favorites/Recent tabs)
│   ├── dice-config.ts         # Die face config
│   ├── dice_pool/            # Tabbed dice UI
│   │   ├── DicePool.tsx       # Tab switcher + editor + Roll/Clear
│   │   ├── DiceButton.tsx     # Single die button
│   │   ├── DiceTabStandard.tsx # Standard dice grid
│   │   ├── DiceTabDnd.tsx     # D&D dice grid + ADV/DIS
│   │   └── DiceTabWod.tsx     # WoD difficulty slider + d10
│   ├── 2d_dices/             # 2D dice SVG rendering
│   │   ├── DiceSvg.tsx, index.ts, utils.tsx
├── utils/
│   ├── settings.ts            # Settings CRUD + subscriptions
│   ├── events.ts              # Event system (roll trigger)
│   ├── commands.ts            # Slash commands (/roll, /r)
│   ├── macros.ts              # {{ddroll::}} macro
│   ├── function-tools.ts      # AI function tools
│   ├── logging.ts             # Logging (debug/info/warn/error)
│   ├── constants.ts           # Module constants
│   ├── types-ext.ts           # Extended types (HistoryEntry, etc.)
│   ├── body-injection.tsx     # React root injection
│   └── recolor_svg.ts         # SVG recoloring utility
├── styles/                    # SCSS modules
├── global.d.ts                # SillyTavern API types (legacy)
├── styles.d.ts                # SCSS module declarations
└── index.tsx                  # Module entry point
```

## Component Hierarchy

```
DicePanel
  └── DiceRollerProvider  (context: settings, history, favorites, notationInput)
      ├── DicePool        (tab switcher + notation editor + Roll/Clear + favorite star)
      │   ├── DiceTabStandard  (dice grid)
      │   ├── DiceTabDnd      (dice grid + ADV/DIS)
      │   └── DiceTabWod      (difficulty slider + d10, owns wodDifficulty state)
      └── RollHistory     (3 tabs: All/Favorites/Recent, click-to-set, reroll, expand)
```

## State Management (Context/Provider)

`DiceRollerProvider` wraps the panel, provides via `useDiceRoller()`:

- `settings` — reactive `DiceRollerSettings`
- `history` — `HistoryEntry[]` per-chat, persisted
- `favorites` — `FavoriteNotation[]`, persisted
- `notationInput` — shared between editor and history
- `roll()`, `clearHistory()`, `toggleFavorite()`, `toggleExpand()`, `setActiveTab()`

## Settings

```typescript
interface DiceRollerSettings {
    enable3dDice: boolean;
    injectResult: boolean;
    sendAsChatMessage: boolean;
    showDiceButton: boolean;
    functionTool: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
    enableSound: boolean;
    soundVolume: number; // 0-100
    timeToReact: boolean;
    timeToReactSeconds: number; // 1-60
}
```

## Dice-Logic Architecture (Core Engine)

The engine follows: **Lexer → Parser → Evaluator → Orchestrator**

1. `tokenize()` — moo-based lexer, 22 token types
2. `parseToAST()` — produces AST (handles modifier precedence)
3. `evaluateDiceAST()` — evaluates AST with all modifiers applied
4. `roll-orchestrator.ts` — coordinates Roll Engine (source of truth) with Render Engine (3D visualization)

**Key separation:** Roll Engine produces final `RollResult`; Render Engine (`renderer/`) is pure 3D visualization — never modifies results.

For deep reference (modifier evaluation order, lexer/parser rules, MockRandom consumption order, Render Engine details), load:

```
.opencode/skills/dice-logic/SKILL.md
```

## Key Patterns

- **Public API:** import from `./dice-logic` (barrel exports in index.ts)
- **External roll trigger:** `triggerRoll(notation)` from `utils/events`
- **Logging:** `debug/info/warn/error` from `utils/logging`
- **Settings access:** `getSettings()` returns copy; `getRollConfig()` returns roll-relevant subset
