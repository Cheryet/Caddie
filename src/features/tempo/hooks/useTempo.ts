/**
 * useTempo — Feature hook
 * Owns the tempo trainer's state and side effects (PROJECT_SPEC §22 Phase
 * 5.3): the current BPM, play/stop, the four preset slots, and the metronome
 * audio engine. Server state (presets) lives here, not in Zustand (§11).
 *
 *   - BPM: clamped 30–240; `holdStart/holdStop` replicate the prototype's
 *     hold-to-repeat (immediate step, then every 70ms after a 380ms delay).
 *   - Play: drives the `metronome` engine; the visual pulse is derived from
 *     `beatDurationMs` (PulseRing animates independently at the beat).
 *   - Presets: tap a filled slot to load it; long-press (550ms) to save the
 *     current BPM. Persisted to `tempo_presets` — update-by-id when a row
 *     exists, else insert (the table has no unique user_id, so no upsert;
 *     mirrors useDrawingPersistence).
 *
 * Audio stops when the tab loses focus so the metronome never runs unseen.
 *
 * Used by: TempoScreen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { z } from 'zod';

import { Toast } from '@/components/ui';
import { supabase } from '@/core/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { createMetronome, type Metronome } from '@/features/tempo/metronome';
import {
  bpmValuesToSlots,
  clampBpm,
  DEFAULT_BPM,
  DEFAULT_PRESETS,
  slotsToBpmValues,
} from '@/features/tempo/tempoContent';

const HOLD_DELAY_MS = 380;
const HOLD_REPEAT_MS = 70;
const LONG_PRESS_MS = 550;
const SAVED_FLASH_MS = 1100;

const RowSchema = z.object({
  id: z.string(),
  bpm_values: z.array(z.number()).nullable(),
});

export interface UseTempoReturn {
  bpm: number;
  isPlaying: boolean;
  presets: (number | null)[];
  /** Index of the slot showing its "Saved" flash, or -1. */
  savedSlot: number;
  /** Beat length for the visual pulse (PulseRing). */
  beatDurationMs: number;
  togglePlay: () => void;
  /** Begin a +/- adjustment (press-in). `delta` is +1 or -1. */
  holdStart: (delta: number) => void;
  /** End a +/- adjustment (press-out / leave). */
  holdStop: () => void;
  /** Slot press-in — arms the long-press-to-save timer. */
  presetDown: (index: number) => void;
  /** Slot press-out — loads the slot if it wasn't a long-press. */
  presetUp: (index: number) => void;
}

export function useTempo(): UseTempoReturn {
  const userId = useAppStore(s => s.user?.id ?? null);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState(false);
  const [presets, setPresets] = useState<(number | null)[]>([
    ...DEFAULT_PRESETS,
  ]);
  const [savedSlot, setSavedSlot] = useState(-1);

  // Refs that mirror state for use inside timers/handlers without stale closures.
  const engineRef = useRef<Metronome | null>(null);
  const bpmRef = useRef(bpm);
  const presetsRef = useRef(presets);
  const userIdRef = useRef(userId);
  const rowIdRef = useRef<string | null>(null);
  const aliveRef = useRef(true);

  // Timer handles.
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFiredRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    presetsRef.current = presets;
  }, [presets]);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Create the audio engine once; tear everything down on unmount.
  useEffect(() => {
    aliveRef.current = true;
    const engine = createMetronome();
    engineRef.current = engine;
    return () => {
      aliveRef.current = false;
      engine.dispose();
      engineRef.current = null;
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (lpTimeoutRef.current) clearTimeout(lpTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Stop the metronome whenever the tab loses focus — never run audio unseen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        engineRef.current?.stop();
        setIsPlaying(false);
      };
    }, []),
  );

  // ───── Load persisted presets ──────────────────────────────────────────
  const load = useCallback(async (): Promise<void> => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('tempo_presets')
      .select('id,bpm_values')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!aliveRef.current || error || !data) return;
    const parsed = RowSchema.safeParse(data);
    if (parsed.success) {
      rowIdRef.current = parsed.data.id;
      setPresets(bpmValuesToSlots(parsed.data.bpm_values));
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthLoading) return;
    load().catch(() => {
      // Load failure leaves the default presets in place — non-fatal.
    });
  }, [isAuthLoading, load]);

  // ───── Persist presets ─────────────────────────────────────────────────
  const persistPresets = useCallback(
    async (slots: (number | null)[]): Promise<void> => {
      const uid = userIdRef.current;
      if (!uid) return;
      const bpm_values = slotsToBpmValues(slots);
      const rowId = rowIdRef.current;
      try {
        if (rowId) {
          const { error } = await supabase
            .from('tempo_presets')
            .update({ bpm_values, updated_at: new Date().toISOString() })
            .eq('id', rowId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('tempo_presets')
            .insert({ user_id: uid, bpm_values })
            .select('id')
            .single();
          if (error) throw error;
          if (data) rowIdRef.current = data.id;
        }
      } catch {
        // Keep the optimistic in-memory preset; just flag the sync failure.
        Toast.show({ message: 'Could not save preset.', variant: 'error' });
      }
    },
    [],
  );

  // ───── BPM control ─────────────────────────────────────────────────────
  // engine.setBpm only affects future beats and is a no-op when stopped, so
  // it's always safe to call here.
  const adjustBpm = useCallback((delta: number) => {
    setBpm(prev => {
      const next = clampBpm(prev + delta);
      engineRef.current?.setBpm(next);
      return next;
    });
  }, []);

  const applyBpm = useCallback((value: number) => {
    const next = clampBpm(value);
    engineRef.current?.setBpm(next);
    setBpm(next);
  }, []);

  const clearHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const holdStart = useCallback(
    (delta: number) => {
      adjustBpm(delta);
      clearHold();
      holdTimeoutRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(
          () => adjustBpm(delta),
          HOLD_REPEAT_MS,
        );
      }, HOLD_DELAY_MS);
    },
    [adjustBpm, clearHold],
  );

  const holdStop = useCallback(() => {
    clearHold();
  }, [clearHold]);

  // ───── Transport ───────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      if (next) engineRef.current?.start(bpmRef.current);
      else engineRef.current?.stop();
      return next;
    });
  }, []);

  // ───── Presets (tap = load, long-press = save) ─────────────────────────
  const savePreset = useCallback(
    (index: number) => {
      const next = presetsRef.current.slice();
      next[index] = bpmRef.current;
      setPresets(next);
      setSavedSlot(index);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(
        () => setSavedSlot(-1),
        SAVED_FLASH_MS,
      );
      persistPresets(next).catch(() => {});
    },
    [persistPresets],
  );

  const presetDown = useCallback(
    (index: number) => {
      lpFiredRef.current = false;
      if (lpTimeoutRef.current) clearTimeout(lpTimeoutRef.current);
      lpTimeoutRef.current = setTimeout(() => {
        lpFiredRef.current = true;
        savePreset(index);
      }, LONG_PRESS_MS);
    },
    [savePreset],
  );

  const presetUp = useCallback(
    (index: number) => {
      if (lpTimeoutRef.current) {
        clearTimeout(lpTimeoutRef.current);
        lpTimeoutRef.current = null;
      }
      if (lpFiredRef.current) return; // long-press already saved; ignore the release
      const value = presetsRef.current[index];
      if (value != null) applyBpm(value);
    },
    [applyBpm],
  );

  return {
    bpm,
    isPlaying,
    presets,
    savedSlot,
    beatDurationMs: 60000 / bpm,
    togglePlay,
    holdStart,
    holdStop,
    presetDown,
    presetUp,
  };
}
