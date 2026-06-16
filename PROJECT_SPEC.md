# Caddie — Project Specification
> Version 2.0 · Last updated June 2026
> This document is the single source of truth for the Caddie application.
> Reference DESIGN_SYSTEM.md for all visual and component decisions.

---

## 1. Product Overview

**App name**: Caddie
**Tagline**: *Your swing. Perfected.*
**Platform**: iOS only (minimum iOS 16)
**Framework**: Bare React Native (latest stable)
**Language**: TypeScript 5.x (strict mode, zero `any`)
**Backend**: Supabase (Auth + Postgres + Storage)
**AI Analysis**: Anthropic Claude Vision API (claude-sonnet-4-6)
**On-device AI**: Apple Vision body pose detection (Objective-C bridge in `packages/caddie-pose/`). Replaces the originally-named `react-native-mediapipe` per §16 Risk 4 — the package is incompatible with Vision Camera 5. Apple Vision is the engine for Phase 3.1; abstraction in `src/core/pose/` keeps a swap to MediaPipe a one-package change.
**Subscriptions**: RevenueCat (StoreKit 2)

Caddie is a premium iOS golf swing analysis application. Golfers record or import swing videos, receive AI-powered coaching feedback from Claude Vision, annotate swings with a professional drawing toolkit, compare swings side-by-side, and track measurable improvement over time.

The core insight: existing golf analysis apps use rigid classifier-based AI that returns canned feedback. Caddie uses Claude Vision to produce genuinely contextual, coach-quality natural language analysis — the difference between "flying elbow detected" and "your right elbow is separating at the top because your grip is too strong — try weakening it half a turn."

---

## 2. Product Goals

1. **Best-in-class swing analysis** — Claude Vision feedback that rivals a real lesson, not a rule-based classifier
2. **Premium feel throughout** — every interaction communicates quality; nothing feels like a template
3. **Video first** — the interface recedes around the video; chrome never competes with content
4. **Genuinely useful free tier** — drawing tools, pose overlay, and slow-motion are free forever
5. **Sustainable unit economics** — Pro subscription covers Claude API costs with strong margin
6. **Coach workflow ready** — architecture supports a future coach-annotates-and-shares model without a rewrite

---

## 3. Non-Goals (this version)

- Android support (iOS only for MVP and V1)
- Real-time swing analysis during live recording (post-capture only)
- Club head tracking / ball flight (separate CV model, future roadmap)
- Social features, feed, or following
- Web or desktop app
- Wearable / sensor integration
- Live video coaching with a real instructor

---

## 4. MVP Scope

MVP is the minimum set of features required to ship to TestFlight and validate the core value proposition.

### Authentication
- Email + password sign in and sign up
- Magic link sign in
- Session persistence via MMKV
- Sign out

### Video capture
- In-app camera recording (rear, 60fps, up to 60 seconds)
- Face-on / DTL angle label saved to metadata
- Club type selector (persists last selection)
- Swing hand selector — right or left handed (defaults to profile preference, overridable per video)
- 3-second countdown timer (toggleable)
- Alignment guideline overlay

### Video library
- Grid view of all recorded/imported videos
- Search by title, filter by club type
- Thumbnail + duration display
- Pull to refresh, empty state with record CTA

### Video import
- Import from iOS photo library
- Same upload pipeline as recorded videos

### Playback
- Full-screen video player
- 0.25x / 0.5x / 1x speed
- Frame-by-frame scrub (slider + step buttons)
- Share current frame as image

### Drawing tools
- Line, circle, freehand, angle/protractor, extended plane line
- Select/move existing shapes
- 4 preset colors (white, gold, red, blue)
- Undo last action
- Save drawings to Supabase per video
- Export frame + drawings as image

### Pose skeleton overlay
- On-device body pose detection (Apple Vision; see §16 Risk 4)
- Toggle skeleton on/off during playback
- Golf-relevant landmarks highlighted (wrists, hips, shoulders)
- Free feature — no subscription required

### AI coaching (Pro only)
- 8-frame extraction at canonical swing positions
- Claude Vision analysis via Supabase Edge Function proxy
- Swing score (0-100), issue list with severity, positives, drill
- Analysis cached in Supabase — not re-called unless user refreshes
- Pro gate on entry with upgrade prompt

### Subscriptions
- Monthly ($9.99) and annual ($59.99) Pro plans via RevenueCat
- Entitlement check via useSubscription() hook
- Upgrade flow from any Pro gate, restore purchases in settings

### Profile and settings
- Avatar, username, email, Pro badge or upgrade button
- Default club type, camera angle, swing hand preferences
- Sign out, app version, privacy/terms

### Tempo trainer
- BPM display and metronome playback
- Manual BPM adjustment, 4 saved presets
- Visual pulse animation

---

## 5. V1 Scope

Features planned for the first major update post-MVP.

### Side-by-side comparison
- Two videos from library, portrait stacked or landscape side-by-side
- Sync toggle with manual impact frame marking
- Independent speed controls and pose overlay per video

### Progress tracking
- Swing score trend chart over time
- Issue frequency tracking (most common issues)
- Per-club breakdown

### AI monthly report
- Claude-generated monthly summary of improvement areas
- Delivered as in-app card, triggered server-side

### Drill library (curated static)
- 20-30 hand-curated drills covering common issues
- Linked from AnalysisScreen when relevant issue detected

### Onboarding flow
- Skill level selection, camera angle preference, first swing CTA

---

## 6. Future Vision

Long-term roadmap. Not committed. Captured to ensure architecture does not block them.

- **Coach workflow** — coach account type, annotate student swings, share back with voice notes, B2B subscription tier
- **Tour pro comparison library** — curated reference swings (see Section 16 for licensing strategy)
- **AI-generated drills** — Higgsfield MCP personalised drill videos (see Section 15)
- **Swing progression replay** — animate through historical swings on a single timeline
- **AI practice plan** — Claude generates weekly practice plan from issue history
- **Apple Watch companion** — haptic metronome, tempo tracking at the range
- **Social / community** — share swings publicly, challenge system

---

## 7. Technical Architecture

