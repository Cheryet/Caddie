/**
 * config — Constant
 * App-wide operational constants and typed access to environment variables.
 * Every value here is sourced from PROJECT_SPEC.md. If a value isn't here,
 * it doesn't belong in the global config.
 */

import Config from 'react-native-config';

// ───── Recording (PROJECT_SPEC.md §4 Video capture) ─────
export const MAX_RECORDING_DURATION_SEC = 60;
export const RECORDING_FRAME_RATE = 60;

// ───── Analysis (PROJECT_SPEC.md §14 AI Architecture) ─────
export const ANALYSIS_FRAME_COUNT = 8;
export const CLAUDE_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_ANALYSES_PER_DAY = 10;

// ───── Upload / storage (PROJECT_SPEC.md §13 Storage) ─────
export const VIDEO_COMPRESSION_TARGET_MB = 10;
export const SIGNED_URL_TTL_MIN = 15;

// ───── Subscriptions (PROJECT_SPEC.md §17 RevenueCat) ─────
export const RC_ENTITLEMENT = 'caddie_pro';
export const RC_PRODUCT_MONTHLY = 'caddie_pro_monthly';
export const RC_PRODUCT_ANNUAL = 'caddie_pro_annual';

// ───── Environment variables ─────
// Typed wrapper over react-native-config. Values come from the iOS bundle
// at build time (see ios/.xcode.env / .env). Missing values are surfaced as
// empty strings; runtime startup checks (Phase 0.6+) will throw if a
// required value is missing.

export type AppEnv = 'development' | 'staging' | 'production';

export const env = {
  SUPABASE_URL: Config.SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY ?? '',
  REVENUECAT_API_KEY_IOS: Config.REVENUECAT_API_KEY_IOS ?? '',
  SENTRY_DSN: Config.SENTRY_DSN ?? '',
  POSTHOG_API_KEY: Config.POSTHOG_API_KEY ?? '',
  POSTHOG_HOST: Config.POSTHOG_HOST ?? 'https://us.i.posthog.com',
  APP_ENV: (Config.APP_ENV ?? 'development') as AppEnv,
} as const;

export const isDev = env.APP_ENV === 'development';
