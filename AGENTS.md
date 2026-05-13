This document serves as a comprehensive Technical Specification and Project Roadmap for **Holocron Sheet Manager**, a web-based character sheet assistant for the Star Wars WEG/WoD hybrid system.

---

# AGENTS.md

## 1. Project Overview

A modular React-based application designed to digitize, manage, and automate character sheets for a Star Wars conversion of the World of Darkness (WoD) system. The application prioritizes local-first data persistence and modularity to accommodate diverse templates (Sentients, Droids, Vehicles).

**Development Routes:**

- `/` - Main application (blank for now)
- `/storybook` - Component playground (manual route for testing atomic components during development)

## 2. Tech Stack

- **Package Manager:** yarn@1.22.22
- **Build Tool:** Vite
- **Frontend:** React 19+ (Functional Components, Hooks)
- **Language:** TypeScript (Strict mode)
- **State Management:** **Zustand** (Lightweight, ideal for nested character states)
- **Styling:** Tailwind CSS + **Shadcn/UI** (Radix UI)
- **Form Handling:** React Hook Form + **Zod** (Schema validation for JSON import/export)
- **Icons:** Lucide-react
- **Persistence:** LocalStorage (initial), IndexedDB via **localForage** (for scalability)
- **Code Quality:** ESLint (Airbnb/Strict), Prettier

Это отличное решение. Для проекта, который строится на «модульных улучшениях» и кастомных UI-элементах (вроде специфических шкал здоровья или точек параметров), **Storybook** является индустриальным стандартом. Он позволит тебе тестировать логику компонентов (например, переключение «дотсов») в изоляции от основного стора и бизнес-логики.

Ниже — обновленный и дополненный раздел для `AGENTS.md`, который включает инфраструктуру для UI-кита и дебага.

---

### Update for AGENTS.md

## 2.1. Tooling & Development Environment

- **Component Sandbox:** **Storybook 8+** (Vite-native).
- **Documentation:** **TypeDoc** (for generating documentation from TS comments, optional but useful for complex systems).
- **Testing:** **Vitest** + **React Testing Library** (for logic validation of "Smart" calculations).
- **Visual Regression:** **Chromatic** (optional) or simple snapshot testing in Storybook.

## 3. Project Structure

```text
/context            # Game reference materials (PDFs, docs, character sheets)
  - `Star_Wars_WEG_to_WoD_Conversion.md` — Full text of the source PDF (auto-converted). **Warning:** ~11,000 lines with conversion artifacts (broken tables, orphaned symbols). Use `grep` to locate specific sections rather than reading sequentially.
/src
  /assets          # Static assets (fonts, Star Wars UI textures)
  /components      # Atomic UI components (Buttons, Inputs, Progress Bars)
    /ui            # Shadcn/Radix components
    /shared        # App-specific shared components (StatBlock, AttributeRow)
  /features        # Modular business logic
    /sheet         # Character sheet rendering and editing
    /manager       # Library view, character switching, CRUD
    /dice          # Dice roller integration logic
    /automation    # Calculated stats (Smart Assistant)
  /hooks           # Custom hooks (useCharacter, useLocalStorage)
  /store           # Zustand stores (useCharacterStore, useAppStore)
  /templates       # Config files for different sheet types (Character, Droid, Ship)
  /types           # TypeScript interfaces and Zod schemas
  /utils           # Math helpers, JSON parsers, Dice logic

```

## 4. Code Quality & Linting

After making code changes, always run the following commands:

```bash
# Run ESLint to check for issues
yarn lint

# Auto-fix ESLint issues
yarn lint:fix

# Check code formatting with Prettier
yarn format:check

# Auto-format code with Prettier
yarn format

# Run full type check
yarn typecheck
```

**Prettier Settings:**

- `semi: true`
- `singleQuote: true`
- `tabWidth: 2`

---

## 5. Development Roadmap

### Phase 1: Core Character Engine (MVP)

- **Objective:** Functional digital sheet for a standard character with import/export.
- **Tasks:**
- Define `BaseCharacter` TypeScript interface based on the provided PDF/Image.
- Implement **React Hook Form** for data entry (Attributes, Skills, Health levels).
- Develop `JsonHandler` utility for downloading/uploading character state.
- Auto-save to `localStorage` on every change with debouncing.

- **Format:** Standard "Dots" UI for WoD-style attributes.

### Phase 2: Template Registry & Manager

- **Objective:** Support for multiple characters and non-human templates.
- **Tasks:**
- **Template Engine:** Create a registry where `Droid` and `Vehicle` templates extend the `BaseCharacter` schema.
- **Library Dashboard:** A sidebar or home screen to list saved characters from IndexedDB.
- **Dynamic Rendering:** The UI should adapt based on the `templateType` property (e.g., Droids might lack "Medicine" but have "Repair").

### Phase 3: The "Smart" Assistant & Dice

- **Objective:** Automation and interactive play features.
- **Calculated Stats:**
- Auto-derive **Initiative** (Dexterity + Wits equivalent).
- Dynamic **Health Penalties** (applying -1, -2, etc., to dice pools based on current health track).
- **Force Pool/Willpower** trackers with reset logic.