### Architectural pattern
Feature-based layered architecture. Each feature owns its data fetching, UI components, and screens. Shared infrastructure lives in `src/core/`. No Redux. No React Query.

```
Feature layer     src/features/{feature}/
Shared UI         src/components/ui/
Core services     src/core/ (supabase, claude proxy, mmkv, revenuecat)
Navigation        src/navigation/
Global state      src/store/ (Zustand — auth, subscription, theme only)
Theme             src/theme/
Types             src/types/
```

### Data flow
```
Screen
  └── Custom hook (useVideos, useAnalysis, etc.)
        └── Supabase query or Edge Function call
              └── Zod-validated response
                    └── Optimistic UI update → confirmed on success
```

### Separation of concerns
- **Screens** — layout and composition only. No business logic. No direct API calls.
- **Hooks** — data fetching, mutations, derived state. One hook per data domain.
- **Services (src/core/)** — SDK wrappers with no UI dependencies.
- **Components** — pure presentational. Props in, JSX out.
- **Utils** — pure functions with no side effects.

### Offline strategy
- Recordings saved locally first, then uploaded in background
- Library shows MMKV-cached data when offline
- Playback works fully offline once a video is downloaded
- Analysis and upload clearly disabled when offline (not a spinner — explicit state)
- Upload queue: MMKV-persisted, retries automatically when network returns

### Error handling strategy

| Category | Handling |
|---|---|
| User error (validation, empty field) | Inline field error, no toast |
| Recoverable network error | Toast with retry action |
| Unrecoverable error (auth expired, corrupt) | Full-screen error state with recovery |

- All Supabase calls: typed try/catch, never silent
- All Claude calls: 30s timeout, rate limit detection, retry with backoff
- No Alert.alert() anywhere — use toast or bottom sheet
- No console.log in production — wrapped in __DEV__ guard

### Analytics
**Posthog** (cloud or self-hosted). Not Firebase Analytics.

Key events: video_recorded, video_imported, analysis_requested, analysis_completed, upgrade_prompt_shown, upgrade_tapped, subscription_started, drawing_tool_used, pose_overlay_toggled, comparison_started, screen_viewed.

### Monitoring
**Sentry** for crash reporting. Performance tracing on: Claude Edge Function calls, video upload, pose-engine init + per-frame detection. Sourcemaps uploaded on every TestFlight build.

---

## 8. Technology Stack

| Package | Version | Rationale |
|---|---|---|
| react-native | latest stable | Core. Bare workflow required for the pose-engine native bridge. |
| typescript | 5.x strict | Zero any. Enables confident refactoring at scale. |
| react-native-screens | latest | Native screen containers. Required by React Navigation. |
| react-native-safe-area-context | latest | iPhone notch and Dynamic Island insets. |
| react-native-gesture-handler | latest | Native gestures. Required by navigation and drawing canvas. |
| react-native-reanimated | 3.x | All animations. Worklet-based for 60fps on UI thread. |
| @react-navigation/native | latest | Navigation container. |
| @react-navigation/native-stack | latest | Native stack throughout. No JS stack. |
| @react-navigation/bottom-tabs | latest | Bottom tabs with custom tab bar override. |
| @supabase/supabase-js | latest | Auth, database, storage. Replaces Firebase entirely. |
| react-native-mmkv | latest | Local key-value. 10x faster than AsyncStorage. |
| zustand | latest | Global state (auth, theme, subscription). Minimal API. |
| react-native-vision-camera | 4.x | Camera recording, photo library import, frame processors. |
| react-native-video | 6.x | Playback with frame-accurate seeking. |
| @react-native-camera-roll/camera-roll | latest | Save exported frames to iOS photo library. |
| react-native-view-shot | latest | Capture frame + drawing overlay as image. |
| react-native-compressor | latest | Compress video before upload. Target 10 MB per 10s swing. |
| @anthropic-ai/sdk | latest | Used in Supabase Edge Function only — not in the app bundle. |
| caddie-pose (local) | 0.0.1 | On-device pose detection. Local RN package at `packages/caddie-pose/` wrapping Apple Vision via an Objective-C bridge. Replaces `react-native-mediapipe` per §16 Risk 4 (Vision Camera 5 incompatibility + bundle-size win). |
| react-native-svg | latest | Drawing canvas and pose skeleton rendering. |
| @shopify/flash-list | latest | High-performance lists. Replaces FlatList everywhere. |
| react-native-haptic-feedback | latest | Haptics on key interactions. |
| react-native-purchases | latest | RevenueCat StoreKit 2 wrapper. |
| react-native-sound | latest | Metronome audio. |
| react-native-uuid | latest | UUID generation before Supabase insert. |
| @react-native-community/slider | latest | Frame scrub slider. |
| date-fns | latest | Date formatting. Lightweight, tree-shakeable. |
| zod | latest | Runtime schema validation for all API responses. |
| react-native-config | latest | .env variable access in JS. |
| @sentry/react-native | latest | Crash reporting and performance monitoring. |

### Dropped from previous version

| Package | Reason |
|---|---|
| Firebase (all) | Replaced by Supabase |
| AsyncStorage | Replaced by MMKV |
| react-native-paper | Replaced by custom design system |
| react-native-vector-icons | Replaced by SF Symbols |
| react-native-fast-image | Replaced by built-in Image with Supabase CDN headers |
| react-native-image-picker | Replaced by Vision Camera import capability |
| react-native-create-thumbnail | Replaced by Vision Camera frame processor |
| react-native-mediapipe | Incompatible with Vision Camera 5 (header rename); replaced by the local `caddie-pose` Apple Vision bridge. See §16 Risk 4. |

---

## 9. Directory Structure

