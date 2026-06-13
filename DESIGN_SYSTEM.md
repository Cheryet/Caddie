# Caddie — Design System
> Version 1.0 · Last updated June 2026  
> Reference this document before writing any component, screen, or style.

---

## 1. Design Philosophy

**Premium dark athletic.** Every decision should feel like it belongs in a high-end sports performance product — precise, confident, and purposeful. Nothing decorative that doesn't serve a function. The interface recedes so the swing video is the star.

Three rules that override everything else:
1. **Video is primary.** UI chrome dims or disappears when video is playing. Never compete with the content.
2. **One accent, used sparingly.** Gold (`#C9A84C`) is reserved for the single most important action on any screen, active states, and Pro features. If gold appears more than twice on a screen, something is wrong.
3. **Density over decoration.** Golfers want data. Pack information cleanly rather than padding things out.

---

## 2. Color Tokens

### Base palette (`src/theme/colors.ts`)

```typescript
export const colors = {
  // Backgrounds — layered depth system
  bg: {
    base:     '#0A0A0A',   // true black — screen backgrounds, video chrome
    elevated: '#111111',   // cards, sheets resting on base
    overlay:  '#1A1A1A',   // modals, popovers, second-level cards
    input:    '#1E1E1E',   // input fields, selects
  },

  // Borders
  border: {
    subtle:   '#1F1F1F',   // dividers, card outlines (barely visible)
    default:  '#2A2A2A',   // standard borders
    strong:   '#3A3A3A',   // active/focused borders
  },

  // Text
  text: {
    primary:   '#F0EDE8',  // near-white with warm tint — main body text
    secondary: '#8A8580',  // labels, metadata, timestamps
    tertiary:  '#5A5652',  // placeholders, disabled text
    inverse:   '#0A0A0A',  // text on gold backgrounds
  },

  // Primary accent — gold
  gold: {
    dim:       '#6B5520',  // very subtle gold tint (backgrounds, badge fills)
    muted:     '#8A6E2E',  // secondary gold use (icons, borders)
    default:   '#C9A84C',  // primary — CTAs, active tabs, highlights
    bright:    '#E2BF6A',  // hover / pressed state on gold
    text:      '#F5DFA0',  // gold text on dark background (readable)
  },

  // Semantic
  semantic: {
    success:  '#4A9B6F',   // green — positive scores, good metrics
    warning:  '#C47D2A',   // amber — moderate issues
    error:    '#C94A4A',   // red — major issues, errors
    info:     '#4A7EC9',   // blue — informational, neutral tips
  },

  // Swing issue severity (maps to semantic)
  severity: {
    minor:    '#4A9B6F',   // = success
    moderate: '#C47D2A',   // = warning
    major:    '#C94A4A',   // = error
  },

  // Drawing tool colors (fixed palette for annotations)
  drawing: {
    white: '#F0EDE8',
    gold:  '#C9A84C',
    red:   '#E05555',
    blue:  '#4A9EDB',
  },

  // Always available regardless of theme
  always: {
    black: '#000000',
    white: '#FFFFFF',
    transparent: 'transparent',
  },
} as const

export type ColorToken = typeof colors
```

### Theme wrapper

The app is dark-first. Light theme is a V2 consideration — do not scaffold it now. All components reference `colors.*` directly. No theme switching infrastructure needed in Phase 0–5.

If light mode is added later, introduce a `useTheme()` hook at that point and swap the token file.

---

## 3. Typography (`src/theme/typography.ts`)

### Typefaces
- **Display / headings**: SF Pro Display (system, iOS) — access via `fontFamily: undefined` with large weights. iOS renders this automatically for large text.
- **Body / UI**: SF Pro Text (system, iOS) — standard font family.
- **Monospace / data**: SF Mono — used for scores, BPM numbers, frame counts.
- No custom fonts loaded. System fonts keep the bundle lean and render at native quality.

### Type scale

