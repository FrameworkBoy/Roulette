# Code Cleanup & Audit

> **Working rule:** Do one item at a time. Mark it `[x]` as soon as it is done before moving to the next.

---

## Priority Order

| # | Item | Section |
|---|---|---|
| 1 | Hooks violation in `AppTextInput` — `useRef` inside conditional | Components |
| 2 | `XLSX.write` wrong cast in `AdminPanelScreen` — runtime crash on export | Services |
| 3 | No-prize modal always says "Parabéns!" in `RouletteScreen` | Screens |
| 4 | `MIN_TO_WIN` duplicated in `QuizScreen` and `ResultScreen` | Config |
| 5 | `UNITS` data duplicated with divergent shapes across two screens | Screens |
| 6 | Dead files — `Roulette.tsx`, `RouletteImage.tsx`, `prizes.json` | Structure |
| 7 | `as any` casts in `flowNavigation.ts` | Navigation |
| 8 | Colors / style token inconsistencies | Styles |
| 9 | Quote style inconsistency — mixed single/double quotes | Imports |
| 10 | Unused `useRef` import in `InactivityContext.tsx` | Types |

---

## Todo List

- [x] **1. Fix Rules of Hooks violation in `AppTextInput.tsx`**
  Move `useRef` and `useImperativeHandle` out of the `if (!APP_CONFIG.virtualKeyboard)` conditional to the top of the component. Only the JSX should branch on the config flag.
  `src/components/AppTextInput.tsx:143`

- [x] **2. Fix wrong `XLSX.write` cast in `AdminPanelScreen.tsx`**
  `XLSX.write` with `type: 'array'` returns `number[]`, not `Uint8Array`. Fix with `new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))` or switch to `type: 'buffer'`.
  `src/screens/AdminPanelScreen.tsx:136`

- [x] **3. Fix no-prize modal in `RouletteScreen.tsx`**
  Modal always shows "Parabéns! Você ganhou [prize]!" even when prize is "Que pena!" (no prize). Add a branch the same way `RouletteCode` handles `isNoPrize`.
  `src/screens/RouletteScreen.tsx:41-46`

- [x] **4. Extract `MIN_TO_WIN` and quiz constants to `src/config/quiz.ts`**
  `MIN_TO_WIN = 3` is declared in both `QuizScreen.tsx:21` and `ResultScreen.tsx:11`. A mismatch silently breaks eligibility. Also extract `TOTAL = 5` and `REVEAL_DELAY = 900` into the same file.
  `src/screens/QuizScreen.tsx:21`, `src/screens/ResultScreen.tsx:11`

- [x] **5. Unify `UNITS` data into a single shared source**
  `PostInteractionScreen.tsx` defines `{ id, label, url }` and `UnitsScreen.tsx` defines `{ id, name, address, video }` — same real-world units, divergent shapes. Extract to `src/config/units.ts` or `src/data/units.ts` and have each screen pick the fields it needs.
  `src/screens/PostInteractionScreen.tsx:10-21`, `src/screens/UnitsScreen.tsx:11-24`

- [x] **6. Remove dead files**
  Delete `src/components/Roulette.tsx`, `src/components/RouletteImage.tsx`, and `src/data/prizes.json`. None are imported anywhere. `RouletteCode.tsx` is the active component.

- [x] **7. Remove `as any` casts from `flowNavigation.ts`**
  Type `BLOCK_ENTRY` as `Record<BlockId, keyof RootStackParamList>` and build a type-safe navigate call. Eliminates the three `as any` casts at lines 30, 33, 42. Also type the `'Units'` fallback as `keyof RootStackParamList`.
  `src/navigation/flowNavigation.ts:30,33,42`

- [x] **8. Fix color token inconsistencies**
  - Replace `'#ffffff'` with `Colors.textOnPrimary` in `HomeScreen`, `ResultScreen`, `RouletteScreen`, `UnitsScreen`, `PostInteractionScreen`
  - Replace wheel segment colors `'#E22725'` / `'#1A1A1A'` in `RouletteCode.tsx` with `Colors.primary` / `Colors.surface`
  - Add `Colors.surfaceElevated` for `'#1E1E1E'`/`'#333333'` in `AppKeyboard.tsx`
  - Add `Colors.warning`, `Colors.quiz`, `Colors.info` for the magic hex strings in `AdminPanelScreen.tsx`
  - Extract `CONTENT_MAX_WIDTH = W * 0.85` and `MODAL_MAX_WIDTH = W * 0.8` into `responsive.ts` and replace the five different `W * 0.x` fractions across screens