```
caddie/
├── App.tsx                          # Entry point — providers only, no logic
├── index.js
├── app.json
├── package.json
├── tsconfig.json                    # strict: true, no any
├── .env                             # Never committed
├── .env.example                     # Committed with empty values
├── .eslintrc.js
├── .prettierrc
├── PROJECT_SPEC.md
├── DESIGN_SYSTEM.md
├── ios/
├── packages/
│   └── caddie-pose/                  # Local RN package — Apple Vision Obj-C bridge (§16 Risk 4)
│       ├── ios/CaddiePose.m
│       ├── CaddiePose.podspec
│       └── src/                      # JS surface consumed by src/core/pose/
└── src/
    ├── core/                        # SDK wrappers — no UI, no React hooks
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   ├── auth.ts
    │   │   └── storage.ts
    │   ├── pose/                    # Pose engine abstraction (delegates to caddie-pose)
    │   │   ├── client.ts
    │   │   └── types.ts
    │   ├── revenuecat/
    │   │   ├── client.ts
    │   │   └── entitlements.ts
    │   ├── sentry/
    │   │   └── client.ts
    │   └── analytics/
    │       └── posthog.ts
    │
    ├── features/                    # One folder per product feature
    │   ├── auth/
    │   │   ├── screens/
    │   │   │   ├── SignInScreen.tsx
    │   │   │   └── SignUpScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useAuth.ts
    │   │   └── components/
    │   │       └── AuthForm.tsx
    │   ├── library/
    │   │   ├── screens/
    │   │   │   ├── LibraryScreen.tsx
    │   │   │   └── VideoDetailScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useVideos.ts
    │   │   └── components/
    │   │       ├── VideoGrid.tsx
    │   │       └── VideoCard.tsx
    │   ├── camera/
    │   │   ├── screens/
    │   │   │   └── CameraScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useCamera.ts
    │   │   └── components/
    │   │       ├── GuidelineOverlay.tsx
    │   │       └── ClubTypeSelector.tsx
    │   ├── playback/
    │   │   ├── screens/
    │   │   │   └── PlaybackScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── usePlayback.ts
    │   │   └── components/
    │   │       ├── VideoPlayer.tsx
    │   │       ├── PlaybackControls.tsx
    │   │       ├── DrawingCanvas.tsx
    │   │       └── PoseOverlay.tsx
    │   ├── analysis/
    │   │   ├── screens/
    │   │   │   └── AnalysisScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useAnalysis.ts
    │   │   └── components/
    │   │       ├── SwingScore.tsx
    │   │       ├── IssueList.tsx
    │   │       ├── IssueCard.tsx
    │   │       ├── CoachingCard.tsx
    │   │       └── DrillCard.tsx
    │   ├── comparison/
    │   │   ├── screens/
    │   │   │   └── ComparisonScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useComparison.ts
    │   │   └── components/
    │   │       └── ComparisonPlayer.tsx
    │   ├── tempo/
    │   │   ├── screens/
    │   │   │   └── TempoScreen.tsx
    │   │   ├── hooks/
    │   │   │   └── useTempo.ts
    │   │   └── components/
    │   │       └── PulseRing.tsx
    │   ├── home/
    │   │   ├── screens/
    │   │   │   └── HomeScreen.tsx
    │   │   └── components/
    │   │       ├── StatsRow.tsx
    │   │       └── QuickActions.tsx
    │   └── profile/
    │       ├── screens/
    │       │   ├── ProfileScreen.tsx
    │       │   └── SettingsScreen.tsx
    │       └── hooks/
    │           └── useProfile.ts
    │
    ├── components/ui/               # Shared design system components
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Badge.tsx
    │   ├── Input.tsx
    │   ├── Modal.tsx
    │   ├── BottomSheet.tsx
    │   ├── Toast.tsx
    │   ├── Tag.tsx
    │   ├── Divider.tsx
    │   ├── Avatar.tsx
    │   ├── ProgressBar.tsx
    │   ├── Skeleton.tsx
    │   ├── Icon.tsx
    │   ├── Screen.tsx
    │   ├── Header.tsx
    │   ├── TabBar.tsx
    │   ├── ProGate.tsx
    │   ├── EmptyState.tsx
    │   ├── SearchBar.tsx
    │   └── FilterSheet.tsx
    │
    ├── navigation/
    │   ├── RootNavigator.tsx
    │   ├── AppNavigator.tsx
    │   └── types.ts                 # All route params typed — no route.params as any
    │
    ├── store/
    │   └── useAppStore.ts           # Zustand: auth, theme, subscription only
    │
    ├── theme/
    │   ├── colors.ts
    │   ├── typography.ts
    │   ├── spacing.ts
    │   └── index.ts
    │
    ├── types/
    │   ├── database.ts              # Generated from Supabase schema
    │   ├── video.ts
    │   ├── analysis.ts
    │   ├── drawing.ts
    │   └── navigation.ts
    │
    ├── utils/
    │   ├── formatters.ts
    │   ├── frameExtractor.ts
    │   ├── permissions.ts
    │   ├── validation.ts            # Zod schemas
    │   └── upload.ts                # Upload queue + retry logic
    │
    └── constants/
        ├── config.ts
        └── swingPositions.ts        # 8 canonical swing positions
```

---

## 10. Navigation Architecture

```
RootNavigator
├── AuthStack                        (no session)
│   ├── SignInScreen
│   └── SignUpScreen
│
└── AppNavigator — Bottom Tabs       (authenticated)
    ├── HomeTab       → HomeScreen
    ├── LibraryTab    → LibraryScreen
    │                    └── VideoDetailScreen (push)
    ├── [Record FAB]  → CameraScreen  (modal, full screen)
    ├── TempoTab      → TempoScreen
    └── ProfileTab    → ProfileScreen
                          └── SettingsScreen (push)

Modal stack (tab bar hidden):
├── PlaybackScreen
├── AnalysisScreen
└── ComparisonScreen
```

Rules:
- All route params typed in `src/navigation/types.ts`
- Native stack everywhere
- Modal screens hide tab bar via `tabBarStyle: { display: 'none' }`

---

## 11. State Management

### Zustand global store

```typescript
interface AppStore {
  user: User | null
  isAuthLoading: boolean
  isPro: boolean
  theme: 'dark' | 'light'
  setUser: (user: User | null) => void
  setAuthLoading: (loading: boolean) => void
  setIsPro: (isPro: boolean) => void
  setTheme: (theme: 'dark' | 'light') => void
}
```

`theme` and `isPro` persisted to MMKV via Zustand middleware. Auth session managed by Supabase SDK, stored in MMKV.

