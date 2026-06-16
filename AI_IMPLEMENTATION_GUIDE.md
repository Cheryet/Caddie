# Caddie — AI Implementation Guide
> Version 1.0 · Last updated June 2026
> This is the operational manual for Claude Code throughout the life of the Caddie project.
> Read this document at the start of every session, every time, without exception.

---

## 1. Purpose of This Document

This guide exists because AI-assisted development has a specific failure mode: each session starts without memory of the last. Without a persistent operational standard, code quality drifts, patterns diverge, components get duplicated, and the codebase becomes harder to maintain with every passing phase.

This document solves that problem. It is the standing operating procedure that Claude Code follows on every session, for every feature, from the first line of code to App Store submission.

### How the three documents relate

| Document | Purpose | When to read |
|---|---|---|
| `PROJECT_SPEC.md` | WHAT to build — product requirements, architecture, data models, screens, phases | Start of every session and before implementing any feature |
| `DESIGN_SYSTEM.md` | HOW it looks — color tokens, typography, spacing, component specifications, interaction patterns | Before building any component, screen, or style |
| `AI_IMPLEMENTATION_GUIDE.md` (this file) | HOW to build — development standards, workflow, patterns, quality gates | Start of every session, before writing any code |

These three documents are authoritative. If code in the codebase contradicts them, the documents win. Update the code, not the documents (unless a deliberate, documented decision is made to revise them).

### What this guide does not contain

This guide does not duplicate content from `PROJECT_SPEC.md` or `DESIGN_SYSTEM.md`. It references them. Do not describe database schemas here — read the spec. Do not define color tokens here — read the design system. This guide is about the process of building, not the substance of what is being built.

---

## 2. Core Development Principles

These principles are not suggestions. They are the standing rules that govern every decision. When in doubt about an approach, return to these principles and let them guide the answer.

---

### Principle 1 — Reuse Before Create

Before creating any of the following, Claude Code must first search the existing codebase for an implementation that already exists or can be extended:

- Component (UI or feature)
- Hook
- Utility function
- Service / core module
- Type or interface
- Zod schema
- Constant or configuration value

**The search is mandatory, not optional.**

If an existing implementation is found:
1. Use it as-is if it satisfies the requirement
2. Extend it if it needs a minor addition (add a prop, add a variant)
3. Refactor it if the new requirement reveals it was too narrow in its original design

If no existing implementation is found, create a new one — but document why nothing existing could be extended.

**Why this matters:** Caddie's design system has one `Button` component. If a new screen creates its own `TouchableOpacity` styled to look like a button, there are now two button implementations. They will diverge over time. One will get a loading state. One will get an accessibility label. In six months, neither will behave consistently.

---

### Principle 2 — Single Responsibility

Every file has one job. Every function has one job. Every component has one job.

A component that fetches data AND renders it has two jobs — split it into a container hook and a presentational component.

A utility file called `helpers.ts` that contains date formatting, URL construction, and permission checking has three jobs — split it into `formatters.ts`, `urls.ts`, and `permissions.ts`.

A hook called `useVideo` that manages playback state, handles upload, AND calls Claude has three jobs — split it.

**The test:** Can you describe what this file does in one sentence without using the word "and"? If not, it needs to be split.

---

### Principle 3 — Consistency Over Creativity

This project has established patterns. When a new feature needs to fetch data, it uses the existing hook pattern (custom hook, Supabase query, Zod validation, loading/error/data state). It does not invent a new pattern because the developer thought of a clever alternative.

Consistency means a developer (or Claude Code in a future session) can look at any feature in `src/features/` and immediately understand how it works because it follows the same shape as every other feature.

When you encounter an established pattern, follow it. When you believe an established pattern is genuinely insufficient, raise it explicitly before deviating from it.

---

### Principle 4 — Build for Scale

Write code as if the feature will be used by 50,000 users and maintained for 3 years. This means:

- No magic numbers — use theme tokens and named constants
- No hardcoded strings — use a constants file or typed enum
- No `// TODO: fix this later` comments that ship to production
- No `as any` casts — TypeScript strict mode exists for a reason
- No assumptions about data being present — handle null, undefined, empty states explicitly
- No components over ~200 lines — split them before they grow unmanageable

---

### Principle 5 — Explicit Over Implicit

Code should communicate intent clearly.

Prefer:
```typescript
const isVideoReady = duration > 0 && storagePathExists
```

Over:
```typescript
const isVideoReady = !!duration && !!video.storage_path
```

Prefer named constants:
```typescript
const MAX_ANALYSES_PER_DAY = 10
```

Over inline magic numbers:
```typescript
if (analysisCount >= 10) { ... }
```

Prefer typed errors:
```typescript
type UploadError = 'network' | 'storage_full' | 'invalid_format' | 'unknown'
```

Over untyped catch blocks:
```typescript
catch (e) { setError('Something went wrong') }
```

---

### Principle 6 — No Temporary Code in Production

Do not ship code with:
- `console.log` statements (wrap in `__DEV__` if needed for debugging)
- Commented-out blocks
- `// TODO` comments that describe missing functionality
- Hardcoded test data or fake user IDs
- Disabled TypeScript rules without a documented reason (`// @ts-ignore`)

Every line that ships should be intentional.

---

## 3. Session Start Protocol

This is the mandatory procedure at the start of every Claude Code session, before any code is written.

### Step 1 — Read the three governing documents

```
Read PROJECT_SPEC.md
Read DESIGN_SYSTEM.md
Read AI_IMPLEMENTATION_GUIDE.md (this document)
```

Do not skip any of these. Do not rely on what you "remember" from a previous session — sessions have no persistent memory. Always read fresh.