```typescript
export const typography = {
  // Display — screen titles, big numbers
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // Title — section headers, card titles
  title1: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  title2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  title3: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.text.primary,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
    color: colors.text.primary,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.text.primary,
  },

  // UI labels
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    color: colors.text.secondary,
  },
  labelStrong: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    color: colors.text.primary,
  },

  // Captions / metadata
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    color: colors.text.tertiary,
  },
  captionStrong: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    color: colors.text.secondary,
  },

  // Data / monospace
  data: {
    fontSize: 28,
    fontFamily: 'Courier New',  // closest to SF Mono without loading
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: colors.text.primary,
  },
  dataSmall: {
    fontSize: 16,
    fontFamily: 'Courier New',
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // Overline — small all-caps category labels
  overline: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.text.tertiary,
  },
} as const
```

### Typography rules
- All text uses the tokens above — no inline `fontSize` or `fontWeight` in component files
- Sentence case everywhere — no ALL CAPS except `overline` token
- Truncate with `numberOfLines` rather than letting text wrap unexpectedly
- Never use `fontWeight: '400'` on a size above 17px on dark bg — it disappears

---

## 4. Spacing (`src/theme/spacing.ts`)

4pt base grid. Every margin, padding, and gap must be a multiple of 4.

```typescript
export const spacing = {
  px:  1,   // hairline — borders only
  0.5: 2,   // micro — icon gaps
  1:   4,   // xs
  2:   8,   // sm
  3:   12,  // md-sm
  4:   16,  // md — standard screen padding
  5:   20,  // md-lg
  6:   24,  // lg
  8:   32,  // xl
  10:  40,  // 2xl
  12:  48,  // 3xl
  16:  64,  // 4xl
  20:  80,  // section gaps
} as const

// Standard values to use by default
export const layout = {
  screenPaddingH: 16,    // horizontal padding on all screens
  screenPaddingV: 20,    // top/bottom padding on all screens
  cardPadding:    16,    // inner padding on Card components
  sectionGap:     32,    // vertical gap between screen sections
  itemGap:        12,    // gap between list/grid items
  iconSize: {
    sm:  16,
    md:  20,
    lg:  24,
    xl:  32,
  },
  borderRadius: {
    sm:  6,
    md:  10,
    lg:  14,
    xl:  20,
    full: 999,
  },
} as const
```

---

## 5. Component Specifications

### Button

Three variants:

```
PRIMARY   — gold fill, black text. One per screen maximum.
SECONDARY — dark fill (#1A1A1A), gold border (1px), gold text.
GHOST     — no fill, no border, secondary text. Destructive actions.
```

```typescript
// Props
interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'          // default: md
  icon?: ReactNode                    // left of label
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}

// Sizes
sm: { height: 36, paddingH: 14, fontSize: 13, fontWeight: '600' }
md: { height: 48, paddingH: 20, fontSize: 15, fontWeight: '600' }
lg: { height: 56, paddingH: 24, fontSize: 17, fontWeight: '600' }

// States
disabled: opacity 0.4
loading: replace label with ActivityIndicator, maintain dimensions
pressed: scale 0.97 (Reanimated spring, 150ms)
```

**Never** use `Alert` for confirmations — use a bottom sheet with secondary and ghost buttons.

---

### Card

Container for grouped content. Two surface levels:

```
DEFAULT  — bg.elevated (#111111), 1px border.subtle
RAISED   — bg.overlay (#1A1A1A), 1px border.default, slight shadow
```

```typescript
interface CardProps {
  children: ReactNode
  variant?: 'default' | 'raised'
  padding?: number           // default: layout.cardPadding
  onPress?: () => void       // makes card tappable (adds pressed animation)
}

// Border radius: layout.borderRadius.lg (14)
// Pressed: scale 0.99 (Reanimated, 120ms)
```

---

### VideoCard

Used in library grid. Fixed aspect ratio 16:9.