- [x] **9. Fix quote style inconsistency**
  Add a `.prettierrc` with `"singleQuote": true` and run Prettier across the project. `RegisterScreen`, `RouletteScreen`, `UnitsScreen`, `AdminPanelScreen`, `ResultScreen` use double quotes while all other files use single quotes.

- [x] **10. Remove unused `useRef` import in `InactivityContext.tsx`**
  `useRef` is imported on line 1 but never used.
  `src/context/InactivityContext.tsx:1`

---

## Full Audit Findings

### 1. File & Folder Structure

- Dead files — `Roulette.tsx` and `RouletteImage.tsx` are not imported anywhere (`src/components/`)
- `prizes.json` is unused — active data is in `config/prizes.ts` (`src/data/prizes.json`)
- Naming inconsistency — `storage.ts` is camelCase while siblings are `SessionService.ts`, `PrizeService.ts` (`src/services/`)

### 2. Components

- **Rules of Hooks violation** — `useRef` and `useImperativeHandle` inside a conditional in `AppTextInput.tsx:143`
- `InactivityGuard.tsx` — `controls` object is recreated on every render; needs `useMemo` + `useCallback`
- `InactivityGuard.tsx` — calls `SessionService` directly instead of through `SessionContext`
- `RouletteCode.tsx:125` — key uses string concatenation (`slot.prize.id + i`) which can collide; use `` `${slot.prize.id}-${i}` ``
- `SPIN_DURATION` and `FULL_SPINS` are copy-pasted across `Roulette.tsx`, `RouletteCode.tsx`, `RouletteImage.tsx`
- `AppTextInput.tsx` imports `KeyboardMode` from `AppKeyboard.tsx` internals; should live in `src/types/`

### 3. Screens

- **No-prize modal bug** — `RouletteScreen.tsx:41-46` always congratulates user even on "Que pena!"
- `MIN_TO_WIN = 3` duplicated in `QuizScreen.tsx:21` and `ResultScreen.tsx:11`
- `UNITS` data defined twice with divergent field shapes
- `HomeScreen.tsx:60` — calls `session.recordUnitsScreenView()` from the caller instead of from within `UnitsScreen`'s own `useEffect`
- All `useEffect(..., [])` calls omit `session` from deps (harmless in practice, technically incorrect)

### 4. Navigation

- Three `as any` casts in `flowNavigation.ts:30,33,42`
- `inactivity.ts:15` — config key type is `Record<string, ...>`; should be `Partial<Record<keyof RootStackParamList, ...>>`
- `flowNavigation.ts:25` — fallback screen `'Units'` is an unvalidated magic string

### 5. Services & Context

- **Runtime crash** — `AdminPanelScreen.tsx:136` casts `XLSX.write` result to `Uint8Array` incorrectly
- `PrizeService.ts` redeclares `DayKey` locally — identical to `DayOfWeek` from `config/prizes.ts`
- `SessionService.ts:83` — `isCpfRegistered` loads all sessions to check one CPF (O(n))

### 6. Config Files

- `APP_CONFIG.virtualKeyboard: false` is the checked-in default, but the comment implies `true` is the production/kiosk value
- `MIN_TO_WIN`, `TOTAL`, `REVEAL_DELAY` are file-local magic numbers — should be in `src/config/quiz.ts`
- `prizes.ts` has 5 unresolved `TODO: set per-unit daily limits`

### 7. Types

- `InactivityContext.tsx:1` — `useRef` imported but never used
- `AdminPanelScreen.tsx:192` — `e.metadata.unitId as string` is unsafe; use `String(...)` or a type guard
- `FlowContext` type lives in `flowNavigation.ts` but describes quiz domain state; should be in `src/types/` or `src/config/flow.ts`

### 8. Styles

- `'#ffffff'` used in 5 screens instead of `Colors.textOnPrimary`
- `RouletteCode.tsx` wheel colors bypass `Colors` tokens
- `AppKeyboard.tsx` uses undeclared hex colors
- `AdminPanelScreen.tsx` uses `#F59E0B`, `#7C3AED`, `#2563EB` as magic strings 8+ times
- Five different `W * 0.x` max-width fractions — should be named constants
- `AdminPanelScreen.tsx` styles have zero `scale()` calls (~50 raw pixel values)

### 9. Imports

- `RouletteScreen.tsx` — stray blank line mid-import block
- Mixed quote style — `RegisterScreen`, `RouletteScreen`, `UnitsScreen`, `AdminPanelScreen`, `ResultScreen` use double quotes; everything else uses single quotes