### Step 2 — Explore the current codebase state

```
List src/ directory structure
Read any files relevant to the current phase
Identify what has been implemented vs what is still a placeholder
```

Specifically look for:
- Which phases from `PROJECT_SPEC.md` are complete (have real implementations)
- Which screens exist as placeholder files only
- Which components, hooks, and services are already built
- Which database schema changes have been applied to Supabase

### Step 3 — Declare the current phase and scope

State explicitly:
- Which phase from `PROJECT_SPEC.md` is being worked on
- What the specific deliverable for this session is
- What files will be created or modified

Do not begin implementation until this declaration is made and is consistent with what the user wants to work on.

### Step 4 — Identify dependencies and risks

Before writing the first line:
- Does this feature depend on anything that is not yet implemented?
- Does this feature touch any shared component, hook, or service that other features also depend on?
- Is there an existing pattern this feature should follow?
- Are there any edge cases (offline, empty state, error state, loading state) that need to be handled?

If a dependency is missing, build it first. Do not build on an unstable foundation.

### Step 5 — Present the implementation plan

Before touching any file, describe:
1. The files that will be created (with their paths)
2. The files that will be modified (with what changes)
3. The order of implementation
4. How the feature will be tested

Wait for confirmation before proceeding. This is especially important for changes to shared components, database schema, or navigation architecture — these touch many parts of the app.

---

## 4. Feature Implementation Workflow

Every feature follows this exact workflow. No shortcuts.

### Step 1 — Understand the requirement

Read the relevant section of `PROJECT_SPEC.md`. Understand:
- What this feature does
- What data it needs
- What edge cases exist (empty, error, loading, offline)
- What Pro gating applies, if any
- How it connects to other features

### Step 2 — Locate related code

Search the codebase for:
- Existing components that this feature will compose
- Existing hooks that manage related data
- Existing types that model this feature's data
- Existing Supabase queries that this feature might reuse or extend

Use grep, directory listing, and file reads — do not guess.

### Step 3 — Identify reusable pieces

From your search, list:
- Components from `src/components/ui/` that will be used (Button, Card, Badge, etc.)
- Existing hooks that can be extended rather than duplicated
- Existing Zod schemas that can be composed
- Theme tokens that apply (no hardcoded values)

### Step 4 — Build types first

Before writing any component or hook code, define or extend the TypeScript types in `src/types/`. This forces clarity about the data shape before implementation begins.

If a Supabase table column is being added, update `src/types/database.ts` first. If a new API response shape is being introduced, define its Zod schema in `src/utils/validation.ts` first.

### Step 5 — Build the data layer

