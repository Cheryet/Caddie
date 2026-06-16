# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Greenfield.** No code has been written yet. The repository currently contains only three governing documents. Implementation proceeds phase-by-phase per `PROJECT_SPEC.md` Section 22 — start at Phase 0.1 and do not skip ahead.

## The governing documents

These are the authoritative source of truth. If implemented code contradicts them, change the code, not the documents (unless explicitly revising the spec).

| File | Role |
|---|---|
| `PROJECT_SPEC.md` | **WHAT** to build — product scope, architecture, data model, database schema, navigation, 22 implementation phases |
| `DESIGN_SYSTEM.md` | **Design tokens & component specs** — color/typography/spacing, component variants, interaction patterns |
| `AI_IMPLEMENTATION_GUIDE.md` | **HOW to build** — workflow, testing standards, architectural protection rules, Definition of Done |
| `Design/` | **High-fidelity UX/UI reference** — HTML/CSS/JS prototypes from Claude Design. Pixel-perfect target for screens. |

Read all four at session start. Do not rely on memory of prior sessions.

### Using the `Design/` directory

**`Design/README.md` is the authoritative UX/UI handoff brief — read it before touching any screen.** It explains the bundle's origin, what to read first, and how to translate the HTML/CSS prototypes into production code.

When the prototype and `DESIGN_SYSTEM.md` conflict, the design tokens in `DESIGN_SYSTEM.md` win for color/typography/spacing values; the prototype wins for layout and composition. If anything is visually ambiguous, ask before implementing.

## Session start protocol

Per `AI_IMPLEMENTATION_GUIDE.md` Section 3:

1. Read the three docs above.
2. List `src/` to determine which phases are already implemented.
3. State explicitly: *"I am implementing Phase X.Y — [Phase Name]"*.
4. Present an implementation plan and wait for confirmation before writing code.

Phases must be completed in the order specified in `PROJECT_SPEC.md` Section 22 / `AI_IMPLEMENTATION_GUIDE.md` Section 14. The app must build and run after every phase.

## Project at a glance

- **Caddie** — premium iOS-only golf swing analysis app
- **Stack**: Bare React Native + TypeScript 5.x strict, Supabase (Auth/Postgres/Storage), Claude Vision via Supabase Edge Function, Apple Vision body pose via local `caddie-pose` Obj-C bridge (replaces the spec's originally-named `react-native-mediapipe` per §16 Risk 4 — see TODO.md), RevenueCat for subscriptions
- **State**: Zustand (auth/subscription/theme only) + per-feature hooks. **No Redux, no React Query.**
- **Storage**: MMKV (not AsyncStorage)
- **Lists**: `@shopify/flash-list` (not FlatList)
- **Animations**: Reanimated 3 only (not the core `Animated` API)

## Architecture (feature-based layered)

```
src/core/         SDK wrappers (supabase, revenuecat, sentry, posthog, claude) — no UI
src/features/    One folder per product feature, each with screens/ hooks/ components/
src/components/ui/  Shared design-system primitives (Button, Card, Badge, ProGate, …)
src/navigation/  Native stacks + bottom tabs, fully typed route params
src/store/       Zustand global store — auth, isPro, theme ONLY
src/theme/       colors / typography / spacing tokens
src/types/       Generated Supabase types + domain types
src/utils/       Pure functions (formatters, frameExtractor, validation Zod schemas, upload queue)
```

Data flow: **Screen → feature hook → Supabase/Edge Function → Zod-validated response → optimistic UI update.** Screens contain no business logic; components in `ui/` contain no data fetching.

## Non-negotiables

These override default behavior and are enforced throughout the project:

- **The Anthropic API key never ships in the app bundle.** All Claude Vision calls go through the Supabase Edge Function `analyze-swing`. If a session proposes calling Anthropic from React Native directly, refuse.
- **Reuse before create.** Search the codebase for an existing component/hook/util/type before writing a new one. One `Button`, one `ProGate`, one `EmptyState` — extend, don't duplicate.
- **No hardcoded visual values.** Every color, size, font weight, spacing value comes from `src/theme/`. If a value isn't there, add it to the theme first.
- **TypeScript strict, zero `any`.** No `// @ts-ignore` without a documented reason.
- **No `Alert.alert()`.** Use `Toast` or `BottomSheet`.
- **No `console.log` outside `if (__DEV__)` guards.**
- **Pro gating is always `<ProGate feature="…" />`.** Never an inline upgrade prompt or custom modal.
- **Zustand store contains exactly: `user`, `isAuthLoading`, `isPro`, `theme`.** Server data lives in feature hooks; do not expand the store without explicit confirmation.
- **All Supabase responses validated with Zod** before any value is used. Never `select('*')` in production code.
- **Analyses are cached in the `analyses` table** and never regenerated automatically — only when the user explicitly taps refresh.
- **Prompt versions are immutable.** Never edit an existing version string in `src/core/claude/prompts.ts`; create a new version.
- **All directional swing language must respect `swingHand`** (right vs left-handed golfer) — passed into the system prompt and surfaced in the UI.

## Commands

The project has not been scaffolded yet. Once Phase 0.1 is complete, the standard commands will be:

```bash
# iOS dev build
npx react-native run-ios

# Type check (must pass with zero errors)
npx tsc --noEmit

# Lint (must pass with zero warnings)
npx eslint src/ --max-warnings 0

# All tests
npx jest

# Single test file
npx jest path/to/file.test.ts

# Coverage
npx jest --coverage

# Maestro E2E (after Phase 1+)
maestro test e2e/<flow>.yaml
```

The pre-completion checklist in `AI_IMPLEMENTATION_GUIDE.md` Section 6 — `tsc --noEmit`, `eslint --max-warnings 0`, `jest`, and a grep for stray `console.log` — must all pass before any feature is marked done.

## Definition of Done

See `AI_IMPLEMENTATION_GUIDE.md` Section 15 for the full checklist. A feature is not done until every item is true — there are no partial completions. Particularly:

- Every bullet in the relevant `PROJECT_SPEC.md` phase section is implemented
- All states handled: loading (Skeleton), error (Toast/recovery), empty (EmptyState), offline where applicable
- Reviewed against `DESIGN_SYSTEM.md` — correct variants, 44×44pt touch targets, no hardcoded values
- Tests added for new utilities, hooks, and UI components

## When uncertain

State the uncertainty, cite the relevant spec/guide section, propose two approaches with trade-offs, and ask. Do not silently introduce new patterns — new patterns are deliberate and documented in `AI_IMPLEMENTATION_GUIDE.md`.