### Feature hooks
All per-screen data in custom hooks. Each hook owns: `data`, `isLoading`, `isRefreshing`, `error`, and mutation functions with optimistic updates.

No data stored in Zustand unless accessed by two or more unrelated features.

---

## 12. Database Architecture

### Schema

#### profiles
```sql
id            uuid references auth.users primary key
username      text unique not null
display_name  text
avatar_url    text
skill_level   text check (skill_level in ('beginner','intermediate','advanced'))
swing_hand    text check (swing_hand in ('right','left')) default 'right'
is_pro        boolean default false
analyses_run  integer default 0
streak_days   integer default 0
last_active   timestamptz
created_at    timestamptz default now()
```

#### videos
```sql
id              uuid primary key default gen_random_uuid()
user_id         uuid references profiles(id) on delete cascade
title           text not null
storage_path    text not null
thumbnail_path  text
duration_ms     integer
club_type       text
camera_angle    text check (camera_angle in ('face-on','dtl'))
swing_hand      text check (swing_hand in ('right','left')) not null default 'right'
tags            text[] default '{}'
drawings        jsonb default '{}'
has_analysis    boolean default false
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

#### analyses
```sql
id              uuid primary key default gen_random_uuid()
video_id        uuid references videos(id) on delete cascade
user_id         uuid references profiles(id) on delete cascade
swing_score     integer check (swing_score between 0 and 100)
issues          jsonb not null default '[]'
positives       jsonb not null default '[]'
drill           text
coaching_text   text not null
frame_refs      text[] default '{}'
model_version   text not null
prompt_version  text not null
input_tokens    integer
output_tokens   integer
created_at      timestamptz default now()
```

#### tempo_presets
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references profiles(id) on delete cascade
bpm_values  integer[] default '{}'
updated_at  timestamptz default now()
```

### Row Level Security
All tables enforce RLS. Users can only access their own rows.

```sql
create policy "Users own their data"
  on videos for all
  using (auth.uid() = user_id);
-- Repeat for all tables
```

### Indexes
```sql
create index videos_user_id_created_at on videos(user_id, created_at desc);
create index analyses_video_id on analyses(video_id);
create index analyses_user_id_created_at on analyses(user_id, created_at desc);
```

---

## 13. Storage Architecture

### Buckets

| Bucket | Access | Max size | Path |
|---|---|---|---|
| videos | Private (signed URLs, 15 min) | 500 MB | {userId}/{uuid}.mp4 |
| thumbnails | Public (1-year cache) | 2 MB | {userId}/{uuid}.jpg |

### Upload pipeline
1. Record or import → temporary local file
2. Compress with react-native-compressor (H.264, target 10 MB for 10s swing)
3. Extract thumbnail at 1s via Vision Camera frame processor
4. Upload thumbnail (blocking — needed for UI immediately)
5. Upload video to `videos` bucket (background — non-blocking)
6. Insert Postgres row
7. On failure: store in MMKV upload queue, retry on next network connection

### Cost awareness
Average compressed swing: 8-12 MB. At 1,000 active users recording 5 swings/week: 40-60 GB/month. Monitor Supabase Storage costs monthly; add per-user quota display in V1.

---

## 14. AI Architecture

### Critical security requirement
The Anthropic API key must never ship inside the app bundle. All Claude calls are proxied through a Supabase Edge Function.

```
App (Supabase JWT auth) → Edge Function (analyze-swing) → Claude API
```

The Edge Function:
- Validates the user's Supabase JWT
- Enforces daily per-user limit (10 analyses/day)
- Calls Claude Vision API with the canonical prompt
- Returns structured JSON
- Tracks token usage in the `analyses` table

The Edge Function accepts from the app: `frames`, `cameraAngle`, `clubType`, `swingHand`, `userSkillLevel`, `previousIssues`. All fields passed directly into the versioned system prompt.

### Frame extraction strategy

| Position | Detection signal |
|---|---|
| Address | Wrists at hip height, minimal shoulder rotation |
| Takeaway | Right wrist rising, club parallel to ground |
| Halfway back | Left arm parallel to ground |
| Top | Max shoulder rotation, wrists highest point |
| Transition | Shoulder rotation beginning to decrease |
| Halfway down | Left arm parallel (downswing) |
| Impact | Wrists lowest, hips most open |
| Finish | Weight on lead foot |

Fallback (pose engine unavailable): frames at 10%, 20%, 30%, 45%, 55%, 65%, 75%, 90% of duration.

### Prompt versioning
System prompts versioned in `src/core/claude/prompts.ts`. Version stored in `analyses.prompt_version` column. This enables A/B testing and safe iteration without corrupting historical records.

### Canonical system prompt (v1.0)
```
You are a PGA-certified golf instructor analyzing a golf swing from 8 sequential video frames.

Camera angle: {cameraAngle}
Club: {clubType}
Player handedness: {swingHand} (right-handed or left-handed golfer)
Player level: {userSkillLevel}
Previous issues (if any): {previousIssues}

The player is {swingHand}-handed. All directional references (e.g. "trail arm", "lead hip", "right elbow") must be
correct for a {swingHand}-handed golfer. Do not give right-handed instructions to a left-handed golfer.

Analyze the swing across all 8 frames. Be specific about which frame (0-7) best illustrates each issue.
Use a direct, knowledgeable coach voice. Say what you see.

Respond with valid JSON only. No preamble, no markdown. Schema:
{
  "score": number (0-100, 100 = tour professional),
  "summary": string (2-3 sentences, coach voice, specific to this swing),
  "issues": [
    {
      "name": string,
      "severity": "minor" | "moderate" | "major",
      "frame_index": number (0-7),
      "description": string,
      "fix": string (one specific actionable correction, directionally correct for this player's handedness)
    }
  ],
  "positives": string[] (1-3 genuine strengths),
  "drill": string (one specific drill for the most impactful issue, correct for this player's handedness)
}
```

