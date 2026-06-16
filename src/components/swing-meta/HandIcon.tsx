/**
 * HandIcon — private helper for `HandSegmented`
 * Verbatim SVG paths from Design/Caddie Screens.dc.html (lines 290–390
 * range — capture chrome icon set). Lives in swing-meta because that's
 * the only consumer; was previously inside camera/components/CameraIcons.
 */

import Svg, { Path } from 'react-native-svg';

interface HandIconProps {
  color: string;
  size?: number;
}

export function HandIcon({ color, size = 15 }: HandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 11V5.5a1.5 1.5 0 0 1 3 0V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.4-2L5 16c-.7-.9.4-2.2 1.4-1.6L8 15.5V8.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