- **Dice Integration:**
- Implement a bridge to the [3D Dice Roller](https://github.com/3d-dice/dice-box-threejs) as `@3d-dice/dice-box-threejs` package.
- Click-to-roll functionality: clicking a Skill name triggers a roll event that passes `(Attribute + Skill)` as the dice pool to the roller.

---

## 6. Technical Specifications

### Data Schema (Draft)

```typescript
interface Character {
  id: string;
  metadata: {
    name: string;
    type: 'sentient' | 'droid' | 'vehicle';
    template: string;
  };
  attributes: Record<string, number>; // e.g., Strength: 3
  skills: Record<string, number>; // e.g., Blaster: 2
  health: {
    current: number;
    max: number;
    penalties: boolean;
  };
  inventory: Item[];
  notes: string;
}
```

### Key Logic: The "Dice Pool" Bridge

The integration will use a window message or URL params strategy to communicate with the 3D roller, or utilize a local instance of the library if possible.

- **Logic:** `Total Pool = Attribute + Skill + Modifiers - Wound Penalties`.

### Linter & Formatter Config

- **ESLint:** Focus on unused imports and accessibility (A11y).
- **Prettier:** `semi: true`, `singleQuote: true`, `tabWidth: 2`.

---

## 7. Implementation Notes for AI Agents

1. **Strict Typing:** Always generate Zod schemas for the character state to ensure `JSON.parse` doesn't break the app.
2. **Modular Components:** Keep the "Stat Dot" component separate from the "Sheet Column" component to allow for easy layout shifts.
3. **Tailwind Strategy:** Use CSS variables for Star Wars-themed colors (e.g., `--rebel-red`, `--imperial-blue`) for easy skinning.

## 8. Component Library & Pattern System (UI Kit)

To ensure modularity, all UI elements must be developed in isolation before being integrated into the `Sheet` feature.

### 8.1. Atomic Components (Foundations)

- `StatDot`: The primitive for 1-10 value selection.
- `StatLabel`: Typography for skill/attribute names with optional "hover info" (tooltip).
- `TraitRow`: A horizontal flex-row combining `StatLabel` and `StatDot`.
- `ConditionSquare`: Specifically for the Health/Wound track (supports different marks: empty, '/', 'X').

### 8.2. Composite Components (Molecules)

- `AttributeBlock`: A 3x3 or vertical grid of `TraitRows`.
- `InventoryTable`: Modular list for items/weapons.
- `ResourcePool`: Large-scale trackers for Willpower/Force Points.

### 8.3. Storybook Implementation Strategy

- **States:** Every component must have stories for `Default`, `Active`, `Disabled`, and `Error` states.
- **Mock Data:** Use a dedicated `mocks/` folder to provide sample character JSONs for Storybook "Play" functions.
- **Debugging Tool:** Use Storybook's `Controls` addon to manually toggle "Smart Assistant" features (e.g., how the UI reacts when health reaches "Incapacitated").

---

### UI/UX Specification (Phase 1: Digital Datapad)

#### 1. Visual Style

- **Theme:** "Galactic Datapad" (Dark mode by default).
- **Colors:** Deep grays (`#1a1a1a`), accents in "Rebel Orange" or "Holographic Blue".
- **Typography:** Monospaced fonts for stats, clean Sans-serif for labels.

#### 2. Layout Structure

The interface is a single-page responsive container (`max-w-4xl`) mimicking the physical paper sheet.

- **Top Bar (Global Actions):** \* Sticky/Fixed position.
- Buttons: `[ Import JSON ]`, `[ Export JSON ]`, `[ Reset Sheet ]`.

- **Header Section:** \* Input fields for: `Character Name`, `Player`, `Concept`, `Species`, `Rank`.
- **Main Grid (Three-Column Layout on Desktop):**
- **Column 1: Attributes.** Physical (Str, Dex, Stm), Social (Cha, Man, App), Mental (Per, Int, Wit).
- **Column 2: Abilities (Skills).** Grouped by Talents, Skills, and Knowledges.
- **Column 3: Advantages & Stats.** Force Powers, Backgrounds, Virtues.

- **Footer Section:**
- **Health Track:** A list of status levels (Healthy, Bruised, etc.) with checkboxes.
- **Pools:** Large indicators for `Willpower` and `Force Points`.

#### 3. Core Component: `StatDot`

This is the primary interactive element for WoD-style sheets.

- **Behavior:** \* A row of 5 (or 10) circles.
- Clicking the 3rd circle sets the value to 3. Clicking it again (if already 3) could optionaly toggle to 2 or 0 depending on implementation.
- Visuals: Filled circle (`●`) for active, empty circle (`○`) for inactive.

- **Implementation:** Use a generic component `<StatDot value={n} maxValue={5} onChange={...} />`.

#### 4. Import/Export Logic

- **Export:** Serializes the current Zustand store state into a `.json` blob and triggers a browser download: `character_name_timestamp.json`.
- **Import:** A file input that reads the JSON, validates it via **Zod schema**, and hydrates the Zustand store.

---