```
┌─────────────────────┐
│                     │
│     [thumbnail]     │  ← 16:9, object-cover
│                     │
│  ●  0:12            │  ← duration badge, bottom-left
└─────────────────────┘
  Driver · 2 days ago     ← club type · relative time
```

- Thumbnail from Supabase Storage public URL
- Duration badge: semi-transparent black pill, white text
- Club type + date below card in `caption` typography
- Pro badge overlay (top-right) if analysis exists: small gold dot

---

### Badge / Tag

Inline label for club type, severity, status.

```typescript
interface BadgeProps {
  label: string
  variant?: 'gold' | 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'md'
}

// Styling: filled pill, dark text from same color family
// gold:    bg gold.dim,     text gold.text,       border gold.muted
// success: bg #1A3D2B,      text #6DC98A,         border #2D6644
// warning: bg #3D2A10,      text #E09040,         border #6B4A20
// error:   bg #3D1515,      text #E07070,         border #6B2525
// neutral: bg border.subtle, text text.secondary, border border.default
```

---

### Input

```
┌─────────────────────────────────────┐
│  Label                               │
│  ┌───────────────────────────────┐  │
│  │ Placeholder text              │  │  ← bg.input, border.default
│  └───────────────────────────────┘  │
│  Helper text or error message        │
└─────────────────────────────────────┘

Focused state: border.strong (#3A3A3A)
Error state:   semantic.error border + error message below
```

Height: 48px. Border radius: layout.borderRadius.md (10). Label in `label` typography above. Never float labels.

---

### ProGate

Wrapper component that gates Pro-only features.

```typescript
interface ProGateProps {
  children: ReactNode    // shown when Pro
  feature: string        // e.g. "AI Coaching" — shown in upgrade prompt
}

// When not Pro: renders an upgrade card instead of children
// Upgrade card: gold border, crown icon, feature name, "Upgrade to Pro" primary button
// Never hard-block — always explain what they'd get
```

---

### SwingScore

Large animated score display for AnalysisScreen.

```
         78
      ┌──────┐       ← animated ring, gold fill up to score %
      │  78  │       ← data typography, gold color
      └──────┘
       Good           ← label: Poor / Fair / Good / Great / Excellent
```

Score brackets: 0-39 Poor (error), 40-59 Fair (warning), 60-74 Good (info), 75-89 Great (success), 90-100 Excellent (gold).

Animate ring from 0 to score on mount using Reanimated (800ms, ease-out).

---

## 6. Icons

Use SF Symbols via `react-native-sfsymbols`. iOS system symbols render at native quality and respect Dynamic Type.

### Icon inventory — canonical names

```
record.circle.fill      — record button
video.badge.plus        — import video
play.fill               — play
pause.fill              — pause
backward.frame          — prev frame
forward.frame           — next frame  
gauge.with.needle       — tempo/metronome
chart.line.uptrend.xyaxis — analysis / progress
person.crop.circle      — profile
folder                  — library
house                   — home
sparkles                — AI / Claude
checkmark.seal.fill     — Pro badge
crown.fill              — upgrade prompt
line.diagonal           — line tool
circle                  — circle tool
scribble                — freehand tool
move.3d                 — select tool
angle                   — angle tool
paintpalette            — color picker
square.2.layers.3d      — comparison
xmark                   — close / dismiss
chevron.right           — navigation
ellipsis.circle         — more options
trash                   — delete
square.and.arrow.up     — share / export
```

All icons default to `colors.text.secondary`. Active/selected icons use `colors.gold.default`. Destructive icons use `colors.semantic.error`.

---

## 7. Screen Layout Patterns

### Standard screen
```
SafeAreaView (bg.base)
├── Header (optional — 56px tall)
│   ├── Left: back button or avatar
│   ├── Center: title (title2 typography)
│   └── Right: action icon(s)
├── ScrollView / FlashList
│   └── Content (screenPaddingH: 16 on sides)
└── Fixed bottom area (optional — action button, tab bar)
```

