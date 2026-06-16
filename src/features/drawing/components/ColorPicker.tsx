/**
 * ColorPicker — Feature component
 * Inline 4-swatch popover anchored next to the toolbar's color dot.
 * The toolbar renders the trigger (the single dot from the design);
 * tapping it opens this popover. Tapping a swatch:
 *   - sets the current color (new shapes use it)
 *   - if a shape is selected, recolors that shape (handled by
 *     useDrawing.setColor; this component is purely presentational)
 *   - closes the popover via `onSelect`
 *
 * Visual: vertical stack of 4 dots (one per color in
 * `colors.drawing.*`) sitting in a glassy chrome pill anchored to
 * the right edge, mirroring the toolbar's own style.
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';
import type { Color } from '@/features/drawing/types';

const SWATCHES: readonly Color[] = ['white', 'gold', 'red', 'blue'];

interface ColorPickerProps {
  current: Color;
  onSelect: (color: Color) => void;
}

export function ColorPicker({ current, onSelect }: ColorPickerProps) {
  return (
    <View
      style={styles.root}
      accessibilityLabel="Drawing colors"
      pointerEvents="box-none"
    >
      {SWATCHES.map(c => {
        const active = c === current;
        return (
          <Pressable
            key={c}
            onPress={() => onSelect(c)}
            accessibilityRole="button"
            accessibilityLabel={`${c} color`}
            accessibilityState={{ selected: active }}
            style={styles.swatchButton}
            hitSlop={6}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: colors.drawing[c] },
                active && styles.swatchActive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const CHROME_BG = 'rgba(12,12,12,0.6)';
const CHROME_BORDER = 'rgba(255,255,255,0.1)';

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 7,
    borderRadius: 22,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  swatchButton: {
    width: 32,
    height: 32,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
});