Before building any UI, ensure the data layer works:
- Supabase query or mutation (in the feature's hook)
- Zod validation of the response
- Typed loading, error, and data states
- Optimistic updates where applicable

Test the hook in isolation before wiring it to a screen.

### Step 6 — Build the UI layer

With the data layer proven:
- Build the smallest version of the UI that satisfies the spec
- Use only components from `src/components/ui/` for base elements
- Use only theme tokens for all visual values — never hardcode
- Handle all states: loading (skeleton), error (toast or error state), empty (EmptyState component), and the happy path

### Step 7 — Wire together

Connect the hook to the screen. Verify:
- Data flows correctly from Supabase → hook → component → UI
- Loading states render correctly
- Error states render correctly and offer recovery
- Empty states render correctly
- Pro gates block correctly when `isPro` is false

### Step 8 — Test

Write tests before marking the feature complete. See Section 6 for testing standards.

Minimum required:
- Unit test for any new utility function
- Unit test for the hook's state transitions
- Component test for any new UI component added to `src/components/ui/`

### Step 9 — Verify against PROJECT_SPEC.md

Read the relevant spec section again. Confirm every bullet point is satisfied. If anything is missing, implement it before calling the feature done.

### Step 10 — Verify against DESIGN_SYSTEM.md

Check:
- All colors come from `theme/colors.ts` — no hardcoded hex values
- All spacing comes from `theme/spacing.ts` — no magic numbers
- All text styles come from `theme/typography.ts`
- Correct component variants are used (Button primary/secondary/ghost, Card default/raised, etc.)
- Touch targets are minimum 44×44pt
- Loading states use the `Skeleton` component (not a spinner) for list data
- Empty states use the `EmptyState` component

### Step 11 — Check for duplication

Before committing, search the codebase one more time. Has anything introduced a duplicate pattern? If yes, refactor before finishing.

---

## 5. Git Workflow Standards

Every change follows this workflow. This is especially important for AI-assisted development where a session might produce a large amount of code — disciplined commits make changes reviewable and reversible.

### Branch strategy

```
main          Protected. Production-ready code only. Never commit directly.
develop       Integration branch. All feature branches merge here via PR.
feature/*     One branch per phase or sub-feature.
fix/*         Bug fixes.
chore/*       Dependency updates, config changes, documentation.
```

Branch naming examples:
```
feature/phase-0-1-project-scaffold
feature/phase-1-3-video-recording
feature/phase-2-1-drawing-canvas
fix/playback-scrubber-sync
chore/update-vision-camera-4-1
```

### Commit message format

Use Conventional Commits. Every commit message must follow this format:

```
type(scope): short description

optional body explaining why, not what
```

Types:
```
feat      New feature or capability
fix       Bug fix
refactor  Code change that doesn't add a feature or fix a bug
test      Adding or updating tests
chore     Build process, dependency updates, config
docs      Documentation only changes
```

Scope is the feature or module affected:
```
feat(camera): add swing hand selector to recording UI
feat(analysis): integrate Claude Vision Edge Function
fix(playback): resolve frame step button off-by-one error
refactor(upload): extract retry logic into standalone utility
test(hooks): add useAnalysis cache hit test case
chore(deps): update react-native-video to 6.3.0
docs(spec): remove notes feature, add swing_hand column
```

**Rules:**
- One logical change per commit — do not batch unrelated changes
- Commits should be small enough to be understood and reverted individually
- Never commit directly to `main` or `develop`
- Never commit `.env` files — they are in `.gitignore` for a reason

### Pull Request standards

Every PR to `develop` must include a description covering:

```markdown
## Summary
What this PR does and why.

## Changes
- List of files created
- List of files modified (with what changed)

## Testing completed
- Unit tests added: yes/no (which)
- Component tests added: yes/no (which)
- Manual testing: describe what was verified on device/simulator

## Design system compliance
- Colors from theme tokens: yes/no
- Spacing from theme tokens: yes/no
- Typography from theme tokens: yes/no
- Reviewed against DESIGN_SYSTEM.md: yes/no

## Risks
Any concerns or potential side effects.

## Follow-up
Any known follow-up work this PR does not address.
```

A PR that does not include this description should not be merged.

---

## 6. Testing Standards

No feature is complete without tests. This is non-negotiable.

The goal of testing in this project is not 100% coverage for its own sake — it is to catch regressions as the codebase grows. Focus testing effort on the things that break most often: business logic, state transitions, data transformations, and component variant rendering.

### Unit tests

**Location:** `src/**/__tests__/` colocated with the file being tested

**Required for:**
- Every utility function in `src/utils/`
- Every Zod schema in `src/utils/validation.ts`
- Every state transition in `src/store/useAppStore.ts`
- Business logic extracted from hooks (pure functions)

**Tool:** Jest

**Pattern:**
```typescript
// src/utils/__tests__/formatters.test.ts
describe('formatDuration', () => {
  it('formats seconds under one minute', () => {
    expect(formatDuration(45000)).toBe('0:45')
  })
  it('formats seconds over one minute', () => {
    expect(formatDuration(75000)).toBe('1:15')
  })
  it('handles zero duration', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})
```

### Hook tests

**Required for:**
- `useAuth` — sign in, sign out, session restore, error state
- `useVideos` — fetch, optimistic delete, error state
- `useAnalysis` — cache hit, cache miss, error state, loading state
- Any hook that contains branching logic

**Pattern:** Extract pure state-transition logic from hooks into standalone functions that can be unit-tested without mocking React. Test those functions directly.

For hooks that must be tested with React, use `@testing-library/react-native`'s `renderHook` with a mocked Supabase client.

### Component tests

**Location:** `src/components/ui/__tests__/`

**Required for every component in `src/components/ui/`:**

Test each variant and state, not the internal implementation:
```typescript
// Test what the user sees, not how it works
describe('Button', () => {
  it('renders primary variant', () => { ... })
  it('renders secondary variant', () => { ... })
  it('shows loading indicator when loading prop is true', () => { ... })
  it('does not fire onPress when disabled', () => { ... })
  it('applies correct gold background for primary variant', () => { ... })
})
```

**Tool:** `@testing-library/react-native`

### Integration tests

**Required for these flows:**
1. Auth flow — sign up → session persists → sign out → session cleared
2. Upload flow — video recorded → compressed → uploaded → row in database
3. Analysis flow — frames extracted → Edge Function called → response validated → cached → rendered
4. Subscription flow — upgrade tapped → RevenueCat purchase → isPro becomes true → feature accessible

**Tool:** Jest with mocked Supabase client and mocked RevenueCat SDK

### End-to-end tests

**Location:** `e2e/`

**Tool:** Maestro (YAML-based flows, simpler than Detox, no native build required for flow authoring)

**Required flows:**
```
e2e/
├── auth/
│   ├── sign-up.yaml
│   └── sign-in-restore-session.yaml
├── library/
│   ├── record-video-appears-in-library.yaml
│   └── import-video-appears-in-library.yaml
├── playback/
│   ├── draw-line-export-image.yaml
│   └── speed-controls.yaml
├── analysis/
│   └── upgrade-and-analyse.yaml
└── comparison/
    └── sync-two-videos.yaml
```

### Pre-completion checklist

Before marking any feature complete, run all of the following and confirm they pass:

```bash
# TypeScript — zero errors
npx tsc --noEmit

# Linting — zero warnings or errors
npx eslint src/ --max-warnings 0

# Tests — all pass, no regressions
npx jest --coverage

# No console.log in production code
grep -r "console.log" src/ --include="*.ts" --include="*.tsx"
# Result should be empty or only wrapped in __DEV__ guards
```

If any of these fail, the feature is not done.

---

## 7. Architecture Protection Rules

The architecture described in `PROJECT_SPEC.md` is deliberate. Drift from it happens incrementally — one shortcut, one extra package, one new global state slice — until the codebase no longer matches the spec and is harder to maintain than it should be.

Claude Code's job is to protect the architecture, not just implement features.

### Before adding a new package

Ask and answer:
1. What problem does this package solve?
2. Can the same outcome be achieved with an existing package already in the project?
3. Is this package actively maintained? (check last commit, open issues, download count)
4. What is the bundle size impact on iOS?
5. Does it have native code? If so, does it support the minimum iOS version (iOS 16)?

If the answer to #2 is "yes, an existing package could do this," don't add the new package.

### Before adding a new global store slice

The Zustand store contains exactly three things: auth state, subscription status, and theme preference. These are the only values that are truly global — needed by unrelated parts of the app simultaneously.

Before adding anything else to the global store, answer:
1. Is this data needed by two or more unrelated features simultaneously?
2. Would passing it as a prop or using a feature-level hook be insufficient?

If both answers are not "yes," the data belongs in a feature hook, not the global store.

### Before adding a new core service

`src/core/` contains SDK wrappers: Supabase, RevenueCat, Sentry, Posthog. These are third-party integrations that need to be initialised once and used everywhere.

Before adding a new service to `src/core/`, confirm it is:
- A third-party SDK that requires initialisation
- Used by multiple unrelated features
- Not simply a utility function (which belongs in `src/utils/`)

### Before creating a new navigation pattern

The navigation architecture in `PROJECT_SPEC.md` Section 10 is fixed. Do not:
- Add nested navigators unless explicitly in the spec
- Use tab switching via React Navigation when state-driven switching is specified
- Create new modal presentation patterns without updating the spec

### Architectural violations to actively avoid

These patterns have been seen in React Native projects and actively damage long-term maintainability:

| Anti-pattern | Correct alternative |
|---|---|
| Fetching data inside a component | Create or use a feature hook |
| Storing server data in Zustand | Keep in feature hook (local state) |
| Using `any` type to silence an error | Fix the underlying type issue |
| Inline styles with hardcoded values | Theme tokens in `StyleSheet.create` |
| Creating a new button with `TouchableOpacity` | Use `Button` from `src/components/ui/` |
| `Alert.alert()` for confirmations | Use `BottomSheet` component |
| Multiple `useEffect` hooks in one component | Split into multiple hooks or components |
| Logic in a screen component | Move to a feature hook |

---

## 8. Component Development Standards

The component hierarchy has three levels. Every component must know which level it belongs to and stay within its boundaries.

### Level 1 — UI Components (`src/components/ui/`)

**Definition:** Pure presentational components. They receive props and render JSX. They have no knowledge of Supabase, RevenueCat, Claude, or any business domain.

**Rules:**
- No data fetching of any kind
- No direct use of Zustand store (except reading `theme` for theming — acceptable)
- No navigation calls
- All visual values from theme tokens — never hardcoded
- Every prop that affects appearance should have a sensible default
- Full TypeScript props interface — no optional props without defaults
- Tested in isolation

**Examples:** `Button`, `Card`, `Badge`, `Input`, `Skeleton`, `EmptyState`, `VideoCard`, `SwingScore`

**Template:**
```typescript
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { colors } from '@/theme/colors'
import { typography } from '@/theme/typography'
import { spacing } from '@/theme/spacing'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  // hooks
  // derived values
  // handlers
  // render
  return (...)
}

const styles = StyleSheet.create({
  // No hardcoded values — all from theme tokens
})
```

---

### Level 2 — Feature Components (`src/features/{feature}/components/`)

**Definition:** Components that are specific to one product feature. They can compose Level 1 UI components. They can read from hooks but should not own complex data-fetching logic themselves.

**Rules:**
- Can use Level 1 UI components
- Can receive data from a parent hook via props
- Can call handlers passed as props
- Should not directly call Supabase or external APIs
- Should not contain complex state management

**Examples:** `VideoGrid`, `IssueCard`, `DrawingCanvas`, `PoseOverlay`, `ComparisonPlayer`

---

### Level 3 — Screens (`src/features/{feature}/screens/`)

**Definition:** The top-level component rendered by the navigator for each route. Screens coordinate feature components and own the connection to data hooks.

**Rules:**
- One screen per route — no screen renders another screen
- Owns the feature hook (calls `useVideos()`, `useAnalysis()`, etc.)
- Passes data down to feature components via props
- Handles navigation calls
- No business logic — that lives in the hook
- Layout and composition only

**Template:**
```typescript
export function LibraryScreen({ navigation }: Props) {
  // 1. Hooks
  const { videos, isLoading, isRefreshing, error, refresh, deleteVideo } = useVideos()
  const { isPro } = useSubscription()

  // 2. Derived values
  const isEmpty = !isLoading && videos.length === 0

  // 3. Handlers
  const handleVideoPress = (videoId: string) => {
    navigation.navigate('Playback', { videoId })
  }

  // 4. Early returns
  if (isLoading) return <VideoGridSkeleton />
  if (error) return <ErrorState onRetry={refresh} />

  // 5. Render
  return (
    <Screen>
      {isEmpty ? (
        <EmptyState ... />
      ) : (
        <VideoGrid
          videos={videos}
          onVideoPress={handleVideoPress}
          onVideoDelete={deleteVideo}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
      )}
    </Screen>
  )
}
```

---

### Hook standards

Every feature hook follows this shape:

```typescript
interface UseVideosReturn {
  videos: Video[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  deleteVideo: (id: string) => Promise<void>
}

export function useVideos(): UseVideosReturn {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (isRefresh = false) => {
    // set loading state
    // call Supabase
    // validate with Zod
    // update state
    // handle error
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const refresh = useCallback(() => fetch(true), [fetch])

  const deleteVideo = useCallback(async (id: string) => {
    // optimistic update
    // Supabase delete
    // Storage delete
    // revert on failure
  }, [])

  return { videos, isLoading, isRefreshing, error, refresh, deleteVideo }
}
```

---

## 9. State Management Rules

State lives in exactly one place. Confusion about where state lives is a primary source of bugs.

### Global state (Zustand — `src/store/useAppStore.ts`)

**What goes here:**
- `user` — the authenticated Supabase user object (null when signed out)
- `isAuthLoading` — true during app launch auth check
- `isPro` — RevenueCat entitlement status
- `theme` — 'dark' | 'light' user preference

**What does not go here:**
- Videos list — that's server state, lives in `useVideos`
- Analysis results — that's server state, lives in `useAnalysis`
- Playback position — that's local UI state, lives in `usePlayback`
- Drawing canvas state — that's local UI state, lives in `useDrawing`
- Any data that is only needed by one feature

**Rule:** If you are about to add a new field to the Zustand store, ask: "Is this needed by two or more unrelated features at the same time?" If the answer is no, it does not belong in global state.

### Server state (Feature hooks)

Data fetched from Supabase lives in feature hooks. It is not cached globally between sessions (MMKV caches the last-known value for offline display, but it is not the source of truth).

Mutations are optimistic: update the local state immediately, then confirm with Supabase. On failure, revert and show an error toast.

### Local UI state (Component / screen state)

Transient UI state — which tab is selected, whether a sheet is open, the current drawing tool, playback speed — lives in `useState` or `useReducer` inside the component or a dedicated local hook. It is never persisted and never global.

### Persisted local state (MMKV)

Small values that need to persist between app launches but are not stored in Supabase:
- `theme` preference (also in Zustand, synced on launch)
- `isPro` cache (also in Zustand, refreshed from RevenueCat on launch)
- Upload queue (list of pending uploads that failed and need retry)
- Last-selected club type and camera angle (defaults for new recordings)

Access via MMKV directly for simple key-value. Do not use MMKV as a local database — that is Supabase's job.

---

## 10. Database and Backend Standards

### Schema changes

Any change to the Supabase database schema requires:

1. Update `PROJECT_SPEC.md` Section 12 (Database Architecture) first
2. Write the SQL migration
3. Run the migration in Supabase dashboard
4. Regenerate TypeScript types: `supabase gen types typescript --project-id your-project > src/types/database.ts`
5. Update any Zod schemas that reference the changed table
6. Update any hooks that query the changed table

Never modify the database without updating the spec and regenerating types. A schema and its TypeScript representation must stay in sync.

### Supabase query standards

All Supabase queries follow this pattern:

```typescript
const { data, error } = await supabase
  .from('videos')
  .select('id, title, storage_path, thumbnail_path, duration_ms, club_type, camera_angle, swing_hand, tags, has_analysis, created_at')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

if (error) throw new SupabaseError(error.message, 'fetch_videos')

const validated = VideoListSchema.parse(data)
```

Rules:
- Always specify the columns in `select()` — never use `select('*')` in production code
- Always check `error` before accessing `data`
- Always validate the response with a Zod schema
- Always use the typed `user.id` from the Zustand store — never hardcode a user ID

### RLS verification

When a new table is created or a new query is written, verify RLS is correctly applied by testing with a second Supabase user account. A query that returns another user's data is a security vulnerability.

### Storage operations

All storage operations (upload, download, delete) go through `src/core/supabase/storage.ts`. No component or hook should import storage functions directly from `@supabase/supabase-js` — always go through the abstraction layer.

This ensures: consistent error handling, consistent URL generation, and a single place to update if the storage strategy changes.

### Migrations checklist

Before running any schema change on the production Supabase project:
- [ ] Change has been applied and tested on a local or staging Supabase project first
- [ ] RLS policies updated to cover new columns/tables
- [ ] TypeScript types regenerated
- [ ] All hooks querying the affected table updated
- [ ] App tested end-to-end with the schema change applied

---

## 11. AI Feature Standards

The Claude Vision integration is the core Pro feature of Caddie. It must be robust, cost-controlled, and predictable. Every interaction with the AI pipeline must follow these standards.

### The security requirement — non-negotiable

The Anthropic API key must never appear in the app bundle. All Claude API calls go through the Supabase Edge Function `analyze-swing`. The app never calls the Anthropic API directly.

Architecture:
```
App (authenticated) → Supabase Edge Function → Anthropic API
```

If a session ever proposes calling the Anthropic API directly from the React Native app, refuse. It is a security violation.

### Prompt versioning

System prompts are defined in `src/core/claude/prompts.ts` and versioned:

```typescript
export const PROMPTS = {
  'v1.0': `You are a PGA-certified golf instructor...`,
} as const

export type PromptVersion = keyof typeof PROMPTS
export const CURRENT_PROMPT_VERSION: PromptVersion = 'v1.0'
```

Every analysis record in Supabase stores the `prompt_version` used. This allows:
- Safe iteration on prompts without corrupting old analyses
- A/B testing by routing some users to a different version
- Auditing exactly what prompt produced a given output

**Never change an existing prompt version string.** Create a new version instead.

### Response validation

Every Claude API response is validated with Zod before any value is used:

```typescript
const SwingAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(10),
  issues: z.array(IssueSchema),
  positives: z.array(z.string()).min(1).max(3),
  drill: z.string(),
})

// In the Edge Function:
const parsed = SwingAnalysisSchema.safeParse(rawResponse)
if (!parsed.success) {
  // Log the raw response to Sentry for debugging
  // Return a typed error to the app
  throw new Error('INVALID_AI_RESPONSE')
}
```

If validation fails, the app shows a recoverable error ("Analysis couldn't be processed — tap to retry") and logs the raw response to Sentry. Never surface a raw Claude response to the UI without validation.

### Caching

An analysis result, once generated and stored in the `analyses` Supabase table, must never be regenerated automatically. It is only regenerated when the user explicitly taps a "Refresh analysis" button.

Before calling the Edge Function, `useAnalysis` always checks the `analyses` table for an existing record for the given `video_id`. Cache hit = use existing, no API call.

### Cost controls

Implemented in the Supabase Edge Function (server-side, cannot be bypassed by a client):
- Daily limit: 10 analyses per `user_id` per calendar day
- One in-flight request maximum per user: check for a pending request in the `analyses` table before allowing a new one
- Token usage logged to `analyses.input_tokens` and `analyses.output_tokens` on every call

In the app:
- The "Analyse with AI" button is disabled while a request is in flight
- A clear loading state with elapsed time counter keeps the user informed (5-15 second expected wait)

### Error handling for AI calls

AI calls can fail in three ways. Handle each distinctly:

| Error type | User-facing message | Recovery |
|---|---|---|
| Network timeout (>30s) | "Analysis timed out. Check your connection and try again." | Retry button |
| Daily limit reached | "You've used all 10 analyses for today. Come back tomorrow." | No retry — show remaining count |
| Invalid response (Zod fail) | "Something went wrong processing your analysis. Try again." | Retry button + Sentry log |

---

## 12. Subscription Standards

### Feature gating pattern

Every Pro-gated feature uses the same pattern without exception:

```typescript
// In any screen or feature component
const { isPro } = useSubscription()

if (!isPro) {
  return (
    <ProGate feature="AI Coaching" />
  )
}

// Pro content renders here
```

The `ProGate` component is the single implementation of the upgrade prompt. Do not create inline upgrade prompts, custom modals, or alternative paywall designs. One component, used consistently everywhere.

### isPro source of truth

`isPro` in the Zustand store is the single source of truth for subscription status during a session. It is:
1. Populated on app launch from `RevenueCat.getCustomerInfo()`
2. Updated immediately after a successful purchase
3. Updated immediately after `restorePurchases()` completes
4. Never hardcoded, never mocked in production builds

### Tester and beta access

**Do not build a custom tester access system.** RevenueCat handles this entirely.

For any person who needs Pro access without paying:
1. Open the RevenueCat dashboard
2. Find or create the user by their `app_user_id`
3. Grant the `caddie_pro` entitlement with an optional expiry date

That is the entire process. No code changes required. No special flags in the database. No admin screen to build.

**Tester access levels:**

| Who | Entitlement type | Expiry |
|---|---|---|
| Core development team | Promotional entitlement | None (permanent) |
| TestFlight beta testers | Promotional entitlement | 90 days |
| Press / reviewers | Promotional entitlement | 30 days |
| Launch giveaway winners | Promotional entitlement | 365 days |

### Upgrade flow rules

The upgrade flow must always:
1. Show what the user gets before asking for money
2. Highlight the annual plan as the better value
3. Never block navigation with a modal that cannot be dismissed
4. Include a "Restore purchases" option
5. Handle the `USER_CANCELLED` RevenueCat error silently (user tapped back — not an error)
6. Surface all other errors as a toast with a retry option

### RevenueCat initialisation

RevenueCat must be initialised before any subscription check. In `App.tsx`, the initialisation order is:

```
1. Sentry init
2. Supabase auth check (restores session from MMKV)
3. RevenueCat init + getCustomerInfo() → setIsPro()
4. App renders
```

Do not render any Pro-gated UI until RevenueCat has returned its initial `CustomerInfo` response.

---

## 13. Golf Content Standards

### Drill content

The current approach is **Option A: Curated static text library** (see `PROJECT_SPEC.md` Section 15 for full evaluation).

**Implementation:**

Drills are defined as a static JSON file at `src/constants/drills.ts`:

```typescript
interface Drill {
  id: string
  name: string
  targetIssues: string[]  // matches issue "name" values from Claude analysis
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  description: string     // 2-3 sentences, coaching voice
  steps: string[]         // numbered steps
}

export const DRILLS: Drill[] = [
  {
    id: 'drill-over-the-top-towel',
    name: 'Towel under the arm drill',
    targetIssues: ['Over the top', 'Outside-in path'],
    difficulty: 'beginner',
    description: 'Trains the feeling of keeping the right elbow connected through the downswing, eliminating the over-the-top move.',
    steps: [
      'Place a towel or headcover under your right armpit',
      'Make practice swings keeping the towel from dropping',
      'Focus on the elbow staying connected through impact',
    ],
  },
  // ... 20-30 more drills
]
```

The `DrillCard` component receives a `Drill` object. When Claude returns an issue, `AnalysisScreen` finds the matching drill from this constant by matching `targetIssues` against `issue.name`.

**The `DrillCard` component must accept either a static `Drill` object or a video URL** — this is a forward-compatibility requirement. When V1 drill videos are added, only the data source changes, not the component.

### Tour pro comparison content

**Not included in MVP or V1.** See `PROJECT_SPEC.md` Section 16.

When this feature is eventually built:
- Content must be either purpose-shot (owned) or formally licensed
- Never use YouTube embeds, unlicensed clips, or scraped footage
- Display as "Reference swing" not "Tour pro swing" unless licensing explicitly permits the name

The `reference_swings` table is defined in the spec. When the feature is built, it will use that schema. Do not create alternative tables or schemas.

---

## 14. Phase Execution Framework

Every phase from `PROJECT_SPEC.md` Section 22 follows this execution framework.

### Before starting a phase

Read the phase definition in `PROJECT_SPEC.md`. Confirm:
- All dependencies from previous phases are complete
- The app currently builds and runs without errors
- You understand every deliverable in the phase

If a dependency is not complete, finish it first. Do not start a phase with broken foundations.

### Phase execution template

For each phase, work through this structure:

```
Goal:
  One sentence describing what this phase achieves.

Inputs:
  - Files that must exist before this phase starts
  - Database tables/columns that must exist
  - Previous phases that must be complete

Dependencies to install (if any):
  - Package name and version
  - Native link required: yes/no
  - iOS-specific setup required: yes/no

Files to create:
  - src/path/to/NewFile.tsx — purpose
  - src/path/to/AnotherFile.ts — purpose

Files to modify:
  - src/path/to/ExistingFile.tsx — what changes and why

Database changes (if any):
  - SQL to run
  - Types to regenerate

Deliverables:
  - Specific, observable outcomes (e.g., "User can tap record button and see countdown")

Tests to write:
  - Unit tests: which functions/hooks
  - Component tests: which components
  - Manual verification: what to check on device/simulator

Exit criteria (all must be true):
  - [ ] App builds without errors (tsc --noEmit passes)
  - [ ] Linting passes (eslint --max-warnings 0)
  - [ ] Tests pass
  - [ ] Manual verification complete
  - [ ] No console.log statements
  - [ ] No hardcoded values (all theme tokens)
  - [ ] No duplicate code introduced
  - [ ] PROJECT_SPEC.md deliverables satisfied
```

### After completing a phase

1. Run the full pre-completion checklist (Section 6)
2. Commit with a descriptive commit message
3. Confirm the app is runnable from a clean state (fresh install on simulator)
4. Note which phase is complete in the session summary

### Phase dependency map

This is the order phases must be completed. Do not skip ahead.

```
0.1 Project scaffold
  └── 0.2 Theme foundation
        └── 0.3 Navigation skeleton
              └── 0.4 Global state and storage
                    └── 0.5 Supabase foundation
                          └── 0.6 Authentication
                                └── 0.7 Sentry and analytics
                                      └── 0.8 RevenueCat initialisation
                                            └── 1.1 Core UI components
                                                  ├── 1.2 Camera permissions
                                                  │     └── 1.3 Video recording
                                                  │           └── 1.4 Upload pipeline
                                                  │                 └── 1.5 Video library
                                                  │                       └── 1.6 Video import
                                                  │                             └── 1.7 Video playback
                                                  │                                   └── 1.8 Video management
                                                  │                                         └── 2.1 Drawing canvas foundation
                                                  │                                               └── 2.2 Line and freehand tools
                                                  │                                                     └── 2.3 Remaining drawing tools
                                                  │                                                           └── 2.4 Drawing persistence and export
                                                  │                                                                 └── 3.1 Pose engine initialisation
                                                  │                                                                       └── 3.2 Pose overlay
                                                  │                                                                             └── 3.3 Derived pose metrics
                                                  │                                                                                   └── 4.1 Edge Function
                                                  │                                                                                         └── 4.2 Frame extraction
                                                  │                                                                                               └── 4.3 Analysis screen UI
                                                  │                                                                                                     └── 4.4 End-to-end analysis
                                                  │                                                                                                           └── 4.5 Upgrade flow
                                                  │                                                                                                                 └── 5.1 Comparison
                                                  │                                                                                                                       └── 5.2 Home screen
                                                  │                                                                                                                             └── 5.3 Tempo
                                                  │                                                                                                                                   └── 5.4 Profile/settings
                                                  │                                                                                                                                         └── 5.5 Polish and launch
                                                  └── (all remaining phases)
```

---

## 15. Definition of Done

A feature is done when every one of these conditions is true. There are no partial completions.

### Code quality
- [ ] TypeScript strict mode passes — `npx tsc --noEmit` exits with code 0
- [ ] ESLint passes — `npx eslint src/ --max-warnings 0` exits with code 0
- [ ] No `any` types used without documented justification
- [ ] No `// @ts-ignore` or `// eslint-disable` comments without documented justification
- [ ] No `console.log` in production paths (only inside `if (__DEV__)` guards)

### Architecture compliance
- [ ] No duplicate components, hooks, or utilities introduced
- [ ] All data fetching is in feature hooks, not in components or screens
- [ ] All colours from `theme/colors.ts` — no hardcoded hex values
- [ ] All spacing from `theme/spacing.ts` — no magic numbers
- [ ] All text styles from `theme/typography.ts`
- [ ] Global Zustand store not expanded without documented justification

### Specification compliance
- [ ] Every bullet point in the relevant `PROJECT_SPEC.md` phase section is implemented
- [ ] All states handled: loading, error, empty, offline (where applicable)
- [ ] All edge cases documented in the spec are handled

### Design compliance
- [ ] Reviewed against `DESIGN_SYSTEM.md` — correct component variants, correct interaction patterns
- [ ] All touch targets minimum 44×44pt
- [ ] Loading states use `Skeleton` component for list data
- [ ] Empty states use `EmptyState` component
- [ ] Error surfaces via `Toast` or `BottomSheet` — never `Alert.alert()`

### Testing
- [ ] Unit tests written for new utility functions and hooks
- [ ] Component tests written for new `src/components/ui/` components
- [ ] All existing tests still pass (no regressions introduced)

### Integration
- [ ] Feature works end-to-end on iOS simulator
- [ ] Feature works on a physical iOS device (at least one test)
- [ ] Pro gate works correctly (feature hidden without subscription, accessible with subscription)
- [ ] Offline state handled correctly (network-dependent actions disabled gracefully)

### Documentation
- [ ] If a new pattern was introduced, it is documented in this guide
- [ ] If a spec decision was changed, `PROJECT_SPEC.md` is updated
- [ ] If a new environment variable is required, `.env.example` is updated

---

## 16. Claude Code Session Rules

These rules govern the behaviour of Claude Code in every session. They are not guidelines — they are operational requirements.

### At the start of every session

```
1. Read PROJECT_SPEC.md in full
2. Read DESIGN_SYSTEM.md in full
3. Read AI_IMPLEMENTATION_GUIDE.md in full (this document)
4. List the src/ directory to understand the current codebase state
5. Read key files relevant to the current phase
6. Identify which phases are complete and which are pending
7. State clearly: "I am implementing Phase X.Y — [Phase Name]"
8. Present the implementation plan for confirmation
9. Wait for confirmation before writing any code
```

### Prohibited behaviours

Claude Code must never:

- **Skip the discovery process.** Never begin coding without reading the three documents and understanding the current codebase state.
- **Create what already exists.** Never create a new component, hook, type, or utility without first searching for an existing implementation.
- **Ignore the design system.** Never hardcode a color, size, font weight, or spacing value. Every visual value comes from the theme.
- **Call the Anthropic API directly from the app.** All Claude Vision calls go through the Supabase Edge Function.
- **Expand the Zustand store** without explicit confirmation that the new value is genuinely global.
- **Use `Alert.alert()`** for any user-facing feedback.
- **Ship `console.log` statements** outside `__DEV__` guards.
- **Use `as any`** without a comment explaining why the type system cannot be satisfied correctly.
- **Start a new phase** before the previous phase's exit criteria are fully satisfied.
- **Make database schema changes** without updating `PROJECT_SPEC.md` and regenerating TypeScript types.

### When uncertain

If Claude Code is uncertain about an architectural decision, the correct behaviour is to:

1. State the uncertainty explicitly: "I'm uncertain whether X belongs in the global store or a feature hook."
2. Reference the relevant section of this guide or the spec.
3. Propose two approaches with their trade-offs.
4. Ask for a decision before proceeding.

Do not resolve uncertainty by picking the easier option. Pick the correct option.

### When an existing pattern is insufficient

Sometimes a feature genuinely requires something the current architecture does not support. When this happens:

1. State clearly that the existing pattern is insufficient and why.
2. Propose the minimum change needed to support the new requirement.
3. Check that the proposed change does not break existing features.
4. Get confirmation before implementing the change.
5. Update the relevant document (`PROJECT_SPEC.md` or this guide) to reflect the new pattern.

Do not silently introduce a new pattern. New patterns must be deliberate and documented.

### Session handoff

At the end of every session, produce a summary:

```
## Session Summary

Phase worked on: X.Y — Phase Name
Status: Complete / Partial (describe what remains)

Files created:
- src/path/to/file.tsx

Files modified:
- src/path/to/file.ts (what changed)

Tests added:
- test description

Exit criteria status:
- [x] TypeScript passes
- [x] Linting passes
- [x] Tests pass
- [ ] Physical device test (pending)

Next session should:
- Start Phase X.Z — Next Phase Name
- Or: Complete remaining items from this phase: [list]
```

This summary ensures the next session can orient itself quickly without re-reading the entire codebase.

---

## Appendix A — Common Patterns Reference

Quick reference for the patterns used throughout the codebase. When in doubt, follow these.

### Supabase query with Zod validation
```typescript
import { supabase } from '@/core/supabase/client'
import { VideoSchema } from '@/utils/validation'

const { data, error } = await supabase
  .from('videos')
  .select('id, title, storage_path, thumbnail_path, duration_ms, club_type, camera_angle, swing_hand, tags, has_analysis, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

if (error) throw error
const videos = z.array(VideoSchema).parse(data)
```

### Optimistic mutation
```typescript
const deleteVideo = useCallback(async (id: string) => {
  // 1. Optimistic update
  setVideos(prev => prev.filter(v => v.id !== id))

  // 2. Supabase mutation
  const { error } = await supabase.from('videos').delete().eq('id', id)

  // 3. Revert on failure
  if (error) {
    setVideos(prev => [...prev, deletedVideo]) // restore
    showToast({ type: 'error', message: 'Could not delete video. Try again.' })
  }
}, [])
```

### Pro gate
```typescript
const { isPro } = useSubscription()
if (!isPro) return <ProGate feature="AI Coaching" />
```

### Theme-compliant StyleSheet
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.elevated,
    borderRadius: layout.borderRadius.lg,
    padding: layout.cardPadding,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  title: {
    ...typography.title2,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
})
```

### Error boundary pattern
```typescript
// Every feature hook uses this error shape
type FeatureError = {
  code: 'network' | 'not_found' | 'permission_denied' | 'unknown'
  message: string
}
```

### Empty state
```typescript
if (!isLoading && items.length === 0) {
  return (
    <EmptyState
      icon="video.slash"
      title="No swings yet"
      body="Record your first swing to get started."
      action={{ label: 'Record swing', onPress: handleRecord }}
    />
  )
}
```

---

## Appendix B — File Header Convention

Every source file starts with a brief header comment describing its purpose and category. This aids orientation during large sessions.

```typescript
/**
 * useVideos — Feature hook
 * Fetches and manages the user's video library.
 * Data source: Supabase `videos` table.
 * Used by: LibraryScreen, HomeScreen (latest video)
 */
```

```typescript
/**
 * VideoCard — UI Component
 * Displays a single video in the library grid.
 * Receives all data via props — no data fetching.
 * Part of: src/components/ui/
 */
```

```typescript
/**
 * analyzeSwing — Core Service
 * Supabase Edge Function proxy for Claude Vision analysis.
 * All Anthropic API calls go through this function — never called directly from app.
 * Part of: src/core/claude/
 */
```

---

> This document is a living guide. When a new pattern is established, add it here.
> When an existing pattern proves insufficient and is replaced, update the relevant section.
> The guide should always reflect how the codebase actually works, not how it was originally planned.
>
> Last updated: Phase 0 (project start)
> Next review: After Phase 1.8 (complete core video loop)