### Full-screen video screen (PlaybackScreen, CameraScreen)
```
View (bg: always.black, flex: 1)
├── Video (full bleed, aspect ratio fills screen)
├── Top overlay (gradient scrim, back button, title)
├── Drawing canvas (absolute, full size, pointer-events toggle)
├── Pose overlay (absolute, full size)
└── Bottom overlay (gradient scrim, controls)
```

Video overlays use a gradient scrim (`rgba(0,0,0,0)` → `rgba(0,0,0,0.7)`) so controls are readable without blocking the video.

### Modal / sheet
Use bottom sheet pattern (slide up from bottom) for:
- Filter/sort options
- Edit metadata (title, tags, club type)
- Delete confirmation
- Upgrade prompt

Sheets sit on `bg.overlay` with a 1px `border.default` top border. Drag handle: 32×4px, `border.strong`, centered, 8px from top.

---

## 8. Animation Principles

All animations via **Reanimated 3**. No `Animated` from core React Native.

### Standard durations
```
micro:   100ms   — toggle states, icon swaps
fast:    200ms   — button press feedback, badge appear
default: 300ms   — screen transitions, sheet open/close
slow:    500ms   — score ring, progress fills
feature: 800ms   — onboarding, first-time reveals
```

### Standard easings
```
spring (button press):  mass 1, damping 20, stiffness 400
ease-out (entries):     Easing.out(Easing.cubic)
ease-in-out (scrubs):   Easing.inOut(Easing.cubic)
```

### Rules
- Never animate `width` or `height` — use `transform: scaleX/scaleY`
- Always respect `useReducedMotion()` — cut to zero duration if true
- Haptic feedback on: primary button press, long-press, delete confirm, recording start/stop

---

## 9. Tab Bar

Custom bottom tab bar. 5 items: Home, Library, [Record FAB], Tempo, Profile.

```
┌──────────────────────────────────────────────┐
│                                              │
│  [home]  [folder]  [●record]  [gauge] [person]│
│  Home    Library             Tempo   Profile  │
│                                              │
└──────────────────────────────────────────────┘

bg: bg.elevated (#111111), 1px border.subtle on top
height: 83px (includes safe area bottom)
icon size: 24px
label: caption typography (10px), shown only for active tab
active: gold icon + gold label
inactive: text.tertiary icon, no label

Record FAB: 
- 56px circle, bg.gold.default
- record.circle.fill icon in always.black
- Pressed: scale 0.93, haptic impact
- Presents CameraScreen as full-screen modal
```

Hide tab bar on: PlaybackScreen, CameraScreen, ComparisonScreen, AnalysisScreen.

---

## 10. Empty States

Every list screen must have an empty state. Format:

```
[Icon — 48px, text.tertiary]

No swings yet
Record your first swing to get started.

[Primary button — relevant action]
```

Icon: relevant SF Symbol (e.g. `video.slash` for empty library).
Title: `title3` typography, `text.secondary`.
Body: `body` typography, `text.tertiary`.
Button: primary variant, only if there's a clear action.

---

## 11. Loading States

### List loading
Use `Skeleton` component — animated shimmer placeholders matching the shape of actual content. Never show a spinner for list data.

Skeleton shimmer: animate opacity 0.4 → 0.8 → 0.4, 1.2s loop, Reanimated.
Skeleton color: `border.subtle` → `border.default`.

### Action loading
Button loading state (spinner inside button, label hidden).
Full-screen loading only for: auth check on app launch, Claude analysis running.

### AI analysis loading
Special state for Claude calls — show elapsed time, "Analysing your swing..." text, animated sparkle icon. Expected 5-15s so the user needs feedback that it's working.

---

## 12. Playback Controls

When video is playing:
- Controls auto-hide after 3 seconds of no interaction
- Tap video to show/hide controls
- Scrubbing always shows controls

