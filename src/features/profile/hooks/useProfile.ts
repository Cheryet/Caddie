/**
 * useProfile — Feature hook
 * Reads the signed-in user's `profiles` row for ProfileScreen and owns its
 * server-backed mutations: display name, dominant (swing) hand, and handicap.
 *
 *   - email comes from the Zustand auth user (not `profiles`).
 *   - `handicap` (numeric, nullable) persists to `profiles.handicap` — the
 *     inline input on ProfileScreen commits through `updateHandicap`. It
 *     used to live in MMKV (profilePrefs); now it syncs across devices like
 *     the swing hand.
 *   - `updateSwingHand` optimistically updates, writes `profiles.swing_hand`
 *     (RLS-owned `.update().eq('id', userId)`), and mirrors to MMKV via
 *     `setDefaultSwingHand` so new recordings inherit it instantly. Reverts
 *     + toasts on failure.
 *   - On load, mirrors `profiles.swing_hand` → MMKV (covers a hand set on
 *     another device before this install ever opened ProfileScreen).
 *
 * Server state stays here, not in Zustand (§11). `isPro` comes from
 * `useSubscription`, not this hook.
 *
 * Used by: ProfileScreen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { Toast } from '@/components/ui';
import type { SwingHand } from '@/constants/camera';
import { supabase } from '@/core/supabase/client';
import { setDefaultSwingHand } from '@/utils/captureDefaults';
import { useAppStore } from '@/store/useAppStore';

const COLUMNS = 'display_name,username,avatar_url,swing_hand,skill_level,handicap';

const RowSchema = z.object({
  display_name: z.string().nullable(),
  username: z.string(),
  avatar_url: z.string().nullable(),
  swing_hand: z.string().nullable(),
  skill_level: z.string().nullable(),
  handicap: z.number().nullable(),
});

export interface ProfileError {
  code: 'unauthenticated' | 'network' | 'unknown';
  message: string;
}

/** Subset of `profiles` columns ProfileScreen / Onboarding can write. */
export interface ProfileUpdate {
  displayName?: string;
  swingHand?: SwingHand;
  skillLevel?: string;
  /** WHS handicap index; `null` clears it. */
  handicap?: number | null;
}

interface UseProfileReturn {
  displayName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  swingHand: SwingHand;
  skillLevel: string | null;
  handicap: number | null;
  isLoading: boolean;
  error: ProfileError | null;
  /** Write any subset of editable fields; true on success. */
  updateProfile: (fields: ProfileUpdate) => Promise<boolean>;
  updateSwingHand: (hand: SwingHand) => Promise<void>;
  /** Persist the handicap index (or `null` to clear). */
  updateHandicap: (value: number | null) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const userId = useAppStore(s => s.user?.id ?? null);
  const email = useAppStore(s => s.user?.email ?? null);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [swingHand, setSwingHand] = useState<SwingHand>('right');
  const [skillLevel, setSkillLevel] = useState<string | null>(null);
  const [handicap, setHandicap] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ProfileError | null>(null);

  const aliveRef = useRef(true);
  const swingHandRef = useRef<SwingHand>('right');
  useEffect(() => {
    swingHandRef.current = swingHand;
  }, [swingHand]);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!userId) {
      if (!aliveRef.current) return;
      setError({
        code: 'unauthenticated',
        message: 'Sign in to view your profile.',
      });
      setIsLoading(false);
      return;
    }
    setError(null);

    const { data, error: dbError } = await supabase
      .from('profiles')
      .select(COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (!aliveRef.current) return;

    if (dbError) {
      const code: ProfileError['code'] = /network|fetch|timeout/i.test(
        dbError.message ?? '',
      )
        ? 'network'
        : 'unknown';
      setError({ code, message: dbError.message || 'Could not load your profile.' });
      setIsLoading(false);
      return;
    }

    const parsed = RowSchema.safeParse(data);
    if (parsed.success) {
      setDisplayName(parsed.data.display_name);
      setUsername(parsed.data.username);
      setAvatarUrl(parsed.data.avatar_url);
      setSkillLevel(parsed.data.skill_level);
      setHandicap(parsed.data.handicap);
      const hand: SwingHand = parsed.data.swing_hand === 'left' ? 'left' : 'right';
      setSwingHand(hand);
      setDefaultSwingHand(hand); // keep the capture mirror in sync
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isAuthLoading) return;
    fetchProfile().catch(() => {
      // Errors surface via setError inside the closure.
    });
  }, [isAuthLoading, fetchProfile]);

  const updateProfile = useCallback(
    async (fields: ProfileUpdate): Promise<boolean> => {
      if (!userId) return false;

      const payload: {
        display_name?: string;
        swing_hand?: string;
        skill_level?: string;
        handicap?: number | null;
      } = {};
      if (fields.displayName !== undefined) payload.display_name = fields.displayName;
      if (fields.swingHand !== undefined) payload.swing_hand = fields.swingHand;
      if (fields.skillLevel !== undefined) payload.skill_level = fields.skillLevel;
      if (fields.handicap !== undefined) payload.handicap = fields.handicap;
      if (Object.keys(payload).length === 0) return true;

      // Optimistic local update (+ capture mirror for hand); snapshot to revert.
      const prev = {
        displayName,
        swingHand: swingHandRef.current,
        skillLevel,
        handicap,
      };
      if (fields.displayName !== undefined) setDisplayName(fields.displayName);
      if (fields.swingHand !== undefined) {
        setSwingHand(fields.swingHand);
        setDefaultSwingHand(fields.swingHand);
      }
      if (fields.skillLevel !== undefined) setSkillLevel(fields.skillLevel);
      if (fields.handicap !== undefined) setHandicap(fields.handicap);

      const { error: dbError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (dbError) {
        if (aliveRef.current) {
          setDisplayName(prev.displayName);
          if (fields.swingHand !== undefined) {
            setSwingHand(prev.swingHand);
            setDefaultSwingHand(prev.swingHand);
          }
          setSkillLevel(prev.skillLevel);
          setHandicap(prev.handicap);
          Toast.show({
            message: 'Could not save your profile. Try again.',
            variant: 'error',
          });
        }
        return false;
      }
      return true;
    },
    [userId, displayName, skillLevel, handicap],
  );

  const updateSwingHand = useCallback(
    async (hand: SwingHand): Promise<void> => {
      if (hand === swingHandRef.current) return;
      await updateProfile({ swingHand: hand });
    },
    [updateProfile],
  );

  const updateHandicap = useCallback(
    async (value: number | null): Promise<void> => {
      await updateProfile({ handicap: value });
    },
    [updateProfile],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    displayName,
    username,
    email,
    avatarUrl,
    swingHand,
    skillLevel,
    handicap,
    isLoading,
    error,
    updateProfile,
    updateSwingHand,
    updateHandicap,
    refresh,
  };
}