### Response validation (Zod)
```typescript
const SwingAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(10),
  issues: z.array(z.object({
    name: z.string(),
    severity: z.enum(['minor', 'moderate', 'major']),
    frame_index: z.number().int().min(0).max(7),
    description: z.string(),
    fix: z.string(),
  })),
  positives: z.array(z.string()).min(1).max(3),
  drill: z.string(),
})
```

### Cost management
- Analysis only on explicit user tap — never automatic
- Cache in `analyses` table — never re-analyse same video unless user refreshes
- Track `input_tokens` and `output_tokens` per analysis
- Daily limit: 10 analyses per user, enforced server-side
- Monthly token budget per user (V1): alert at 80%, pause at 100%
- One in-flight request maximum — block concurrent calls

### Future AI opportunities
- **Swing progression analysis** — send multiple analyses to Claude over time, text-only, cheap, high perceived value
- **AI practice plan** — 4-week plan generated from issue history, text-only
- **Monthly AI report** — automated summary, triggered server-side via Supabase cron
- **Personalised coaching voice** — store user tone preference, inject into system prompt alongside existing handedness context

---

## 15. Drill Content Strategy

### Option A — Curated static text library
Hand-written drill descriptions linked to Claude-detected issues.

| | |
|---|---|
| Pros | Zero cost, instant load, offline, no copyright issues |
| Cons | No video, requires editorial effort, not personalised |
| Cost | One-time ~20 hours editorial |
| Storage | ~50KB JSON |

**Recommended for MVP.** 20-30 drills covering: over the top, early extension, casting, swaying, flying elbow, hip slide, reverse pivot, poor grip.

### Option B — Pre-recorded drill videos
Short instructional videos demonstrating each drill, produced with a teaching professional.

| | |
|---|---|
| Pros | High perceived value, visual instruction |
| Cons | High production cost ($500-5,000), storage cost, maintenance |
| Storage | ~200 MB for 30 drill videos at 720p in Supabase `drills` bucket |

**Recommended for V1**, once issue taxonomy is validated by real user data.

### Option C — Standard AI-generated drill videos
Use Runway, Sora, or Pika to generate instructional clips.

| | |
|---|---|
| Pros | Scalable, cheaper than production |
| Cons | Current quality insufficient for biomechanical accuracy. High risk of teaching incorrect technique. |

**Not recommended yet.** Revisit in 12-18 months as model quality improves.

### Option D — Higgsfield MCP generated content
Personalised drill demonstrations generated via Higgsfield API, potentially overlaid with the user's own swing data.

| | |
|---|---|
| Pros | Potentially highly personalised — "demonstrated with your body type and swing plane" |
| Cons | Early technology, unpredictable quality, unknown cost |

**Recommended for future exploration (V2+).** A genuine competitive differentiator no other golf app offers. Build the DrillCard component to accept either static text or a video URL — switching later requires no component changes.

### Recommendation summary
```
MVP:     Option A — static text drills
V1:      Option B — produced drill videos with teaching pro
Future:  Option D — Higgsfield personalised generation
```

---

## 16. Tour Pro Comparison Strategy

### Licensing considerations
Professional golf swing videos are owned by tours, broadcasters, or player management companies. Using unlicensed tour footage is not viable — copyright infringement risk is high.

### Responsible options

**Option A — License directly from players**
Approach teaching-friendly professionals with YouTube presence. License specific clips directly. Offer rev-share or flat fee.

Pros: Clean licensing, authentic quality, marketing relationship
Cons: Time-consuming, cost ($500-2,000/player), legal agreement required

**Option B — Commission purpose-shot content**
Hire a scratch golfer (not a tour pro) with excellent technique to film controlled swing clips for the app. Full ownership, no licensing issues.

Pros: Full ownership, controlled angles and club types
Cons: Not a "real tour pro" which is the marketing hook

**Option C — Partner with a teaching academy**
Partner with David Leadbetter, Butch Harmon, etc. for certified swing references.

Pros: Brand credibility, clear licensing
Cons: Negotiation complexity

### Recommendation
```
MVP:     Do not include. Licensing complexity will delay launch.
V1:      Option B — purpose-shot reference swings (5 club types, 2 angles each).
         Display as "Reference swing" not "tour pro" to avoid misrepresentation.
Future:  Option A — direct player licensing once app has traction.
```

### Database (future)
```sql
create table reference_swings (
  id            uuid primary key,
  label         text,  -- e.g. "Driver — Face On"
  player_name   text,  -- e.g. "Reference: Tour-level driver"
  club_type     text,
  angle         text,
  storage_path  text,
  thumbnail_path text,
  is_active     boolean default true
);
-- Admin-only insert, no RLS user access
```

---

## 17. Subscription Architecture

### RevenueCat configuration

**Entitlements:**
```
caddie_pro — gates all Pro features
```

**Products (App Store Connect):**
```
caddie_pro_monthly   $9.99/month
caddie_pro_annual    $59.99/year  (~50% discount, highlighted as "Best value")
```

### Feature gating
```typescript
// All Pro features gated at component level
const { isPro } = useSubscription()
if (!isPro) return <ProGate feature="AI Coaching" />
```

`isPro` populated on app launch from `RevenueCat.getCustomerInfo()`, refreshed after any purchase event.

### Upgrade flow
1. User taps Pro-gated feature
2. ProGate component shows value + crown icon + gold border
3. "Upgrade to Pro" → UpgradeSheet bottom sheet
4. Monthly and annual options shown, annual highlighted
5. Tap plan → RevenueCat purchasePackage()
6. Success: update Zustand isPro, dismiss, deliver feature
7. Failure: error toast, sheet stays open
8. Always show "Restore purchases" in SettingsScreen

Never hard-block. Always show value before the ask.

### Tester and beta access

| Audience | Method |
|---|---|
| Internal team | RevenueCat promotional entitlement — permanent |
| TestFlight beta testers (<100) | RevenueCat promotional entitlement — time-limited |
| Launch promotion | App Store offer code "LAUNCH" — 1 month free |
| Competition winners / press | RevenueCat promotional entitlement — 30/90/365 day expiry |

Use RevenueCat promotional entitlements for all internal and beta access. No custom code required. Entitlements are free, immediate, revocable, and set in the RevenueCat dashboard.

