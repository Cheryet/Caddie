/**
 * useHomeDashboard — Feature hook
 * Aggregates everything the Home dashboard renders (PROJECT_SPEC §22 Phase
 * 5.2): the greeting name + featured club, the three headline stats, the
 * latest swing (with its score), and the most recent coaching summary.
 *
 * One load = four parallel reads (profile, video count, latest video, latest
 * analysis) scoped to the signed-in user, plus an optional fifth lookup that
 * resolves the latest swing's score when the newest analysis belongs to a
 * different video. Per PROJECT_SPEC §11 none of this is pushed into the
 * Zustand store — it's screen-scoped server state living in the hook.
 *
 * Graceful degradation: only a failed profile/stats read surfaces as
 * `error` (the dashboard's spine). A failed or malformed latest-swing /
 * coaching read leaves that section null so the rest of the screen still
 * renders.
 *
 * Used by: HomeScreen. A second caller is a sign this belongs in a shared
 * layer rather than a feature hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/core/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeDate } from '@/utils/relativeTime';

// ───── Returned shape ──────────────────────────────────────────────────────

export interface HomeStats {
  swings: number;
  analyses: number;
  streakDays: number;
}

export interface HomeLatestSwing {
  videoId: string;
  /** Card label — title || club || 'Swing'. */
  club: string;
  /** "Face-on" / "Down the line" / null. */
  cameraAngleLabel: string | null;
  relativeDate: string;
  thumbnailUrl: string | null;
  hasAnalysis: boolean;
  /** 0–100 once its analysis is known; null otherwise. */
  score: number | null;
}

export interface HomeCoaching {
  text: string;
  /** Analyses this advice draws on — profiles.analyses_run (min 1). */
  spanCount: number;
}

export interface HomeError {
  code: 'unauthenticated' | 'network' | 'unknown';
  message: string;
}

interface DashboardData {
  greetingName: string;
  featuredClub: string | null;
  avatarUrl: string | null;
  stats: HomeStats;
  latestSwing: HomeLatestSwing | null;
  coaching: HomeCoaching | null;
}

interface UseHomeDashboardReturn extends DashboardData {
  isLoading: boolean;
  isRefreshing: boolean;
  error: HomeError | null;
  refresh: () => Promise<void>;
}

// ───── Row validation ──────────────────────────────────────────────────────

const ProfileSchema = z.object({
  display_name: z.string().nullable(),
  username: z.string(),
  avatar_url: z.string().nullable(),
  analyses_run: z.number().nullable(),
  streak_days: z.number().nullable(),
});

const LatestVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  club_type: z.string().nullable(),
  camera_angle: z.string().nullable(),
  thumbnail_path: z.string().nullable(),
  has_analysis: z.boolean().nullable(),
  created_at: z.string().nullable(),
});

const LatestAnalysisSchema = z.object({
  coaching_text: z.string(),
  swing_score: z.number().nullable(),
  video_id: z.string(),
  created_at: z.string().nullable(),
});

const PROFILE_COLUMNS =
  'display_name,username,avatar_url,analyses_run,streak_days';
const LATEST_VIDEO_COLUMNS =
  'id,title,club_type,camera_angle,thumbnail_path,has_analysis,created_at';
const LATEST_ANALYSIS_COLUMNS =
  'coaching_text,swing_score,video_id,created_at';

const EMPTY_DATA: DashboardData = {
  greetingName: 'there',
  featuredClub: null,
  avatarUrl: null,
  stats: { swings: 0, analyses: 0, streakDays: 0 },
  latestSwing: null,
  coaching: null,
};

// ───── Mappers ─────────────────────────────────────────────────────────────

function cameraAngleLabel(value: string | null): string | null {
  if (value === 'face-on') return 'Face-on';
  if (value === 'dtl') return 'Down the line';
  return null;
}

function resolveThumbnailUrl(path: string | null): string | null {
  if (!path) return null;
  // Thumbnails live in a public bucket — getPublicUrl is synchronous.
  return supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
}

/** Dependent lookup: the latest swing's own score, used only when the newest
 *  analysis overall belongs to a different video than the latest swing. */
async function fetchLatestSwingScore(videoId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('swing_score')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return typeof data.swing_score === 'number' ? data.swing_score : null;
}

// ───── Hook ────────────────────────────────────────────────────────────────

