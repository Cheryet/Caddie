/**
 * useProfile — Feature hook
 * Reads the signed-in user's `profiles` row for ProfileScreen and owns the
 * one mutation Phase 5.4 wires for real: dominant (swing) hand.
 *
 *   - email comes from the Zustand auth user (not `profiles`).
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

const COLUMNS = 'display_name,username,avatar_url,swing_hand,skill_level';

const RowSchema = z.object({
  display_name: z.string().nullable(),
  username: z.string(),
  avatar_url: z.string().nullable(),
  swing_hand: z.string().nullable(),
  skill_level: z.string().nullable(),
});

export interface ProfileError {
  code: 'unauthenticated' | 'network' | 'unknown';
  message: string;
}

interface UseProfileReturn {
  displayName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  swingHand: SwingHand;
  skillLevel: string | null;
  isLoading: boolean;
  error: ProfileError | null;
  updateSwingHand: (hand: SwingHand) => Promise<void>;
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

  const updateSwingHand = useCallback(
    async (hand: SwingHand): Promise<void> => {
      if (!userId) return;
      const previous = swingHandRef.current;
      if (hand === previous) return;

      // Optimistic: state + capture mirror.
      setSwingHand(hand);
      setDefaultSwingHand(hand);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ swing_hand: hand })
        .eq('id', userId);

      if (dbError && aliveRef.current) {
        setSwingHand(previous);
        setDefaultSwingHand(previous);
        Toast.show({
          message: 'Could not save dominant hand. Try again.',
          variant: 'error',
        });
      }
    },
    [userId],
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
    isLoading,
    error,
    updateSwingHand,
    refresh,
  };
}