```
┌─────────────────────────────────────┐  ← gradient scrim
│  ◄  ──────────●──────────  ►        │  ← frame scrub slider
│  0:04              0:12             │  ← current / total
│  [0.25x] [0.5x] [1x]               │  ← speed buttons
└─────────────────────────────────────┘

Speed button active: gold text, gold underline
Speed button inactive: text.tertiary
```

---

## 13. Drawing Canvas UI

Toolbar on right edge (vertical), semi-transparent dark pill background.

```
┌──┐
│ ↖ │  ← select
│ ╱ │  ← line
│ — │  ← plane line  
│ ○ │  ← circle
│ ✏ │  ← freehand
│ ∠ │  ← angle
│ ⬤ │  ← color picker (shows active color)
└──┘
```

Active tool: gold icon, gold border on pill segment.
Color picker: opens a horizontal row of 4 color dots (white, gold, red, blue).

Delete selected shape: trash icon appears in top-right when a shape is selected.

Undo: shake gesture triggers undo of last shape. Also available as icon button.

---

## 14. Pose Overlay Rendering

MediaPipe skeleton rendered as SVG overlay on top of VideoPlayer.

### Visual style
- Bones: 2px lines, `rgba(201, 168, 76, 0.6)` (gold, semi-transparent)
- Joints: 6px filled circles, `rgba(201, 168, 76, 0.9)` 
- Key joints (wrists, hips, shoulders): 8px, `colors.gold.default`
- Non-golf-relevant landmarks (face): 0.3 opacity, 3px

### Toggle
Pose overlay toggle in PlaybackScreen toolbar: `figure.walk` SF Symbol. Active = gold. Off by default.

### Performance
- Render skeleton as a single SVG with all lines and circles
- Use `React.memo` on PoseOverlay
- Skip render if no landmark data for current frame
- Target 30fps minimum during pose rendering

---

## 15. Pro Feature Visual Language

Pro features are marked consistently:

1. **Gold dot** — small 6px gold dot next to Pro-only labels in settings/profile
2. **Crown icon** — `crown.fill` SF Symbol, gold, on upgrade prompts  
3. **Gold border** — 1px `gold.muted` border on ProGate card
4. **"Pro" badge** — small pill, `gold.dim` bg, `gold.text` text, on feature labels

Never use the word "Premium" — always "Pro". Never say "Unlock" — say "Get" or "Access".

---

## 16. File Naming Conventions

```
Components:    PascalCase.tsx          VideoCard.tsx
Screens:       PascalCase + Screen     PlaybackScreen.tsx
Hooks:         camelCase + use prefix  useVideos.ts
Utilities:     camelCase               frameExtractor.ts
Types:         PascalCase              video.ts (exports Video, DrawingState)
Constants:     camelCase               swingPositions.ts
Theme files:   camelCase               colors.ts
```

---

## 17. Accessibility

- All interactive elements: minimum 44×44pt touch target
- All icons used without labels: `accessibilityLabel` prop required
- All images: `accessibilityLabel` or `accessibilityRole="image"` with description
- Color is never the only differentiator — severity uses color + icon + text
- `reduceMotion` respected for all Reanimated animations
- VoiceOver tested on: HomeScreen, LibraryScreen, PlaybackScreen

---

## 18. Claude Code Handoff Notes

When implementing components from this design system:

1. **Start with the theme files** (`colors.ts`, `typography.ts`, `spacing.ts`) before writing any component. Every subsequent component depends on them.

2. **Build the `ui/` components first** — Button, Card, Badge, Input, Modal. All screens are composed from these.

3. **Never hardcode a color, size, or font style** in a component file. If a value isn't in the theme, add it to the theme first, then reference it.

4. **Test every component in isolation** before composing into screens. A component that looks right in a screen but breaks in a different context is a design system failure.

5. **The gold accent is precious.** If you find yourself reaching for `colors.gold.default` for more than the primary CTA, an active state, or a Pro indicator — stop and reconsider.