Do not build a custom gifting/coupon system — RevenueCat handles this.

---

## 18. Testing Strategy

### Unit tests (src/**/__tests__/)
Tool: Jest

What to test:
- All utility functions (formatters, frameExtractor, validation)
- Zod schemas — valid and invalid inputs
- Zustand store state transitions
- Pure business logic extracted from hooks

### Component tests (src/components/__tests__/)
Tool: @testing-library/react-native

Test these 8 components in isolation:
- Button — all variants, loading, disabled
- Input — focused, error, helper text
- ProGate — children when Pro, upgrade card when not
- Badge — all variant color mappings
- SwingScore — correct label per score bracket
- EmptyState — icon, title, body, optional button
- Skeleton — renders without crash
- VideoCard — thumbnail, duration, metadata

### Integration tests
Tool: Jest + mocked Supabase client

- useVideos — fetch, optimistic delete, error state
- useAnalysis — request flow, cache hit, cache miss, error
- useAuth — sign in, sign out, session restore

### End-to-end tests (e2e/)
Tool: Maestro

Critical flows:
1. Sign up → empty library → record video → video appears in library
2. Tap video → playback → scrub → draw line → export image
3. Tap "Analyse with AI" → Pro gate → sandbox upgrade → analysis renders
4. Sign out → sign back in → session restored, videos present

Run on iOS simulator via GitHub Actions on every PR.

### Coverage targets
```
Utilities:          90%+
Core services:      80%+
UI components:      70%+
Hooks:              70%+
E2E critical flows: 100% (all 4 flows pass on every PR)
```

---

## 19. CI/CD Strategy

### Branch strategy
```
main        Production-ready only. Protected. Requires PR + review.
develop     Integration branch. All features merge here first.
feature/*   Individual feature branches
fix/*       Bug fix branches
chore/*     Dependency and config changes
```

### Commit convention (Conventional Commits)
```
feat: add angle tool to drawing canvas
fix: resolve frame extraction crash on short videos
chore: update react-native-vision-camera to 4.1.0
```

### GitHub Actions pipelines

**PR check (every PR to develop):**
- TypeScript type check (tsc --noEmit)
- ESLint
- Jest unit + component tests
- Upload coverage report

**E2E check (parallel, every PR to develop):**
- Build iOS simulator binary
- Run Maestro flows on iPhone 15 Pro simulator
- Upload artifacts on failure

**TestFlight deploy (merge to main):**
- Increment build number
- Build release IPA (Fastlane)
- Upload to TestFlight
- Post Slack notification with build number and changelog

### Release process
```
1. Merge develop → main via PR
2. CI builds and uploads to TestFlight automatically
3. Internal team tests (24-48 hours)
4. Promote to external beta group
5. Fix critical issues via fix/* branches
6. Tag release: git tag v1.0.0
7. Submit to App Store from TestFlight build
```

---

## 20. Security Considerations

### API keys
- All keys in .env, accessed via react-native-config
- .env in .gitignore — never committed
- .env.example committed with empty values
- CI: keys as GitHub Actions secrets, injected at build time

### Anthropic API key — critical
Never ships in the app bundle. Lives as a Supabase secret. Only the Edge Function touches it. See Section 14.

### Supabase
- Anon key is safe to ship — only allows RLS-gated operations
- Never use service role key in the app
- All tables have RLS enforced — test with a second test account

### RevenueCat
- Public API key is safe to ship
- Never expose RevenueCat secret key

### User data
- No sensitive data stored locally
- Video storage paths use UUIDs — not guessable
- Signed URLs expire after 15 minutes
- Add disclaimer in app: "Caddie provides coaching suggestions for informational purposes. Consult a qualified instructor for professional advice."

---

## 21. Technical Risks

### Risk 1 — Anthropic API cost overrun
**Severity**: High | **Probability**: Medium

At ~$0.006-0.01 per analysis, 100,000 analyses could cost $600-1,000 unexpectedly.

Mitigation: Edge Function proxy with server-side daily limit (10/user/day), monthly token budget with alert at 80%, pause at 100%.

### Risk 2 — Video storage costs
**Severity**: Medium | **Probability**: High (at scale)

1,000 active users at 5 swings/week = 40-60 GB/month.

Mitigation: Aggressive compression at upload (target 8 MB), per-user quota display in V1, consider soft/hard limits on free tier.

### Risk 3 — Pose engine performance on older devices
**Severity**: Medium | **Probability**: Low-Medium

Per-frame pose detection during scrub may cause drops on older A-series chips. Apple Vision's `VNDetectHumanBodyPoseRequest` is hardware-accelerated on iPhone XS+ but still has a per-frame cost.

Mitigation: Target 30fps not 60fps for pose. Process every other frame under load. Detect capability; offer reduced quality mode. Minimum test device: iPhone XS (A12, 2018).

### Risk 4 — Pose-engine package risk — RESOLVED via direct native bridge
**Severity**: Medium | **Probability**: Medium | **Status**: MATERIALIZED + RESOLVED

The originally-named `react-native-mediapipe` proved incompatible with Vision Camera 5 (header rename: `'VisionCamera/FrameProcessorPlugin.h' file not found`). It also peer-depends on `react-native-worklets-core` (separate from our `react-native-worklets`/Reanimated 4) and its frame-processor architecture is built for live camera streams — not the per-frame inference on recorded video that our Phase 3.2 / 4.2 needs.

Mitigation (taken): The documented fallback ("minimal native Objective-C bridge") was implemented in `packages/caddie-pose/` as a local RN package — autolinked by CocoaPods, no main-target Xcode editing. The engine inside that bridge is **Apple Vision** (`VNDetectHumanBodyPoseRequest`) rather than MediaPipe iOS SDK, because:
1. Vision is built into iOS (0 MB binary cost vs ~50 MB for MediaPipe SDK + `pose_landmarker_lite.task`)
2. Vision's 19 body landmarks cover every joint required by §22 Phase 3.3 metrics (shoulders, hips, spine, head)
3. Zero third-party risk — Apple doesn't deprecate Vision

