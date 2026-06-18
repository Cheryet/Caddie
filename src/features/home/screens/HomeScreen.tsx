/**
 * HomeScreen — Screen
 * Placeholder. Real implementation in Phase 5.2 (home screen with stats
 * row + quick actions). For Phases 0.3–0.4, exposes debug navigation
 * buttons (modal/push routes) plus two persistence toggles so we can
 * verify the Zustand+MMKV persist layer survives a JS reload.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { AppTabsScreenProps } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';

const DEMO_VIDEO_ID = 'demo-video';

export function HomeScreen({ navigation }: AppTabsScreenProps<'HomeTab'>) {
  const user = useAppStore(s => s.user);
  const isPro = useAppStore(s => s.isPro);
  const theme = useAppStore(s => s.theme);
  const setIsPro = useAppStore(s => s.setIsPro);
  const setTheme = useAppStore(s => s.setTheme);

  const meta = [
    `user: ${user ? user.id : 'signed out'}`,
    `isPro: ${String(isPro)}`,
    `theme: ${theme}`,
  ].join('\n');

  return (
    <Placeholder
      title="Home"
      phase="5.2"
      meta={meta}
      navButtons={[
        {
          label: `Toggle isPro (now ${String(isPro)})`,
          onPress: () => setIsPro(!isPro),
        },
        {
          label: `Toggle theme (now ${theme})`,
          onPress: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        },
        {
          label: 'Open Camera (modal)',
          onPress: () => navigation.navigate('Camera'),
        },
        {
          label: 'Open Playback (modal)',
          onPress: () =>
            navigation.navigate('Playback', { videoId: DEMO_VIDEO_ID }),
        },
        {
          label: 'Open Analysis (modal)',
          onPress: () =>
            navigation.navigate('Analysis', { videoId: DEMO_VIDEO_ID }),
        },
        {
          label: 'Open Comparison (modal)',
          onPress: () => navigation.navigate('Comparison'),
        },
      ]}
    />
  );
}