export function useHomeDashboard(): UseHomeDashboardReturn {
  const userId = useAppStore(s => s.user?.id ?? null);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<HomeError | null>(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchDashboard = useCallback(
    async (mode: 'initial' | 'refresh'): Promise<void> => {
      if (!userId) {
        if (!aliveRef.current) return;
        setError({
          code: 'unauthenticated',
          message: 'Sign in to see your dashboard.',
        });
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [profileRes, countRes, latestVideoRes, latestAnalysisRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(PROFILE_COLUMNS)
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('videos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('videos')
            .select(LATEST_VIDEO_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('analyses')
            .select(LATEST_ANALYSIS_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (!aliveRef.current) return;

      // Spine: profile + count. If either fails the dashboard can't render.
      if (profileRes.error || countRes.error) {
        const msg =
          profileRes.error?.message ?? countRes.error?.message ?? '';
        const code: HomeError['code'] = /network|fetch|timeout/i.test(msg)
          ? 'network'
          : 'unknown';
        setError({ code, message: msg || 'Could not load your dashboard.' });
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Profile row is created on sign-up, so it should always exist. If it's
      // somehow missing/malformed we fall back to neutral defaults rather
      // than erroring — the dashboard is still useful.
      const profile = ProfileSchema.safeParse(profileRes.data);
      const greetingName = profile.success
        ? profile.data.display_name?.trim() || profile.data.username
        : EMPTY_DATA.greetingName;
      const avatarUrl = profile.success ? profile.data.avatar_url : null;
      const analysesRun = profile.success ? profile.data.analyses_run ?? 0 : 0;
      const streakDays = profile.success ? profile.data.streak_days ?? 0 : 0;
      const swings = countRes.count ?? 0;

      // Newest analysis overall — drives the coaching card and, when it's for
      // the latest swing, that card's score (one parse, two consumers).
      const parsedAnalysis =
        !latestAnalysisRes.error && latestAnalysisRes.data
          ? LatestAnalysisSchema.safeParse(latestAnalysisRes.data)
          : null;
      const latestAnalysis = parsedAnalysis?.success ? parsedAnalysis.data : null;

      // Latest swing (enhancement — null on miss/malformed).
      let latestSwing: HomeLatestSwing | null = null;
      let featuredClub: string | null = null;
      if (!latestVideoRes.error && latestVideoRes.data) {
        const parsedVideo = LatestVideoSchema.safeParse(latestVideoRes.data);
        if (parsedVideo.success) {
          const v = parsedVideo.data;
          featuredClub = v.club_type;
          const hasAnalysis = v.has_analysis ?? false;

          let score: number | null = null;
          if (latestAnalysis && latestAnalysis.video_id === v.id) {
            score = latestAnalysis.swing_score;
          } else if (hasAnalysis) {
            score = await fetchLatestSwingScore(v.id);
            if (!aliveRef.current) return;
          }

          latestSwing = {
            videoId: v.id,
            club: v.title.trim() || v.club_type || 'Swing',
            cameraAngleLabel: cameraAngleLabel(v.camera_angle),
            relativeDate: formatRelativeDate(v.created_at),
            thumbnailUrl: resolveThumbnailUrl(v.thumbnail_path),
            hasAnalysis,
            score,
          };
        }
      }

      // Coaching (enhancement — newest analysis summary, Pro-gated in the UI).
      const coaching: HomeCoaching | null =
        latestAnalysis && latestAnalysis.coaching_text.trim()
          ? {
              text: latestAnalysis.coaching_text.trim(),
              spanCount: Math.max(analysesRun, 1),
            }
          : null;

      setData({
        greetingName,
        featuredClub,
        avatarUrl,
        stats: { swings, analyses: analysesRun, streakDays },
        latestSwing,
        coaching,
      });
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  // Wait until auth settles so we don't fire a doomed query while the
  // session restores from MMKV.
  useEffect(() => {
    if (isAuthLoading) return;
    fetchDashboard('initial').catch(() => {
      // Errors surface via setError inside the closure.
    });
  }, [isAuthLoading, fetchDashboard]);

  const refresh = useCallback(async () => {
    await fetchDashboard('refresh');
  }, [fetchDashboard]);

  return { ...data, isLoading, isRefreshing, error, refresh };
}