The abstraction in `src/core/pose/` is unchanged. If/when we want MediaPipe specifically (e.g., the 14 extra landmarks become useful), only `packages/caddie-pose/ios/CaddiePose.m` is rewritten — JS surface stays identical.

See TODO.md for the full incident write-up and the swap-back-to-MediaPipe checklist.

### Risk 5 — App Store review friction
**Severity**: Low-Medium | **Probability**: Low

AI content and subscription apps face extra scrutiny.

Mitigation: Follow Apple's subscription guidelines precisely. Clear pricing, restore button, terms link. Add coaching disclaimer.

### Risk 6 — Vision Camera breaking changes
**Severity**: Low | **Probability**: Low

Major version upgrades have historically broken APIs.

Mitigation: Pin to specific minor version. Abstract camera operations behind useCamera hook.

### Risk 7 — Tour pro content licensing (if pursued)
**Severity**: High | **Probability**: N/A for MVP

Using unlicensed tour footage risks App Store removal and legal action.

Mitigation: Not included in MVP. See Section 16.

---

## 22. Implementation Phases

Each phase has one primary objective. The app remains runnable after every phase. No phase mixes concerns.

---

### Phase 0.1 — Project scaffold
Runnable bare React Native app with TypeScript and code quality tools.
- Init bare RN project with TypeScript template
- Configure tsconfig.json strict mode
- Install and configure ESLint and Prettier
- Create .env and .env.example, install react-native-config
- Confirm app runs on iOS simulator

### Phase 0.2 — Theme foundation
Design system tokens available throughout the app.
- Create src/theme/colors.ts (full token set from DESIGN_SYSTEM.md)
- Create src/theme/typography.ts, spacing.ts, index.ts
- Create src/constants/config.ts and swingPositions.ts

### Phase 0.3 — Navigation skeleton
All screens exist as placeholders; navigation between them works.
- Install React Navigation and all dependencies
- Create RootNavigator and AppNavigator
- Create all screen files as empty placeholder components
- Create src/navigation/types.ts with all route param types
- Tab bar visible, all tabs navigable, tab bar hidden on modal screens

### Phase 0.4 — Global state and storage
Zustand store and MMKV available and persisting correctly.
- Install Zustand and react-native-mmkv
- Create useAppStore.ts with full shape
- Wire MMKV persistence for theme and isPro
- Confirm hot reload preserves persisted values

### Phase 0.5 — Supabase foundation
Supabase client initialised; complete database schema created.
- Install @supabase/supabase-js
- Create src/core/supabase/client.ts
- Run all SQL migrations in Supabase dashboard (tables, RLS, indexes)
- Generate TypeScript types → src/types/database.ts

### Phase 0.6 — Authentication
Users can sign in, sign up, and have session restored on launch.
- Create src/core/supabase/auth.ts
- Create useAuth hook
- Build SignInScreen and SignUpScreen UI
- Wire session persistence to MMKV
- RootNavigator shows correct stack based on session state
- Confirm: sign up → kill app → re-open → still signed in

### Phase 0.7 — Sentry and analytics
Crash reporting and analytics active before any features ship.
- Install and configure @sentry/react-native
- Install and configure Posthog
- App.tsx error boundary reports to Sentry
- Confirm: deliberate throw appears in Sentry dashboard

### Phase 0.8 — RevenueCat initialisation
Subscription status available in global store; ProGate component works.
- Install react-native-purchases
- Create src/core/revenuecat/client.ts
- On launch: getCustomerInfo() → set isPro in Zustand
- Create useSubscription hook
- Build ProGate component
- No paywall UI yet — gate mechanism only

---

### Phase 1.1 — Core UI components
Design system components built before any screen uses them.
- Button (primary, secondary, ghost; all sizes; loading; disabled)
- Card (default, raised)
- Badge (all 5 variants)
- Input (label, focused, error states)
- Skeleton (shimmer animation)
- EmptyState (icon, title, body, optional button)
- Divider, Avatar, Toast

### Phase 1.2 — Camera permissions
Camera and microphone permissions handled; Vision Camera device ready.
- Install react-native-vision-camera
- Create src/utils/permissions.ts
- Request permissions on CameraScreen entry; handle denied with settings deep link
- Camera preview renders on device

### Phase 1.3 — Video recording
User can record a swing; file lands in temporary storage.
- CameraScreen UI (face-on/DTL toggle, club type selector, swing hand selector, countdown, guideline overlay)
- Swing hand defaults to profile preference; overridable per-recording
- Record button starts/stops recording
- On stop: temp file saved, navigate to preview

### Phase 1.4 — Upload pipeline
Recorded video compressed, uploaded, and Postgres row created.
- Install react-native-compressor
- Create src/core/supabase/storage.ts
- Create src/utils/upload.ts (queue + retry)
- Compress → extract thumbnail → upload thumbnail (blocking) → upload video (background) → insert row
- MMKV upload queue for failure/retry

### Phase 1.5 — Video library
User can see all their videos in a grid.
- Install @shopify/flash-list
- Create useVideos hook
- LibraryScreen: FlashList 2-column grid, pull-to-refresh, empty state, skeleton loading
- VideoCard component: thumbnail, duration badge, club/date metadata

### Phase 1.6 — Video import
User can import existing video from iOS photo library.
- Install @react-native-camera-roll/camera-roll
- Photo library permission handling
- Import runs through same upload pipeline

### Phase 1.7 — Video playback
User can play back swing at variable speeds with frame control.
- Install react-native-video
- Build VideoPlayer, PlaybackControls, PlaybackScreen
- Speed: 0.25x, 0.5x, 1x
- Frame scrub slider + prev/next step buttons
- Controls auto-hide after 3 seconds; tap to toggle

### Phase 1.8 — Video management
User can rename, retag, and delete videos.
- Edit metadata sheet (title, club type, camera angle, swing hand, tags)
- Long-press context menu on VideoCard (edit, delete)
- Delete: confirmation sheet → Supabase delete + Storage delete

---

### Phase 2.1 — Drawing canvas foundation
SVG canvas overlays video player; touch events registered without conflicting with playback.
- Install react-native-svg
- DrawingCanvas component (absolute SVG over VideoPlayer)
- Touch responder captures start/move/end
- Canvas dimensions match video dimensions

