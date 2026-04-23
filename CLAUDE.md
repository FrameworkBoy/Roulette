# CLAUDE.md — LabToGo

Everything Claude needs to know about this project.

---

## What This Is

A **kiosk/totem application** for the **Nation CT / Total Health** gym chain. It runs on always-on touchscreen tablets or Windows kiosk machines deployed inside gym units. Users walk up, register, answer a quiz, spin a roulette wheel to win a prize, and are directed to gym unit info.

The app is also distributed as a **Windows desktop app via Electron** (Expo web export fed into Electron). There is also a `react-native-windows` integration for native Windows support.

**App name:** LabToGo  
**Package/slug:** lab-to-go  
**Version:** 1.0.5  
**Electron app ID:** `com.nex.labtogo`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (SDK ~54) + React Native 0.81.5 |
| Language | TypeScript (strict) |
| Navigation | `@react-navigation/native` + `@react-navigation/native-stack` (manual, NOT Expo Router) |
| State | React Context only — no Redux/Zustand |
| Storage | `@react-native-async-storage/async-storage` (wrapped in `StorageService`) |
| Video | `expo-av` |
| SVG | `react-native-svg` (roulette wheel) |
| Excel export | `xlsx` library |
| File sharing | `expo-sharing` + `expo-file-system` |
| Desktop | Electron 33 + `electron-builder` (NSIS installer, Windows x64) |
| Web | `react-native-web` |

---

## Scripts

```bash
expo start --dev-client   # local dev
expo start --web          # web/Electron dev
expo run:android          # Android
expo run:ios              # iOS
npx @react-native-community/cli run-windows  # React Native Windows
npm run electron:build    # expo export --platform web && electron-builder --win --x64
```

---

## Project Structure

```
/
├── App.tsx                   # Root — SessionProvider > KeyboardProvider > AppNavigator
├── index.ts                  # registerRootComponent(App)
├── electron/
│   └── main.js               # Electron main process (serves dist/)
├── src/
│   ├── assets/               # nation-logo.png, nation-logo-2.png, *.mp4
│   ├── components/
│   │   ├── AppKeyboard.tsx       # Custom on-screen keyboard (alpha/numeric/email modes)
│   │   ├── AppTextInput.tsx      # Fake text input wired to AppKeyboard
│   │   ├── InactivityGuard.tsx   # Touch listener — shows countdown, resets to Home
│   │   ├── RouletteCode.tsx      # ✅ ACTIVE: SVG roulette wheel (react-native-svg)
│   │   ├── Roulette.tsx          # ⚠️ DEAD: unused image-based variant
│   │   ├── RouletteImage.tsx     # ⚠️ DEAD: unused image-based variant
│   │   ├── ScreenLogo.tsx        # Reusable logo header (size="small"|"large")
│   │   └── VideoModal.tsx        # Full-screen video modal (expo-av)
│   ├── config/
│   │   ├── app.ts            # APP_CONFIG — virtualKeyboard toggle
│   │   ├── flow.ts           # FLOW — ordered list of active building blocks
│   │   ├── inactivity.ts     # Per-screen inactivity timeout config
│   │   └── prizes.ts         # Prize definitions, wheel slots, stock rules, time windows
│   ├── constants/
│   │   └── colors.ts         # Design tokens (dark theme, red brand)
│   ├── context/
│   │   ├── InactivityContext.tsx # pause()/resume() controls for screens
│   │   ├── KeyboardContext.tsx   # Active keyboard input management + KeyboardArea
│   │   └── SessionContext.tsx    # Wraps SessionService for use in screens
│   ├── data/
│   │   ├── questions.json    # Quiz question bank
│   │   └── prizes.json       # ⚠️ DEAD: superseded by config/prizes.ts
│   ├── navigation/
│   │   ├── AppNavigator.tsx      # Single NativeStackNavigator with all screens
│   │   ├── flowNavigation.ts     # navigateToFirstBlock() / navigateToNextBlock()
│   │   └── navigationRef.ts      # createNavigationContainerRef (used by InactivityGuard)
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── RouletteScreen.tsx
│   │   ├── UnitsScreen.tsx
│   │   ├── PostInteractionScreen.tsx
│   │   └── AdminPanelScreen.tsx
│   ├── services/
│   │   ├── PrizeService.ts   # Prize availability, weighted selection, stock consumption
│   │   ├── SessionService.ts # Full session lifecycle — create, record events, export
│   │   └── storage.ts        # Thin wrapper over AsyncStorage
│   ├── types/
│   │   ├── navigation.ts     # RootStackParamList, ScreenProps<T>
│   │   └── session.ts        # Session, SessionEvent, Registration types
│   └── utils/
│       └── responsive.ts     # scale(), W, H, vw(), vh() helpers
```

---

## User Flow

```
Home
 └─► [first enabled block in FLOW]
      ├─► Register → [next block]
      ├─► Quiz → Result → [next block, with quizScore in context]
      └─► Roulette → Units → Home
```

