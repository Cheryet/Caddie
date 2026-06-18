/**
 * navigation/types — Route param definitions
 * Single source of truth for navigation typing. Every route in the app is
 * declared here with its params. Never use `route.params as any` —
 * extend a ParamList instead.
 *
 * Architecture: RootStack (auth gate + modal group) → AppTabs → nested
 * Library/Profile stacks. See PROJECT_SPEC.md §10.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ───── Auth stack (rendered when no session) ─────
// Single combined Auth screen toggles between sign-in / create-account
// modes; Verify takes the email so the user doesn't have to retype it
// and the screen knows which Supabase OTP type to verify against.
export type AuthStackParamList = {
  Auth: undefined;
  Verify: { email: string; mode: 'signup' | 'magiclink' };
};

// ───── Tab-nested stacks (push nav within a tab) ─────
export type LibraryStackParamList = {
  Library: undefined;
  VideoDetail: { videoId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

// ───── Bottom tabs (authenticated main app) ─────
export type AppTabsParamList = {
  HomeTab: undefined;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  TempoTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ───── Root stack (auth gate + modal group) ─────

/**
 * Playback can be reached two ways:
 *   1. From the library — `{ videoId }` references a row in `videos`.
 *   2. Straight off the camera — `{ localUri, ... }` is the temp file
 *      Vision Camera just wrote. The upload pipeline (Phase 1.4) hands
 *      the metadata over so the playback chrome (club, angle, hand) is
 *      correct before the row exists in Postgres.
 *
 * Discriminated by the presence of `videoId` vs `localUri`; callers
 * branch on that to decide whether to fetch from Supabase or read from
 * the filesystem.
 */
export type PlaybackParams =
  | { videoId: string }
  | {
      localUri: string;
      angle: 'face-on' | 'dtl';
      clubType: string;
      swingHand: 'right' | 'left';
    };

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  Tabs: NavigatorScreenParams<AppTabsParamList>;
  Camera: undefined;
  Playback: PlaybackParams;
  Analysis: { videoId: string };
  // Both optional — Comparison can be entered empty (pick both swings on
  // the screen) or pre-seeded with one/both (Phase 5.1).
  Comparison: { videoIdA?: string; videoIdB?: string } | undefined;
};

// ───── Screen prop helpers ─────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Auth screens never push to the authenticated stack — they live in the
// pre-session branch and are unmounted entirely when a session arrives.
// Skipping the composite avoids React Nav's distributive-union collapse
// of the navigate() type into `never`.
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppTabsScreenProps<T extends keyof AppTabsParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AppTabsParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type LibraryStackScreenProps<T extends keyof LibraryStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<LibraryStackParamList, T>,
    AppTabsScreenProps<keyof AppTabsParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    AppTabsScreenProps<keyof AppTabsParamList>
  >;

// ───── Global type augmentation ─────
// Lets useNavigation() infer the right ParamList without manual typing.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