### Phase 2.2 — Drawing tools: line and freehand
- Line tool: tap-drag to create, draggable endpoints after creation
- Freehand tool: continuous path follows finger
- Tool selection UI (right-edge vertical toolbar)
- DrawingState TypeScript types defined
- Undo: removes last shape (shake gesture + button)

### Phase 2.3 — Drawing tools: circle, angle, plane line, select
- Circle tool: drag to set radius
- Angle/protractor: 3-point, shows degrees
- Extended plane line: continues to canvas edges
- Select/move tool: tap to select, drag to move
- Delete selected: trash icon when shape selected
- Color picker: 4 preset colors

### Phase 2.4 — Drawing persistence and export
- Save DrawingState to videos.drawings (debounced, 1s after last stroke)
- Load saved drawings on PlaybackScreen open
- Install react-native-view-shot
- Share button: capture frame + drawings → save to camera roll or share sheet

---

### Phase 3.1 — Pose engine initialisation
On-device pose engine initialised; failure handled gracefully.
- Install local `caddie-pose` package (Apple Vision Objective-C bridge; replaces `react-native-mediapipe` per §16 Risk 4)
- Create `src/core/pose/` abstraction layer (engine-agnostic public API)
- Init engine on app launch (background thread)
- Failure disables pose features without crash

### Phase 3.2 — Pose overlay on playback
Skeleton renders over video during scrubbing.
- Build PoseOverlay component (SVG)
- Run pose detection on current frame as user scrubs
- Add `src/core/pose/landmarks.ts` — map the engine's raw joint names to a stable schema (`leftShoulder`, etc.)
- Golf-relevant landmarks highlighted
- Toggle on/off in PlaybackScreen toolbar
- React.memo, skip render if no landmarks

### Phase 3.3 — Derived pose metrics
Biomechanics metrics computed and displayed.
- Shoulder rotation angle, hip-shoulder separation, spine tilt, head delta
- Small collapsible metric overlay when pose active
- These metrics feed into Phase 4 frame classification

---

### Phase 4.1 — Supabase Edge Function (Claude proxy)
All Claude API calls go through server-side proxy; key never ships in app.
- Create Edge Function analyze-swing
- Validates Supabase JWT
- Enforces daily per-user limit (10/day)
- Calls Claude Vision API, returns structured JSON
- Tracks token usage

### Phase 4.2 — Frame extraction utility
8 canonical frames extracted from any video.
- Create src/utils/frameExtractor.ts
- Pose landmark-based position detection (via `@/core/pose`'s `detectPose`)
- Fallback to evenly-spaced frames
- Output: 8 JPEG base64 strings, max 1200px, quality 85

### Phase 4.3 — Analysis screen UI
AnalysisScreen renders correctly for all states with mock data.
- SwingScore (animated ring, 800ms ease-out, score brackets)
- IssueCard (frame thumbnail, severity badge, description, fix)
- IssueList, CoachingCard, DrillCard
- Loading state: animated sparkle + elapsed time
- Error state: retry button

### Phase 4.4 — End-to-end analysis flow
User can tap "Analyse with AI" and receive a complete coaching report.
- Wire useAnalysis hook to Edge Function
- PlaybackScreen → Pro gate → loading → AnalysisScreen
- Cache result in analyses table
- Cache hit skips API call
- Token tracking stored per analysis

### Phase 4.5 — Upgrade flow
Users can purchase Pro from any gate; purchase reflected immediately.
- Build UpgradeSheet (monthly + annual, annual highlighted)
- RevenueCat purchasePackage() on plan tap
- Success: isPro → true, dismiss, deliver feature
- "Restore purchases" in SettingsScreen
- Confirm: sandbox purchase works end-to-end

---

### Phase 5.1 — Side-by-side comparison
User can compare two swings with sync.
- ComparisonPlayer (two VideoPlayer instances)
- Two video pickers from library
- Portrait stacked / landscape side-by-side
- Sync toggle with impact frame markers
- Independent speed control, pose overlay per video
- Sessions ephemeral

### Phase 5.2 — Home screen
HomeScreen populated with real data.
- Stats row (total videos, analyses, streak)
- Latest swing card
- Recent coaching card (Pro only)
- Quick actions: Record, Import, Compare, Tempo

### Phase 5.3 — Tempo trainer
Functional metronome with presets.
- Install react-native-sound
- BPM display, play/stop, +/- with hold-to-fast-change
- 4 preset slots (long-press to save, persisted to Supabase)
- PulseRing animation (Reanimated)

### Phase 5.4 — Profile and settings
Profile screen and settings fully functional.
- ProfileScreen (avatar, username, email, Pro badge, stats, sign out)
- SettingsScreen (default club type, default camera angle, default swing hand, clear cache, version, privacy/terms)
- Avatar upload via photo picker
- Swing hand preference saved to profiles table, used as default for all new recordings

### Phase 5.5 — Polish and pre-launch
App ready for TestFlight external beta.
- App icon (all sizes)
- Splash screen
- Onboarding flow
- All empty states
- All error states
- Offline detection banner
- All Maestro E2E flows passing
- Sentry verified
- RevenueCat sandbox purchase verified

---

## 23. Environment Variables

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=

# RevenueCat
REVENUECAT_API_KEY_IOS=

# Sentry
SENTRY_DSN=

# Posthog
POSTHOG_API_KEY=
POSTHOG_HOST=

# App
APP_ENV=development
```

The Anthropic API key is NOT stored in .env. It lives as a Supabase secret and is accessed only by the Edge Function. It never enters the app bundle.

Access all values via react-native-config:
```typescript
import Config from 'react-native-config'
const supabaseUrl = Config.SUPABASE_URL
```

Never commit .env. Always commit .env.example with empty values.

---

> For Claude Code sessions:
> Start every session: "Read PROJECT_SPEC.md and DESIGN_SYSTEM.md. We are building greenfield — no existing code. Tell me which phase we are implementing, then proceed."
> Implement one phase at a time. Confirm the app builds and runs after each phase before starting the next.