Fixed bookends: **Home** always starts, **Units → Home** always ends.

The "Assista aos vídeos" button on Home goes directly to Units (bypasses the flow).

---

## Building Blocks System

Configured in `src/config/flow.ts`. Edit the `FLOW` array to enable, disable, or reorder blocks for each client deployment.

```ts
// All blocks, default order
export const FLOW: BlockConfig[] = [
  { id: 'register' },
  { id: 'quiz' },
  { id: 'roulette', requiresQuizScore: 3 },
];

// Roulette only (no quiz gate)
export const FLOW: BlockConfig[] = [
  { id: 'register' },
  { id: 'roulette' },
];

// Quiz then roulette, no score requirement
export const FLOW: BlockConfig[] = [
  { id: 'register' },
  { id: 'quiz' },
  { id: 'roulette' },
];

// Just registration, straight to Units
export const FLOW: BlockConfig[] = [
  { id: 'register' },
];
```

Block entry screens: `register → Register`, `quiz → Quiz`, `roulette → RouletteGame`.

The `Result` screen is internal to the `quiz` block — it is not a standalone block.

---

## App Config (`src/config/app.ts`)

```ts
export const APP_CONFIG = {
  virtualKeyboard: true,  // true = custom on-screen keyboard (kiosk), false = native system keyboard (dev)
};
```

**Set `virtualKeyboard: true` for production/kiosk builds. `false` is for development on non-touch devices.**

---

## Keyboard System

The app has a fully custom on-screen keyboard (`AppKeyboard.tsx`) designed for touchscreen kiosks where the native system keyboard is not appropriate.

- `KeyboardProvider` (in `App.tsx`) manages which input is active
- `AppTextInput` is a fake `Pressable`-based input that displays text and a blinking cursor; it calls `keyboard.show()` on tap
- `KeyboardArea` renders the floating keyboard at the bottom of screens that use it
- Modes: `alpha` (full keyboard), `numeric` (digit pad), `email` (keyboard + @ key)
- When `APP_CONFIG.virtualKeyboard = false`, `AppTextInput` renders a native `TextInput` and `KeyboardArea` renders nothing

---

## Admin Panel

Accessed via a **secret gesture: 3 rapid taps on the top-right corner of HomeScreen**.

Features:
- Conversion funnel stats, quiz performance, unit click tracking, session timing
- Per-session expandable rows with registration details and quiz answers
- Excel (XLSX) export via the `xlsx` library — shared via `expo-sharing` on native, direct download on web
- Danger zone: clear all sessions

---

## Inactivity / Auto-Reset

`InactivityGuard` wraps all screens and listens for touch events. On timeout it shows a countdown modal and then navigates to Home. Per-screen timeouts are configured in `src/config/inactivity.ts`.

Screens that need to pause the timer (e.g. quiz answer reveal animation) call `inactivity.pause()` / `inactivity.resume()` from `InactivityContext`.

---

## Session Tracking

Every user interaction is tracked through `SessionService` (accessed via `SessionContext` in screens).

Key events: `createSession`, `recordHomeView`, `recordRegistration`, `recordQuizStart`, `recordQuizAnswer`, `recordResultView`, `recordRouletteView`, `recordRouletteSpin`, `recordUnitsScreenView`, `recordInactivityReset`.

All sessions are stored in AsyncStorage and exportable as XLSX from the Admin Panel.

---

## Prize System

Configured in `src/config/prizes.ts`. Each prize has:
- `id`, `label`, `color`
- `stock` — daily limit (null = unlimited)
- `timeWindows` — array of `{ days, startHour, endHour }` controlling when a prize is available

`PrizeService` handles weighted random selection and stock consumption. The roulette wheel renders from `WHEEL_SLOTS` (a weighted list of prize references).

---

## Design System

Dark theme. Key tokens in `src/constants/colors.ts`:

| Token | Value | Use |
|---|---|---|
| `Colors.background` | `#0A0A0A` | Screen backgrounds |
| `Colors.surface` | `#1A1A1A` | Cards, inputs |
| `Colors.primary` | `#E22725` | Brand red — buttons, accents |
| `Colors.text` | `#FFFFFF` | Primary text |
| `Colors.textSecondary` | `#888888` | Secondary text |
| `Colors.border` | `#2A2A2A` | Input borders |
| `Colors.error` | `#FF4444` | Validation errors |
| `Colors.textOnPrimary` | `#FFFFFF` | Text on red buttons |
| `Colors.overlay` | `rgba(0,0,0,0.6)` | Modal overlays |

All sizes use `scale()` from `src/utils/responsive.ts` for totem/kiosk resolution scaling.

---

---

## Git

**Branch:** `lab-to-go`  
**Main branch:** `master`  
**Git user:** `andreltgribeiro`

Commits should be scoped and descriptive. Co-author line:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
