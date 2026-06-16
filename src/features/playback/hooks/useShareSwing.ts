/**
 * useShareSwing — Feature hook
 * Orchestrates the swing-frame share flow:
 *
 *   ref → captureFrame (view-shot) → Share.share({url}) → toast
 *
 * Save-to-Photos lives inside iOS's built-in share sheet (the user
 * picks "Save Image"). We don't ship our own action sheet — iOS's
 * is more discoverable and standard.
 *
 * The hook is intentionally tiny: PlaybackScreen owns the capture
 * target ref (a View wrapping the player + canvas) and passes it
 * in. We avoid leaking refs across module boundaries by returning
 * a fire-and-forget `share()` callback.
 *
 * Spec: PROJECT_SPEC.md §22 Phase 2.4.
 */

import { useCallback, useRef, useState } from 'react';
import { Share } from 'react-native';

import { Toast } from '@/components/ui';
import { captureFrame } from '@/features/playback/utils/captureFrame';

interface UseShareSwingReturn {
  share: () => Promise<void>;
  /** True while capture + share are in flight. Drive a spinner if needed. */
  isSharing: boolean;
}

export function useShareSwing(
  ref: React.RefObject<unknown>,
): UseShareSwingReturn {
  const [isSharing, setIsSharing] = useState(false);
  // Synchronous guard against concurrent share() calls. We can't
  // use `isSharing` state alone because the second invocation's
  // closure may see the stale pre-update value.
  const sharingRef = useRef(false);

  const share = useCallback(async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setIsSharing(true);
    try {
      const captured = await captureFrame(ref);
      if (captured.error || !captured.data) {
        Toast.show({
          message: 'Could not capture frame.',
          variant: 'error',
        });
        return;
      }

      // iOS Share Sheet — built-in. Returns when the user picks an
      // action OR dismisses; either way is success from our POV.
      try {
        await Share.share({
          url: captured.data.uri,
        });
      } catch {
        Toast.show({
          message: 'Sharing failed.',
          variant: 'error',
        });
      }
    } finally {
      sharingRef.current = false;
      setIsSharing(false);
    }
  }, [ref]);

  return { share, isSharing };
}
