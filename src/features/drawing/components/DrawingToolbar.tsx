/**
 * DrawingToolbar — Feature component
 * Right-edge vertical tool stack from Caddie Screens.dc.html lines
 * 201–231, plus an Undo button below the color dot when shapes
 * exist. Renders all seven tools regardless of which Phase has
 * wired them — the icons are pixel-verbatim from the design, so
 * the layout stays correct as Phase 2.3 fills in Select / Circle /
 * Angle / Plane.
 *
 * Tapping a tool fires `onToolChange(tool)` — the parent's
 * `useDrawing` decides whether the canvas captures touches for
 * that tool (only line + freehand do in Phase 2.2). Selecting an
 * unimplemented tool is harmless: the canvas stays in pass-through
 * mode so the player's tap-to-toggle-chrome behaviour still works.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle as SvgCircle, Line, Path, Polyline } from 'react-native-svg';

import { colors, layout } from '@/theme';
import { ColorPicker } from '@/features/drawing/components/ColorPicker';
import type { Color, Tool } from '@/features/drawing/types';

const CHROME_BG = 'rgba(12,12,12,0.6)';
const CHROME_BORDER = 'rgba(255,255,255,0.1)';
const ICON_INACTIVE = 'rgba(240,237,232,0.78)';
const ICON_ACTIVE = colors.text.primary;
const ACTIVE_BG = 'rgba(240,237,232,0.14)';
const ACTIVE_BORDER = 'rgba(255,255,255,0.55)';

interface DrawingToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  /** Visible only when there are committed shapes. */
  canUndo: boolean;
  onUndo: () => void;
  /** Current draw color; the dot in the toolbar reflects this. */
  color: Color;
  onColorChange: (color: Color) => void;
  /** Visible only when a shape is selected (Select tool). */
  canDelete: boolean;
  onDelete: () => void;
}

export function DrawingToolbar({
  tool,
  onToolChange,
  canUndo,
  onUndo,
  color,
  onColorChange,
  canDelete,
  onDelete,
}: DrawingToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <View
      style={styles.root}
      accessibilityLabel="Drawing tools"
      // box-none so taps between toolbar buttons fall through to the
      // canvas / player below (preserves tap-to-toggle-chrome).
      pointerEvents="box-none"
    >
      <ToolButton tool="select" active={tool === 'select'} onPress={onToolChange}>
        <SelectIcon />
      </ToolButton>
      <ToolButton tool="line" active={tool === 'line'} onPress={onToolChange}>
        <LineIcon />
      </ToolButton>
      <ToolButton tool="plane" active={tool === 'plane'} onPress={onToolChange}>
        <PlaneIcon />
      </ToolButton>
      <ToolButton tool="circle" active={tool === 'circle'} onPress={onToolChange}>
        <CircleIcon />
      </ToolButton>
      <ToolButton tool="freehand" active={tool === 'freehand'} onPress={onToolChange}>
        <FreehandIcon />
      </ToolButton>
      <ToolButton tool="angle" active={tool === 'angle'} onPress={onToolChange}>
        <AngleIcon />
      </ToolButton>

      <View style={styles.divider} />

      {/* Color dot — tap to open the 4-swatch picker. The dot's fill
          reflects the currently-selected draw color. */}
      <Pressable
        onPress={() => setPickerOpen(o => !o)}
        accessibilityRole="button"
        accessibilityLabel={`Color (${color})`}
        accessibilityState={{ expanded: pickerOpen }}
        style={styles.colorButton}
        hitSlop={6}
      >
        <View
          style={[
            styles.colorDot,
            { backgroundColor: colors.drawing[color] },
          ]}
        />
      </Pressable>

      {canDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityLabel="Delete selected shape"
          accessibilityRole="button"
          style={styles.toolButton}
          hitSlop={6}
        >
          <TrashIcon />
        </Pressable>
      ) : null}

      {canUndo ? (
        <Pressable
          onPress={onUndo}
          accessibilityLabel="Undo last shape"
          accessibilityRole="button"
          style={styles.toolButton}
          hitSlop={6}
        >
          <UndoIcon />
        </Pressable>
      ) : null}

      {pickerOpen ? (
        <View style={styles.pickerAnchor} pointerEvents="box-none">
          <ColorPicker
            current={color}
            onSelect={next => {
              onColorChange(next);
              setPickerOpen(false);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

// ───── ToolButton wrapper ────────────────────────────────────────────────

interface ToolButtonProps {
  tool: Tool;
  active: boolean;
  onPress: (tool: Tool) => void;
  children: React.ReactNode;
}

function ToolButton({ tool, active, onPress, children }: ToolButtonProps) {
  return (
    <Pressable
      onPress={() => onPress(active ? 'none' : tool)}
      accessibilityRole="button"
      accessibilityLabel={`${tool} tool`}
      accessibilityState={{ selected: active }}
      style={styles.toolButton}
      hitSlop={6}
    >
      {active ? <View style={styles.activeBg} /> : null}
      {children}
    </Pressable>
  );
}

// ───── Icons (paths verbatim from Caddie Screens.dc.html §02) ────────────

function SelectIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill={ICON_INACTIVE}>
      <Path d="M5 3l5.5 16 2.2-6.4 6.3-2.1z" />
    </Svg>
  );
}

function LineIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line
        x1={5}
        y1={19}
        x2={19}
        y2={5}
        stroke={ICON_INACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <SvgCircle cx={5} cy={19} r={1.6} fill={ICON_INACTIVE} />
      <SvgCircle cx={19} cy={5} r={1.6} fill={ICON_INACTIVE} />
    </Svg>
  );
}

function PlaneIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={12} x2={20} y2={12} stroke={ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" />
      <Line x1={4} y1={9} x2={4} y2={15} stroke={ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" />
      <Line x1={20} y1={9} x2={20} y2={15} stroke={ICON_INACTIVE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CircleIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={8} stroke={ICON_INACTIVE} strokeWidth={2} />
    </Svg>
  );
}

function FreehandIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15c2-4 3.5-4 4.5-1.5S11 17 13 13s2.5-4.5 5-2.5"
        stroke={ICON_INACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AngleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5v14h14"
        stroke={ICON_INACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 19L18 8"
        stroke={ICON_INACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Standard trash glyph — lid + body + 3 vertical strokes.
function TrashIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16"
        stroke={ICON_ACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        stroke={ICON_ACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke={ICON_ACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={10} y1={11} x2={10} y2={17} stroke={ICON_ACTIVE} strokeWidth={2} strokeLinecap="round" />
      <Line x1={14} y1={11} x2={14} y2={17} stroke={ICON_ACTIVE} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Standard "undo" glyph — left-pointing arrow curving back around.
function UndoIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 14 4 9 9 4"
        stroke={ICON_ACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-3"
        stroke={ICON_ACTIVE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ───── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -160 }], // approx 50% offset for ~7-button stack
    flexDirection: 'column',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 22,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  toolButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: layout.borderRadius.lg, // 14
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: ACTIVE_BORDER,
    backgroundColor: ACTIVE_BG,
  },
  divider: {
    height: 1,
    marginVertical: 2,
    marginHorizontal: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  colorButton: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    // 2-layer shadow ring per design (inner white-25%, outer black-60%).
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: 'rgba(12,12,12,0.6)',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  // Anchors the popover to the LEFT of the toolbar so it doesn't
  // overlap the buttons. Negative right offset shifts it past the
  // toolbar's outer edge.
  pickerAnchor: {
    position: 'absolute',
    right: 60,
    top: '50%',
    transform: [{ translateY: -80 }],
  },
});

